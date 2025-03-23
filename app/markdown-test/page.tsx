"use client";

import MarkdownRenderer from "@/components/markdown/markdown-renderer";

export default function MarkdownTestPage() {
  const testMarkdown = `
# 这是一个标题

这是一段普通文本，包含**粗体**和*斜体*。

## 这是二级标题

- 列表项1
- 列表项2
- 列表项3

### 代码块

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

#### 表格

| 名称 | 年龄 | 职业 |
|------|------|------|
| 张三 | 25   | 工程师 |
| 李四 | 30   | 设计师 |

##### 引用

> 这是一段引用文本
> 
> 这是引用的第二行
`;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Markdown 渲染测试</h1>
      <div className="border p-6 rounded-lg">
        <MarkdownRenderer content={testMarkdown} />
      </div>
    </div>
  );
} 