'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '@/app/vditor-override.css'; // 引入自定义的样式覆盖

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
  isReady: () => boolean;
}

const VditorEditor = forwardRef<VditorEditorRef, VditorEditorProps>(
  ({ initialValue = '', height = 400, placeholder = '请输入内容...', onChange, onBlur }, ref) => {
    const editorRef = useRef<Vditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [domReady, setDomReady] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [currentValue, setCurrentValue] = useState(initialValue);

    // 检查DOM是否已加载
    useEffect(() => {
      setDomReady(true);
    }, []);

    // 初始化编辑器
    useEffect(() => {
      // 确保DOM已加载且容器元素存在
      if (domReady && containerRef.current && !editorRef.current) {
        try {
          console.log("初始化Vditor编辑器...");
          const vditor = new Vditor(containerRef.current, {
            height,
            mode: 'wysiwyg', // 默认使用所见即所得模式
            placeholder,
            theme: 'classic',
            icon: 'material',
            toolbar: [
              'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
              'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
              'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
              'upload', 'table', '|',
              'undo', 'redo', '|',
              'fullscreen', 'preview', 'outline', 'export', 'help'
            ],
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
              accept: 'image/*',
              handler: (files) => {
                console.log('上传文件:', files);
                return Promise.resolve('');
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

    return <div ref={containerRef} className="vditor-container" />;
  }
);

VditorEditor.displayName = 'VditorEditor';

export default VditorEditor;