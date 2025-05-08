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
import { MoreHorizontal, Plus, ShieldCheck, Shield, Trash2, Pencil, Users, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AdminPermission, UserPermission } from "@/lib/permissions";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RestrictedRoute } from "@/components/restricted-route";

// 权限分组配置
const PERMISSION_GROUPS: {
  id: string;
  name: string;
  permissions: string[];
}[] = [
  {
    id: "admin",
    name: "管理员权限",
    permissions: [
      AdminPermission.ADMIN_ACCESS,
    ],
  },
  {
    id: "forum",
    name: "论坛权限",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.CREATE_TOPIC,
    ],
  },
  {
    id: "services",
    name: "服务与资源权限",
    permissions: [
      UserPermission.VIEW_SERVICES,
      UserPermission.ACCESS_FILE_DOWNLOADS,
      UserPermission.ACCESS_DATABASE,
      UserPermission.ACCESS_MINIO,
    ],
  },
  {
    id: "working_papers",
    name: "实施底稿权限",
    permissions: [
      UserPermission.ACCESS_WORKING_PAPERS,
    ],
  },
  {
    id: "personal",
    name: "个人中心权限",
    permissions: [
      UserPermission.VIEW_PROFILE,
    ],
  },
];

// 获取系统支持的所有权限列表
const ALL_VALID_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => group.permissions);

// 获取权限显示名称
function getPermissionName(permission: string): string {
  switch (permission) {
    // 论坛权限
    case UserPermission.VIEW_FORUM: return "查看论坛内容";
    case UserPermission.CREATE_TOPIC: return "创建主题帖";
    
    // 服务与资源权限
    case UserPermission.VIEW_SERVICES: return "查看服务页面";
    case UserPermission.ACCESS_FILE_DOWNLOADS: return "访问文件下载页面";
    case UserPermission.ACCESS_DATABASE: return "访问数据库结构";
    case UserPermission.ACCESS_MINIO: return "访问网盘服务";
    
    // 实施底稿权限
    case UserPermission.ACCESS_WORKING_PAPERS: return "访问实施底稿";
    
    // 个人中心权限
    case UserPermission.VIEW_PROFILE: return "查看个人资料";
    
    // 管理员权限
    case AdminPermission.ADMIN_ACCESS: return "管理员访问权限";
    
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

export default function UserRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [isEditMode, setIsEditMode] = useState(false);
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
      const response = await fetch("/api/admin/user-roles");
      
      if (!response.ok) {
        throw new Error("获取用户角色列表失败");
      }
      
      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("获取角色数据失败:", error);
      toast({
        title: "错误",
        description: "获取用户角色数据失败，请稍后再试",
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
      const response = await fetch(`/api/admin/user-roles/${roleId}`);
      
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
  
  // 打开删除确认对话框并执行删除
  async function handleDeleteRole(roleId: string) {
    if (isLoading) return;
    
    // 使用浏览器原生的确认对话框
    const confirmed = window.confirm("确认删除该角色？此操作将永久删除该用户角色，且无法恢复。若有用户正在使用此角色，则无法删除。");
    
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/user-roles/${roleId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "删除角色失败");
      }
      
      // 更新本地状态
      setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));
      
      // 显示成功通知
      toast({
        title: "成功",
        description: "角色已删除",
      });
    } catch (error) {
      console.error("删除角色失败:", error);
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除角色失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      
      // 过滤权限，只保留有效的权限
      const validPermissions = formData.permissions.filter(
        perm => ALL_VALID_PERMISSIONS.includes(perm)
      );
      
      if (validPermissions.length !== formData.permissions.length) {
        console.warn('过滤掉了无效权限:', 
          formData.permissions.filter(p => !validPermissions.includes(p))
        );
      }
      
      const url = isEditMode
        ? `/api/admin/user-roles/${formData.id}`
        : "/api/admin/user-roles";
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: validPermissions,
          type: "user", // 标记为用户角色
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
      
      // 关闭对话框并直接更新本地状态
      setIsDialogOpen(false);
      
      if (isEditMode) {
        // 更新现有角色
        const updatedData = await response.json();
        const updatedRole = updatedData.role || updatedData;
        
        setRoles(roles.map(role => 
          role.id === formData.id ? { 
            ...updatedRole,
            userCount: role.userCount || 0 // 保留原有的用户数量数据
          } : role
        ));
      } else {
        // 添加新角色
        const newData = await response.json();
        const newRole = newData.role || newData;
        
        // 确保新角色有完整的数据结构
        const roleToAdd = {
          ...newRole,
          userCount: 0, // 新角色默认没有用户
          permissions: newRole.permissions || [],
        };
        
        setRoles([roleToAdd, ...roles]);
      }
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
        if (!permissions.includes(permission)) {
          permissions.push(permission);
        }
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
        // 添加分组中的所有权限
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
    <RestrictedRoute 
      permission={AdminPermission.ADMIN_ACCESS}
      redirectTo="/admin"
      loadingMessage="验证管理员权限中..."
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">用户角色管理</h1>
          
          <Button onClick={handleCreateRole}>
            <Plus className="mr-2 h-4 w-4" />
            添加角色
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>用户角色列表</CardTitle>
            <CardDescription>
              管理系统用户角色和权限，控制前台功能的访问权限
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
                  {searchQuery ? "没有找到匹配的角色" : "系统中还没有创建任何用户角色"}
                </p>
                {hasPermission(AdminPermission.ADMIN_ACCESS) && !searchQuery && (
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
                              <DropdownMenuItem onClick={() => handleEditRole(role.id)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                编辑角色
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除角色
                              </DropdownMenuItem>
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
                {isEditMode ? "编辑用户角色" : "创建用户角色"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "修改用户角色信息和权限配置"
                  : "创建新的用户角色并配置权限"}
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
      </div>
    </RestrictedRoute>
  );
} 