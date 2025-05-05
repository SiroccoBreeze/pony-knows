"use client";

import { NavigationItem } from "@/components/navigation-item";
import { UserPermission } from "@/lib/permissions";
import { ServicesDropdown } from "./services-dropdown";
import { MessageCircle, Home, FileText } from "lucide-react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useState, useEffect } from "react";

/**
 * 主导航组件
 * 根据用户权限显示不同的导航项
 */
export function MainNavigation() {
  const { permissions } = useAuthPermissions();
  const [showForumTab, setShowForumTab] = useState(false);
  
  // 检查论坛权限
  useEffect(() => {
    console.log("[MainNavigation] 当前权限:", permissions);
    // 检查是否有VIEW_FORUM权限
    const hasForumAccess = permissions.includes(UserPermission.VIEW_FORUM);
    console.log("[MainNavigation] 论坛权限检查:", hasForumAccess);
    setShowForumTab(hasForumAccess);
  }, [permissions]);
  
  return (
    <div className="flex items-center space-x-2 px-1">
      <NavigationItem href="/" label="首页" icon={<Home className="h-4 w-4" />} />
      <NavigationItem 
        href="/Manuscript" 
        label="实施底稿" 
        icon={<FileText className="h-4 w-4" />} 
        permission={UserPermission.ACCESS_WORKING_PAPERS}
      />
      
      {/* 论坛导航项 - 直接根据状态显示，避免NavigationItem的二次权限检查 */}
      {showForumTab && (
        <NavigationItem 
          href="/forum" 
          label="论坛" 
          icon={<MessageCircle className="h-4 w-4" />} 
          permission={UserPermission.VIEW_FORUM}
        />
      )}
      
      {/* 服务下拉菜单组件 */}
      <ServicesDropdown />
    </div>
  );
} 