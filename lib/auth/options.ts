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
      permissions?: string[]; // 添加permissions字段
      monthlyKeyVerified?: boolean; // 添加月度密钥验证状态
    } & DefaultSession["user"]
  }
  
  // 扩展JWT类型以明确包含roles和permissions
  interface JWT {
    id: string;
    roles?: {
      role: {
        name: string;
        permissions: string[];
      }
    }[];
    permissions?: string[]; // 添加permissions字段
    monthlyKeyVerified?: boolean; // 添加月度密钥验证状态
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
    async jwt({ token, user, trigger, session }) {
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
              },
              monthlyKeyAuth: true // 添加月度密钥认证信息
            }
          });
          
          console.log(`[JWT回调] 用户ID: ${user.id}, 找到用户: ${!!userData}`);
          
          // 检查月度密钥验证状态
          if (userData?.monthlyKeyAuth) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            
            // 检查上次验证时间是否在当月
            const authDate = userData.monthlyKeyAuth.lastVerifiedAt;
            const authMonth = authDate.getMonth() + 1;
            const authYear = authDate.getFullYear();
            
            // 设置月度密钥验证状态
            const isValidKey = (authMonth === currentMonth && 
                               authYear === currentYear && 
                               userData.monthlyKeyAuth.isValid);
            
            token.monthlyKeyVerified = isValidKey;
            console.log(`[JWT回调] 月度密钥验证状态: ${isValidKey}, 详情: ${JSON.stringify({
              authMonth,
              currentMonth,
              authYear,
              currentYear,
              isValid: userData.monthlyKeyAuth.isValid
            })}`);
          } else {
            token.monthlyKeyVerified = false;
            console.log(`[JWT回调] 用户未进行月度密钥验证`);
          }
          
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
            
            // 提取并整合所有权限
            const allPermissions = [];
            for (const userRole of cleanRoles) {
              if (userRole.role.permissions) {
                allPermissions.push(...userRole.role.permissions);
              }
            }
            
            // 保存去重的权限数组到token
            token.permissions = [...new Set(allPermissions)];
            
            console.log(`[JWT回调] 用户权限: ${token.permissions.join(', ')}`);
            console.log(`[JWT回调] 是否有管理员权限: ${token.permissions.includes('admin_access')}`);
          } else {
            console.log("[JWT回调] 用户没有角色或权限");
            token.roles = [];
            token.permissions = [];
          }
        } catch (error) {
          console.error("[JWT回调] 获取用户角色时出错:", error);
          token.roles = [];
          token.permissions = [];
          token.monthlyKeyVerified = false;
        }
      } else if (trigger === 'update' && session) {
        // 处理会话更新
        console.log("[JWT回调] 处理会话更新");
        
        // 如果是update操作并且session中包含roles和permissions，则更新token
        if (session.roles) {
          console.log("[JWT回调] 从session获取新的roles", session.roles?.length);
          (token as any).roles = session.roles;
        }
        
        if (session.permissions) {
          console.log("[JWT回调] 从session获取新的permissions", session.permissions?.length);
          (token as any).permissions = session.permissions;
        }
        
        // 更新月度密钥验证状态 - 优先级更高，单独处理
        if (session.user?.monthlyKeyVerified !== undefined) {
          const oldValue = ((token as any).monthlyKeyVerified as boolean) || false;
          const newValue = !!session.user.monthlyKeyVerified;
          (token as any).monthlyKeyVerified = newValue;
          console.log(`[JWT回调] 从session更新月度密钥验证状态: ${oldValue} -> ${newValue}`);
          
          // 如果是设置为已验证，记录更多日志以便跟踪
          if (newValue === true && oldValue !== true) {
            console.log(`[JWT回调] 用户 ${token.id} 的月度密钥验证状态已更新为已验证`);
          }
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        
        // 添加月度密钥验证状态到session
        session.user.monthlyKeyVerified = token.monthlyKeyVerified || false;
        console.log(`[Session回调] 添加月度密钥验证状态到会话: ${session.user.monthlyKeyVerified}`);
        
        // 添加角色信息到session
        if (token.roles) {
          console.log(`[Session回调] 正在添加角色到会话, 角色数量: ${(token.roles as { role: { name: string; permissions: string[] } }[]).length}`);
          session.user.roles = token.roles as {
            role: {
              name: string;
              permissions: string[];
            }
          }[];
          
          // 添加权限数组到session
          if (token.permissions) {
            session.user.permissions = token.permissions as string[];
            console.log(`[Session回调] 会话中的权限: ${session.user.permissions.join(', ')}`);
            console.log(`[Session回调] 会话中是否有admin_access权限: ${session.user.permissions.includes('admin_access')}`);
          } else {
            // 如果token中没有permissions字段，从roles中提取
            const permissions = [];
            for (const role of session.user.roles) {
              permissions.push(...(role.role.permissions || []));
            }
            session.user.permissions = [...new Set(permissions)];
            console.log(`[Session回调] 会话中的权限(从roles提取): ${session.user.permissions.join(', ')}`);
          }
        } else {
          console.log("[Session回调] Token中没有角色信息，设置空角色和权限");
          session.user.roles = [];
          session.user.permissions = [];
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