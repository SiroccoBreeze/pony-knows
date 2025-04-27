'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import jschardet from 'jschardet';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function FilePreview() {
  const params = useParams();
  const { theme } = useTheme();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'text' | 'pdf' | 'code' | 'office' | 'other'>('text');
  const [fileName, setFileName] = useState<string>('');
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
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

  // 获取文件内容和公开URL
  useEffect(() => {
    if (!decodedPath) return;

    const fetchFile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
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
  }, [decodedPath]);

  // 渲染内容
  return (
    <main className="container mx-auto py-6 px-4 min-h-screen">
      {/* 文件标题和下载按钮 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getFileIcon()}</span>
          <h1 className="text-xl font-semibold truncate max-w-[70%]">{fileName}</h1>
        </div>
        <Button onClick={handleDownload} variant="secondary" size="sm" className="flex items-center gap-1">
          <Download className="w-4 h-4" />
          <span>下载</span>
        </Button>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-gray-300 dark:border-gray-600 border-t-primary"></div>
        </div>
      )}

      {/* 错误状态 */}
      {error && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">加载文件时出错</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 文件内容预览 */}
      {!isLoading && !error && (
        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          {/* 图片预览 */}
          {fileType === 'image' && fileBlob && (
            <div className="flex justify-center p-4 bg-muted/50 dark:bg-muted/10">
              <img 
                src={URL.createObjectURL(fileBlob)} 
                alt={fileName} 
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          )}

          {/* PDF预览 */}
          {fileType === 'pdf' && publicFileUrl && (
            <iframe 
              src={publicFileUrl} 
              className="w-full h-[80vh] border-0" 
              title={fileName}
            />
          )}

          {/* 代码预览 */}
          {fileType === 'code' && content && (
            <div className="max-h-[80vh] overflow-auto">
              <SyntaxHighlighter 
                language={getLanguage(fileName)}
                style={theme === 'dark' ? oneDark : oneLight}
                showLineNumbers
                customStyle={{ margin: 0, borderRadius: 0 }}
              >
                {content}
              </SyntaxHighlighter>
            </div>
          )}

          {/* 纯文本预览 */}
          {fileType === 'text' && content && (
            <div className="p-4 max-h-[80vh] overflow-auto whitespace-pre-wrap font-mono text-sm">
              {content}
            </div>
          )}

          {/* Office 文档预览 */}
          {fileType === 'office' && (
            <div className="p-8 text-center h-[60vh] flex flex-col items-center justify-center gap-4">
              <div className="text-6xl mb-2">📄</div>
              <h3 className="text-xl font-medium">Office 文档预览</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Office 文档在线预览功能不可用。请下载文档后使用本地应用程序查看。
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  <span>下载文档</span>
                </Button>
                <Button variant="outline" asChild>
                  <a href={publicFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    <span>尝试直接打开</span>
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* 其他文件类型 */}
          {fileType === 'other' && (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📎</div>
              <h3 className="text-xl font-medium mb-2">无法预览此文件</h3>
              <p className="text-muted-foreground mb-6">
                当前文件类型不支持在线预览，请下载后查看。
              </p>
              <Button onClick={handleDownload} className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>下载文件</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}