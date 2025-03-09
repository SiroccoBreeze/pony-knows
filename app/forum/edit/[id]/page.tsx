'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/hooks/use-toast";
import ToastEditor, { ToastEditorRef } from '@/components/editor/ToastEditor';
import { ArrowLeft, Save, Eye } from 'lucide-react';

// 模拟帖子数据
const mockPosts = [
  {
    id: '1',
    title: '如何提高工作效率：10个实用技巧',
    content: '# 如何提高工作效率：10个实用技巧\n\n在当今快节奏的工作环境中，提高效率变得越来越重要。以下是10个实用技巧，帮助你更高效地工作：\n\n## 1. 使用番茄工作法\n\n番茄工作法是一种时间管理方法，使用一个定时器来分割工作时间和休息时间。通常是25分钟的工作时间，然后休息5分钟。\n\n## 2. 制定明确的目标\n\n每天开始工作前，列出当天需要完成的任务，并按优先级排序。\n\n## 3. 减少干扰\n\n关闭社交媒体通知，将手机设为静音，或使用专注模式应用程序。\n\n## 4. 使用任务管理工具\n\n利用任务管理工具如Trello、Asana或Todoist来跟踪和管理你的任务。\n\n## 5. 学会委派任务\n\n不要试图什么都自己做，学会将任务委派给团队成员。\n\n## 6. 避免多任务处理\n\n研究表明，多任务处理实际上会降低效率。专注于一次完成一项任务。\n\n## 7. 利用高效时间\n\n了解自己什么时候效率最高，并在这段时间处理最重要的任务。\n\n## 8. 定期休息\n\n短暂的休息可以帮助恢复注意力和提高生产力。\n\n## 9. 保持工作区整洁\n\n一个整洁的工作环境可以减少分心并提高效率。\n\n## 10. 学习快捷键\n\n掌握常用软件的快捷键可以节省大量时间。',
    status: 'published',
    category: 'productivity',
    tags: ['效率', '工作', '时间管理'],
    createdAt: '2023-05-15T10:30:00Z',
    updatedAt: '2023-05-15T10:30:00Z',
  },
  {
    id: '2',
    title: '2023年最值得学习的编程语言',
    content: '# 2023年最值得学习的编程语言\n\n随着技术的不断发展，编程语言的受欢迎程度也在不断变化。以下是2023年最值得学习的几种编程语言：\n\n## Python\n\nPython继续保持其受欢迎程度，特别是在数据科学、机器学习和人工智能领域。其简洁的语法和丰富的库使其成为初学者和专业人士的首选。\n\n## JavaScript\n\n作为Web开发的基础语言，JavaScript的重要性不言而喻。随着Node.js的兴起，JavaScript也成为了后端开发的重要语言。\n\n## Rust\n\nRust因其内存安全和高性能而受到越来越多的关注。它被用于系统编程、游戏开发和Web Assembly。\n\n## Go\n\nGo语言由Google开发，以其简单性和并发处理能力而闻名。它在云计算和微服务架构中特别受欢迎。\n\n## TypeScript\n\nTypeScript是JavaScript的超集，添加了静态类型检查。它提高了代码质量和开发效率，特别是在大型项目中。\n\n## Kotlin\n\nKotlin已成为Android开发的官方语言，并且在服务器端开发中也越来越受欢迎。\n\n## Swift\n\nSwift是Apple平台上的主要开发语言，用于iOS、macOS、watchOS和tvOS应用程序开发。\n\n## 结论\n\n选择学习哪种编程语言应该基于你的兴趣、职业目标和项目需求。无论你选择哪种语言，重要的是深入理解编程概念和最佳实践。',
    status: 'published',
    category: 'programming',
    tags: ['编程', '技术', '学习'],
    createdAt: '2023-06-22T14:15:00Z',
    updatedAt: '2023-06-22T14:15:00Z',
  },
];

// 帖子分类选项
const categories = [
  { value: 'general', label: '综合讨论' },
  { value: 'programming', label: '编程技术' },
  { value: 'design', label: '设计创意' },
  { value: 'productivity', label: '效率提升' },
  { value: 'career', label: '职业发展' },
];

// 帖子状态选项
const statuses = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '发布' },
];

interface PostEditPageProps {
  params: {
    id: string;
  };
}

export default function PostEditPage({ params }: PostEditPageProps) {
  const { id } = params;
  const router = useRouter();
  const editorRef = useRef<ToastEditorRef>(null);
  
  // 初始化状态
  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    status: 'draft',
    tags: '',
  });
  
  // 查找帖子数据
  const post = mockPosts.find(post => post.id === id);
  
  // 如果找到帖子，更新表单数据
  if (post && formData.title === '') {
    setFormData({
      title: post.title,
      content: post.content,
      category: post.category,
      status: post.status,
      tags: post.tags.join(', '),
    });
  }
  
  // 如果帖子不存在，显示错误信息
  if (!post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">帖子不存在</h1>
          <p className="text-muted-foreground mb-6">找不到ID为 {id} 的帖子</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </div>
      </div>
    );
  }
  
  // 处理表单字段变化
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // 处理编辑器内容变化
  const handleEditorChange = (value: string) => {
    setFormData(prev => ({ ...prev, content: value }));
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 获取最新的编辑器内容
      const content = editorRef.current?.getMarkdown() || formData.content;
      
      // 在实际应用中，这里应该调用API保存帖子
      console.log('保存帖子:', { ...formData, content });
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: '帖子已保存',
        description: `《${formData.title}》已成功保存。`,
      });
      
      // 保存成功后返回帖子列表页
      router.push('/user/posts');
    } catch (error) {
      console.error('保存帖子失败:', error);
      toast({
        title: '保存失败',
        description: '保存帖子时出现错误，请稍后重试。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 切换预览模式
  const togglePreview = () => {
    setIsPreview(!isPreview);
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">编辑帖子</h1>
        </div>
        <Button variant="outline" onClick={togglePreview}>
          <Eye className="mr-2 h-4 w-4" />
          {isPreview ? '编辑模式' : '预览模式'}
        </Button>
      </div>
      
      {isPreview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formData.title}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="mr-2">分类: {categories.find(c => c.value === formData.category)?.label}</span>
              <span className="mr-2">•</span>
              <span>状态: {statuses.find(s => s.value === formData.status)?.label}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm sm:prose lg:prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: editorRef.current?.getHTML() || '' }} />
          </CardContent>
          <CardFooter>
            <Button onClick={() => setIsPreview(false)}>返回编辑</Button>
          </CardFooter>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>帖子信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="请输入帖子标题"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">分类</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) => handleChange('category', value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: string) => handleChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">标签</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="输入标签，用逗号分隔"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">内容</Label>
                <div className="border rounded-md">
                  <ToastEditor
                    ref={editorRef}
                    initialValue={formData.content}
                    height="500px"
                    placeholder="请输入..."
                    onChange={handleEditorChange}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    保存中...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="mr-2 h-4 w-4" />
                    保存帖子
                  </span>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
} 