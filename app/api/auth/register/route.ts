import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 验证请求数据
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "缺少必要的注册信息" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // 返回不包含密码的用户信息
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后再试" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 