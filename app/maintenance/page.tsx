"use client";

import React from 'react';
import { Wrench, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuthPermissions } from '@/hooks/use-auth-permissions';
import { AdminPermission } from '@/lib/permissions';

export default function MaintenancePage() {
  const { hasPermission } = useAuthPermissions();
  const isAdmin = hasPermission(AdminPermission.ADMIN_ACCESS);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="max-w-lg w-full mx-auto text-center">
        <div className="bg-background border border-border p-8 rounded-xl shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Wrench className="h-16 w-16 text-primary animate-pulse" />
              <Settings className="h-8 w-8 text-primary absolute -bottom-2 -right-2 animate-spin" 
                style={{ animationDuration: '3s' }} />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">网站维护中</h1>
          
          <p className="text-muted-foreground mb-6">
            我们正在进行系统维护和升级，以提供更好的服务体验。
            请稍后再访问，感谢您的理解和支持。
          </p>
          
          <div className="text-sm text-muted-foreground mb-6">
            预计维护时间：<br />
            <span className="font-medium">1-2小时</span>
          </div>
          
          {isAdmin && (
            <div className="mt-8 border-t pt-6">
              <p className="text-sm text-primary mb-4">
                您已以管理员身份登录，可以继续访问后台管理
              </p>
              <Button asChild>
                <Link href="/admin">
                  进入管理后台
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 