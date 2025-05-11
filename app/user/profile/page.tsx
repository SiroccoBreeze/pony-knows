"use client";

import { useState, useEffect, useRef } from "react";
import { useUserStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Camera, Loader2, Upload, CheckCircle2 } from "lucide-react";
import { isMobileDevice } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { user, updateUser } = useUserStore();
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>("");
  
  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    // 加载或刷新用户信息
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.user) {
          updateUser(data.user);
          if (data.user.image) {
            setAvatarSrc(data.user.image + '?t=' + new Date().getTime()); // 添加时间戳防止缓存
          }
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };
    
    fetchUserData();
  }, [updateUser]);

  // 每次user变化时更新表单数据
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
      });
      
      if (user.image) {
        setAvatarSrc(user.image + '?t=' + new Date().getTime());
      }
    }
  }, [user]);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAvatarClick = () => {
    // 触发文件选择器点击
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        toast({
          title: "不支持的文件类型",
          description: "请上传图片文件作为头像",
          variant: "destructive",
        });
        return;
      }
      
      // 检查文件大小 (最大5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "文件过大",
          description: "头像图片不能超过5MB",
          variant: "destructive",
        });
        return;
      }
      
      // 保存文件和预览
      setAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      
      // 清理预览URL
      return () => URL.revokeObjectURL(objectUrl);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 准备FormData对象用于上传
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.bio) formDataToSend.append('bio', formData.bio);
      if (avatarFile) formDataToSend.append('avatar', avatarFile);
      
      // 调用API更新用户信息
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formDataToSend,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }
      
      const data = await response.json();
      
      // 更新本地状态
      updateUser(data.user);
      
      toast({
        title: "个人资料已更新",
        description: "您的个人资料信息已成功更新。",
      });
      
      // 清除头像预览和文件
      setAvatarFile(null);
      
      // 延迟500ms后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新个人资料时出现错误，请稍后重试。",
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">个人资料</h1>
      </div>
      
      {/* 移动端提示 */}
      {isMobile && (
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-4">
          <p className="text-sm text-muted-foreground flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            移动端仅支持浏览功能，如需编辑个人资料请使用桌面端访问。
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 个人信息卡片 */}
        <Card className="md:col-span-1 overflow-hidden border-primary/10 shadow-md">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 flex flex-col items-center">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              <AvatarImage src={avatarSrc || ""} alt={user?.name || "用户"} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-medium">
                {getInitials(user?.name || "用户")}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardHeader className="-mt-2 pb-2">
            <CardTitle className="text-center text-lg font-medium">{user?.name}</CardTitle>
            <CardDescription className="text-center truncate">{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-t border-border/50 pt-4">
              <h3 className="text-sm font-medium text-primary/80 mb-2 flex items-center">
                <User className="h-4 w-4 mr-1" />
                个人简介
              </h3>
              {user?.bio ? (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-muted/40 p-3 rounded-md"
                >
                  <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground italic">暂无个人简介</p>
              )}
            </div>
            <div className="border-t border-border/50 pt-4">
              <h3 className="text-sm font-medium text-primary/80 mb-2">账户状态</h3>
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs">已激活</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-xs">已验证</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 编辑表单 - 在移动端隐藏 */}
        {!isMobile && (
          <Card className="md:col-span-2 border-primary/10 shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-4">
              <CardTitle>编辑个人资料</CardTitle>
              <CardDescription>更新您的个人信息和简介</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-8 pt-6">
                {/* 头像上传区域 */}
                <div className="flex flex-col items-center space-y-3">
                  <Label htmlFor="avatar" className="text-sm font-medium">头像</Label>
                  <div 
                    className="relative cursor-pointer group"
                    onClick={handleAvatarClick}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Avatar className="h-28 w-28 border-2 border-dashed border-primary/30 p-1">
                        <AvatarImage 
                          src={avatarPreview || avatarSrc || ""} 
                          alt={user?.name || "用户"} 
                        />
                        <AvatarFallback className="text-3xl bg-primary/10 text-primary font-medium">
                          {getInitials(user?.name || "用户")}
                        </AvatarFallback>
                      </Avatar>
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        animate={{ opacity: isHovering ? 0.6 : 0 }}
                      >
                        <Upload className="h-8 w-8 text-white" />
                      </motion.div>
                    </motion.div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="avatar"
                    name="avatar"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    点击头像更换，支持JPG、PNG格式，小于5MB
                  </p>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">昵称</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-10 border-primary/20 focus-visible:ring-primary/30"
                        placeholder="您的昵称"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10 border-primary/20 bg-muted/40"
                        placeholder="您的邮箱"
                        disabled
                      />
                      <span className="absolute right-3 top-2.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        已验证
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium">个人简介</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="介绍一下自己..."
                      rows={5}
                      className="resize-none border-primary/20 focus-visible:ring-primary/30"
                    />
                    <p className="text-xs text-muted-foreground">
                      简介将显示在您的个人资料页面中，帮助其他用户了解您
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/50 pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : "保存更改"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
} 