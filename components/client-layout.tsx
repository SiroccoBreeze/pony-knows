"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import Footer from "@/components/Footer";
import { useEffect } from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');
  const isAdminPage = pathname?.startsWith('/admin');
  const isHomePage = pathname === '/'; // 判断是否为首页
  const { permissions } = useAuthPermissions();
  
  // 检测用户是否有管理员权限 - 直接使用字符串形式
  const isAdmin = permissions.includes("admin_access");

  // 使用CSS类来控制导航栏显示
  useEffect(() => {
    if (isAdminPage && isAdmin) {
      // 管理员访问管理页面时，添加admin-mode类
      document.body.classList.add('admin-mode');
    } else {
      // 其他情况移除admin-mode类
      document.body.classList.remove('admin-mode');
    }
    
    // 组件卸载时清理
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, [isAdminPage, isAdmin]);

  // 登录页面和管理员页面不显示导航
  const hideNavbar = isAuthPage || (isAdminPage && isAdmin);
  
  // 只在首页显示页脚，或者根据之前的条件
  const showFooter = isHomePage && !hideNavbar;

  // 不需要添加内边距的情况：登录页面或管理员页面
  const noPadding = isAuthPage || (isAdminPage && isAdmin);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={`flex-1 ${!noPadding ? 'pt-16' : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
} 