import { useRef, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-plsql';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeHighlighterProps {
  code: string;
}

export const CodeHighlighter = ({ code }: CodeHighlighterProps) => {
  const preRef = useRef<HTMLPreElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // 添加SQL变量规则
    if (Prism.languages.sql) {
      // 添加变量标记规则
      Object.assign(Prism.languages.sql, {
        'global-variable': {
          pattern: /@@\w+/g,
          greedy: true
        },
        'variable': {
          pattern: /@\w+/g,
          greedy: true
        }
      });
    }

    if (preRef.current) {
      // 应用代码高亮
      Prism.highlightElement(preRef.current);
      
      // 代码高亮完成后创建行号
      setTimeout(() => {
        if (preRef.current && codeContainerRef.current) {
          // 清除之前可能存在的行号元素
          const existingLineNumbers = codeContainerRef.current.querySelector('.line-numbers-container');
          if (existingLineNumbers) {
            existingLineNumbers.remove();
          }
          
          // 计算代码行数
          const lines = code.split('\n');
          const lineCount = lines.length;
          
          // 创建行号容器
          const lineNumbersContainer = document.createElement('div');
          lineNumbersContainer.className = 'line-numbers-container';
          lineNumbersContainer.style.position = 'absolute';
          lineNumbersContainer.style.top = '0';
          lineNumbersContainer.style.left = '0';
          lineNumbersContainer.style.width = '2.5em';
          lineNumbersContainer.style.height = '100%';
          lineNumbersContainer.style.overflow = 'hidden';
          lineNumbersContainer.style.borderRight = '1px solid #666';
          lineNumbersContainer.style.backgroundColor = resolvedTheme === 'dark' ? '#1a1a1a' : '#f0f0f0';
          lineNumbersContainer.style.paddingTop = '0.4em';
          
          // 创建行号内容
          const lineNumbersContent = document.createElement('div');
          lineNumbersContent.style.textAlign = 'right';
          lineNumbersContent.style.paddingRight = '0.4em';
          lineNumbersContent.style.color = '#888';
          lineNumbersContent.style.fontSize = '0.85em';
          lineNumbersContent.style.lineHeight = '1.4';
          
          // 生成所有行号
          for (let i = 1; i <= lineCount; i++) {
            const lineNumber = document.createElement('div');
            lineNumber.textContent = i.toString();
            lineNumber.style.height = '1.4em';
            lineNumbersContent.appendChild(lineNumber);
          }
          
          lineNumbersContainer.appendChild(lineNumbersContent);
          codeContainerRef.current.appendChild(lineNumbersContainer);
          
          // 同步滚动处理
          const codeElement = preRef.current;
          codeElement.addEventListener('scroll', () => {
            if (lineNumbersContainer) {
              lineNumbersContainer.scrollTop = codeElement.scrollTop;
            }
          });
        }
      }, 10);
    }
  }, [code, resolvedTheme]);

  const themeClass = useMemo(() => {
    // 根据主题切换样式类
    return resolvedTheme === 'dark' ? 'prism-dark' : 'prism-light';
  }, [resolvedTheme]);

  // 添加自定义样式以覆盖Prism默认样式
  useEffect(() => {
    const style = document.createElement('style');
    // 根据主题设置样式
    if (resolvedTheme === 'dark') {
      style.innerHTML = `
        .prism-dark {
          background-color: #1a1a1a !important;
          color: #e0e0e0 !important;
          position: relative;
          padding-left: 3em !important;
          line-height: 1.4;
          overflow: auto;
          max-height: 100%;
          font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace !important;
        }
        .prism-dark .token.comment { color: #6a9955 !important; }
        .prism-dark .token.keyword { color: #569cd6 !important; }
        .prism-dark .token.string { color: #ce9178 !important; }
        .prism-dark .token.function { color: #dcdcaa !important; }
        .prism-dark .token.punctuation { color: #d4d4d4 !important; }
        .prism-dark .token.operator { color: #d4d4d4 !important; }
        .prism-dark .token.number { color: #b5cea8 !important; }
        .prism-dark .token.variable { color: #9cdcfe !important; }
        .prism-dark .token.global-variable { color: #f8c555 !important; font-weight: bold; }
      `;
    } else {
      style.innerHTML = `
        .prism-light {
          background-color: #f6f8fa !important;
          color: #24292e !important;
          position: relative;
          padding-left: 3em !important;
          line-height: 1.4;
          overflow: auto;
          max-height: 100%;
          font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace !important;
        }
        .prism-light .token.comment { color: #6a737d !important; }
        .prism-light .token.keyword { color: #d73a49 !important; }
        .prism-light .token.string { color: #032f62 !important; }
        .prism-light .token.function { color: #6f42c1 !important; }
        .prism-light .token.punctuation { color: #24292e !important; }
        .prism-light .token.operator { color: #24292e !important; }
        .prism-light .token.number { color: #005cc5 !important; }
        .prism-light .token.variable { color: #005cc5 !important; }
        .prism-light .token.global-variable { color: #e36209 !important; font-weight: bold; }
      `;
    }
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [resolvedTheme]);

  return (
    <div ref={codeContainerRef} className="relative" style={{height: '100%', minHeight: '300px'}}>
      <pre ref={preRef} className={`language-sql ${themeClass}`} style={{fontSize: '0.9em', maxHeight: '100%', overflow: 'auto', margin: 0, padding: '0.5em 0.5em 0.5em 3em'}}>
        <code>{code}</code>
      </pre>
    </div>
  );
}; 