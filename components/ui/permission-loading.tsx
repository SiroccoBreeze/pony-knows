"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PermissionLoadingProps {
  /**
   * 显示的消息，默认为"加载中..."
   */
  message?: string;
  
  /**
   * 容器的自定义样式类
   */
  className?: string;
  
  /**
   * 是否显示加载动画
   */
  showSpinner?: boolean;
  
  /**
   * 加载动画大小
   */
  spinnerSize?: "sm" | "md" | "lg";
}

/**
 * 权限加载中显示组件
 * 用于权限加载中或无权限时的简单展示
 */
export function PermissionLoading({
  message = "加载中...",
  className,
  showSpinner = true,
  spinnerSize = "md"
}: PermissionLoadingProps) {
  // 根据尺寸设置加载动画大小
  const spinnerSizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }[spinnerSize];
  
  return (
    <div className={cn(
      "flex items-center justify-center p-4",
      className
    )}>
      {showSpinner && (
        <div className={cn(
          spinnerSizeClass,
          "animate-spin rounded-full border-2 border-primary/30 border-t-primary mr-2"
        )}></div>
      )}
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

/**
 * 全屏权限加载组件
 * 用于页面级别的权限加载显示
 */
export function FullScreenPermissionLoading({
  message = "加载中...",
  className
}: PermissionLoadingProps) {
  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center",
      className
    )}>
      <div className="text-center p-6 bg-white rounded-lg shadow-lg border border-border/40 max-w-xs">
        <div className="relative mx-auto mb-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto"></div>
        </div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
} 