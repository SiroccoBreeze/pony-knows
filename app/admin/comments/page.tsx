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
import { 
  Search, 
  Eye, 
  Trash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Permission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
  post: {
    id: string;
    title: string;
  };
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);

  const { toast } = useToast();
  const { hasPermission } = useAuthPermissions();

  // 获取评论数据
  useEffect(() => {
    fetchComments();
  }, [page, searchQuery]);

  async function fetchComments() {
    try {
      setIsLoading(true);
      // 实际项目中请替换为正确的API路径
      const response = await fetch(`/api/comments?page=${page}&limit=${limit}&search=${searchQuery}`);
      
      if (!response.ok) throw new Error("获取评论列表失败");
      
      const data = await response.json();
      setComments(data.comments || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("获取评论数据失败:", error);
      toast({
        title: "错误",
        description: "获取评论数据失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 打开删除确认对话框
  function handleOpenDeleteDialog(commentId: string) {
    setSelectedComment(commentId);
    setIsDeleteDialogOpen(true);
  }

  // 删除评论
  async function handleDeleteComment() {
    if (!selectedComment) return;
    
    try {
      // 实际项目中请替换为正确的API路径
      const response = await fetch(`/api/comments/${selectedComment}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("删除评论失败");
      
      fetchComments();
      setIsDeleteDialogOpen(false);
      
      toast({
        title: "成功",
        description: "评论已删除",
      });
    } catch (error) {
      console.error("删除评论失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除评论失败，请稍后再试",
        variant: "destructive",
      });
    }
  }

  // 格式化时间
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // 截断内容
  function truncateContent(content: string, maxLength = 100) {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">评论管理</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>评论列表</CardTitle>
          <CardDescription>
            管理帖子评论
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索评论内容..."
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
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>内容</TableHead>
                      <TableHead>所属帖子</TableHead>
                      <TableHead>评论者</TableHead>
                      <TableHead>评论时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          没有找到评论
                        </TableCell>
                      </TableRow>
                    ) : (
                      comments.map((comment) => (
                        <TableRow key={comment.id}>
                          <TableCell className="max-w-xs">
                            {truncateContent(comment.content)}
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`/forum/post/${comment.post.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline text-primary"
                            >
                              {truncateContent(comment.post.title, 30)}
                            </a>
                          </TableCell>
                          <TableCell>{comment.author.name}</TableCell>
                          <TableCell>{formatDate(comment.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <a href={`/forum/post/${comment.post.id}`} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">查看</span>
                                </a>
                              </Button>
                              {hasPermission(Permission.DELETE_COMMENT) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDeleteDialog(comment.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                  <span className="sr-only">删除</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  显示 {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} 条，共 {total} 条
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除这条评论吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteComment}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 