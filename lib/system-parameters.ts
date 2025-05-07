import prisma from "@/lib/prisma";

// 系统参数缓存
let parametersCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 缓存有效期：1分钟

// 获取系统参数值的函数 - 仅用于服务器端API路由，不适用于中间件
export async function getSystemParameterFromDb(key: string): Promise<string | null> {
  try {
    // 简单的内存缓存机制
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_TTL && key in parametersCache) {
      return parametersCache[key] || null;
    }

    // 直接从数据库中查询参数
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true }
    });
    
    // 更新缓存
    if (setting?.value) {
      parametersCache[key] = setting.value;
      cacheTimestamp = now;
      return setting.value;
    }
    
    return null;
  } catch (error) {
    console.error(`获取系统参数 ${key} 失败:`, error);
    return null;
  }
}

// 从数据库获取系统参数，如果发生错误则返回默认值
export async function getSystemParameterWithDefaultFromDb(key: string, defaultValue: string): Promise<string> {
  const value = await getSystemParameterFromDb(key);
  return value !== null ? value : defaultValue;
}

// 清除参数缓存
export function clearParametersCache(): void {
  parametersCache = {};
  cacheTimestamp = 0;
}

// 以下函数用于Edge Runtime环境中（如中间件），但由于API调用限制，不建议在中间件中使用
// 获取服务器基础URL
function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; 
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  // 优先使用环境变量，否则默认为 localhost
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://example.com'; // 生产环境应替换为实际域名
}

// 获取系统参数值的函数，适用于客户端或API路由中
export async function getSystemParameter(key: string): Promise<string | null> {
  try {
    // 构建API基础URL
    const baseUrl = getBaseUrl();
    
    // 从API端点获取系统参数
    const response = await fetch(`${baseUrl}/api/system-parameters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
      // 在中间件中使用时，不能设置以下选项
      ...(typeof process !== 'undefined' && process.env.NODE_ENV === 'development' 
        ? { cache: 'no-store' } 
        : {})
    });

    if (!response.ok) {
      console.error(`获取系统参数 ${key} 失败: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.value !== undefined ? data.value : null;
  } catch (error) {
    console.error(`获取系统参数 ${key} 失败:`, error);
    return null;
  }
}

// 获取系统参数，如果发生错误则返回默认值
export async function getSystemParameterWithDefault(key: string, defaultValue: string): Promise<string> {
  const value = await getSystemParameter(key);
  return value !== null ? value : defaultValue;
} 