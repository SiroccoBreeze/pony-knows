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
import { useAuth } from "@/lib/auth";

const Navbar = () => {
  const { user } = useAuth();
  
  return (
    <nav className="fixed top-0 w-full bg-background border-b z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              PnoyKonws
            </Link>
          </div>

          {/* 导航菜单 */}
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

          {/* 登录按钮和主题切换 */}
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
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
            <ThemeToggle />
            <ThemeToggleColor />
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
