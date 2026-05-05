'use client'

import { ThemeToggle } from '../../components/ThemeToggle'
import { Card } from '../../components/ui/Card'
import { useTimerStore } from '../../lib/store'

export default function SettingsPage() {
  const { workDuration, breakDuration, setWorkDuration, setBreakDuration, isRunning } = useTimerStore()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <ThemeToggle />
      <Card variant="glass" className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">设置</h1>

        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium mb-4">专注时长 (分钟)</label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="120"
                value={workDuration}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (value >= 1 && value <= 120) {
                    setWorkDuration(value)
                  }
                }}
                disabled={isRunning}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="w-12 text-center font-semibold">{workDuration}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-4">休息时长 (分钟)</label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="60"
                value={breakDuration}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (value >= 1 && value <= 60) {
                    setBreakDuration(value)
                  }
                }}
                disabled={isRunning}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="w-12 text-center font-semibold">{breakDuration}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setWorkDuration(25)
              setBreakDuration(5)
            }}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            恢复默认设置
          </button>

          {isRunning && (
            <p className="text-sm text-center text-amber-500">
              计时器运行中，无法修改时长设置
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
