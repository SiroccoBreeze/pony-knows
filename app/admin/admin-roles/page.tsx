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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Plus, ShieldCheck, Shield, Trash2, Pencil, Users, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AdminPermission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 权限分组配置
const PERMISSION_GROUPS = [
  {
    id: "admin",
    name: "管理员基础权限",
    permissions: [AdminPermission.ADMIN_ACCESS],
  },
  {
    id: "users",
    name: "用户管理",
    permissions: [
      AdminPermission.VIEW_USERS,
      AdminPermission.CREATE_USER,
      AdminPermission.EDIT_USER,
      AdminPermission.DELETE_USER,
    ],
  },
  {
    id: "roles",
    name: "角色管理",
    permissions: [
      AdminPermission.VIEW_ROLES,
      AdminPermission.CREATE_ROLE,
      AdminPermission.EDIT_ROLE,
      AdminPermission.DELETE_ROLE,
    ],
  },
  {
    id: "posts",
    name: "帖子管理",
    permissions: [
      AdminPermission.VIEW_POSTS,
      AdminPermission.CREATE_POST,
      AdminPermission.EDIT_POST,
      AdminPermission.DELETE_POST,
    ],
  },
  {
    id: "comments",
    name: "评论管理",
    permissions: [
      AdminPermission.VIEW_COMMENTS,
      AdminPermission.EDIT_COMMENT,
      AdminPermission.DELETE_COMMENT,
    ],
  },
  {
    id: "files",
    name: "文件管理",
    permissions: [
      AdminPermission.VIEW_FILES,
      AdminPermission.UPLOAD_FILE,
      AdminPermission.DELETE_FILE,
    ],
  },
  {
    id: "links",
    name: "外部链接管理",
    permissions: [
      AdminPermission.VIEW_LINKS,
      AdminPermission.CREATE_LINK,
      AdminPermission.EDIT_LINK,
      AdminPermission.DELETE_LINK,
    ],
  },
  {
    id: "notifications",
    name: "通知管理",
    permissions: [
      AdminPermission.VIEW_NOTIFICATIONS,
      AdminPermission.CREATE_NOTIFICATION,
    ],
  },
  {
    id: "settings",
    name: "系统设置",
    permissions: [
      AdminPermission.VIEW_SETTINGS,
      AdminPermission.EDIT_SETTINGS,
    ],
  },
  {
    id: "logs",
    name: "日志管理",
    permissions: [AdminPermission.VIEW_LOGS],
  },
];

// 获取权限显示名称
function getPermissionName(permission: string): string {
  switch (permission) {
    // 基础权限
    case AdminPermission.ADMIN_ACCESS: return "管理后台访问";
    
    // 用户管理
    case AdminPermission.VIEW_USERS: return "查看用户";
    case AdminPermission.CREATE_USER: return "创建用户";
    case AdminPermission.EDIT_USER: return "编辑用户";
    case AdminPermission.DELETE_USER: return "删除用户";
    
    // 角色管理
    case AdminPermission.VIEW_ROLES: return "查看角色";
    case AdminPermission.CREATE_ROLE: return "创建角色";
    case AdminPermission.EDIT_ROLE: return "编辑角色";
    case AdminPermission.DELETE_ROLE: return "删除角色";
    
    // 帖子管理
    case AdminPermission.VIEW_POSTS: return "查看帖子";
    case AdminPermission.CREATE_POST: return "创建帖子";
    case AdminPermission.EDIT_POST: return "编辑帖子";
    case AdminPermission.DELETE_POST: return "删除帖子";
    
    // 评论管理
    case AdminPermission.VIEW_COMMENTS: return "查看评论";
    case AdminPermission.EDIT_COMMENT: return "编辑评论";
    case AdminPermission.DELETE_COMMENT: return "删除评论";
    
    // 文件管理
    case AdminPermission.VIEW_FILES: return "查看文件";
    case AdminPermission.UPLOAD_FILE: return "上传文件";
    case AdminPermission.DELETE_FILE: return "删除文件";
    
    // 外部链接管理
    case AdminPermission.VIEW_LINKS: return "查看链接";
    case AdminPermission.CREATE_LINK: return "创建链接";
    case AdminPermission.EDIT_LINK: return "编辑链接";
    case AdminPermission.DELETE_LINK: return "删除链接";
    
    // 通知管理
    case AdminPermission.VIEW_NOTIFICATIONS: return "查看通知";
    case AdminPermission.CREATE_NOTIFICATION: return "发送通知";
    
    // 系统设置
    case AdminPermission.VIEW_SETTINGS: return "查看设置";
    case AdminPermission.EDIT_SETTINGS: return "编辑设置";
    
    // 日志管理
    case AdminPermission.VIEW_LOGS: return "查看日志";
    
    default: return permission;
  }
}

