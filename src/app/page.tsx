'use client'

import { useEffect } from 'react'
import { Timer } from '../components/Timer'
import { ThemeToggle } from '../components/ThemeToggle'
import { Card } from '../components/ui/Card'
import { requestNotificationPermission } from '../lib/store'

export default function Home() {
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <ThemeToggle />
      <Card variant="glass" className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">FocusFlow</h1>
        <Timer />
      </Card>
    </div>
  )
}