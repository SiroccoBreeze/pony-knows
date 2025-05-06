"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

// 简化布局组件，使用默认重定向到权限拒绝页面
export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_DATABASE}
      loadingMessage="验证数据库访问权限中..."
    >
      {children}
    </RestrictedRoute>
  );
}
