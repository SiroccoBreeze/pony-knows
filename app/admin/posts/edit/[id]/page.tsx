"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminPermission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";

interface PostData {
  id: string;
  title: string;
  content: string;
  status: string;
  postTags: {
    tag: {
      name: string;
    }
  }[];
}

interface Tag {
  id: string;
  name: string;
}

interface PostTag {
  tag: {
    name: string;
  }
}

// 使用适当的类型限制，避免使用unknown而不是any
interface PageProps {
  params: { id: string } | Promise<{ id: string }> | unknown;
}

export default function EditPostPage(props: PageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission, isAdmin } = useAuthPermissions();
  const { data: session } = useSession();
  
  // 状态变量
  const [loading, setLoading] = useState(false);
  const [postId, setPostId] = useState<string>("");
  const [post, setPost] = useState<PostData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("published");
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // 从params中提取ID
  useEffect(() => {
    async function extractPostId() {
      try {
        // 处理params可能是Promise的情况
        const paramsObj = props.params instanceof Promise 
          ? await props.params 
          : props.params;
        
        // 确保从params中提取id
        if (typeof paramsObj === 'object' && paramsObj !== null && 'id' in paramsObj) {
          const id = String(paramsObj.id);
          console.log("[EditPost] 提取到帖子ID:", id);
          setPostId(id);
        } else {
          console.error("[EditPost] 无法从params中获取帖子ID:", paramsObj);
          toast({
            title: "参数错误",
            description: "无法获取帖子ID，请返回列表重试",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("[EditPost] 提取帖子ID时出错:", error);
      }
    }
    
    extractPostId();
  }, [props.params, toast]);
  
  // 检查权限 - 允许超级管理员编辑
  useEffect(() => {
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
    const isAdminByEmail = adminEmails.includes(session?.user?.email || "");
    
    // 打印用户权限
    console.log("[EditPost] 权限检查:", {
      isAdmin: isAdmin(),
      hasEditPermission: hasPermission(AdminPermission.ADMIN_ACCESS),
      userEmail: session?.user?.email,
      adminEmailsConfig: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      isAdminByEmail
    });
    
    // 如果权限仍在加载中，等待加载完成
    if (status === "loading") {
      console.log("[EditPost] 权限加载中，等待...");
      return;
    }
    
    // 超级管理员邮箱直接允许访问
    if (isAdminByEmail) {
      console.log("[EditPost] 用户邮箱匹配超级管理员邮箱列表，允许访问");
      return; // 有权限，直接返回
    }
    
    // 如果是管理员或有编辑权限，则允许访问
    if (isAdmin() || hasPermission(AdminPermission.ADMIN_ACCESS)) {
      console.log("[EditPost] 用户有权限编辑帖子");
      return; // 有权限，直接返回
    }
    
    // 否则显示错误并重定向
    console.log("[EditPost] 用户无权编辑帖子，重定向");
    toast({
      title: "无权访问",
      description: "您没有编辑帖子的权限",
      variant: "destructive",
    });
    router.push("/admin/posts");
  }, [hasPermission, isAdmin, router, toast, session, status]);
  
  // 获取帖子数据
  useEffect(() => {
    if (!postId) return;
    
    async function fetchPost() {
      try {
        setLoading(true);
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          throw new Error(`获取帖子失败: ${res.status}`);
        }
        const data = await res.json();
        setPost(data);
        setTitle(data.title);
        setContent(data.content);
        setStatus(data.status);
        setTags(data.postTags.map((pt: PostTag) => pt.tag.name));
        console.log("[EditPost] 获取到帖子数据:", data);
      } catch (error) {
        console.error("[EditPost] 获取帖子数据失败:", error);
        toast({
          title: "获取失败",
          description: "无法获取帖子数据，请重试",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    // 获取所有标签
    async function fetchTags() {
      try {
        const response = await fetch("/api/tags");
        
        if (!response.ok) {
          throw new Error("获取标签失败");
        }
        
        const data = await response.json();
        setAllTags(data);
      } catch (error) {
        console.error("获取标签数据失败:", error);
      }
    }
    
    fetchPost();
    fetchTags();
  }, [postId, toast]);
  
  // 更新表单字段
  const updateFormField = (field: string, value: string | string[]) => {
    if (field === "title") {
      setTitle(value as string);
    } else if (field === "content") {
      setContent(value as string);
    } else if (field === "status") {
      setStatus(value as string);
    } else if (field === "tags") {
      setTags(value as string[]);
    }
  };
  
  // 添加标签
  const addTag = () => {
    if (!tagInput.trim()) return;
    
    // 如果标签已存在，则不重复添加
    if (tags.includes(tagInput.trim())) {
      setTagInput("");
      return;
    }
    
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };
  
  // 移除标签
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // 选择已有标签
  const selectExistingTag = (tagName: string) => {
    if (tags.includes(tagName)) return;
    
    setTags([...tags, tagName]);
  };
  
  // 保存帖子
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId) {
      console.error("[EditPost] 保存失败: 缺少帖子ID");
      toast({
        title: "保存失败",
        description: "无法确定帖子ID",
        variant: "destructive",
      });
      return;
    }

    // 表单验证
    if (!title.trim() || !content.trim() || !status) {
      toast({
        title: "表单不完整",
        description: "请填写所有必填字段",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // 为超级管理员添加自定义请求头
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // 检查是否为超级管理员
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
      const isAdminByEmail = adminEmails.includes(session?.user?.email || "");
      
      if (isAdminByEmail) {
        console.log("[EditPost] 使用超级管理员权限提交");
        // 使用类型断言处理自定义请求头
        (headers as Record<string, string>)["X-Admin-Override"] = "true";
      }

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title,
          content,
          status,
          tags,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          `保存失败 (${res.status}): ${errorData.error || res.statusText || "未知错误"}`
        );
      }

      toast({
        title: "保存成功",
        description: "帖子已更新",
      });
      
      // 更新成功后返回列表页
      router.push("/admin/posts");
    } catch (error) {
      console.error("[EditPost] 保存帖子时出错:", error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">加载中...</p>
        </div>
      </div>
    );
  }
  
  // 帖子不存在
  if (!post) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium">未找到帖子</h3>
        <p className="mt-2 text-muted-foreground">
          该帖子可能已被删除或不存在
        </p>
        <Button className="mt-4" onClick={() => router.push("/admin/posts")}>
          返回帖子列表
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">编辑帖子</h1>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/posts")}>
            取消
          </Button>
          <Button onClick={handleSavePost} disabled={loading}>
            {loading ? "保存中..." : "保存帖子"}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>帖子信息</CardTitle>
          <CardDescription>
            编辑帖子内容和设置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">帖子标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => updateFormField("title", e.target.value)}
              placeholder="输入帖子标题"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">帖子内容</Label>
            <Textarea
              id="content"
              rows={15}
              value={content}
              onChange={(e) => updateFormField("content", e.target.value)}
              placeholder="输入帖子内容"
              className="min-h-[200px] resize-y"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">帖子状态</Label>
            <Select
              value={status}
              onValueChange={(value) => updateFormField("status", value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <Label>标签</Label>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 my-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm flex items-center"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="添加标签"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                添加
              </Button>
            </div>
            
            {allTags.length > 0 && (
              <div className="mt-4">
                <Label className="mb-2 block">选择已有标签:</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags
                    .filter(tag => !tags.includes(tag.name))
                    .map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => selectExistingTag(tag.name)}
                        className="bg-muted hover:bg-muted/80 rounded-full px-3 py-1 text-sm"
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 