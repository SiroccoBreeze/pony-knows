import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { AdminPermission } from '@/lib/permissions';
import { createAdminLog } from '@/lib/admin-logs';

// 强制动态路由，禁用缓存
export const dynamic = 'force-dynamic';

// 获取单个用户角色详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 正确等待 params 解析
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
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

    // 验证是否有管理员权限
    if (!hasPermission(userPermissions, AdminPermission.ADMIN_ACCESS)) {
      return NextResponse.json({ error: '没有查看角色的权限' }, { status: 403 });
    }

    // 获取角色详情
    const role = await prisma.role.findUnique({
      where: { id }
    });

    if (!role) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('获取用户角色详情失败:', error);
    return NextResponse.json(
      { error: '获取用户角色详情失败，请稍后再试' },
      { status: 500 }
    );
  }
}

// 更新用户角色
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 正确等待 params 解析
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
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

    // 验证是否有管理员权限
    if (!hasPermission(userPermissions, AdminPermission.ADMIN_ACCESS)) {
      return NextResponse.json({ error: '没有编辑角色的权限' }, { status: 403 });
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

    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    // 检查角色名称是否已被其他角色使用
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: '角色名称已存在' },
          { status: 400 }
        );
      }
    }

    // 更新角色
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions
      }
    });

    // 记录管理员操作日志
    await createAdminLog({
      userId: session.user.id,
      action: '更新',
      resource: '用户角色',
      resourceId: updatedRole.id,
      details: { 
        before: existingRole,
        after: updatedRole
      }
    });

    return NextResponse.json({ message: '用户角色更新成功', role: updatedRole });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    return NextResponse.json(
      { error: '更新用户角色失败，请稍后再试' },
      { status: 500 }
    );
  }
}

// 删除用户角色
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 正确等待 params 解析
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
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

    // 验证是否有管理员权限
    if (!hasPermission(userPermissions, AdminPermission.ADMIN_ACCESS)) {
      return NextResponse.json({ error: '没有删除角色的权限' }, { status: 403 });
    }

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id }
    });

    if (!role) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    // 检查是否有用户使用此角色
    const usersWithRole = await prisma.userRole.count({
      where: { roleId: id }
    });

    if (usersWithRole > 0) {
      return NextResponse.json(
        { error: '无法删除正在使用的角色，请先移除所有使用此角色的用户' },
        { status: 400 }
      );
    }

    // 删除角色
    await prisma.role.delete({
      where: { id }
    });

    // 记录管理员操作日志
    await createAdminLog({
      userId: session.user.id,
      action: '删除',
      resource: '用户角色',
      resourceId: id,
      details: { deletedRole: role }
    });

    return NextResponse.json({ message: '用户角色删除成功' });
  } catch (error) {
    console.error('删除用户角色失败:', error);
    return NextResponse.json(
      { error: '删除用户角色失败，请稍后再试' },
      { status: 500 }
    );
  }
} 