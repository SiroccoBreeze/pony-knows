"use client";

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { UserPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { Database, HardDrive, FileSymlink, LayersIcon } from "lucide-react";

interface ListItemProps {
  title: string;
  href: string;
  permission?: UserPermission | UserPermission[];
  isPermitted?: boolean; // 添加预先计算的权限结果
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * 服务下拉菜单中的单个项目组件
 */
function ListItem({ title, href, permission, isPermitted = true, children, icon }: ListItemProps) {
  // 如果没有权限要求或已预先确定有权限，则显示
  if (permission && !isPermitted) return null;
  
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
  const { hasPermission, isLoading, permissions } = useAuthPermissions();
  const [showMenu, setShowMenu] = useState(false);
  const permissionChecked = useRef(false);
  
  // 存储各项服务的权限状态
  const [servicePermissions, setServicePermissions] = useState({
    hasServiceAccess: false,
    hasDatabaseAccess: false,
    hasMinioAccess: false,
    hasFileDownloadAccess: false
  });
  
  // 一次性检查所有权限 - 添加permissions作为依赖，确保权限变化时重新计算
  const permissionsStatus = useMemo(() => {
    // 如果仍在加载，返回初始状态
    if (isLoading) return {
      hasServiceAccess: false,
      hasDatabaseAccess: false,
      hasMinioAccess: false,
      hasFileDownloadAccess: false,
      hasAnyServicePermission: false
    };
    
    // 使用原始权限数组直接检查，避免双重检查可能导致的不一致
    console.log("[ServicesDropdown] 权限检查时的原始权限列表:", permissions);
    
    // 直接从权限数组中检查
    const hasServiceAccess = permissions.includes(UserPermission.VIEW_SERVICES);
    const hasDatabaseAccess = permissions.includes(UserPermission.ACCESS_DATABASE);
    const hasMinioAccess = permissions.includes(UserPermission.ACCESS_MINIO);
    const hasFileDownloadAccess = permissions.includes(UserPermission.ACCESS_FILE_DOWNLOADS);
    
    // 只要有任何一种服务权限就显示菜单
    const hasAnyServicePermission = hasServiceAccess || hasDatabaseAccess || 
                                  hasMinioAccess || hasFileDownloadAccess;
    
    console.log("[ServicesDropdown] 服务权限检查(使用原始权限列表):", {
      hasServiceAccess,
      hasDatabaseAccess,
      hasMinioAccess,
      hasFileDownloadAccess,
      hasAnyServicePermission,
      allPermissions: permissions
    });
    
    // 更新权限状态
    setServicePermissions({
      hasServiceAccess,
      hasDatabaseAccess,
      hasMinioAccess,
      hasFileDownloadAccess
    });
    
    // 如果没有权限但理应有，尝试使用hasPermission作为后备方法
    if (!hasAnyServicePermission) {
      // 后备权限检查方法
      const backupHasServiceAccess = hasPermission(UserPermission.VIEW_SERVICES);
      const backupHasDatabaseAccess = hasPermission(UserPermission.ACCESS_DATABASE);
      const backupHasMinioAccess = hasPermission(UserPermission.ACCESS_MINIO);
      const backupHasFileDownloadAccess = hasPermission(UserPermission.ACCESS_FILE_DOWNLOADS);
      
      const backupHasAnyServicePermission = backupHasServiceAccess || backupHasDatabaseAccess || 
                                           backupHasMinioAccess || backupHasFileDownloadAccess;
      
      console.log("[ServicesDropdown] 后备服务权限检查(使用hasPermission):", {
        backupHasServiceAccess,
        backupHasDatabaseAccess,
        backupHasMinioAccess,
        backupHasFileDownloadAccess,
        backupHasAnyServicePermission
      });
      
      // 如果后备检查有权限，使用后备结果
      if (backupHasAnyServicePermission) {
        console.log("[ServicesDropdown] 使用后备权限检查结果");
        
        // 更新权限状态
        setServicePermissions({
          hasServiceAccess: backupHasServiceAccess,
          hasDatabaseAccess: backupHasDatabaseAccess,
          hasMinioAccess: backupHasMinioAccess,
          hasFileDownloadAccess: backupHasFileDownloadAccess
        });
        
        return {
          hasServiceAccess: backupHasServiceAccess,
          hasDatabaseAccess: backupHasDatabaseAccess,
          hasMinioAccess: backupHasMinioAccess,
          hasFileDownloadAccess: backupHasFileDownloadAccess,
          hasAnyServicePermission: backupHasAnyServicePermission
        };
      }
    }
    
    return {
      hasServiceAccess,
      hasDatabaseAccess,
      hasMinioAccess,
      hasFileDownloadAccess,
      hasAnyServicePermission
    };
  }, [hasPermission, isLoading, permissions]); // 添加hasPermission和permissions作为依赖
  
  // 设置是否显示菜单
  useEffect(() => {
    if (permissionChecked.current && !isLoading) return;
    
    // 更新菜单显示状态
    setShowMenu(permissionsStatus.hasAnyServicePermission);
    
    // 一旦检查过且不再加载，标记为已检查
    if (!isLoading) {
      permissionChecked.current = true;
    }
  }, [permissionsStatus, isLoading]);
  
  // 添加监听权限变化事件
  useEffect(() => {
    // 权限变化事件处理函数
    const handlePermissionsChanged = (event: Event) => {
      // 使用类型断言转换为自定义事件
      const customEvent = event as CustomEvent<{permissions: string[]}>;
      console.log("[ServicesDropdown] 接收到权限变化事件:", customEvent.detail?.permissions);
      
      // 直接检查权限，而不依赖useMemo重新计算
      const currentPermissions = customEvent.detail?.permissions || [];
      
      const hasServiceAccess = currentPermissions.includes(UserPermission.VIEW_SERVICES);
      const hasDatabaseAccess = currentPermissions.includes(UserPermission.ACCESS_DATABASE);
      const hasMinioAccess = currentPermissions.includes(UserPermission.ACCESS_MINIO);
      const hasFileDownloadAccess = currentPermissions.includes(UserPermission.ACCESS_FILE_DOWNLOADS);
      
      console.log("[ServicesDropdown] 权限变化后检查:", {
        hasServiceAccess,
        hasDatabaseAccess,
        hasMinioAccess,
        hasFileDownloadAccess
      });
      
      // 更新权限状态
      setServicePermissions({
        hasServiceAccess,
        hasDatabaseAccess,
        hasMinioAccess,
        hasFileDownloadAccess
      });
      
      // 更新菜单显示状态
      const hasAnyService = hasServiceAccess || hasDatabaseAccess || hasMinioAccess || hasFileDownloadAccess;
      setShowMenu(hasAnyService);
    };
    
    // 添加事件监听
    if (typeof window !== 'undefined') {
      window.addEventListener('permissions-changed', handlePermissionsChanged);
    }
    
    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('permissions-changed', handlePermissionsChanged);
      }
    };
  }, []);
  
  // 添加监听权限初始化完成事件
  useEffect(() => {
    // 权限初始化完成事件处理函数
    const handlePermissionsInitialized = (event: Event) => {
      // 使用类型断言转换为自定义事件
      const customEvent = event as CustomEvent<{permissions: string[]}>;
      console.log("[ServicesDropdown] 接收到权限初始化完成事件:", customEvent.detail?.permissions);
      
      // 直接检查权限，而不依赖useMemo重新计算
      const currentPermissions = customEvent.detail?.permissions || [];
      
      const hasServiceAccess = currentPermissions.includes(UserPermission.VIEW_SERVICES);
      const hasDatabaseAccess = currentPermissions.includes(UserPermission.ACCESS_DATABASE);
      const hasMinioAccess = currentPermissions.includes(UserPermission.ACCESS_MINIO);
      const hasFileDownloadAccess = currentPermissions.includes(UserPermission.ACCESS_FILE_DOWNLOADS);
      
      console.log("[ServicesDropdown] 权限初始化后检查:", {
        hasServiceAccess,
        hasDatabaseAccess,
        hasMinioAccess,
        hasFileDownloadAccess
      });
      
      // 更新权限状态
      setServicePermissions({
        hasServiceAccess,
        hasDatabaseAccess,
        hasMinioAccess,
        hasFileDownloadAccess
      });
      
      // 更新菜单显示状态
      const hasAnyService = hasServiceAccess || hasDatabaseAccess || hasMinioAccess || hasFileDownloadAccess;
      setShowMenu(hasAnyService);
    };
    
    // 添加事件监听
    if (typeof window !== 'undefined') {
      window.addEventListener('permissions-initialized', handlePermissionsInitialized);
    }
    
    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('permissions-initialized', handlePermissionsInitialized);
      }
    };
  }, []);
  
  // 如果用户没有任何服务权限或正在加载，则不显示下拉菜单
  if (!showMenu) return null;
  
  // 预渲染菜单内容，避免悬停时才开始加载
  const menuContent = (
    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 rounded-xl border border-border/40">
      {/* 全部服务 - 有VIEW_SERVICES权限时显示 */}
      {servicePermissions.hasServiceAccess && (
        <ListItem 
          href="/services" 
          title="全部服务"
          icon={<LayersIcon className="h-5 w-5" />}
        >
          查看我们提供的所有服务内容
        </ListItem>
      )}
      
      {/* 数据库结构 - 需要特定权限 */}
      {servicePermissions.hasDatabaseAccess && (
        <ListItem 
          href="/services/database" 
          title="数据库结构"
          icon={<Database className="h-5 w-5" />}
        >
          查询和浏览数据库表结构信息
        </ListItem>
      )}
      
      {/* 网盘服务 - 需要特定权限 */}
      {servicePermissions.hasMinioAccess && (
        <ListItem 
          href="/services/minio" 
          title="网盘服务"
          icon={<HardDrive className="h-5 w-5" />}
        >
          基于MinIO的对象存储服务
        </ListItem>
      )}
      
      {/* 资源下载 - 需要特定权限 */}
      {servicePermissions.hasFileDownloadAccess && (
        <ListItem 
          href="/services/file-links" 
          title="资源下载"
          icon={<FileSymlink className="h-5 w-5" />}
        >
          查看和下载共享的网盘资源文件
        </ListItem>
      )}
    </ul>
  );
  
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="px-3 py-2 rounded-md transition-all hover:bg-primary/5 text-foreground/70 hover:text-foreground data-[state=open]:bg-accent/50 data-[state=open]:text-foreground">
            服务
          </NavigationMenuTrigger>
          <NavigationMenuContent className="bg-popover shadow-lg">
            {menuContent}
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
} 