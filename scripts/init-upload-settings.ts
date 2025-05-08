import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("开始初始化文件上传相关系统参数...");
    
    // 文件上传相关系统参数定义
    const uploadParameters = [
      {
        key: "upload_max_file_size_mb",
        value: "5", // 默认5MB
        group: "upload",
        label: "最大文件上传大小(MB)",
        type: "number"
      },
      {
        key: "upload_allowed_file_types",
        value: "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-rar-compressed,application/x-7z-compressed",
        group: "upload",
        label: "允许的文件类型",
        type: "text"
      },
      {
        key: "upload_enabled",
        value: "true",
        group: "upload",
        label: "允许文件上传",
        type: "boolean"
      }
    ];
    
    // 创建或更新系统参数
    for (const param of uploadParameters) {
      const existing = await prisma.systemSetting.findUnique({
        where: { key: param.key }
      });
      
      if (existing) {
        console.log(`更新文件上传参数: ${param.key}`);
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
        console.log(`创建文件上传参数: ${param.key}`);
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
    
    console.log("文件上传参数初始化完成。");
  } catch (error) {
    console.error("初始化文件上传参数时出错:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 