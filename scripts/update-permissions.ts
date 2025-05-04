import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePermissions() {
  console.log('开始更新权限数据...');
  
  try {
    // 查找所有角色
    const roles = await prisma.role.findMany();
    console.log(`找到 ${roles.length} 个角色需要检查`);
    
    // 遍历角色并更新权限
    for (const role of roles) {
      const originalPermissions = [...role.permissions];
      
      // 检查是否包含旧的权限
      if (role.permissions.includes('access_forum')) {
        console.log(`角色 "${role.name}" 包含旧的 access_forum 权限`);
        
        // 移除旧权限
        let updatedPermissions = role.permissions.filter(
          perm => perm !== 'access_forum'
        );
        
        // 确保拥有新权限
        if (!updatedPermissions.includes('view_forum')) {
          console.log(`添加 view_forum 权限到角色 "${role.name}"`);
          updatedPermissions.push('view_forum');
        }
        
        // 更新角色权限
        await prisma.role.update({
          where: { id: role.id },
          data: { permissions: updatedPermissions }
        });
        
        console.log(`更新了角色 "${role.name}" 的权限:`);
        console.log('之前:', originalPermissions);
        console.log('之后:', updatedPermissions);
      } else {
        console.log(`角色 "${role.name}" 没有旧的权限，无需更新`);
      }
    }
    
    console.log('权限更新完成!');
  } catch (error) {
    console.error('更新权限时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行更新操作
updatePermissions(); 