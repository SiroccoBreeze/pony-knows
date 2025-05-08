import { NextRequest, NextResponse } from "next/server";
import { getSystemParameterFromDb } from "@/lib/system-parameters";

// 获取系统参数API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parameterValues: Record<string, string | null> = {};
    
    // 如果请求包含keys数组，获取多个参数
    if (body.keys && Array.isArray(body.keys)) {
      const keys = body.keys as string[];
      
      // 并行获取所有参数值
      const results = await Promise.all(
        keys.map(async (key) => {
          const value = await getSystemParameterFromDb(key);
          return { key, value };
        })
      );
      
      // 构建响应对象
      results.forEach(item => {
        parameterValues[item.key] = item.value;
      });
      
      return NextResponse.json(parameterValues);
    } 
    // 如果只有单个key参数
    else if (body.key) {
      const value = await getSystemParameterFromDb(body.key);
      return NextResponse.json({ value });
    }
    // 无效请求
    else {
      return NextResponse.json(
        { error: '请求必须包含key参数或keys数组' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('获取系统参数失败:', error);
    return NextResponse.json(
      { error: '获取系统参数失败' },
      { status: 500 }
    );
  }
} 