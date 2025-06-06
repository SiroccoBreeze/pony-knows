"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  User, 
  FileText, 
  BookmarkIcon, 
  Settings,
  BellRing,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

// 菜单项类型
interface MenuItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | null;
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 如果未登录，重定向到登录页面
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(pathname));
    }
  }, [status, router, pathname]);
  
  // 获取未读消息数
  useEffect(() => {
    // 只有在用户已认证且有有效用户ID时才获取消息数
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }
    
    const fetchUnreadMessages = async () => {
      try {
        // 再次检查会话有效性
        if (status !== "authenticated" || !session?.user?.id) {
          console.log("会话状态已变更，中止消息请求");
          return;
        }
        
        const response = await axios.get("/api/user/messages/unread");
        if (response.data && response.data.unreadCount !== undefined) {
          setUnreadCount(response.data.unreadCount);
        }
      } catch (error: any) {
        // 只记录非401错误
        if (error?.response?.status !== 401) {
          console.error("获取未读消息数失败:", error);
        }
      }
    };
    
    fetchUnreadMessages();
    
    // 设置定时器，每30秒刷新一次未读消息数
    const intervalId = setInterval(() => {
      // 检查会话是否仍然有效
      if (status === "authenticated" && session?.user?.id) {
        fetchUnreadMessages();
      }
    }, 30000);
    
    // 监听localStorage变化，以便在消息状态更新时刷新
    const checkUpdateHandler = () => {
      let lastUpdate = '';
      
      const checkStorageUpdate = () => {
        // 如果用户状态不是已认证或没有有效用户ID，不继续检查
        if (status !== "authenticated" || !session?.user?.id) {
          return;
        }
        
        const currentUpdate = localStorage.getItem('messages-updated');
        if (currentUpdate && currentUpdate !== lastUpdate) {
          lastUpdate = currentUpdate;
          fetchUnreadMessages();
        }
      };
      
      const localInterval = setInterval(checkStorageUpdate, 1000);
      return () => clearInterval(localInterval);
    };
    
    const storageCheckCleanup = checkUpdateHandler();
    
    return () => {
      clearInterval(intervalId);
      storageCheckCleanup();
    };
  }, [status, session]);
  
  // 关闭移动菜单当路由改变时
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  // 如果会话正在加载或者未认证，显示加载状态
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="container mx-auto py-4 px-4 sm:py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto mb-3 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <p className="text-muted-foreground">
              {status === "loading" ? "加载中..." : "正在重定向到登录页面..."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // 菜单项配置
  const menuItems: MenuItem[] = [
    { 
      href: "/user/profile", 
      icon: <User className="h-5 w-5" />, 
      label: "个人资料" 
    },
    { 
      href: "/user/messages", 
      icon: <BellRing className="h-5 w-5" />, 
      label: "消息中心",
      badge: unreadCount > 0 ? unreadCount : null
    },
    { 
      href: "/user/posts", 
      icon: <FileText className="h-5 w-5" />, 
      label: "帖子管理" 
    },
    { 
      href: "/user/bookmarks", 
      icon: <BookmarkIcon className="h-5 w-5" />, 
      label: "我的收藏" 
    },
    { 
      href: "/user/settings", 
      icon: <Settings className="h-5 w-5" />, 
      label: "账户设置" 
    }
  ];

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6">
      {/* 移动端菜单按钮 */}
      <div className="flex items-center justify-between md:hidden mb-4">
        <h1 className="text-2xl font-bold">个人中心</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={isMobileMenuOpen ? "关闭菜单" : "打开菜单"}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {/* 移动端菜单 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden mb-6"
          >
            <nav className="bg-card border rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <h2 className="text-xl font-bold">个人中心</h2>
              </div>
              <ul className="p-2 space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center px-4 py-3 rounded-md transition-all",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted"
                        )}>
                        <div className="flex items-center w-full">
                          <span className={cn(
                            "mr-3",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                          
                          {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                          
                          {isActive && !item.badge && (
                            <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 桌面侧边栏 - 只在md以上显示 */}
        <div className="hidden md:block col-span-1">
          <div className="bg-card border rounded-lg shadow-sm overflow-hidden sticky top-20">
            <div className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <h2 className="text-xl font-bold">个人中心</h2>
            </div>
            
            <nav className="p-2">
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  
                  return (
                    <motion.li 
                      key={item.href}
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center px-4 py-3 rounded-md transition-all",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "hover:bg-muted"
                        )}>
                        <div className="flex items-center w-full">
                          <span className={cn(
                            "mr-3",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                          
                          {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                            <motion.span
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center"
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </motion.span>
                          )}
                          
                          {isActive && !item.badge && (
                            <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
        
        {/* 主内容 */}
        <div className="col-span-1 md:col-span-3">
          <div className="bg-card border rounded-lg shadow-sm p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 