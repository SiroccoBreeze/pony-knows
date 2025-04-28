"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { Permission } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  MessageSquare,
  FolderOpen,
  Bell,
  Settings,
  FileBarChart,
  Menu,
  ChevronLeft,
  Tag,
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  permission?: Permission | Permission[];
}

function SidebarItem({ icon, label, href, isActive, permission }: SidebarItemProps) {
  const { hasPermission, hasAnyPermission } = useAuthPermissions();
  
  // 如果需要权限但用户没有，则不显示
  let shouldRender = true;
  if (permission) {
    if (Array.isArray(permission)) {
      shouldRender = hasAnyPermission(permission);
    } else {
      shouldRender = hasPermission(permission);
    }
  }
  
  if (!shouldRender) return null;
  
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 mb-1",
          isActive ? "bg-muted font-medium" : "font-normal"
        )}
        size="sm"
      >
        {icon}
        <span>{label}</span>
      </Button>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useAuthPermissions();
  
  // 创建一个渲染变量，而不是直接返回null
  // 这样可以保持hooks调用的一致性
  const shouldRenderSidebar = isAdmin;
  
  // 渲染侧边栏内容，但根据shouldRenderSidebar决定是否显示
  return shouldRenderSidebar ? (
    <div className={cn(
      "h-screen border-r flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between h-16 border-b px-4">
        {!collapsed && (
          <Link href="/admin" className="font-bold text-xl">
            管理控制台
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <Menu /> : <ChevronLeft />}
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <Link href="/admin">
              <Button 
                variant={pathname === "/admin" ? "secondary" : "ghost"} 
                size="icon"
              >
                <LayoutDashboard size={20} />
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button 
                variant={pathname.startsWith("/admin/users") ? "secondary" : "ghost"} 
                size="icon"
              >
                <Users size={20} />
              </Button>
            </Link>
            <Link href="/admin/roles">
              <Button 
                variant={pathname.startsWith("/admin/roles") ? "secondary" : "ghost"} 
                size="icon"
              >
                <ShieldCheck size={20} />
              </Button>
            </Link>
            <Link href="/admin/posts">
              <Button 
                variant={pathname.startsWith("/admin/posts") ? "secondary" : "ghost"} 
                size="icon"
              >
                <FileText size={20} />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <SidebarItem
              icon={<LayoutDashboard size={20} />}
              label="仪表盘"
              href="/admin"
              isActive={pathname === "/admin"}
            />
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground px-4 py-2">
                用户和权限
              </h4>
              <SidebarItem
                icon={<Users size={20} />}
                label="用户管理"
                href="/admin/users"
                isActive={pathname.startsWith("/admin/users")}
                permission={Permission.VIEW_USERS}
              />
              <SidebarItem
                icon={<ShieldCheck size={20} />}
                label="角色管理"
                href="/admin/roles"
                isActive={pathname.startsWith("/admin/roles")}
                permission={Permission.VIEW_ROLES}
              />
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground px-4 py-2">
                内容管理
              </h4>
              <SidebarItem
                icon={<FileText size={20} />}
                label="帖子管理"
                href="/admin/posts"
                isActive={pathname.startsWith("/admin/posts")}
                permission={Permission.VIEW_POSTS}
              />
              <SidebarItem
                icon={<Tag size={20} />}
                label="标签管理"
                href="/admin/tags"
                isActive={pathname.startsWith("/admin/tags")}
                permission={Permission.ADMIN_ACCESS}
              />
              <SidebarItem
                icon={<MessageSquare size={20} />}
                label="评论管理"
                href="/admin/comments"
                isActive={pathname.startsWith("/admin/comments")}
                permission={Permission.VIEW_COMMENTS}
              />
              <SidebarItem
                icon={<FolderOpen size={20} />}
                label="文件管理"
                href="/admin/files"
                isActive={pathname.startsWith("/admin/files")}
                permission={Permission.VIEW_FILES}
              />
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground px-4 py-2">
                系统管理
              </h4>
              <SidebarItem
                icon={<Bell size={20} />}
                label="通知管理"
                href="/admin/notifications"
                isActive={pathname.startsWith("/admin/notifications")}
                permission={Permission.VIEW_NOTIFICATIONS}
              />
              <SidebarItem
                icon={<Settings size={20} />}
                label="系统设置"
                href="/admin/settings"
                isActive={pathname.startsWith("/admin/settings")}
                permission={Permission.VIEW_SETTINGS}
              />
              <SidebarItem
                icon={<FileBarChart size={20} />}
                label="操作日志"
                href="/admin/logs"
                isActive={pathname.startsWith("/admin/logs")}
                permission={Permission.VIEW_LOGS}
              />
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  ) : null;
} 