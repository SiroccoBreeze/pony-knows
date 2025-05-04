"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminPermission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";

interface Tag {
  id: string;
  name: string;
  _count: {
    postTags: number;
  };
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
  });

  const { toast } = useToast();
  const { hasAdminPermission } = useAuthPermissions();

  // 获取标签数据
  useEffect(() => {
    fetchTags();
  }, [searchQuery]);

  async function fetchTags() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tags?search=${searchQuery}`);
      
      if (!response.ok) throw new Error("获取标签列表失败");
      
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error("获取标签数据失败:", error);
      toast({
        title: "错误",
        description: "获取标签数据失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 打开添加标签对话框
  function handleAddTag() {
    setFormData({
      id: "",
      name: "",
    });
    setIsEditMode(false);
    setIsDialogOpen(true);
  }

  // 打开编辑标签对话框
  function handleEditTag(tag: Tag) {
    setFormData({
      id: tag.id,
      name: tag.name,
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  }

  // 保存标签
  async function handleSaveTag() {
    try {
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch("/api/tags", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存标签失败");
      }
      
      setIsDialogOpen(false);
      fetchTags();
      
      toast({
        title: "成功",
        description: isEditMode ? "标签已更新" : "标签已创建",
      });
    } catch (error) {
      console.error("保存标签失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "保存标签失败，请稍后再试",
        variant: "destructive",
      });
    }
  }

  // 删除标签
  async function handleDeleteTag(tagId: string) {
    if (!confirm("确定要删除这个标签吗？此操作不可恢复。")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tags?id=${tagId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除标签失败");
      }
      
      fetchTags();
      
      toast({
        title: "成功",
        description: "标签已删除",
      });
    } catch (error) {
      console.error("删除标签失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除标签失败，请稍后再试",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">标签管理</h1>
        
        {hasAdminPermission(AdminPermission.ADMIN_ACCESS) && (
          <Button onClick={handleAddTag}>
            <Plus className="mr-2 h-4 w-4" />
            添加标签
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>标签列表</CardTitle>
          <CardDescription>
            管理帖子标签
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索标签名称..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标签名称</TableHead>
                    <TableHead>使用次数</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        没有找到标签
                      </TableCell>
                    </TableRow>
                  ) : (
                    tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-medium">
                          {tag.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tag._count.postTags} 篇帖子
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTag(tag)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">编辑</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTag(tag.id)}
                              disabled={tag._count.postTags > 0}
                              title={tag._count.postTags > 0 ? "标签正在使用中，无法删除" : "删除标签"}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">删除</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 标签编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "编辑标签" : "添加标签"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "修改标签信息" 
                : "创建一个新的标签"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">标签名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入标签名称"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTag}>
              {isEditMode ? "保存修改" : "创建标签"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 