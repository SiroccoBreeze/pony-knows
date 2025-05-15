"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useEffect, useState, useRef } from "react";
import { useLoadingStore } from "@/store/use-loading-store";
import { Shield } from "lucide-react";
import { LoadingScreen } from "../ui/loading-screen";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/store";

interface PermissionsLoadingProviderProps {
  children: React.ReactNode;
}

/**
 * 权限加载提供者
 * 确保权限完全加载后再显示内容
 * 未登录用户直接跳过权限加载
 */
export function PermissionsLoadingProvider({ children }: PermissionsLoadingProviderProps) {
  const { data: session, status } = useSession();
  const { isLoggedIn } = useUserStore();
  const { isLoading: isPermissionsLoading, permissions } = useAuthPermissions();
  const [isReady, setIsReady] = useState(false);
  const { startLoading, stopLoading } = useLoadingStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const permissionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 检查会话是否有效
  const isSessionValid = status === "authenticated" && !!session?.user?.id;
  
  // 初始状态设置 - 立即执行以减少闪烁
  useEffect(() => {
    console.log("[权限提供者] 初始化，会话状态:", status, "用户:", session?.user?.id ? "已登录" : "未登录");
    
    // 更严格的未登录检查：状态为unauthenticated或没有用户信息
    if (!isSessionValid) {
      console.log("[权限提供者] 检测到未登录用户或会话无效，立即跳过权限加载");
      setIsReady(true);
      stopLoading(); // 确保加载状态被清除
      return;
    }
    
    // 首次加载时创建清理函数
    return () => {
      isUnmountedRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (permissionCheckTimeoutRef.current) {
        clearTimeout(permissionCheckTimeoutRef.current);
        permissionCheckTimeoutRef.current = null;
      }
      stopLoading();
    };
  }, [session, status, stopLoading, isSessionValid]);
  
  // 防止刷新页面时的错误重定向
  useEffect(() => {
    // 如果组件已卸载，不执行任何操作
    if (isUnmountedRef.current) return;
    
    // 检查当前路径
    const path = window.location.pathname;
    
    // 处理数据库访问路径
    if (path.includes('/database')) {
      // 检查之前的权限确认标记
      const accessVerified = sessionStorage.getItem('database_access_verified');
      
      if (accessVerified === 'true') {
        console.log("[权限提供者] 数据库访问已预先确认，跳过路径检查");
        return;
      }
      
      // 如果权限已加载完成且包含数据库访问权限
      if (!isPermissionsLoading && permissions.includes('access_database')) {
        console.log("[权限提供者] 用户拥有数据库访问权限，设置访问确认");
        sessionStorage.setItem('database_access_verified', 'true');
        return;
      }
      
      // 如果权限已加载完成但不包含数据库访问权限，则重定向
      if (!isPermissionsLoading && permissions.length > 0 && !permissions.includes('access_database')) {
        console.log("[权限提供者] 用户尝试访问数据库但没有权限，将重定向到权限拒绝页面");
        localStorage.setItem('last_denied_permission', 'access_database');
        window.location.href = '/permissions-denied?permission=access_database';
        return;
      }
    }
  }, [permissions, isPermissionsLoading, isSessionValid]);
  
  // 监听会话状态变化
  useEffect(() => {
    // 如果组件已卸载，不执行任何操作
    if (isUnmountedRef.current) return;
    
    console.log("[权限提供者] 会话状态变化:", status, "用户:", session?.user?.id ? "已登录" : "未登录");
    
    // 检查用户权限 - 但只在权限加载完成后进行路径检查
    if (status === "authenticated" && session?.user && !isPermissionsLoading && permissions.length > 0) {
      // 清除之前的权限检查超时
      if (permissionCheckTimeoutRef.current) {
        clearTimeout(permissionCheckTimeoutRef.current);
      }
      
      // 延迟权限检查以确保页面渲染和权限完全加载
      permissionCheckTimeoutRef.current = setTimeout(() => {
        // 获取用户权限
        const userPermissions = session.user.permissions || [];
        
        // 记录用户权限，以便调试
        console.log("[权限提供者] 用户权限:", userPermissions);
        
        permissionCheckTimeoutRef.current = null;
      }, 300); // 添加300ms延迟，确保页面完全加载
    }
    
    // 根据会话状态采取不同行动
    if (status === "unauthenticated") {
      // 用户未登录
      console.log("[权限提供者] 检测到未登录状态，立即准备好视图");
      setIsReady(true);
      stopLoading();
    } else if (status === "loading") {
      // 会话正在加载
      console.log("[权限提供者] 会话加载中，等待会话状态确定");
    } else if (status === "authenticated") {
      // 会话已加载
      if (!session?.user?.id) {
        // 已认证但无有效用户ID
        console.log("[权限提供者] 已认证但无有效用户ID，跳过权限加载");
        setIsReady(true);
        stopLoading();
      } else if (!isLoggedIn) {
        // 会话显示已登录但全局状态未同步
        console.log("[权限提供者] 会话显示已登录但全局状态未同步，等待状态同步");
        setIsReady(true);
        stopLoading();
      } else if (!isReady) {
        // 有效的已认证会话，等待权限加载
        console.log("[权限提供者] 用户已登录(ID:", session.user.id, ")，正在等待权限加载");
      }
    }
  }, [status, session, isReady, stopLoading, isLoggedIn, isPermissionsLoading, permissions]);
  
  // 监听权限加载状态，仅当用户已登录时
  useEffect(() => {
    // 更严格的条件检查：必须是已认证状态且有用户ID且全局状态已登录
    if (isUnmountedRef.current || !isSessionValid || !isLoggedIn) {
      if (isPermissionsLoading) {
        // 如果仍在加载权限但会话无效，立即停止加载
        console.log("[权限提供者] 会话无效但权限仍在加载，强制停止加载");
        stopLoading();
        setIsReady(true);
      }
      return;
    }
    
    // 权限加载中...
    if (isPermissionsLoading) {
      // 权限加载中，显示全局加载状态
      startLoading("应用初始化中", "正在加载用户权限...");
      setIsReady(false);
      
      // 设置超时保护，减少到3秒
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (isUnmountedRef.current) return;
        
        console.warn("[权限提供者] 权限加载超时，强制继续渲染");
        stopLoading();
        setIsReady(true);
        timeoutRef.current = null;
      }, 3000); // 3秒超时
    } else {
      // 权限加载完成
      console.log("[权限提供者] 权限加载完成，权限总数:", permissions.length);
      stopLoading();
      
      // 清除超时定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // 立即显示内容，不再延迟
      setIsReady(true);
    }
  }, [isPermissionsLoading, permissions, startLoading, stopLoading, status, session, isSessionValid, isLoggedIn]);
  
  // 决定渲染什么内容
  // 1. 已准备好或未登录用户，直接渲染子组件
  if (isReady || status === "unauthenticated" || !isSessionValid) {
    return <>{children}</>;
  }
  
  // 2. 会话加载中，显示简单加载指示器
  if (status as string === "loading") {
    return (
      <LoadingScreen 
        message="初始化应用..."
        subMessage="请稍候..."
        fullScreen={true}
        iconSize={24}
      />
    );
  }
  
  // 3. 用户已登录但权限尚未就绪，显示权限加载状态
  return (
    <LoadingScreen 
      message="应用初始化中" 
      subMessage="正在加载用户权限..."
      fullScreen={true}
      iconSize={36}
      icon={
        <div className="relative">
          <div className="h-36 w-36 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        </div>
      }
    />
  );
} 