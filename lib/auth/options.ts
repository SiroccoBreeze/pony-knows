import { NextAuthOptions, DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { normalizePermissions } from "@/lib/permissions-util";

// 扩展 Session 类型
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roles?: {
        role: {
          name: string;
          permissions: string[];
        }
      }[];
    } & DefaultSession["user"]
  }
  
  // 扩展JWT类型以明确包含roles
  interface JWT {
    id: string;
    roles?: {
      role: {
        name: string;
        permissions: string[];
      }
    }[];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("邮箱和密码必填");
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user || !user.password) {
            throw new Error("用户不存在");
          }

          // 检查用户是否已被激活且通过审核
          if (!user.isActive) {
            // 如果状态是pending，则是待审核状态
            if (user.status === "pending") {
              throw new Error("账户正在等待管理员审核，请耐心等待");
            } else {
              throw new Error("账户已被禁用，请联系管理员");
            }
          }

          // 检查用户状态是否为审核通过
          if (user.status === "pending") {
            throw new Error("账户正在等待管理员审核，请耐心等待");
          }

          if (user.status === "rejected") {
            throw new Error("账户审核未通过，请联系管理员");
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("密码错误");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || ""
          };
        } catch (error) {
          console.error("认证错误:", error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 记录触发JWT回调的原因
      console.log(`[JWT回调] 触发原因: ${trigger || 'initial'}`);
      
      if (user) {
        token.id = user.id;
        
        try {
          // 获取用户角色信息
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              userRoles: {
                include: {
                  role: true
                }
              }
            }
          });
          
          console.log(`[JWT回调] 用户ID: ${user.id}, 找到用户: ${!!userData}`);
          
          if (userData && userData.userRoles && userData.userRoles.length > 0) {
            console.log(`[JWT回调] 用户角色数量: ${userData.userRoles.length}`);
            
            // 确保权限是格式化后的数组
            const roles = userData.userRoles.map(userRole => {
              // 使用normalizePermissions函数处理权限
              const permissions = normalizePermissions(userRole.role.permissions);
              
              console.log(`[JWT回调] 角色 ${userRole.role.name} 权限:`, permissions);
              
              return {
                role: {
                  name: userRole.role.name,
                  permissions
                }
              };
            });
            
            // 清除可能存在的undefined和null
            const cleanRoles = JSON.parse(JSON.stringify(roles));
            token.roles = cleanRoles;
            
            // 记录权限信息
            const allPermissions = [];
            for (const userRole of cleanRoles) {
              if (userRole.role.permissions) {
                allPermissions.push(...userRole.role.permissions);
              }
            }
            
            console.log(`[JWT回调] 用户权限: ${allPermissions.join(', ')}`);
            console.log(`[JWT回调] 是否有管理员权限: ${allPermissions.includes('admin_access')}`);
            console.log(`[JWT回调] Token:`, JSON.stringify(token, null, 2));
          } else {
            console.log("[JWT回调] 用户没有角色或权限");
          }
        } catch (error) {
          console.error("[JWT回调] 获取用户角色时出错:", error);
        }
      } else if (trigger === 'update') {
        // 如果是更新操作，保留现有的id和roles
        console.log("[JWT回调] 更新会话，保留现有token数据");
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        
        // 添加角色信息到session
        if (token.roles) {
          console.log(`[Session回调] 正在添加角色到会话, 角色数量: ${(token.roles as { role: { name: string; permissions: string[] } }[]).length}`);
          session.user.roles = token.roles as {
            role: {
              name: string;
              permissions: string[];
            }
          }[];
          
          // 打印会话中的权限
          const permissions = [];
          for (const role of session.user.roles) {
            permissions.push(...(role.role.permissions || []));
          }
          console.log(`[Session回调] 会话中的权限: ${permissions.join(', ')}`);
          console.log(`[Session回调] 会话中是否有admin_access权限: ${permissions.includes('admin_access')}`);
        } else {
          console.log("[Session回调] Token中没有角色信息");
        }
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 3 * 60 * 60, // 3小时
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}; 