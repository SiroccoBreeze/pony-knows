"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission, UserPermission } from "@/lib/permissions";

interface RestrictAccessProps {
  /**
   * 需要的权限，可以是单个权限或权限数组
   */
  permission: string | string[] | AdminPermission | UserPermission | (AdminPermission | UserPermission)[];
  
  /**
   * 是否要求拥有所有权限（而不是任意一个权限）
   */
  requireAll?: boolean;
  
  /**
   * 要显示的内容
   */
  children: ReactNode;
  
  /**
   * 自定义加载组件
   */
  loadingComponent?: ReactNode;
}

/**
 * 权限控制组件
 * 如果用户没有所需权限，不显示任何内容
 */
export function RestrictAccess({
  permission,
  requireAll = false,
  children,
  loadingComponent
}: RestrictAccessProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isLoading 
  } = useAuthPermissions();
  
  const [hasAccess, setHasAccess] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  
  useEffect(() => {
    // 如果权限还在加载，不进行判断
    if (isLoading) return;
    
    let accessGranted = false;
    
    if (Array.isArray(permission)) {
      // 检查多个权限
      accessGranted = requireAll 
        ? hasAllPermissions(permission as any[]) 
        : hasAnyPermission(permission as any[]);
    } else {
      // 检查单个权限
      accessGranted = hasPermission(permission as any);
    }
    
    setHasAccess(accessGranted);
    setPermissionChecked(true);
  }, [permission, requireAll, hasPermission, hasAnyPermission, hasAllPermissions, isLoading]);
  
  // 如果权限已检查且没有访问权限，直接返回null不显示任何内容
  if (permissionChecked && !hasAccess) {
    return null;
  }
  
  // 如果权限仍在加载中，显示加载动画
  if (isLoading && !permissionChecked) {
    return loadingComponent || null;
  }
  
  // 权限检查通过，显示内容
  return <>{children}</>;
} 