"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function MinioLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_MINIO}
      redirectTo="/services"
      loadingMessage="验证网盘服务访问权限中..."
    >
      {children}
    </RestrictedRoute>
  );
} 