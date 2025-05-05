"use client";

import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function NewPostPage() {
  return (
    <RestrictedRoute
      permission={UserPermission.CREATE_TOPIC}
      redirectTo="/forum"
      loadingMessage="验证发帖权限中..."
    >
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">发布新帖</h1>
        <div className="bg-card p-6 rounded-lg shadow-sm">
          <p className="text-muted-foreground">
            帖子编辑区域已受到权限保护，只有拥有CREATE_TOPIC权限的用户才能访问。
          </p>
        </div>
      </div>
    </RestrictedRoute>
  );
}
