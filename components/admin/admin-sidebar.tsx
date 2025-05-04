"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission } from "@/lib/permissions";
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
  Link as LinkIcon,
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  permission?: AdminPermission | AdminPermission[];
}

function SidebarItem({ icon, label, href, isActive, permission }: SidebarItemProps) {
  const { hasAdminPermission, hasAnyPermission } = useAuthPermissions();
  
  // 如果需要权限但用户没有，则不显示
  let shouldRender = true;
  if (permission) {
    if (Array.isArray(permission)) {
      shouldRender = hasAnyPermission(permission);
    } else {
      shouldRender = hasAdminPermission(permission);
    }
  }
  
  if (!shouldRender) return null;
  
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 mb-1 transition-all duration-200 admin-menu-item hover:translate-x-1",
          isActive 
            ? "bg-gradient-to-r from-primary/20 to-transparent text-primary font-medium border-l-4 border-primary pl-3" 
            : "hover:bg-primary/5 font-normal"
        )}
        size="sm"
      >
        <span className={cn(
          "p-1 rounded-md",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
        )}>
          {icon}
        </span>
        <span>{label}</span>
      </Button>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { hasAdminPermission } = useAuthPermissions();
  
  // 检查用户是否有管理员权限
  const isAdmin = hasAdminPermission(AdminPermission.ADMIN_ACCESS);
  
  // 创建一个渲染变量，而不是直接返回null
  // 这样可以保持hooks调用的一致性
  const shouldRenderSidebar = isAdmin;
  
  // 渲染侧边栏内容，但根据shouldRenderSidebar决定是否显示
  return shouldRenderSidebar ? (
    <div className={cn(
      "h-screen border-r flex flex-col transition-all duration-300 shadow-md",
      "bg-gradient-to-b from-muted/50 via-background to-background",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between h-16 border-b px-4 bg-gradient-to-r from-primary/5 to-background">
        {!collapsed && (
          <Link href="/admin" className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            管理控制台
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("transition-all duration-300", 
            collapsed ? "ml-auto" : "ml-auto hover:bg-primary/10"
          )}
        >
          {collapsed ? <Menu className="text-primary" /> : <ChevronLeft className="text-primary" />}
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <Link href="/admin">
              <Button 
                variant={pathname === "/admin" ? "secondary" : "ghost"} 
                size="icon"
                className={cn(
                  "transition-all duration-200 hover:scale-110",
                  pathname === "/admin" ? "bg-primary/20 text-primary shadow-sm" : "hover:bg-primary/10"
                )}
              >
                <LayoutDashboard size={20} />
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button 
                variant={pathname.startsWith("/admin/users") ? "secondary" : "ghost"} 
                size="icon"
                className={cn(
                  "transition-all duration-200 hover:scale-110",
                  pathname.startsWith("/admin/users") ? "bg-primary/20 text-primary shadow-sm" : "hover:bg-primary/10"
                )}
              >
                <Users size={20} />
              </Button>
            </Link>
            <Link href="/admin/roles">
              <Button 
                variant={pathname.startsWith("/admin/roles") ? "secondary" : "ghost"} 
                size="icon"
                className={cn(
                  "transition-all duration-200 hover:scale-110",
                  pathname.startsWith("/admin/roles") ? "bg-primary/20 text-primary shadow-sm" : "hover:bg-primary/10"
                )}
              >
                <ShieldCheck size={20} />
              </Button>
            </Link>
            <Link href="/admin/posts">
              <Button 
                variant={pathname.startsWith("/admin/posts") ? "secondary" : "ghost"} 
                size="icon"
                className={cn(
                  "transition-all duration-200 hover:scale-110",
                  pathname.startsWith("/admin/posts") ? "bg-primary/20 text-primary shadow-sm" : "hover:bg-primary/10"
                )}
              >
                <FileText size={20} />
              </Button>
            </Link>
            <Link href="/admin/file-links">
              <Button 
                variant={pathname.startsWith("/admin/file-links") ? "secondary" : "ghost"} 
                size="icon"
                className={cn(
                  "transition-all duration-200 hover:scale-110",
                  pathname.startsWith("/admin/file-links") ? "bg-primary/20 text-primary shadow-sm" : "hover:bg-primary/10"
                )}
              >
                <LinkIcon size={20} />
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
              <h4 className="text-xs font-semibold text-primary/70 px-4 py-2 flex items-center">
                <span className="mr-2 h-0.5 w-5 bg-primary/40 rounded-full"></span>
                用户和权限
              </h4>
              <SidebarItem
                icon={<Users size={20} />}
                label="用户管理"
                href="/admin/users"
                isActive={pathname.startsWith("/admin/users")}
                permission={AdminPermission.VIEW_USERS}
              />
              <SidebarItem
                icon={<ShieldCheck size={20} />}
                label="管理员角色"
                href="/admin/admin-roles"
                isActive={pathname.startsWith("/admin/admin-roles")}
                permission={AdminPermission.VIEW_ROLES}
              />
              <SidebarItem
                icon={<ShieldCheck size={20} />}
                label="用户角色"
                href="/admin/user-roles"
                isActive={pathname.startsWith("/admin/user-roles")}
                permission={AdminPermission.VIEW_ROLES}
              />
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-primary/70 px-4 py-2 flex items-center">
                <span className="mr-2 h-0.5 w-5 bg-primary/40 rounded-full"></span>
                内容管理
              </h4>
              <SidebarItem
                icon={<FileText size={20} />}
                label="帖子管理"
                href="/admin/posts"
                isActive={pathname.startsWith("/admin/posts")}
                permission={AdminPermission.VIEW_POSTS}
              />
              <SidebarItem
                icon={<Tag size={20} />}
                label="标签管理"
                href="/admin/tags"
                isActive={pathname.startsWith("/admin/tags")}
                permission={AdminPermission.ADMIN_ACCESS}
              />
              <SidebarItem
                icon={<MessageSquare size={20} />}
                label="评论管理"
                href="/admin/comments"
                isActive={pathname.startsWith("/admin/comments")}
                permission={AdminPermission.VIEW_COMMENTS}
              />
              <SidebarItem
                icon={<FolderOpen size={20} />}
                label="文件管理"
                href="/admin/files"
                isActive={pathname.startsWith("/admin/files")}
                permission={AdminPermission.VIEW_FILES}
              />
              <SidebarItem
                icon={<LinkIcon size={20} />}
                label="外部链接管理"
                href="/admin/file-links"
                isActive={pathname.startsWith("/admin/file-links")}
                permission={AdminPermission.VIEW_LINKS}
              />
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-primary/70 px-4 py-2 flex items-center">
                <span className="mr-2 h-0.5 w-5 bg-primary/40 rounded-full"></span>
                系统管理
              </h4>
              <SidebarItem
                icon={<Bell size={20} />}
                label="通知管理"
                href="/admin/notifications"
                isActive={pathname.startsWith("/admin/notifications")}
                permission={AdminPermission.VIEW_NOTIFICATIONS}
              />
              <SidebarItem
                icon={<Settings size={20} />}
                label="系统设置"
                href="/admin/settings"
                isActive={pathname.startsWith("/admin/settings")}
                permission={AdminPermission.VIEW_SETTINGS}
              />
              <SidebarItem
                icon={<FileBarChart size={20} />}
                label="操作日志"
                href="/admin/logs"
                isActive={pathname.startsWith("/admin/logs")}
                permission={AdminPermission.VIEW_LOGS}
              />
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  ) : null;
} 