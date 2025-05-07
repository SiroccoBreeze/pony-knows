"use client";

import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeToggleColor } from "@/components/theme-toggle-color";
import { AdminPermission } from "@/lib/permissions";

export function AdminHeader() {
  const { hasAdminPermission } = useAuthPermissions();
  const { data: session } = useSession();
  const router = useRouter();

  // 获取用户头像的首字母
  const getInitials = () => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // 处理注销操作
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/login");
  };

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-gradient-to-r from-background to-muted/20 shadow-sm">
      <div className="flex-1">
        <h1 className="text-lg font-semibold flex items-center">
          <span className="mr-2 text-primary/70">👋</span>
          欢迎回来，<span className="text-primary font-bold ml-1">{session?.user?.name || "管理员"}</span>
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <ThemeToggleColor />
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 transition-colors">
          <Bell size={20} className="text-primary/70" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-primary/10 transition-colors p-0">
              <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-1 ring-offset-background">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "用户"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal bg-muted/50 rounded-t-md mb-1">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-primary">{session?.user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="hover:bg-primary/5 cursor-pointer">
              <Link href="/user/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4 text-primary/70" />
                <span>个人资料</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="hover:bg-primary/5 cursor-pointer">
              <Link href="/admin/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4 text-primary/70" />
                <span>系统设置</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="hover:bg-destructive/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4 text-destructive/80" />
              <span className="text-destructive/80">退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
} 