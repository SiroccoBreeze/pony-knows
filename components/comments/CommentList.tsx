import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image?: string;
  };
}

interface CommentListProps {
  postId: string;
}

export default function CommentList({ postId }: CommentListProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 获取评论列表
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error("获取评论失败");
      }
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error("获取评论失败:", error);
      toast({
        title: "错误",
        description: "获取评论失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 提交新评论
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast({
        title: "提示",
        description: "请先登录后再发表评论",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "提示",
        description: "请输入评论内容",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "发表评论失败");
      }

      const comment = await response.json();
      setComments([comment, ...comments]);
      setNewComment("");
      toast({
        title: "成功",
        description: "评论已发表",
      });
    } catch (error) {
      console.error("发表评论失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "发表评论失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newComment, postId, comments]);

  // 使用 useMemo 缓存评论列表渲染
  const commentList = useMemo(() => {
    if (isLoading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          加载评论中...
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          暂无评论，来发表第一条评论吧
        </div>
      );
    }

    return comments.map((comment) => (
      <div key={comment.id} className="flex space-x-4">
        <Avatar className="h-10 w-10 ring-1 ring-primary/10">
          <AvatarImage src={comment.author.image || ""} alt={comment.author.name} />
          <AvatarFallback className="bg-primary/5 text-primary text-sm font-medium">
            {comment.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </span>
            </div>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
      </div>
    ));
  }, [isLoading, comments]);

  return (
    <div className="space-y-6">
      {/* 评论输入框 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder={session ? "写下你的评论..." : "请登录后发表评论"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!session || isSubmitting}
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!session || isSubmitting}
          >
            {isSubmitting ? "发表中..." : "发表评论"}
          </Button>
        </div>
      </form>

      {/* 评论列表 */}
      <div className="space-y-4">
        {commentList}
      </div>
    </div>
  );
} 