"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCookie, deleteCookie } from "cookies-next";
import { LoginRequired } from "./login-required";
import { useUserStore } from "@/store";

// 公开路由列表（不需要登录即可访问）
const publicRoutes = ['/', '/auth/login', '/auth/register', '/api'];

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const { isLoggedIn } = useUserStore();
  
  // 检查当前路径是否是公开路由
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  useEffect(() => {
    // 如果是公开路由，不需要检查认证状态
    if (isPublicRoute) {
      setShowLoginRequired(false);
      setIsLoading(false);
      return;
    }
    
    // 如果用户已登录，显示正常内容
    if (isLoggedIn) {
      setShowLoginRequired(false);
      setIsLoading(false);
      return;
    }
    
    // 检查cookie是否存在
    const requireAuth = getCookie('requireAuth');
    
    if (requireAuth === 'true' || !isLoggedIn) {
      setShowLoginRequired(true);
      // 清除cookie，避免重复检查
      deleteCookie('requireAuth');
    } else {
      setShowLoginRequired(false);
    }
    
    setIsLoading(false);
  }, [pathname, isPublicRoute, isLoggedIn]);
  
  // 如果正在加载且不是公开路由，显示空白内容，避免闪烁
  if (isLoading && !isPublicRoute) {
    return null; // 或者返回一个加载指示器
  }
  
  // 如果需要登录且不是公开路由，显示登录提示
  if (showLoginRequired && !isPublicRoute && !isLoggedIn) {
    return <LoginRequired />;
  }
  
  // 否则显示正常内容
  return <>{children}</>;
} 