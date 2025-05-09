"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { useSession } from "next-auth/react";

// 密钥验证表单验证模式
const keyAuthSchema = z.object({
  key: z.string().min(1, {
    message: "请输入月度密钥",
  }).transform(val => val.trim().toUpperCase()),
});

type KeyAuthFormValues = z.infer<typeof keyAuthSchema>;

interface MonthlyKeyAuthProps {
  onSuccess?: () => void;
}

// 最大尝试次数
const MAX_ATTEMPTS = 3;

export function MonthlyKeyAuth({ onSuccess }: MonthlyKeyAuthProps) {
  const [open, setOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  const form = useForm<KeyAuthFormValues>({
    resolver: zodResolver(keyAuthSchema),
    defaultValues: {
      key: "",
    },
  });

  // 检查是否已锁定
  useEffect(() => {
    const lockedUntil = localStorage.getItem('monthly_key_locked_until');
    if (lockedUntil) {
      const expiryTime = new Date(lockedUntil);
      if (expiryTime > new Date()) {
        // 当前时间仍在锁定期内
        setIsLocked(true);
        setLockExpiry(expiryTime);
        
        // 设置定时器以解除锁定
        const timeout = setTimeout(() => {
          setIsLocked(false);
          setLockExpiry(null);
          localStorage.removeItem('monthly_key_locked_until');
          setAttempts(0);
        }, expiryTime.getTime() - Date.now());
        
        return () => clearTimeout(timeout);
      } else {
        // 锁定期已过
        localStorage.removeItem('monthly_key_locked_until');
      }
    }
    
    // 恢复尝试次数
    const savedAttempts = localStorage.getItem('monthly_key_attempts');
    if (savedAttempts) {
      setAttempts(parseInt(savedAttempts));
    }
  }, []);

  // 获取密钥状态
  const checkKeyStatus = async () => {
    try {
      // 检查是否有跳过验证的标记
      const skipped = localStorage.getItem('monthly_key_verification_skipped');
      if (skipped === 'true') {
        console.log("用户已跳过密钥验证，不再显示验证对话框");
        setOpen(false);
        return;
      }
      
      const response = await fetch("/api/auth/monthly-key");
      const data = await response.json();
      
      if (response.ok) {
        // 检查本地缓存的锁定状态与服务器状态是否一致
        const locallyLocked = isLocked;
        const serverLocked = data.locked === true;
        
        // 如果本地显示锁定，但服务器没有锁定，清除本地锁定状态
        if (locallyLocked && !serverLocked) {
          console.log("本地锁定状态与服务器不一致，清除本地锁定");
          setIsLocked(false);
          setLockExpiry(null);
          localStorage.removeItem('monthly_key_locked_until');
          localStorage.setItem('monthly_key_attempts', '0');
          setAttempts(0);
          
          // 如果是由于服务器自动刷新导致的解锁，显示提示
          if (data.refreshed) {
            setError("锁定状态已刷新，您现在可以重新尝试验证密钥");
          }
        }
        
        // 如果密钥未验证，显示对话框
        if (!data.verified) {
          setOpen(true);
        } else {
          setOpen(false);
          if (onSuccess) onSuccess();
        }
      } else {
        console.error("获取密钥状态失败:", data.error);
      }
    } catch (err) {
      console.error("密钥状态请求错误:", err);
    }
  };

  // 当用户登录状态变化时检查密钥状态
  useEffect(() => {
    // 封装checkKeyStatus，避免依赖问题
    const checkStatus = () => {
      if (user) {
        checkKeyStatus();
      }
    };
    
    if (user) {
      // 初始加载时检查密钥状态
      checkStatus();
      
      // 定期检查密钥状态，每30秒检查一次
      const intervalId = setInterval(() => {
        if (isLocked) {
          console.log("定期检查密钥状态...");
          checkStatus();
        }
      }, 30000); // 30秒
      
      // 当页面获得焦点时检查状态
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isLocked) {
          console.log("页面获得焦点，检查密钥状态...");
          checkStatus();
        }
      };
      
      // 当窗口获得焦点时检查状态
      const handleFocus = () => {
        if (isLocked) {
          console.log("窗口获得焦点，检查密钥状态...");
          checkStatus();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLocked]);

  // 锁定验证功能
  const lockVerification = () => {
    // 锁定30分钟
    const lockTime = new Date();
    lockTime.setMinutes(lockTime.getMinutes() + 30);
    
    setIsLocked(true);
    setLockExpiry(lockTime);
    localStorage.setItem('monthly_key_locked_until', lockTime.toString());
    
    // 设置定时器以解除锁定
    setTimeout(() => {
      setIsLocked(false);
      setLockExpiry(null);
      localStorage.removeItem('monthly_key_locked_until');
      setAttempts(0);
      localStorage.setItem('monthly_key_attempts', '0');
    }, 30 * 60 * 1000); // 30分钟
  };

  // 更新会话中的月度密钥验证状态
  const updateSessionKeyStatus = async (verified: boolean) => {
    try {
      if (session) {
        // 更新会话中的月度密钥验证状态
        await updateSession({
          ...session,
          user: {
            ...session.user,
            monthlyKeyVerified: verified
          }
        });
        console.log(`已更新会话中的月度密钥验证状态: ${verified}`);
      }
    } catch (error) {
      console.error("更新会话状态失败:", error);
    }
  };

  // 提交密钥验证
  const onSubmit = async (values: KeyAuthFormValues) => {
    // 如果已锁定，不执行验证
    if (isLocked) return;
    
    setError(null);
    setIsVerifying(true);
    
    try {
      // 标准化密钥：转为大写并移除空格
      const normalizedKey = values.key.trim().toUpperCase();
      
      const response = await fetch("/api/auth/monthly-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: normalizedKey }),
      });
      
      if (response.ok) {
        // 验证成功，重置尝试次数
        setAttempts(0);
        localStorage.setItem('monthly_key_attempts', '0');
        
        // 更新会话中的密钥验证状态
        await updateSessionKeyStatus(true);
        
        form.reset();
        setOpen(false);
        
        // 检查URL是否包含callbackUrl参数
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const callbackUrlParam = url.searchParams.get('callbackUrl');
          
          if (callbackUrlParam) {
            // 解码callbackUrl，避免重复编码导致的问题
            const callbackUrl = callbackUrlParam.startsWith('http')
              ? decodeURIComponent(callbackUrlParam)
              : callbackUrlParam;
              
            // 检查URL是否会导致循环重定向
            if (callbackUrl.includes('/auth/login')) {
              console.log("检测到潜在的循环重定向，导航到主页");
              window.location.href = '/';
            } else {
              // 直接导航到回调URL，而不是刷新当前页面
              console.log(`密钥验证成功，重定向到: ${callbackUrl}`);
              window.location.href = callbackUrl;
            }
            return; // 防止执行下面的刷新操作
          }
        }
        
        // 如果没有回调URL，执行原来的逻辑
        await checkKeyStatus();
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        const data = await response.json();
        // 验证失败，增加尝试次数
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('monthly_key_attempts', newAttempts.toString());
        
        // 检查是否超过最大尝试次数
        if (newAttempts >= MAX_ATTEMPTS) {
          lockVerification();
          setError(`密钥验证失败次数过多，已锁定30分钟`);
        } else {
          setError(data.error || `密钥验证失败，还剩 ${MAX_ATTEMPTS - newAttempts} 次尝试机会`);
        }
      }
    } catch {
      setError("验证请求失败，请检查网络连接");
    } finally {
      setIsVerifying(false);
    }
  };

  // 当用户登出时清除密钥状态
  useEffect(() => {
    if (!user) {
      // 用户登出时，清除本地存储的密钥信息
      localStorage.removeItem('monthly_key_locked_until');
      localStorage.removeItem('monthly_key_attempts');
      localStorage.removeItem('monthly_key_verification_skipped');
      setAttempts(0);
      setIsLocked(false);
      setLockExpiry(null);
      setError(null);
      form.reset();
    }
  }, [user, form]);

  // 确保密钥信息清理功能
  const clearKeyInfo = useCallback(() => {
    // 重置表单
    form.reset();
    
    // 清除错误信息
    setError(null);
    
    // 完全清除所有状态信息
    localStorage.removeItem('monthly_key_attempts');
    localStorage.removeItem('monthly_key_locked_until');
    // 不清除跳过验证的标记，这样当用户刷新页面时不会重新弹出对话框
    // localStorage.removeItem('monthly_key_verification_skipped');
    setAttempts(0);
    setIsLocked(false);
    setLockExpiry(null);
    
    // 在控制台记录清理信息
    console.log("已清除密钥验证状态，可以登录其他账户");
  }, [form]);

  // 监听URL参数变化，重置跳过状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 检查URL中是否有needKey=true参数
      const url = new URL(window.location.href);
      const needKey = url.searchParams.get('needKey');
      
      if (needKey === 'true') {
        // 重置跳过标记，强制显示验证对话框
        localStorage.removeItem('monthly_key_verification_skipped');
        console.log("检测到needKey参数，重置验证状态");
      }
    }
  }, []);

  // 如果用户未登录，不显示任何内容
  if (!user) {
    return null;
  }

  // 计算剩余锁定时间
  const getRemainingLockTime = () => {
    if (!lockExpiry) return '';
    
    const now = new Date();
    const diffMs = lockExpiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return '';
    
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    return `${diffMins} 分钟`;
  };

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          // 允许用户关闭对话框，但同时清除所有信息
          setOpen(isOpen);
          
          // 当对话框关闭时清除全部信息
          if (!isOpen) {
            clearKeyInfo();
            // 更新用户会话中的密钥验证状态，明确标记为已跳过
            updateSessionKeyStatus(true);
            localStorage.setItem('monthly_key_verification_skipped', 'true');
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>每月密钥验证</DialogTitle>
            <DialogDescription>
              请输入本月的访问密钥以继续使用系统
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>月度密钥</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="请输入密钥" 
                        {...field} 
                        disabled={isLocked}
                        // 输入时自动转为大写
                        onChange={(e) => {
                          // 自动转为大写
                          e.target.value = e.target.value.toUpperCase();
                          field.onChange(e);
                        }}
                        maxLength={8}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      密钥为8位字母和数字组合，不区分大小写
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && (
                <div className="text-sm font-medium text-destructive">{error}</div>
              )}
              
              {isLocked && lockExpiry && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm text-amber-800 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>密钥验证已锁定，请等待 {getRemainingLockTime()} 后再试</p>
                    <p className="text-xs mt-1">您可以关闭此对话框，使用其他账户登录</p>
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isVerifying || isLocked}
              >
                {isVerifying ? "验证中..." : isLocked ? "已锁定" : "验证"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
} 