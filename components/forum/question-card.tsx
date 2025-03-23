import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ArrowBigUp, MessageSquare, Eye } from "lucide-react"
import Link from "next/link"

interface QuestionCardProps {
  id: string
  title: string
  description: string
  tags: string[]
  votes: number
  answers: number
  views: number
  timeAgo: string
}

export function QuestionCard({
  id,
  title,
  description,
  tags,
  votes,
  answers,
  views,
  timeAgo,
}: QuestionCardProps) {
  return (
    <Card className="group p-4 transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:bg-muted/50">
      <div className="flex gap-4">
        {/* 投票计数 */}
        <div className="flex flex-col items-center gap-1 min-w-[60px]">
          <button className="p-1 rounded-full hover:bg-primary/10 transition-colors group-hover:text-primary">
            <ArrowBigUp className="w-6 h-6" />
          </button>
          <span className="font-semibold group-hover:text-primary transition-colors">
            {votes}
          </span>
        </div>

        {/* 问题内容 */}
        <div className="flex-1 min-w-0">
          <Link href={`/forum/post/${id}`} className="block group-hover:text-primary transition-colors">
            <h3 className="text-lg font-semibold line-clamp-1">
              {title}
            </h3>
          </Link>
          <p className="text-muted-foreground mt-1 line-clamp-2 group-hover:text-muted-foreground/80">
            {description}
          </p>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag} href={`/forum?tag=${tag}`}>
                  <Badge 
                    variant="secondary" 
                    className="hover:bg-primary/10 transition-colors hover:text-primary"
                  >
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 hover:text-primary transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>{answers} 回答</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{views} 浏览</span>
              </div>
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
} 