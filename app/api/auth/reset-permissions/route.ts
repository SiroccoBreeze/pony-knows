import { NextResponse } from "next/server";

/**
 * 重置权限API
 * 用于通知客户端清除缓存和重新加载权限
 */
export async function GET() {
  try {
    // 创建包含重置令牌的响应
    // 客户端收到此响应后会清除本地缓存
    const resetToken = Date.now().toString();
    
    return NextResponse.json(
      {
        success: true,
        message: "权限重置成功",
        resetToken,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error("权限重置API错误:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
} 