"use client";

import { ReactNode } from "react";
import { LoadingProvider } from "./loading-provider";
import { LoaderProvider } from "@/contexts/loader-context";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * 应用全局提供者组件
 * 整合所有全局状态Provider
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    // 加载状态上下文
    <LoaderProvider>
      {/* 全局加载状态提供者 */}
      <LoadingProvider>
        {/* 权限加载已移至layout.tsx */}
        {children}
      </LoadingProvider>
    </LoaderProvider>
  );
} 