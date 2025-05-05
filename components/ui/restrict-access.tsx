"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission, UserPermission, Permission } from "@/lib/permissions";

interface RestrictAccessProps {
  /**
   * 需要的权限，可以是单个权限或权限数组
   */
  permission: string | string[] | Permission | AdminPermission | UserPermission | (Permission | AdminPermission | UserPermission)[];
  
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
 * 如果用户没有所需权限，不显示任何内容，只显示加载中动画
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
  }, [permission, requireAll, hasPermission, hasAnyPermission, hasAllPermissions, isLoading]);
  
  // 在权限加载中或没有权限时，只显示加载动画
  if (isLoading || !hasAccess) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
      </div>
    );
  }
  
  // 有权限时显示内容
  return <>{children}</>;
} 