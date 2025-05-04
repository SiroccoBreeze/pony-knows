import prisma from '@/lib/prisma';
import { hasPermission } from './permissions';

/**
 * 检查用户是否拥有指定权限
 * @param email 用户电子邮箱
 * @param permission 需要检查的权限
 * @returns 是否拥有权限
 */
export async function checkUserPermission(email: string, permission: string): Promise<boolean> {
  try {
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) return false;

    // 收集用户的所有权限
    const permissions: string[] = [];
    for (const userRole of user.userRoles) {
      permissions.push(...(userRole.role.permissions || []));
    }

    // 检查是否拥有指定权限
    return permissions.includes(permission);
  } catch (error) {
    console.error('权限检查错误:', error);
    return false;
  }
} 