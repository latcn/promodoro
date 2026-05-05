'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/Button'
import { useThemeStore } from '../lib/store'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="fixed top-4 right-4"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}