import { Session } from "next-auth";
import { getSession as getNextAuthSession } from "next-auth/react";

/**
 * 获取当前用户会话
 * @returns 当前会话对象或null
 */
export async function getSession(): Promise<Session | null> {
  try {
    return await getNextAuthSession();
  } catch (error) {
    console.error("获取会话失败:", error);
    return null;
  }
}

/**
 * 更新用户会话的方法（服务器端）
 * 
 * 注意：在服务器端不能直接更新会话，需要通过调用API点或刷新令牌来实现
 * 这里提供一个接口，但实际更新需要在客户端完成
 * 
 * @param session 要更新的会话对象
 * @returns 更新结果
 */
export async function updateSession(session: Session): Promise<Session | null> {
  try {
    // 在服务器端，更新会话需要通过API调用
    console.log("服务器端更新会话请求:", session);
    
    // 实际上，这里无法直接更新会话，返回原会话
    return session;
  } catch (error) {
    console.error("更新会话失败:", error);
    return null;
  }
}

/**
 * 设置会话中的月度密钥验证状态
 * 
 * 注意：这个方法在服务器端有限制，更新会话需要通过API或刷新令牌实现
 * 
 * @param verified 是否已验证
 * @returns 更新结果
 */
export async function setMonthlyKeyVerified(verified: boolean = true): Promise<boolean> {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      console.error("无法设置月度密钥验证状态: 会话或用户不存在");
      return false;
    }
    
    // 服务器端需要通过其他方式更新会话
    console.log(`服务器端设置月度密钥验证状态请求: ${verified}`);
    
    return true;
  } catch (error) {
    console.error("设置月度密钥验证状态失败:", error);
    return false;
  }
} 