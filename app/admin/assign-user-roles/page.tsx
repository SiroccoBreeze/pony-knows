"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useAuthPermissions } from "@/hooks/use-auth-permissions";
import { AdminPermission } from "@/lib/permissions";
import { Search, User, Check, X, Shield } from "lucide-react";
import { RestrictedRoute } from "@/components/restricted-route";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RestrictAccess } from "@/components/ui/restrict-access";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";

// 用户类型定义
interface UserType {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roles: RoleAssignment[];
}

// 角色类型定义
interface RoleType {
  id: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
}

// 用户角色分配
interface RoleAssignment {
  id: string;
  roleId: string;
  role: {
    id: string;
    name: string;
    description: string | null;
    isAdmin: boolean;
  }
}

export default function AssignUserRolesPage() {
  // 页面状态
  const [users, setUsers] = useState<UserType[]>([]);
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [adminRoles, setAdminRoles] = useState<RoleType[]>([]);
  const [userRoles, setUserRoles] = useState<RoleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
  
  const { hasPermission } = useAuthPermissions();
  const { toast } = useToast();

  // 获取用户和角色数据
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // 获取用户列表
        const usersResponse = await fetch("/api/admin/users?limit=100");
        if (!usersResponse.ok) throw new Error("获取用户列表失败");
        const usersData = await usersResponse.json();
        
        // 获取所有角色
        const rolesResponse = await fetch("/api/admin/roles/all");
        if (!rolesResponse.ok) throw new Error("获取角色列表失败");
        const rolesData = await rolesResponse.json();
        
        // 验证API返回的数据格式
        if (!Array.isArray(rolesData)) {
          console.error("角色数据格式错误: 不是数组", rolesData);
          toast({
            title: "数据格式错误",
            description: "角色数据格式不正确，请联系管理员",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        console.log("API返回的角色数据:", rolesData.slice(0, 2)); // 只显示前两个角色，避免日志过长
        
        // 检查角色数据格式，确保每个角色都有isAdmin属性
        if (rolesData.length > 0 && typeof rolesData[0].isAdmin === 'undefined') {
          console.error("角色数据格式错误: isAdmin 属性缺失", rolesData[0]);
          // 添加 isAdmin 属性
          rolesData.forEach((role: { name: string; permissions?: string[]; isAdmin?: boolean }) => {
            if (typeof role.isAdmin === 'undefined') {
              // 检查角色权限中是否包含admin_access权限
              role.isAdmin = Array.isArray(role.permissions) && 
                             role.permissions.includes("admin_access");
              
              console.log(`为角色 ${role.name} 添加isAdmin属性:`, role.isAdmin);
            }
          });
        }
        
        // 区分管理员角色和普通用户角色
        const adminRolesList = rolesData.filter((role: { isAdmin?: boolean }) => 
          Boolean(role?.isAdmin)
        );
        const userRolesList = rolesData.filter((role: { isAdmin?: boolean }) => 
          !Boolean(role?.isAdmin)
        );
        
        console.log(`解析后角色数量: 管理员=${adminRolesList.length}, 用户=${userRolesList.length}`);
        
        setUsers(usersData.users || []);
        setAllRoles(rolesData);
        setAdminRoles(adminRolesList);
        setUserRoles(userRolesList);
      } catch (error) {
        console.error("获取数据失败:", error);
        toast({
          title: "获取数据失败",
          description: "无法加载用户和角色数据，请刷新页面重试",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [toast]);

  // 根据搜索查询过滤用户
  const filteredUsers = searchQuery 
    ? users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  // 打开角色分配对话框
  const handleAssignRoles = (user: UserType) => {
    setSelectedUser(user);
    // 获取当前用户已分配的角色ID
    const currentRoleIds = user.roles.map(r => r.role.id);
    setAssignedRoleIds(currentRoleIds);
    setShowDialog(true);
  };

  // 处理角色勾选变化
  const handleRoleCheckChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setAssignedRoleIds(prev => [...prev, roleId]);
    } else {
      setAssignedRoleIds(prev => prev.filter(id => id !== roleId));
    }
  };

  // 保存角色分配
  const handleSaveRoleAssignments = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleIds: assignedRoleIds }),
      });

      if (!response.ok) {
        throw new Error("保存角色分配失败");
      }

      // 更新界面上的用户角色
      const updatedUsers = users.map(user => {
        if (user.id === selectedUser.id) {
          // 创建新的角色分配对象
          const newRoles = assignedRoleIds.map(roleId => {
            const role = allRoles.find(r => r.id === roleId);
            return {
              id: `${selectedUser.id}-${roleId}`, // 临时ID
              roleId,
              role: {
                id: roleId,
                name: role?.name || "未知角色",
                description: role?.description || null,
                // 确保isAdmin始终为布尔值，即使role不存在或role.isAdmin是undefined
                isAdmin: role ? Boolean(role.isAdmin) : false
              }
            };
          });
          
          return {
            ...user,
            roles: newRoles
          };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      setShowDialog(false);
      
      toast({
        title: "角色分配成功",
        description: `已更新用户 ${selectedUser.name} 的角色设置`,
        duration: 3000,
      });
    } catch (error) {
      console.error("保存角色分配失败:", error);
      toast({
        title: "保存失败",
        description: "无法保存角色分配，请重试",
        variant: "destructive",
      });
    }
  };

  return (
    <RestrictedRoute 
      permission={[AdminPermission.VIEW_USERS, AdminPermission.EDIT_USER]}
      requireAll={true}
      redirectTo="/admin"
      loadingMessage="验证权限中..."
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">用户角色分配</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              分配和管理用户的角色与权限
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="py-4 text-center text-muted-foreground">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="mt-2">加载用户数据中...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery ? "没有找到匹配的用户" : "暂无用户数据"}
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">用户名</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">电子邮箱</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">已分配角色</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-primary" />
                            {user.name || "未设置姓名"}
                          </div>
                        </td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {user.roles.length === 0 ? (
                              <span className="text-sm text-muted-foreground">无角色</span>
                            ) : (
                              user.roles.map((roleAssignment) => (
                                <Badge key={roleAssignment.id} variant={roleAssignment.role.isAdmin ? "default" : "outline"}>
                                  {roleAssignment.role.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <RestrictAccess permission={AdminPermission.EDIT_USER}>
                            <Button size="sm" onClick={() => handleAssignRoles(user)}>
                              分配角色
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
      
      {/* 角色分配对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>分配角色</DialogTitle>
            <DialogDescription>
              为用户 <strong>{selectedUser?.name || "未指定用户"}</strong> 分配角色和权限
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="user-roles">
            <TabsList className="mb-4">
              <TabsTrigger value="user-roles">用户角色</TabsTrigger>
              <TabsTrigger value="admin-roles">管理员角色</TabsTrigger>
            </TabsList>
            
            <TabsContent value="user-roles" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                用户角色控制前台功能访问权限，包括论坛、服务和资源访问权限
              </div>
              
              <ScrollArea className="max-h-[40vh]">
                <div className="space-y-4">
                  {userRoles.map((role) => (
                    <div key={role.id} className="flex items-start space-x-3 py-2">
                      <Checkbox 
                        id={`role-${role.id}`}
                        checked={assignedRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => handleRoleCheckChange(role.id, !!checked)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor={`role-${role.id}`} className="font-medium">
                          {role.name}
                        </Label>
                        {role.description && (
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="admin-roles" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                管理员角色具有后台管理权限，请谨慎分配
              </div>
              
              <RestrictAccess permission={AdminPermission.CREATE_ROLE}>
                <ScrollArea className="max-h-[40vh]">
                  <div className="space-y-4">
                    {adminRoles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-3 py-2">
                        <Checkbox 
                          id={`role-${role.id}`}
                          checked={assignedRoleIds.includes(role.id)}
                          onCheckedChange={(checked) => handleRoleCheckChange(role.id, !!checked)}
                        />
                        <div className="space-y-1">
                          <Label htmlFor={`role-${role.id}`} className="font-medium flex items-center">
                            <Shield className="h-4 w-4 mr-1 text-primary" />
                            {role.name}
                          </Label>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </RestrictAccess>
              
              <RestrictAccess permission={AdminPermission.CREATE_ROLE} requireAll={false}>
                <div className="p-4 bg-muted/50 rounded-md text-center">
                  <p className="text-muted-foreground">您没有分配管理员角色的权限</p>
                </div>
              </RestrictAccess>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveRoleAssignments}>
              保存角色设置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestrictedRoute>
  );
} 