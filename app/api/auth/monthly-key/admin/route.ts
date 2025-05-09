import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { getSystemParameterWithDefaultFromDb } from "@/lib/system-parameters";

const prisma = new PrismaClient();

// 默认最大尝试次数
const DEFAULT_MAX_ATTEMPTS = 3;

// 生成用户特定月份的密钥
function generateUserMonthlyKey(userId: string, year: number, month: number): string {
  // 使用加密哈希函数生成密钥
  // 盐值可以存储在环境变量中增加安全性
  const salt = process.env.KEY_GENERATION_SALT || "pony-knows-monthly-key-salt";
  const data = `${userId}-${year}-${month}-${salt}`;
  
  // 生成哈希并取前8位作为密钥，转为大写以便用户输入
  const hash = createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 8).toUpperCase();
}

// 管理员获取所有用户及其密钥状态
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查用户是否已登录
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    // 检查用户是否有管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    // 提取所有权限
    const permissions: string[] = [];
    admin?.userRoles.forEach(userRole => {
      if (userRole.role.permissions) {
        permissions.push(...userRole.role.permissions);
      }
    });
    
    // 检查是否有管理员权限
    if (!permissions.includes('admin_access')) {
      return NextResponse.json(
        { error: "权限不足" },
        { status: 403 }
      );
    }
    
    // 获取系统配置的最大尝试次数
    const maxAttemptsStr = await getSystemParameterWithDefaultFromDb(
      "monthly_key_max_attempts", 
      DEFAULT_MAX_ATTEMPTS.toString()
    );
    const MAX_ATTEMPTS = parseInt(maxAttemptsStr, 10);
    
    // 获取当前年月
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 获取所有用户及其密钥验证状态
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        monthlyKeyAuth: true
      },
      orderBy: { name: 'asc' }
    });
    
    // 计算每个用户的密钥和验证状态
    const usersWithKeyInfo = users.map(user => {
      // 生成用户当月密钥
      const monthlyKey = generateUserMonthlyKey(user.id, currentYear, currentMonth);
      
      // 检查是否已验证
      let isVerified = false;
      let lastVerifiedAt = null;
      let isLocked = false;
      let lockedUntil = null;
      let attempts = 0;
      
      if (user.monthlyKeyAuth) {
        const authDate = user.monthlyKeyAuth.lastVerifiedAt;
        lastVerifiedAt = authDate;
        attempts = user.monthlyKeyAuth.attempts || 0;
        
        // 检查是否在当月已验证
        const authMonth = authDate.getMonth() + 1;
        const authYear = authDate.getFullYear();
        
        isVerified = (authMonth === currentMonth && 
                      authYear === currentYear && 
                      user.monthlyKeyAuth.isValid);
                      
        // 检查是否锁定
        if (user.monthlyKeyAuth.lockedUntil) {
          const lockDate = new Date(user.monthlyKeyAuth.lockedUntil);
          if (lockDate > now) {
            isLocked = true;
            lockedUntil = lockDate;
          }
        }
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        currentMonthKey: monthlyKey,
        keyStatus: {
          verified: isVerified,
          lastVerifiedAt: lastVerifiedAt,
          attempts: attempts,
          maxAttempts: MAX_ATTEMPTS,
          isLocked: isLocked,
          lockedUntil: lockedUntil
        }
      };
    });
    
    return NextResponse.json({
      currentPeriod: {
        year: currentYear,
        month: currentMonth
      },
      maxAttempts: MAX_ATTEMPTS,
      users: usersWithKeyInfo
    });
    
  } catch (error) {
    console.error("获取用户密钥状态错误:", error);
    return NextResponse.json(
      { error: "获取用户密钥状态失败" },
      { status: 500 }
    );
  }
} 