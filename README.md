This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# 权限系统维护指南

## 权限清理

如果发现数据库中的权限与前端定义不一致，可以运行以下命令来修复：

```bash
# 进入项目目录
cd /path/to/project

# 运行权限修复脚本
npx ts-node scripts/fix-permissions.ts
```

这个脚本会检查所有角色的权限，并移除那些不在前端 `UserPermission` 和 `AdminPermission` 枚举中定义的权限。

## 有效的权限列表

系统目前支持的权限包括：

### 管理员权限
- `admin_access`: 管理员访问权限

### 用户权限
- 论坛权限：
  - `view_forum`: 查看论坛内容
  - `create_topic`: 创建主题帖
  
- 服务与资源权限：
  - `view_services`: 查看服务页面
  - `access_database`: 访问数据库结构
  - `access_minio`: 访问网盘服务
  - `access_file_downloads`: 访问文件下载页面
  
- 实施底稿权限：
  - `access_working_papers`: 访问实施底稿
  
- 用户管理权限：
  - `view_users`: 查看用户管理页面
  
- 个人中心权限：
  - `view_profile`: 查看个人资料
