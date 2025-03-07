"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User, FileText, Bookmark, Settings, ChevronRight } from "lucide-react";

interface UserLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    title: "个人资料",
    href: "/user/profile",
    icon: User,
  },
  {
    title: "帖子管理",
    href: "/user/posts",
    icon: FileText,
  },
  {
    title: "我的收藏",
    href: "/user/bookmarks",
    icon: Bookmark,
  },
  {
    title: "账户设置",
    href: "/user/settings",
    icon: Settings,
  },
];

export default function UserLayout({ children }: UserLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* 侧边栏导航 */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-card rounded-lg shadow-sm border p-4">
            <h2 className="text-xl font-bold mb-4">个人中心</h2>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 bg-card rounded-lg shadow-sm border p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 