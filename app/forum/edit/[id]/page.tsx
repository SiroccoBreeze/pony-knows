'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Rocket, Plus, Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import VditorEditor, { VditorEditorRef } from '@/components/editor/VditorEditor';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, isMobileDevice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

// 定义表单验证模式
const formSchema = z.object({
  title: z.string().min(1, { message: "请输入帖子标题" }),
  tags: z.string().min(1, { message: "请输入帖子标签" }),
  content: z.string().optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

type FormValues = z.infer<typeof formSchema>;

// 定义帖子类型
interface PostTag {
  tag: Tag;
}

interface PostImage {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published";
  tags: Tag[];
  postTags?: PostTag[];
  createdAt: string;
  updatedAt: string;
  images?: PostImage[];
}

interface Tag {
  id: string;
  name: string;
}

interface PostEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PostEditPage({ params }: PostEditPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const editorRef = useRef<VditorEditorRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef("");
  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // 获取帖子数据
  React.useEffect(() => {
    const fetchPost = async () => {
      try {
        // 首先检查当前用户是否有编辑权限
        const authCheckResponse = await fetch(`/api/posts/${id}/auth-check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Action-Type': 'edit'
          }
        });

        if (!authCheckResponse.ok) {
          const errorData = await authCheckResponse.json();
          setPermissionError(errorData.error || "您没有权限编辑此帖子");
          setHasEditPermission(false);
          setIsLoadingPost(false);
          return;
        }

        // 用户有权限，继续获取帖子数据
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) {
          throw new Error("获取帖子失败");
        }
        const data = await response.json();
        // 将postTags转换为tags格式
        const formattedData = {
          ...data,
          tags: data.postTags ? data.postTags.map((pt: PostTag) => pt.tag) : []
        };
        setPost(formattedData);
        setHasEditPermission(true);
      } catch (error) {
        console.error("获取帖子出错:", error);
        toast({
          title: "错误",
          description: "获取帖子失败，请重试",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPost(false);
      }
    };

    fetchPost();
  }, [id]);

  // 获取所有标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
          throw new Error('获取标签失败');
        }
        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error('获取标签失败:', error);
        toast({
          title: "错误",
          description: "获取标签失败，请重试",
          variant: "destructive",
        });
      }
    };

    fetchTags();
  }, []);

  // 初始化表单
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: post?.title || "",
      tags: post?.tags?.map((tag) => tag.name).join(", ") || "",
      content: post?.content || "",
      status: post?.status || "published",
    },
  });

  // 当帖子数据加载完成时更新表单
  React.useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        tags: post.tags?.map((tag) => tag.name).join(", ") || "",
        content: post.content,
        status: post.status,
      });
      contentRef.current = post.content;
      
      // 等待编辑器初始化，然后设置内容
      const setEditorContent = () => {
        if (!editorRef.current) {
          console.log("编辑器引用尚未创建，延迟尝试...");
          setTimeout(setEditorContent, 500);
          return;
        }
        
        try {
          // 检查编辑器是否已准备好
          if (editorRef.current.isReady()) {
            console.log("编辑器已准备好，设置内容");
            const editor = editorRef.current.getInstance();
            editor.setValue(post.content);
          } else {
            console.log("编辑器尚未准备好，延迟尝试...");
            setTimeout(setEditorContent, 500);
          }
        } catch (e) {
          console.error("检查编辑器状态或设置内容时出错:", e);
          setTimeout(setEditorContent, 1000);
        }
      };
      
      // 开始尝试设置编辑器内容
      setEditorContent();
    }
  }, [post, form]);

  // 初始化已选标签
  useEffect(() => {
    if (post?.tags) {
      setSelectedTags(post.tags);
    }
  }, [post]);

  // 同步编辑器内容到 ref
  const handleContentChange = (value: string) => {
    contentRef.current = value;
    form.setValue("content", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  // 保持编辑器内容
  React.useEffect(() => {
    if (editorRef.current && contentRef.current) {
      const editor = editorRef.current;
      editor.clear();
      editor.getInstance().setValue(contentRef.current);
    }
  }, [form.formState.submitCount]);

  // 处理标签选择
  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      const newTags = [...selectedTags, tag];
      setSelectedTags(newTags);
      form.setValue("tags", newTags.map(t => t.name).join(", "), {
        shouldDirty: true,
        shouldTouch: true,
      });
    } else {
      const newTags = selectedTags.filter(t => t.id !== tag.id);
      setSelectedTags(newTags);
      form.setValue("tags", newTags.map(t => t.name).join(", "), {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  // 处理标签移除
  const handleTagRemove = (tagId: string) => {
    const newTags = selectedTags.filter(tag => tag.id !== tagId);
    setSelectedTags(newTags);
    form.setValue("tags", newTags.map(t => t.name).join(", "), {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  // 保存草稿
  const saveDraft = async () => {
    // 验证必填字段
    const result = await form.trigger(["title", "tags"]);
    if (!result) {
      return;
    }
    
    // 验证内容不能为空
    if (!contentRef.current.trim()) {
      toast({
        title: "提示",
        description: "请输入帖子内容",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return;
    }
    
    // 设置状态为草稿并提交
    form.setValue("status", "draft");
    form.handleSubmit(onSubmit)();
  };

  // 发布帖子
  const publishPost = async () => {
    // 验证必填字段
    const result = await form.trigger(["title", "tags"]);
    if (!result) {
      return;
    }
    
    // 验证内容不能为空
    if (!contentRef.current.trim()) {
      toast({
        title: "提示",
        description: "请输入帖子内容",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return;
    }
    
    // 设置状态为发布并提交
    form.setValue("status", "published");
    form.handleSubmit(onSubmit)();
  };

  // 处理表单提交
  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      
      // 验证内容不能为空
      if (!contentRef.current.trim()) {
        toast({
          title: "提示",
          description: "请输入帖子内容",
          variant: "default",
          action: <ToastAction altText="close">关闭</ToastAction>,
        });
        setIsLoading(false);
        return;
      }

      const status = values.status;
      
      // 检测已删除的图片
      const removedImageIds: string[] = [];
      
      // 只有在帖子有图片时才进行检测
      if (post?.images && post.images.length > 0) {
        console.log('检测已删除的图片...');
        
        // 从编辑器的内容中提取图片URL
        const content = contentRef.current;
        
        // 使用两种正则表达式，分别匹配Markdown和HTML中的图片
        const markdownImgRegex = /!\[.*?\]\(([^)]+)\)/g;
        const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
        
        const imageUrls = new Set<string>();
        
        // 匹配Markdown格式的图片
        let mdMatch;
        while ((mdMatch = markdownImgRegex.exec(content)) !== null) {
          if (mdMatch[1].includes('/api/posts/images/')) {
            imageUrls.add(mdMatch[1]);
          }
        }
        
        // 匹配HTML格式的图片
        let htmlMatch;
        while ((htmlMatch = htmlImgRegex.exec(content)) !== null) {
          if (htmlMatch[1].includes('/api/posts/images/')) {
            imageUrls.add(htmlMatch[1]);
          }
        }
        
        console.log('当前编辑器中的图片URL数量:', imageUrls.size);
        
        // 检查哪些图片已经不在编辑器内容中
        post.images.forEach(image => {
          if (!Array.from(imageUrls).some(url => url === image.url)) {
            // 这个图片URL不在当前编辑器内容中，说明被删除了
            removedImageIds.push(image.id);
            console.log('检测到删除的图片:', image.url);
          }
        });
        
        console.log('检测到需要删除的图片数量:', removedImageIds.length);
      }

      // 准备提交的数据
      const postData = {
        ...values,
        tags: values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        content: contentRef.current,
        removedImageIds: removedImageIds,
      };

      console.log("准备提交的数据:", postData);

      // 发送请求更新帖子
      const response = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      console.log("服务器响应状态:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("服务器错误响应:", errorText);
        throw new Error(status === "draft" ? "保存草稿失败" : "更新帖子失败");
      }

      // 成功响应
      await response.json(); // 读取响应体但不需要使用

      toast({
        title: "成功！",
        description: status === "draft"
          ? `《${values.title}》已保存为草稿。`
          : `《${values.title}》已成功发布。`,
        action: <ToastAction altText="close">关闭</ToastAction>,
      });

      // 根据状态跳转到不同页面和标签
      router.push(`/user/posts?tab=${status}`);
    } catch (error) {
      console.error("更新帖子出错:", error);
      toast({
        title: "失败！",
        description:
          error instanceof Error ? error.message : "更新帖子失败，请重试",
        variant: "destructive",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 如果正在加载帖子数据，显示加载状态
  if (isLoadingPost) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">加载中...</h1>
          <p className="text-muted-foreground">正在获取帖子数据</p>
        </div>
      </div>
    );
  }
  
  // 显示权限错误
  if (permissionError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">权限错误</h1>
          <p className="text-muted-foreground mb-6">{permissionError}</p>
          <Button onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <Button asChild>
            <Link href={`/forum/post/${id}`}>
              查看帖子
            </Link>
          </Button>
        </div>
      </div>
    );
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

  if (isMobile) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-muted/30 p-4 rounded-lg">
          <h1 className="text-xl font-bold mb-4">移动端不支持编辑功能</h1>
          <p className="text-muted-foreground mb-4">
            为了更好的编辑体验，请使用桌面端访问此页面。
          </p>
          <Button asChild>
            <Link href={`/forum/post/${id}`}>
              返回帖子详情
            </Link>
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
          <h1 className="text-2xl font-bold">编辑帖子</h1>
      </div>
      
        <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* <CardHeader>
              <CardTitle>帖子信息</CardTitle>
            </CardHeader> */}
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标题</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入帖子标题" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2">标签</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  role="combobox"
                                  aria-expanded={open}
                                  className="h-8 w-8"
                                  onClick={() => setOpen(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] p-0" align="start">
                                <Command className="w-full">
                                  <CommandInput 
                                    placeholder="搜索标签..." 
                                    className="h-9 border-none focus:ring-0"
                                  />
                                  <CommandEmpty className="py-6 text-center text-sm">
                                    未找到相关标签
                                  </CommandEmpty>
                                  <ScrollArea className="h-[200px]">
                                    <CommandGroup>
                                      {tags.map((tag) => {
                                        const isSelected = selectedTags.some(t => t.id === tag.id);
                                        return (
                                          <CommandItem
                                            key={tag.id}
                                            onSelect={() => handleTagSelect(tag)}
                                            className={cn(
                                              "flex items-center gap-2 px-2 py-1.5",
                                              isSelected && "bg-primary/5"
                                            )}
                                          >
                                            <div className={cn(
                                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                              isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                                            )}>
                                              {isSelected && (
                                                <Check className="h-3 w-3" />
                                              )}
                                            </div>
                                            <span className={cn(
                                              "flex-1",
                                              isSelected && "font-medium"
                                            )}>
                                              {tag.name}
                                            </span>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </ScrollArea>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <div className="flex-1 flex flex-wrap gap-1.5 min-h-[2.5rem] py-1">
                              {selectedTags.length === 0 ? (
                                <span className="text-muted-foreground text-sm py-1">
                                  请选择标签...
                                </span>
                              ) : (
                                selectedTags.map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="flex items-center gap-1 px-2 py-1 text-sm bg-primary/10 hover:bg-primary/20 transition-colors"
                                  >
                                    {tag.name}
                                    <button
                                      type="button"
                                      onClick={() => handleTagRemove(tag.id)}
                                      className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">内容</Label>
                <div className="border rounded-md">
                  <VditorEditor
                    ref={editorRef}
                    height={500}
                    placeholder="请输入内容..."
                    onChange={handleContentChange}
                    initialValue={post.content || ""}
                    postId={id}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={saveDraft}
              >
                <Save className="mr-1 h-4 w-4" />
                {isLoading ? "保存中..." : "保存草稿"}
              </Button>
              <Button 
                type="button" 
                disabled={isLoading}
                onClick={publishPost}
              >
                <Rocket className="mr-1 h-4 w-4" />
                {isLoading ? "发布中..." : "发布帖子"}
              </Button>
            </CardFooter>
          </form>
        </Form>
          </Card>
    </div>
  );
} 