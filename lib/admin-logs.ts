import { prisma } from '@/lib/prisma';

/**
 * 管理员日志记录接口
 */
interface AdminLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ip?: string;
  userAgent?: string;
}

/**
 * 创建管理员操作日志
 * @param logData 日志数据
 * @returns 创建的日志记录
 */
export async function createAdminLog(logData: AdminLogData) {
  try {
    const log = await prisma.adminLog.create({
      data: {
        userId: logData.userId,
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        details: logData.details || {},
        ip: logData.ip,
        userAgent: logData.userAgent
      }
    });
    
    return log;
  } catch (error) {
    console.error('创建管理员日志失败:', error);
    // 记录日志失败不应影响主流程，所以只记录错误但不抛出
    return null;
  }
} 