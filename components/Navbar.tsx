"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeToggleColor } from "@/components/theme-toggle-color"
import { UserMenu } from "@/components/auth/user-menu";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store";
import { Menu, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import axios from "axios";
import { MainNavigation } from "./main-navigation";
import { NavigationItem } from "@/components/navigation-item";
import { UserPermission } from "@/lib/permissions";

// 通知项目类型
interface NotificationItem {
  id: string;
  title: string;
  content: string;
  time: string;
}

const Navbar = () => {
  const { user, isLoggedIn } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  
  // 确保组件只在客户端渲染后显示
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 获取未读消息数
  useEffect(() => {
    if (isLoggedIn && mounted) {
      const fetchUnreadMessages = async () => {
        try {
          const response = await axios.get("/api/user/messages/unread");
          if (response.data && response.data.unreadCount !== undefined) {
            setUnreadCount(response.data.unreadCount);
            setNotificationItems(response.data.recentMessages || []);
          }
        } catch (error) {
          console.error("获取未读消息数失败:", error);
        }
      };
      
      fetchUnreadMessages();
      
      // 设置定时器，每分钟刷新一次未读消息数
      const intervalId = setInterval(fetchUnreadMessages, 60000);
      
      // 监听localStorage变化，以便在消息状态更新时刷新
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'messages-updated') {
          fetchUnreadMessages();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // 也监听直接在当前窗口中的变化
      const handleLocalUpdate = () => {
        const checkForUpdates = () => {
          const lastUpdate = localStorage.getItem('messages-updated');
          if (lastUpdate && lastUpdate !== lastCheckedUpdate.current) {
            lastCheckedUpdate.current = lastUpdate;
            fetchUnreadMessages();
          }
        };
        
        const localUpdateInterval = setInterval(checkForUpdates, 1000);
        return () => clearInterval(localUpdateInterval);
      };
      
      const localUpdateCleanup = handleLocalUpdate();
      
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('storage', handleStorageChange);
        localUpdateCleanup();
      };
    }
  }, [isLoggedIn, mounted]);
  
  // 用于跟踪最后检查的更新时间
  const lastCheckedUpdate = React.useRef<string | null>(null);

  // 移动端导航组件
  const MobileNavItems = () => (
    <>
      <NavigationItem href="/" label="首页" />
      <NavigationItem href="/Manuscript" label="实施底稿" />
      <NavigationItem 
        href="/services" 
        label="服务" 
        permission={[
          UserPermission.VIEW_SERVICES,
          UserPermission.ACCESS_DATABASE,
          UserPermission.ACCESS_MINIO,
          UserPermission.ACCESS_FILE_DOWNLOADS
        ]} 
      />
      <NavigationItem href="/forum" label="论坛" permission={UserPermission.VIEW_FORUM} />
    </>
  );

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-sm border-b border-border/40 z-10 site-navbar shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent transition-all duration-300 hover:scale-105">
              PonyKnows
            </Link>
          </div>

          {/* 桌面端导航菜单 */}
          <div className="hidden md:block">
            <MainNavigation />
          </div>

          {/* 登录按钮和主题切换 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <ThemeToggle />
              <ThemeToggleColor />
            </div>
            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 rounded-full transition-colors">
                    <Bell className="h-5 w-5 text-primary/70" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 border border-border/50 rounded-xl shadow-lg">
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-primary/90">通知消息</h4>
                      <Link href="/user/messages" className="text-xs text-primary hover:underline">
                        查看全部
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {notificationItems.length > 0 ? (
                        notificationItems.map((item: NotificationItem) => (
                          <div key={item.id} className="bg-muted/50 hover:bg-muted/80 p-2 rounded-md text-xs transition-colors">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-muted-foreground mt-1">{item.content}</p>
                            <p className="text-muted-foreground text-right text-[10px] mt-1">{item.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          暂无未读消息
                        </div>
                      )}
                    </div>
                    <Link 
                      href="/user/messages" 
                      className="block mt-3 text-xs text-center bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-md transition-colors"
                    >
                      查看全部消息
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!mounted ? (
              // 加载状态 - 显示占位符
              (<div className="w-8 h-8"></div>)
            ) : isLoggedIn ? (
              <UserMenu user={user!} />
            ) : (
              <>
                <Button variant="outline" asChild className="rounded-full border-primary/20 hover:bg-primary/5 transition-colors">
                  <Link href="/auth/login">登录</Link>
                </Button>
                <Button asChild className="rounded-full transition-transform hover:scale-105">
                  <Link href="/auth/register">注册</Link>
                </Button>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden hover:bg-primary/10 transition-colors">
                  <Menu className="h-5 w-5 text-primary/70" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="border-r border-border/50 p-0">
                <div className="p-4 border-b border-border/20">
                  <SheetTitle className="text-left text-primary/90">菜单导航</SheetTitle>
                </div>
                <div className="p-4 flex flex-col space-y-2">
                  <MobileNavItems />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
