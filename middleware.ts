import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// 公开路由列表（不需要登录即可访问）
const publicRoutes = ['/', '/auth/login', '/auth/register', '/api', '/_next', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 检查当前路径是否是公开路由
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // 如果是公开路由，直接放行
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // 获取会话token
  const token = await getToken({ req: request })
  
  // 如果用户已登录，放行
  if (token) {
    return NextResponse.next()
  }
  
  // 用户未登录且尝试访问受保护的路由，重定向到登录页面
  const loginUrl = new URL('/auth/login', request.url)
  // 保存原始URL，以便登录后可以重定向回来
  loginUrl.searchParams.set('callbackUrl', encodeURI(request.url))
  
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