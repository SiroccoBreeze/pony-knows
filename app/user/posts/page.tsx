"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Pagination } from "@/components/ui/pagination";

// 定义帖子类型
interface Post {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  postTags: {
    tag: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    comments: number;
  };
}

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState("published");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage, setPostsPerPage] = useState(10);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const { data: session, status, update: updateSession } = useSession() as { data: ExtendedSession | null; status: string; update: () => Promise<ExtendedSession | null> };
  const router = useRouter();

  // 从URL获取tab参数和页码
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    const page = searchParams.get('page');
    
    if (tab && ['published', 'draft', 'all'].includes(tab)) {
      setActiveTab(tab);
    }
    if (page) {
      setCurrentPage(parseInt(page));
    }
  }, []);

  // 首次加载时手动更新session
  useEffect(() => {
    const refreshSession = async () => {
      try {
        if (status === "loading") return;
        
        console.log("手动获取session...");
        // 直接从服务器获取session，绕过缓存
        const freshSession = await fetch('/api/auth/session');
        const sessionData = await freshSession.json();
        console.log("手动获取的session数据:", sessionData);
        
        if (sessionData.user && status !== "authenticated") {
          // 如果服务器返回了用户信息，但客户端session不存在，则更新session
          console.log("服务器已认证用户，正在更新本地session状态");
          await updateSession();
        }
        
        setIsSessionChecked(true);
      } catch (error) {
        console.error("刷新session失败:", error);
        setIsSessionChecked(true);
      }
    };

    refreshSession();
  }, [status, updateSession]);

  // 获取帖子数据
  const fetchPosts = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const userId = session.user.id;
      console.log("准备获取用户帖子，用户ID:", userId);
      
      // 根据activeTab设置status参数
      const status = activeTab === 'all' ? '' : activeTab;
      const response = await fetch(`/api/posts?authorId=${userId}&status=${status}&page=${currentPage}&limit=${postsPerPage}`);
      console.log("API响应状态:", response.status);
      
      if (!response.ok) {
        throw new Error('获取帖子列表失败');
      }
      
      const data = await response.json();
      console.log(`获取到 ${data.posts.length} 篇帖子`);
      setPosts(data.posts);
      setTotalPosts(data.total);
    } catch (error) {
      console.error('获取帖子列表失败:', error);
      toast.error('获取帖子列表失败，请稍后再试');
      setPosts([]);
      setTotalPosts(0);
    } finally {
      setLoading(false);
    }
  }, [session, activeTab, currentPage, postsPerPage]);

  // 只有在session已检查且已认证时才获取帖子数据
  useEffect(() => {
    if (!isSessionChecked) return;
    
    if (status === "loading") {
      console.log("Session加载中...");
      return;
    }

    console.log("Session状态:", status, "用户ID:", session?.user?.id, "完整Session:", session);

    // 只有在明确未认证时才重定向
    if (status === "unauthenticated") {
      console.log("未认证，重定向到登录页");
      router.replace("/auth/login");
      return;
    }

    // 如果session已加载但用户ID不存在，记录问题但不重定向
    if (!session?.user?.id) {
      console.log("用户ID不存在，但session状态为:", status);
      setLoading(false);
      return;
    }

    // 如果session和用户ID都存在，获取帖子
    console.log("用户已认证，开始加载帖子");
    fetchPosts();
  }, [status, isSessionChecked, session, router, fetchPosts]);

  // 处理标签变化
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // 切换标签时重置页码
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tab', tab);
    searchParams.set('page', '1');
    router.push(`/user/posts?${searchParams.toString()}`);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  // 删除帖子
  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这篇帖子吗？此操作无法撤销。")) {
      try {
        const response = await fetch(`/api/posts/${id}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          throw new Error("删除帖子失败");
        }
        
        setPosts(posts.filter(post => post.id !== id));
      } catch (error) {
        console.error("删除帖子失败:", error);
        alert("删除帖子失败，请稍后重试");
      }
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPostsPerPage(pageSize);
    setCurrentPage(1);
  };

  // 如果正在加载session或帖子数据，显示加载状态
  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">加载中...</h1>
          <p className="text-muted-foreground">正在获取帖子数据</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">帖子管理</h1>
        <Button>
          <Link href="/forum/new" className="flex items-center gap-2">
            发布新帖子
          </Link>
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="published">已发布</TabsTrigger>
          <TabsTrigger value="draft">草稿</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无{activeTab === "published" ? "已发布" : activeTab === "draft" ? "草稿" : ""}帖子</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <Card key={post.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                        <CardDescription className="mt-1">
                          发布于 {formatDate(post.createdAt)}
                        </CardDescription>
                      </div>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>
                        {post.status === "published" ? "已发布" : "草稿"}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.content.substring(0, 200)}...
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.postTags.map(({ tag }) => (
                        <Badge key={tag.id} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    
                    {post.status === "published" && (
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{post._count?.comments || 0} 评论</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/forum/edit/${post.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        编辑
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/forum/post/${post.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Link>
                    </Button>
                    <Button variant="default" size="sm" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* 分页控件 */}
          <Pagination
            current={currentPage}
            total={totalPosts}
            pageSize={postsPerPage}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger
            showTotal={(total) => `共 ${total} 条`}
            onPageSizeChange={handlePageSizeChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 