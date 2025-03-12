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
              if (currentValue) {
                vditor.setValue(currentValue);
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
      if (editorRef.current && initialValue !== currentValue) {
        editorRef.current.setValue(initialValue);
        setCurrentValue(initialValue);
      }
    }, [initialValue]);

    // 暴露编辑器实例和方法给父组件
    useImperativeHandle(ref, () => ({
      getValue: () => editorRef.current?.getValue() || '',
      getHTML: () => editorRef.current?.getHTML() || '',
      clear: () => {
        if (editorRef.current) {
          editorRef.current.setValue('');
          setCurrentValue('');
        }
      },
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