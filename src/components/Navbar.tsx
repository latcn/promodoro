'use client'

import { Timer, ListTodo, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-md mx-auto px-4 py-3 flex justify-around">
        <Link href="/" className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
          <Timer className="h-6 w-6" />
          <span className="text-xs mt-1">计时器</span>
        </Link>
        <Link href="/tasks" className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
          <ListTodo className="h-6 w-6" />
          <span className="text-xs mt-1">任务</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
          <BarChart3 className="h-6 w-6" />
          <span className="text-xs mt-1">统计</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
          <Settings className="h-6 w-6" />
          <span className="text-xs mt-1">设置</span>
        </Link>
      </div>
    </nav>
  )
}
