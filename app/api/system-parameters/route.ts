import { NextRequest, NextResponse } from "next/server";
import { getSystemParameterFromDb } from "@/lib/system-parameters";

// 获取系统参数API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;
    
    if (!key) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }
    
    // 从数据库获取参数值
    const value = await getSystemParameterFromDb(key);
    
    return NextResponse.json({ value });
  } catch (error) {
    console.error("获取系统参数失败:", error);
    return NextResponse.json(
      { error: "获取系统参数失败，请稍后再试" },
      { status: 500 }
    );
  }
} 