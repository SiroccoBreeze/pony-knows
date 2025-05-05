"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RestrictAccess } from "@/components/ui/restrict-access";
import { UserPermission } from "@/lib/permissions";
import { FileEdit, Download, Eye, FileArchive } from "lucide-react";

export default function WorkingPapersPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  // 模拟实施底稿列表
  const workingPapers = [
    { id: 1, name: "财务报表审计底稿", date: "2023-10-15", type: "财务审计" },
    { id: 2, name: "内部控制评价底稿", date: "2023-09-22", type: "内控审计" },
    { id: 3, name: "合规性审计底稿", date: "2023-11-05", type: "合规审计" },
    { id: 4, name: "绩效审计工作底稿", date: "2023-08-30", type: "绩效审计" },
    { id: 5, name: "专项审计底稿", date: "2023-10-28", type: "专项审计" },
  ];
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">实施底稿管理</h1>
        
        <RestrictAccess permission={UserPermission.EDIT_WORKING_PAPERS}>
          <Button>
            <FileEdit className="mr-2 h-4 w-4" />
            创建底稿
          </Button>
        </RestrictAccess>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>底稿列表</CardTitle>
          <CardDescription>
            查看和管理实施底稿，可根据权限进行下载和编辑
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-2 text-muted-foreground">加载底稿数据中...</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50">
                  <tr>
                    <th scope="col" className="px-6 py-3">底稿名称</th>
                    <th scope="col" className="px-6 py-3">类型</th>
                    <th scope="col" className="px-6 py-3">创建日期</th>
                    <th scope="col" className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {workingPapers.map((paper) => (
                    <tr key={paper.id} className="bg-white border-b hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center">
                          <FileArchive className="mr-2 h-4 w-4 text-primary" />
                          {paper.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">{paper.type}</td>
                      <td className="px-6 py-4">{paper.date}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                        
                        <RestrictAccess permission={UserPermission.DOWNLOAD_WORKING_PAPERS}>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </RestrictAccess>
                        
                        <RestrictAccess permission={UserPermission.EDIT_WORKING_PAPERS}>
                          <Button variant="default" size="sm">
                            <FileEdit className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                        </RestrictAccess>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 