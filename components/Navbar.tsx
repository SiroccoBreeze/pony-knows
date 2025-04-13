"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeToggleColor } from "@/components/theme-toggle-color"
import { UserMenu } from "@/components/auth/user-menu";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store";
import { Menu, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, isLoggedIn } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // 确保组件只在客户端渲染后显示
  useEffect(() => {
    setMounted(true);
  }, []);

  // 移动端导航菜单项
  const mobileNavItems = [
    { href: "/", label: "首页" },
    { href: "/Manuscript", label: "实施底稿" },
    { href: "/services", label: "服务" },
    { href: "/services/nextcloud", label: "网盘服务" },
    { href: "/forum", label: "论坛" },
  ];

  return (
    <nav className="fixed top-0 w-full bg-background border-b z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              PonyKnows
            </Link>
          </div>

          {/* 桌面端导航菜单 */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href="/" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      首页
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/Manuscript" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      实施底稿
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>服务</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      <ListItem href="/services" title="全部服务">
                        查看我们提供的所有服务内容
                      </ListItem>
                      <ListItem href="/services/database" title="数据库结构">
                        查询和浏览数据库表结构信息
                      </ListItem>
                      <ListItem href="/services/nextcloud" title="网盘服务">
                        Nextcloud 网盘服务系统
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/forum" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      论坛
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* 登录按钮和主题切换 */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <ThemeToggleColor />
            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="p-2">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">通知消息</h4>
                      <Link href="/user/messages" className="text-xs text-primary hover:underline">
                        查看全部
                      </Link>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-muted/50 p-2 rounded-md text-xs">
                        <p className="font-medium">有新回复: 《关于数据库结构的疑问》</p>
                        <p className="text-muted-foreground mt-1">用户小明回复了您的帖子</p>
                        <p className="text-muted-foreground text-right text-[10px] mt-1">1小时前</p>
                      </div>
                      <div className="bg-muted/50 p-2 rounded-md text-xs">
                        <p className="font-medium">系统通知: 账户安全提醒</p>
                        <p className="text-muted-foreground mt-1">您的账户已30天未修改密码</p>
                        <p className="text-muted-foreground text-right text-[10px] mt-1">1天前</p>
                      </div>
                      <div className="bg-muted/50 p-2 rounded-md text-xs">
                        <p className="font-medium">论坛公告: 系统维护通知</p>
                        <p className="text-muted-foreground mt-1">本周六凌晨2点-4点系统将进行维护</p>
                        <p className="text-muted-foreground text-right text-[10px] mt-1">2天前</p>
                      </div>
                    </div>
                    <Link 
                      href="/user/messages" 
                      className="block mt-3 text-xs text-center bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-md transition-colors"
                    >
                      查看全部消息
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!mounted ? (
              // 加载状态 - 显示占位符
              <div className="w-8 h-8"></div>
            ) : isLoggedIn ? (
              <UserMenu user={user!} />
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="outline">登录</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>注册</Button>
                </Link>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetTitle className="text-lg font-semibold mb-4">导航菜单</SheetTitle>
                <nav className="flex flex-col space-y-4">
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium transition-colors hover:text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

// 辅助组件用于创建导航菜单项
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    title: string;
  }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default Navbar;
