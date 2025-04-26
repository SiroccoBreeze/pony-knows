import * as Minio from 'minio';
import { Readable } from 'stream';

export interface FileItem {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  etag?: string;
}

class MinioService {
  private client: Minio.Client;
  private defaultBucket: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
    });
    this.defaultBucket = process.env.MINIO_DEFAULT_BUCKET || 'ponyknows';
  }

  // 确保默认存储桶存在
  async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.defaultBucket);
      if (!exists) {
        await this.client.makeBucket(this.defaultBucket, process.env.MINIO_REGION || '');
        console.log(`创建存储桶 ${this.defaultBucket} 成功`);
      }
    } catch (error) {
      console.error(`确保存储桶存在时出错: ${error}`);
      throw error;
    }
  }

  // 将路径格式化为不以/开头（MinIO不需要以/开头）
  private formatPath(path: string): string {
    // 移除开头的/
    return path.startsWith('/') ? path.substring(1) : path;
  }

  // 从路径中获取目录名
  private getDirectoryFromPath(path: string): string {
    const formattedPath = this.formatPath(path);
    const lastSlash = formattedPath.lastIndexOf('/');
    if (lastSlash === -1) return '';
    return formattedPath.substring(0, lastSlash + 1);
  }

  // 从路径中获取文件名
  private getFilenameFromPath(path: string): string {
    const formattedPath = this.formatPath(path);
    const lastSlash = formattedPath.lastIndexOf('/');
    if (lastSlash === -1) return formattedPath;
    return formattedPath.substring(lastSlash + 1);
  }

  // 获取文件和目录列表
  async listFiles(path: string = '/'): Promise<FileItem[]> {
    await this.ensureBucket();
    const formattedPath = this.formatPath(path);
    const prefix = formattedPath === '' ? '' : (formattedPath.endsWith('/') ? formattedPath : `${formattedPath}/`);
    
    try {
      // 获取所有对象
      const objects: Minio.BucketItem[] = [];
      const stream = this.client.listObjects(this.defaultBucket, prefix, true);
      
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj: any) => {
          if (obj.name) objects.push(obj as Minio.BucketItem);
        });
        stream.on('error', reject);
        stream.on('end', () => resolve());
      });

      // 处理文件和目录结构
      const files: FileItem[] = [];
      const directories = new Set<string>();
      
      // 找出当前目录下的所有文件
      objects.forEach(obj => {
        if (obj.name) {
          const relativePath = obj.name.substring(prefix.length);
          const parts = relativePath.split('/');
          
          if (parts.length > 1 && parts[0] !== '') {
            // 这是一个子目录中的文件，添加其父目录
            directories.add(parts[0]);
          } else if (parts[0] !== '') {
            // 这是当前目录下的文件
            files.push({
              filename: `/${obj.name}`,
              basename: parts[0],
              lastmod: obj.lastModified?.toISOString() || new Date().toISOString(),
              size: obj.size,
              type: 'file',
              etag: obj.etag
            });
          }
        }
      });
      
      // 添加目录
      directories.forEach(dir => {
        files.push({
          filename: `/${prefix}${dir}/`,
          basename: dir,
          lastmod: new Date().toISOString(),
          size: 0,
          type: 'directory'
        });
      });
      
      // 添加父目录（如果不在根目录）
      if (formattedPath !== '' && formattedPath !== '/') {
        const parentPath = this.getDirectoryFromPath(formattedPath.substring(0, formattedPath.length - 1));
        files.unshift({
          filename: `/${parentPath}`,
          basename: '..',
          lastmod: new Date().toISOString(),
          size: 0,
          type: 'directory'
        });
      }
      
      return files;
    } catch (error) {
      console.error(`列出文件时出错: ${error}`);
      throw error;
    }
  }

  // 上传文件
  async uploadFile(file: File, path: string): Promise<void> {
    await this.ensureBucket();
    const formattedPath = this.formatPath(path);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // 获取文件元数据
      const metaData = {
        'Content-Type': file.type,
        'Content-Length': buffer.length.toString()
      };
      
      await this.client.putObject(this.defaultBucket, formattedPath, buffer, buffer.length, metaData);
    } catch (error) {
      console.error(`上传文件时出错: ${error}`);
      throw error;
    }
  }

  // 下载文件
  async downloadFile(path: string): Promise<Buffer> {
    await this.ensureBucket();
    const formattedPath = this.formatPath(path);
    
    try {
      // 获取对象
      const dataStream = await this.client.getObject(this.defaultBucket, formattedPath);
      
      // 将流转换为Buffer
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        dataStream.on('data', (chunk) => chunks.push(chunk));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', reject);
      });
    } catch (error) {
      console.error(`下载文件时出错: ${error}`);
      throw error;
    }
  }

  // 创建文件夹
  async createFolder(path: string): Promise<void> {
    await this.ensureBucket();
    const formattedPath = this.formatPath(path);
    const folderPath = formattedPath.endsWith('/') ? formattedPath : `${formattedPath}/`;
    
    try {
      // 在MinIO中创建目录实际上是上传一个空文件，文件名以/结尾
      await this.client.putObject(this.defaultBucket, folderPath, Buffer.from(''), 0);
    } catch (error) {
      console.error(`创建文件夹时出错: ${error}`);
      throw error;
    }
  }

  // 删除文件或文件夹
  async delete(path: string): Promise<void> {
    await this.ensureBucket();
    const formattedPath = this.formatPath(path);
    
    try {
      const stat = await this.client.statObject(this.defaultBucket, formattedPath);
      
      if (formattedPath.endsWith('/') || stat.metaData && stat.metaData['Content-Type'] === 'application/x-directory') {
        // 这是一个目录，需要递归删除所有子文件
        const objects: Minio.BucketItem[] = [];
        const stream = this.client.listObjects(this.defaultBucket, formattedPath, true);
        
        await new Promise<void>((resolve, reject) => {
          stream.on('data', (obj: any) => {
            if (obj.name) objects.push(obj as Minio.BucketItem);
          });
          stream.on('error', reject);
          stream.on('end', () => resolve());
        });
        
        // 删除所有子文件
        if (objects.length > 0) {
          const objectsToDelete = objects
            .map(obj => obj.name)
            .filter((name): name is string => name !== undefined);
          
          if (objectsToDelete.length > 0) {
            await this.client.removeObjects(
              this.defaultBucket, 
              objectsToDelete
            );
          }
        }
        
        // 删除目录本身（如果存在）
        await this.client.removeObject(this.defaultBucket, formattedPath);
      } else {
        // 这是一个文件
        await this.client.removeObject(this.defaultBucket, formattedPath);
      }
    } catch (error) {
      if ((error as Error).name === 'NoSuchKey') {
        // 如果文件不存在，忽略错误
        return;
      }
      console.error(`删除文件时出错: ${error}`);
      throw error;
    }
  }
}

export const minioService = new MinioService(); 