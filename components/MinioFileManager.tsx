'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Download, Folder, File, Grid, List, Eye } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileItem {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  etag?: string;
}

export function MinioFileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const fetchFiles = async (path: string = '/') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/minio?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
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
      const response = await fetch(`/api/minio/download?path=${encodeURIComponent(file.filename)}`);
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
      if (file.basename === '..') {
        // 处理上级目录
        const pathParts = currentPath.split('/').filter(Boolean);
        pathParts.pop(); // 移除最后一个目录
        const newPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}/`;
        setCurrentPath(newPath);
      } else {
        setCurrentPath(file.filename.endsWith('/') ? file.filename : `${file.filename}/`);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 检查文件类型是否可预览
  const isPreviewable = (file: FileItem): boolean => {
    if (file.type !== 'file') return false;
    
    const extension = file.basename.split('.').pop()?.toLowerCase() || '';
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const textTypes = ['txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'json', 'csv'];
    const pdfTypes = ['pdf'];
    const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const codeTypes = ['sql', 'java', 'py', 'bat', 'cs', 'c', 'cpp', 'go', 'rb', 'php', 'swift', 'sh', 'conf', 'config', 'ini'];
    
    return imageTypes.includes(extension) || 
           textTypes.includes(extension) || 
           pdfTypes.includes(extension) || 
           officeTypes.includes(extension) ||
           codeTypes.includes(extension);
  };

  // 获取文件类型
  const getFileType = (file: FileItem): 'image' | 'text' | 'pdf' | 'office' | 'code' | 'other' => {
    if (file.type !== 'file') return 'other';
    
    const extension = file.basename.split('.').pop()?.toLowerCase() || '';
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const textTypes = ['txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'json', 'csv'];
    const pdfTypes = ['pdf'];
    const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const codeTypes = ['sql', 'java', 'py', 'bat', 'cs', 'c', 'cpp', 'go', 'rb', 'php', 'swift', 'sh', 'conf', 'config', 'ini'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (textTypes.includes(extension)) return 'text';
    if (pdfTypes.includes(extension)) return 'pdf';
    if (officeTypes.includes(extension)) return 'office';
    if (codeTypes.includes(extension)) return 'code';
    
    return 'other';
  };

  // 处理预览
  const handlePreview = (file: FileItem) => {
    // 使用新页面打开预览
    const previewUrl = `/preview/${encodeURIComponent(file.filename)}`;
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="min-h-[500px]">
      {/* 路径导航和控制按钮 */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-4 gap-3">
        <div className="px-2 py-1 bg-muted rounded-lg flex items-center max-w-full overflow-x-auto">
          <span className="text-sm font-medium mr-2">路径:</span>
          <div className="flex items-center space-x-1 text-sm overflow-x-auto">
            <span 
              className="hover:underline cursor-pointer" 
              onClick={() => setCurrentPath('/')}
            >
              根目录
            </span>
            {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((part, index, array) => (
              <div key={index} className="flex items-center">
                <span>/</span>
                <span 
                  className="hover:underline cursor-pointer px-1"
                  onClick={() => {
                    const newPath = `/${array.slice(0, index + 1).join('/')}/`;
                    setCurrentPath(newPath);
                  }}
                >
                  {part}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                {viewMode === 'list' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode('list')}>
                <List className="h-4 w-4 mr-2" />
                列表视图
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('grid')}>
                <Grid className="h-4 w-4 mr-2" />
                网格视图
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => fetchFiles(currentPath)}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '刷新'}
          </Button>
        </div>
      </div>
      
      {/* 文件显示区域 */}
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
                  {isPreviewable(file) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(file);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
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
        <div className="overflow-hidden border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left p-2 text-xs">名称</th>
                <th className="text-left p-2 text-xs hidden sm:table-cell">修改日期</th>
                <th className="text-left p-2 text-xs hidden md:table-cell">大小</th>
                <th className="text-left p-2 text-xs text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr 
                  key={file.filename} 
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td 
                    className="p-2 cursor-pointer"
                    onClick={() => handleDirectoryClick(file)}
                  >
                    <div className="flex items-center gap-2">
                      {file.type === 'directory' ? (
                        <Folder className="h-4 w-4 text-primary" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate max-w-[200px]" title={file.basename}>
                        {file.basename}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-xs hidden sm:table-cell">
                    {new Date(file.lastmod).toLocaleString()}
                  </td>
                  <td className="p-2 text-xs hidden md:table-cell">
                    {file.type === 'file' ? formatFileSize(file.size) : '-'}
                  </td>
                  <td className="p-2 flex justify-center gap-1">
                    {file.type === 'file' && (
                      <>
                        {isPreviewable(file) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(file)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-sm text-muted-foreground">
                    此文件夹为空
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 