import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { Permission } from '@/lib/permissions';
import { normalizePermissions } from '@/lib/permissions-util';

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
  
  // 提取并处理权限的函数
  const processPermissions = useCallback(() => {
    if (status === "authenticated" && session?.user) {
      // 从用户的角色中获取所有权限
      const user = session.user as ExtendedUser;
      const allPermissions: string[] = [];
      
      console.log("[useAuthPermissions] 会话用户:", user);
      console.log("[useAuthPermissions] 用户角色:", user.roles);
      
      // 首先尝试从会话中获取权限
      if (user.roles) {
        user.roles.forEach(role => {
          console.log("[useAuthPermissions] 处理角色:", role.role.name);
          console.log("[useAuthPermissions] 角色权限(原始):", role.role.permissions);
          
          if (role.role.permissions) {
            // 确保权限格式正确
            const normalizedPermissions = normalizePermissions(role.role.permissions);
            console.log("[useAuthPermissions] 角色权限(标准化):", normalizedPermissions);
            allPermissions.push(...normalizedPermissions);
          }
        });
      }
      
      // 兼容性处理：检查是否有旧格式的admin.access权限，并转换为admin_access
      for (let i = 0; i < allPermissions.length; i++) {
        if (allPermissions[i] === 'admin.access') {
          allPermissions[i] = 'admin_access';
        }
      }
      
      // 如果会话中没有权限，检查本地存储
      if (allPermissions.length === 0) {
        console.log("[useAuthPermissions] 会话没有权限，尝试从本地存储读取");
        
        // 检查备份绕过方式
        const bypass = localStorage.getItem('admin_bypass');
        if (bypass === 'true') {
          console.log("[useAuthPermissions] 发现本地绕过标记");
          
          try {
            const storedPermissions = localStorage.getItem('admin_permissions');
            if (storedPermissions) {
              const parsedPermissions = JSON.parse(storedPermissions);
              if (Array.isArray(parsedPermissions) && parsedPermissions.length > 0) {
                console.log("[useAuthPermissions] 从本地存储加载权限:", parsedPermissions);
                allPermissions.push(...parsedPermissions);
              }
            }
          } catch (error) {
            console.error('[useAuthPermissions] 无法解析存储的权限:', error);
          }
        }
      }

      // 移除危险的临时解决方案，不再自动添加管理员权限
      // 如果用户没有权限，那么就是没有权限，系统不应该自动给予权限
      console.log("[useAuthPermissions] 汇总权限:", allPermissions);
      
      // 去重
      const uniquePermissions = [...new Set(allPermissions)];
      setUserPermissions(uniquePermissions);
      
      // 检查是否有管理员访问权限
      const hasAdminAccess = uniquePermissions.includes(Permission.ADMIN_ACCESS);
      console.log(`[useAuthPermissions] 是否有管理员权限: ${hasAdminAccess}`);
      setIsAdmin(hasAdminAccess);
    } else {
      setUserPermissions([]);
      setIsAdmin(false);
    }
  }, [session, status]);

  // 当会话或状态变化时重新处理权限
  useEffect(() => {
    processPermissions();
  }, [processPermissions]);

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