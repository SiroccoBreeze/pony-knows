"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestrictedButton } from "@/components/ui/restricted-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPermission } from "@/lib/permissions";
import { Search, Download, FilePlus, FileEdit, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// 模拟底稿数据
const MOCK_PAPERS = [
  {
    id: "wp-001",
    title: "招投标实施底稿",
    department: "财务部",
    author: "张三",
    createdAt: "2023-05-15",
    status: "已完成",
    tags: ["招投标", "重要"]
  },
  {
    id: "wp-002",
    title: "季度审计底稿",
    department: "审计部",
    author: "李四",
    createdAt: "2023-06-20",
    status: "进行中",
    tags: ["审计", "财务"]
  },
  {
    id: "wp-003",
    title: "年度项目评估底稿",
    department: "运营部",
    author: "王五",
    createdAt: "2023-04-10",
    status: "已完成",
    tags: ["评估", "项目"]
  },
];

export default function ManuscriptPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // 过滤底稿
  const filteredPapers = MOCK_PAPERS.filter(paper => {
    // 基于搜索词过滤
    if (searchQuery && !paper.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // 基于标签过滤
    if (activeTab !== "all" && !paper.tags.includes(activeTab)) {
      return false;
    }
    
    return true;
  });
  
  // 处理底稿下载
  const handleDownload = (paperId: string) => {
    toast({
      title: "开始下载底稿",
      description: `底稿ID: ${paperId} 已开始下载`,
    });
  };
  
  // 处理底稿编辑
  const handleEdit = (paperId: string) => {
    toast({
      title: "打开编辑器",
      description: `底稿ID: ${paperId} 正在编辑中`,
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">实施底稿管理</CardTitle>
              <CardDescription>
                管理和查看项目实施底稿文档
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="搜索底稿..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <RestrictedButton 
                permission={UserPermission.EDIT_WORKING_PAPERS}
                variant="default"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                新建底稿
              </RestrictedButton>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="招投标">招投标</TabsTrigger>
                <TabsTrigger value="审计">审计</TabsTrigger>
                <TabsTrigger value="评估">评估</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </div>
            
            <TabsContent value="all" className="mt-0">
              {filteredPapers.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/10">
                  <p className="text-muted-foreground">无匹配的底稿文档</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 text-muted-foreground font-medium">底稿名称</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">部门</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">作者</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">创建日期</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">状态</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPapers.map((paper) => (
                        <tr key={paper.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{paper.title}</td>
                          <td className="p-3">{paper.department}</td>
                          <td className="p-3">{paper.author}</td>
                          <td className="p-3">{paper.createdAt}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              paper.status === "已完成" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {paper.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <RestrictedButton 
                                permission={UserPermission.EDIT_WORKING_PAPERS}
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(paper.id)}
                              >
                                <FileEdit className="h-4 w-4" />
                              </RestrictedButton>
                              <RestrictedButton 
                                permission={UserPermission.DOWNLOAD_WORKING_PAPERS}
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDownload(paper.id)}
                              >
                                <Download className="h-4 w-4" />
                              </RestrictedButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            
            {["招投标", "审计", "评估"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {filteredPapers.length === 0 ? (
                  <div className="text-center py-12 border rounded-md bg-muted/10">
                    <p className="text-muted-foreground">无{tab}类型的底稿文档</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    {/* 表格内容与all标签页相同 */}
                    <table className="w-full">
                      {/* 表头和表身与上面相同 */}
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 text-muted-foreground font-medium">底稿名称</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">部门</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">作者</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">创建日期</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">状态</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPapers.map((paper) => (
                          <tr key={paper.id} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{paper.title}</td>
                            <td className="p-3">{paper.department}</td>
                            <td className="p-3">{paper.author}</td>
                            <td className="p-3">{paper.createdAt}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                paper.status === "已完成" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {paper.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <RestrictedButton 
                                  permission={UserPermission.EDIT_WORKING_PAPERS}
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEdit(paper.id)}
                                >
                                  <FileEdit className="h-4 w-4" />
                                </RestrictedButton>
                                <RestrictedButton 
                                  permission={UserPermission.DOWNLOAD_WORKING_PAPERS}
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDownload(paper.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </RestrictedButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <p className="text-sm text-muted-foreground">
            显示 {filteredPapers.length} 个底稿，共 {MOCK_PAPERS.length} 个
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

