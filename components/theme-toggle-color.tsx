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
  },
  green: {
    name: "green",
    activeColor: "bg-primary"
  }
}

export function ThemeToggleColor() {
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'zinc'
    }
    return 'zinc'
  })
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const setTheme = (theme: string) => {
    setCurrentTheme(theme)
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('color-theme', theme)
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e)
    }
  }

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
                className={`h-8 w-full rounded-md ring-offset-background transition-colors hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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