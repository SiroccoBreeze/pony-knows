import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
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
const publicRoutes = ['/', '/auth/login', '/auth/register', '/api', '/_next', '/favicon.ico', '/images', '/not-found', '/404']

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

// 检查路径是否豁免
function isExemptPath(path: string): boolean {
  return EXEMPT_PATHS.some(exemptPath => path.startsWith(exemptPath));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 跳过豁免路径的检查
  if (isExemptPath(pathname)) {
    return NextResponse.next();
  }
  
  try {
    // 硬编码默认值，避免在中间件中进行外部API调用
    // 实际功能可以在API层级实现，中间件只做基础检查
    const maintenanceMode = false; // 默认不启用维护模式
    
    // 如果维护模式已启用，重定向到维护页面
    if (maintenanceMode) {
      // 获取当前请求中的cookie，检查是否有管理员会话
      const sessionToken = request.cookies.get('next-auth.session-token')?.value;
      
      // 如果没有会话令牌，直接重定向到维护页面
      if (!sessionToken) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
      
      // 如果有会话令牌，则需要在API层面进一步验证权限
      // 这里简单地通过cookie判断有登录，API层会做进一步的权限检查
    }
    
    // 检查注册功能是否启用 - 从API获取实际值
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