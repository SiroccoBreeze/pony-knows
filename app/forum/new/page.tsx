"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Rocket, Plus, Check, X } from "lucide-react";
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
import VditorEditor, { VditorEditorRef } from "@/components/editor/VditorEditor";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// 定义表单验证模式
const formSchema = z.object({
  title: z.string().min(1, { message: "请输入帖子标题" }),
  tags: z.string().min(1, { message: "请输入帖子标签" }),
  content: z.string().optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

type FormValues = z.infer<typeof formSchema>;

interface Tag {
  id: string;
  name: string;
}

export default function NewPostPage() {
  const router = useRouter();
  const editorRef = useRef<VditorEditorRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

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
      title: "",
      tags: "",
      content: "",
      status: "published",
    },
  });

  // 同步编辑器内容到 ref
  const handleContentChange = (value: string) => {
    contentRef.current = value;
    form.setValue("content", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

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

      // 发送请求创建帖子
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const error = await response.json();
          errorMessage = error.error || (status === "draft" ? "保存草稿失败" : "发布帖子失败");
        } catch (e) {
          console.error("响应解析错误:", e, "状态码:", response.status);
          errorMessage = `${status === "draft" ? "保存草稿" : "发布帖子"}失败: 服务器响应无效`;
        }
        throw new Error(errorMessage);
      }

      // 获取响应内容，其中包含新创建的帖子信息
      const createdPost = await response.json();
      
      // 处理编辑器中已上传的临时图片，将它们关联到新创建的帖子
      if (createdPost && createdPost.id) {
        try {
          console.log('开始处理新帖子的图片关联, 帖子ID:', createdPost.id);
          
          // 从编辑器的内容中提取图片URL - 这里改进正则表达式匹配
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
          
          console.log('从编辑器内容提取到的图片URL数量:', imageUrls.size);
          console.log('提取到的URL:', Array.from(imageUrls));
          
          // 如果找到图片URL，关联到帖子
          if (imageUrls.size > 0) {
            const associatePromises = Array.from(imageUrls).map(url => {
              // 提取用户ID和文件名
              const urlParts = url.split('/');
              const filename = urlParts[urlParts.length - 1];
              const userId = urlParts[urlParts.length - 2];
              
              // 确定文件原始路径 - 假设这是临时文件
              const filePath = `users/${userId}/temp/images/${filename}`;
              
              console.log('关联图片:', {
                url,
                filePath,
                postId: createdPost.id
              });
              
              // 调用关联API
              return fetch(`/api/posts/${createdPost.id}/images`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url,
                  filename: filePath, // 临时目录的路径
                  size: 0,
                  type: 'image/jpeg'
                })
              }).then(response => {
                if (!response.ok) {
                  throw new Error(`关联图片失败: ${response.status}`);
                }
                return response.json();
              }).then(data => {
                console.log('图片关联成功:', data);
                return data;
              });
            });
            
            // 处理所有关联请求的结果
            Promise.all(associatePromises)
              .then(results => {
                console.log(`成功关联 ${results.length} 张图片到帖子 ${createdPost.id}`);
              })
              .catch(error => {
                console.error("关联图片到帖子失败:", error);
              });
          } else {
            console.log('未找到需要关联的图片URL');
          }
        } catch (error) {
          console.error("处理图片关联时出错:", error);
          // 不中断主流程
        }
      }

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
      console.error("创建帖子失败:", error);
      toast({
        title: "失败！",
        description:
          error instanceof Error ? error.message : "创建帖子失败，请重试",
        variant: "destructive",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">发布新帖</h1>
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
                        <Input placeholder="请输入标题" {...field} />
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
                onClick={form.handleSubmit(onSubmit)}
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
