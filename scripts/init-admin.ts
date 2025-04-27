import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { ROLES, Permission } from "../lib/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("开始初始化管理系统...");

  try {
    // 1. 创建基本角色
    console.log("正在创建角色...");
    
    // 超级管理员角色
    const superAdminRole = await prisma.role.upsert({
      where: { name: ROLES.SUPER_ADMIN.name },
      update: { 
        permissions: ROLES.SUPER_ADMIN.permissions,
        description: ROLES.SUPER_ADMIN.description 
      },
      create: {
        name: ROLES.SUPER_ADMIN.name,
        permissions: ROLES.SUPER_ADMIN.permissions,
        description: ROLES.SUPER_ADMIN.description
      }
    });
    
    // 内容管理员角色
    const contentManagerRole = await prisma.role.upsert({
      where: { name: ROLES.CONTENT_MANAGER.name },
      update: { 
        permissions: ROLES.CONTENT_MANAGER.permissions,
        description: ROLES.CONTENT_MANAGER.description 
      },
      create: {
        name: ROLES.CONTENT_MANAGER.name,
        permissions: ROLES.CONTENT_MANAGER.permissions,
        description: ROLES.CONTENT_MANAGER.description
      }
    });
    
    // 用户管理员角色
    const userManagerRole = await prisma.role.upsert({
      where: { name: ROLES.USER_MANAGER.name },
      update: { 
        permissions: ROLES.USER_MANAGER.permissions,
        description: ROLES.USER_MANAGER.description 
      },
      create: {
        name: ROLES.USER_MANAGER.name,
        permissions: ROLES.USER_MANAGER.permissions,
        description: ROLES.USER_MANAGER.description
      }
    });
    
    // 普通管理员角色
    const moderatorRole = await prisma.role.upsert({
      where: { name: ROLES.MODERATOR.name },
      update: { 
        permissions: ROLES.MODERATOR.permissions,
        description: ROLES.MODERATOR.description 
      },
      create: {
        name: ROLES.MODERATOR.name,
        permissions: ROLES.MODERATOR.permissions,
        description: ROLES.MODERATOR.description
      }
    });
    
    console.log("角色创建完成。");
    
    // 2. 创建超级管理员账户
    console.log("正在创建超级管理员账户...");
    
    // 默认超级管理员账户信息
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
    const adminName = "超级管理员";
    
    // 对密码进行加密
    const hashedPassword = await hash(adminPassword, 10);
    
    // 创建或更新超级管理员账户
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { 
        name: adminName,
        // 只有在明确指定时才更新密码
        ...(process.env.ADMIN_PASSWORD ? { password: hashedPassword } : {})
      },
      create: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        isActive: true
      }
    });
    
    // 检查超级管理员是否已拥有该角色
    const existingRoleAssignment = await prisma.userRole.findFirst({
      where: {
        userId: admin.id,
        roleId: superAdminRole.id
      }
    });
    
    // 如果尚未分配角色，则分配超级管理员角色
    if (!existingRoleAssignment) {
      await prisma.userRole.create({
        data: {
          userId: admin.id,
          roleId: superAdminRole.id
        }
      });
    }
    
    console.log(`超级管理员账户创建完成。邮箱: ${adminEmail}`);
    
    // 3. 创建系统基本设置
    console.log("正在初始化系统设置...");
    
    const defaultSettings = [
      {
        key: "site_name",
        value: "论坛管理系统",
        group: "basic",
        label: "站点名称",
        type: "text"
      },
      {
        key: "site_description",
        value: "一个现代化的论坛系统",
        group: "basic",
        label: "站点描述",
        type: "textarea"
      },
      {
        key: "enable_registration",
        value: "true",
        group: "user",
        label: "允许用户注册",
        type: "boolean"
      },
      {
        key: "post_moderation",
        value: "false",
        group: "content",
        label: "帖子发布前需审核",
        type: "boolean"
      },
      {
        key: "comment_moderation",
        value: "false",
        group: "content",
        label: "评论发布前需审核",
        type: "boolean"
      }
    ];
    
    for (const setting of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting
      });
    }
    
    console.log("系统设置初始化完成。");
    
    console.log("管理系统初始化成功！");
  } catch (error) {
    console.error("初始化管理系统时出错:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 