// 权限常量定义 - 分离管理端与用户端权限
export enum AdminPermission {
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
  
  // 外部链接管理权限
  VIEW_LINKS = "view_links",
  CREATE_LINK = "create_link",
  EDIT_LINK = "edit_link",
  DELETE_LINK = "delete_link",
  
  // 通知管理权限
  VIEW_NOTIFICATIONS = "view_notifications",
  CREATE_NOTIFICATION = "create_notification",
  
  // 系统设置权限
  VIEW_SETTINGS = "view_settings",
  EDIT_SETTINGS = "edit_settings",
  
  // 日志查看权限
  VIEW_LOGS = "view_logs",
}

// 用户端权限 - 更加细化
export enum UserPermission {
  // 论坛权限
  VIEW_FORUM = "view_forum",                // 查看论坛内容
  CREATE_TOPIC = "create_topic",            // 创建主题帖
  REPLY_TOPIC = "reply_topic",              // 回复主题帖
  UPLOAD_IMAGES = "upload_images",          // 上传图片
  EDIT_OWN_POSTS = "edit_own_posts",        // 编辑自己的帖子
  DELETE_OWN_POSTS = "delete_own_posts",    // 删除自己的帖子
  REPORT_CONTENT = "report_content",        // 举报内容
  
  // 资源与服务权限
  VIEW_SERVICES = "view_services",          // 查看服务页面
  ACCESS_FILE_DOWNLOADS = "access_file_downloads",    // 访问文件下载页面
  DOWNLOAD_RESOURCES = "download_resources",          // 下载资源文件
  VIEW_QUARK_LINKS = "view_quark_links",              // 查看夸克网盘链接
  VIEW_BAIDU_LINKS = "view_baidu_links",              // 查看百度网盘链接
  
  // 数据库与网盘服务
  ACCESS_DATABASE = "access_database",      // 访问数据库结构
  ACCESS_MINIO = "access_minio",            // 访问网盘服务
  UPLOAD_TO_MINIO = "upload_to_minio",      // 上传文件到网盘
  
  // 个人中心权限
  EDIT_PROFILE = "edit_profile",            // 编辑个人资料
  CHANGE_PASSWORD = "change_password",      // 修改密码
  VIEW_NOTIFICATIONS = "view_notifications", // 查看个人通知
}

// 类型定义，帮助TypeScript识别权限类型
export type PermissionType = AdminPermission | UserPermission;

// 兼容性导出，为了支持旧代码
export enum Permission {
  // 管理员权限
  ADMIN_ACCESS = "admin_access",
  
  // 用户权限
  VIEW_USERS = "view_users",
  CREATE_USER = "create_user",
  EDIT_USER = "edit_user",
  DELETE_USER = "delete_user",
  
  // 角色权限
  VIEW_ROLES = "view_roles",
  CREATE_ROLE = "create_role",
  EDIT_ROLE = "edit_role",
  DELETE_ROLE = "delete_role",
  
  // 帖子权限
  VIEW_POSTS = "view_posts",
  EDIT_POST = "edit_post",
  DELETE_POST = "delete_post",
  
  // 评论权限
  VIEW_COMMENTS = "view_comments",
  EDIT_COMMENT = "edit_comment",
  DELETE_COMMENT = "delete_comment",
  
  // 系统设置权限
  VIEW_SETTINGS = "view_settings",
  EDIT_SETTINGS = "edit_settings",
}

