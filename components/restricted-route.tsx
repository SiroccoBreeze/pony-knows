"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useRouter } from "next/navigation";
import { AdminPermission, UserPermission } from "@/lib/permissions";
import { FullScreenPermissionLoading } from "./ui/permission-loading";

type PermissionType = string | AdminPermission | UserPermission;

interface RestrictedRouteProps {
  /**
   * 需要的权限，可以是单个权限或权限数组
   */
  permission: PermissionType | PermissionType[];
  
  /**
   * 是否需要拥有所有权限（默认为false，只需拥有任意一个）
   */
  requireAll?: boolean;
  
  /**
   * 无权限时的重定向路径
   */
  redirectTo?: string;
  
  /**
   * 子组件
   */
  children: ReactNode;
  
  /**
   * 自定义加载组件
   */
  loadingComponent?: ReactNode;
  
  /**
   * 加载消息
   */
  loadingMessage?: string;
}

/**
 * 路由权限控制组件
 * 用于控制整个路由的访问权限
 */
export function RestrictedRoute({
  permission,
  requireAll = false,
  redirectTo = "/404",
  children,
  loadingComponent,
  loadingMessage = "验证访问权限中..."
}: RestrictedRouteProps) {
  const router = useRouter();
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isLoading, 
    permissions 
  } = useAuthPermissions();
  
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  // 检查权限状态
  useEffect(() => {
    // 权限加载中时不进行验证
    if (isLoading) return;
    
    // 检查完成后，设置为不在检查中
    setIsChecking(false);
    
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
    
    console.log(`[RestrictedRoute] 权限检查结果: ${accessGranted}`, {
      requiredPermissions: permission,
      userPermissions: permissions,
      requireAll
    });
    
    // 更新权限状态
    setHasAccess(accessGranted);
    
    // 如果无权限访问，重定向到指定页面
    if (!accessGranted) {
      // 如果已指定了重定向路径，直接使用它
      if (redirectTo !== "/404") {
        router.push(redirectTo);
      } else {
        // 否则重定向到权限拒绝页面，附带权限信息
        let permissionParam = "";
        if (typeof permission === 'string') {
          permissionParam = permission;
        } else if (Array.isArray(permission) && permission.length > 0) {
          permissionParam = permission[0] as string;
        }
        
        // 构建带有权限信息的URL
        const redirectUrl = `/permissions-denied?permission=${permissionParam}`;
        router.push(redirectUrl);
      }
    }
  }, [
    permission, 
    requireAll, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isLoading, 
    permissions,
    router,
    redirectTo
  ]);
  
  // 权限检查中或加载中显示加载状态
  if (isLoading || isChecking) {
    return loadingComponent || (
      <FullScreenPermissionLoading message={loadingMessage} />
    );
  }
  
  // 有权限时渲染内容
  return hasAccess ? <>{children}</> : null;
} 