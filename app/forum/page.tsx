"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionCard } from "@/components/forum/question-card";
import { ForumSidebar } from "@/components/forum/forum-sidebar";
import { mockQuestions, mockTags } from "@/mock/forum-data";
import { Badge } from "@/components/ui/badge";
import { X, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

export default function ForumPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get("tag");

  // 使用 useMemo 优化过滤逻辑
  const filteredQuestions = useMemo(() => {
    let questions = mockQuestions;

    // 先按标签筛选
    if (selectedTag) {
      questions = questions.filter((q) => q.tags.includes(selectedTag));
    }

    // 再按搜索词筛选标题和内容
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      questions = questions.filter(
        (q) =>
          q.title.toLowerCase().includes(searchLower) ||
          q.description.toLowerCase().includes(searchLower)
      );
    }

    return questions;
  }, [selectedTag, debouncedSearch]);

  return (
    <div className="container mx-auto py-4">
      <div className="flex gap-4">
        {/* 左侧边栏 */}
        <ForumSidebar className="w-44 hidden lg:block fixed left-0 h-screen" />

        {/* 问题列表 */}
        <main className="flex-1 min-w-0 ml-44 max-w-4xl mx-auto">
          {/* 顶部操作区 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="search"
                placeholder="搜索帖子标题或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button size="sm" className="shrink-0">
              发帖
            </Button>
          </div>

          {/* 筛选区域 */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-muted/30 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 hover:bg-background"
                >
                  最新
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 hover:bg-background"
                >
                  热门
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 hover:bg-background"
                >
                  未回答
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(searchQuery || selectedTag) && (
                <span>找到 {filteredQuestions.length} 个相关帖子</span>
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

          {/* 问题列表 */}
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <QuestionCard key={question.id} {...question} />
            ))}

            {filteredQuestions.length === 0 && (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <div className="text-4xl mb-3">🤔</div>
                <h3 className="text-lg font-medium mb-1">没有找到相关内容</h3>
                <p className="text-sm text-muted-foreground">
                  尝试使用其他关键词或
                  <Button variant="link" className="px-1 h-auto">
                    发新帖
                  </Button>
                </p>
              </div>
            )}
          </div>

          {/* 分页 */}
          {filteredQuestions.length > 0 && (
            <div className="mt-6 flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                显示 1-{Math.min(10, filteredQuestions.length)} 条，共{" "}
                {filteredQuestions.length} 条
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

        {/* 右侧热门标签 */}
        <aside className="w-56 hidden xl:block fixed right-0 top-0 h-screen overflow-y-auto">
          <div className="bg-card rounded-lg p-3">
            <h3 className="font-medium text-sm mb-2">热门标签</h3>
            <div className="space-y-1">
              {mockTags.slice(0, 5).map((tag) => (
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