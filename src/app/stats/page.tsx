'use client'

import { ThemeToggle } from '../../components/ThemeToggle'
import { Card } from '../../components/ui/Card'
import { useTimerStore } from '../../lib/store'

export default function StatsPage() {
  const { pomodoroCount, totalFocusTime, dailyStats } = useTimerStore()

  const getWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      weekDates.push({ date: dateStr, day: dayNames[i] })
    }
    return weekDates
  }

  const weekDates = getWeekDates()
  
  const weeklyStats = weekDates.map(({ date, day }) => {
    const stat = dailyStats.find(s => s.date === date)
    return { day, count: stat ? stat.count : 0 }
  })

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  const todayStats = dailyStats.find(s => s.date === todayStr)
  const todayCount = todayStats ? todayStats.count : 0

  const maxCount = Math.max(1, ...weeklyStats.map(stat => stat.count))

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <ThemeToggle />
      <Card variant="glass" className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">数据统计</h1>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">今日完成</h2>
            <p className="text-4xl font-bold text-primary">{todayCount}</p>
            <p className="text-gray-500">个番茄钟</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">本周统计</h2>
            <div className="space-y-2">
              {weeklyStats.map((stat) => (
                <div key={stat.day} className="flex items-center space-x-3">
                  <span className="w-16 text-sm">{stat.day}</span>
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(stat.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm text-right">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <h3 className="text-sm text-gray-500">总专注时间</h3>
              <p className="text-xl font-bold">{totalFocusTime} 分钟</p>
            </Card>
            <Card>
              <h3 className="text-sm text-gray-500">累计完成</h3>
              <p className="text-xl font-bold">{pomodoroCount} 个</p>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  )
}