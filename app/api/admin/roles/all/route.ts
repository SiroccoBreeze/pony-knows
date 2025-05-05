import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma';
import { AdminPermission } from '@/lib/permissions';
import { hasPermission } from '@/lib/permissions';

// 获取所有角色列表（包括管理员角色和用户角色）
export async function GET(req: NextRequest) {
  try {
    // 验证用户是否登录
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取当前用户权限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                permissions: true
              }
            }
          }
        }
      }
    });
    const userPermissions = user?.userRoles.flatMap(ur => ur.role.permissions || []) || [];

    // 验证是否有查看角色的权限
    if (!userPermissions.includes(AdminPermission.VIEW_ROLES)) {
      return NextResponse.json({ error: '没有查看角色的权限' }, { status: 403 });
    }

    // 获取所有角色
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

    // 整合数据并标记管理员角色
    const formattedRoles = roles.map(role => {
      const countInfo = roleCounts.find(rc => rc.roleId === role.id);
      // 确保返回明确的 isAdmin 布尔值
      const isAdmin = Array.isArray(role.permissions) && 
                      role.permissions.includes(AdminPermission.ADMIN_ACCESS);
      
      return {
        ...role,
        userCount: countInfo ? countInfo._count.userId : 0,
        // 明确转换为布尔值，避免undefined或其他非布尔值
        isAdmin: Boolean(isAdmin)
      };
    });

    // 添加额外日志验证所有角色都有isAdmin属性
    const hasAllIsAdmin = formattedRoles.every(role => typeof role.isAdmin === 'boolean');
    console.log(`所有角色都有isAdmin布尔值属性: ${hasAllIsAdmin}`);
    
    if (!hasAllIsAdmin) {
      console.error("警告: 存在没有isAdmin属性的角色，正在修复...");
      // 强制修复
      formattedRoles.forEach(role => {
        if (typeof role.isAdmin !== 'boolean') {
          role.isAdmin = Boolean(Array.isArray(role.permissions) && 
                              role.permissions.includes(AdminPermission.ADMIN_ACCESS));
        }
      });
    }

    console.log("API返回的角色数据格式示例:", 
      formattedRoles.length > 0 ? 
      { 
        id: formattedRoles[0].id,
        name: formattedRoles[0].name,
        isAdmin: formattedRoles[0].isAdmin,
        hasPermissions: Array.isArray(formattedRoles[0].permissions)
      } : 
      "没有角色数据");

    return NextResponse.json(formattedRoles);
  } catch (error) {
    console.error('获取角色列表失败:', error);
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
  }
} 