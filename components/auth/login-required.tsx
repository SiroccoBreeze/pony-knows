"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

export function LoginRequired() {
  const pathname = usePathname();
  const encodedPath = encodeURIComponent(pathname);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">需要登录</h2>
          <p className="text-muted-foreground">
            请登录或注册以访问此页面内容。
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild size="lg" className="gap-2">
            <Link href={`/auth/login?callbackUrl=${encodedPath}`}>
              <div className="flex items-center">
                <LogIn className="h-4 w-4 mr-2" />
                登录
              </div>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href={`/auth/register?callbackUrl=${encodedPath}`}>
              <div className="flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                注册
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 