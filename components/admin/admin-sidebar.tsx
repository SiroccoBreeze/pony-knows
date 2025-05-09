"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bell,
  Settings,
  FileBarChart,
  Menu,
  ChevronLeft,
  Tag,
  UserCheck,
  FileSymlink,
  KeyRound,
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}

function SidebarItem({ icon, label, href, isActive }: SidebarItemProps) {  
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
  const { permissions } = useAuthPermissions();
  
  // 移除不必要的权限检查，总是显示侧边栏
  // 这样可以保持hooks调用的一致性
  // 原因：RestrictedRoute组件已经验证了管理员权限，不需要这里再检查
  const shouldRenderSidebar = true;
  
  // 定义管理菜单项的数组 - 修正路径匹配实际目录结构
  const ADMIN_MENU = [
    {
      title: "控制台",
      href: "/admin",
      icon: LayoutDashboard,
      permission: "admin_access", // 使用字符串表示权限
    },
    {
      title: "用户管理",
      href: "/admin/users",
      icon: Users,
      permission: "admin_access", // 简化为只检查admin_access权限
    },
    {
      title: "用户角色",
      href: "/admin/user-roles",
      icon: UserCheck,
      permission: "admin_access", // 简化为只检查admin_access权限
    },
    {
      title: "月度密钥管理",
      href: "/admin/monthly-keys",
      icon: KeyRound,
      permission: "admin_access", // 简化为只检查admin_access权限
    },
    {
      title: "帖子管理",
      href: "/admin/posts", // 修改为实际目录名
      icon: MessageSquare,
      permission: "admin_access", // 简化为只检查admin_access权限
    },
    {
      title: "资源管理",
      href: "/admin/file-links", // 修改为实际目录名
      icon: FileSymlink, 
      permission: "admin_access", // 简化为只检查admin_access权限
    },
    {
      title: "系统设置",
      href: "/admin/settings",
      icon: Settings,
      permission: "admin_access", // 简化为只检查admin_access权限
    },
    {
      title: "标签管理", 
      href: "/admin/tags",
      icon: Tag,
      permission: "admin_access", // 确保管理员可以看到
    },
    {
      title: "评论管理",
      href: "/admin/comments",
      icon: MessageSquare,
      permission: "admin_access", // 确保管理员可以看到
    },
    {
      title: "系统日志",
      href: "/admin/logs",
      icon: FileBarChart,
      permission: "admin_access", // 确保管理员可以看到
    },
    {
      title: "通知管理",
      href: "/admin/notifications",
      icon: Bell,
      permission: "admin_access", // 确保管理员可以看到
    },
  ];
  
  // 简化权限检查，使用useMemo缓存菜单项
  const menuWithPermissionCheck = useMemo(() => {
    // 检查用户是否有admin_access权限（管理员）
    const isAdminUser = permissions.includes("admin_access");
    
    // 简化权限检查逻辑 - 只要有admin_access权限就能看到所有菜单项
    return ADMIN_MENU.map(item => ({
      ...item,
      hasPermission: isAdminUser // 只要是管理员就显示所有菜单项
    }));
  }, [permissions]);
  
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
            {menuWithPermissionCheck
              .filter(item => item.hasPermission)
              .map((item, index) => (
                <Link href={item.href} key={index}>
                  <Button 
                    variant={pathname.startsWith(item.href) || (item.href === '/admin' && pathname === '/admin') ? "secondary" : "ghost"} 
                    size="icon"
                    className={cn(
                      "transition-all duration-200 hover:scale-110",
                      pathname.startsWith(item.href) || (item.href === '/admin' && pathname === '/admin') 
                        ? "bg-primary/20 text-primary shadow-sm" 
                        : "hover:bg-primary/10"
                    )}
                  >
                    {item.icon && <item.icon size={20} />}
                  </Button>
                </Link>
              ))}
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
              
              {/* 用户管理项 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/users")?.hasPermission && (
                <SidebarItem
                  icon={<Users size={20} />}
                  label="用户管理"
                  href="/admin/users"
                  isActive={pathname.startsWith("/admin/users")}
                />
              )}
              
              {/* 用户角色 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/user-roles")?.hasPermission && (
                <SidebarItem
                  icon={<UserCheck size={20} />}
                  label="用户角色"
                  href="/admin/user-roles"
                  isActive={pathname.startsWith("/admin/user-roles")}
                />
              )}
              
              {/* 月度密钥管理 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/monthly-keys")?.hasPermission && (
                <SidebarItem
                  icon={<KeyRound size={20} />}
                  label="月度密钥管理"
                  href="/admin/monthly-keys"
                  isActive={pathname.startsWith("/admin/monthly-keys")}
                />
              )}
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-primary/70 px-4 py-2 flex items-center">
                <span className="mr-2 h-0.5 w-5 bg-primary/40 rounded-full"></span>
                内容管理
              </h4>
              
              {/* 帖子管理 - 修改路径 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/posts")?.hasPermission && (
                <SidebarItem
                  icon={<MessageSquare size={20} />}
                  label="帖子管理"
                  href="/admin/posts"
                  isActive={pathname.startsWith("/admin/posts")}
                />
              )}
              
              {/* 标签管理 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/tags")?.hasPermission && (
                <SidebarItem
                  icon={<Tag size={20} />}
                  label="标签管理"
                  href="/admin/tags"
                  isActive={pathname.startsWith("/admin/tags")}
                />
              )}
              
              {/* 评论管理 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/comments")?.hasPermission && (
                <SidebarItem
                  icon={<MessageSquare size={20} />}
                  label="评论管理"
                  href="/admin/comments"
                  isActive={pathname.startsWith("/admin/comments")}
                />
              )}
              
              {/* 资源管理 - 修改路径 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/file-links")?.hasPermission && (
                <SidebarItem
                  icon={<FileSymlink size={20} />}
                  label="资源管理"
                  href="/admin/file-links"
                  isActive={pathname.startsWith("/admin/file-links")}
                />
              )}
            </div>
            
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-primary/70 px-4 py-2 flex items-center">
                <span className="mr-2 h-0.5 w-5 bg-primary/40 rounded-full"></span>
                系统设置
              </h4>
              
              {/* 系统设置 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/settings")?.hasPermission && (
                <SidebarItem
                  icon={<Settings size={20} />}
                  label="系统设置"
                  href="/admin/settings"
                  isActive={pathname === "/admin/settings"}
                />
              )}
              
              {/* 参数配置 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/settings")?.hasPermission && (
                <SidebarItem
                  icon={<Settings size={20} />}
                  label="参数配置"
                  href="/admin/settings/parameters"
                  isActive={pathname === "/admin/settings/parameters"}
                />
              )}
              
              {/* 系统日志 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/logs")?.hasPermission && (
                <SidebarItem
                  icon={<FileBarChart size={20} />}
                  label="系统日志"
                  href="/admin/logs"
                  isActive={pathname.startsWith("/admin/logs")}
                />
              )}
              
              {/* 通知管理 */}
              {menuWithPermissionCheck.find(i => i.href === "/admin/notifications")?.hasPermission && (
                <SidebarItem
                  icon={<Bell size={20} />}
                  label="通知管理"
                  href="/admin/notifications"
                  isActive={pathname.startsWith("/admin/notifications")}
                />
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  ) : null;
} 