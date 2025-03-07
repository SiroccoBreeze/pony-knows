"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store";

export default function UserDashboard() {
  const router = useRouter();
  const { user } = useUserStore();
  
  // 如果用户信息加载完成后，重定向到个人资料页面
  useEffect(() => {
    if (user) {
      router.push("/user/profile");
    }
  }, [user, router]);

  // 显示加载状态
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">个人中心</h1>
      <p className="text-muted-foreground">正在加载您的个人信息...</p>
    </div>
  );
} 