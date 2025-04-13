"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { User, Mail } from "lucide-react";
import { isMobileDevice } from "@/lib/utils";

export default function ProfilePage() {
  const { user, updateUser } = useUserStore();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 在实际应用中，这里应该调用API更新用户信息
      // 这里我们只是更新Zustand状态
      updateUser(formData);
      toast({
        title: "个人资料已更新",
        description: "您的个人资料信息已成功更新。",
      });
    } catch (error) {
      toast({
        title: "更新失败",
        description: "更新个人资料时出现错误，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 获取用户名首字母作为头像备用显示
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">个人资料</h1>
      </div>
      
      {/* 移动端提示 */}
      {isMobile && (
        <div className="bg-muted/30 p-4 rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">
            移动端仅支持浏览功能，如需编辑个人资料请使用桌面端访问。
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 个人信息卡片 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>个人信息</CardTitle>
            <CardDescription>您的公开个人信息</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.image || ""} alt={user?.name || "用户"} />
              <AvatarFallback className="text-2xl">{getInitials(user?.name || "用户")}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-medium">{user?.name}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {user?.bio && (
              <div className="w-full mt-2 p-3 bg-muted/30 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 编辑表单 - 在移动端隐藏 */}
        {!isMobile && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>编辑个人资料</CardTitle>
              <CardDescription>更新您的个人信息和简介</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">昵称</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-10"
                        placeholder="您的昵称"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10"
                        placeholder="您的邮箱"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">个人简介</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="介绍一下自己..."
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "保存中..." : "保存更改"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
} 