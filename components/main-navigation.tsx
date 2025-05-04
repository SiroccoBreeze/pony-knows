"use client";

import { NavigationItem } from "@/components/navigation-item";
import { UserPermission } from "@/lib/permissions";

/**
 * 主导航组件
 * 根据用户权限显示不同的导航项
 */
export function MainNavigation() {
  return (
    <div className="flex items-center space-x-1">
      <NavigationItem href="/" label="首页" />
      <NavigationItem href="/Manuscript" label="实施底稿" />
      <NavigationItem href="/services" label="服务" permission={UserPermission.VIEW_SERVICES} />
      <NavigationItem href="/services/minio" label="网盘服务" permission={UserPermission.ACCESS_MINIO} />
      <NavigationItem href="/services/file-links" label="资源下载" permission={UserPermission.ACCESS_FILE_DOWNLOADS} />
      <NavigationItem href="/forum" label="论坛" permission={UserPermission.VIEW_FORUM} />
    </div>
  );
} 