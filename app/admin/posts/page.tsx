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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Eye, 
  FileEdit, 
  Trash, 
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AdminPermission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

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
  postTags?: { tag: { id: string; name: string } }[];
  views?: number;  // 浏览量
  _count?: {
    comments: number;  // 评论量
  };
}

interface Tag {
  id: string;
  name: string;
}

// 创建VisuallyHidden组件
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // 添加拒绝审核功能所需状态
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectingPost, setRejectingPost] = useState<Post | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const { hasPermission } = useAuthPermissions();
  const { toast } = useToast();
  
  // 获取帖子数据
  useEffect(() => {
    fetchPosts();
  }, [page, searchQuery, statusFilter, reviewStatusFilter]);
  
  async function fetchPosts() {
    try {
      setIsLoading(true);
      // 构建API URL，包含管理员标识
      let url = `/api/posts?page=${page}&limit=${limit}&search=${searchQuery}`;
      
      if (statusFilter && statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      } else {
        // 默认排除草稿状态的帖子
        url += "&status=published";
      }
      
      if (reviewStatusFilter && reviewStatusFilter !== "all") {
        url += `&reviewStatus=${reviewStatusFilter}`;
      }
      
      // 添加包含标签信息的参数
      url += "&includeTags=true";
      
      // 添加包含统计信息的参数
      url += "&includeStats=true";
      
      const response = await fetch(url, {
        headers: {
          "X-Admin-Request": "true"  // 管理员请求标识
        }
      });
      
      if (!response.ok) throw new Error("获取帖子列表失败");
      
      const data = await response.json();
      console.log("获取到的帖子数据:", data.posts[0]);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (error) {
      console.error("获取帖子数据失败:", error);
      toast({
        title: "错误",
        description: "获取帖子数据失败，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // 切换帖子选择状态
  function togglePostSelection(postId: string) {
    setSelectedPosts(prev => {
      if (prev.includes(postId)) {
        return prev.filter(id => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  }
  
  // 切换全选/取消全选
  function toggleSelectAll() {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map(post => post.id));
    }
  }
  
  // 批量删除帖子
  async function handleBatchDelete() {
    if (selectedPosts.length === 0) return;
    
    try {
      // 逐个调用删除API，因为没有批量删除的API端点
      const deletePromises = selectedPosts.map(id => 
        fetch(`/api/posts/${id}`, {
          method: "DELETE"
        })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter(res => !res.ok).length;
      
      if (failedDeletes > 0) {
        console.error(`${failedDeletes}个帖子删除失败`);
        toast({
          title: "部分操作失败",
          description: `${failedDeletes}个帖子删除失败`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "成功",
          description: "所选帖子已删除"
        });
      }
      
      // 刷新数据
      fetchPosts();
      setSelectedPosts([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("批量删除帖子失败:", error);
      toast({
        title: "错误",
        description: "批量删除帖子失败，请稍后再试",
        variant: "destructive"
      });
    }
  }
  
  // 删除单个帖子
  async function handleDeletePost(postId: string) {
    if (!confirm("确定要删除这篇帖子吗？此操作不可恢复。")) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Override": "true"
        }
      });
      
      if (!response.ok) throw new Error("删除帖子失败");
      
      toast({
        title: "成功",
        description: "帖子已删除"
      });
      
      // 刷新数据
      fetchPosts();
    } catch (error) {
      console.error("删除帖子失败:", error);
      toast({
        title: "错误",
        description: "删除帖子失败，请稍后再试",
        variant: "destructive"
      });
    }
  }
  
  // 审核通过帖子
  async function handleApprovePost(postId: string) {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Override": "true"
        },
        body: JSON.stringify({
          reviewStatus: 'approved'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "审核操作失败");
      }
      
      toast({
        title: "成功",
        description: "帖子已通过审核"
      });
      
      // 刷新数据
      fetchPosts();
    } catch (error) {
      console.error("审核帖子失败:", error);
      toast({
        title: "错误",
        description: "审核操作失败，请稍后再试",
        variant: "destructive"
      });
    }
  }
  
  // 打开拒绝审核对话框
  function openRejectDialog(post: Post) {
    setRejectingPost(post);
    setRejectReason("");
    setIsRejectDialogOpen(true);
  }
  
  // 拒绝帖子并发送通知
  async function handleRejectPost() {
    if (!rejectingPost) return;
    
    try {
      // 更新帖子状态为拒绝
      const updateResponse = await fetch(`/api/posts/${rejectingPost.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Override": "true"
        },
        body: JSON.stringify({
          reviewStatus: 'rejected'
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error("更新帖子状态失败");
      }
      
      // 创建系统通知
      const notificationResponse = await fetch(`/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: rejectingPost.author.id,
          type: "POST_REJECTED",
          title: "帖子审核未通过",
          content: `您的帖子"${rejectingPost.title}"未通过审核。原因: ${rejectReason || "不符合社区规范"}`,
          relatedId: rejectingPost.id,
          relatedType: "post"
        })
      });
      
      if (!notificationResponse.ok) {
        console.error("发送通知失败");
      }
      
      toast({
        title: "操作成功",
        description: "帖子已被拒绝，并已通知作者"
      });
      
      // 关闭对话框并刷新数据
      setIsRejectDialogOpen(false);
      setRejectingPost(null);
      setRejectReason("");
      fetchPosts();
    } catch (error) {
      console.error("拒绝帖子失败:", error);
      toast({
        title: "错误",
        description: "操作失败，请稍后再试",
        variant: "destructive"
      });
    }
  }
  
  // 格式化显示时间
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {selectedPosts.length > 0 && hasPermission(AdminPermission.ADMIN_ACCESS) && (
          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            删除所选 ({selectedPosts.length})
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>帖子列表</CardTitle>
          <CardDescription>
            管理论坛帖子内容
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  placeholder="搜索帖子标题..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>            
            <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="审核状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已审核</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
              </SelectContent>
            </Select>
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
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={posts.length > 0 && selectedPosts.length === posts.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>作者</TableHead>
                      <TableHead>审核状态</TableHead>
                      <TableHead>发布时间</TableHead>
                      <TableHead>浏览量</TableHead>
                      <TableHead>评论量</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                          没有找到符合条件的帖子
                        </TableCell>
                      </TableRow>
                    ) : (
                      posts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedPosts.includes(post.id)}
                              onCheckedChange={() => togglePostSelection(post.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {post.title}
                          </TableCell>
                          <TableCell>{post.author.name}</TableCell>
                          <TableCell>
                            {post.reviewStatus === "approved" && (
                              <Badge variant="default" className="bg-green-600">已审核</Badge>
                            )}
                            {post.reviewStatus === "pending" && (
                              <Badge variant="secondary" className="bg-amber-500 text-white">待审核</Badge>
                            )}
                            {post.reviewStatus === "rejected" && (
                              <Badge variant="destructive">已拒绝</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(post.createdAt)}</TableCell>
                          <TableCell>{post.views || 0}</TableCell>
                          <TableCell>{post._count?.comments || 0}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {post.reviewStatus === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprovePost(post.id)}
                                    className="h-8 w-8 p-0 text-green-600"
                                    title="通过审核"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="sr-only">通过审核</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openRejectDialog(post)}
                                    className="h-8 w-8 p-0 text-red-600"
                                    title="拒绝发布"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span className="sr-only">拒绝发布</span>
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0"
                                title="查看帖子"
                              >
                                <a href={`/forum/post/${post.id}`} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">查看</span>
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0"
                                title="编辑帖子"
                              >
                                <Link href={`/admin/posts/edit/${post.id}`}>
                                  <FileEdit className="h-4 w-4" />
                                  <span className="sr-only">编辑</span>
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePost(post.id)}
                                className="h-8 w-8 p-0"
                                title="删除帖子"
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
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除选中的 {selectedPosts.length} 个帖子吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBatchDelete}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝审核</DialogTitle>
            <DialogDescription>
              请输入拒绝帖子的原因，系统将通知作者
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <p className="mb-2 text-sm font-medium">拒绝原因</p>
              <Textarea
                placeholder="请输入拒绝原因，如：内容不符合社区规范..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
            >
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectPost}
            >
              <XCircle className="h-4 w-4 mr-2" />
              拒绝审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 