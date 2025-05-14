import { NextRequest, NextResponse } from 'next/server'
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
// 恢复与系统参数相关的导入
import { getSystemParameterWithDefault } from './lib/system-parameters'
// 移除外部依赖引用
// import { getSystemParameterWithDefault } from './lib/system-parameters'

// 定义角色和权限接口
interface Role {
  role: {
    name: string;
    permissions: string[];
  }
}

// 公开路由列表（不需要登录即可访问）
const publicRoutes = ['/', '/auth/login', '/auth/register', '/api', '/api/auth/session', '/_next', '/favicon.ico', '/images', '/not-found', '/404']

// 无需月度密钥验证的路径（即使用户已登录）
const KEY_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/api/auth/monthly-key',
  '/api/auth/session',
  '/favicon.ico',
  '/_next',
  '/images',
  '/api/system-parameters'
];

// 不需要检查维护模式的路径
const EXEMPT_PATHS = [
  '/api/admin',
  '/admin',
  '/maintenance',
  '/login',
  '/api/auth',
  '/favicon.ico',
  '/_next'
];

// 检查路径是否豁免维护模式
function isExemptPath(path: string): boolean {
  return EXEMPT_PATHS.some(exemptPath => path.startsWith(exemptPath));
}

// 检查路径是否豁免密钥验证
function isKeyExemptPath(path: string): boolean {
  return KEY_EXEMPT_PATHS.some(exemptPath => path.startsWith(exemptPath));
}

// 检查用户的密钥验证状态（从cookie或令牌中）
function hasValidMonthlyKeyFromSession(token: JWT, request: NextRequest): boolean {
  try {
    // 详细记录token的内容，帮助调试
    const tokenKeys = Object.keys(token).filter(k => k !== 'iat' && k !== 'exp' && k !== 'jti');
    console.log(`[中间件] 检查用户 ${token.sub} 的密钥验证状态，token字段: ${tokenKeys.join(', ')}`);
    
    // 检查是否有完整会话标记
    const sessionCompleteCookie = request.cookies.get('auth_session_complete');
    
    // 增加安全检查：检查用户ID是否匹配cookie内容
    if (sessionCompleteCookie?.value === 'true') {
      // 获取当前用户的ID和ID哈希
      const currentUserId = token.sub || '';
      const currentUserIdHash = currentUserId.substring(0, 8);
      
      // 获取x-session-user cookie用于验证
      const sessionUserCookie = request.cookies.get('x-session-user');
      
      // 验证x-session-user cookie是否与当前用户匹配
      if (!sessionUserCookie || sessionUserCookie.value !== currentUserIdHash) {
        console.log(`[中间件] 用户 ${token.sub} 的会话标记无效或不匹配，重置验证状态`);
        return false;
      }
      
      console.log(`[中间件] 用户 ${token.sub} 具有完整会话标记，跳过密钥验证`);
      return true;
    }
    
    // 明确检查月度密钥验证标志
    if (token.monthlyKeyVerified === true) {
      console.log(`[中间件] 用户 ${token.sub} 通过会话标记验证了月度密钥: true`);
      return true;
    }
    
    // 检查是否存在跳过验证标记的cookie
    const skippedCookie = request.cookies.get('monthly_key_verification_skipped');
    if (skippedCookie?.value === 'true') {
      // 如果用户选择跳过验证，我们不再视为有效密钥
      // 而是将其视为需要登出的状态，通过重定向到登录页面来处理
      console.log(`[中间件] 用户 ${token.sub} 已跳过密钥验证，需要重新登录`);
      return false;
    }
    
    // 如果当前用户有管理员权限，自动认为验证通过
    const userRoles = (token as any).roles || [];
    const permissions: string[] = [];
    
    userRoles.forEach((role: any) => {
      if (role.role?.permissions) {
        permissions.push(...role.role.permissions);
      }
    });
    
    if (permissions.includes('admin_access')) {
      console.log(`[中间件] 用户 ${token.sub} 具有管理员权限，自动验证通过`);
      return true;
    }
    
    // 如果token中没有验证状态，返回false
    console.log(`[中间件] 用户 ${token.sub} 未通过会话标记验证月度密钥 (验证状态: ${token.monthlyKeyVerified})`);
    return false;
  } catch (error) {
    console.error("检查密钥状态错误:", error);
    // 出错时不应阻止用户访问，返回true
    return true;
  }
}

