'use client';

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useUserStore } from "@/store";

// 权限同步组件
function PermissionSync() {
  const { data: session, status, update } = useSession();
  const zustandLogin = useUserStore(state => state.login);
  
  useEffect(() => {
    // 仅在会话状态为authenticated时执行
    if (status === "authenticated" && session?.user) {
      // 确认会话中是否有角色和权限
      const hasRoles = session.user.roles && 
                     Array.isArray(session.user.roles) && 
                     session.user.roles.length > 0;
      
      // 如果没有角色，尝试从API获取
      if (!hasRoles) {
        console.log("NextAuthProvider - 会话缺少角色信息，尝试同步");
        
        // 异步获取权限
        (async () => {
          try {
            const response = await fetch('/api/auth/debug');
            if (response.ok) {
              const data = await response.json();
              
              if (data.authenticated && data.roles) {
                // 格式化角色数据
                interface RoleData {
                  roleName: string;
                  permissions: string[];
                }
                
                const roles = data.roles.map((r: RoleData) => ({
                  role: {
                    name: r.roleName,
                    permissions: r.permissions || []
                  }
                }));
                
                console.log("NextAuthProvider - 从API获取到角色:", roles.length);
                
                // 更新会话
                await update({ roles });
                
                // 更新Zustand状态
                const zustandUser = {
                  id: session.user.id,
                  name: session.user.name || '',
                  email: session.user.email || '',
                  roles,
                  permissions: data.permissions || []
                };
                
                zustandLogin(zustandUser);
                console.log("NextAuthProvider - 权限同步完成");
              }
            }
          } catch (error) {
            console.error("NextAuthProvider - 权限同步失败:", error);
          }
        })();
      }
    }
  }, [session, status, update, zustandLogin]);
  
  return null;
}

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PermissionSync />
      {children}
    </SessionProvider>
  );
} 