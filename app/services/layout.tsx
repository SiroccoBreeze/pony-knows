"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function ServicesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // 只有访问根服务页面 /services 时才检查 VIEW_SERVICES 权限
  // 子页面如 /services/database 都有自己的权限检查，这里不做限制
  if (pathname === "/services") {
  return (
    <RestrictedRoute 
      permission={UserPermission.VIEW_SERVICES}
      redirectTo="/404"
      loadingMessage="验证服务访问权限中..."
    >
      <div className="container mx-auto py-8 px-4">
        {children}
      </div>
    </RestrictedRoute>
    );
  }
  
  // 对于子页面，直接放行，让它们的布局文件自行检查权限
  return (
    <div className="container mx-auto py-8 px-4">
      {children}
    </div>
  );
} 