// 角色类型定义
interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

// 表单初始状态
const initialFormState = {
  id: "",
  name: "",
  description: "",
  permissions: [] as string[],
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();
  const { hasPermission } = useAuthPermissions();
  
  // 加载角色数据
  useEffect(() => {
    fetchRoles();
  }, []);
  
  // 获取角色列表
  async function fetchRoles() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/admin-roles");
      
      if (!response.ok) {
        throw new Error("获取管理员角色列表失败");
      }
      
      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("获取角色数据失败:", error);
      toast({
        title: "错误",
        description: "获取管理员角色数据失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // 打开角色创建对话框
  function handleCreateRole() {
    setFormData(initialFormState);
    setIsEditMode(false);
    setIsDialogOpen(true);
  }
  
  // 打开角色编辑对话框
  async function handleEditRole(roleId: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/admin-roles/${roleId}`);
      
      if (!response.ok) {
        throw new Error("获取角色详情失败");
      }
      
      const roleData = await response.json();
      
      setFormData({
        id: roleData.id,
        name: roleData.name,
        description: roleData.description || "",
        permissions: roleData.permissions,
      });
      
      setIsEditMode(true);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("获取角色详情失败:", error);
      toast({
        title: "错误",
        description: "获取角色详情失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // 打开删除确认对话框
  function handleDeleteConfirm(roleId: string) {
    setDeleteRoleId(roleId);
    setIsDeleteDialogOpen(true);
  }
  
  // 执行删除角色
  async function handleDeleteRole() {
    if (!deleteRoleId) return;
    
    try {
      const response = await fetch(`/api/admin/admin-roles/${deleteRoleId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除角色失败");
      }
      
      toast({
        title: "成功",
        description: "角色已删除",
      });
      
      // 刷新角色列表
      fetchRoles();
    } catch (error) {
      console.error("删除角色失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除角色失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteRoleId(null);
    }
  }
  
  // 表单提交处理
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      // 验证必填字段
      if (!formData.name) {
        toast({
          title: "错误",
          description: "角色名称不能为空",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.permissions.length === 0) {
        toast({
          title: "错误",
          description: "请至少选择一项权限",
          variant: "destructive",
        });
        return;
      }
      
      const url = isEditMode
        ? `/api/admin/admin-roles/${formData.id}`
        : "/api/admin/admin-roles";
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
          type: "admin", // 标记为管理员角色
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存角色失败");
      }
      
      toast({
        title: "成功",
        description: isEditMode ? "角色已更新" : "角色已创建",
      });
      
      // 关闭对话框并刷新角色列表
      setIsDialogOpen(false);
      fetchRoles();
    } catch (error) {
      console.error("保存角色失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "保存角色失败，请稍后再试",
        variant: "destructive",
      });
    }
  }
  
  // 处理权限复选框变化
  function handlePermissionChange(permission: string, checked: boolean) {
    setFormData((prev) => {
      const permissions = [...prev.permissions];
      
      if (checked) {
        permissions.push(permission);
      } else {
        const index = permissions.indexOf(permission);
        if (index !== -1) {
          permissions.splice(index, 1);
        }
      }
      
      return {
        ...prev,
        permissions,
      };
    });
  }
  
  // 处理分组权限全选/取消全选
  function handleGroupPermissionChange(groupPermissions: string[], checked: boolean) {
    setFormData((prev) => {
      let permissions = [...prev.permissions];
      
      if (checked) {
        // 添加分组中的所有权限（如果尚未添加）
        groupPermissions.forEach((permission) => {
          if (!permissions.includes(permission)) {
            permissions.push(permission);
          }
        });
      } else {
        // 移除分组中的所有权限
        permissions = permissions.filter(
          (permission) => !groupPermissions.includes(permission)
        );
      }
      
      return {
        ...prev,
        permissions,
      };
    });
  }
  
  // 过滤角色
  const filteredRoles = searchQuery
    ? roles.filter(
        (role) =>
          role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : roles;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">管理员角色管理</h1>
        
        {hasPermission(AdminPermission.CREATE_ROLE) && (
          <Button onClick={handleCreateRole}>
            <Plus className="mr-2 h-4 w-4" />
            添加角色
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>管理员角色列表</CardTitle>
          <CardDescription>
            管理系统管理员角色和权限，控制后台功能的访问权限
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索角色..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-40" />
              <h3 className="text-lg font-medium">暂无角色数据</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? "没有找到匹配的角色" : "系统中还没有创建任何管理员角色"}
              </p>
              {hasPermission(AdminPermission.CREATE_ROLE) && !searchQuery && (
                <Button className="mt-4" onClick={handleCreateRole}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加第一个角色
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>权限数</TableHead>
                    <TableHead>用户数</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-primary" />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell>{role.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role.permissions.length} 项权限
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{role.userCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {hasPermission(AdminPermission.EDIT_ROLE) && (
                              <DropdownMenuItem onClick={() => handleEditRole(role.id)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                编辑角色
                              </DropdownMenuItem>
                            )}
                            {hasPermission(AdminPermission.DELETE_ROLE) && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteConfirm(role.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除角色
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 角色编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "编辑管理员角色" : "创建管理员角色"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "修改管理员角色信息和权限配置"
                : "创建新的管理员角色并配置权限"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="required">
                  角色名称
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">
                  角色描述
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="请输入角色描述（可选）"
                  rows={2}
                />
              </div>
              
              <div className="grid gap-2 pt-4">
                <Label className="required">权限配置</Label>
                <div className="border rounded-md p-4 space-y-6">
                  {PERMISSION_GROUPS.map((group) => {
                    // 判断分组是否全选
                    const isGroupChecked =
                      group.permissions.length > 0 &&
                      group.permissions.every((perm) =>
                        formData.permissions.includes(perm)
                      );
                    
                    // 判断分组是否部分选中
                    const isGroupIndeterminate =
                      !isGroupChecked &&
                      group.permissions.some((perm) =>
                        formData.permissions.includes(perm)
                      );
                    
                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={isGroupChecked}
                            data-indeterminate={isGroupIndeterminate}
                            className={
                              isGroupIndeterminate
                                ? "bg-primary/50 text-primary-foreground"
                                : ""
                            }
                            onCheckedChange={(checked) =>
                              handleGroupPermissionChange(
                                group.permissions,
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor={`group-${group.id}`}
                            className="text-base font-medium"
                          >
                            {group.name}
                          </Label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6 pt-2">
                          {group.permissions.map((permission) => (
                            <div
                              key={permission}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={permission}
                                checked={formData.permissions.includes(
                                  permission
                                )}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    permission,
                                    checked as boolean
                                  )
                                }
                              />
                              <Label
                                htmlFor={permission}
                                className="text-sm font-normal"
                              >
                                {getPermissionName(permission)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit">
                {isEditMode ? "保存修改" : "创建角色"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该管理员角色，且无法恢复。若有用户正在使用此角色，则无法删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 