'use client'

import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from './ui/Button'
import { useTimer } from '../hooks/useTimer'
import { useTimerStore } from '../lib/store'

export function Timer() {
  const {
    isRunning,
    timeLeft,
    mode,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    formatTime,
    progress
  } = useTimer()

  const { workDuration, breakDuration } = useTimerStore()

  const animationDuration = mode === 'work' ? workDuration * 60 : breakDuration * 60

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="w-64 h-64 relative">
        <motion.div
          className="absolute inset-0 rounded-full border-8 border-primary/20"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: animationDuration,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
            paused: !isRunning
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold mb-2">
            {mode === 'work' ? '专注时间' : '休息时间'}
          </h2>
          <div className="text-6xl font-bold">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <Button
          variant="default"
          size="lg"
          onClick={isRunning ? pauseTimer : startTimer}
        >
          {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isRunning ? '暂停' : '开始'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={resetTimer}
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          重置
        </Button>
      </div>

      <div className="flex space-x-4">
        <Button
          variant={mode === 'work' ? 'default' : 'ghost'}
          onClick={() => setMode('work')}
        >
          专注 ({workDuration}分钟)
        </Button>
        <Button
          variant={mode === 'break' ? 'default' : 'ghost'}
          onClick={() => setMode('break')}
        >
          休息 ({breakDuration}分钟)
        </Button>
      </div>

      <div className="w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 10 }}
        />
      </div>
    </div>
  )
}