// 验证回调URL是否安全，避免重定向到恶意站点
function isSafeCallbackUrl(url: string): boolean {
  // 如果是相对路径，则安全
  if (url.startsWith('/')) {
    return true;
  }
  
  try {
    // 检查URL是否来自同一域名
    const urlObj = new URL(url);
    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : ''
    ].filter(Boolean);
    
    return allowedHosts.includes(urlObj.host);
  } catch {
    // 如果URL不合法，返回false
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 跳过豁免路径的检查
  if (isExemptPath(pathname)) {
    return NextResponse.next();
  }
  
  try {
    // 检查是否已经在登录页面并且有needKey参数 - 避免循环重定向
    const url = new URL(request.url);
    const needKey = url.searchParams.get('needKey');
    const isLoginPageWithNeedKey = pathname.startsWith('/auth/login') && needKey === 'true';
    
    // 如果已经在带有needKey参数的登录页面，直接放行，不再进行任何重定向检查
    if (isLoginPageWithNeedKey) {
      console.log('[中间件] 检测到已在登录页面且有needKey参数，放行请求，避免循环重定向');
      return NextResponse.next();
    }
    
    // 获取会话token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production"
    });
    
    // 检查当前路径是否是公开路由
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    
    // 如果是公开路由且用户未登录，直接放行
    if (isPublicRoute && !token) {
      // console.log(`[中间件] 公开路由，用户未登录: ${pathname}, 放行`);
      return NextResponse.next();
    }
    
    // 用户已登录，需要检查月度密钥状态（除了豁免路径）
    if (token && !isKeyExemptPath(pathname)) {
      // 先检查系统是否启用了月度密钥验证功能
      const enableMonthlyKey = await getSystemParameterWithDefault('enable_monthly_key', 'true');
      
      // 如果禁用了月度密钥验证功能，直接放行
      if (enableMonthlyKey !== 'true') {
        console.log(`[中间件] 月度密钥验证功能已禁用，跳过验证`);
        return NextResponse.next();
      }
      
      // 先检查用户是否是管理员，获取用户权限
      const userRoles = (token as { roles?: Role[] }).roles || [];
      const permissions: string[] = []; // 用于存储权限的数组
      
      // 提取所有角色中的权限到一个扁平数组
      userRoles.forEach(role => {
        if (role.role.permissions) {
          permissions.push(...role.role.permissions);
        }
      });
      
      // 从会话中获取验证状态
      const hasValidKey = hasValidMonthlyKeyFromSession(token, request);
      
      // 非管理路由才需要检查月度密钥
      const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
      
      // 如果不是管理员路由，并且没有有效密钥，重定向到登录/密钥验证页面
      if (!isAdminRoute && !hasValidKey) {
        console.log(`[中间件] 用户未验证月度密钥，重定向到密钥验证: ${token.sub}`);
        
        // 检查是否已经是登录页面，防止循环重定向
        if (pathname.startsWith('/auth/login')) {
          console.log('[中间件] 已经在登录页面，防止循环重定向');
          return NextResponse.next();
        }
        
        // 保存原始请求的完整URL作为回调
        const originalUrl = request.url;
        
        // 检查URL是否包含needKey参数，如果有则表示已经在验证流程中
        if (url.searchParams.get('needKey') === 'true') {
          console.log('[中间件] 检测到needKey参数，避免重复重定向');
          return NextResponse.next();
        }
        
        // 检查回调URL是否安全
        const safeCallbackUrl = isSafeCallbackUrl(originalUrl) ? originalUrl : '/';
        
        // 确保callbackUrl直接传递，不进行额外编码
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', safeCallbackUrl);
        loginUrl.searchParams.set('needKey', 'true'); // 指示需要验证密钥
        
        return NextResponse.redirect(loginUrl);
      }
      
      // 验证密钥的管理员路由处理
      if (isAdminRoute) {
        // 检查是否有管理员权限
        const hasAdminPermission = permissions.includes('admin_access');
        
        // 如果用户不是管理员，返回404
        if (!hasAdminPermission) {
          console.log(`[中间件] 用户没有管理员权限: ${token.sub}, 返回404`);
          // 在服务器端直接显示404页面，不让无权限用户访问/admin
          return NextResponse.rewrite(new URL('/404', request.url));
        }
        
        // 管理员用户 + 有效密钥，允许访问管理路由
        console.log(`[中间件] 管理员访问: ${pathname}, 用户ID: ${token.sub}`);
        return NextResponse.next();
      }
    }
    
    // 检查是否是管理员路由（未登录用户）
    const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    if (isAdminRoute && !token) {
      console.log(`[中间件] 未登录用户访问管理员路由: ${pathname}, 返回404`);
      return NextResponse.rewrite(new URL('/404', request.url));
    }
    
    // 检查注册功能是否启用
    if (pathname.includes('/register') || pathname.includes('/signup')) {
      // 获取系统参数值，默认为启用
      const registrationParam = await getSystemParameterWithDefault('enable_registration', 'true');
      const registrationEnabled = registrationParam === 'true';
      
      if (!registrationEnabled) {
        console.log(`[中间件] 注册功能已禁用，阻止访问: ${pathname}`);
        // 如果是API请求，返回JSON错误
        if (pathname.includes('/api/')) {
          return NextResponse.json(
            { error: '注册功能已关闭' },
            { status: 403 }
          );
        }
        // 如果是页面请求，重定向到首页
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    
    // 如果用户已登录并且通过了所有验证，放行请求
    if (token) {
      // console.log(`[中间件] 用户已通过所有验证, 路径: ${pathname}, 用户ID: ${token.sub}`);
      return NextResponse.next();
    }
    
    // 用户未登录且尝试访问受保护的路由，重定向到登录页面
    console.log(`[中间件] 用户未登录, 路径: ${pathname}, 重定向到登录页`);
    const loginUrl = new URL('/auth/login', request.url);
    // 检查回调URL是否安全
    const safeCallbackUrl = isSafeCallbackUrl(request.url) ? request.url : '/';
    loginUrl.searchParams.set('callbackUrl', safeCallbackUrl);
    
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('中间件错误:', error);
    // 出错时继续处理请求，避免阻塞网站访问
    return NextResponse.next();
  }
}

// 配置中间件应用的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了不需要中间件的路径:
     * - 静态文件
     * - 图像文件
     * - 字体文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|webp|css|js|woff2|woff)).*)',
  ],
} 