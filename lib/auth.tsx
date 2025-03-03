"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

// 用户类型定义
export interface User {
  id: string;
  username: string;
  email: string;
}

// 注册数据类型
export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 检查本地存储中是否有用户信息
  useEffect(() => {
    // 确保代码在浏览器环境中运行
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  // 注册函数
  const register = async (data: RegisterData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // 这里应该是实际的API调用，现在我们模拟一个成功的注册
      // 在实际应用中，替换为真实的API调用
      if (data.email && data.password && data.username) {
        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 模拟用户数据
        const userData: User = {
          id: Math.random().toString(36).substring(2, 9),
          username: data.username,
          email: data.email
        };
        
        // 保存到状态和本地存储
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        setLoading(false);
        return true;
      } else {
        throw new Error('请提供完整的注册信息');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
      setLoading(false);
      return false;
    }
  };

  // 登录函数
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // 这里应该是实际的API调用，现在我们模拟一个成功的登录
      // 在实际应用中，替换为真实的API调用
      if (email && password) {
        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 模拟用户数据
        const userData: User = {
          id: '1',
          username: email.split('@')[0],
          email
        };
        
        // 保存到状态和本地存储
        setUser(userData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        setLoading(false);
        return true;
      } else {
        throw new Error('请提供有效的邮箱和密码');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      setLoading(false);
      return false;
    }
  };

  // 注销函数
  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证的自定义Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
} 