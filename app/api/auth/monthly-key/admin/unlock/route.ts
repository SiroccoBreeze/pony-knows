import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 管理员解锁用户密钥 - POST /api/auth/monthly-key/admin/unlock
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查用户是否已登录
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    // 检查用户是否有管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    // 提取所有权限
    const permissions: string[] = [];
    admin?.userRoles.forEach(userRole => {
      if (userRole.role.permissions) {
        permissions.push(...userRole.role.permissions);
      }
    });
    
    // 检查是否有管理员权限
    if (!permissions.includes('admin_access')) {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      );
    }
    
    // 从请求体中获取用户ID
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "缺少用户ID参数" },
        { status: 400 }
      );
    }
    
    // 获取目标用户
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }
    
    // 查找用户的月度密钥记录
    const keyAuth = await prisma.monthlyKeyAuth.findUnique({
      where: { userId }
    });
    
    // 如果没有密钥记录，则不需要解锁
    if (!keyAuth) {
      return NextResponse.json({ 
        success: true,
        message: "用户尚未进行密钥验证，无需解锁"
      });
    }
    
    // 更新密钥记录，解除锁定并重置验证状态
    await prisma.monthlyKeyAuth.update({
      where: { userId },
      data: {
        attempts: 0,
        lockedUntil: null,
        // 重置验证状态，确保用户需要重新验证
        isValid: false,
        // 更新最后验证时间为过去时间，强制用户重新验证
        lastVerifiedAt: new Date(2000, 0, 1) // 设置为2000年1月1日
      }
    });
    
    // 记录管理员操作日志
    try {
      await prisma.adminLog.create({
        data: {
          userId: session.user.id,
          action: 'unlock_monthly_key',
          resource: 'user',
          resourceId: userId,
          details: {
            targetUser: {
              id: targetUser.id,
              email: targetUser.email,
              name: targetUser.name
            }
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      });
    } catch (logError) {
      console.error("记录管理员操作日志失败:", logError);
    }
    
    return NextResponse.json({
      success: true,
      message: `已成功解锁用户 ${targetUser.name || targetUser.email} 的密钥`
    });
    
  } catch (error) {
    console.error("解锁用户密钥错误:", error);
    return NextResponse.json(
      { error: "解锁用户密钥失败" },
      { status: 500 }
    );
  }
} 