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
import { useSession } from "next-auth/react";

// 通知项目类型
interface NotificationItem {
  id: string;
  title: string;
  content: string;
  time: string;
}

const Navbar = () => {
  const { user, isLoggedIn } = useUserStore();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true); // 默认为启用
  const hasFetchedParametersRef = React.useRef(false);
  
  // 确保组件只在客户端渲染后显示
  useEffect(() => {
    setMounted(true);
    
    // 检查注册功能是否启用，避免重复请求
    if (hasFetchedParametersRef.current) return;
    
    const checkRegistrationEnabled = async () => {
      try {
        hasFetchedParametersRef.current = true;
        const response = await fetch("/api/system-parameters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key: "enable_registration" }),
          cache: "no-store"
        });
        
        if (response.ok) {
          const data = await response.json();
          setRegistrationEnabled(data.value === "true");
        }
      } catch (error) {
        console.error("检查注册功能状态失败:", error);
      }
    };
    
    checkRegistrationEnabled();
  }, []);
  
  // 获取未读消息数量 - 仅在用户登录时
  useEffect(() => {
    // 如果未挂载或用户未登录，跳过获取消息
    if (!mounted || !isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    
    const fetchUnreadCount = async () => {
      try {
        // 检查会话状态和用户ID是否有效
        const isValidSession = status === "authenticated" && !!session?.user?.id;
        
        // 确认用户已登录且用户对象存在再进行API调用
        if (!isValidSession || !user || !user.id) {
          console.log("[消息] 用户未完全登录或会话已过期，跳过获取未读消息");
          return;
        }
        
        const response = await axios.get('/api/notifications/unread-count');
        if (response.data && typeof response.data.count === 'number') {
          setUnreadCount(response.data.count);
        }
      } catch (error) {
        console.error('获取未读消息数量失败:', error);
        // 出错时不显示消息数量
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    
    // 设置定时刷新
    const intervalId = setInterval(() => {
      // 再次检查会话状态是否有效
      const isValidSession = status === "authenticated" && !!session?.user?.id;
      if (isValidSession && isLoggedIn && user?.id) {
        fetchUnreadCount();
      }
    }, 60000); // 每分钟刷新一次
    
    return () => clearInterval(intervalId);
  }, [mounted, isLoggedIn, user, status, session]);
  
  // 获取未读消息数
  useEffect(() => {
    // 只有在用户已登录且组件挂载完成后才尝试获取消息
    if (!isLoggedIn || !mounted) {
      return;
    }
    
    // 定义获取消息的函数
    const fetchUnreadMessages = async () => {
      try {
        // 检查会话状态和用户ID是否有效
        const isValidSession = status === "authenticated" && !!session?.user?.id;
        
        // 再次检查用户是否登录，防止session状态在API请求过程中发生变化
        if (!isValidSession || !isLoggedIn) {
          console.log("[消息] 会话已过期或用户未登录，跳过获取消息");
          return;
        }
        
        const response = await axios.get("/api/user/messages/unread");
        if (response.data && response.data.unreadCount !== undefined) {
          setUnreadCount(response.data.unreadCount);
          setNotificationItems(response.data.recentMessages || []);
        }
      } catch (error: any) {
        // 如果是401错误，不记录到控制台，因为这是未登录用户的预期行为
        if (error?.response?.status !== 401) {
          console.error("获取未读消息数失败:", error);
        }
      }
    };
    
    // 立即获取一次
    fetchUnreadMessages();
    
    // 设置定时器，每分钟刷新一次未读消息数
    const intervalId = setInterval(() => {
      // 检查会话状态是否有效
      const isValidSession = status === "authenticated" && !!session?.user?.id;
      if (isValidSession && isLoggedIn) {
        fetchUnreadMessages();
      }
    }, 60000);
    
    // 监听localStorage变化，以便在消息状态更新时刷新
    const handleStorageChange = (e: StorageEvent) => {
      const isValidSession = status === "authenticated" && !!session?.user?.id;
      if (e.key === 'messages-updated' && isLoggedIn && isValidSession) {
        fetchUnreadMessages();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 也监听直接在当前窗口中的变化
    const handleLocalUpdate = () => {
      let localUpdateInterval: NodeJS.Timeout | null = null;
      
      // 只有在用户登录时才检查更新
      if (isLoggedIn) {
        const checkForUpdates = async () => {
          // 检查会话状态和用户ID是否有效
          const isValidSession = status === "authenticated" && !!session?.user?.id;
          
          // 再次检查用户是否登录，防止session状态在检查过程中发生变化
          if (!isValidSession || !isLoggedIn) {
            return;
          }
          
          const lastUpdate = localStorage.getItem('messages-updated');
          if (lastUpdate && lastUpdate !== lastCheckedUpdate.current) {
            lastCheckedUpdate.current = lastUpdate;
            await fetchUnreadMessages();
          }
        };
        
        localUpdateInterval = setInterval(checkForUpdates, 1000);
      }
      
      return () => {
        if (localUpdateInterval) {
          clearInterval(localUpdateInterval);
        }
      };
    };
    
    const localUpdateCleanup = handleLocalUpdate();
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      if (localUpdateCleanup) localUpdateCleanup();
    };
  }, [isLoggedIn, mounted, status, session]);
  
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
            
            {/* 消息通知按钮 - 仅在用户登录且会话有效时显示 */}
            {mounted && isLoggedIn && status === "authenticated" && !!session?.user?.id && (
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
            
            {/* 用户登录或登录按钮 */}
            {!mounted ? (
              // 加载状态 - 显示占位符
              (<div className="w-8 h-8"></div>)
            ) : isLoggedIn && status === "authenticated" && !!session?.user?.id ? (
              <UserMenu user={user!} />
            ) : (
              <>
                <Button variant="outline" asChild className="rounded-full border-primary/20 hover:bg-primary/5 transition-colors">
                  <Link href="/auth/login">登录</Link>
                </Button>
                {registrationEnabled && (
                  <Button asChild className="rounded-full transition-transform hover:scale-105">
                    <Link href="/auth/register">注册</Link>
                  </Button>
                )}
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
