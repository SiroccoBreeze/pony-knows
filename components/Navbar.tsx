"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
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

  // 移动端导航菜单项
  const mobileNavItems = [
    { href: "/", label: "首页" },
    { href: "/Manuscript", label: "实施底稿" },
    { href: "/services", label: "服务" },
    { href: "/services/minio", label: "网盘服务" },
    { href: "/forum", label: "论坛" },
  ];

  return (
    <nav className="fixed top-0 w-full bg-background border-b z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              PonyKnows
            </Link>
          </div>

          {/* 桌面端导航菜单 */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/" className={navigationMenuTriggerStyle()}>
                      首页
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/Manuscript" className={navigationMenuTriggerStyle()}>
                      实施底稿
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>服务</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      <ListItem href="/services" title="全部服务">
                        查看我们提供的所有服务内容
                      </ListItem>
                      <ListItem href="/services/database" title="数据库结构">
                        查询和浏览数据库表结构信息
                      </ListItem>
                      <ListItem href="/services/minio" title="网盘服务">
                        基于MinIO的对象存储服务
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/forum" className={navigationMenuTriggerStyle()}>
                      论坛
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* 登录按钮和主题切换 */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <ThemeToggleColor />
            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="p-2">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">通知消息</h4>
                      <Link href="/user/messages" className="text-xs text-primary hover:underline">
                        查看全部
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {notificationItems.length > 0 ? (
                        notificationItems.map((item: NotificationItem) => (
                          <div key={item.id} className="bg-muted/50 p-2 rounded-md text-xs">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-muted-foreground mt-1">{item.content}</p>
                            <p className="text-muted-foreground text-right text-[10px] mt-1">{item.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-2 text-xs text-muted-foreground">
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
                <Button variant="outline" asChild>
                  <Link href="/auth/login">登录</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register">注册</Link>
                </Button>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetTitle className="text-lg font-semibold mb-4">导航菜单</SheetTitle>
                <nav className="flex flex-col space-y-4">
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium transition-colors hover:text-primary"
                      onClick={() => setIsOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

// 辅助组件用于创建导航菜单项
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    title: string;
  }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default Navbar;
