"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute
      permission={UserPermission.VIEW_PROFILE}
      redirectTo="/"
      loadingMessage="验证权限中..."
    >
      {children}
    </RestrictedRoute>
  );
} 