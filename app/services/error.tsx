'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ServiceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台或服务
    console.error('服务页面错误:', error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-full bg-red-100 p-3 text-red-600 mx-auto w-fit mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-2xl font-bold mb-2">服务访问错误</h2>
        <p className="mb-6 text-muted-foreground">
          {error.message || '访问服务时发生了一个错误，这可能是由于权限不足或服务不可用。'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={reset}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw size={16} />
            重试
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