import { PrismaClient } from '@prisma/client';

// 添加global变量声明，确保TypeScript不会抱怨
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 在开发环境中使用全局变量存储PrismaClient实例，避免热重载时创建多个实例
// 在生产环境中直接创建一个新实例
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 