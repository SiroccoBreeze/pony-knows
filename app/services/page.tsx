"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseIcon } from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="container mx-auto py-20">
      <h1 className="text-3xl font-bold mb-4">系统服务</h1>
      <p className="text-lg text-muted-foreground mb-10">探索我们提供的数据库服务功能</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 max-w-3xl mx-auto">
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
            <Link href="/services/database" className="w-full" legacyBehavior>
              <Button className="w-full">查看表结构</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 