import { Inter } from "next/font/google";
import { Metadata } from "next";
import "./globals.css";
import "./vditor-override.css";
import { themeScript } from "@/lib/theme-script";
import { ClientLayout } from "../components/client-layout";
import { Providers } from "./providers";
import HandlePermissionSync from "@/components/handle-permission-sync";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PonyKnows",
  description: "PonyKnows - 知识分享平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <Providers>
          <ClientLayout>{children}</ClientLayout>
          <HandlePermissionSync />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
