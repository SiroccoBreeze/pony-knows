"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseIcon, CodeIcon, BookIcon, HelpCircleIcon } from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="container mx-auto py-20">
      <h1 className="text-3xl font-bold mb-8">我们的服务</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 数据库表结构服务 */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DatabaseIcon className="h-6 w-6" />
              <CardTitle>数据库表结构</CardTitle>
            </div>
            <CardDescription>
              查看和分析数据库表结构信息
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">
              查询SQL Server数据库的表结构信息，包括表名、字段名、数据类型、长度、主键等属性。
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/services/database">
              <Button>查看表结构</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* 开发服务 */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CodeIcon className="h-6 w-6" />
              <CardTitle>开发服务</CardTitle>
            </div>
            <CardDescription>
              定制化软件开发解决方案
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">
              根据您的业务需求提供专业的软件开发服务，包括Web应用、移动应用和企业级系统。
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/services/development">
              <Button variant="outline">了解更多</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* 培训服务 */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookIcon className="h-6 w-6" />
              <CardTitle>培训服务</CardTitle>
            </div>
            <CardDescription>
              专业技术培训和能力提升
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">
              提供各类技术培训课程，帮助您的团队掌握最新技术和最佳实践。
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/services/training">
              <Button variant="outline">了解更多</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* 技术支持 */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircleIcon className="h-6 w-6" />
              <CardTitle>技术支持</CardTitle>
            </div>
            <CardDescription>
              全天候技术支持服务
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">
              提供7*24小时的技术支持服务，确保您的系统稳定运行。
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/services/support">
              <Button variant="outline">了解更多</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 