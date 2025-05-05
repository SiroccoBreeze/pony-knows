"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function FileLinksLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_FILE_DOWNLOADS}
      redirectTo="/services"
      loadingMessage="验证资源下载权限中..."
    >
      {children}
    </RestrictedRoute>
  );
} 