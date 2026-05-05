'use client'

import { useTimerStore } from '../lib/store'

export function useTimer() {
  const {
    isRunning,
    timeLeft,
    totalTime,
    mode,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode
  } = useTimerStore()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((totalTime - timeLeft) / totalTime) * 100

  return {
    isRunning,
    timeLeft,
    totalTime,
    mode,
    startTimer,
    pauseTimer,
    resetTimer,
    setMode,
    formatTime,
    progress
  }
}