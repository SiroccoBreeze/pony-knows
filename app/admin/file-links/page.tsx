'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ExternalLink as ExternalLinkType } from '@/app/api/file-links/route';
import { RestrictedRoute } from '@/components/restricted-route';
import { AdminPermission } from '@/lib/permissions';

// 模态框表单初始状态
const initialFormState = {
  title: '',
  url: '',
  description: '',
  type: 'quark',
  password: '',
  isActive: true,
};

export default function FileLinksPage() {
  // 状态定义
  const [links, setLinks] = useState<ExternalLinkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // 获取所有链接
  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/file-links');
      if (!response.ok) throw new Error('获取链接失败');
      const data = await response.json();
      setLinks(data);
    } catch (error) {
      console.error('获取链接错误:', error);
      toast({
        title: '错误',
        description: '获取链接列表失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchLinks();
  }, []);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId
        ? `/api/file-links/${editingId}`
        : '/api/file-links';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '操作失败');
      }

      toast({
        title: '成功',
        description: editingId ? '链接已更新' : '链接已创建',
      });
      setIsDialogOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchLinks();
    } catch (error) {
      console.error('提交表单错误:', error);
      toast({
        title: '错误',
        description: `${editingId ? '更新' : '创建'}链接失败`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理删除链接
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个链接吗？')) return;

    try {
      const response = await fetch(`/api/file-links/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      toast({
        title: '成功',
        description: '链接已删除',
      });
      
      // 直接更新本地状态，而不是重新获取
      setLinks(links.filter(link => link.id !== id));
    } catch (error) {
      console.error('删除链接错误:', error);
      toast({
        title: '错误',
        description: '删除链接失败',
        variant: 'destructive',
      });
    }
  };

  // 打开编辑对话框
  const handleEdit = (link: ExternalLinkType) => {
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      type: link.type,
      password: link.password || '',
      isActive: link.isActive,
    });
    setEditingId(link.id);
    setIsDialogOpen(true);
  };

  // 打开新建对话框
  const handleOpenDialog = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  return (
    <RestrictedRoute
      permission={AdminPermission.ADMIN_ACCESS}
      redirectTo="/admin"
      loadingMessage="验证管理员权限中..."
    >
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">外部链接管理</h1>
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            添加链接
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">加载中...</span>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-10 border rounded-md">
            <p className="text-muted-foreground">暂无外部链接数据</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenDialog}>
              添加第一个链接
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>链接</TableHead>
                <TableHead>提取码</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.title}</TableCell>
                  <TableCell>
                    {link.type === 'quark'
                      ? '夸克网盘'
                      : link.type === 'baidu'
                      ? '百度网盘'
                      : '其他'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center"
                    >
                      {link.url.substring(0, 30)}
                      {link.url.length > 30 ? '...' : ''}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </TableCell>
                  <TableCell>{link.password || '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        link.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {link.isActive ? '启用' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(link.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(link)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* 添加/编辑对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? '编辑外部链接' : '添加外部链接'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    标题
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">
                    链接URL
                  </Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="col-span-3"
                    required
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    描述
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="可选描述信息"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    类型
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="quark">夸克网盘</SelectItem>
                        <SelectItem value="baidu">百度网盘</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    提取码
                  </Label>
                  <Input
                    id="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="可选，如有提取码请填写"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isActive" className="text-right">
                    状态
                  </Label>
                  <div className="flex items-center col-span-3">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive" className="ml-2">
                      {formData.isActive ? '启用' : '禁用'}
                    </Label>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingId ? '更新' : '添加'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RestrictedRoute>
  );
} 