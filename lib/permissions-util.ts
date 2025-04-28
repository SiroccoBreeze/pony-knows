/**
 * 确保权限是标准的字符串数组格式
 * 处理PostgreSQL数组格式 "{value1,value2,...}" 转为 ["value1", "value2", ...]
 */
export function normalizePermissions(permissions: string[] | string | unknown): string[] {
  // 增加调试信息
  console.log("[normalizePermissions] 传入权限类型:", typeof permissions);
  console.log("[normalizePermissions] 传入权限值:", permissions);
  
  // 处理null和undefined情况
  if (permissions === null || permissions === undefined) {
    console.warn('[normalizePermissions] 权限为null或undefined');
    return [];
  }
  
  // 处理空字符串
  if (permissions === '') {
    console.warn('[normalizePermissions] 权限为空字符串');
    return [];
  }
  
  // 如果已经是标准数组格式，直接返回
  if (Array.isArray(permissions) && 
      (permissions.length === 0 || typeof permissions[0] !== 'string' || 
       !(permissions[0].startsWith('{') && permissions[0].endsWith('}')))) {
    console.log('[normalizePermissions] 已是标准数组格式:', permissions);
    return permissions as string[];
  }
  
  // 处理PostgreSQL数组格式
  if (Array.isArray(permissions) && permissions.length === 1 && 
      typeof permissions[0] === 'string' && 
      permissions[0].startsWith('{') && permissions[0].endsWith('}')) {
    // 移除花括号并分割为数组
    const normalized = permissions[0]
      .substring(1, permissions[0].length - 1)
      .split(',')
      .map((p: string) => p.trim());
    console.log('[normalizePermissions] 处理了PostgreSQL数组(数组中):', normalized);
    return normalized;
  }
  
  // 如果是直接的PostgreSQL格式字符串
  if (typeof permissions === 'string' && 
      permissions.startsWith('{') && permissions.endsWith('}')) {
    const normalized = permissions
      .substring(1, permissions.length - 1)
      .split(',')
      .map((p: string) => p.trim());
    console.log('[normalizePermissions] 处理了PostgreSQL数组(字符串):', normalized);
    return normalized;
  }
  
  // 返回空数组作为默认值
  console.warn('[normalizePermissions] 无法解析的权限格式:', permissions);
  return [];
} 