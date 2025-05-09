import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { createHash } from "crypto";

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

// 获取当前登录用户的月度密钥
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
    
    const userId = session.user.id;
    
    // 获取当前年月
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 生成当前用户本月的密钥
    const monthlyKey = generateUserMonthlyKey(userId, currentYear, currentMonth);
    
    return NextResponse.json({
      userId,
      year: currentYear,
      month: currentMonth,
      monthlyKey
    });
    
  } catch (error) {
    console.error("获取用户月度密钥错误:", error);
    return NextResponse.json(
      { error: "获取月度密钥失败" },
      { status: 500 }
    );
  }
} 