"use client";

import { useLoadingStore } from "@/store/use-loading-store";
import { useCallback } from "react";

/**
 * 加载状态控制hook
 * 提供便捷的方法来控制全局加载状态
 */
export function useLoading() {
  const { isLoading, message, subMessage, startLoading, stopLoading } = useLoadingStore();
  
  /**
   * 开始显示加载页面
   */
  const showLoading = useCallback((msg?: string, subMsg?: string) => {
    startLoading(msg, subMsg);
  }, [startLoading]);
  
  /**
   * 结束加载状态
   */
  const hideLoading = useCallback(() => {
    stopLoading();
  }, [stopLoading]);
  
  /**
   * 包装一个异步函数，在执行过程中显示加载页面
   */
  const withLoading = useCallback(async <T,>(
    callback: () => Promise<T>, 
    loadingMessage = "处理中", 
    subMessage?: string
  ): Promise<T> => {
    try {
      showLoading(loadingMessage, subMessage);
      return await callback();
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);
  
  return {
    isLoading,
    message,
    subMessage,
    showLoading,
    hideLoading,
    withLoading
  };
} 