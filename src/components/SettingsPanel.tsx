'use client'

import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { useTimerStore } from '../lib/store'

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { workDuration, breakDuration, setWorkDuration, setBreakDuration, isRunning } = useTimerStore()

  const handleWorkDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (value >= 1 && value <= 120) {
      setWorkDuration(value)
    }
  }

  const handleBreakDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (value >= 1 && value <= 60) {
      setBreakDuration(value)
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setIsOpen(true)} className="fixed top-20 right-4 z-40">
        <Settings className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">设置</h2>
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">专注时长 (分钟)</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="120"
                    value={workDuration}
                    onChange={handleWorkDurationChange}
                    disabled={isRunning}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-center font-semibold">{workDuration}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">休息时长 (分钟)</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={breakDuration}
                    onChange={handleBreakDurationChange}
                    disabled={isRunning}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-center font-semibold">{breakDuration}</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button variant="secondary" onClick={() => {
                  setWorkDuration(25)
                  setBreakDuration(5)
                }}>
                  恢复默认
                </Button>
                <Button onClick={() => setIsOpen(false)} className="flex-1">
                  确定
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
