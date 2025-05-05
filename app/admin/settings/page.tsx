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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission } from "@/lib/permissions";
import { RestrictedRoute } from "@/components/restricted-route";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  registrationEnabled: boolean;
  commentsEnabled: boolean;
  maintenanceMode: boolean;
  postsPerPage: number;
  defaultUserRole: string;
  contactEmail: string;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  emailFromName: string;
  emailFromAddress: string;
}

export default function SettingsPage() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: "PonyKnows",
    siteDescription: "知识分享平台",
    registrationEnabled: true,
    commentsEnabled: true,
    maintenanceMode: false,
    postsPerPage: 10,
    defaultUserRole: "user",
    contactEmail: "admin@example.com",
  });
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: false,
    emailFromName: "",
    emailFromAddress: "",
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const { hasPermission } = useAuthPermissions();
  
  // 获取设置数据
  useEffect(() => {
    fetchSettings();
  }, []);
  
  async function fetchSettings() {
    try {
      setIsLoading(true);
      
      // 这里实际上应该从API获取设置
      // const response = await fetch("/api/admin/settings");
      // if (!response.ok) throw new Error("获取设置失败");
      // const data = await response.json();
      // setSiteSettings(data.siteSettings);
      // setEmailSettings(data.emailSettings);
      
      // 为了演示，使用模拟数据
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error("获取设置数据失败:", error);
      toast({
        title: "错误",
        description: "获取设置数据失败，请稍后再试",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }
  
  // 保存网站设置
  async function handleSaveSiteSettings() {
    if (!hasPermission(AdminPermission.ADMIN_ACCESS)) {
      toast({
        title: "错误",
        description: "您没有权限修改系统设置",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // 这里实际上应该将设置保存到API
      // const response = await fetch("/api/admin/settings/site", {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(siteSettings),
      // });
      
      // if (!response.ok) throw new Error("保存设置失败");
      
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "成功",
        description: "网站设置已保存",
      });
    } catch (error) {
      console.error("保存设置失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "保存设置失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  // 保存邮件设置
  async function handleSaveEmailSettings() {
    if (!hasPermission(AdminPermission.ADMIN_ACCESS)) {
      toast({
        title: "错误",
        description: "您没有权限修改邮件设置",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "成功",
        description: "邮件设置已保存",
      });
    } catch (error) {
      console.error("保存邮件设置失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "保存邮件设置失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  // 测试邮件设置
  async function handleTestEmailSettings() {
    try {
      setIsSaving(true);
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "成功",
        description: "测试邮件已发送",
      });
    } catch (error) {
      console.error("测试邮件发送失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "测试邮件发送失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  // 更新网站设置
  function updateSiteSettings(field: keyof SiteSettings, value: any) {
    setSiteSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }
  
  // 更新邮件设置
  function updateEmailSettings(field: keyof EmailSettings, value: any) {
    setEmailSettings(prev => ({
      ...prev,
      [field]: value
    }));
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
          <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
        </div>
        
        <Tabs defaultValue="site">
          <TabsList className="mb-4">
            <TabsTrigger value="site">网站设置</TabsTrigger>
            <TabsTrigger value="email">邮件设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="site">
            <Card>
              <CardHeader>
                <CardTitle>网站设置</CardTitle>
                <CardDescription>
                  基本网站配置与功能设置
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">网站名称</Label>
                      <Input
                        id="siteName"
                        value={siteSettings.siteName}
                        onChange={e => updateSiteSettings('siteName', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">网站描述</Label>
                      <Input
                        id="siteDescription"
                        value={siteSettings.siteDescription}
                        onChange={e => updateSiteSettings('siteDescription', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postsPerPage">每页显示帖子数</Label>
                      <Input
                        id="postsPerPage"
                        type="number"
                        min="1"
                        max="50"
                        value={siteSettings.postsPerPage}
                        onChange={e => updateSiteSettings('postsPerPage', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">联系邮箱</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={siteSettings.contactEmail}
                        onChange={e => updateSiteSettings('contactEmail', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="defaultUserRole">默认用户角色</Label>
                      <Select 
                        value={siteSettings.defaultUserRole}
                        onValueChange={value => updateSiteSettings('defaultUserRole', value)}
                      >
                        <SelectTrigger id="defaultUserRole">
                          <SelectValue placeholder="选择默认角色" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">普通用户</SelectItem>
                          <SelectItem value="moderator">版主</SelectItem>
                          <SelectItem value="contributor">贡献者</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="registrationEnabled">允许注册</Label>
                        <p className="text-sm text-muted-foreground">
                          启用时允许新用户注册网站账号
                        </p>
                      </div>
                      <Switch 
                        id="registrationEnabled"
                        checked={siteSettings.registrationEnabled}
                        onCheckedChange={value => updateSiteSettings('registrationEnabled', value)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="commentsEnabled">允许评论</Label>
                        <p className="text-sm text-muted-foreground">
                          启用时用户可以在帖子下发表评论
                        </p>
                      </div>
                      <Switch 
                        id="commentsEnabled"
                        checked={siteSettings.commentsEnabled}
                        onCheckedChange={value => updateSiteSettings('commentsEnabled', value)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="maintenanceMode" className="text-destructive">维护模式</Label>
                        <p className="text-sm text-muted-foreground">
                          启用时网站将对普通用户显示维护页面
                        </p>
                      </div>
                      <Switch 
                        id="maintenanceMode"
                        checked={siteSettings.maintenanceMode}
                        onCheckedChange={value => updateSiteSettings('maintenanceMode', value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveSiteSettings}
                      disabled={isSaving}
                    >
                      {isSaving ? "保存中..." : "保存设置"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>邮件设置</CardTitle>
                <CardDescription>
                  邮件服务器配置
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP服务器</Label>
                      <Input
                        id="smtpHost"
                        value={emailSettings.smtpHost}
                        onChange={e => updateEmailSettings('smtpHost', e.target.value)}
                        placeholder="例如: smtp.example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP端口</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        min="1"
                        max="65535"
                        value={emailSettings.smtpPort}
                        onChange={e => updateEmailSettings('smtpPort', parseInt(e.target.value))}
                        placeholder="例如: 587"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP用户名</Label>
                      <Input
                        id="smtpUser"
                        value={emailSettings.smtpUser}
                        onChange={e => updateEmailSettings('smtpUser', e.target.value)}
                        placeholder="例如: user@example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP密码</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={emailSettings.smtpPassword}
                        onChange={e => updateEmailSettings('smtpPassword', e.target.value)}
                        placeholder="请输入SMTP密码"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emailFromName">发件人名称</Label>
                      <Input
                        id="emailFromName"
                        value={emailSettings.emailFromName}
                        onChange={e => updateEmailSettings('emailFromName', e.target.value)}
                        placeholder="例如: PonyKnows管理员"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emailFromAddress">发件人邮箱</Label>
                      <Input
                        id="emailFromAddress"
                        type="email"
                        value={emailSettings.emailFromAddress}
                        onChange={e => updateEmailSettings('emailFromAddress', e.target.value)}
                        placeholder="例如: admin@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="smtpSecure">使用SSL/TLS</Label>
                        <p className="text-sm text-muted-foreground">
                          启用时使用安全连接
                        </p>
                      </div>
                      <Switch 
                        id="smtpSecure"
                        checked={emailSettings.smtpSecure}
                        onCheckedChange={value => updateEmailSettings('smtpSecure', value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={handleTestEmailSettings}
                      disabled={isSaving}
                    >
                      测试设置
                    </Button>
                    <Button 
                      onClick={handleSaveEmailSettings}
                      disabled={isSaving}
                    >
                      {isSaving ? "保存中..." : "保存设置"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RestrictedRoute>
  );
} 