import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("开始初始化系统参数...");
    
    // 系统参数定义
    const systemParameters = [
      {
        key: "enable_registration",
        value: "true",
        group: "user",
        label: "允许用户注册",
        type: "boolean"
      },
      {
        key: "enable_comments",
        value: "true",
        group: "content",
        label: "允许评论",
        type: "boolean"
      },
      {
        key: "maintenance_mode",
        value: "false",
        group: "system",
        label: "维护模式",
        type: "boolean"
      }
    ];
    
    // 创建或更新系统参数
    for (const param of systemParameters) {
      const existing = await prisma.systemSetting.findUnique({
        where: { key: param.key }
      });
      
      if (existing) {
        console.log(`更新系统参数: ${param.key}`);
        await prisma.systemSetting.update({
          where: { key: param.key },
          data: {
            value: param.value,
            group: param.group,
            label: param.label,
            type: param.type
          }
        });
      } else {
        console.log(`创建系统参数: ${param.key}`);
        await prisma.systemSetting.create({
          data: {
            key: param.key,
            value: param.value,
            group: param.group,
            label: param.label,
            type: param.type
          }
        });
      }
    }
    
    console.log("系统参数初始化完成。");
  } catch (error) {
    console.error("初始化系统参数时出错:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 