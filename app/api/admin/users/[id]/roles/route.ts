import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma';
import { AdminPermission } from '@/lib/permissions';
import { hasPermission } from '@/lib/permissions';
import { createAdminLog } from '@/lib/admin-logs';

// 获取指定用户的角色
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 身份验证和权限检查
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取当前用户权限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true }
    });
    const userPermissions = userRoles.flatMap(ur => ur.role.permissions);

    // 验证是否有查看用户的权限
    if (!hasPermission(userPermissions, AdminPermission.VIEW_USERS)) {
      return NextResponse.json({ error: '没有查看用户的权限' }, { status: 403 });
    }

    const { id } = params;

    // 获取用户角色
    const assignedRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: {
        role: true
      }
    });

    return NextResponse.json({
      roles: assignedRoles.map(ur => ({
        id: ur.id,
        roleId: ur.roleId,
        role: {
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          isAdmin: ur.role.permissions.includes(AdminPermission.ADMIN_ACCESS),
          createdAt: ur.role.createdAt
        }
      }))
    });
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return NextResponse.json({ error: '获取用户角色失败' }, { status: 500 });
  }
}

// 更新用户角色
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 身份验证和权限检查
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取当前用户权限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true }
    });
    const userPermissions = userRoles.flatMap(ur => ur.role.permissions);

    // 验证是否有编辑用户的权限
    if (!hasPermission(userPermissions, AdminPermission.EDIT_USER)) {
      return NextResponse.json({ error: '没有编辑用户的权限' }, { status: 403 });
    }

    const { id } = params;
    const { roleIds } = await req.json();

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: '无效的roleIds' }, { status: 400 });
    }

    // 获取用户信息用于记录日志
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 首先删除现有的用户角色关系
    await prisma.userRole.deleteMany({
      where: { userId: id }
    });

    // 查询即将分配的角色，用于验证和日志记录
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } }
    });

    // 用户想要分配管理员角色，但自己没有相应权限
    const adminRoles = roles.filter(role => role.permissions.includes(AdminPermission.ADMIN_ACCESS));
    if (adminRoles.length > 0 && !hasPermission(userPermissions, AdminPermission.CREATE_ROLE)) {
      return NextResponse.json({ error: '您没有分配管理员角色的权限' }, { status: 403 });
    }

    // 创建新的用户角色关系
    await Promise.all(
      roleIds.map(roleId =>
        prisma.userRole.create({
          data: {
            userId: id,
            roleId
          }
        })
      )
    );

    // 记录管理操作日志
    await createAdminLog({
      userId: session.user.id,
      action: '分配用户角色',
      resource: 'user_roles',
      details: {
        targetUser: {
          id,
          name: targetUser.name,
          email: targetUser.email
        },
        roles: roles.map(r => ({ id: r.id, name: r.name }))
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    return NextResponse.json({ error: '更新用户角色失败' }, { status: 500 });
  }
} 