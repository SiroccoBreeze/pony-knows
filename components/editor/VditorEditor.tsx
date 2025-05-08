'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '@/app/vditor-override.css'; // 引入自定义的样式覆盖
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export interface VditorEditorProps {
  initialValue?: string;
  height?: number;
  placeholder?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  postId?: string;
}

export interface VditorEditorRef {
  getValue: () => string;
  getHTML: () => string;
  clear: () => void;
  focus: () => void;
  blur: () => void;
  getInstance: () => Vditor;
  isReady: () => boolean;
}

const VditorEditor = forwardRef<VditorEditorRef, VditorEditorProps>(
  ({ initialValue = '', height = 400, placeholder = '请输入内容...', onChange, onBlur, postId }, ref) => {
    const editorRef = useRef<Vditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [domReady, setDomReady] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [currentValue, setCurrentValue] = useState(initialValue);
    const [uploadSettings, setUploadSettings] = useState({
      enabled: true,
      maxFileSize: 5 * 1024 * 1024, // 默认5MB
      allowedTypes: 'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-rar-compressed' // 默认允许的图片类型
    });
    
    // 上传状态
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // 上传中的文件信息
    const [uploadingFiles, setUploadingFiles] = useState<{name: string, progress: number}[]>([]);

    // 检查DOM是否已加载
    useEffect(() => {
      setDomReady(true);
    }, []);

    // 加载上传设置
    useEffect(() => {
      async function loadUploadSettings() {
        try {
          // 从API获取上传设置
          const response = await fetch('/api/system-parameters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              keys: [
                'upload_enabled', 
                'upload_max_file_size_mb', 
                'upload_allowed_file_types'
              ] 
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // 计算文件大小（从MB转为字节）
            const maxFileSizeMB = data.upload_max_file_size_mb ? parseFloat(data.upload_max_file_size_mb) : 5;
            const maxFileSize = maxFileSizeMB * 1024 * 1024;
            
            // 更新设置
            setUploadSettings({
              enabled: data.upload_enabled !== 'false', // 默认为true
              maxFileSize: maxFileSize,
              allowedTypes: data.upload_allowed_file_types || 'image/jpeg,image/png,image/gif,image/webp'
            });
            
            console.log('已加载文件上传设置:', {
              enabled: data.upload_enabled !== 'false',
              maxFileSizeMB: maxFileSizeMB,
              maxFileSize: maxFileSize,
              allowedTypes: data.upload_allowed_file_types || 'image/jpeg,image/png,image/gif,image/webp'
            });
          }
        } catch (error) {
          console.error('加载上传设置失败:', error);
        }
      }
      
      loadUploadSettings();
    }, []);

    // 自定义上传函数
    const customUploadFile = async (files: File[], _vditor: Vditor) => {
      if (!files || files.length === 0) return;
      
      try {
        // 设置上传状态
        setIsUploading(true);
        setUploadProgress(0);
        const newUploadingFiles = files.map(file => ({
          name: file.name,
          progress: 0
        }));
        setUploadingFiles(newUploadingFiles);
        
        // 显示上传中的通知
        toast({
          title: "上传中",
          description: `正在上传${files.length}个文件，请稍候...`,
          variant: "default"
        });
        
        // 禁用编辑器工具栏，防止用户在上传过程中操作
        if (editorRef.current && editorRef.current.vditor && editorRef.current.vditor.toolbar && editorRef.current.vditor.toolbar.element) {
          const toolbarElement = editorRef.current.vditor.toolbar.element;
          toolbarElement.classList.add('vditor-toolbar-disabled');
        }
        
        // 定义上传结果类型
        type UploadResult = {
          error: boolean;
          fileName: string;
          message?: string;
          data?: {
            code: number;
            data: {
              succMap: Record<string, {
                url: string;
                type: string;
                name: string;
              }>
            }
          };
        };
        
        // 为每个文件创建上传任务
        const uploadTasks = files.map(async (file, index) => {
          // 检查文件大小
          if (file.size > uploadSettings.maxFileSize) {
            return {
              error: true,
              fileName: file.name,
              message: `文件大小超过限制，最大允许${uploadSettings.maxFileSize / (1024 * 1024)}MB`
            } as UploadResult;
          }
          
          // 检查文件类型
          const allowedTypes = uploadSettings.allowedTypes.split(',');
          if (!allowedTypes.includes(file.type)) {
            return {
              error: true,
              fileName: file.name,
              message: `不支持的文件类型: ${file.type}`
            } as UploadResult;
          }
          
          // 创建FormData
          const formData = new FormData();
          formData.append('file', file);
          if (postId) {
            formData.append('postId', postId);
          }
          
          // 使用XMLHttpRequest以便跟踪上传进度
          return new Promise<UploadResult>((resolve) => {
            const xhr = new XMLHttpRequest();
            
            // 监听上传进度
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                
                // 更新特定文件的进度
                setUploadingFiles(prevFiles => {
                  const newFiles = [...prevFiles];
                  if (newFiles[index]) {
                    newFiles[index].progress = percentComplete;
                  }
                  return newFiles;
                });
                
                // 计算总体上传进度
                setUploadingFiles(prevFiles => {
                  const totalProgress = prevFiles.reduce((acc, file) => acc + file.progress, 0) / prevFiles.length;
                  setUploadProgress(totalProgress);
                  return prevFiles;
                });
              }
            };
            
            // 上传完成
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve({
                    error: false,
                    fileName: file.name,
                    data: response
                  });
                } catch (_error) {
                  resolve({
                    error: true,
                    fileName: file.name,
                    message: '解析响应失败'
                  });
                }
              } else {
                resolve({
                  error: true,
                  fileName: file.name,
                  message: `上传失败: ${xhr.statusText}`
                });
              }
            };
            
            // 上传错误
            xhr.onerror = () => {
              resolve({
                error: true,
                fileName: file.name,
                message: '网络错误'
              });
            };
            
            // 开始上传
            xhr.open('POST', '/api/posts/upload-image', true);
            if (postId) {
              xhr.setRequestHeader('X-Post-ID', postId);
            }
            xhr.send(formData);
          });
        });
        
        // 等待所有上传任务完成
        const results = await Promise.all(uploadTasks);
        
        // 处理上传结果
        const successResults = results.filter((result): result is UploadResult & { error: false } => !result.error);
        const errorResults = results.filter((result): result is UploadResult & { error: true } => result.error);
        
        // 构建成功和失败消息
        if (errorResults.length > 0) {
          // 显示错误通知
          toast({
            title: "部分文件上传失败",
            description: errorResults.map(err => `${err.fileName}: ${err.message}`).join(', '),
            variant: "destructive"
          });
        }
        
        // 如果有成功上传的文件，处理它们
        if (successResults.length > 0) {
          // 收集所有成功的文件URL和信息
          const fileUrls: string[] = [];
          const fileInfos: Record<string, {url: string, type: string, name: string}> = {};
          
          successResults.forEach(result => {
            if (result.data && result.data.code === 0 && result.data.data && result.data.data.succMap) {
              Object.keys(result.data.data.succMap).forEach(key => {
                const urlInfo = result.data.data.succMap[key];
                if (typeof urlInfo === 'object' && urlInfo.url) {
                  fileUrls.push(urlInfo.url);
                  fileInfos[urlInfo.url] = {
                    url: urlInfo.url,
                    type: urlInfo.type || '',
                    name: urlInfo.name || key
                  };
                }
              });
            }
          });
          
          // 如果找到有效URL，分别处理不同类型的文件
          if (fileUrls.length > 0 && editorRef.current) {
            // 分类处理不同类型的文件
            let hasNonImageFiles = false;
            let insertedContent = '';

            // 先处理图片文件（可以直接插入）
            const imageUrls = fileUrls.filter(url => {
              const fileType = fileInfos[url]?.type || '';
              return fileType.startsWith('image/');
            });

            // 处理图片文件
            if (imageUrls.length > 0) {
              const imageMarkdown = imageUrls.map(url => `![图片](${url})`).join('\n');
              try {
                editorRef.current.insertValue(imageMarkdown);
              } catch (error) {
                console.error('插入图片内容失败:', error);
                insertedContent += imageMarkdown + '\n';
              }
            }

            // 处理非图片文件
            const nonImageUrls = fileUrls.filter(url => {
              const fileType = fileInfos[url]?.type || '';
              return !fileType.startsWith('image/');
            });

            if (nonImageUrls.length > 0) {
              hasNonImageFiles = true;
              const nonImageMarkdown = nonImageUrls.map(url => {
                const fileInfo = fileInfos[url];
                const fileType = fileInfo?.type || '';
                const fileName = fileInfo?.name || url.split('/').pop() || '文件';
                
                // 根据文件类型创建不同图标的链接
                if (fileType === 'application/pdf') {
                  return `[📄 ${fileName}](${url})`;
                } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) {
                  return `[📦 ${fileName}](${url})`;
                } else if (fileType.includes('word') || fileType.includes('officedocument') || fileType.includes('excel')) {
                  return `[📝 ${fileName}](${url})`;
                } else {
                  return `[📎 ${fileName}](${url})`;
                }
              }).join('\n');

              // 对于非图片文件，我们将内容追加到编辑器末尾
              insertedContent += nonImageMarkdown;
            }

            // 如果有非图片内容需要插入，使用setValue而不是insertValue
            if (hasNonImageFiles && insertedContent) {
              try {
                // 获取当前内容并追加内容
                const currentContent = editorRef.current.getValue() || '';
                const newContent = currentContent ? `${currentContent}\n${insertedContent}` : insertedContent;
                editorRef.current.setValue(newContent);
                
                // 文件上传完成后，手动触发onChange回调确保内容被保存
                if (onChange) {
                  setTimeout(() => {
                    onChange(newContent);
                    console.log('文件上传后主动触发onChange:', newContent);
                  }, 100);
                }
              } catch (error) {
                console.error('追加非图片内容失败:', error);
                // 创建通知，告知用户手动复制
                navigator.clipboard.writeText(insertedContent).catch(() => {});
                toast({
                  title: "文件上传成功，但无法自动插入",
                  description: "非图片文件链接已复制到剪贴板，请手动粘贴",
                  variant: "default"
                });
              }
            }
            
            // 显示成功通知
            toast({
              title: "上传成功",
              description: `已成功上传${fileUrls.length}个文件`,
              variant: "default"
            });
          }
        }
      } catch (error) {
        console.error('上传文件出错:', error);
        toast({
          title: "上传失败",
          description: "请检查网络连接后重试",
          variant: "destructive"
        });
      } finally {
        // 重置上传状态
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFiles([]);
        
        // 重新启用编辑器工具栏
        if (editorRef.current && editorRef.current.vditor && editorRef.current.vditor.toolbar && editorRef.current.vditor.toolbar.element) {
          const toolbarElement = editorRef.current.vditor.toolbar.element;
          toolbarElement.classList.remove('vditor-toolbar-disabled');
        }
      }
    };

    // 初始化编辑器
    useEffect(() => {
      // 确保DOM已加载且容器元素存在
      if (domReady && containerRef.current && !editorRef.current) {
        try {
          console.log("初始化Vditor编辑器...");
          
          // 根据上传设置确定工具栏
          const toolbarItems = [
            'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
            'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
            'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
            'table', '|',
            'undo', 'redo', '|',
            'fullscreen', 'preview', 'outline', 'export', 'help'
          ];
          
          // 如果启用了上传功能，添加上传按钮
          if (uploadSettings.enabled) {
            toolbarItems.splice(13, 0, 'upload');
          }
          
          const vditor = new Vditor(containerRef.current, {
            height,
            mode: 'wysiwyg', // 默认使用所见即所得模式
            placeholder,
            theme: 'classic',
            icon: 'ant', // 使用 ant 图标
            toolbar: toolbarItems,
            cache: {
              enable: false, // 禁用缓存
            },
            preview: {
              hljs: {
                style: 'github',
                lineNumber: true,
              },
            },
            counter: {
              enable: true,
            },
            upload: {
              accept: uploadSettings.allowedTypes, // 使用系统配置的允许类型
              multiple: true,
              fieldName: 'file',
              filename: (name: string) => name,
              withCredentials: true,
              url: '/api/posts/upload-image',
              headers: postId ? { 'X-Post-ID': postId } : {},
              extraData: postId ? { postId } : {},
              max: uploadSettings.maxFileSize, // 使用系统配置的最大大小
              handler: (files: File[]) => {
                // 使用自定义上传处理器
                customUploadFile(files, vditor);
                return null; // 返回null表示我们会处理上传
              },
              error: (msg: string) => {
                console.error('上传文件错误:', msg);
                setIsUploading(false);
                setUploadProgress(0);
                setUploadingFiles([]);
                toast({
                  title: "上传失败",
                  description: msg || "上传文件失败，请重试",
                  variant: "destructive"
                });
              },
              success: (_editor: HTMLPreElement, _msg: string) => {
                // 使用了自定义处理器，这里不需要处理
                console.log('标准上传回调被触发，但使用了自定义处理器');
              },
            },
            input: (value: string) => {
              setCurrentValue(value);
              if (onChange) {
                onChange(value);
              }
            },
            blur: () => {
              if (onBlur) {
                onBlur();
              }
            },
            after: () => {
              console.log("Vditor编辑器初始化完成");
              setEditorReady(true);
              if (currentValue) {
                try {
                  vditor.setValue(currentValue);
                } catch (e) {
                  console.error("初始化后设置编辑器内容失败:", e);
                }
              }
            },
          });
          
          editorRef.current = vditor;
        } catch (error) {
          console.error('初始化编辑器时出错:', error);
        }
        
        return () => {
          if (editorRef.current) {
            try {
              const vditor = editorRef.current;
              if (vditor && typeof vditor.destroy === 'function') {
                vditor.destroy?.();
                setEditorReady(false);
              }
            } catch (error) {
              console.error('销毁编辑器时出错:', error);
            } finally {
              editorRef.current = null;
            }
          }
        };
      }
    }, [domReady]);

    // 监听 initialValue 的变化
    useEffect(() => {
      if (editorReady && editorRef.current && initialValue !== currentValue) {
        try {
          editorRef.current.setValue(initialValue);
          setCurrentValue(initialValue);
        } catch (e) {
          console.error("更新编辑器内容失败:", e);
        }
      }
    }, [initialValue, editorReady]);

    // 暴露编辑器实例和方法给父组件
    useImperativeHandle(ref, () => ({
      getValue: () => {
        if (!editorRef.current) return '';
        try {
          return editorRef.current.getValue() || '';
        } catch (e) {
          console.error("获取编辑器内容失败:", e);
          return '';
        }
      },
      getHTML: () => {
        if (!editorRef.current) return '';
        try {
          return editorRef.current.getHTML() || '';
        } catch (e) {
          console.error("获取编辑器HTML失败:", e);
          return '';
        }
      },
      clear: () => {
        if (editorRef.current) {
          try {
            editorRef.current.setValue('');
            setCurrentValue('');
          } catch (e) {
            console.error("清除编辑器内容失败:", e);
          }
        }
      },
      focus: () => {
        try {
          editorRef.current?.focus();
        } catch (e) {
          console.error("聚焦编辑器失败:", e);
        }
      },
      blur: () => {
        try {
          editorRef.current?.blur();
        } catch (e) {
          console.error("取消聚焦编辑器失败:", e);
        }
      },
      getInstance: () => {
        if (!editorRef.current) {
          throw new Error('编辑器实例未初始化');
        }
        return editorRef.current;
      },
      isReady: () => editorReady,
    }));

    return (
      <div className="relative">
        {isUploading && (
          <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center z-50 rounded-md">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center space-x-2 mb-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">正在上传文件...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-gray-500 mt-1">
                {Math.round(uploadProgress)}%
              </div>
              
              {uploadingFiles.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="text-sm flex items-center justify-between mt-1">
                      <div className="truncate max-w-[200px]">{file.name}</div>
                      <div>{file.progress}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={containerRef} className="vditor-container" />
      </div>
    );
  }
);

VditorEditor.displayName = 'VditorEditor';

export default VditorEditor;