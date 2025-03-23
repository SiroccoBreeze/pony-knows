'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
        components={{
          // 自定义h1-h6标签样式
          h1: (props) => <h1 className="text-2xl font-bold my-4" {...props} />,
          h2: (props) => <h2 className="text-xl font-bold my-3" {...props} />,
          h3: (props) => <h3 className="text-lg font-bold my-2" {...props} />,
          h4: (props) => <h4 className="text-base font-bold my-2" {...props} />,
          h5: (props) => <h5 className="text-sm font-bold my-1" {...props} />,
          h6: (props) => <h6 className="text-xs font-bold my-1" {...props} />,
          
          // 自定义段落和列表样式
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 my-2" {...props} />,
          li: (props) => <li className="my-1" {...props} />,
          
          // 自定义链接和图片样式
          a: (props) => (
            <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          img: (props) => (
            <img className="max-w-full rounded-md my-4" {...props} alt={props.alt || 'image'} />
          ),
          
          // 自定义表格样式
          table: (props) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300 dark:border-gray-700" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
          tbody: (props) => <tbody {...props} />,
          tr: (props) => <tr className="border-b border-gray-300 dark:border-gray-700" {...props} />,
          th: (props) => (
            <th className="px-4 py-2 text-left font-semibold" {...props} />
          ),
          td: (props) => <td className="px-4 py-2" {...props} />,
          
          // 自定义代码块样式
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="relative">
                <div className="absolute top-0 right-0 bg-gray-200 dark:bg-gray-700 text-xs px-2 py-1 rounded-bl-md">
                  {match[1]}
                </div>
                <code className={`${className} block p-4 mt-4 rounded-md bg-gray-100 dark:bg-gray-800 overflow-x-auto`} {...props}>
                  {children}
                </code>
              </div>
            ) : (
              <code className="px-1 py-0.5 rounded-sm bg-gray-200 dark:bg-gray-800 text-sm" {...props}>
                {children}
              </code>
            );
          },
          
          // 自定义引用和分割线样式
          blockquote: (props) => (
            <blockquote className="pl-4 border-l-4 border-gray-300 dark:border-gray-700 italic my-4" {...props} />
          ),
          hr: (props) => <hr className="my-6 border-gray-300 dark:border-gray-700" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 