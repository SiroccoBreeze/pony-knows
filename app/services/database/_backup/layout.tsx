"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_DATABASE}
      redirectTo="/services"
      loadingMessage="验证数据库访问权限中..."
    >
      {children}
    </RestrictedRoute>
  );
} 