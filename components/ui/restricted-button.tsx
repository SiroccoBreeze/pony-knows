"use client";

import { ReactNode } from "react";
import { Button, ButtonProps } from "./button";
import { usePermissionCheck } from "@/hooks/use-permission-check";
import { Permission, AdminPermission, UserPermission } from "@/lib/permissions";

type PermissionType = string | Permission | AdminPermission | UserPermission;

interface RestrictedButtonProps extends ButtonProps {
  /**
   * 需要的权限，可以是单个权限或权限数组
   */
  permission: PermissionType | PermissionType[];
  
  /**
   * 是否需要拥有所有权限（默认为false，只需拥有任意一个）
   */
  requireAll?: boolean;
  
  /**
   * 按钮内容
   */
  children: ReactNode;
}

/**
 * 带权限控制的按钮组件
 * 当用户没有所需权限时，不显示此按钮
 */
export function RestrictedButton({
  permission,
  requireAll = false,
  children,
  ...buttonProps
}: RestrictedButtonProps) {
  // 使用权限检查hook
  const { hasAccess, isLoading } = usePermissionCheck(permission, requireAll);
  
  // 权限加载中或没有权限时，不渲染按钮
  if (isLoading || !hasAccess) {
    return null;
  }
  
  // 有权限时渲染按钮
  return (
    <Button {...buttonProps}>
      {children}
    </Button>
  );
} 