"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RolesPage() {
  const router = useRouter();
  
  useEffect(() => {
    // 重定向到管理员角色页面
    router.replace("/admin/admin-roles");
  }, [router]);
  
  return (
    <div className="text-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">正在重定向...</p>
    </div>
  );
} 