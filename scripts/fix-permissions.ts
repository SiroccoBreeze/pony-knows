import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// 手动获取有效的权限名称，不依赖import
const validPermissions = [
  // 论坛权限
  "view_forum",
  "create_topic",
  
  // 服务与资源权限
  "view_services",
  "access_database",
  "access_minio",
  "access_file_downloads",
  
  // 实施底稿权限
  "access_working_papers",
  
  // 用户管理权限
  "view_users",
  
  // 个人中心权限
  "view_profile",
  
  // 管理员权限
  "admin_access"
];

async function fixPermissions() {
  console.log('开始修复数据库中的权限...');
  
  try {
    // 查找所有角色
    const roles = await prisma.role.findMany();
    console.log(`找到 ${roles.length} 个角色需要检查`);
    
    for (const role of roles) {
      console.log(`\n检查角色 "${role.name}" 的权限`);
      console.log(`当前权限数量: ${role.permissions.length}`);
      console.log('当前权限:', role.permissions);
      
      // 过滤出有效的权限
      const filteredPermissions = role.permissions.filter(perm => 
        validPermissions.includes(perm)
      );
      
      // 找出被过滤掉的权限
      const removedPermissions = role.permissions.filter(perm => 
        !filteredPermissions.includes(perm)
      );
      
      if (removedPermissions.length > 0) {
        console.log('将被移除的无效权限:', removedPermissions);
        
        // 更新角色权限
        await prisma.role.update({
          where: { id: role.id },
          data: { permissions: filteredPermissions }
        });
        
        console.log(`已更新角色 "${role.name}" 的权限:`);
        console.log('更新前:', role.permissions);
        console.log('更新后:', filteredPermissions);
        console.log(`移除了 ${removedPermissions.length} 个无效权限`);
      } else {
        console.log(`角色 "${role.name}" 的权限都是有效的，无需更新`);
      }
    }
    
    console.log('\n权限修复完成!');
  } catch (error) {
    console.error('修复权限时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复操作
fixPermissions(); 