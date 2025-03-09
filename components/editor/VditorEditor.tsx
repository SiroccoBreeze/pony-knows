'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

export interface VditorEditorProps {
  initialValue?: string;
  height?: number;
  placeholder?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export interface VditorEditorRef {
  getValue: () => string;
  getHTML: () => string;
  clear: () => void;
  focus: () => void;
  blur: () => void;
  getInstance: () => Vditor;
}

const VditorEditor = forwardRef<VditorEditorRef, VditorEditorProps>(
  ({ initialValue = '', height = 400, placeholder = '请输入内容...', onChange, onBlur }, ref) => {
    const editorRef = useRef<Vditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [domReady, setDomReady] = useState(false);

    // 检查DOM是否已加载
    useEffect(() => {
      setDomReady(true);
    }, []);

    // 初始化编辑器
    useEffect(() => {
      // 确保DOM已加载且容器元素存在
      if (domReady && containerRef.current && !editorRef.current) {
        try {
          const vditor = new Vditor(containerRef.current, {
            height,
            mode: 'sv', // 所见即所得模式
            placeholder,
            theme: 'classic',
            icon: 'material', // 使用Material图标
            toolbar: [
              'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
              'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
              'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
              'upload', 'table', '|',
              'undo', 'redo', '|',
              'fullscreen',"edit-mode", 'preview', 'outline','export', 'help'
            ],
            cache: {
              enable: false,
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
              accept: 'image/*',
              handler: (files) => {
                // 这里可以实现自定义的上传逻辑
                console.log('上传文件:', files);
                return Promise.resolve(''); // 返回单个字符串
              },
            },
            input: (value: string) => {
              // 输入事件处理
              if (onChange) {
                onChange(value);
              }
            },
            blur: () => {
              // 失焦事件处理
              if (onBlur) {
                onBlur();
              }
            },
            after: () => {
              // 编辑器初始化完成后设置初始值
              if (initialValue && editorRef.current) {
                editorRef.current.setValue(initialValue);
              }
            },
          });
          
          editorRef.current = vditor;
        } catch (error) {
          console.error('初始化编辑器时出错:', error);
        }
        
        return () => {
          // 组件卸载时销毁编辑器
          if (editorRef.current) {
            try {
              // 更安全的检查和销毁过程
              const vditor = editorRef.current;
              // 检查编辑器实例是否有必要的属性和方法
              if (vditor && typeof vditor.destroy === 'function') {
                // 使用可选链操作符，即使中间步骤出错也不会抛出异常
                vditor.destroy?.();
              }
            } catch (error) {
              console.error('销毁编辑器时出错:', error);
            } finally {
              // 确保引用被清除
              editorRef.current = null;
            }
          }
        };
      }
    }, [initialValue, height, placeholder, onChange, onBlur, domReady]);

    // 暴露编辑器实例和方法给父组件
    useImperativeHandle(ref, () => ({
      getValue: () => editorRef.current?.getValue() || '',
      getHTML: () => editorRef.current?.getHTML() || '',
      clear: () => editorRef.current?.setValue(''),
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
      getInstance: () => {
        if (!editorRef.current) {
          throw new Error('编辑器实例未初始化');
        }
        return editorRef.current;
      },
    }));

    return <div ref={containerRef} className="vditor-container" />;
  }
);

VditorEditor.displayName = 'VditorEditor';

export default VditorEditor;