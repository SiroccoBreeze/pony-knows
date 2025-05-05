"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function ManuscriptLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute 
      permission={UserPermission.ACCESS_WORKING_PAPERS}
      redirectTo="/404"
      loadingMessage="验证实施底稿访问权限中..."
    >
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">实施底稿</h1>
        {children}
      </div>
    </RestrictedRoute>
  );
} 