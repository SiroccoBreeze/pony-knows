"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { Permission, AdminPermission, UserPermission } from "@/lib/permissions";

type PermissionType = string | Permission | AdminPermission | UserPermission;

/**
 * 权限检查Hook，简化权限判断逻辑
 * @param permission 需要的权限，可以是单个权限或权限数组
 * @param requireAll 是否需要拥有所有权限（默认只需要任意一个）
 * @returns 包含权限状态的对象
 */
export function usePermissionCheck(
  permission: PermissionType | PermissionType[],
  requireAll: boolean = false
) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    isLoading, 
    refreshPermissions,
    permissions
  } = useAuthPermissions();
  
  const [hasAccess, setHasAccess] = useState(false);
  const [checked, setChecked] = useState(false);
  
  // 检查权限状态
  useEffect(() => {
    // 权限加载中时不进行判断
    if (isLoading) {
      setChecked(false);
      return;
    }
    
    let accessGranted = false;
    
    if (Array.isArray(permission)) {
      // 多个权限的检查
      accessGranted = requireAll
        ? hasAllPermissions(permission as any[])
        : hasAnyPermission(permission as any[]);
    } else {
      // 单个权限的检查
      accessGranted = hasPermission(permission as any);
    }
    
    setHasAccess(accessGranted);
    setChecked(true);
  }, [permission, requireAll, hasPermission, hasAnyPermission, hasAllPermissions, isLoading, permissions]);
  
  // 强制刷新权限
  const checkAgain = useCallback(async () => {
    setChecked(false);
    await refreshPermissions();
  }, [refreshPermissions]);
  
  return {
    hasAccess,   // 是否有权限访问
    isLoading,   // 权限是否加载中
    checked,     // 是否已完成检查
    checkAgain,  // 重新检查权限的方法
    permissions  // 当前用户所有权限
  };
} 