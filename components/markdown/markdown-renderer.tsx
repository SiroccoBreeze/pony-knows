import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from 'next/link';
import { Copy, Check, Terminal } from 'lucide-react';
import { useTheme } from 'next-themes';
import { CSSProperties } from 'react';

interface MarkdownRendererProps {
  content: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
  className?: string;
  [key: string]: unknown;
}

// 补充代码组件类型定义
interface CodeProps {
  className?: string;
  children?: React.ReactNode;
  node?: {
    tagName?: string;
    properties?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

// 自定义代码块样式覆盖
const codeBlockBaseStyle = {
  fontSize: '14px', // 保持字体大小一致
  lineHeight: '1.5',
  padding: '1.5rem',
  paddingTop: '2.5rem',
  margin: 0,
  borderRadius: '0.375rem',
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // 自定义代码块组件
  function CodeBlock({ language, code, ...props }: CodeBlockProps) {
    const [copied, setCopied] = React.useState(false);
    
    const handleCopy = async () => {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    return (
      <div className="relative group my-6 rounded-md overflow-hidden">
        <div className="absolute top-0 right-0 flex items-center space-x-1 p-1 rounded-bl-md z-10">
          {/* 语言标签 */}
          <div className="px-2 py-1 text-xs font-mono rounded-md bg-primary/10 text-primary">
            <span className="flex items-center">
              <Terminal className="h-3 w-3 mr-1" />
              {language}
            </span>
          </div>
          
          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-muted hover:bg-muted/80 text-muted-foreground"
            aria-label="复制代码"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <SyntaxHighlighter
          style={isDark ? vscDarkPlus : oneLight}
          language={language}
          PreTag="div"
          className="rounded-md !mt-0 !pt-10"
          wrapLines
          customStyle={{
            ...codeBlockBaseStyle,
            fontSize: '14px',
          } as CSSProperties}
          codeTagProps={{
            style: {
              fontSize: '14px',
              lineHeight: '1.5',
            }
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // 代码块渲染
        code({ className, children, node, ...props }: CodeProps) {
          const match = /language-(\w+)/.exec(className || '');
          
          if (node?.tagName === 'code' && match) {
            const code = String(children).replace(/\n$/, '');
            const language = match[1];
            
            return <CodeBlock code={code} language={language} {...props} />;
          }
          
          return (
            <code className={`${className} px-1 py-0.5 bg-muted rounded text-sm`} {...props}>
              {children}
            </code>
          );
        },
        
        // 图片渲染
        img({ ...props }) {
          const { src, alt, title } = props;
          return (
            <span className="block relative w-full my-6 overflow-hidden rounded-lg">
              <img 
                src={src as string} 
                alt={alt as string} 
                title={title as string} 
                className="w-full h-auto"
                loading="lazy"
              />
            </span>
          );
        },
        
        // 标题渲染
        h1: ({ children, ...props }) => {
          return <h1 className="mt-8 mb-4 text-3xl font-bold scroll-mt-[120px]" {...props}>{children}</h1>;
        },
        h2: ({ children, ...props }) => {
          return <h2 className="mt-6 mb-4 text-2xl font-bold scroll-mt-[120px]" {...props}>{children}</h2>;
        },
        h3: ({ children, ...props }) => {
          return <h3 className="mt-5 mb-3 text-xl font-bold scroll-mt-[120px]" {...props}>{children}</h3>;
        },
        h4: ({ children, ...props }) => {
          return <h4 className="mt-4 mb-2 text-lg font-bold scroll-mt-[120px]" {...props}>{children}</h4>;
        },
        h5: ({ children, ...props }) => {
          return <h5 className="mt-3 mb-2 text-md font-bold scroll-mt-[120px]" {...props}>{children}</h5>;
        },
        h6: ({ children, ...props }) => {
          return <h6 className="mt-3 mb-2 text-base font-bold scroll-mt-[120px]" {...props}>{children}</h6>;
        },
        
        // 链接渲染
        a: ({ children, href, ...props }) => {
          const isInternal = href?.startsWith('/') || href?.startsWith('#');
          
          if (isInternal) {
            return (
              <Link
                href={href || '#'}
                className="text-primary hover:underline"
                {...props}>
                {children}
              </Link>
            );
          }
          
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        
        // 段落渲染
        p: ({ children, ...props }) => {
          return <p className="mb-4 leading-relaxed" {...props}>{children}</p>;
        },
        
        // 列表渲染
        ul: ({ children, ...props }) => {
          return <ul className="mb-4 pl-6 list-disc" {...props}>{children}</ul>;
        },
        ol: ({ children, ...props }) => {
          return <ol className="mb-4 pl-6 list-decimal" {...props}>{children}</ol>;
        },
        li: ({ children, ...props }) => {
          return <li className="mb-1" {...props}>{children}</li>;
        },
        
        // 表格渲染
        table: ({ children, ...props }) => {
          return (
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse" {...props}>{children}</table>
            </div>
          );
        },
        thead: ({ children, ...props }) => {
          return <thead className="bg-muted/50" {...props}>{children}</thead>;
        },
        tbody: ({ children, ...props }) => {
          return <tbody {...props}>{children}</tbody>;
        },
        tr: ({ children, ...props }) => {
          return <tr className="border-b border-border" {...props}>{children}</tr>;
        },
        th: ({ children, ...props }) => {
          return <th className="px-4 py-2 text-left font-semibold" {...props}>{children}</th>;
        },
        td: ({ children, ...props }) => {
          return <td className="px-4 py-2" {...props}>{children}</td>;
        },
        
        // 引用渲染
        blockquote: ({ children, ...props }) => {
          return (
            <blockquote 
              className="pl-4 border-l-4 border-primary/30 bg-primary/5 py-2 pr-2 my-4 italic"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        
        // 分割线渲染
        hr: ({ ...props }) => {
          return <hr className="my-6 border-t border-border" {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
} 