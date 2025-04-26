'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import jschardet from 'jschardet';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

// 使用动态导入加载Office Web Viewer组件，避免服务器端渲染问题
const OfficeWebViewer = dynamic(
  () => import('@/components/OfficeWebViewer').then(mod => mod.OfficeWebViewer),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-300 dark:border-gray-600 border-t-primary"></div>
    </div>
  )}
);

export default function FilePreview() {
  const params = useParams();
  const { theme } = useTheme();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | 'pdf' | 'code' | 'office' | 'other'>('text');
  const [fileName, setFileName] = useState<string>('');
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [officeViewerFailed, setOfficeViewerFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [publicFileUrl, setPublicFileUrl] = useState<string>('');

  // 获取完整路径
  const fullPath = Array.isArray(params.path) ? params.path.join('/') : '';
  const decodedPath = decodeURIComponent(fullPath);

  // 获取文件类型
  const getFileType = (filename: string): 'image' | 'text' | 'pdf' | 'code' | 'office' | 'other' => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
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

  // 获取语言类型
  const getLanguage = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // 语言映射
    const languageMap: {[key: string]: string} = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'sh': 'bash',
      'bat': 'batch',
      'sql': 'sql',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
      'conf': 'ini',
      'config': 'ini',
      'ini': 'ini'
    };
    
    return languageMap[extension] || 'text';
  };

  // 下载文件
  const handleDownload = () => {
    if (!fileBlob) return;
    
    const url = window.URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // 自动检测编码
  const detectEncoding = (buffer: ArrayBuffer): string => {
    try {
      // 将ArrayBuffer转换为Buffer对象，因为jschardet需要Buffer或string类型
      const uint8Array = new Uint8Array(buffer);
      const result = jschardet.detect(Buffer.from(uint8Array));
      return result.encoding || 'utf-8';
    } catch (e) {
      console.error('Error detecting encoding:', e);
      return 'utf-8';
    }
  };

  // 获取文件图标
  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'text': return '📄';
      case 'pdf': return '📑';
      case 'code': return '📝';
      case 'office': return '📊';
      default: return '📎';
    }
  };

  // Office Viewer加载失败处理
  const handleOfficeViewerError = () => {
    console.error('Office文档查看器加载失败');
    setOfficeViewerFailed(true);
  };

  // 重试加载Office文档
  const handleRetryOfficeViewer = () => {
    setOfficeViewerFailed(false);
    setRetryCount(prev => prev + 1);
  };

  // 获取文件内容和公开URL
  useEffect(() => {
    if (!decodedPath) return;

    const fetchFile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setOfficeViewerFailed(false);
        
        // 获取文件名
        const pathParts = decodedPath.split('/');
        const name = pathParts[pathParts.length - 1];
        setFileName(name);
        
        // 设置文件类型
        const type = getFileType(name);
        setFileType(type);
        
        // 创建文件的可公开访问URL
        const downloadUrl = `/api/minio/download?path=${encodeURIComponent(decodedPath)}`;
        setPublicFileUrl(new URL(downloadUrl, window.location.origin).href);
        
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('获取文件内容失败');
        
        const blob = await response.blob();
        setFileBlob(blob);
        
        if (type === 'text' || type === 'code') {
          // 读取为ArrayBuffer以检测编码
          const arrayBuffer = await blob.arrayBuffer();
          const detectedEnc = detectEncoding(arrayBuffer);
          
          // 尝试使用检测到的编码
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setContent(reader.result);
            }
            setIsLoading(false);
          };
          reader.onerror = () => {
            setError('读取文件内容失败');
            setIsLoading(false);
          };
          reader.readAsText(blob, detectedEnc);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching file:', error);
        setError(error instanceof Error ? error.message : '未知错误');
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [decodedPath, retryCount]);

  // 渲染页面
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 最小化的文件信息栏 */}
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 overflow-hidden">
          <span className="text-xl">{getFileIcon()}</span>
          <h1 className="text-base font-medium truncate max-w-[calc(100vw-120px)]">{fileName}</h1>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDownload} 
          disabled={!fileBlob}
          className="ml-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Download className="h-4 w-4 mr-1" />
          <span className="text-xs">下载</span>
        </Button>
      </div>

      {/* 主内容区域 - 撑满剩余空间 */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-300 dark:border-gray-600 border-t-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">加载失败</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
              {error}
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" /> 重新加载
            </Button>
          </div>
        ) : (
          <div className="h-full">
            {fileType === 'code' && (
              <div className="h-full overflow-auto">
                <SyntaxHighlighter
                  language={getLanguage(fileName)}
                  style={theme === 'dark' ? oneDark : oneLight}
                  customStyle={{ 
                    margin: 0, 
                    height: '100%', 
                    borderRadius: 0,
                    fontSize: '14px',
                    lineHeight: '1.5' 
                  }}
                  wrapLongLines={true}
                  showLineNumbers={true}
                >
                  {content}
                </SyntaxHighlighter>
              </div>
            )}

            {fileType === 'text' && (
              <div className="h-full p-6 overflow-auto bg-white dark:bg-gray-800 font-mono">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                  {content}
                </pre>
              </div>
            )}

            {fileType === 'image' && (
              <div className="flex items-center justify-center h-full p-4 overflow-auto bg-neutral-200 dark:bg-neutral-800 bg-grid-pattern">
                <div className="relative rounded shadow-lg overflow-hidden bg-white dark:bg-black">
                  <img 
                    src={`/api/minio/download?path=${encodeURIComponent(decodedPath)}`}
                    alt={fileName}
                    className="max-w-full max-h-[calc(100vh-60px)] object-contain"
                  />
                </div>
              </div>
            )}

            {fileType === 'pdf' && (
              <div className="h-full bg-neutral-200 dark:bg-neutral-800 p-2">
                <div className="h-full bg-white dark:bg-black rounded shadow-lg overflow-hidden">
                  <iframe
                    src={`/api/minio/download?path=${encodeURIComponent(decodedPath)}`}
                    className="w-full h-full border-0"
                    title={fileName}
                  />
                </div>
              </div>
            )}

            {fileType === 'office' && (
              <div className="h-full bg-neutral-200 dark:bg-neutral-800 p-2">
                <div className="h-full bg-white dark:bg-gray-800 rounded shadow-lg overflow-hidden">
                  {publicFileUrl && !officeViewerFailed ? (
                    <OfficeWebViewer
                      key={`office-viewer-${retryCount}`}
                      fileUrl={publicFileUrl}
                      fileName={fileName}
                      onError={handleOfficeViewerError}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <div className="text-5xl mb-4">{getFileIcon()}</div>
                      {officeViewerFailed ? (
                        <>
                          <h3 className="text-xl font-bold mb-2">无法加载Office文档查看器</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                            可能是网络连接问题或您的文件格式不受支持。请尝试重新加载或下载后查看该文件。
                          </p>
                          <div className="flex space-x-4">
                            <Button 
                              variant="outline"
                              onClick={handleRetryOfficeViewer}
                              className="px-6"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" /> 重试
                            </Button>
                            <Button 
                              onClick={handleDownload}
                              className="px-6"
                            >
                              <Download className="h-4 w-4 mr-2" /> 下载文件
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold mb-2">正在加载文档...</h3>
                          <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-300 dark:border-gray-600 border-t-primary mt-4"></div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}