// 预定义管理员角色及其权限
export const ADMIN_ROLES = {
  // 超级管理员拥有所有管理权限
  SUPER_ADMIN: {
    name: "超级管理员",
    description: "拥有系统所有管理操作权限",
    permissions: Object.values(AdminPermission),
  },
  
  // 内容管理员
  CONTENT_MANAGER: {
    name: "内容管理员",
    description: "管理帖子、评论和标签",
    permissions: [
      AdminPermission.ADMIN_ACCESS,
      AdminPermission.VIEW_POSTS,
      AdminPermission.EDIT_POST,
      AdminPermission.DELETE_POST,
      AdminPermission.VIEW_COMMENTS,
      AdminPermission.EDIT_COMMENT,
      AdminPermission.DELETE_COMMENT,
    ],
  },
  
  // 用户管理员
  USER_MANAGER: {
    name: "用户管理员",
    description: "管理用户账户",
    permissions: [
      AdminPermission.ADMIN_ACCESS,
      AdminPermission.VIEW_USERS,
      AdminPermission.EDIT_USER,
    ],
  },
  
  // 资源管理员
  RESOURCE_MANAGER: {
    name: "资源管理员",
    description: "管理外部链接和文件资源",
    permissions: [
      AdminPermission.ADMIN_ACCESS,
      AdminPermission.VIEW_LINKS,
      AdminPermission.CREATE_LINK,
      AdminPermission.EDIT_LINK,
      AdminPermission.DELETE_LINK,
      AdminPermission.VIEW_FILES,
      AdminPermission.UPLOAD_FILE,
      AdminPermission.DELETE_FILE,
    ],
  },
};

// 预定义用户角色及其权限
export const USER_ROLES = {
  // VIP用户
  VIP_USER: {
    name: "VIP用户",
    description: "高级会员，拥有所有用户功能权限",
    permissions: Object.values(UserPermission),
  },
  
  // 活跃用户
  ACTIVE_USER: {
    name: "活跃用户",
    description: "活跃用户，拥有大部分功能权限",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.CREATE_TOPIC,
      UserPermission.REPLY_TOPIC,
      UserPermission.UPLOAD_IMAGES,
      UserPermission.EDIT_OWN_POSTS,
      UserPermission.DELETE_OWN_POSTS,
      UserPermission.REPORT_CONTENT,
      UserPermission.VIEW_SERVICES,
      UserPermission.ACCESS_FILE_DOWNLOADS,
      UserPermission.DOWNLOAD_RESOURCES,
      UserPermission.VIEW_QUARK_LINKS,
      UserPermission.VIEW_BAIDU_LINKS,
      UserPermission.EDIT_PROFILE,
      UserPermission.CHANGE_PASSWORD,
      UserPermission.VIEW_NOTIFICATIONS,
    ],
  },
  
  // 普通用户
  REGULAR_USER: {
    name: "普通用户",
    description: "普通用户基础权限",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.REPLY_TOPIC,
      UserPermission.REPORT_CONTENT,
      UserPermission.VIEW_SERVICES,
      UserPermission.ACCESS_FILE_DOWNLOADS,
      UserPermission.VIEW_QUARK_LINKS,
      UserPermission.EDIT_PROFILE,
      UserPermission.CHANGE_PASSWORD,
      UserPermission.VIEW_NOTIFICATIONS,
    ],
  },
  
  // 新用户
  NEW_USER: {
    name: "新用户",
    description: "新注册用户的初始权限",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.REPLY_TOPIC,
      UserPermission.VIEW_SERVICES,
      UserPermission.EDIT_PROFILE,
      UserPermission.CHANGE_PASSWORD,
    ],
  },
  
  // 访客
  GUEST: {
    name: "访客",
    description: "未注册用户的最小权限",
    permissions: [
      UserPermission.VIEW_FORUM,
      UserPermission.VIEW_SERVICES,
    ],
  },
};

// 判断用户是否有指定权限
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string | AdminPermission | UserPermission | Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

// 判断用户是否有多个指定权限中的任意一个
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: (string | AdminPermission | UserPermission | Permission)[]
): boolean {
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
}

// 判断用户是否有所有指定权限
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: (string | AdminPermission | UserPermission | Permission)[]
): boolean {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

// 判断用户是否有管理员权限
export function hasAdminPermission(
  userPermissions: string[],
  requiredPermission: AdminPermission
): boolean {
  return userPermissions.includes(requiredPermission);
}

// 判断用户是否有用户端权限
export function hasUserPermission(
  userPermissions: string[],
  requiredPermission: UserPermission
): boolean {
  return userPermissions.includes(requiredPermission);
} 