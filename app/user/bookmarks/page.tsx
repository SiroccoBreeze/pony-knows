"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bookmark, Eye, MessageSquare, ThumbsUp, Search, Trash2, User } from "lucide-react";
import Link from "next/link";

// 模拟收藏数据
const mockBookmarks = [
  {
    id: "1",
    title: "人工智能在医疗领域的应用",
    excerpt: "人工智能技术正在彻底改变医疗保健行业，从诊断到治疗计划...",
    author: "张医生",
    authorId: "user1",
    createdAt: "2023-04-10T08:20:00Z",
    savedAt: "2023-04-15T14:30:00Z",
    views: 3245,
    likes: 187,
    comments: 42,
  },
  {
    id: "2",
    title: "可持续发展与环保科技",
    excerpt: "随着气候变化的加剧，可持续发展和环保科技变得越来越重要...",
    author: "李环保",
    authorId: "user2",
    createdAt: "2023-05-22T11:15:00Z",
    savedAt: "2023-05-23T09:45:00Z",
    views: 1876,
    likes: 154,
    comments: 28,
  },
  {
    id: "3",
    title: "区块链技术的未来发展趋势",
    excerpt: "区块链技术不仅仅是加密货币的基础，它还有许多其他潜在应用...",
    author: "王科技",
    authorId: "user3",
    createdAt: "2023-06-05T16:40:00Z",
    savedAt: "2023-06-10T20:15:00Z",
    views: 2567,
    likes: 203,
    comments: 37,
  },
];

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState(mockBookmarks);
  const [searchQuery, setSearchQuery] = useState("");
  
  // 搜索收藏
  const filteredBookmarks = bookmarks.filter(bookmark => 
    bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.author.toLowerCase().includes(searchQuery.toLowerCase())
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
  
  // 移除收藏
  const handleRemoveBookmark = (id: string) => {
    if (confirm("确定要移除这个收藏吗？")) {
      setBookmarks(bookmarks.filter(bookmark => bookmark.id !== id));
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">我的收藏</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索收藏..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
          <p className="mt-4 text-muted-foreground">
            {searchQuery ? "没有找到匹配的收藏" : "您还没有收藏任何内容"}
          </p>
          {searchQuery && (
            <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
              清除搜索
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookmarks.map(bookmark => (
            <Card key={bookmark.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">
                    <Link href={`/forum/post/${bookmark.id}`} className="hover:underline">
                      {bookmark.title}
                    </Link>
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    收藏于 {formatDate(bookmark.savedAt)}
                  </div>
                </div>
                <CardDescription className="flex items-center mt-1">
                  <User className="h-3 w-3 mr-1" />
                  <Link href={`/user/${bookmark.authorId}`} className="hover:underline">
                    {bookmark.author}
                  </Link>
                  <span className="mx-2">•</span>
                  <span>发布于 {formatDate(bookmark.createdAt)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {bookmark.excerpt}
                </p>
                
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{bookmark.views} 浏览</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span>{bookmark.likes} 点赞</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{bookmark.comments} 评论</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/forum/post/${bookmark.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    查看
                  </Link>
                </Button>
                <Button variant="default" size="sm" onClick={() => handleRemoveBookmark(bookmark.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  移除收藏
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 