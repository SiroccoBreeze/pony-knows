import { NextcloudFileManager } from '@/components/NextcloudFileManager';

export default function NextcloudServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Nextcloud 文件管理</h1>
            <p className="text-muted-foreground">在这里管理你的 Nextcloud 文件，支持文件上传、下载和文件夹浏览</p>
          </div>
          <div className="bg-card rounded-lg shadow-lg p-6">
            <NextcloudFileManager />
          </div>
        </div>
      </div>
    </div>
  );
} 