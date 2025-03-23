"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export default function CreatePostPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
  });

  // 如果未登录则重定向到登录页
  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-muted-foreground mb-4">您需要登录后才能发布帖子</p>
          <Button asChild>
            <Link href="/auth/login">登录</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 表单变化处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("请填写标题和内容");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 准备提交数据
      const postData = {
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        status: "published"
      };
      
      // 发送请求
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
      });
      
      // 处理响应
      if (response.ok) {
        const data = await response.json();
        toast.success("帖子发布成功！");
        router.push(`/forum/post/${data.id}`);
      } else {
        const errorData = await response.json();
        toast.error(`发布失败: ${errorData.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("发布帖子失败:", error);
      toast.error("发布失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>发布新帖子</CardTitle>
          <CardDescription>分享您的问题或想法</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                name="title"
                placeholder="请输入帖子标题"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="请输入帖子内容，支持Markdown格式"
                value={formData.content}
                onChange={handleChange}
                rows={10}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="以逗号分隔多个标签，如: javascript, react, next.js"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/forum">取消</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "发布中..." : "发布帖子"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 