"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from '@/store'; // 导入Zustand状态

// 在文件顶部，添加全局类型扩展
interface Window {
  __fetchingPermissions?: boolean;
}

// 用户类型定义
export interface User {
  id: string;
  name?: string;
  email: string;
}

// 扩展 NextAuth 用户类型
interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles?: Array<{
    role: {
      name: string;
      permissions: string[];
    }
  }>;
  permissions?: string[];
}

// 注册数据类型
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 在文件开头添加debounce函数防止频繁调用API
const debounceMap = new Map<string, NodeJS.Timeout>();

function debounce(key: string, fn: () => void, delay: number) {
  if (debounceMap.has(key)) {
    clearTimeout(debounceMap.get(key));
  }
  const timeoutId = setTimeout(() => {
    fn();
    debounceMap.delete(key);
  }, delay);
  debounceMap.set(key, timeoutId);
}

// 清除所有与认证相关的cookie
function clearAuthCookies() {
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.session-token",
    "next-auth.csrf-token",
    "__Secure-next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "__Host-next-auth.callback-url",
    "auth_session_complete"  // 添加自定义的完整会话标记cookie
  ];
  
  const paths = ["/", "/api", "/auth"];
  const domains = [window.location.hostname, `.${window.location.hostname}`];
  
  // 尝试各种组合删除cookie
  cookieNames.forEach(name => {
    paths.forEach(path => {
      // 标准cookie删除
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
      
      // 尝试不同的域
      domains.forEach(domain => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
      });
      
      // 添加安全标志
      if (location.protocol === "https:") {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; secure;`;
        domains.forEach(domain => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; secure;`;
        });
      }
    });
  });
  
  // 同时清除localStorage中的相关项
  localStorage.removeItem('auth_session_complete');
  localStorage.removeItem('monthly_key_status_cache');
  localStorage.removeItem('monthly_key_status_timestamp');
  
  console.log("已清除所有认证相关cookie和localStorage项");
}

// 需要登录才能访问的路径
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/admin',
  '/user/',
  '/my-account',
];

// 已登录用户不能访问的路径
const UNAUTHENTICATED_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
];

// 定义 AuthProvider 组件的属性
interface AuthProviderProps {
  children: React.ReactNode;
}

// 检查当前路径是否是登录页或注册页
const isAuthPage = (path: string) => {
  const authPages = ['/auth/login', '/auth/register', '/login', '/register'];
  return authPages.some(page => path.startsWith(page));
};

