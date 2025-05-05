import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { AdminPermission } from '@/lib/permissions';
import { createAdminLog } from '@/lib/admin-logs';

// 获取用户角色列表
export async function GET(req: NextRequest) {
  try {
    // 检查权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取用户权限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true }
    });

    const userPermissions = userRoles.flatMap(ur => ur.role.permissions);

    // 验证是否有查看角色的权限
    if (!hasPermission(userPermissions, AdminPermission.ADMIN_ACCESS)) {
      return NextResponse.json({ error: '没有查看角色的权限' }, { status: 403 });
    }

    // 修改查询条件，获取所有角色（包括管理员角色）
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });

    // 获取每个角色的用户数量
    const roleIds = roles.map(role => role.id);
    const roleCounts = await prisma.userRole.groupBy({
      by: ['roleId'],
      where: { roleId: { in: roleIds } },
      _count: { userId: true }
    });

    // 整合数据
    const rolesWithCount = roles.map(role => {
      const countInfo = roleCounts.find(rc => rc.roleId === role.id);
      return {
        ...role,
        userCount: countInfo ? countInfo._count.userId : 0
      };
    });

    return NextResponse.json({ roles: rolesWithCount });
  } catch (error) {
    console.error('获取用户角色列表失败:', error);
    return NextResponse.json(
      { error: '获取用户角色列表失败，请稍后再试' },
      { status: 500 }
    );
  }
}

// 创建新用户角色
export async function POST(req: NextRequest) {
  try {
    // 检查权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取用户权限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true }
    });

    const userPermissions = userRoles.flatMap(ur => ur.role.permissions);

    // 验证是否有创建角色的权限
    if (!hasPermission(userPermissions, AdminPermission.ADMIN_ACCESS)) {
      return NextResponse.json({ error: '没有创建角色的权限' }, { status: 403 });
    }

    // 解析请求数据
    const { name, description, permissions } = await req.json();

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { error: '角色名称不能为空' },
        { status: 400 }
      );
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: '角色权限不能为空' },
        { status: 400 }
      );
    }

    // 检查角色名称是否已存在
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: '角色名称已存在' },
        { status: 400 }
      );
    }

    // 创建新角色
    const newRole = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions // 使用原始权限列表，保留可能包含的管理员权限
      }
    });

    // 记录管理员操作日志
    await createAdminLog({
      userId: session.user.id,
      action: '创建',
      resource: '用户角色',
      resourceId: newRole.id,
      details: { role: newRole }
    });

    return NextResponse.json(
      { message: '用户角色创建成功', role: newRole },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建用户角色失败:', error);
    return NextResponse.json(
      { error: '创建用户角色失败，请稍后再试' },
      { status: 500 }
    );
  }
} 