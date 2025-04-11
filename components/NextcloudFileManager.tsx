'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Download, Folder, File, ChevronUp, Grid, List } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface FileItem {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  mime?: string;
}

export function NextcloudFileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const fetchFiles = async (path: string = '/') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/nextcloud?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('获取文件列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/nextcloud/download?path=${encodeURIComponent(file.filename)}`);
      if (!response.ok) throw new Error('下载失败');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.basename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('文件下载成功');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('文件下载失败');
    }
  };

  const handleDirectoryClick = (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(`${currentPath}${file.basename}/`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const parentPath = currentPath.split('/').slice(0, -2).join('/') + '/';
              setCurrentPath(parentPath);
            }}
            disabled={currentPath === '/'}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">当前路径：</span>
            <span className="text-sm text-muted-foreground">{currentPath}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {files.map((file) => (
            <Card
              key={file.filename}
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer bg-card"
              onClick={() => handleDirectoryClick(file)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center">
                  {file.type === 'directory' ? (
                    <Folder className="h-8 w-8 text-primary mb-2" />
                  ) : (
                    <File className="h-8 w-8 text-muted-foreground mb-2" />
                  )}
                  <div className="text-sm font-medium truncate w-full text-center text-card-foreground" title={file.basename}>
                    {file.basename}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {file.type === 'file' ? formatFileSize(file.size) : '文件夹'}
                  </div>
                </div>
              </CardContent>
              {file.type === 'file' && (
                <CardFooter className="p-2 pt-0 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted border-b">
            <div className="col-span-5 font-medium text-card-foreground">文件名</div>
            <div className="col-span-2 font-medium text-card-foreground">大小</div>
            <div className="col-span-3 font-medium text-card-foreground">修改时间</div>
            <div className="col-span-2 font-medium text-right text-card-foreground">操作</div>
          </div>
          <div className="divide-y divide-border">
            {files.map((file) => (
              <div
                key={file.filename}
                className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/50"
              >
                <div className="col-span-5 flex items-center space-x-2">
                  {file.type === 'directory' ? (
                    <Folder className="h-5 w-5 text-primary" />
                  ) : (
                    <File className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span
                    className="cursor-pointer hover:text-primary text-card-foreground"
                    onClick={() => handleDirectoryClick(file)}
                  >
                    {file.basename}
                  </span>
                </div>
                <div className="col-span-2 flex items-center text-card-foreground">
                  {file.type === 'file' ? formatFileSize(file.size) : '-'}
                </div>
                <div className="col-span-3 flex items-center text-card-foreground">
                  {formatDate(file.lastmod)}
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  {file.type === 'file' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 