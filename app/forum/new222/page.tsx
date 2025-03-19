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
import { ArrowLeft, Save } from 'lucide-react';
import { useUserStore } from '@/store';

// 帖子分类选项
const categories = [
  { value: 'general', label: '综合讨论' },
  { value: 'programming', label: '编程技术' },
  { value: 'design', label: '设计创意' },
  { value: 'productivity', label: '效率提升' },
  { value: 'career', label: '职业发展' },
];

export default function NewPostPage() {
  const router = useRouter();
  const editorRef = useRef<ToastEditorRef>(null);
  const { user, isLoggedIn } = useUserStore();
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
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
      
      // 验证表单
      if (!formData.title.trim()) {
        throw new Error('请输入帖子标题');
      }
      
      if (!content.trim()) {
        throw new Error('请输入帖子内容');
      }
      
      // 准备帖子数据
      const postData = {
        ...formData,
        content,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        authorId: user?.id || 'anonymous',
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // 在实际应用中，这里应该调用API保存帖子
      console.log('发布帖子:', postData);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: '帖子已发布',
        description: `《${formData.title}》已成功发布。`,
      });
      
      // 发布成功后返回帖子列表页
      router.push('/forum');
    } catch (error) {
      console.error('发布帖子失败:', error);
      toast({
        title: '发布失败',
        description: error instanceof Error ? error.message : '发布帖子时出现错误，请稍后重试。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 如果用户未登录，显示提示信息
  if (!isLoggedIn) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">需要登录</h1>
          <p className="text-muted-foreground mb-6">您需要登录后才能发布帖子</p>
          <Button onClick={() => router.push('/auth/login?callbackUrl=/forum/new')}>
            去登录
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">发布新帖子</h1>
      </div>
      
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
                  height="500px"
                  initialValue=""
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
                  发布中...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="mr-2 h-4 w-4" />
                  发布帖子
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 