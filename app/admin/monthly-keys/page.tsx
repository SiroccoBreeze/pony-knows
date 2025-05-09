"use client";

import { useState, useEffect } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Clipboard, RotateCcw, Unlock, LockOpen } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface KeyStatus {
  verified: boolean;
  lastVerifiedAt: string | null;
  attempts: number;
  maxAttempts: number;
  isLocked: boolean;
  lockedUntil: string | null;
}

interface UserKeyInfo {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  currentMonthKey: string;
  keyStatus: KeyStatus;
}

interface Period {
  year: number;
  month: number;
}

export default function MonthlyKeysPage() {
  const [users, setUsers] = useState<UserKeyInfo[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBatchUnlockDialog, setShowBatchUnlockDialog] = useState(false);
  const [batchUnlocking, setBatchUnlocking] = useState(false);
  const { toast } = useToast();

  // 加载用户密钥数据
  const loadUserKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/monthly-key/admin");
      
      if (!response.ok) {
        throw new Error("获取用户密钥数据失败");
      }
      
      const data = await response.json();
      setUsers(data.users);
      setPeriod(data.currentPeriod);
      setMaxAttempts(data.maxAttempts || 3);
      // 清空选择
      setSelectedUsers([]);
    } catch (error) {
      toast({
        title: "错误",
        description: "加载用户密钥数据失败",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 复制密钥到剪贴板
  const copyKeyToClipboard = async (key: string, userName: string | null) => {
    try {
      await navigator.clipboard.writeText(key);
      toast({
        title: "已复制",
        description: `已复制${userName || "用户"}的密钥到剪贴板`,
      });
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      });
    }
  };

  // 解锁用户密钥
  const unlockUserKey = async (userId: string, userName: string | null) => {
    try {
      setUnlocking(userId);
      
      const response = await fetch("/api/auth/monthly-key/admin/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "解锁失败");
      }
      
      // 不需要解析响应内容
      await response.json();
      
      toast({
        title: "解锁成功",
        description: `已解锁${userName || "用户"}的密钥并重置验证状态，用户需要重新验证密钥`,
        variant: "default",
      });
      
      // 刷新数据
      await loadUserKeys();
    } catch (error) {
      toast({
        title: "解锁失败",
        description: error instanceof Error ? error.message : "无法解锁用户密钥",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setUnlocking(null);
    }
  };

  // 批量解锁用户密钥
  const batchUnlockUserKeys = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      setBatchUnlocking(true);
      
      // 依次解锁选中的用户
      let successCount = 0;
      let failCount = 0;
      
      for (const userId of selectedUsers) {
        try {
          const response = await fetch("/api/auth/monthly-key/admin/unlock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          });
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      
      // 关闭对话框
      setShowBatchUnlockDialog(false);
      
      // 显示结果通知
      if (successCount > 0) {
        toast({
          title: "批量解锁完成",
          description: `成功解锁 ${successCount} 个用户${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
          variant: failCount > 0 ? "default" : "default",
        });
      } else if (failCount > 0) {
        toast({
          title: "批量解锁失败",
          description: `所有 ${failCount} 个用户解锁操作均失败`,
          variant: "destructive",
        });
      }
      
      // 刷新数据
      await loadUserKeys();
    } catch (error) {
      toast({
        title: "批量解锁失败",
        description: "操作过程中发生错误",
        variant: "destructive",
      });
      console.error(error);
      setShowBatchUnlockDialog(false);
    } finally {
      setBatchUnlocking(false);
    }
  };

  // 切换选择用户
  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prevSelected => {
      if (prevSelected.includes(userId)) {
        return prevSelected.filter(id => id !== userId);
      } else {
        return [...prevSelected, userId];
      }
    });
  };

  // 选择所有锁定的用户
  const selectAllLockedUsers = () => {
    const lockedUserIds = users
      .filter(user => user.keyStatus.isLocked)
      .map(user => user.id);
    setSelectedUsers(lockedUserIds);
  };

  // 取消所有选择
  const clearSelection = () => {
    setSelectedUsers([]);
  };

  // 刷新数据
  const refreshData = () => {
    setRefreshing(true);
    loadUserKeys();
  };

  // 计算剩余锁定时间
  const getRemainingLockTime = (lockedUntil: string) => {
    const lockDate = new Date(lockedUntil);
    const now = new Date();
    const diffMs = lockDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return "已过期";
    
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    return `${diffMins} 分钟`;
  };

  // 首次加载
  useEffect(() => {
    loadUserKeys();
  }, []);

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>用户月度密钥管理</CardTitle>
              <CardDescription>
                查看和管理所有用户的月度密钥信息
                {period && (
                  <span className="ml-2">
                    当前周期: {period.year}年{period.month}月
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={refreshData} 
              disabled={refreshing || loading}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {refreshing ? "刷新中..." : "刷新"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-2">加载中...</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                          onChange={() => {
                            if (selectedUsers.length === users.length) {
                              setSelectedUsers([]);
                            } else {
                              setSelectedUsers(users.map(user => user.id));
                            }
                          }}
                        />
                      </div>
                    </TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>当前月密钥</TableHead>
                    <TableHead className="text-center">验证状态</TableHead>
                    <TableHead className="text-center">尝试次数</TableHead>
                    <TableHead className="text-center">锁定状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        暂无用户数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className={selectedUsers.includes(user.id) ? "bg-muted/30" : ""}>
                        <TableCell className="pr-0">
                          <div className="flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => toggleSelectUser(user.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{user.name || "未设置姓名"}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="p-1 bg-muted rounded text-sm">
                              {user.currentMonthKey}
                            </code>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyKeyToClipboard(user.currentMonthKey, user.name)}
                                  >
                                    <Clipboard className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>复制密钥</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {user.keyStatus.verified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                              已验证
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-50">
                              未验证
                            </Badge>
                          )}
                          {user.keyStatus.lastVerifiedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              最后验证: {format(new Date(user.keyStatus.lastVerifiedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.keyStatus.attempts} / {maxAttempts}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.keyStatus.isLocked ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
                                已锁定
                              </Badge>
                              {user.keyStatus.lockedUntil && (
                                <div className="text-xs text-muted-foreground">
                                  剩余时间: {getRemainingLockTime(user.keyStatus.lockedUntil)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                              正常
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={user.keyStatus.isLocked ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => unlockUserKey(user.id, user.name)}
                                  disabled={unlocking === user.id}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  {user.keyStatus.isLocked ? (
                                    <Unlock className="h-3 w-3" />
                                  ) : (
                                    <LockOpen className="h-3 w-3" />
                                  )}
                                  {unlocking === user.id ? "处理中..." : (user.keyStatus.isLocked ? "解除锁定" : "重置状态")}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {user.keyStatus.isLocked 
                                    ? "解除用户密钥锁定并重置尝试次数" 
                                    : "重置用户密钥验证状态和尝试次数"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedUsers.length} 个用户
            </span>
            {selectedUsers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                清除选择
              </Button>
            )}
            {users.filter(u => u.keyStatus.isLocked).length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAllLockedUsers}>
                选择所有锁定用户
              </Button>
            )}
          </div>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setShowBatchUnlockDialog(true)}
            disabled={selectedUsers.length === 0}
            className="flex items-center gap-2"
          >
            <LockOpen className="h-4 w-4" />
            批量解除锁定 ({selectedUsers.length})
          </Button>
        </CardFooter>
      </Card>

      {/* 批量解锁确认对话框 */}
      <AlertDialog open={showBatchUnlockDialog} onOpenChange={setShowBatchUnlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量解除密钥锁定</AlertDialogTitle>
            <AlertDialogDescription>
              确定要为选中的 {selectedUsers.length} 个用户解除密钥锁定并重置尝试次数吗？
              此操作将允许这些用户立即重新进行密钥验证。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchUnlocking}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // 防止对话框自动关闭
                batchUnlockUserKeys();
              }}
              disabled={batchUnlocking}
              className="flex items-center gap-2"
            >
              {batchUnlocking && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {batchUnlocking ? "处理中..." : "确认解锁"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 