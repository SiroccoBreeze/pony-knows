"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Bell, Lock, Shield } from "lucide-react";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  // 密码表单状态
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  // 通知设置状态
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    newComment: true,
    newFollower: true,
    postLiked: true,
    newsletter: false,
  });
  
  // 处理密码表单变化
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };
  
  // 处理通知设置变化
  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  
  // 更新密码
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 验证密码
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "新密码和确认密码不匹配，请重新输入。",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    // 模拟API调用
    setTimeout(() => {
      toast({
        title: "密码已更新",
        description: "您的密码已成功更新。",
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsLoading(false);
    }, 1000);
  };
  
  // 保存通知设置
  const handleSaveNotifications = () => {
    setIsLoading(true);
    
    // 模拟API调用
    setTimeout(() => {
      toast({
        title: "通知设置已保存",
        description: "您的通知偏好设置已更新。",
      });
      setIsLoading(false);
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">账户设置</h1>
      </div>
      
      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            安全
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            隐私
          </TabsTrigger>
        </TabsList>
        
        {/* 安全设置 */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>密码设置</CardTitle>
              <CardDescription>更新您的账户密码</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">当前密码</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">新密码</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认新密码</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "更新中..." : "更新密码"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* 通知设置 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>管理您的通知偏好</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">电子邮件通知</Label>
                    <p className="text-sm text-muted-foreground">
                      接收所有通知的电子邮件
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notifications.emailNotifications}
                    onCheckedChange={() => handleNotificationChange("emailNotifications")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newComment">新评论通知</Label>
                    <p className="text-sm text-muted-foreground">
                      当有人评论您的帖子时通知您
                    </p>
                  </div>
                  <Switch
                    id="newComment"
                    checked={notifications.newComment}
                    onCheckedChange={() => handleNotificationChange("newComment")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newFollower">新关注者通知</Label>
                    <p className="text-sm text-muted-foreground">
                      当有人关注您时通知您
                    </p>
                  </div>
                  <Switch
                    id="newFollower"
                    checked={notifications.newFollower}
                    onCheckedChange={() => handleNotificationChange("newFollower")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="postLiked">帖子点赞通知</Label>
                    <p className="text-sm text-muted-foreground">
                      当有人点赞您的帖子时通知您
                    </p>
                  </div>
                  <Switch
                    id="postLiked"
                    checked={notifications.postLiked}
                    onCheckedChange={() => handleNotificationChange("postLiked")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newsletter">订阅电子报</Label>
                    <p className="text-sm text-muted-foreground">
                      接收我们的每周电子报和更新
                    </p>
                  </div>
                  <Switch
                    id="newsletter"
                    checked={notifications.newsletter}
                    onCheckedChange={() => handleNotificationChange("newsletter")}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} disabled={isLoading}>
                {isLoading ? "保存中..." : "保存设置"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* 隐私设置 */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>隐私设置</CardTitle>
              <CardDescription>管理您的隐私偏好</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="profileVisibility">个人资料可见性</Label>
                    <p className="text-sm text-muted-foreground">
                      允许其他用户查看您的个人资料
                    </p>
                  </div>
                  <Switch id="profileVisibility" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="activityVisibility">活动可见性</Label>
                    <p className="text-sm text-muted-foreground">
                      显示您的活动历史记录
                    </p>
                  </div>
                  <Switch id="activityVisibility" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="searchEngineVisibility">搜索引擎可见性</Label>
                    <p className="text-sm text-muted-foreground">
                      允许搜索引擎索引您的个人资料
                    </p>
                  </div>
                  <Switch id="searchEngineVisibility" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>保存设置</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 