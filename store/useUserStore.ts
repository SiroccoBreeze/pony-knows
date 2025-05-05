import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  roles?: {
    role: {
      name: string;
      permissions: string[];
    }
  }[]
  permissions?: string[]
}

interface UserState {
  user: User | null
  isLoggedIn: boolean
  login: (user: User) => void
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  resetPermissions: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      login: (user) => set({ user, isLoggedIn: true }),
      logout: () => set({ user: null, isLoggedIn: false }),
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
      resetPermissions: () => set((state) => ({
        user: state.user ? { 
          ...state.user, 
          permissions: [], 
          roles: state.user.roles?.map(role => ({
            role: {
              ...role.role,
              permissions: []
            }
          }))
        } : null
      }))
    }),
    {
      name: 'user-storage', // 存储的唯一名称
      // 可选择存储的内容
      partialize: (state) => ({ 
        user: state.user,
        isLoggedIn: state.isLoggedIn
      })
    }
  )
) 