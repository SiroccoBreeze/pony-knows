import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Reply } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image?: string;
  };
  parentId?: string;
  replies?: Comment[];
  replyToUserId?: string;
  replyToUserName?: string;
}

interface CommentListProps {
  postId: string;
}

export default function CommentList({ postId }: CommentListProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyToUser, setReplyToUser] = useState<{id: string, name: string} | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // 获取评论列表
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error("获取评论失败");
      }
      const data = await response.json();
      
      // 更新为新的API响应格式
      setComments(data.comments || []);
      setTotalCount(data.totalCount || 0);
      
      // 不再需要树形结构转换，因为API已经返回了正确的格式
      
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

  // 提交回复
  const handleReplySubmit = useCallback(async (parentId: string, replyToUserId?: string, replyToUserName?: string) => {
    if (!session) {
      toast({
        title: "提示",
        description: "请先登录后再发表回复",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return;
    }

    const trimmedContent = replyContent.trim();
    if (!trimmedContent) {
      toast({
        title: "提示",
        description: "请输入回复内容",
        variant: "default",
        action: <ToastAction altText="close">关闭</ToastAction>,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 从内容中移除可能存在的@用户名前缀
      const finalContent = trimmedContent;
      const actualReplyToUserId = replyToUserId;
      const actualReplyToUserName = replyToUserName;
      
      // 不再从内容中提取@用户名，直接使用传入的replyToUserId和replyToUserName
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: finalContent,
          parentId: parentId,
          replyToUserId: actualReplyToUserId,
          replyToUserName: actualReplyToUserName
        }),
      });

      // 尝试解析响应JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("解析响应失败:", parseError);
        throw new Error("服务器响应解析失败，请重试");
      }

      if (!response.ok) {
        throw new Error(data?.error || `发表回复失败 (${response.status})`);
      }

      // 更新评论列表 - 通过深度遍历查找并更新父评论
      const updateReplies = (commentsList: Comment[]): Comment[] => {
        return commentsList.map(comment => {
          // 如果当前评论是父评论，添加新回复
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), data]
            };
          } 
          // 如果当前评论有子回复，递归检查
          else if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateReplies(comment.replies)
            };
          }
          // 不需要更新的评论直接返回
          return comment;
        });
      };
      
      // 尝试更新本地评论列表
      setComments(updateReplies(comments));
      
      // 延迟一小段时间后重新获取最新评论列表，确保服务器有足够时间处理
      setTimeout(() => {
        fetchComments();
      }, 300);
      
      setReplyContent("");
      setReplyingTo(null);
      setReplyToUser(null);
      toast({
        title: "成功",
        description: "回复已发表",
      });
    } catch (error) {
      console.error("发表回复失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "发表回复失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [session, replyContent, postId, comments, fetchComments]);

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

      // 尝试解析响应JSON
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("解析响应失败:", parseError);
        throw new Error("服务器响应解析失败，请重试");
      }
      
      if (!response.ok) {
        throw new Error(data?.error || `发表评论失败 (${response.status})`);
      }

      // 尝试更新本地评论列表
      setComments([data, ...comments]);
      
      // 延迟一小段时间后重新获取最新评论列表，确保服务器有足够时间处理
      setTimeout(() => {
        fetchComments();
      }, 300);
      
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
  }, [session, newComment, postId, comments, fetchComments]);

  // 切换回复展开/折叠状态
  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  }, []);

  // 渲染单个评论
  const renderComment = (comment: Comment) => (
    <div key={comment.id} className="group py-3 border-b border-border/30 last:border-0">
      <div className="flex space-x-3">
        {/* 用户头像 */}
        <Avatar className="h-8 w-8 ring-1 ring-primary/10 flex-shrink-0">
          <AvatarImage src={comment.author.image || ""} alt={comment.author.name} />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
            {comment.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* 评论内容区 */}
        <div className="flex-1 min-w-0">
          {/* 作者信息和时间 */}
          <div className="flex items-center flex-wrap gap-x-2 mb-0.5">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
          
          {/* 评论内容 */}
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {comment.content}
          </p>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mt-1.5">
            {/* 点赞按钮 - 仅做示例，可以添加实际功能 */}
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground group-hover:opacity-100 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H17.4262C18.4175 22 19.3153 21.3945 19.6457 20.4553L21.9367 13.4553C22.3681 12.1241 21.3806 10.7506 19.9923 10.7506H15.7135C15.1261 10.7506 14.6498 10.3184 14.5733 9.73592L14.0384 5.80336C13.9219 4.91616 13.1909 4.2259 12.2982 4.21738C11.5079 4.20995 10.8255 4.86484 10.7778 5.65372L10.5675 9.3799C10.5291 10.0309 10.1575 10.6162 9.57947 10.9066L7 12.5001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              赞
            </button>
            
            {/* 回复按钮 */}
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground group-hover:opacity-100 transition-colors"
              onClick={() => {
                if (replyingTo === comment.id) {
                  setReplyingTo(null);
                  setReplyToUser(null);
                } else {
                  setReplyingTo(comment.id);
                  setReplyToUser({id: comment.author.id, name: comment.author.name});
                }
                setReplyContent("");
              }}
            >
              <Reply className="h-3.5 w-3.5" />
              回复
            </button>
          </div>
        </div>
      </div>

      {/* 回复输入框 */}
      {replyingTo === comment.id && (
        <div className="pl-11 mt-3">
          <div className="flex gap-3">
            {session && (
              <Avatar className="h-8 w-8 ring-1 ring-primary/10 flex-shrink-0 mt-1">
                <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                  {session.user?.name?.slice(0, 2).toUpperCase() || ""}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder={`回复 ${replyToUser ? replyToUser.name : comment.author.name}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={!session || isSubmitting}
                className="min-h-[70px] text-sm resize-none"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (replyToUser) {
                      handleReplySubmit(comment.id, replyToUser.id, replyToUser.name);
                    } else {
                      handleReplySubmit(comment.id, comment.author.id, comment.author.name);
                    }
                  }}
                  disabled={!session || isSubmitting}
                >
                  {isSubmitting ? "发表中..." : "回复"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-11 mt-3">
          {/* 回复数量和展开/折叠按钮 */}
          <button
            onClick={() => toggleReplies(comment.id)}
            className="text-xs text-primary hover:text-primary/80 mb-2 flex items-center"
          >
            {expandedReplies[comment.id] ? (
              <>
                <span>收起{comment.replies.length}条回复</span>
                <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            ) : (
              <>
                <span>查看{comment.replies.length}条回复</span>
                <svg className="w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
          
          {/* 展开时显示回复内容 */}
          {expandedReplies[comment.id] && (
            <div className="space-y-2 border-l-[1px] border-border/20">
              {comment.replies.map(reply => (
                <div key={reply.id} className="pt-3 pl-3">
                  <div className="flex space-x-3">
                    {/* 回复用户头像 */}
                    <Avatar className="h-6 w-6 ring-1 ring-primary/10 flex-shrink-0">
                      <AvatarImage src={reply.author.image || ""} alt={reply.author.name} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                        {reply.author.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* 回复内容区 */}
                    <div className="flex-1 min-w-0">
                      {/* 作者信息和时间 */}
                      <div className="flex items-center flex-wrap gap-x-2 mb-0.5">
                        <span className="font-medium text-sm">{reply.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.createdAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                      </div>
                      
                      {/* 回复内容 - 添加@用户名 */}
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                        {reply.replyToUserName && (
                          <span className="text-primary font-medium">@{reply.replyToUserName} </span>
                        )}
                        {reply.content}
                      </p>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-3 mt-1.5">
                        {/* 点赞按钮 */}
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H17.4262C18.4175 22 19.3153 21.3945 19.6457 20.4553L21.9367 13.4553C22.3681 12.1241 21.3806 10.7506 19.9923 10.7506H15.7135C15.1261 10.7506 14.6498 10.3184 14.5733 9.73592L14.0384 5.80336C13.9219 4.91616 13.1909 4.2259 12.2982 4.21738C11.5079 4.20995 10.8255 4.86484 10.7778 5.65372L10.5675 9.3799C10.5291 10.0309 10.1575 10.6162 9.57947 10.9066L7 12.5001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          赞
                        </button>
                        
                        {/* 对回复的回复按钮 */}
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setReplyingTo(comment.id);
                            setReplyToUser({id: reply.author.id, name: reply.author.name});
                            setReplyContent("");
                          }}
                        >
                          <Reply className="h-3.5 w-3.5" />
                          回复
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 评论输入框 */}
      <form onSubmit={handleSubmit} className="flex space-x-3 mb-6">
        {session ? (
          <Avatar className="h-8 w-8 ring-1 ring-primary/10 flex-shrink-0 mt-1">
            <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
              {session.user?.name?.slice(0, 2).toUpperCase() || ""}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 mt-1"></div>
        )}
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder={session ? "写下你的评论..." : "请登录后发表评论"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!session || isSubmitting}
            className="min-h-[70px] text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!session || isSubmitting}
              className="px-4"
            >
              {isSubmitting ? "发表中..." : "发表评论"}
            </Button>
          </div>
        </div>
      </form>

      {/* 分割线 */}
      <div className="relative pb-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-sm text-muted-foreground">评论 ({totalCount})</span>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-0 divide-y divide-border/10">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            加载评论中...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无评论，来发表第一条评论吧
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
} 