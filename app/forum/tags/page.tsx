"use client"

import { Input } from "@/components/ui/input"
import { ForumSidebar } from "@/components/forum/forum-sidebar"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Search, Tag } from "lucide-react"
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

interface TagData {
  name: string;
  count: number;
  description?: string;
}

export default function TagsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [tags, setTags] = useState<TagData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/tags')
        if (!response.ok) {
          throw new Error('获取标签失败')
        }
        const data = await response.json()
        setTags(data)
      } catch (error) {
        console.error('获取标签错误:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTags()
  }, [])

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTagClick = (tagName: string) => {
    router.push(`/forum?tag=${tagName}`)
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex gap-4">
        <ForumSidebar className="w-[10vw] hidden lg:block fixed left-0 h-screen" />

        <main className="flex-1 min-w-0 ml-44 max-w-[60vw] mx-auto">
          {/* 标题和搜索区域 - 减小底部间距 */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Tag className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-medium">标签</h1>
              <span className="text-sm text-muted-foreground">
                共 {tags.length} 个标签
              </span>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="search"
                placeholder="搜索标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 h-9"
              />
            </div>
          </div>

          {/* 加载中状态 */}
          {isLoading && (
            <div className="text-center py-10 bg-muted/30 rounded-lg">
              <div className="text-lg mb-2">加载中...</div>
            </div>
          )}

          {/* 标签网格 */}
          {!isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredTags.map((tag) => (
                <Card 
                  key={tag.name}
                  className="group cursor-pointer transition-all duration-200 
                    hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm
                    overflow-hidden"
                  onClick={() => handleTagClick(tag.name)}
                >
                  <CardHeader className="space-y-0 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors text-base">
                        {tag.name}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {tag.count}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground 
                          opacity-0 group-hover:opacity-100 transition-opacity" 
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {tag.description && (
                    <CardContent className="pt-0 pb-3 px-3">
                      <CardDescription className="line-clamp-2 text-sm">
                        {tag.description}
                      </CardDescription>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* 空状态 - 调整间距 */}
          {!isLoading && filteredTags.length === 0 && (
            <div className="text-center py-10 bg-muted/30 rounded-lg">
              <div className="text-4xl mb-2">🔍</div>
              <h3 className="text-lg font-medium mb-1">没有找到相关标签</h3>
              <p className="text-sm text-muted-foreground">
                尝试使用其他关键词搜索
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
} 