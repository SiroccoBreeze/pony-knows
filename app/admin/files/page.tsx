"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function FilesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // 模拟加载
    const timer = setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "提示",
        description: "文件管理功能正在开发中，即将上线",
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">文件管理</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>系统文件</CardTitle>
          <CardDescription>
            管理系统上传文件和图片
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium">功能开发中</h3>
              <p className="mt-2 text-muted-foreground">
                文件管理功能正在开发中，即将上线
              </p>
              <Button className="mt-4" variant="outline">
                返回仪表盘
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 