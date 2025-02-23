'use client'

import { Button } from "@/components/ui/button"
import { Palette } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"

const themes = {
  zinc: {
    name: "zinc",
    activeColor: "bg-primary"
  },
  blue: {
    name: "blue",
    activeColor: "bg-primary"
  },
  rose: {
    name: "rose",
    activeColor: "bg-primary"
  }
}

// 获取初始主题
const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('color-theme') || 'zinc'
  }
  return 'zinc'
}

export function ThemeToggleColor() {
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(getInitialTheme)
  
  // 在组件挂载时设置主题
  useEffect(() => {
    const savedTheme = getInitialTheme()
    document.documentElement.setAttribute('data-theme', savedTheme)
    setMounted(true)
  }, [])

  const setTheme = (theme: string) => {
    setCurrentTheme(theme)
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('color-theme', theme)
  }

  // 在未挂载时返回预渲染的按钮，避免闪烁
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Palette className="h-4 w-4" />
        <span className="sr-only">切换主题颜色</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Palette className="h-4 w-4" />
          <span className="sr-only">切换主题颜色</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuLabel>主题颜色</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-3 gap-2 p-2">
          {Object.entries(themes).map(([key, theme]) => (
            <div
              key={key}
              data-theme={key}
              className="relative flex items-center justify-center"
            >
              <button
                onClick={() => setTheme(key)}
                className={`h-8 w-full rounded-md ring-offset-background transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  theme.activeColor
                } ${
                  currentTheme === key ? 'ring-2 ring-ring ring-offset-2' : ''
                }`}
              >
                <span className="sr-only">{theme.name}</span>
              </button>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 