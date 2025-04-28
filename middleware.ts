import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// 定义角色和权限接口
interface Role {
  role: {
    name: string;
    permissions: string[];
  }
}

// 公开路由列表（不需要登录即可访问）
const publicRoutes = ['/', '/auth/login', '/auth/register', '/api', '/_next', '/favicon.ico', '/images', '/not-found', '/404']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 检查是否是管理员路由
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  
  // 如果是管理员路由，需要检查用户是否有权限
  if (isAdminRoute) {
    // 获取会话token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production"
    })
    
    // 如果没有token，用户未登录，返回404
    if (!token) {
      console.log(`[中间件] 访问管理员路由但未登录: ${pathname}, 返回404`);
      // 在服务器端直接显示404页面，不让未登录用户访问/admin
      return NextResponse.rewrite(new URL('/404', request.url))
    }
    
    // 检查用户角色权限
    const userRoles = (token as { roles?: Role[] }).roles || []
    const permissions: string[] = [];
    
    // 提取所有角色中的权限到一个扁平数组
    userRoles.forEach(role => {
      if (role.role.permissions) {
        permissions.push(...role.role.permissions);
      }
    });
    
    console.log(`[中间件] 用户权限:`, permissions);
    
    // 检查是否包含管理员权限
    const hasAdminPermission = permissions.includes('admin_access');
    
    console.log(`[中间件] 用户是否有管理员权限: ${hasAdminPermission}`);
    
    // 如果用户不是管理员，返回404
    if (!hasAdminPermission) {
      console.log(`[中间件] 用户没有管理员权限: ${pathname}, 用户ID: ${token.sub}, 返回404`);
      // 在服务器端直接显示404页面，不让无权限用户访问/admin
      return NextResponse.rewrite(new URL('/404', request.url))
    }
    
    console.log(`[中间件] 管理员访问: ${pathname}, 用户ID: ${token.sub}, 放行`);
    return NextResponse.next()
  }
  
  // 检查当前路径是否是公开路由
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // 如果是公开路由，直接放行
  if (isPublicRoute) {
    console.log(`[中间件] 公开路由: ${pathname}, 放行`);
    return NextResponse.next()
  }
  
  // 获取会话token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production"
  })
  
  // 如果用户已登录，放行
  if (token) {
    console.log(`[中间件] 用户已登录, 路径: ${pathname}, 用户ID: ${token.sub}, 放行`);
    return NextResponse.next()
  }
  
  // 用户未登录且尝试访问受保护的路由，重定向到登录页面
  console.log(`[中间件] 用户未登录, 路径: ${pathname}, 重定向到登录页`);
  const loginUrl = new URL('/auth/login', request.url)
  loginUrl.searchParams.set('callbackUrl', request.url)
  
  return NextResponse.redirect(loginUrl)
}

// 配置中间件应用的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - 静态文件（如图片、JS、CSS等）
     * - _next/static（Next.js静态资源）
     * - _next/image（Next.js图片优化API）
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|images|favicon.ico).*)',
  ],
} 