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
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

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
    { href: "/about", label: "关于我们" },
    { href: "/services", label: "服务" },
    { href: "/contact", label: "联系我们" },
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
                  <NavigationMenuTrigger>关于我们</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 w-[400px]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/about"
                            className="flex flex-col justify-end w-full h-full p-6 no-underline rounded-md outline-none focus:shadow-md"
                          >
                            <div className="mb-2 text-lg font-medium">
                              关于我们
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              了解更多关于我们的故事和使命
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <ListItem href="/team" title="团队介绍">
                        认识我们专业的团队成员
                      </ListItem>
                      <ListItem href="/culture" title="企业文化">
                        了解我们的价值观和工作理念
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>服务</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      <ListItem href="/services" title="全部服务">
                        查看我们提供的所有服务内容
                      </ListItem>
                      <ListItem href="/services/database" title="数据库表结构">
                        查询和浏览数据库表结构信息
                      </ListItem>
                      <ListItem href="/services/consulting" title="咨询服务">
                        专业的技术咨询解决方案
                      </ListItem>
                      <ListItem href="/services/development" title="开发服务">
                        定制化的软件开发服务
                      </ListItem>
                      <ListItem href="/services/training" title="培训服务">
                        技术培训与能力提升
                      </ListItem>
                      <ListItem href="/services/support" title="技术支持">
                        7*24小时技术支持服务
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/contact" legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      联系我们
                    </NavigationMenuLink>
                  </Link>
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
