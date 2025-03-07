"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, MessageSquare, ThumbsUp } from "lucide-react";
import Link from "next/link";

// 模拟帖子数据
const mockPosts = [
  {
    id: "1",
    title: "如何提高工作效率：10个实用技巧",
    excerpt: "在当今快节奏的工作环境中，提高效率变得越来越重要...",
    createdAt: "2023-05-15T10:30:00Z",
    status: "published",
    views: 1245,
    likes: 87,
    comments: 32,
  },
  {
    id: "2",
    title: "2023年最值得学习的编程语言",
    excerpt: "随着技术的不断发展，编程语言的受欢迎程度也在不断变化...",
    createdAt: "2023-06-22T14:15:00Z",
    status: "published",
    views: 876,
    likes: 54,
    comments: 18,
  },
  {
    id: "3",
    title: "远程工作的挑战与应对策略",
    excerpt: "远程工作已经成为许多公司的标准工作模式，但它也带来了一系列挑战...",
    createdAt: "2023-07-10T09:45:00Z",
    status: "draft",
    views: 0,
    likes: 0,
    comments: 0,
  },
];

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState("published");
  const [posts, setPosts] = useState(mockPosts);
  
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
  const handleDelete = (id: string) => {
    if (confirm("确定要删除这篇帖子吗？此操作无法撤销。")) {
      setPosts(posts.filter(post => post.id !== id));
    }
  };
  
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
      
      <Tabs defaultValue="published" onValueChange={setActiveTab}>
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
                      {post.excerpt}
                    </p>
                    
                    {post.status === "published" && (
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Eye className="h-4 w-4 mr-1" />
                          <span>{post.views} 浏览</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span>{post.likes} 点赞</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{post.comments} 评论</span>
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