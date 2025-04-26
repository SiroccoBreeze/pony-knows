"use client";

import { useState, useEffect } from "react";
import { MinioFileManager } from '@/components/MinioFileManager';
import { isMobileDevice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MinioServicePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-foreground">MinIO 文件管理</h1>
              <p className="text-muted-foreground">移动端暂不支持文件管理功能，请使用桌面端访问。</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-muted-foreground mb-4">
                为了更好的文件管理体验，请使用桌面端访问此页面。
              </p>
              <Button asChild>
                <Link href="/">
                  返回首页
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">MinIO 文件管理</h1>
            <p className="text-muted-foreground">在这里管理你的对象存储文件，支持文件上传、下载和文件夹浏览</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg p-6">
            <MinioFileManager />
          </div>
        </div>
      </div>
    </div>
  );
} 