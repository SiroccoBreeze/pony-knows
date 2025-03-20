'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Rocket } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
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

interface Post {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published";
  tags: Tag[];
  postTags?: PostTag[];
  createdAt: string;
  updatedAt: string;
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

  // 获取帖子数据
  React.useEffect(() => {
    const fetchPost = async () => {
      try {
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

      // 准备提交的数据
      const postData = {
        ...values,
        tags: values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        content: contentRef.current,
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
            <CardHeader>
              <CardTitle>帖子信息</CardTitle>
            </CardHeader>
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
                    <FormItem>
                      <FormLabel>标签</FormLabel>
                      <FormControl>
                        <Input placeholder="输入标签，用逗号分隔" {...field} />
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