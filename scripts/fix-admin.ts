import { PrismaClient } from "@prisma/client";
import { Permission, ADMIN_ROLES } from "../lib/permissions";

const prisma = new PrismaClient();

// 修复用户权限的脚本
async function main() {
  try {
    console.log("开始修复超级管理员权限...");

    // 1. 确保超级管理员角色存在并包含所有权限
    console.log("检查并更新超级管理员角色...");
    const superAdminRole = await prisma.role.upsert({
      where: { name: ADMIN_ROLES.SUPER_ADMIN.name },
      update: { 
        permissions: Object.values(Permission),
        description: ADMIN_ROLES.SUPER_ADMIN.description 
      },
      create: {
        name: ADMIN_ROLES.SUPER_ADMIN.name,
        permissions: Object.values(Permission),
        description: ADMIN_ROLES.SUPER_ADMIN.description
      }
    });
    
    console.log(`超级管理员角色ID: ${superAdminRole.id}`);
    console.log(`权限数量: ${superAdminRole.permissions.length}`);
    console.log(`包含 ADMIN_ACCESS: ${superAdminRole.permissions.includes(Permission.ADMIN_ACCESS)}`);
    
    // 2. 查询所有管理员用户
    const adminUsers = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log(`系统中共有 ${adminUsers.length} 个用户`);
    
    // 3. 为每个用户检查并分配超级管理员权限
    for (const user of adminUsers) {
      console.log(`\n处理用户: ${user.name || user.email} (ID: ${user.id})`);
      
      // 检查用户是否已经有超级管理员角色
      const hasAdminRole = user.userRoles.some(
        userRole => userRole.role.name === ADMIN_ROLES.SUPER_ADMIN.name
      );
      
      if (hasAdminRole) {
        console.log("已有超级管理员角色，跳过");
        continue;
      }
      
      // 分配超级管理员角色
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id
        }
      });
      
      console.log("已成功分配超级管理员角色");
    }
    
    console.log("\n权限修复完成！请重新登录以使更改生效。");
    
  } catch (error) {
    console.error("修复权限时出错:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行主函数
main(); 