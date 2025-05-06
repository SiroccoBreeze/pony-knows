"use client";

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { UserPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Database, HardDrive, FileSymlink, LayersIcon } from "lucide-react";

interface ListItemProps {
  title: string;
  href: string;
  permission?: UserPermission | UserPermission[];
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * 服务下拉菜单中的单个项目组件
 */
function ListItem({ title, href, permission, children, icon }: ListItemProps) {
  const { hasPermission, isLoading } = useAuthPermissions();
  const [isVisible, setIsVisible] = useState(!permission); // 如果没有权限要求，默认可见
  const hasChecked = useRef(false);
  
  // 使用客户端缓存的权限进行检查，避免多次API调用
  useEffect(() => {
    if (!permission || isVisible || hasChecked.current || isLoading) return;
    
    hasChecked.current = true;
    
    if (Array.isArray(permission)) {
      // 检查多个权限中的任意一个
      const hasAnyRequiredPermission = permission.some(p => hasPermission(p));
      setIsVisible(hasAnyRequiredPermission);
    } else {
      // 检查单个权限
      setIsVisible(hasPermission(permission));
    }
  }, [permission, hasPermission, isLoading, isVisible]);
  
  // 权限检查中或无权访问时不显示
  if (!isVisible) return null;
  
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex select-none items-center space-x-2 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        )}
      >
        {icon && <div className="text-primary">{icon}</div>}
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
            {children}
          </p>
        </div>
      </Link>
    </li>
  );
}

/**
 * 服务下拉菜单组件
 */
export function ServicesDropdown() {
  const { hasPermission, isLoading } = useAuthPermissions();
  const [showMenu, setShowMenu] = useState(false);
  const permissionChecked = useRef(false);
  
  // 一次性检查权限，避免循环调用API
  useEffect(() => {
    // 防止重复检查
    if (permissionChecked.current || isLoading) return;
    
    // 标记为已检查
    permissionChecked.current = true;
    
    // 使用客户端缓存的权限进行一次性检查 - 只要有任何一种服务权限就显示菜单
    const hasDatabaseAccess = hasPermission(UserPermission.ACCESS_DATABASE);
    const hasMinioAccess = hasPermission(UserPermission.ACCESS_MINIO);
    const hasFileDownloadAccess = hasPermission(UserPermission.ACCESS_FILE_DOWNLOADS);
    const hasServiceAccess = hasPermission(UserPermission.VIEW_SERVICES);
    
    // 只要有任何一种服务权限就显示菜单
    const hasAnyServicePermission = hasServiceAccess || hasDatabaseAccess || 
                                   hasMinioAccess || hasFileDownloadAccess;
    
    setShowMenu(hasAnyServicePermission);
  }, [hasPermission, isLoading]);
  
  // 如果用户没有任何服务权限或正在加载，则不显示下拉菜单
  if (!showMenu) return null;
  
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="px-3 py-2 rounded-md transition-all hover:bg-primary/5 text-foreground/70 hover:text-foreground data-[state=open]:bg-accent/50 data-[state=open]:text-foreground">
            服务
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 bg-background shadow-lg rounded-xl border border-border/40">
              {/* 全部服务 - 基本服务权限就可访问 */}
              <ListItem 
                href="/services" 
                title="全部服务"
                permission={UserPermission.VIEW_SERVICES}
                icon={<LayersIcon className="h-5 w-5" />}
              >
                查看我们提供的所有服务内容
              </ListItem>
              
              {/* 数据库结构 - 需要特定权限 */}
              <ListItem 
                href="/services/database" 
                title="数据库结构"
                permission={UserPermission.ACCESS_DATABASE}
                icon={<Database className="h-5 w-5" />}
              >
                查询和浏览数据库表结构信息
              </ListItem>
              
              {/* 网盘服务 - 需要特定权限 */}
              <ListItem 
                href="/services/minio" 
                title="网盘服务"
                permission={UserPermission.ACCESS_MINIO}
                icon={<HardDrive className="h-5 w-5" />}
              >
                基于MinIO的对象存储服务
              </ListItem>
              
              {/* 资源下载 - 需要特定权限 */}
              <ListItem 
                href="/services/file-links" 
                title="资源下载"
                permission={UserPermission.ACCESS_FILE_DOWNLOADS}
                icon={<FileSymlink className="h-5 w-5" />}
              >
                查看和下载共享的网盘资源文件
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
} 