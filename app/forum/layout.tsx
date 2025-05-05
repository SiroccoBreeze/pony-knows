"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RestrictedRoute 
      permission={UserPermission.VIEW_FORUM}
      redirectTo="/404"
      loadingMessage="验证论坛访问权限中..."
    >
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </RestrictedRoute>
  );
} 