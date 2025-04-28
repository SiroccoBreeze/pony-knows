"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
// 移除未使用的Footer导入
// import Footer from "@/components/Footer";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');
  const isAdminPage = pathname?.startsWith('/admin');
  const { isAdmin } = useAuthPermissions();

  // 管理页面只在用户是管理员时隐藏导航栏，登录页面总是隐藏导航栏
  // 这样非管理员访问/admin时，会显示导航栏与404页面
  const hideNavbar = isAuthPage || (isAdminPage && isAdmin);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={`flex-1 ${!hideNavbar ? 'pt-16' : ''}`}>
        {children}
      </main>
      {/* 如果需要Footer，取消注释并使用 {!hideNavbar && <Footer />} */}
    </>
  );
} 