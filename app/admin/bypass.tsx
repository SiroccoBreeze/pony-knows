'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// 临时定义权限枚举
enum Permission {
  ADMIN_ACCESS = 'admin_access',
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_user',
  DELETE_USERS = 'delete_user',
  CREATE_USERS = 'create_user'
}

export default function BypassPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  // 管理员必要权限列表
  const adminPermissions = [
    Permission.ADMIN_ACCESS,
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.CREATE_USERS,
    'admin_access',
    'admin.*',
  ];

  const handleBypass = () => {
    setIsProcessing(true);
    setMessage('正在设置权限绕过...');

    try {
      // 存储权限到本地存储
      localStorage.setItem('admin_bypass', 'true');
      localStorage.setItem('admin_permissions', JSON.stringify(adminPermissions));
      
      // 显示成功消息
      setMessage('绕过设置成功！正在重定向到管理页面...');
      
      // 延迟后重定向
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
    } catch (error) {
      setMessage(`设置绕过时出错: ${error}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>管理员访问绕过</CardTitle>
          <CardDescription>
            该工具允许您绕过正常的权限检查，直接访问管理员页面。仅用于调试目的。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm">当前用户: {session?.user?.name || '未登录'}</p>
              <p className="text-sm">用户邮箱: {session?.user?.email || 'N/A'}</p>
            </div>
            
            {message && (
              <div className="bg-blue-50 p-3 rounded-md text-blue-800">
                {message}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleBypass} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? '处理中...' : '启用管理员访问'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 