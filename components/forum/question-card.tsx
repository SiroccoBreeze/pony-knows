import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MessageSquare, Eye, Clock } from "lucide-react"
import Link from "next/link"
import { getPreviewText } from "@/lib/utils"
import { ReactNode } from "react"

interface QuestionCardProps {
  id: string
  title: string
  description: string
  tags: string[]
  answers: number
  views: number
  timeAgo: string
  children?: ReactNode
}

export function QuestionCard({
  id,
  title,
  description,
  tags,
  answers,
  views,
  timeAgo,
  children
}: QuestionCardProps) {
  // 生成预览文本
  const previewText = getPreviewText(description, 150)

  return (
    <Card className="group p-3 transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:bg-muted/50">
      <div className="flex flex-col">
        {/* 问题标题和内容 */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/forum/post/${id}`}
            className="block group-hover:text-primary transition-colors"
            legacyBehavior>
            <h3 className="text-base font-semibold line-clamp-1">
              {title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 group-hover:text-muted-foreground/80">
            {previewText}
          </p>
          
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Link key={tag} href={`/forum?tag=${tag}`} className="inline-flex items-center text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {tag}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 hover:text-primary transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{answers}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{timeAgo}</span>
              </div>
              {children && (
                <div className="ml-2">
                  {children}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 