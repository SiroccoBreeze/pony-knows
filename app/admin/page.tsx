"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Users,
  FileText,
  MessageSquare,
  FileCog,
  Bell,
} from "lucide-react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { Permission } from "@/lib/permissions";

// 统计卡片组件
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  onClick, 
  loading = false 
}: { 
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="w-12 h-6 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground pt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// 活动日志卡片
function ActivityCard({ loading = false }) {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>最近活动</CardTitle>
        <CardDescription>系统最近操作记录</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                <Users size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">管理员更新了用户权限</p>
                <p className="text-xs text-muted-foreground">30分钟前</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">发布了新帖子</p>
                <p className="text-xs text-muted-foreground">2小时前</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-300">
                <MessageSquare size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">删除了违规评论</p>
                <p className="text-xs text-muted-foreground">昨天</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    comments: 0,
    files: 0,
    notifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { hasPermission } = useAuthPermissions();

  useEffect(() => {
    // 模拟从API获取统计数据
    // 实际应用中，这里会调用后端API获取真实数据
    const timer = setTimeout(() => {
      setStats({
        users: 120,
        posts: 348,
        comments: 1024,
        files: 56,
        notifications: 12,
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="用户总数" 
          value={stats.users} 
          subtitle="活跃用户占比 87%" 
          icon={<Users size={18} />} 
          loading={loading}
          onClick={hasPermission(Permission.VIEW_USERS) ? () => router.push("/admin/users") : undefined}
        />
        <StatCard 
          title="帖子总数" 
          value={stats.posts} 
          subtitle="本周新增 24 篇" 
          icon={<FileText size={18} />} 
          loading={loading}
          onClick={hasPermission(Permission.VIEW_POSTS) ? () => router.push("/admin/posts") : undefined}
        />
        <StatCard 
          title="评论总数" 
          value={stats.comments} 
          subtitle="待审核 5 条" 
          icon={<MessageSquare size={18} />} 
          loading={loading}
          onClick={hasPermission(Permission.VIEW_COMMENTS) ? () => router.push("/admin/comments") : undefined}
        />
        <StatCard 
          title="文件总数" 
          value={stats.files} 
          subtitle="总存储 1.2GB" 
          icon={<FileCog size={18} />} 
          loading={loading}
          onClick={hasPermission(Permission.VIEW_FILES) ? () => router.push("/admin/files") : undefined}
        />
        <StatCard 
          title="未读通知" 
          value={stats.notifications} 
          subtitle="系统通知 8 条，用户反馈 4 条" 
          icon={<Bell size={18} />} 
          loading={loading}
          onClick={hasPermission(Permission.VIEW_NOTIFICATIONS) ? () => router.push("/admin/notifications") : undefined}
        />
        <StatCard 
          title="系统负载" 
          value="28%" 
          subtitle="服务器运行正常" 
          icon={<Activity size={18} />} 
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActivityCard loading={loading} />
        
        <Card>
          <CardHeader>
            <CardTitle>系统公告</CardTitle>
            <CardDescription>管理员信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/40 p-3 rounded-lg">
                <h3 className="font-medium text-sm">系统更新提醒</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  系统将于本周五凌晨2点进行例行维护，预计持续1小时。
                </p>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg">
                <h3 className="font-medium text-sm">新功能上线</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  内容管理模块新增批量操作功能，提高工作效率。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 