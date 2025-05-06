"use client";

import { useEffect, useState, useRef } from "react";
import { RestrictedRoute } from "@/components/restricted-route";
import { UserPermission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, Plus, Check, X, Save, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import VditorEditor, { VditorEditorRef } from '@/components/editor/VditorEditor';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ToastAction } from "@/components/ui/toast";

// 标签接口
interface Tag {
  id: string;
  name: string;
}

export default function NewPostPage() {
  const { refreshPermissions, isLoading, hasPermission } = useAuthPermissions();
  const { toast } = useToast();
  const router = useRouter();
  const editorRef = useRef<VditorEditorRef>(null);

  // 状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [permissionVerified, setPermissionVerified] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // 页面加载时刷新权限
  useEffect(() => {
    const refreshUserPermissions = async () => {
      try {
        await refreshPermissions();
        setPermissionVerified(true);
      } catch (error) {
        console.error("刷新权限失败:", error);
        toast({
          title: "权限刷新失败",
          description: "请刷新页面重试",
          variant: "destructive",
        });
      }
    };

    refreshUserPermissions();
  }, [refreshPermissions, toast]);

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

  // 处理内容变化
  const handleContentChange = (value: string) => {
    setContent(value);
  };

  // 处理标签选择
  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    } else {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    }
  };

  // 处理标签移除
  const handleTagRemove = (tagId: string) => {
    setSelectedTags(selectedTags.filter(tag => tag.id !== tagId));
  };

  // 检查表单是否有效
  const validateForm = () => {
    if (!title.trim()) {
      toast({
        title: "错误",
        description: "请输入标题",
        variant: "destructive"
      });
      return false;
    }

    // 获取编辑器内容
    const editorContent = editorRef.current?.getValue() || "";
    if (!editorContent.trim()) {
      toast({
        title: "提示",
        description: "请输入帖子内容",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return false;
    }

    return true;
  };

  // 保存草稿
  const saveDraft = async () => {
    if (!validateForm()) return;

    submitPost('draft');
  };

  // 发布帖子
  const publishPost = async () => {
    if (!validateForm()) return;

    submitPost('published');
  };

  // 提交表单
  const submitPost = async (status: 'draft' | 'published') => {
    setIsSaving(true);

    try {
      // 获取编辑器内容
      const editorContent = editorRef.current?.getValue() || "";

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content: editorContent,
          status: status,
          // 注意：这里使用标签名称而不是ID
          tags: selectedTags.map(tag => tag.name),
        }),
      });

      if (!response.ok) {
        throw new Error(status === 'draft' ? "保存草稿失败" : "发布失败");
      }

      const data = await response.json();

      toast({
        title: "成功",
        description: status === 'draft' 
          ? `《${title}》已保存为草稿` 
          : `《${title}》已发布${data.reviewStatus === 'pending' ? '，等待审核' : ''}`,
      });

      // 根据状态跳转到不同页面
      router.push(status === 'draft' ? "/user/posts?tab=draft" : "/forum");
    } catch (error) {
      console.error("操作失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "操作失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 表单提交处理器（已不使用，通过上面的 saveDraft 和 publishPost 替代）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    publishPost();
  };

  return (
    <RestrictedRoute
      permission={UserPermission.CREATE_TOPIC}
      redirectTo="/forum"
      loadingMessage="验证发帖权限中..."
    >
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" onClick={() => router.push("/forum")} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回论坛
          </Button>
          <h1 className="text-2xl font-bold">发布新帖</h1>
        </div>

        {!permissionVerified || isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">权限验证中...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">标题</Label>
                  <Input
                    id="title"
                    placeholder="请输入标题"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base">标签</Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-base">内容</Label>
                  <div className="border rounded-md">
                    <VditorEditor
                      ref={editorRef}
                      height={500}
                      placeholder="请输入内容..."
                      onChange={handleContentChange}
                      initialValue=""
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push("/forum")}
                >
                  取消
                </Button>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={saveDraft}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {isSaving ? "保存中..." : "保存草稿"}
                  </Button>
                  <Button 
                    type="button" 
                    disabled={isSaving}
                    onClick={publishPost}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Rocket className="mr-1 h-4 w-4" />
                    发布帖子
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </RestrictedRoute>
  );
}
