"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  BellRing,
  User,
  CheckCircle,
  Trash2,
  Bell,
  Reply,
  ExternalLink,
  MailCheck,
  Loader2,
  MoreHorizontal,
  CheckCheck,
  Link as LinkIcon
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

type MessageType = "reply" | "system";

// 消息接口
interface Message {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  type: MessageType;
  link?: string;
  sender?: string;
  postId?: string;
}

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // 未读消息计数
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);
  const [unreadSystemCount, setUnreadSystemCount] = useState(0);
  
  const { toast } = useToast();
  
  // 如果未登录，重定向到登录页面
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/user/messages");
    }
  }, [status, router]);
  
  const replyMessages = messages.filter(msg => msg.type === "reply");
  const systemMessages = messages.filter(msg => msg.type === "system");
  
  // 加载消息数据
  const loadMessages = async (type: string | null = null, page = 1) => {
    // 如果未登录或正在加载会话，不要加载消息
    if (status !== "authenticated") {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 构建API URL
      const url = type 
        ? `/api/user/messages?type=${type}&page=${page}&limit=${pagination.limit}`
        : `/api/user/messages?page=${page}&limit=${pagination.limit}`;
        
      const response = await axios.get(url);
      
      // 设置消息数据
      setMessages(response.data.messages);
      
      // 设置分页信息
      setPagination({
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        totalPages: response.data.totalPages
      });
      
      // 设置未读消息计数
      setUnreadCount(response.data.unreadCount);
      setUnreadReplyCount(response.data.unreadReplyCount);
      setUnreadSystemCount(response.data.unreadSystemCount);
    } catch (err: any) {
      // 如果是401错误，不显示错误消息
      if (err?.response?.status === 401) {
        return;
      }
      
      console.error("加载消息失败:", err);
      setError("加载消息失败，请稍后重试");
      
      toast({
        title: "错误",
        description: "加载消息失败，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载消息
  useEffect(() => {
    // 只有当用户已登录时才加载消息
    if (status === "authenticated") {
      loadMessages();
      
      // 定时刷新消息状态，确保计数准确
      const refreshInterval = setInterval(() => {
        if (status === "authenticated") {
          loadMessages(activeTab === "all" ? null : activeTab, pagination.page);
        }
      }, 30000); // 每30秒刷新一次
      
      // 添加事件监听器以响应来自其他页面的消息更新
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'messages-updated' && status === "authenticated") {
          loadMessages(activeTab === "all" ? null : activeTab, pagination.page);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        clearInterval(refreshInterval);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [activeTab, pagination.page, status]);
  
  // 如果会话正在加载或未认证，显示加载状态
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">消息中心</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto mb-3 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <p className="text-muted-foreground">
              {status === "loading" ? "加载中..." : "正在重定向到登录页面..."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // 标记消息为已读
  const markAsRead = async (id: string) => {
    try {
      await axios.patch('/api/user/messages', { messageId: id });
      
      // 更新本地状态
      setMessages(messages.map(msg => 
        msg.id === id ? { ...msg, read: true } : msg
      ));
      
      // 更新未读计数
      const updatedMessage = messages.find(msg => msg.id === id);
      if (updatedMessage && !updatedMessage.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        if (updatedMessage.type === "reply") {
          setUnreadReplyCount(prev => Math.max(0, prev - 1));
        } else if (updatedMessage.type === "system") {
          setUnreadSystemCount(prev => Math.max(0, prev - 1));
        }
        
        // 通知其他组件消息状态已更新
        localStorage.setItem('messages-updated', Date.now().toString());
      }
    } catch (err) {
      console.error("标记消息已读失败:", err);
      toast({
        title: "错误",
        description: "标记消息已读失败，请稍后重试",
        variant: "destructive"
      });
    }
  };
  
  // 标记所有消息为已读
  const markAllAsRead = async () => {
    try {
      await axios.patch('/api/user/messages', { readAll: true });
      
      // 更新本地状态
      setMessages(messages.map(msg => ({ ...msg, read: true })));
      
      // 更新未读计数
      setUnreadCount(0);
      setUnreadReplyCount(0);
      setUnreadSystemCount(0);
      
      // 通知其他组件消息状态已更新
      localStorage.setItem('messages-updated', Date.now().toString());
      
      toast({
        title: "成功",
        description: "所有消息已标记为已读"
      });
    } catch (err) {
      console.error("标记所有消息已读失败:", err);
      toast({
        title: "错误",
        description: "操作失败，请稍后重试",
        variant: "destructive"
      });
    }
  };
  
  // 删除消息
  const deleteMessage = async (id: string) => {
    try {
      await axios.delete(`/api/user/messages?id=${id}`);
      
      // 更新本地状态
      const deletedMessage = messages.find(msg => msg.id === id);
      setMessages(messages.filter(msg => msg.id !== id));
      
      // 更新未读计数（如果删除的是未读消息）
      if (deletedMessage && !deletedMessage.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        if (deletedMessage.type === "reply") {
          setUnreadReplyCount(prev => Math.max(0, prev - 1));
        } else if (deletedMessage.type === "system") {
          setUnreadSystemCount(prev => Math.max(0, prev - 1));
        }
        
        // 通知其他组件消息状态已更新
        localStorage.setItem('messages-updated', Date.now().toString());
      }
      
      toast({
        title: "成功",
        description: "消息已删除"
      });
    } catch (err) {
      console.error("删除消息失败:", err);
      toast({
        title: "错误",
        description: "删除消息失败，请稍后重试",
        variant: "destructive"
      });
    }
  };
  
  // 回复帖子
  const replyToPost = (postId: string, sender: string) => {
    // 实际应用中跳转到对应帖子的回复页面
    window.location.href = `/forum/post/${postId}?reply=true&to=${sender}`;
  };
  
  // 处理标签切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // 根据标签加载对应消息
    let type: string | null = null;
    
    if (value === "reply") {
      type = "reply";
    } else if (value === "system") {
      type = "system";
    }
    
    loadMessages(type);
  };
  
  // 根据消息类型返回对应图标
  const getMessageIcon = (type: MessageType) => {
    switch(type) {
      case "reply": return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "system": return <MessageSquare className="h-5 w-5 text-amber-500" />;
      default: return <MessageSquare className="h-5 w-5" />;
    }
  };
  
  // 加载状态显示
  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">加载消息中...</span>
      </div>
    );
  }
  
  // 错误状态显示
  if (error && messages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button 
          onClick={() => loadMessages()} 
          variant="outline" 
          className="mt-4"
        >
          重试
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">消息中心</h1>
          <p className="text-sm text-muted-foreground">
            您有 {unreadCount} 条未读消息
          </p>
        </div>
        <Button 
          onClick={markAllAsRead} 
          variant="outline" 
          size="sm"
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          全部标为已读
        </Button>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="all" className="relative">
            全部消息
            {unreadCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reply" className="relative">
            帖子回复
            {unreadReplyCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {unreadReplyCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="relative">
            系统通知
            {unreadSystemCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {unreadSystemCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4 mt-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无消息</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    <div 
                      className={`flex p-4 ${!message.read ? 'bg-muted/50' : ''} cursor-pointer`}
                      onClick={() => markAsRead(message.id)}
                    >
                      <div className="mr-4 mt-1">{getMessageIcon(message.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className={`${!message.read ? 'font-semibold' : ''} truncate`}>
                            {message.title}
                          </div>
                          <div className="flex items-center ml-2 shrink-0">
                            <span className="text-xs text-muted-foreground mr-2">{message.time}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => markAsRead(message.id)}>
                                  <CheckCheck className="h-4 w-4 mr-2" />
                                  <span>标为已读</span>
                                </DropdownMenuItem>
                                {message.type === "reply" && message.sender && message.postId && (
                                  <DropdownMenuItem onClick={() => replyToPost(message.postId!, message.sender!)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    <span>回复消息</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => deleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  <span>删除消息</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {message.content}
                        </p>
                        {message.link && (
                          <div className="mt-2">
                            <Link 
                              href={message.link} 
                              className="text-xs text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(message.id);
                              }}
                            >
                              查看详情
                            </Link>
                            {message.type === "reply" && message.sender && message.postId && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-xs ml-2" 
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  replyToPost(message.postId!, message.sender!);
                                }}
                              >
                                回复
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {index < messages.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* 分页按钮 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => loadMessages(activeTab === "all" ? null : activeTab, pagination.page - 1)}
              >
                上一页
              </Button>
              <span className="py-2 px-3 text-sm">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => loadMessages(activeTab === "all" ? null : activeTab, pagination.page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="reply" className="space-y-4 mt-6">
          {replyMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无帖子回复</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {replyMessages.map((message, index) => (
                  <div key={message.id}>
                    <div 
                      className={`flex p-4 ${!message.read ? 'bg-muted/50' : ''} cursor-pointer`}
                      onClick={() => markAsRead(message.id)}
                    >
                      <div className="mr-4 mt-1">{getMessageIcon(message.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className={`${!message.read ? 'font-semibold' : ''} truncate`}>
                            {message.title}
                          </div>
                          <div className="flex items-center ml-2 shrink-0">
                            <span className="text-xs text-muted-foreground mr-2">{message.time}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => markAsRead(message.id)}>
                                  <CheckCheck className="h-4 w-4 mr-2" />
                                  <span>标为已读</span>
                                </DropdownMenuItem>
                                {message.sender && message.postId && (
                                  <DropdownMenuItem onClick={() => replyToPost(message.postId!, message.sender!)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    <span>回复消息</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => deleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  <span>删除消息</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {message.content}
                        </p>
                        {message.link && (
                          <div className="mt-2 flex items-center">
                            <Link 
                              href={message.link} 
                              className="text-xs text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(message.id);
                              }}
                            >
                              查看详情
                            </Link>
                            {message.sender && message.postId && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-xs ml-2" 
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  replyToPost(message.postId!, message.sender!);
                                }}
                              >
                                回复
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {index < replyMessages.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4 mt-6">
          {systemMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无系统通知</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {systemMessages.map((message, index) => (
                  <div key={message.id}>
                    <div 
                      className={`flex p-4 ${!message.read ? 'bg-muted/50' : ''} cursor-pointer`}
                      onClick={() => markAsRead(message.id)}
                    >
                      <div className="mr-4 mt-1">{getMessageIcon(message.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className={`${!message.read ? 'font-semibold' : ''} truncate`}>
                            {message.title}
                          </div>
                          <div className="flex items-center ml-2 shrink-0">
                            <span className="text-xs text-muted-foreground mr-2">{message.time}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => markAsRead(message.id)}>
                                  <CheckCheck className="h-4 w-4 mr-2" />
                                  <span>标为已读</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteMessage(message.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  <span>删除消息</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {message.content}
                        </p>
                      </div>
                    </div>
                    {index < systemMessages.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 