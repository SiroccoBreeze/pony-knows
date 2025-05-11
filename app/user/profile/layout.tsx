"use client";

import React from "react";
import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="profile-layout">
      <div className="relative">
        {/* 页头背景 */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-r from-primary/5 to-primary/10 z-0" />
        
        {/* 页面内容 */}
        <div className="relative z-10 pt-8">
          <RestrictedRoute
            permission={UserPermission.VIEW_PROFILE}
            redirectTo="/"
            loadingMessage="验证权限中..."
          >
            {children}
          </RestrictedRoute>
        </div>
      </div>
    </div>
  );
} 