"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const { data: session } = useSession() as { data: ExtendedSession | null };
  const router = useRouter();

  useEffect(() => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    const fetchPosts = async () => {
      try {
        const userId = session.user.id;
        const response = await fetch(`/api/posts?authorId=${userId}`);
        if (!response.ok) {
          throw new Error("获取帖子失败");
        }
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error("获取帖子失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [session, router]);

  // 根据状态筛选帖子
  const filteredPosts = posts.filter(post => 
    activeTab === "all" || post.status === activeTab
  );
  
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

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">帖子管理</h1>
        <Button>
          <Link href="/forum/new" className="flex items-center gap-2">
            发布新帖子
          </Link>
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="published">已发布</TabsTrigger>
          <TabsTrigger value="draft">草稿</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无{activeTab === "published" ? "已发布" : activeTab === "draft" ? "草稿" : ""}帖子</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map(post => (
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
                    
                    {post.status === "published" && (
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{post._count.comments} 评论</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
} 