import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { getSystemParameterWithDefaultFromDb } from "@/lib/system-parameters";

const prisma = new PrismaClient();

// 默认最大尝试次数
const DEFAULT_MAX_ATTEMPTS = 3;
// 锁定时间(分钟)
const LOCK_DURATION_MINUTES = 30;

// 生成用户特定月份的密钥
function generateUserMonthlyKey(userId: string, year: number, month: number): string {
  // 使用加密哈希函数生成密钥
  // 盐值可以存储在环境变量中增加安全性
  const salt = process.env.KEY_GENERATION_SALT || "pony-knows-monthly-key-salt";
  const data = `${userId}-${year}-${month}-${salt}`;
  
  // 生成哈希并取前8位作为密钥，转为大写以便用户输入
  const hash = createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 8).toUpperCase();
}

// 获取月末日期
function getMonthEndDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// 验证密钥 - POST /api/auth/monthly-key
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
    
    const userId = session.user.id;
    const { key: rawKey } = await request.json();
    
    // 标准化密钥：转为大写并去除空格
    const key = typeof rawKey === 'string' ? rawKey.trim().toUpperCase() : rawKey;
    
    // 获取系统配置的最大尝试次数
    const maxAttemptsStr = await getSystemParameterWithDefaultFromDb(
      "monthly_key_max_attempts", 
      DEFAULT_MAX_ATTEMPTS.toString()
    );
    const MAX_ATTEMPTS = parseInt(maxAttemptsStr, 10);
    
    // 检查用户验证尝试次数和锁定状态
    let keyAuth = await prisma.monthlyKeyAuth.findUnique({
      where: { userId }
    });
    
    // 如果有记录且锁定状态存在
    if (keyAuth?.lockedUntil) {
      const lockedUntil = new Date(keyAuth.lockedUntil);
      if (lockedUntil > new Date()) {
        // 仍在锁定期内
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
        return NextResponse.json(
          { 
            error: `密钥验证已锁定，请等待 ${remainingMinutes} 分钟后再试`,
            locked: true,
            lockedUntil: lockedUntil
          },
          { status: 403 }
        );
      }
      // 锁定期已过，重置尝试次数
      keyAuth = await prisma.monthlyKeyAuth.update({
        where: { userId },
        data: {
          attempts: 0,
          lockedUntil: null
        }
      });
    }
    
    // 获取当前年月
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript月份从0开始
    
    // 生成当前用户本月的有效密钥
    const validKey = generateUserMonthlyKey(userId, currentYear, currentMonth);
    
    if (key !== validKey) {
      // 验证失败，增加尝试次数
      const attempts = (keyAuth?.attempts || 0) + 1;
      
      // 检查是否超过最大尝试次数
      let lockedUntil = null;
      if (attempts >= MAX_ATTEMPTS) {
        // 设置锁定时间
        lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);
      }
      
      // 更新或创建验证记录
      if (keyAuth) {
        keyAuth = await prisma.monthlyKeyAuth.update({
          where: { userId },
          data: {
            attempts,
            lockedUntil
          }
        });
      } else {
        keyAuth = await prisma.monthlyKeyAuth.create({
          data: {
            userId,
            key: validKey,
            lastVerifiedAt: now,
            isValid: false,
            attempts,
            lockedUntil
          }
        });
      }
      
      // 返回锁定状态或失败信息
      if (lockedUntil) {
        return NextResponse.json(
          { 
            error: `密钥验证失败次数过多，已锁定${LOCK_DURATION_MINUTES}分钟`,
            locked: true,
            lockedUntil
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `密钥无效，还剩 ${MAX_ATTEMPTS - attempts} 次尝试机会`,
          attempts,
          maxAttempts: MAX_ATTEMPTS
        },
        { status: 400 }
      );
    }
    
    // 密钥验证成功，更新或创建验证记录
    if (keyAuth) {
      keyAuth = await prisma.monthlyKeyAuth.update({
        where: { userId },
        data: {
          key: validKey,
          lastVerifiedAt: now,
          isValid: true,
          attempts: 0,
          lockedUntil: null
        }
      });
    } else {
      keyAuth = await prisma.monthlyKeyAuth.create({
        data: {
          userId,
          key: validKey,
          lastVerifiedAt: now,
          isValid: true,
          attempts: 0,
          lockedUntil: null
        }
      });
    }
    
    // 返回成功响应，客户端需要处理会话更新
    return NextResponse.json({
      success: true,
      message: "密钥验证成功",
      monthlyKeyVerified: true,
      validUntil: getMonthEndDate(now)
    });
    
  } catch (error) {
    console.error("月度密钥验证错误:", error);
    return NextResponse.json(
      { error: "月度密钥验证失败" },
      { status: 500 }
    );
  }
}

