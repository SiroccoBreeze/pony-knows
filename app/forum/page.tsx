"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionCard } from "@/components/forum/question-card";
import { ForumSidebar } from "@/components/forum/forum-sidebar";
import { Badge } from "@/components/ui/badge";
import { X, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

// 定义帖子和标签接口
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
  };
  postTags: {
    tag: {
      name: string;
    };
  }[];
  _count: {
    comments: number;
  };
  views: number;
}

interface Tag {
  name: string;
  count: number;
}

export default function ForumPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('latest');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get("tag");

  // 获取帖子数据
  useEffect(() => {
    async function fetchPosts() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/posts?skipPagination=true');
        if (!response.ok) {
          throw new Error('获取帖子失败');
        }
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error('获取帖子数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // 获取标签数据
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
          throw new Error('获取标签失败');
        }
        const data = await response.json();
        setTags(data);
      } catch (error) {
        console.error('获取标签数据失败:', error);
      }
    }

    fetchTags();
  }, []);

  // 使用 useMemo 优化过滤和排序逻辑
  const filteredPosts = useMemo(() => {
    let filteredData = posts;

    // 先按标签筛选
    if (selectedTag) {
      filteredData = filteredData.filter((post) => 
        post.postTags.some(pt => pt.tag.name === selectedTag)
      );
    }

    // 再按搜索词筛选标题和内容
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filteredData = filteredData.filter(
        (post) =>
          post.title.toLowerCase().includes(searchLower) ||
          post.content.toLowerCase().includes(searchLower)
      );
    }

    // 根据排序方式排序
    filteredData = [...filteredData].sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        // 热门排序：优先考虑评论数和浏览量
        const scoreA = a._count.comments * 2 + a.views;
        const scoreB = b._count.comments * 2 + b.views;
        return scoreB - scoreA;
      }
    });

    return filteredData;
  }, [selectedTag, debouncedSearch, posts, sortBy]);

  // 格式化时间为"X小时前"或"X天前"的形式
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      return `${Math.floor(diffInHours / 24)}天前`;
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 左侧边栏 - 在移动端隐藏 */}
        <ForumSidebar className="hidden lg:block w-[10vw] fixed left-0 h-screen" />

        {/* 问题列表 - 移动端全宽 */}
        <main className="flex-1 min-w-0 lg:ml-44 lg:max-w-[60vw] mx-auto">
          {/* 顶部操作区 - 移动端优化 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="search"
                placeholder="搜索帖子标题或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                </button>
              )}
            </div>
          </div>

          {/* 筛选区域 - 移动端优化 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-muted/30 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-1.5">
                <Button
                  variant={sortBy === 'latest' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setSortBy('latest')}
                >
                  最新
                </Button>
                <Button
                  variant={sortBy === 'hot' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setSortBy('hot')}
                >
                  热门
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(searchQuery || selectedTag) && (
                <span>找到 {filteredPosts.length} 个相关帖子</span>
              )}
              {selectedTag && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  {selectedTag}
                  <Link
                    href="/forum"
                    className="ml-1 hover:text-primary inline-flex items-center"
                  >
                    <X className="h-3 w-3" />
                  </Link>
                </Badge>
              )}
            </div>
          </div>

          {/* 问题列表 - 移动端优化间距 */}
          {isLoading ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <div className="text-lg mb-3">加载中...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <QuestionCard 
                  key={post.id} 
                  id={post.id}
                  title={post.title}
                  description={post.content}
                  tags={post.postTags.map(pt => pt.tag.name)}
                  votes={0}
                  answers={post._count.comments}
                  views={post.views}
                  timeAgo={formatTimeAgo(post.createdAt)}
                />
              ))}

              {filteredPosts.length === 0 && (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <div className="text-4xl mb-3">🤔</div>
                  <h3 className="text-lg font-medium mb-1">没有找到相关内容</h3>
                  <p className="text-sm text-muted-foreground">
                    尝试使用其他关键词搜索
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 分页 - 移动端优化 */}
          {filteredPosts.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
              <div className="text-sm text-muted-foreground">
                显示 1-{Math.min(10, filteredPosts.length)} 条，共{" "}
                {filteredPosts.length} 条
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3">
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 bg-primary/5"
                >
                  1
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  2
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  下一页
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* 右侧热门标签 - 移动端隐藏 */}
        <aside className="hidden xl:block w-[15vw] fixed right-0 h-screen overflow-y-auto">
          <div className="bg-card rounded-lg p-3">
            <h3 className="font-medium text-sm mb-2">热门标签</h3>
            <div className="space-y-1">
              {tags.slice(0, 5).map((tag) => (
                <Link
                  href={`/forum?tag=${tag.name}`}
                  key={tag.name}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md text-sm hover:bg-muted group"
                >
                  <span className="group-hover:text-primary transition-colors">
                    {tag.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tag.count}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/forum/tags"
              className="block text-xs text-center text-muted-foreground hover:text-primary mt-3"
            >
              查看所有标签
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}