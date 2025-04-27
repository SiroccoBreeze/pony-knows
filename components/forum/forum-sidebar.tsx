"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TagIcon, HomeIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ForumSidebarProps {
  className?: string
}

export function ForumSidebar({ className }: ForumSidebarProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("space-y-1", className)}>
      <SidebarLink 
        href="/forum" 
        active={pathname === '/forum'}
        icon={<HomeIcon className="w-4 h-4 mr-2" />}
      >
        所有帖子
      </SidebarLink>
      <SidebarLink 
        href="/forum/tags"
        active={pathname === '/forum/tags'}
        icon={<TagIcon className="w-4 h-4 mr-2" />}
      >
        标签
      </SidebarLink>
    </nav>
  )
}

interface SidebarLinkProps {
  href: string
  children: React.ReactNode
  active?: boolean
  icon?: React.ReactNode
}

function SidebarLink({ href, children, active = false, icon }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
        active 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </Link>
  );
} 