import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// 设置auth_session_complete cookie的API路由
export async function POST(request: NextRequest) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" }, 
        { status: 401 }
      );
    }

    // 从请求头获取用户ID
    const sessionUserId = request.headers.get('x-session-user');
    const userId = session.user.id;

    // 验证请求头中的用户ID与会话中的用户ID是否匹配
    if (sessionUserId && sessionUserId !== userId) {
      console.error(`[API] 会话用户ID不匹配: Header=${sessionUserId}, Session=${userId}`);
      return NextResponse.json(
        { error: "会话验证失败" }, 
        { status: 403 }
      );
    }

    // 创建响应对象
    const response = NextResponse.json({ 
      success: true, 
      message: "会话完整性标记已设置" 
    });

    // 设置cookie，包含用户ID的哈希值作为额外安全措施
    // 使用简单的字符串操作生成一个标识符，避免存储明文用户ID
    const userIdHash = userId.substring(0, 8);
    
    // 设置auth_session_complete cookie，1小时后过期
    response.cookies.set({
      name: 'auth_session_complete',
      value: 'true',
      path: '/',
      maxAge: 60 * 60, // 1小时
      httpOnly: true,  // 只在服务器端访问
      secure: process.env.NODE_ENV === 'production', // 生产环境下使用HTTPS
      sameSite: 'lax'  // 允许从同一站点或通过链接导航访问
    });
    
    // 设置用户标识符，用于验证cookie所有者
    response.cookies.set({
      name: 'x-session-user',
      value: userIdHash,
      path: '/',
      maxAge: 60 * 60, // 1小时
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    console.log(`[API] 已为用户 ${userId} 设置会话完整性标记`);
    return response;
  } catch (error) {
    console.error("设置会话完整性标记失败:", error);
    return NextResponse.json(
      { error: "处理请求时出错" }, 
      { status: 500 }
    );
  }
}

// 检查会话完整性标记状态
export async function GET(request: NextRequest) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" }, 
        { status: 401 }
      );
    }

    // 检查cookie是否存在
    const hasCompleteCookie = request.cookies.has('auth_session_complete');
    const sessionUserCookie = request.cookies.get('x-session-user')?.value;
    
    // 生成当前用户的ID哈希用于比较
    const userId = session.user.id;
    const userIdHash = userId.substring(0, 8);
    
    // 验证cookie是否属于当前用户
    const isValidForUser = sessionUserCookie === userIdHash;

    return NextResponse.json({
      hasCompleteMark: hasCompleteCookie && isValidForUser,
      userId: userId
    });
  } catch (error) {
    console.error("检查会话完整性标记失败:", error);
    return NextResponse.json(
      { error: "处理请求时出错" }, 
      { status: 500 }
    );
  }
}

// 清除会话完整性标记
export async function DELETE(request: NextRequest) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权访问" }, 
        { status: 401 }
      );
    }
    
    // 创建响应对象
    const response = NextResponse.json({ 
      success: true, 
      message: "会话完整性标记已清除" 
    });
    
    // 清除相关cookie
    response.cookies.delete('auth_session_complete');
    response.cookies.delete('x-session-user');
    
    console.log(`[API] 已为用户 ${session.user.id} 清除会话完整性标记`);
    return response;
  } catch (error) {
    console.error("清除会话完整性标记失败:", error);
    return NextResponse.json(
      { error: "处理请求时出错" }, 
      { status: 500 }
    );
  }
} 