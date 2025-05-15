// 权限常量定义 - 分离管理端与用户端权限
export enum AdminPermission {
  // 管理员基础访问权限
  ADMIN_ACCESS = "admin_access",  // 拥有此权限自动拥有所有功能
  
  // 角色管理权限
  VIEW_ROLES = "view_roles",       // 查看角色权限
  EDIT_ROLE = "edit_role",         // 编辑角色权限
  DELETE_ROLE = "delete_role",     // 删除角色权限
}

// 用户端权限 - 简化为页面级别访问控制
export enum UserPermission {
  // 论坛权限
  VIEW_FORUM = "view_forum",                // 查看论坛内容
  CREATE_TOPIC = "create_topic",            // 创建主题帖
  DELETE_COMMENT = "delete_comment",        // 删除评论权限
  
  // 服务与资源权限
  VIEW_SERVICES = "view_services",          // 查看服务页面
  ACCESS_DATABASE = "access_database",      // 访问数据库结构
  ACCESS_MINIO = "access_minio",            // 访问网盘服务
  ACCESS_FILE_DOWNLOADS = "access_file_downloads",    // 访问文件下载页面
  
  // 实施底稿权限
  ACCESS_WORKING_PAPERS = "access_working_papers",   // 访问实施底稿
  
  // 用户管理权限
  VIEW_USERS = "view_users",                // 查看用户管理页面
  
  // 个人中心权限
  VIEW_PROFILE = "view_profile",            // 访问个人中心
}

// 类型定义，帮助TypeScript识别权限类型
export type PermissionType = AdminPermission | UserPermission;

// 判断用户是否有指定权限（包含管理员自动拥有所有权限的逻辑）
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string | AdminPermission | UserPermission
): boolean {
  // 管理员自动拥有所有权限
  if (userPermissions.includes(AdminPermission.ADMIN_ACCESS)) {
    return true;
  }
  
  // 非管理员需要具体权限
  return userPermissions.includes(requiredPermission as string);
}

// 判断用户是否有多个指定权限中的任意一个
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: (string | AdminPermission | UserPermission)[]
): boolean {
  // 管理员自动拥有所有权限
  if (userPermissions.includes(AdminPermission.ADMIN_ACCESS)) {
    return true;
  }
  
  // 非管理员检查是否有任一所需权限
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission as string)
  );
}

// 判断用户是否有所有指定权限
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: (string | AdminPermission | UserPermission)[]
): boolean {
  // 管理员自动拥有所有权限
  if (userPermissions.includes(AdminPermission.ADMIN_ACCESS)) {
    return true;
  }
  
  // 非管理员检查是否有所有所需权限
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission as string)
  );
}

// 简化的预定义用户角色
export const USER_ROLES = {
  // 普通用户
  REGULAR_USER: {
    name: "普通用户",
    description: "可以浏览论坛和服务",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.VIEW_SERVICES,
      UserPermission.VIEW_PROFILE,
    ],
  },
  
  // 高级用户
  ADVANCED_USER: {
    name: "高级用户",
    description: "可以发帖并访问所有服务",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.CREATE_TOPIC,
      UserPermission.VIEW_SERVICES,
      UserPermission.ACCESS_DATABASE,
      UserPermission.ACCESS_MINIO,
      UserPermission.ACCESS_FILE_DOWNLOADS,
      UserPermission.ACCESS_WORKING_PAPERS,
      UserPermission.VIEW_PROFILE,
    ],
  },
};

// 简化的预定义管理员角色
export const ADMIN_ROLES = {
  // 超级管理员
  SUPER_ADMIN: {
    name: "超级管理员",
    description: "拥有系统所有管理操作权限",
    permissions: [AdminPermission.ADMIN_ACCESS],
  },
}; 