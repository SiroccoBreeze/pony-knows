"use client";

import { NavigationMenuContent, NavigationMenuItem, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ListItemProps {
  title: string;
  href: string;
  permission?: string | string[];
  children?: React.ReactNode;
}

/**
 * 服务下拉菜单中的单个项目组件
 */
function ListItem({ title, href, permission, children }: ListItemProps) {
  const { hasPermission, hasAnyPermission, isLoading } = useAuthPermissions();
  
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
    <li>
      <Link
        href={href}
        className={cn(
          "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        )}
      >
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {children}
        </p>
      </Link>
    </li>
  );
}

/**
 * 服务下拉菜单组件
 */
export function ServicesDropdown() {
  const { hasAnyPermission } = useAuthPermissions();
  
  // 检查用户是否有权访问任何服务
  const hasAnyServicePermission = hasAnyPermission([
    Permission.ACCESS_SERVICES,
    Permission.ACCESS_FILE_LINKS,
    Permission.ACCESS_DATABASE,
    Permission.ACCESS_MINIO,
  ]);
  
  // 如果用户没有任何服务权限，则不显示下拉菜单
  if (!hasAnyServicePermission) return null;
  
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>服务</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
          {/* 全部服务 - 基本服务权限就可访问 */}
          <ListItem 
            href="/services" 
            title="全部服务"
            permission={Permission.ACCESS_SERVICES}
          >
            查看我们提供的所有服务内容
          </ListItem>
          
          {/* 数据库结构 - 需要特定权限 */}
          <ListItem 
            href="/services/database" 
            title="数据库结构"
            permission={Permission.ACCESS_DATABASE}
          >
            查询和浏览数据库表结构信息
          </ListItem>
          
          {/* 网盘服务 - 需要特定权限 */}
          <ListItem 
            href="/services/minio" 
            title="网盘服务"
            permission={Permission.ACCESS_MINIO}
          >
            基于MinIO的对象存储服务
          </ListItem>
          
          {/* 资源下载 - 需要特定权限 */}
          <ListItem 
            href="/services/file-links" 
            title="资源下载"
            permission={Permission.ACCESS_FILE_LINKS}
          >
            查看和下载共享的网盘资源文件
          </ListItem>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
} 