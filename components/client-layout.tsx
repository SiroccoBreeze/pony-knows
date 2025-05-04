"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { AdminPermission } from "@/lib/permissions";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');
  const isAdminPage = pathname?.startsWith('/admin');
  const { hasAdminPermission, isLoading } = useAuthPermissions();
  
  // 检测用户是否有管理员权限
  const isAdmin = hasAdminPermission(AdminPermission.ADMIN_ACCESS);

  // 使用CSS类来控制导航栏显示
  useEffect(() => {
    if (isAdminPage && isAdmin && !isLoading) {
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
  }, [isAdminPage, isAdmin, isLoading]);

  // 登录页面始终隐藏导航和页脚
  const hideNavbarAndFooter = isAuthPage;

  return (
    <>
      {!hideNavbarAndFooter && <Navbar />}
      <main className={`flex-1 ${!hideNavbarAndFooter ? 'pt-16' : ''}`}>
        {children}
      </main>
      {!hideNavbarAndFooter && <Footer />}
    </>
  );
} 