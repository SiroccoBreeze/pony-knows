"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission } from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RestrictedRoute } from "@/components/restricted-route";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface SystemParameter {
  id: string;
  key: string;
  value: string;
  group: string;
  label: string;
  type: string;
}

export default function ParametersConfigPage() {
  const [parameters, setParameters] = useState<SystemParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const { hasPermission } = useAuthPermissions();
  
  // 获取参数数据
  useEffect(() => {
    fetchParameters();
  }, []);
  
  async function fetchParameters() {
    try {
      setIsLoading(true);
      
      // 从API获取设置
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("获取参数失败");
      const data = await response.json();
      
      setParameters(data.settings || []);
      setIsLoading(false);
    } catch (error) {
      console.error("获取参数数据失败:", error);
      toast({
        title: "错误",
        description: "获取参数数据失败，请稍后再试",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }
  
  // 保存参数设置
  async function handleSaveParameters() {
    if (!hasPermission(AdminPermission.ADMIN_ACCESS)) {
      toast({
        title: "错误",
        description: "您没有权限修改系统参数",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // 将参数保存到API
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: parameters }),
      });
      
      if (!response.ok) throw new Error("保存参数失败");
      
      // 保存成功后显示提示
      toast({
        variant: "default",
        title: "保存成功",
        description: "系统参数已成功更新",
        duration: 3000, // 显示3秒
      });
    } catch (error) {
      console.error("保存参数失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: error instanceof Error ? error.message : "保存参数失败，请稍后再试",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  // 更新参数值
  function updateParameterValue(id: string, value: string | boolean) {
    const stringValue = typeof value === "boolean" ? value.toString() : value;
    
    setParameters(prevParams => 
      prevParams.map(param => 
        param.id === id ? { ...param, value: stringValue } : param
      )
    );
  }
  
  // 获取参数的布尔值
  function getParameterBoolValue(value: string): boolean {
    return value === "true";
  }
  
  // 获取特定参数的警告信息
  function getParameterWarning(key: string, value: string): string | null {
    if (key === "maintenance_mode" && value === "true") {
      return "维护模式已启用，普通用户将无法访问网站。请确保在必要的维护完成后关闭此模式。";
    }
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">加载中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <RestrictedRoute
      permission={AdminPermission.ADMIN_ACCESS}
      redirectTo="/admin"
      loadingMessage="验证管理员权限中..."
    >
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">参数配置</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>系统参数</CardTitle>
            <CardDescription>
              配置网站的基本运行参数，控制系统功能的开启与关闭
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">参数名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[250px] text-right">值</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      暂无系统参数
                    </TableCell>
                  </TableRow>
                ) : (
                  parameters.map(param => (
                    <TableRow key={param.id}>
                      <TableCell className="font-medium">
                        {param.label}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {getParameterDescription(param.key)}
                          </p>
                          {getParameterWarning(param.key, param.value) && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>注意</AlertTitle>
                              <AlertDescription>
                                {getParameterWarning(param.key, param.value)}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {param.type === "boolean" && (
                          <Switch
                            checked={getParameterBoolValue(param.value)}
                            onCheckedChange={(checked) => updateParameterValue(param.id, checked)}
                          />
                        )}
                        {param.type === "number" && (
                          <Input
                            type="number"
                            value={param.value}
                            onChange={(e) => updateParameterValue(param.id, e.target.value)}
                            className="w-full"
                          />
                        )}
                        {param.type === "text" && (
                          <Input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateParameterValue(param.id, e.target.value)}
                            className="w-full"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleSaveParameters} 
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存参数
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RestrictedRoute>
  );
}

// 根据参数键名获取描述
function getParameterDescription(key: string): string {
  const descriptions: Record<string, string> = {
    "enable_registration": "启用后，新用户可以在网站上自行注册账户",
    "enable_comments": "启用后，用户可以在帖子下方发表评论",
    "maintenance_mode": "启用后，普通用户将无法访问网站，只有管理员可以登录",
    "post_moderation": "启用后，新发布的帖子需要管理员审核才能显示", 
    "comment_moderation": "启用后，新发表的评论需要管理员审核才能显示",
    "enable_file_upload": "启用后，允许用户上传文件附件",
    "enable_rich_editor": "启用后，使用富文本编辑器代替纯文本编辑器",
    "upload_enabled": "启用后，允许用户在帖子编辑器中上传文件",
    "upload_max_file_size_mb": "设置允许上传的文件最大大小，单位为MB（默认5MB）",
    "upload_allowed_file_types": "设置允许上传的文件类型列表，使用MIME类型格式，多个类型用逗号分隔（例如image/jpeg,image/png）"
  };
  
  return descriptions[key] || "无描述";
} 