import { create } from "zustand";

interface LoadingState {
  /**
   * 是否显示加载页面
   */
  isLoading: boolean;
  
  /**
   * 加载页面消息
   */
  message: string;
  
  /**
   * 加载页面辅助消息
   */
  subMessage?: string;
  
  /**
   * 显示加载页面
   */
  startLoading: (message?: string, subMessage?: string) => void;
  
  /**
   * 隐藏加载页面
   */
  stopLoading: () => void;
}

/**
 * 全局加载状态管理
 */
export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: "正在加载",
  subMessage: undefined,
  
  startLoading: (message = "正在加载", subMessage) => {
    console.log("[加载状态] 开始加载:", message);
    set({ 
      isLoading: true, 
      message,
      subMessage
    });
  },
  
  stopLoading: () => {
    console.log("[加载状态] 结束加载");
    set({ isLoading: false });
  }
})); 