// 检查密钥状态 - GET /api/auth/monthly-key
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查用户是否已登录
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // 获取系统配置的最大尝试次数
    const maxAttemptsStr = await getSystemParameterWithDefaultFromDb(
      "monthly_key_max_attempts", 
      DEFAULT_MAX_ATTEMPTS.toString()
    );
    const MAX_ATTEMPTS = parseInt(maxAttemptsStr, 10);
    
    // 获取用户的月度密钥认证记录
    const keyAuth = await prisma.monthlyKeyAuth.findUnique({
      where: { userId }
    });
    
    // 获取当前年月
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 检查锁定状态
    if (keyAuth?.lockedUntil) {
      const lockedUntil = new Date(keyAuth.lockedUntil);
      if (lockedUntil > new Date()) {
        // 仍在锁定期内
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
        return NextResponse.json({
          verified: false,
          message: `密钥验证已锁定，请等待 ${remainingMinutes} 分钟后再试`,
          locked: true,
          lockedUntil: lockedUntil,
          attempts: keyAuth.attempts,
          maxAttempts: MAX_ATTEMPTS
        });
      } else {
        // 锁定期已过，但数据库仍有锁定记录，自动更新数据库
        await prisma.monthlyKeyAuth.update({
          where: { userId },
          data: {
            attempts: 0,
            lockedUntil: null
          }
        });
        
        return NextResponse.json({
          verified: false,
          message: "锁定期已过，可以重新验证密钥",
          refreshed: true, // 标记已刷新状态，客户端可以据此提示用户
          locked: false,
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS
        });
      }
    }
    
    // 如果没有记录，则需要验证密钥
    if (!keyAuth) {
      return NextResponse.json({
        verified: false,
        message: "需要验证月度密钥",
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS
      });
    }
    
    // 检查上次验证时间是否在当月
    const lastVerifiedMonth = `${keyAuth.lastVerifiedAt.getFullYear()}-${String(keyAuth.lastVerifiedAt.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    const isVerified = lastVerifiedMonth === thisMonth && keyAuth.isValid;
    
    return NextResponse.json({
      verified: isVerified,
      message: isVerified ? "月度密钥已验证" : "需要验证月度密钥",
      lastVerifiedAt: keyAuth.lastVerifiedAt,
      validUntil: isVerified ? getMonthEndDate(now) : null,
      attempts: keyAuth.attempts || 0,
      maxAttempts: MAX_ATTEMPTS
    });
    
  } catch (error) {
    console.error("获取月度密钥状态错误:", error);
    return NextResponse.json(
      { error: "获取月度密钥状态失败" },
      { status: 500 }
    );
  }
}

// 管理员获取用户当月密钥 - GET /api/auth/monthly-key/admin/user/:userId
export async function generateRoute(request: NextRequest) {
  // 这个路由处理特定请求格式: /api/auth/monthly-key/admin/user/:userId
  // 首先，检查URL格式是否匹配
  const segments = request.nextUrl.pathname.split('/');
  if (segments.length < 7 || segments[4] !== 'admin' || segments[5] !== 'user') {
    return NextResponse.json({ error: "无效的路由" }, { status: 400 });
  }
  
  const targetUserId = segments[6];
  
  try {
    const session = await getServerSession(authOptions);
    
    // 检查用户是否已登录且具有管理员权限
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
    
    // 获取目标用户
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }
    
    // 获取当前年月
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 生成用户当月密钥
    const monthlyKey = generateUserMonthlyKey(targetUserId, currentYear, currentMonth);
    
    return NextResponse.json({
      userId: targetUserId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      year: currentYear,
      month: currentMonth,
      monthlyKey: monthlyKey
    });
    
  } catch (error) {
    console.error("生成月度密钥错误:", error);
    return NextResponse.json(
      { error: "生成月度密钥失败" },
      { status: 500 }
    );
  }
} 