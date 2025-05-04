"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { 
  AdminPermission, 
  UserPermission, 
  Permission
} from "@/lib/permissions"

export function useAuthPermissions() {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      // 从session中提取所有权限
      const userPermissions: string[] = []
      
      if (session.user.roles) {
        session.user.roles.forEach(role => {
          if (role.role.permissions) {
            userPermissions.push(...role.role.permissions)
          }
        })
      }
      
      // 移除重复权限
      setPermissions([...new Set(userPermissions)])
    } else {
      setPermissions([])
    }
    
    setIsLoading(status === "loading")
  }, [session, status])

  // 检查是否具有指定权限
  const hasPermission = (permission: string | Permission | AdminPermission | UserPermission): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading) return false
    
    // 检查权限数组是否包含指定权限
    return permissions.includes(permission)
  }

  // 检查是否具有任意一个指定权限
  const hasAnyPermission = (requiredPermissions: (string | Permission | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading) return false
    
    // 检查是否有任一权限匹配
    return requiredPermissions.some(perm => permissions.includes(perm))
  }

  // 检查是否具有所有指定权限
  const hasAllPermissions = (requiredPermissions: (string | Permission | AdminPermission | UserPermission)[]): boolean => {
    // 如果正在加载中，默认返回false
    if (isLoading) return false
    
    // 检查是否所有权限都匹配
    return requiredPermissions.every(perm => permissions.includes(perm))
  }

  // 检查是否具有管理员权限
  const hasAdminPermission = (permission: AdminPermission): boolean => {
    if (isLoading) return false
    return permissions.includes(permission)
  }

  // 检查是否具有用户端权限
  const hasUserPermission = (permission: UserPermission): boolean => {
    if (isLoading) return false
    return permissions.includes(permission)
  }

  // 检查是否为管理员（有任何管理员权限）
  const isAdmin = (): boolean => {
    if (isLoading) return false
    return permissions.includes(AdminPermission.ADMIN_ACCESS)
  }

  return {
    permissions,
    isLoading,
    isAuthenticated: status === "authenticated",
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasAdminPermission,
    hasUserPermission,
    isAdmin
  }
} 