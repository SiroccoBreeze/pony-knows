"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { AdminPermission } from "@/lib/permissions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestrictedRoute
      permission={AdminPermission.ADMIN_ACCESS}
      redirectTo="/"
      loadingMessage="验证管理员权限中..."
    >
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 p-6">
          {children}
        </div>
      </div>
    </RestrictedRoute>
  );
} 