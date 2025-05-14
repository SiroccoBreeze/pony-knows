"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { getSystemParameterWithDefault } from "@/lib/system-parameters";

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
  const [isEnabled, setIsEnabled] = useState(true); // 默认启用月度密钥验证
  const [didMount, setDidMount] = useState(false); // 追踪组件是否已挂载
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLoginPage = pathname?.includes('/auth/login') || false;
  const needKey = searchParams?.get('needKey') === 'true';
  const { data: session, update: updateSession } = useSession();
  const initChecked = useRef(false);
  const statusCheckComplete = useRef(false); // 用于防止多次状态检查

  const form = useForm<KeyAuthFormValues>({
    resolver: zodResolver(keyAuthSchema),
    defaultValues: {
      key: "",
    },
  });

  // 当组件挂载时，设置didMount为true
  useEffect(() => {
    setDidMount(true);
    
    // 如果是登录页面且有needKey参数，立即显示验证框
    if (isLoginPage && needKey) {
      console.log("检测到登录页面且有needKey参数，立即显示验证框");
      setOpen(true);
    }
    
    return () => setDidMount(false);
  }, [isLoginPage, needKey]);

  // 检查是否已锁定
  useEffect(() => {
    if (!didMount) return; // 组件未挂载，不执行

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
  }, [didMount]);

  // 检查是否启用月度密钥验证功能
  useEffect(() => {
    if (!didMount) return; // 组件未挂载，不执行
    
    const checkFeatureEnabled = async () => {
      try {
        // 从localStorage中检查缓存的启用状态，避免重复请求
        const cachedEnabled = localStorage.getItem('monthly_key_feature_enabled');
        
        if (cachedEnabled !== null) {
          const enabled = cachedEnabled === 'true';
          setIsEnabled(enabled);
          
          if (!enabled) {
            console.log("月度密钥验证功能已禁用 (缓存)");
            setOpen(false);
            if (onSuccess) onSuccess();
          }
          return;
        }
        
        const enabledValue = await getSystemParameterWithDefault('enable_monthly_key', 'true');
        const enabled = enabledValue === 'true';
        setIsEnabled(enabled);
        
        // 缓存启用状态，减少重复请求
        localStorage.setItem('monthly_key_feature_enabled', enabled.toString());
        
        if (!enabled) {
          console.log("月度密钥验证功能已禁用");
          setOpen(false);
          if (onSuccess) onSuccess();
        }
      } catch (error) {
        console.error("检查月度密钥验证功能状态失败:", error);
      }
    };
    
    checkFeatureEnabled();
  }, [onSuccess, didMount]);

  // 获取密钥状态
  const checkKeyStatus = useCallback(async (force = false) => {
    if (!didMount) return; // 组件未挂载，不执行
    
    // 如果在登录页面且有needKey参数，优先显示验证框
    if (isLoginPage && needKey && !statusCheckComplete.current) {
      console.log("登录页面检测到needKey参数，优先显示验证框");
      setOpen(true);
      statusCheckComplete.current = true;
      return;
    }
    
    if (statusCheckComplete.current && !force) return; // 已完成状态检查，除非强制刷新
    
    try {
      // 避免重复检查
      if (!force) {
        // 检查是否已经有密钥状态缓存且未过期
        const keyStatusCache = localStorage.getItem('monthly_key_status_cache');
        const keyStatusTimestamp = localStorage.getItem('monthly_key_status_timestamp');
        
        if (keyStatusCache && keyStatusTimestamp) {
          const timestamp = parseInt(keyStatusTimestamp, 10);
          const now = Date.now();
          
          // 缓存有效期为5分钟
          if (now - timestamp < 5 * 60 * 1000) {
            console.log("使用缓存的密钥状态");
            const cachedData = JSON.parse(keyStatusCache);
            
            // 如果密钥未验证，打开对话框
            if (!cachedData.verified && needKey) {
              setOpen(true);
            } else {
              setOpen(false);
              if (onSuccess) onSuccess();
            }
            statusCheckComplete.current = true;
            return;
          }
        }
      }
      
      // 如果功能已禁用，不执行验证
      if (!isEnabled) {
        console.log("月度密钥验证功能已禁用，跳过验证");
        setOpen(false);
        if (onSuccess) onSuccess();
        statusCheckComplete.current = true;
        return;
      }
      
      // 检查是否有跳过验证的标记
      const skipped = localStorage.getItem('monthly_key_verification_skipped');
      if (skipped === 'true') {
        console.log("用户已跳过密钥验证，不再显示验证对话框");
        setOpen(false);
        statusCheckComplete.current = true;
        return;
      }
      
      // 如果当前不在登录页面且无needKey参数，不显示对话框
      if (!needKey && !isLoginPage) {
        console.log("非登录页面且无needKey参数，不显示密钥验证框");
        setOpen(false);
        statusCheckComplete.current = true;
        return;
      }
      
      // 检查会话状态
      if (!session || !session.user) {
        console.log("用户未登录，跳过密钥验证");
        setOpen(false);
        statusCheckComplete.current = true;
        return;
      }
      
      // 使用带凭证的请求确保会话Cookie被发送
      const response = await fetch("/api/auth/monthly-key", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store",
          "Pragma": "no-cache"
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 缓存密钥状态
        localStorage.setItem('monthly_key_status_cache', JSON.stringify(data));
        localStorage.setItem('monthly_key_status_timestamp', Date.now().toString());
        
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
        
        // 如果密钥未验证且需要密钥验证，显示对话框
        if (!data.verified && needKey) {
          setOpen(true);
        } else {
          setOpen(false);
          if (onSuccess) onSuccess();
        }
        
        statusCheckComplete.current = true;
      } else {
        // 改进的错误处理
        const errorMessage = data.error || "获取密钥状态失败";
        console.error("获取密钥状态失败:", errorMessage);
        
        // 如果是401未授权错误且在登录页面，这是预期行为，不显示错误
        if (response.status === 401 && isLoginPage) {
          console.log("登录页面上的未授权状态是预期的，继续显示密钥验证框");
          setOpen(true);
          statusCheckComplete.current = true;
          return;
        }
        
        // 设置状态以继续显示验证框
        if (needKey) {
          setOpen(true);
          statusCheckComplete.current = true;
        }
      }
    } catch (err) {
      console.error("密钥状态请求错误:", err);
      
      // 如果在登录页并且需要密钥验证，即使出错也显示验证框
      if (isLoginPage && needKey) {
        console.log("即使请求失败，因为在登录页且需要密钥，继续显示验证框");
        setOpen(true);
        statusCheckComplete.current = true;
      }
    }
  }, [isEnabled, isLocked, onSuccess, didMount, needKey, isLoginPage, session]);

  // 检查用户的密钥状态并在需要时显示验证框
  useEffect(() => {
    // 如果在登录页面且有needKey参数，立即显示验证框
    if (isLoginPage && needKey) {
      console.log("登录页面检测到needKey参数，立即显示验证框");
      setOpen(true);
      return;
    }
    
    // 初次检查密钥状态
    if (didMount && !initChecked.current) {
      console.log("初次检查密钥状态...");
      initChecked.current = true;
      checkKeyStatus();
    }
  }, [checkKeyStatus, didMount, isLoginPage, needKey]);

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
        console.log(`正在更新会话中的月度密钥验证状态为: ${verified}`);
        
        // 更新会话中的月度密钥验证状态
        await updateSession({
          ...session,
          user: {
            ...session.user,
            monthlyKeyVerified: verified
          }
        });
        
        // 确保会话更新被应用 - 增加延迟时间
        await new Promise(resolve => setTimeout(resolve, 300)); // 减少延迟确保更新生效
        
        console.log(`已更新会话中的月度密钥验证状态: ${verified}`);
        
        // 强制刷新会话状态
        try {
          // 确保刷新会话后的状态展示正确
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2);
          const response = await fetch(`/api/auth/session?t=${timestamp}&r=${random}`, {
            cache: 'no-store',
            headers: { 
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const refreshedSession = await response.json();
            console.log("会话状态刷新成功，新状态:", refreshedSession?.user?.monthlyKeyVerified);
            
            // 如果会话更新不一致，再次尝试更新
            if (refreshedSession?.user?.monthlyKeyVerified !== verified) {
              console.log("会话状态更新不一致，再次尝试...");
              // 再次更新会话
              await updateSession({
                ...session,
                user: {
                  ...session.user,
                  monthlyKeyVerified: verified
                }
              });
              await new Promise(resolve => setTimeout(resolve, 300)); // 再次等待确保更新生效
            }
            
            return true;
          }
        } catch (error) {
          console.error("会话状态刷新失败:", error);
        }
      }
      return false;
    } catch (error) {
      console.error("更新会话状态失败:", error);
      return false;
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
        credentials: "include", // 确保发送认证Cookie
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: normalizedKey }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 验证成功，重置尝试次数
        setAttempts(0);
        localStorage.setItem('monthly_key_attempts', '0');
        
        // 更新会话中的密钥验证状态
        const updated = await updateSessionKeyStatus(true);
        console.log("会话更新完成，状态:", updated);
        
        form.reset();
        setOpen(false);
        
        // 移除跳过验证标记
        localStorage.removeItem('monthly_key_verification_skipped');
        
        // 标记密钥已验证，避免再次弹出验证框
        localStorage.setItem('monthly_key_status_cache', JSON.stringify({verified: true}));
        localStorage.setItem('monthly_key_status_timestamp', Date.now().toString());
        
        // 设置完整会话状态的标志，避免后续重新登录
        localStorage.setItem('auth_session_complete', 'true');
        
        // 设置cookie时包含用户ID信息，便于中间件验证cookie的有效性
        if (user?.id) {
          // 添加一个请求头标记，包含用户ID信息
          const headers = new Headers();
          headers.append('x-session-user', user.id);
          
          // 发送一个请求来设置带有用户信息的auth_session_complete cookie
          await fetch('/api/auth/session-complete', {
            method: 'POST',
            headers: headers,
            credentials: 'include'
          });
          
          console.log(`已设置带有用户ID(${user.id})的会话完整标记`);
        } else {
          // 后备方案：如果无法获取用户ID，仍然设置基本的cookie
          document.cookie = 'auth_session_complete=true; path=/; max-age=3600';
          console.log("未能获取用户ID，已设置基本的会话完整标记");
        }
        
        // 密钥验证成功后的回调
        if (onSuccess) {
          onSuccess();
        }
        
        // 如果在登录页面，完成验证后处理导航
        if (isLoginPage && router) {
          // 添加短延迟，确保会话状态已更新
          setTimeout(() => {
            // 解析原始URL，提取callbackUrl参数
            const url = new URL(window.location.href);
            const callbackUrl = url.searchParams.get('callbackUrl') || '/';
            
            // 导航到回调URL
            console.log("密钥验证成功，重定向到:", callbackUrl);
            window.location.href = callbackUrl;
          }, 500);
        }
      } else {
        // 改进的错误处理
        const errorMessage = data.error || `密钥验证失败，请重试`;
        
        // 验证失败，增加尝试次数
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('monthly_key_attempts', newAttempts.toString());
        
        // 检查是否超过最大尝试次数
        if (newAttempts >= MAX_ATTEMPTS) {
          lockVerification();
          setError(`密钥验证失败次数过多，已锁定30分钟`);
        } else {
          setError(errorMessage || `密钥验证失败，还剩 ${MAX_ATTEMPTS - newAttempts} 次尝试机会`);
        }
      }
    } catch (err) {
      console.error("密钥验证请求错误:", err);
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
    setAttempts(0);
    setIsLocked(false);
    setLockExpiry(null);
    
    // 在控制台记录清理信息
    console.log("已清除密钥验证状态");
  }, [form]);

  // 设置跳过验证标记（同时在localStorage和cookie中设置）
  const setSkipVerification = useCallback((skip: boolean) => {
    if (skip) {
      // 设置localStorage标记
      localStorage.setItem('monthly_key_verification_skipped', 'true');
      
      // 设置cookie，确保中间件可以读取
      document.cookie = 'monthly_key_verification_skipped=true; path=/; max-age=86400'; // 24小时有效
      
      console.log("已设置跳过密钥验证标记");
    } else {
      // 清除标记
      localStorage.removeItem('monthly_key_verification_skipped');
      document.cookie = 'monthly_key_verification_skipped=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      console.log("已清除跳过密钥验证标记");
    }
  }, []);

  // 监听URL参数变化，重置跳过状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 检查URL中是否有needKey=true参数
      const url = new URL(window.location.href);
      const needKey = url.searchParams.get('needKey');
      
      if (needKey === 'true') {
        // 重置跳过标记，强制显示验证对话框
        setSkipVerification(false);
        console.log("检测到needKey参数，重置验证状态");
      }
      
      // 初始化检查
      if (user) {
        checkKeyStatus();
      }
    }
  }, [setSkipVerification, user, checkKeyStatus]);

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
            
            // 设置跳过验证标记，避免重复弹出
            setSkipVerification(true);
            console.log("用户主动关闭了验证对话框，设置跳过验证标记");
            
            // 用户点击关闭对话框时，清除会话并重定向
            const url = new URL(window.location.href);
            const needKeyParam = url.searchParams.get('needKey');
            
            // 当用户关闭密钥验证框时，执行登出操作
            setTimeout(() => {
              // 使用NextAuth的signOut函数，但不进行自动重定向
              signOut({ 
                redirect: false,
                callbackUrl: '/auth/login'
              }).then(() => {
                console.log("用户关闭密钥验证，会话已清除，准备跳转到登录页");
                // 直接清除localStorage中的所有相关数据
                localStorage.removeItem('monthly_key_verification_skipped');
                localStorage.removeItem('monthly_key_attempts');
                localStorage.removeItem('monthly_key_locked_until');
                localStorage.removeItem('cached_permissions');
                localStorage.removeItem('cached_permissions_timestamp');
                localStorage.removeItem('auth_session_complete');
                localStorage.removeItem('monthly_key_status_cache');
                localStorage.removeItem('monthly_key_status_timestamp');
                
                // 清除所有相关cookie
                document.cookie.split(';').forEach(cookie => {
                  const [name] = cookie.trim().split('=');
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                });
                
                // 登出后重定向到登录页
                window.location.href = '/auth/login';
              });
            }, 100);
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