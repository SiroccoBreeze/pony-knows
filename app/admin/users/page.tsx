"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Search, 
  Trash, 
  Edit, 
  Check,
  X,
  Pencil,
  UserMinus,
  UserCog,
} from "lucide-react";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission } from "@/lib/permissions";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isActive: boolean;
  roles: {
    id: string;
    name: string;
  }[];
  createdAt: string;
  status?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // 用户表单状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    isActive: true,
    status: "approved",
    roles: [] as string[],
  });
  
  const { toast } = useToast();
  const { hasPermission } = useAuthPermissions();
  
  // 获取用户数据
  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery, roleFilter]);
  
  // 获取角色数据
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await fetch("/api/admin/roles");
        if (!response.ok) throw new Error("获取角色失败");
        const data = await response.json();
        setRoles(data.roles);
      } catch (error) {
        console.error("获取角色数据失败:", error);
        toast({
          title: "错误",
          description: "获取角色数据失败，请稍后再试",
          variant: "destructive",
        });
      }
    }
    
    fetchRoles();
  }, []);
  
  async function fetchUsers() {
    try {
      setIsLoading(true);
      // 构建URL，当roleFilter为"all"时不包含角色过滤参数
      let apiUrl = `/api/admin/users?page=${page}&limit=${limit}&search=${searchQuery}`;
      if (roleFilter && roleFilter !== "all") {
        apiUrl += `&role=${roleFilter}`;
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) throw new Error("获取用户列表失败");
      
      const data = await response.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error("获取用户数据失败:", error);
      toast({
        title: "错误",
        description: "获取用户数据失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // 打开新增用户对话框
  function handleAddUser() {
    setFormData({
      id: "",
      name: "",
      email: "",
      password: "",
      isActive: true,
      status: "approved",
      roles: [],
    });
    setIsEditMode(false);
    setIsDialogOpen(true);
  }
  
  // 打开编辑用户对话框
  function handleEditUser(user: User) {
    setFormData({
      id: user.id,
      name: user.name || "",
      email: user.email,
      password: "",
      isActive: user.isActive,
      status: user.status || "approved",
      roles: user.roles.map(role => role.id),
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  }
  
  // 更新表单数据
  function handleFormChange(field: string, value: string | boolean | string[]) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }
  
  // 处理角色多选
  function handleRoleChange(roleId: string) {
    setFormData(prev => {
      const roles = [...prev.roles];
      const index = roles.indexOf(roleId);
      
      if (index !== -1) {
        roles.splice(index, 1);
      } else {
        roles.push(roleId);
      }
      
      return {
        ...prev,
        roles
      };
    });
  }
  
  // 保存用户
  async function handleSaveUser() {
    try {
      const url = isEditMode 
        ? `/api/admin/users/${formData.id}` 
        : "/api/admin/users";
      
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          isActive: formData.isActive,
          status: formData.status,
          roles: formData.roles,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存用户失败");
      }
      
      setIsDialogOpen(false);
      fetchUsers();
      
      toast({
        title: "成功",
        description: isEditMode ? "用户已更新" : "用户已创建",
      });
    } catch (error) {
      console.error("保存用户失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "保存用户失败，请稍后再试",
        variant: "destructive",
      });
    }
  }
  
  // 删除用户
  async function handleDeleteUser(userId: string) {
    if (!confirm("确定要删除这个用户吗？此操作不可恢复。")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除用户失败");
      }
      
      fetchUsers();
      
      toast({
        title: "成功",
        description: "用户已删除",
      });
    } catch (error) {
      console.error("删除用户失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除用户失败，请稍后再试",
        variant: "destructive",
      });
    }
  }
  
  // 审核用户
  async function handleApproveUser(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "approved",
          isActive: true
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "审核用户失败");
      }
      
      fetchUsers();
      
      toast({
        title: "成功",
        description: "已批准用户注册",
      });
    } catch (error) {
      console.error("审核用户失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "审核用户失败，请稍后再试",
        variant: "destructive",
      });
    }
  }

  // 拒绝用户注册
  async function handleRejectUser(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "rejected",
          isActive: false
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "拒绝用户失败");
      }
      
      fetchUsers();
      
      toast({
        title: "成功",
        description: "已拒绝用户注册申请",
      });
    } catch (error) {
      console.error("拒绝用户失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "拒绝用户失败，请稍后再试",
        variant: "destructive",
      });
    }
  }

  // 切换用户状态 (启用/禁用)
  async function handleUserStatusToggle(user: User) {
    try {
      const newStatus = !user.isActive;
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: newStatus
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `${newStatus ? '启用' : '禁用'}用户失败`);
      }
      
      fetchUsers();
      
      toast({
        title: "成功",
        description: `已${newStatus ? '启用' : '禁用'}用户 ${user.name || user.email}`
      });
    } catch (error) {
      console.error("更新用户状态失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "操作失败，请稍后再试",
        variant: "destructive",
      });
    }
  }

  // 删除用户确认
  function handleDeleteConfirm(userId: string) {
    if (confirm(`确定要删除此用户吗？此操作不可撤销。`)) {
      handleDeleteUser(userId);
    }
  }

  // 根据状态获取标签样式
  function getStatusBadge(status: string) {
    switch(status) {
      case "approved":
        return <Badge variant="default">已审核</Badge>;
      case "pending":
        return <Badge variant="secondary">待审核</Badge>;
      case "rejected":
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
        
        {hasPermission(AdminPermission.ADMIN_ACCESS) && (
          <Button onClick={handleAddUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            添加用户
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>
            管理系统用户及其权限
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名或邮箱..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="筛选角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>审核状态</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          没有找到符合条件的用户
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name || "未设置昵称"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length === 0 ? (
                                <span className="text-sm text-muted-foreground">无角色</span>
                              ) : (
                                user.roles.map((role) => (
                                  <Badge key={role.id} variant="outline">
                                    {role.name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "正常" : "已禁用"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status || "approved")}
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {user.status === "pending" && hasPermission(AdminPermission.ADMIN_ACCESS) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveUser(user.id)}
                                    className="gap-1"
                                  >
                                    <Check className="h-4 w-4" />
                                    批准
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectUser(user.id)}
                                    className="gap-1 text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                    拒绝
                                  </Button>
                                </>
                              )}
                              {hasPermission(AdminPermission.ADMIN_ACCESS) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission(AdminPermission.ADMIN_ACCESS) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUserStatusToggle(user)}
                                  className="h-8 w-8 p-0"
                                  title={user.isActive ? "禁用用户" : "启用用户"}
                                >
                                  {user.isActive ? (
                                    <UserMinus className="h-4 w-4" />
                                  ) : (
                                    <UserCog className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {hasPermission(AdminPermission.ADMIN_ACCESS) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteConfirm(user.id)}
                                  className="h-8 w-8 p-0 text-destructive"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  显示 {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} 条，共 {total} 条
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* 用户编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "编辑用户" : "添加用户"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "更新用户信息和权限设置" 
                : "创建新用户并设置初始权限"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">用户名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="请输入用户名"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                placeholder="请输入邮箱"
                disabled={isEditMode}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                密码 {isEditMode && <span className="text-xs text-muted-foreground">(留空表示不修改)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange("password", e.target.value)}
                placeholder={isEditMode ? "输入新密码" : "请输入密码"}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">审核状态</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => handleFormChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">已审核</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleFormChange("isActive", checked)}
              />
              <Label htmlFor="isActive">账户启用</Label>
            </div>
            
            <div className="space-y-2">
              <Label>用户角色</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={formData.roles.includes(role.id)}
                      onChange={() => handleRoleChange(role.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor={`role-${role.id}`} className="text-sm">
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUser}>
              {isEditMode ? "保存修改" : "创建用户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 