"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from '@/components/ui/toaster';
import { LoadingProvider } from '@/components/providers/loading-provider';
import { PermissionsLoadingProvider } from '@/components/providers/permissions-loading-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <LoadingProvider>
            {/* 权限加载提供者已移至其他位置 */}
            {children}
          </LoadingProvider>
        </AuthProvider>
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
} 