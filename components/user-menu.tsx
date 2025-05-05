"use client";

import { User } from "next-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import {
  LogOut,
  Settings,
  User as UserIcon,
  Users,
  FileText,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RestrictAccess } from "./ui/restrict-access";
import { AdminPermission } from "@/lib/permissions";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  // 获取用户首字母用于头像
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium">{user.name}</p>}
            {user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/user/profile" className="flex items-center">
            <UserIcon className="mr-2 h-4 w-4" />
            个人资料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/user/posts" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            我的帖子
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/user/notifications" className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            通知消息
          </Link>
        </DropdownMenuItem>
        
        {/* 添加"用户管理"项，只有管理员可见 */}
        <RestrictAccess permission={AdminPermission.ADMIN_ACCESS}>
          <DropdownMenuItem asChild className="text-sm">
            <Link href="/admin" className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              用户管理
            </Link>
          </DropdownMenuItem>
        </RestrictAccess>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/user/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            设置选项
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            signOut({
              callbackUrl: "/",
            });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 