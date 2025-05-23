"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

// 简化布局组件，使用默认重定向到权限拒绝页面
export default function FileLinksLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_FILE_DOWNLOADS}
      loadingMessage="验证资源下载权限中..."
    >
      {children}
    </RestrictedRoute>
  );
}
