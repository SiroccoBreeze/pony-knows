'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfficeWebViewerProps {
  fileUrl: string;
  fileName: string;
  onError?: () => void;
}

export const OfficeWebViewer: React.FC<OfficeWebViewerProps> = ({
  fileUrl,
  fileName,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewerType, setViewerType] = useState<'microsoft' | 'google'>('microsoft');
  
  // 生成Office Web Viewer URL
  const getMicrosoftViewerUrl = () => {
    const encodedFileUrl = encodeURIComponent(fileUrl);
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodedFileUrl}`;
  };
  
  // 生成Google Docs Viewer URL
  const getGoogleViewerUrl = () => {
    const encodedFileUrl = encodeURIComponent(fileUrl);
    return `https://docs.google.com/viewer?url=${encodedFileUrl}&embedded=true`;
  };
  
  // 获取当前查看器URL
  const getViewerUrl = () => {
    return viewerType === 'microsoft' ? getMicrosoftViewerUrl() : getGoogleViewerUrl();
  };
  
  // 切换查看器类型
  const toggleViewer = () => {
    setViewerType(prev => prev === 'microsoft' ? 'google' : 'microsoft');
    setIsLoading(true);
    setError(false);
  };
  
  // 处理iframe加载完成
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  
  // 处理加载错误
  const handleIframeError = () => {
    console.error(`${viewerType === 'microsoft' ? 'Office Web Viewer' : 'Google Docs Viewer'}加载失败`);
    
    if (viewerType === 'microsoft' && !error) {
      // 如果Microsoft查看器失败，自动尝试Google查看器
      console.log('正在尝试使用Google查看器作为备选方案...');
      setViewerType('google');
      setIsLoading(true);
    } else {
      setError(true);
      setIsLoading(false);
      if (onError) onError();
    }
  };
  
  // 设置超时检查，防止iframe未触发事件
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn(`${viewerType === 'microsoft' ? 'Office Web Viewer' : 'Google Docs Viewer'}加载超时`);
      }
    }, 10000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoading, viewerType]);
  
  // 判断文件类型，对Excel文件优先使用Google Viewer
  useEffect(() => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'xlsb', 'xlsm', 'csv'].includes(extension)) {
      // Excel文件默认使用Google查看器
      setViewerType('google');
    }
  }, [fileName]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-5xl mb-4">📄</div>
        <h3 className="text-xl font-bold mb-2">文档加载失败</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
          无法使用{viewerType === 'microsoft' ? 'Microsoft Office Web Viewer' : 'Google Docs Viewer'}加载文档。
          可能是因为文件格式不支持或网络问题。
        </p>
        <Button 
          onClick={toggleViewer}
          className="px-6"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> 尝试使用{viewerType === 'microsoft' ? 'Google' : 'Microsoft'}查看器
        </Button>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-300 dark:border-gray-600 border-t-primary mb-4"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              正在使用{viewerType === 'microsoft' ? 'Microsoft Office Web Viewer' : 'Google Docs Viewer'}加载文档...
            </p>
          </div>
        </div>
      )}
      <div className="absolute top-2 right-2 z-20">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleViewer}
          className="bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 text-xs"
        >
          切换至{viewerType === 'microsoft' ? 'Google' : 'Microsoft'}查看器
        </Button>
      </div>
      <iframe
        src={getViewerUrl()}
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title={fileName}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
}; 