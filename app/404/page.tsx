"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
      <div className="space-y-8 max-w-md">
        {/* 404数字 */}
        <h1 className="text-9xl font-bold tracking-tighter text-primary">404</h1>
        
        {/* 错误信息 */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">页面未找到</h2>
          <p className="text-muted-foreground">
            抱歉，您访问的页面不存在或已被移除。
          </p>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild variant="default" size="lg" className="gap-2">
            <Link href="/">
              <div className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                返回首页
              </div>
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </Button>
        </div>
      </div>
    </div>
  );
} 