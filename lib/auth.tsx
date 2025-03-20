"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUserStore } from '@/store'; // 导入Zustand状态

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

// 认证提供者组件的内部组件
function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const loading = status === "loading" || isLoading;
  const user = session?.user as User | null;
  
  // 获取Zustand状态更新函数
  const zustandLogin = useUserStore(state => state.login);
  const zustandLogout = useUserStore(state => state.logout);

  // 当会话状态变化时更新Zustand状态
  useEffect(() => {
    console.log("AuthProvider - Session状态:", status, "用户:", session?.user);
    
    if (status === "authenticated" && session?.user) {
      const sessionUser = session.user as ExtendedUser;
      // 将next-auth用户数据转换为Zustand用户数据
      const zustandUser = {
        id: sessionUser.id || sessionUser.email || 'user-id', // 优先使用user.id
        name: sessionUser.name || '',
        email: sessionUser.email || '',
      };
      console.log("AuthProvider - 已登录，更新Zustand用户:", zustandUser);
      // 更新Zustand状态
      zustandLogin(zustandUser);
    } else if (status === "unauthenticated") {
      // 用户未认证，清除Zustand状态
      console.log("AuthProvider - 未认证，清除Zustand状态");
      zustandLogout();
    }
    
    // 避免在状态变化时总是刷新页面，这可能导致在404页面上无限循环
    // 只在特定情况下刷新页面，例如登录或注销后
  }, [status, session, router, zustandLogin, zustandLogout]);

  // 登录函数
  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
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
      
      // 强制更新会话
      await update();
      router.refresh();
      
      return result.ok || false;
    } catch (err) {
      console.error("登录错误:", err);
      setError(err instanceof Error ? err.message : "登录失败");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 注册函数
  const register = async (data: RegisterData): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    
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
      return await login(data.email, data.password);
    } catch (err) {
      console.error("注册错误:", err);
      setError(err instanceof Error ? err.message : "注册失败");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 注销函数
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
      // 直接调用Zustand的logout函数，确保状态立即更新
      zustandLogout();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// 认证提供者组件（移除重复的SessionProvider）
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderContent>{children}</AuthProviderContent>;
}

// 使用认证的自定义Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
}