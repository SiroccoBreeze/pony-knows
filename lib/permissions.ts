// 权限常量定义
export enum Permission {
  // 管理员基础访问权限
  ADMIN_ACCESS = "admin_access",
  
  // 用户管理权限
  VIEW_USERS = "view_users",
  CREATE_USER = "create_user",
  EDIT_USER = "edit_user",
  DELETE_USER = "delete_user",
  
  // 角色管理权限
  VIEW_ROLES = "view_roles",
  CREATE_ROLE = "create_role",
  EDIT_ROLE = "edit_role",
  DELETE_ROLE = "delete_role",
  
  // 帖子管理权限
  VIEW_POSTS = "view_posts",
  CREATE_POST = "create_post",
  EDIT_POST = "edit_post",
  DELETE_POST = "delete_post",
  
  // 评论管理权限
  VIEW_COMMENTS = "view_comments",
  EDIT_COMMENT = "edit_comment",
  DELETE_COMMENT = "delete_comment",
  
  // 文件管理权限
  VIEW_FILES = "view_files",
  UPLOAD_FILE = "upload_file",
  DELETE_FILE = "delete_file",
  
  // 通知管理权限
  VIEW_NOTIFICATIONS = "view_notifications",
  CREATE_NOTIFICATION = "create_notification",
  
  // 系统设置权限
  VIEW_SETTINGS = "view_settings",
  EDIT_SETTINGS = "edit_settings",
  
  // 日志查看权限
  VIEW_LOGS = "view_logs",
}

// 预定义角色及其权限
export const ROLES = {
  // 超级管理员拥有所有权限
  SUPER_ADMIN: {
    name: "超级管理员",
    description: "拥有系统所有操作权限",
    permissions: Object.values(Permission),
  },
  
  // 内容管理员
  CONTENT_MANAGER: {
    name: "内容管理员",
    description: "管理帖子、评论和标签",
    permissions: [
      Permission.ADMIN_ACCESS,
      Permission.VIEW_POSTS,
      Permission.EDIT_POST,
      Permission.DELETE_POST,
      Permission.VIEW_COMMENTS,
      Permission.EDIT_COMMENT,
      Permission.DELETE_COMMENT,
    ],
  },
  
  // 用户管理员
  USER_MANAGER: {
    name: "用户管理员",
    description: "管理用户账户",
    permissions: [
      Permission.ADMIN_ACCESS,
      Permission.VIEW_USERS,
      Permission.EDIT_USER,
    ],
  },
  
  // 普通管理员
  MODERATOR: {
    name: "普通管理员",
    description: "基础管理权限",
    permissions: [
      Permission.ADMIN_ACCESS,
      Permission.VIEW_POSTS,
      Permission.VIEW_COMMENTS,
      Permission.VIEW_USERS,
    ],
  },
  
  // 普通用户（无管理权限）
  USER: {
    name: "普通用户",
    description: "普通用户无管理权限",
    permissions: [],
  },
};

// 判断用户是否有指定权限
export function hasPermission(
  userPermissions: string[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

// 判断用户是否有多个指定权限中的任意一个
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
}

// 判断用户是否有所有指定权限
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
} 