/**
 * 认证上下文提供者组件
 * 处理登录状态、页面跳转和保护路由
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const login = useUserStore(state => state.login);
  const logout = useUserStore(state => state.logout);
  const [showContent, setShowContent] = useState(false);
  const isLoggingOutRef = useRef(false);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  const lastLoginTimeRef = useRef<number>(0);

  // 特殊标记，避免循环登出
  const isLogoutNeededRef = useRef(false);

  useEffect(() => {
    console.log("AuthProvider - Session状态:", status, "用户:", session?.user?.id || "undefined");
    
    // 更详细地记录会话信息，帮助调试
    if (session) {
      console.log("AuthProvider - 会话对象:", {
        userId: session.user?.id,
        hasUser: !!session.user,
        userDetails: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          monthlyKeyVerified: session.user?.monthlyKeyVerified
        }
      });
    }

    // 防止重复处理相同的会话ID
    const currentSessionId = session?.user?.id;
    if (currentSessionId === lastSessionIdRef.current && status === "authenticated") {
      return;
    }
    
    // 清除localStorage中过期用户的数据
    if (status === 'authenticated' && !session?.user?.id) {
      try {
        // 检查localStorage中是否有用户信息
        const userStorageStr = localStorage.getItem('user-storage');
        if (userStorageStr) {
          const userStorage = JSON.parse(userStorageStr);
          if (userStorage?.state?.user?.id) {
            console.log("AuthProvider - 清除localStorage中的过期用户数据");
            localStorage.removeItem('user-storage');
            localStorage.removeItem('cached_permissions');
            localStorage.removeItem('cached_permissions_timestamp');
          }
        }
      } catch (e) {
        console.error("清除localStorage数据时出错:", e);
      }
    }
    
    lastSessionIdRef.current = currentSessionId;

    // 处理已认证但无效的会话
    if (status === 'authenticated' && !session?.user?.id && !isLoggingOutRef.current) {
      // 标记需要登出，但不立即执行，避免循环
      if (!isLogoutNeededRef.current) {
        console.log("AuthProvider - 会话已认证但用户ID无效，标记需要登出");
        isLogoutNeededRef.current = true;
        
        // 使用防抖机制来减少多次调用
        debounce('invalidSession', async () => {
          if (isLogoutNeededRef.current && !isLoggingOutRef.current) {
            console.log("AuthProvider - 执行无效会话登出");
            isLoggingOutRef.current = true;
            
            try {
              // 先执行本地状态清理
              logout();
              
              // 清除所有相关cookie
              clearAuthCookies();
              
              // 执行正式登出
              await signOut({ redirect: false });
              console.log("AuthProvider - 登出完成");
              
              // 重置标记状态
              isLogoutNeededRef.current = false;
              
              // 立即清除页面显示的用户数据
              document.dispatchEvent(new CustomEvent('force-clear-user-data'));
              
              // 重定向到登录页
              setTimeout(() => {
                // 首先清除URL参数，避免可能的循环重定向
                const cleanUrl = '/auth/login';
                window.history.replaceState({}, document.title, cleanUrl);
                
                // 然后跳转
                window.location.href = cleanUrl;
              }, 100);
            } catch (error) {
              console.error("AuthProvider - 登出失败:", error);
              
              // 即使登出API调用失败，也清除本地存储和cookie
              clearAuthCookies();
              localStorage.removeItem('user-storage');
              localStorage.removeItem('cached_permissions');
            } finally {
              setTimeout(() => {
                isLoggingOutRef.current = false;
              }, 5000); // 设置一个安全延迟，防止立即重试
            }
          }
        }, 500); // 减少防抖时间，更快响应无效会话
      }
      
      setShowContent(true);
      return;
    }

    // 正常会话处理
    if (status === 'authenticated' && session?.user?.id) {
      // 重置登出标记
      isLogoutNeededRef.current = false;
      lastLoginTimeRef.current = Date.now();
      
      // 有效的已认证会话
      login({
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || undefined,
        roles: session.user.roles,
        permissions: session.user.permissions,
      });
      setShowContent(true);
      console.log("AuthProvider - 用户已登录，ID:", session.user.id);
    } else if (status === 'unauthenticated') {
      // 未认证状态 - 清除本地用户状态
      logout();
      setShowContent(true);
      console.log("AuthProvider - 用户未登录");
    } else if (status === 'loading') {
      console.log("AuthProvider - 会话加载中...");
    }

    // 路由保护逻辑
    if (status !== 'loading') {
      const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname?.startsWith(route));
      const isUnauthenticatedRoute = UNAUTHENTICATED_ROUTES.some(route => pathname?.startsWith(route));

      // 重定向逻辑，当状态确定后执行
      if ((status === 'unauthenticated' || (status === 'authenticated' && !session?.user?.id)) && isProtectedRoute) {
        console.log("AuthProvider - 未登录用户或无效会话用户尝试访问受保护路由，重定向到登录页");
        router.push('/auth/login');
      } else if (status === 'authenticated' && session?.user?.id && isUnauthenticatedRoute) {
        console.log("AuthProvider - 已登录用户尝试访问登录/注册页，重定向到首页");
        router.push('/');
      }
    }
  }, [session, status, router, pathname, login, logout]);

  // 添加会话周期性检查，确保无效会话被及时清理
  useEffect(() => {
    // 检查是否在登录页或注册页等不需要周期性检查的页面
    const isAuthPage = UNAUTHENTICATED_ROUTES.some(route => pathname?.startsWith(route));
    // 如果是认证相关页面，不执行周期性检查
    if (isAuthPage) {
      return;
    }
    
    // 设置周期性检查 - 每15秒检查一次
    const intervalId = setInterval(() => {
      // 只检查状态显示为已认证但用户ID无效的情况
      if (status === 'authenticated' && !session?.user?.id && !isLoggingOutRef.current && !isLogoutNeededRef.current) {
        console.log("AuthProvider - 周期性检查：发现无效会话");
        isLogoutNeededRef.current = true;
        
        // 与主逻辑相同的处理，但不使用防抖
        (async () => {
          isLoggingOutRef.current = true;
          try {
            logout();
            clearAuthCookies();
            await signOut({ redirect: false });
            console.log("AuthProvider - 周期性检查：已登出无效会话");
            
            // 仅在用户曾经成功登录过的情况下才刷新页面
            if (lastLoginTimeRef.current > 0) {
              window.location.reload();
            }
          } catch (error) {
            console.error("AuthProvider - 周期性检查：登出失败", error);
          } finally {
            setTimeout(() => {
              isLoggingOutRef.current = false;
              isLogoutNeededRef.current = false;
            }, 5000);
          }
        })();
      }
      
      // 检查会话是否已过期但页面未刷新 (会话有效超过3小时)
      // 只对已登录用户检查会话过期
      if (status === 'authenticated' && session?.user?.id && lastLoginTimeRef.current > 0 && 
          Date.now() - lastLoginTimeRef.current > 3 * 60 * 60 * 1000) {
        console.log("AuthProvider - 周期性检查：会话可能已过期，刷新页面");
        // 使用路由刷新而不是页面刷新，提供更好的用户体验
        router.refresh();
      }
    }, 15000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [status, session, logout, pathname, router]);

  // 处理路由变化和会话状态，实现自动重定向
  useEffect(() => {
    const path = pathname || '';
    const url = new URL(window.location.href);
    const needKey = url.searchParams.get('needKey') === 'true';
    
    console.log(`AuthProvider - Session状态: ${status} 用户: ${session?.user?.id || 'undefined'}`);
    
    if (status === 'loading') {
      console.log('AuthProvider - 会话加载中...');
      return;
    }
    
    if (status === 'authenticated' && session?.user) {
      console.log(`AuthProvider - 用户已登录，ID: ${session.user.id}`);
      
      // 已登录用户尝试访问登录/注册页时，重定向到首页
      // 但如果URL包含needKey=true参数，表示需要密钥验证，不执行重定向
      if (isAuthPage(path) && !needKey) {
        console.log('AuthProvider - 已登录用户尝试访问登录/注册页，重定向到首页');
        
        // 检查URL是否带有回调参数
        const callbackUrl = url.searchParams.get('callbackUrl');
        
        // 检查用户的密钥验证状态
        const monthlyKeyVerified = session.user.monthlyKeyVerified;
        console.log(`AuthProvider - 用户密钥验证状态: ${monthlyKeyVerified}`);
        
        // 如果需要验证密钥，先验证密钥
        if (monthlyKeyVerified === false) {
          console.log('AuthProvider - 用户未验证密钥，需要进行验证');
          
          // 重新加载当前页面，但添加needKey参数
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('needKey', 'true');
          
          if (!currentUrl.href.includes('needKey=true')) {
            router.push(currentUrl.href);
            return;
          }
          
          // 如果当前URL已有needKey参数，不执行重定向，等待密钥验证
          return;
        }
        
        // 用户已验证密钥，可以重定向到目标页面
        if (callbackUrl) {
          // 如果有回调URL，优先使用回调参数重定向
          router.push(callbackUrl);
        } else {
          // 否则重定向到首页
          router.push('/');
        }
      }
    } else if (status === 'unauthenticated') {
      // 未认证状态 - 清除本地用户状态
      logout();
      setShowContent(true);
      console.log("AuthProvider - 用户未登录");
    }
  }, [status, pathname, router, session]);

  // 只有当状态确定后才显示内容
  if (!showContent && status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <>
      {children}
    </>
  );
}

// 使用认证的自定义Hook
export function useAuth() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = session?.user || null;
  
  // 登录函数
  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password
      });
      
      if (!result) {
        setError("登录请求失败，请稍后重试");
        return false;
      }
      
      if (result.error) {
        setError(result.error || "登录失败");
        return false;
      }
      
      // 登录成功后，获取最新会话数据
      try {
        await updateSession();
        console.log("登录成功，会话已更新");
      } catch (updateErr) {
        console.error("会话更新失败:", updateErr);
      }
      
      router.refresh();
      return true;
    } catch (err) {
      console.error("登录错误:", err);
      setError(err instanceof Error ? err.message : "登录失败");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // 注册函数
  const register = async (data: RegisterData): Promise<boolean> => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "注册失败，请稍后重试" }));
        setError(errorData.error || "注册失败");
        return false;
      }
      
      // 注册成功后自动登录
      const loginResult = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password
      });
      
      if (!loginResult?.ok) {
        // 注册成功但登录失败的情况
        setError("注册成功，但自动登录失败，请手动登录");
        return true; // 仍然返回true因为注册本身成功了
      }
      
      router.refresh();
      return true;
    } catch (err) {
      console.error("注册错误:", err);
      setError(err instanceof Error ? err.message : "注册失败");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // 注销函数
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      // 尝试通过API清除会话完整性标记
      try {
        await fetch('/api/auth/session-complete', {
          method: 'DELETE',
          credentials: 'include'
        });
        console.log("已通过API清除会话完整性标记");
      } catch (apiError) {
        console.error("通过API清除会话完整性标记失败:", apiError);
      }
      
      // 清除认证相关cookie
      if (typeof clearAuthCookies === 'function') {
        clearAuthCookies();
      } else {
        // 如果函数不可用，直接尝试清除重要的cookie
        document.cookie = "auth_session_complete=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "x-session-user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        localStorage.removeItem('auth_session_complete');
        localStorage.removeItem('monthly_key_status_cache');
      }
      
      // 执行正式登出
      await signOut({ redirect: false });
      
      // 刷新路由
      router.refresh();
    } finally {
      setLoading(false);
    }
  };
  
  return {
    user,
    loading: status === 'loading' || loading,
    error,
    login,
    register,
    logout,
    updateSession  // 添加updateSession方法，允许组件手动更新会话
  };
}