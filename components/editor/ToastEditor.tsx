'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import 'prismjs/themes/prism.css';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/i18n/zh-cn';

// 为编辑器实例定义类型
interface EditorInstance {
  getMarkdown: () => string;
  getHTML: () => string;
  reset: () => void;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
}

// 动态导入编辑器组件，避免SSR问题
const Editor = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Editor),
  { ssr: false }
);

export interface ToastEditorProps {
  initialValue?: string;
  height?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export interface ToastEditorRef {
  getInstance: () => EditorInstance;
  getMarkdown: () => string;
  getHTML: () => string;
  reset: () => void;
}

const ToastEditor = forwardRef<ToastEditorRef, ToastEditorProps>(
  ({ initialValue = "", height = '600px', placeholder = '请输入...', onChange, onBlur }, ref) => {
    // 使用类型断言来处理复杂类型
    const editorRef = useRef<any>(null);

    // 暴露编辑器实例和方法给父组件
    useImperativeHandle(ref, () => ({
      getInstance: () => editorRef.current?.getInstance(),
      getMarkdown: () => editorRef.current?.getInstance()?.getMarkdown() || '',
      getHTML: () => editorRef.current?.getInstance()?.getHTML() || '',
      reset: () => editorRef.current?.getInstance()?.reset(),
    }));

    // 处理编辑器内容变化
    const handleChange = () => {
      if (onChange && editorRef.current) {
        const instance = editorRef.current.getInstance();
        if (instance) {
          onChange(instance.getMarkdown());
        }
      }
    };

    // 处理编辑器失去焦点
    const handleBlur = () => {
      if (onBlur) {
        onBlur();
      }
    };

    // 在组件卸载时清理事件监听器
    useEffect(() => {
      const instance = editorRef.current?.getInstance();
      if (instance) {
        instance.on('change', handleChange);
        instance.on('blur', handleBlur);
      }

      return () => {
        if (instance) {
          instance.off('change', handleChange);
          instance.off('blur', handleBlur);
        }
      };
    }, [editorRef.current]);

    return (
      <div className="toast-ui-editor-container">
        {typeof window !== 'undefined' && (
          <Editor
            ref={editorRef}
            initialValue={initialValue}
            previewStyle="vertical"
            height={height}
            initialEditType="markdown"
            useCommandShortcut={true}
            usageStatistics={false}
            hideModeSwitch={false}
            language="zh-CN"
            toolbarItems={[
              ['heading', 'bold', 'italic', 'strike'],
              ['hr', 'quote'],
              ['ul', 'ol', 'task', 'indent', 'outdent'],
              ['table', 'image', 'link'],
              ['code', 'codeblock'],
              ['scrollSync'],
            ]}
            placeholder={placeholder}    
          />
        )}
      </div>
    );
  }
);

ToastEditor.displayName = 'ToastEditor';

export default ToastEditor; 