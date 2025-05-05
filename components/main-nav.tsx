"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  MessageSquare, 
  Download, 
  FileText, 
  LayoutGrid, 
  HelpCircle
} from "lucide-react";
import { UserPermission } from "@/lib/permissions";
import { NavigationItem } from "./navigation-item";

// 在主导航项中添加实施底稿入口
const mainNavItems = [
  {
    title: "首页",
    href: "/",
    icon: Home,
  },
  {
    title: "论坛",
    href: "/forum",
    icon: MessageSquare,
    permission: UserPermission.VIEW_FORUM,
  },
  {
    title: "资源下载",
    href: "/resources",
    icon: Download,
    permission: UserPermission.ACCESS_FILE_DOWNLOADS,
  },
  {
    title: "实施底稿",
    href: "/working-papers",
    icon: FileText,
    permission: UserPermission.ACCESS_WORKING_PAPERS,
  },
  {
    title: "服务",
    href: "/services",
    icon: LayoutGrid,
    permission: UserPermission.VIEW_SERVICES,
  },
  {
    title: "帮助",
    href: "/help",
    icon: HelpCircle,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {mainNavItems.map((item) => (
        <NavigationItem
          key={item.href}
          href={item.href}
          label={item.title}
          permission={item.permission}
          icon={<item.icon size={16} className="mr-2" />}
          className={cn(
            "transition-colors hover:text-primary",
            pathname === item.href
              ? "text-primary font-medium"
              : "text-muted-foreground"
          )}
        />
      ))}
    </nav>
  );
} 