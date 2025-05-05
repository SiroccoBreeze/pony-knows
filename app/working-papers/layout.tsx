"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function WorkingPapersLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_WORKING_PAPERS}
      redirectTo="/404"
      loadingMessage="验证底稿访问权限中..."
    >
      {children}
    </RestrictedRoute>
  );
} 