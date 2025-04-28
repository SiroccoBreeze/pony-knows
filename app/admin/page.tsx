"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">管理员仪表盘</h1>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <p className="text-lg">欢迎访问管理控制台</p>
          <p className="mt-2 text-muted-foreground">您已成功登录并验证管理员权限</p>
        </CardContent>
      </Card>
    </div>
  );
} 