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
import { isMobileDevice } from "@/lib/utils";

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
  const [sortBy, setSortBy] = useState<'latest' | 'views'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(15); // 增加每页显示的帖子数量
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get("tag");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

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
        
        // 确保设置的是有效的数组数据
        if (Array.isArray(data)) {
          setPosts(data);
        } else if (data && Array.isArray(data.posts)) {
          setPosts(data.posts);
        } else {
          console.error('API返回了无效的数据格式', data);
          setPosts([]);
        }
      } catch (error) {
        console.error('获取帖子数据失败:', error);
        setPosts([]);
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
    // 确保posts是一个数组
    let filteredData = Array.isArray(posts) ? posts : [];

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
    if (filteredData.length > 0) {
      filteredData = [...filteredData].sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          // 按照浏览量排序
          return b.views - a.views;
        }
      });
    }

    return filteredData;
  }, [selectedTag, debouncedSearch, posts, sortBy]);

  // 计算分页数据
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [currentPage, filteredPosts, postsPerPage]);

  // 计算总页数
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  // 分页处理函数
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            {!isMobile && (
              <Button asChild variant="default" className="flex gap-2 rounded-lg">
                <Link href="/forum/new">
                  <span>发布新帖</span>
                </Link>
              </Button>
            )}
          </div>

          {/* 移动端提示 */}
          {isMobile && (
            <div className="bg-muted/30 p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground">
                移动端仅支持浏览功能，如需发帖请使用桌面端访问。
              </p>
            </div>
          )}

          {/* 筛选区域 - 移动端优化 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-muted/30 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-1.5">
                <Button
                  variant={sortBy === 'latest' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => {
                    setSortBy('latest');
                    setCurrentPage(1);
                  }}
                >
                  最新
                </Button>
                <Button
                  variant={sortBy === 'views' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => {
                    setSortBy('views');
                    setCurrentPage(1);
                  }}
                >
                  最多浏览
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
            <div className="space-y-2">
              {paginatedPosts.map((post) => (
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
                >
                  <Button asChild variant="ghost" className="h-8 w-8 p-0">
                    <Link href={`/forum/post/${post.id}`}><Search className="h-4 w-4" /></Link>
                  </Button>
                </QuestionCard>
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

          {/* 分页组件 - 优化 */}
          {filteredPosts.length > postsPerPage && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="text-sm text-muted-foreground">
                显示 {(currentPage - 1) * postsPerPage + 1}-{Math.min(currentPage * postsPerPage, filteredPosts.length)} 条，共{" "}
                {filteredPosts.length} 条
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  上一页
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={i}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-1">...</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
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