import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { AdminPermission } from "@/lib/permissions";

// 扩展 Session 类型
interface ExtendedSession {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: {
      role: {
        name: string;
        permissions: string[];
      }
    }[];
  };
}

// 使用查询参数而非动态路由
export async function GET(request: Request) {
  try {
    // 从URL参数中获取postId和firstVisit参数
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');
    const firstVisit = searchParams.get('firstVisit') === 'true';
    
    if (!postId) {
      return NextResponse.json(
        { error: "缺少帖子ID参数" },
        { status: 400 }
      );
    }
    
    console.log("查询参数API 请求帖子ID:", postId, "首次访问:", firstVisit);

    // 查找帖子
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    console.log("查询参数API 找到帖子:", post ? "是" : "否");
    
    if (!post) {
      return NextResponse.json(
        { error: "帖子不存在" },
        { status: 404 }
      );
    }

    // 检查帖子审核状态
    if (post.reviewStatus !== 'approved') {
      // 获取当前用户会话
      const session = await getServerSession(authOptions) as ExtendedSession;
      
      // 检查用户是否是帖子作者或管理员
      let hasViewPermission = false;
      
      if (session?.user) {
        // 检查是否是作者
        const isAuthor = post.author.id === session.user.id;
        
        // 检查是否是管理员
        let isAdmin = false;
        const userPermissions: string[] = [];
        
        if (session.user.roles) {
          session.user.roles.forEach(role => {
            if (role.role.permissions) {
              userPermissions.push(...role.role.permissions);
            }
          });
          
          // 检查是否有管理员权限
          isAdmin = userPermissions.includes(AdminPermission.ADMIN_ACCESS);
          
          // 超级管理员检查
          const isSuperAdmin = session.user.roles.some(role => role.role.name === "超级管理员");
          if (isSuperAdmin) {
            isAdmin = true;
          }
        }
        
        hasViewPermission = isAuthor || isAdmin;
      }
      
      // 如果没有查看权限，返回403错误
      if (!hasViewPermission) {
        return NextResponse.json(
          { 
            error: "无权查看此帖子",
            details: post.reviewStatus === 'pending' 
              ? "该帖子正在等待审核，暂时无法查看" 
              : "该帖子未通过审核，无法查看"
          },
          { status: 403 }
        );
      }
    }

    // 只有首次访问时才增加浏览量
    if (firstVisit) {
      try {
        await prisma.post.update({
          where: { id: postId },
          data: { views: post.views + 1 }
        });
        console.log("更新浏览量成功, 帖子ID:", postId);
      } catch (updateError) {
        console.error("更新浏览量失败，但继续返回帖子内容:", updateError);
      }
    } else {
      console.log("非首次访问，不更新浏览量");
    }

    // 返回帖子数据
    return NextResponse.json(post);
  } catch (error) {
    console.error("获取帖子失败:", error);
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    return NextResponse.json(
      { 
        error: "获取帖子失败，请稍后再试", 
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
} 