'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function UserFileLinksRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到新的资源下载页面
    router.replace('/services/file-links');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">正在跳转到新的资源下载页面...</p>
      </div>
    </div>
  );
} 