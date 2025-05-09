"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clipboard, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";

export default function UserMonthlyKeyPage() {
  const [myKey, setMyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<{ year: number; month: number } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // 获取我的密钥
  const fetchMyKey = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/monthly-key/my-key");
      
      if (!response.ok) {
        throw new Error("获取密钥失败");
      }
      
      const data = await response.json();
      setMyKey(data.monthlyKey);
      setPeriod({
        year: data.year,
        month: data.month
      });
    } catch (error) {
      toast({
        title: "获取失败",
        description: "无法获取您的月度密钥",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 复制密钥到剪贴板
  const copyKeyToClipboard = async () => {
    if (!myKey) return;
    
    try {
      await navigator.clipboard.writeText(myKey);
      toast({
        title: "已复制",
        description: "密钥已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 刷新数据
  const refreshData = () => {
    setRefreshing(true);
    fetchMyKey();
  };

  // 首次加载
  useEffect(() => {
    fetchMyKey();
  }, []);

  // 如果用户未登录，显示提示
  if (!user) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>月度密钥</CardTitle>
            <CardDescription>您需要登录才能查看月度密钥</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>我的月度密钥</CardTitle>
              <CardDescription>
                查看您本月的访问密钥
                {period && (
                  <span className="ml-2">
                    当前周期: {period.year}年{period.month}月
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={refreshData} 
              disabled={refreshing || loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {refreshing ? "刷新中..." : "刷新"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted p-6 rounded-lg">
              <div className="mb-2 text-sm text-muted-foreground">您的本月密钥:</div>
              {loading ? (
                <div className="h-10 flex items-center">加载中...</div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-mono font-semibold">{myKey}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyKeyToClipboard}
                    className="flex items-center gap-2"
                  >
                    <Clipboard className="h-4 w-4" />
                    复制密钥
                  </Button>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm space-y-2 text-blue-600 dark:text-blue-400">
              <p className="font-medium">重要提示:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>每月的第一次登录需要输入此密钥进行验证</li>
                <li>密钥每月会自动更新，请勿分享给他人</li>
                <li>如遇验证问题，请联系系统管理员</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 