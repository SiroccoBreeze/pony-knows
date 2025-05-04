"use client";

import { Button } from "@/components/ui/button";
import { useLoading } from "@/hooks/use-loading";

/**
 * 加载状态演示组件
 * 用于展示加载状态的使用方法
 */
export function LoadingDemo() {
  const { showLoading, hideLoading, withLoading } = useLoading();
  
  // 模拟异步操作
  const simulateAsyncOperation = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  };
  
  // 使用showLoading和hideLoading手动控制加载状态
  const handleManualLoading = () => {
    showLoading("手动控制加载状态", "将在3秒后自动关闭");
    
    setTimeout(() => {
      hideLoading();
    }, 3000);
  };
  
  // 使用withLoading包装异步函数
  const handleAsyncLoading = async () => {
    await withLoading(
      async () => {
        await simulateAsyncOperation();
        console.log("异步操作完成");
      },
      "正在执行异步操作",
      "这可能需要几秒钟时间"
    );
  };
  
  // 模拟页面刷新时的加载状态
  const handleRefreshLoading = () => {
    showLoading("页面刷新中", "请稍候...");
    
    // 模拟页面刷新
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm space-y-4">
      <h2 className="text-xl font-semibold mb-4">加载状态演示</h2>
      
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground mb-2">
          点击下面的按钮测试不同的加载状态控制方式
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleManualLoading}>
            手动控制
          </Button>
          
          <Button onClick={handleAsyncLoading}>
            异步操作
          </Button>
          
          <Button onClick={handleRefreshLoading}>
            模拟刷新
          </Button>
        </div>
      </div>
    </div>
  );
} 