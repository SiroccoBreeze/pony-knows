"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { cn } from "@/lib/utils";
import { UserPermission, AdminPermission } from "@/lib/permissions";

interface NavigationItemProps {
  href: string;
  label: string;
  permission?: UserPermission | AdminPermission | (UserPermission | AdminPermission)[];
  className?: string;
  children?: React.ReactNode;
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
  children 
}: NavigationItemProps) {
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission, isLoading } = useAuthPermissions();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  
  // 权限检查 - 如果正在加载权限，先默认显示
  if (!isLoading && permission) {
    if (Array.isArray(permission)) {
      // 如果需要多个权限中的任意一个
      if (!hasAnyPermission(permission)) return null;
    } else {
      // 如果需要特定权限
      if (!hasPermission(permission)) return null;
    }
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-2 rounded-md transition-all duration-200 hover:bg-primary/5",
        "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-in-out",
        isActive && "after:origin-bottom-left after:scale-x-100 text-primary font-medium",
        !isActive && "text-foreground/70 hover:text-foreground",
        className
      )}
    >
      <span className="relative z-10">{label}</span>
      {children}
    </Link>
  );
} 