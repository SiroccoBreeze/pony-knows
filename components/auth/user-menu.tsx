"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User as UserIcon, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import type { User } from "@/store/useUserStore";
import Link from "next/link";
import { RestrictAccess } from "@/components/ui/restrict-access";
import { UserPermission } from "@/lib/permissions";
import { useUserStore } from "@/store";
import { useSession } from "next-auth/react";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();
  const { updateUser } = useUserStore();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(user?.image || null);
  const { data: session, status } = useSession();
  
  // 检查会话状态是否有效
  const isValidSession = status === "authenticated" && !!session?.user?.id;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.refresh(); // 强制刷新页面以更新状态
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    // 会话失效时自动登出
    if (!isValidSession && user.id) {
      console.log("UserMenu - 检测到无效会话状态，执行登出操作");
      handleLogout();
    }
    
    if (user?.image) {
      setAvatarSrc(`${user.image}?t=${new Date().getTime()}`);
    } else {
      setAvatarSrc(null);
    }
  }, [user, isValidSession]);

  // 如果会话无效，不渲染用户菜单
  if (!isValidSession) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <div className="flex items-center justify-center w-full h-full">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="User Avatar"
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <RestrictAccess permission={UserPermission.VIEW_PROFILE}>
        <DropdownMenuItem asChild>
          <Link href="/user/profile">
            <div className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>用户管理</span>
            </div>
          </Link>
        </DropdownMenuItem>
        </RestrictAccess>
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? "注销中..." : "注销"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 