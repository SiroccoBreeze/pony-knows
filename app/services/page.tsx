"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseIcon, HardDrive, FileSymlink } from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="container mx-auto py-20">
      <h1 className="text-3xl font-bold mb-4">系统服务</h1>
      <p className="text-lg text-muted-foreground mb-10">探索我们提供的各项服务功能</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* 数据库表结构服务 */}
        <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <DatabaseIcon className="h-6 w-6 text-primary" />
              <CardTitle>数据库表结构</CardTitle>
            </div>
            <CardDescription>
              查看和分析数据库表结构信息
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow py-6">
            <div className="space-y-4">
              <p className="text-sm">
                通过这个服务，您可以查询和浏览SQL Server数据库的表结构信息，包括：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>表名和表定义</li>
                <li>列名、数据类型、长度和约束</li>
                <li>主键、外键和索引信息</li>
                <li>存储过程和函数定义</li>
                <li>数据库视图结构</li>
                <li>系统参数配置</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                这个工具旨在帮助您快速了解数据库架构，便于开发和维护工作。
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 pt-4">
            <Link href="/services/database" className="w-full">
              <Button className="w-full">查看表结构</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* MinIO文件存储服务 */}
        <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-6 w-6 text-primary" />
              <CardTitle>网盘服务</CardTitle>
            </div>
            <CardDescription>
              基于MinIO的对象存储文件管理
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow py-6">
            <div className="space-y-4">
              <p className="text-sm">
                MinIO提供高性能、兼容S3的对象存储服务，您可以：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>上传和下载各类文件</li>
                <li>创建和管理文件夹</li>
                <li>浏览文件结构</li>
                <li>共享文件和文件夹</li>
                <li>设置文件访问权限</li>
                <li>监控存储使用情况</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                适用于文档管理、资源共享和数据备份等多种场景。
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 pt-4">
            <Link href="/services/minio" className="w-full">
              <Button className="w-full">访问网盘</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* 资源下载服务 */}
        <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <FileSymlink className="h-6 w-6 text-primary" />
              <CardTitle>资源下载</CardTitle>
            </div>
            <CardDescription>
              查看和下载共享的网盘资源文件
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow py-6">
            <div className="space-y-4">
              <p className="text-sm">
                资源下载服务提供各类共享文件的链接集合，包括：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>教程和学习资料</li>
                <li>软件安装包和工具</li>
                <li>文档模板和参考资料</li>
                <li>数据集和示例文件</li>
                <li>视频和多媒体资源</li>
                <li>其他常用资源链接</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                提供便捷的网盘链接和提取码，方便您快速获取所需资源。
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 pt-4">
            <Link href="/services/file-links" className="w-full">
              <Button className="w-full">浏览资源</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 