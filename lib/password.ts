import { hash, compare } from "bcryptjs";

// 加密密码
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

// 验证密码
export async function verifyPassword(
  inputPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return await compare(inputPassword, hashedPassword);
} 