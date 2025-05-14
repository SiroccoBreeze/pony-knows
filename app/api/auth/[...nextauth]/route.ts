import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import { authOptions as authOptionsFromLib } from "@/lib/auth/options";

// 使用lib中的AuthOptions配置
// 这样可以确保所有地方使用相同的配置
const handler = NextAuth(authOptionsFromLib);

// 导出必要的HTTP方法处理函数
export { handler as GET, handler as POST, handler as PATCH, handler as HEAD }; 