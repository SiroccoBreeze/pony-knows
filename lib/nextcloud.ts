import { createClient } from 'webdav';

class NextcloudService {
  private client: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient(
      `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USERNAME}`,
      {
        username: process.env.NEXTCLOUD_USERNAME,
        password: process.env.NEXTCLOUD_APP_PASSWORD,
      }
    );
  }

  // 获取文件列表
  async listFiles(path: string = '/') {
    try {
      return await this.client.getDirectoryContents(path);
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // 上传文件
  async uploadFile(file: File, path: string) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return await this.client.putFileContents(path, arrayBuffer);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // 下载文件
  async downloadFile(path: string) {
    try {
      return await this.client.getFileContents(path, { format: 'binary' });
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // 创建文件夹
  async createFolder(path: string) {
    try {
      return await this.client.createDirectory(path);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // 删除文件或文件夹
  async delete(path: string) {
    try {
      return await this.client.deleteFile(path);
    } catch (error) {
      console.error('Error deleting:', error);
      throw error;
    }
  }
}

export const nextcloudService = new NextcloudService(); 