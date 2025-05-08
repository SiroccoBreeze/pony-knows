"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { cn } from "@/lib/utils";
import { UserPermission, AdminPermission } from "@/lib/permissions";
import { useEffect, useRef, useState } from "react";

interface NavigationItemProps {
  href: string;
  label: string;
  permission?: UserPermission | AdminPermission | (UserPermission | AdminPermission)[];
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * 带权限检查的导航项组件
 * 根据用户权限决定是否渲染导航项
 */
export function NavigationItem({ 
  href, 
  label, 
  permission, 
  className,
  children,
  icon
}: NavigationItemProps) {
  const pathname = usePathname();
  const { hasPermission, permissions } = useAuthPermissions();
  const [isVisible, setIsVisible] = useState(!permission);
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  const hasCheckedPermission = useRef(false);
  
  // 调试日志
  useEffect(() => {
    if (permission) {
      console.log(`[NavigationItem] ${label} 权限检查开始:`, 
        Array.isArray(permission) ? permission.join(',') : permission);
    }
  }, [permission, label]);
  
  // 使用客户端权限检查 - 添加permissions作为依赖项以响应权限变化
  useEffect(() => {
    // 没有权限要求时直接显示
    if (!permission) {
      setIsVisible(true);
      return;
    }
    
    // 标记为已检查
    hasCheckedPermission.current = true;
    
    // 进行客户端权限检查
    if (Array.isArray(permission)) {
      // 多个权限中任意一个
      const hasAnyPermission = permission.some(p => hasPermission(p));
      console.log(`[NavigationItem] ${label} 客户端权限检查(多个):`, hasAnyPermission, permission, "当前权限:", permissions);
      setIsVisible(hasAnyPermission);
    } else {
      // 单个权限
      const hasPerm = hasPermission(permission);
      console.log(`[NavigationItem] ${label} 客户端权限检查(单个):`, hasPerm, permission, "当前权限:", permissions);
      setIsVisible(hasPerm);
    }
  }, [hasPermission, permission, label, permissions]); // 添加permissions作为依赖
  
  // 权限检查已完成，但无权访问
  if (!isVisible) {
    console.log(`[NavigationItem] ${label} 无访问权限，不显示`);
    return null;
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-1 px-3 py-2 rounded-md transition-all duration-200 hover:bg-primary/5",
        "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-in-out",
        isActive && "after:origin-bottom-left after:scale-x-100 text-primary font-medium",
        !isActive && "text-foreground/70 hover:text-foreground",
        className
      )}
    >
      {icon && <span className="text-current">{icon}</span>}
      <span className="relative z-10">{label}</span>
      {children}
    </Link>
  );
} 