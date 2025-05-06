"use client";

import { Button } from '@/components/ui/button';
import { AlertCircle, Home, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PermissionDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams?.get('from') || '';
  const permission = searchParams?.get('permission') || '';
  
  // 根据权限类型获取友好的名称
  const getPermissionName = (perm: string) => {
    switch(perm) {
      case 'access_database': return '数据库访问';
      case 'access_file_downloads': return '资源下载';
      case 'access_minio': return '网盘服务';
      case 'view_services': return '服务页面';
      default: return '所需';
    }
  };
  
  const permissionName = getPermissionName(permission);
  
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 mx-auto w-fit mb-4">
          <Lock size={24} />
        </div>
        <h2 className="text-2xl font-bold mb-2">访问权限不足</h2>
        <p className="mb-6 text-muted-foreground">
          {permission 
            ? `您需要 ${permissionName} 权限才能访问此页面。`
            : '您没有权限访问请求的页面。'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <span className="rotate-180">➜</span>
            返回上一页
          </Button>
          <Button asChild className="flex items-center gap-2 w-full sm:w-auto">
            <Link href="/">
              <Home size={16} />
              返回首页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 