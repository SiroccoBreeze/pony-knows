import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Permission } from '@/lib/permissions';

// 扩展 Session.user 类型
interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles?: {
    role: {
      name: string;
      permissions: string[];
    }
  }[];
}

interface UseAuthPermissionsResult {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: ExtendedUser | null;
  userPermissions: string[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

/**
 * 获取当前用户的权限并提供检查函数
 */
export function useAuthPermissions(): UseAuthPermissionsResult {
  const { data: session, status } = useSession();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // 从用户的角色中获取所有权限
      const user = session.user as ExtendedUser;
      const allPermissions: string[] = [];
      
      if (user.roles) {
        user.roles.forEach(role => {
          if (role.role.permissions) {
            allPermissions.push(...role.role.permissions);
          }
        });
      }
      
      // 去重
      setUserPermissions([...new Set(allPermissions)]);
      
      // 检查是否有管理员访问权限
      setIsAdmin(allPermissions.includes(Permission.ADMIN_ACCESS));
    } else {
      setUserPermissions([]);
      setIsAdmin(false);
    }
  }, [session, status]);

  /**
   * 检查用户是否有指定权限
   */
  const checkPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  /**
   * 检查用户是否有任意一个指定权限
   */
  const checkAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  /**
   * 检查用户是否有所有指定权限
   */
  const checkAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => userPermissions.includes(permission));
  };

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isAdmin,
    user: (session?.user as ExtendedUser) || null,
    userPermissions,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
  };
} 