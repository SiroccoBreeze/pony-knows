"use client"

import { useLoader } from "@/contexts/loader-context";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingOverlay() {
  const { isLoading, message } = useLoader();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // 添加延迟显示避免闪烁
    let timeout: NodeJS.Timeout;
    
    if (isLoading) {
      timeout = setTimeout(() => setVisible(true), 200);
    } else {
      setVisible(false);
    }
    
    return () => clearTimeout(timeout);
  }, [isLoading]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-4">
        <Skeleton className="h-8 w-1/3 mx-auto mb-6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
        
        {message && (
          <p className="text-center text-muted-foreground mt-4">{message}</p>
        )}
      </div>
    </div>
  );
} 