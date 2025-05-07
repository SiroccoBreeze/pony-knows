"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { VditorEditorRef } from "@/components/editor/VditorEditor";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Save,
  Plus,
  Check,
  X
} from "lucide-react";
import { useParams } from "next/navigation";

// 动态导入编辑器组件，避免SSR问题
const VditorEditor = dynamic(
  () => import("@/components/editor/VditorEditor").then((mod) => mod.default), 
  { ssr: false }
);

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  status: string;
  reviewStatus: string;
  author: {
    id: string;
    name: string;
  };
  postTags?: { tag: Tag }[];
}

interface Tag {
  id: string;
  name: string;
}

export default function EditPostPage() {
  // 使用 useParams 钩子获取路由参数
  const params = useParams();
  const id = params.id as string;
  
  const router = useRouter();
  const { toast } = useToast();
  const editorRef = useRef<VditorEditorRef>(null);
  
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editTitle, setEditTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  
  // 过滤标签
  const filteredTags = tagSearchQuery 
    ? availableTags.filter(tag => 
        tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) && 
        !selectedTags.some(t => t.id === tag.id)
      )
    : availableTags.filter(tag => !selectedTags.some(t => t.id === tag.id));
  
  // 加载帖子数据
  useEffect(() => {
    async function fetchPost() {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts/${id}`, {
          headers: {
            "X-Admin-Request": "true"
          }
        });
        
        if (!response.ok) {
          throw new Error("获取帖子失败");
        }
        
        const postData = await response.json();
        setPost(postData);
        setEditTitle(postData.title);
        
        // 设置标签
        if (postData.postTags && postData.postTags.length > 0) {
          const tags = postData.postTags.map((pt: { tag: Tag }) => pt.tag);
          setSelectedTags(tags);
        }
      } catch (error) {
        console.error("获取帖子数据失败:", error);
        toast({
          title: "错误",
          description: "无法加载帖子数据，请稍后再试",
          variant: "destructive"
        });
        router.push("/admin/posts");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPost();
  }, [id, toast, router]);
  
  // 获取所有标签
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data);
        }
      } catch (error) {
        console.error('获取标签失败:', error);
      }
    }
    
    fetchTags();
  }, []);
  
  // 处理标签选择
  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    } else {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    }
  };
  
  // 移除标签
  const handleTagRemove = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };
  
  // 保存帖子
  async function handleSavePost() {
    if (!post || !editorRef.current) return;
    
    try {
      setIsSaving(true);
      const content = editorRef.current.getValue();
      
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Override": "true"
        },
        body: JSON.stringify({
          title: editTitle,
          content: content,
          tags: selectedTags.map(tag => tag.name),
          status: post.status // 保持原状态不变
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "保存帖子失败");
      }
      
      toast({
        title: "成功",
        description: "帖子已更新"
      });
      
      // 返回列表页面
      router.push("/admin/posts");
    } catch (error) {
      console.error("保存帖子失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "保存失败，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <p className="text-lg font-medium">未找到帖子</p>
          <Button 
            className="mt-4" 
            variant="outline" 
            onClick={() => router.push("/admin/posts")}
          >
            返回列表
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card className="w-full h-[calc(100vh-120px)] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 flex-shrink-0 border-b">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 h-8 w-8"
              onClick={() => router.push("/admin/posts")}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">返回</span>
            </Button>
            <CardTitle className="text-lg sr-only">编辑帖子</CardTitle>
          </div>
          <Button 
            onClick={handleSavePost}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                保存中
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存
              </>
            )}
          </Button>
        </CardHeader>
        
        <CardContent className="pt-6 overflow-y-auto flex-grow">
          <div className="space-y-8 pb-10">
            {/* 标题输入 */}
            <div className="space-y-2">
              <Input
                id="post-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="帖子标题"
                className="text-lg py-6"
              />
            </div>
            
            {/* 标签选择 */}
            <div className="space-y-2">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        role="combobox"
                        aria-expanded={tagPopoverOpen}
                        className="h-8 w-8"
                        onClick={() => setTagPopoverOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command className="w-full">
                        <CommandInput 
                          placeholder="搜索标签..." 
                          className="h-9 border-none focus:ring-0"
                          value={tagSearchQuery}
                          onValueChange={setTagSearchQuery}
                        />
                        <CommandEmpty className="py-6 text-center text-sm">
                          未找到相关标签
                        </CommandEmpty>
                        <ScrollArea className="h-[200px]">
                          <CommandGroup>
                            {filteredTags.map((tag) => {
                              const isSelected = selectedTags.some(t => t.id === tag.id);
                              return (
                                <CommandItem
                                  key={tag.id}
                                  value={tag.name}
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
                          className="flex items-center gap-1 px-2 py-1 text-sm bg-primary/10 hover:bg-primary/20 transition-colors border-none"
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
            </div>
            
            {/* 内容编辑器 */}
            <div className="space-y-2">
              <div className="border rounded-md">
                <VditorEditor
                  ref={editorRef}
                  initialValue={post.content}
                  height={480}
                  postId={post.id}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 