'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// 外部链接类型
type ExternalLink = {
  id: string;
  title: string;
  url: string;
  description?: string;
  type: string;
  password?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function FileLinksPage() {
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取所有活跃的链接
  useEffect(() => {
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
          title: '获取链接失败',
          description: '无法加载外部链接列表，请稍后再试。',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  // 复制提取码到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: '已复制到剪贴板',
        description: '提取码已成功复制到剪贴板。',
      });
    });
  };

  // 获取链接类型显示名称
  const getLinkTypeName = (type: string) => {
    switch (type) {
      case 'quark':
        return '夸克网盘';
      case 'baidu':
        return '百度网盘';
      default:
        return '其他';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">资源下载</h1>
            <p className="text-muted-foreground">这里提供各种资源文件的下载链接，点击链接即可跳转到对应的网盘页面。</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">正在加载资源列表...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-10 border rounded-md">
              <p className="text-muted-foreground">暂无可用的资源链接</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {links.map((link) => (
                <Card key={link.id} className="overflow-hidden flex flex-col h-full">
                  <CardHeader className="bg-muted/50 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                      <Badge variant="outline">{getLinkTypeName(link.type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-grow">
                    {link.description && (
                      <CardDescription className="text-sm mb-3">{link.description}</CardDescription>
                    )}
                    <div className="mt-3 text-sm">
                      <div className="flex items-center">
                        <span className="text-muted-foreground mr-2">链接地址:</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <span className="truncate max-w-[180px]">{link.url}</span>
                          <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                        </a>
                      </div>
                      {link.password && (
                        <div className="flex items-center mt-2">
                          <span className="text-muted-foreground mr-2">提取码:</span>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                            {link.password}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 ml-1"
                            onClick={() => copyToClipboard(link.password!)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/10 pt-3">
                    <Button
                      className="w-full"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        打开链接
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 