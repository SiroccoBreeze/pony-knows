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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { Permission } from "@/lib/permissions";
import { useToast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  group: string;
  label: string;
  type: string;
  options?: {
    choices?: { label: string; value: string }[];
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const { hasPermission } = useAuthPermissions();
  const { toast } = useToast();
  
  // 获取设置数据
  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/settings");
        
        if (!response.ok) throw new Error("获取设置失败");
        
        const data = await response.json();
        setSettings(data.settings);
      } catch (error) {
        console.error("获取设置数据失败:", error);
        toast({
          title: "错误",
          description: "获取系统设置失败，请稍后再试",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSettings();
  }, []);
  
  // 更新设置值
  function handleSettingChange(key: string, value: string) {
    setSettings(prev => 
      prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      )
    );
  }
  
  // 保存设置
  async function handleSaveSettings() {
    if (!hasPermission(Permission.EDIT_SETTINGS)) {
      toast({
        title: "权限不足",
        description: "您没有修改系统设置的权限",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });
      
      if (!response.ok) throw new Error("保存设置失败");
      
      toast({
        title: "成功",
        description: "系统设置已更新",
      });
    } catch (error) {
      console.error("保存设置失败:", error);
      toast({
        title: "错误",
        description: "保存系统设置失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  // 根据设置类型渲染不同的控件
  function renderSettingControl(setting: SystemSetting) {
    switch (setting.type) {
      case "text":
        return (
          <Input
            id={setting.key}
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            disabled={!hasPermission(Permission.EDIT_SETTINGS)}
          />
        );
      case "textarea":
        return (
          <Textarea
            id={setting.key}
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            disabled={!hasPermission(Permission.EDIT_SETTINGS)}
          />
        );
      case "boolean":
        return (
          <Switch
            id={setting.key}
            checked={setting.value === "true"}
            onCheckedChange={(checked) => 
              handleSettingChange(setting.key, checked ? "true" : "false")
            }
            disabled={!hasPermission(Permission.EDIT_SETTINGS)}
          />
        );
      default:
        return (
          <Input
            id={setting.key}
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            disabled={!hasPermission(Permission.EDIT_SETTINGS)}
          />
        );
    }
  }
  
  // 按分组获取设置
  const groupedSettings = settings.reduce<Record<string, SystemSetting[]>>((acc, setting) => {
    if (!acc[setting.group]) {
      acc[setting.group] = [];
    }
    acc[setting.group].push(setting);
    return acc;
  }, {});
  
  // 获取分组标签
  const groupLabels: Record<string, string> = {
    basic: "基本设置",
    user: "用户设置",
    content: "内容设置",
    advanced: "高级设置",
  };
  
  // 分组标签列表
  const groups = Object.keys(groupedSettings);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
        
        {hasPermission(Permission.EDIT_SETTINGS) && (
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存设置
              </>
            )}
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2">加载中...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {groups.map((group) => (
              <TabsTrigger key={group} value={group}>
                {groupLabels[group] || group}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {groups.map((group) => (
            <TabsContent key={group} value={group}>
              <Card>
                <CardHeader>
                  <CardTitle>{groupLabels[group] || group}</CardTitle>
                  <CardDescription>
                    {group === "basic" && "基础系统配置和站点信息"}
                    {group === "user" && "用户账户和注册相关设置"}
                    {group === "content" && "帖子、评论、文件等内容相关设置"}
                    {group === "advanced" && "高级系统配置选项"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {groupedSettings[group].map((setting) => (
                    <div key={setting.id} className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor={setting.key} className="text-right">
                        {setting.label}
                      </Label>
                      <div className="col-span-2">
                        {renderSettingControl(setting)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
} 