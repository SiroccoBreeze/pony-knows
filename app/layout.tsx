import { Inter } from "next/font/google";
import { Metadata } from "next";
import "./globals.css";
import "./vditor-override.css";
import { themeScript } from "@/lib/theme-script";
import { ClientLayout } from "../components/client-layout";
import { Providers } from "./providers";
import HandlePermissionSync from "@/components/handle-permission-sync";
import { Toaster } from "@/components/ui/toaster";
import { LoaderProvider } from "@/contexts/loader-context";
import { LoadingOverlay } from "@/components/loading-overlay";
import { ThemeProvider } from "@/components/ui/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PonyKnows",
  description: "PonyKnows - 知识分享平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <LoaderProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <LoadingOverlay />
            <Providers>
              <ClientLayout>{children}</ClientLayout>
              <HandlePermissionSync />
              <Toaster />
            </Providers>
          </ThemeProvider>
        </LoaderProvider>
      </body>
    </html>
  );
}
