import { create } from 'zustand'
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

const DB_NAME = 'promodoro-db'
const DB_VERSION = 3
const STORES = ['timer-storage', 'task-storage', 'theme-storage', 'crypto-key']

let dbInstance: IDBDatabase | null = null
let dbInitPromise: Promise<IDBDatabase> | null = null
let encryptionKey: CryptoKey | null = null

const getOrCreateKey = async (db: IDBDatabase): Promise<CryptoKey> => {
  if (encryptionKey) return encryptionKey

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('crypto-key', 'readonly')
    const store = transaction.objectStore('crypto-key')
    const getRequest = store.get('key')
    getRequest.onsuccess = async () => {
      if (getRequest.result) {
        try {
          encryptionKey = await crypto.subtle.importKey(
            'jwk',
            getRequest.result,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          )
          resolve(encryptionKey)
        } catch {
          encryptionKey = await generateNewKey(db)
          resolve(encryptionKey)
        }
      } else {
        encryptionKey = await generateNewKey(db)
        resolve(encryptionKey)
      }
    }
    getRequest.onerror = async () => {
      encryptionKey = await generateNewKey(db)
      resolve(encryptionKey)
    }
  })
}

const generateNewKey = async (db: IDBDatabase): Promise<CryptoKey> => {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const exportedKey = await crypto.subtle.exportKey('jwk', key)
  return new Promise((resolve) => {
    const transaction = db.transaction('crypto-key', 'readwrite')
    const store = transaction.objectStore('crypto-key')
    store.put(exportedKey, 'key')
    transaction.oncomplete = () => resolve(key)
    transaction.onerror = () => resolve(key)
  })
}

const encrypt = async (data: string, key: CryptoKey): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedData = new TextEncoder().encode(data)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

const decrypt = async (encryptedData: string, key: CryptoKey): Promise<string> => {
  try {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return ''
  }
}

const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }
  if (dbInitPromise) {
    return dbInitPromise
  }

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => {
      dbInitPromise = null
      reject(request.error)
    }
    request.onsuccess = () => {
      dbInstance = request.result
      dbInitPromise = null
      resolve(dbInstance)
    }
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName)
        }
      })
    }
  })

  return dbInitPromise
}

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await initDB()
      const key = await getOrCreateKey(db)
      return new Promise((resolve) => {
        const transaction = db.transaction(name, 'readonly')
        const store = transaction.objectStore(name)
        const getRequest = store.get('state')
        getRequest.onsuccess = async () => {
          if (getRequest.result) {
            const decrypted = await decrypt(getRequest.result, key)
            resolve(decrypted || null)
          } else {
            resolve(null)
          }
        }
        getRequest.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await initDB()
      const key = await getOrCreateKey(db)
      const encrypted = await encrypt(value, key)
      return new Promise((resolve) => {
        const transaction = db.transaction(name, 'readwrite')
        const store = transaction.objectStore(name)
        store.put(encrypted, 'state')
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      })
    } catch {
      return
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await initDB()
      return new Promise((resolve) => {
        const transaction = db.transaction(name, 'readwrite')
        const store = transaction.objectStore(name)
        store.delete('state')
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      })
    } catch {
      return
    }
  }
}

interface DailyStat {
  date: string
  count: number
}

interface TimerState {
  isRunning: boolean
  timeLeft: number
  totalTime: number
  mode: 'work' | 'break'
  pomodoroCount: number
  workDuration: number
  breakDuration: number
  totalFocusTime: number
  dailyStats: DailyStat[]
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  setMode: (mode: 'work' | 'break') => void
  tick: () => void
  resetPomodoroCount: () => void
  setWorkDuration: (minutes: number) => void
  setBreakDuration: (minutes: number) => void
}

interface TaskState {
  tasks: {
    id: string
    title: string
    description: string
    targetPomodoroCount: number
    actualDuration: number
    completed: boolean
    createdAt: string
    completedAt?: string
  }[]
  addTask: (title: string, description: string, targetPomodoroCount: number, actualDuration: number) => void
  toggleTask: (id: string, actualDuration?: number) => void
  deleteTask: (id: string) => void
  deleteTasks: (ids: string[]) => void
  updateActualDuration: (id: string, duration: number) => void
}

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

const getTodayDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const getDayOfWeek = (dateStr: string) => {
  const date = new Date(dateStr)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[date.getDay()]
}

let timerInterval: ReturnType<typeof setInterval> | null = null

const formatTimeForTray = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const updateTrayTooltip = async (state: TimerState) => {
  try {
    await invoke('update_tray_tooltip', {
      status: {
        time: formatTimeForTray(state.timeLeft),
        mode: state.mode === 'work' ? '专注' : '休息',
        is_running: state.isRunning
      }
    })
  } catch {
    // Tauri not available in browser
  }
}

const requestNotificationPermission = async () => {
  try {
    const granted = await isPermissionGranted()
    if (!granted) {
      await requestPermission()
    }
  } catch {
    // Tauri not available in browser
  }
}

let lastNotificationTime = 0
const NOTIFICATION_COOLDOWN_MS = 60000

const showPomodoroNotification = async () => {
  const now = Date.now()
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN_MS) {
    return
  }
  lastNotificationTime = now
  try {
    await sendNotification({
      title: '🎉 太棒了！',
      body: '你完成了一个番茄钟！继续保持专注！'
    })
  } catch {
    // Tauri not available in browser
  }
}

const timerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      timeLeft: 25 * 60,
      totalTime: 25 * 60,
      mode: 'work',
      pomodoroCount: 0,
      workDuration: 25,
      breakDuration: 5,
      totalFocusTime: 0,
      dailyStats: [],
      startTimer: () => {
        set({ isRunning: true })
        if (!timerInterval) {
          timerInterval = setInterval(() => {
            timerStore.getState().tick()
          }, 1000)
        }
        updateTrayTooltip(timerStore.getState())
      },
      pauseTimer: () => {
        set({ isRunning: false })
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
        updateTrayTooltip(timerStore.getState())
      },
      resetTimer: () => {
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
        set((state) => {
          const newState = {
            timeLeft: state.mode === 'work' ? state.workDuration * 60 : state.breakDuration * 60,
            totalTime: state.mode === 'work' ? state.workDuration * 60 : state.breakDuration * 60,
            isRunning: false
          }
          setTimeout(() => updateTrayTooltip({ ...state, ...newState }), 0)
          return newState
        })
      },
      setMode: (mode) => {
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
        set((state) => {
          const newState = {
            mode,
            timeLeft: mode === 'work' ? state.workDuration * 60 : state.breakDuration * 60,
            totalTime: mode === 'work' ? state.workDuration * 60 : state.breakDuration * 60,
            isRunning: false
          }
          setTimeout(() => updateTrayTooltip({ ...state, ...newState }), 0)
          return newState
        })
      },
      tick: () => {
        const state = timerStore.getState()
        if (state.timeLeft <= 1) {
          const newMode = state.mode === 'work' ? 'break' : 'work'
          const today = getTodayDate()
          
          let newDailyStats = [...state.dailyStats]
          if (state.mode === 'work') {
            const existingDayIndex = newDailyStats.findIndex(s => s.date === today)
            if (existingDayIndex >= 0) {
              newDailyStats[existingDayIndex].count += 1
            } else {
              newDailyStats.push({ date: today, count: 1 })
            }
            showPomodoroNotification()
          }
          
          const newTotalFocusTime = state.mode === 'work' 
            ? state.totalFocusTime + state.workDuration 
            : state.totalFocusTime
          
          const newIsRunning = newMode === 'break'
          
          if (!newIsRunning && timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
          }
          
          const newTimeLeft = newMode === 'work' ? state.workDuration * 60 : state.breakDuration * 60
          set({
            timeLeft: newTimeLeft,
            totalTime: newTimeLeft,
            mode: newMode,
            isRunning: newIsRunning,
            pomodoroCount: state.pomodoroCount + (state.mode === 'work' ? 1 : 0),
            totalFocusTime: newTotalFocusTime,
            dailyStats: newDailyStats
          })
          setTimeout(() => updateTrayTooltip({ ...state, timeLeft: newTimeLeft, mode: newMode, isRunning: newIsRunning }), 0)
        } else {
          set({
            timeLeft: state.timeLeft - 1
          })
          setTimeout(() => updateTrayTooltip({ ...state, timeLeft: state.timeLeft - 1 }), 0)
        }
      },
      resetPomodoroCount: () => set({ pomodoroCount: 0 }),
      setWorkDuration: (minutes) => set((state) => ({
        workDuration: minutes,
        ...(state.mode === 'work' && !state.isRunning ? {
          timeLeft: minutes * 60,
          totalTime: minutes * 60
        } : {})
      })),
      setBreakDuration: (minutes) => set((state) => ({
        breakDuration: minutes,
        ...(state.mode === 'break' && !state.isRunning ? {
          timeLeft: minutes * 60,
          totalTime: minutes * 60
        } : {})
      }))
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        isRunning: state.isRunning,
        timeLeft: state.timeLeft,
        totalTime: state.totalTime,
        mode: state.mode,
        pomodoroCount: state.pomodoroCount,
        workDuration: state.workDuration,
        breakDuration: state.breakDuration,
        totalFocusTime: state.totalFocusTime,
        dailyStats: state.dailyStats
      })
    }
  )
)

export const useTimerStore = timerStore
export { requestNotificationPermission, showPomodoroNotification }

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

if (isTauri) {
  listen('cleanup-before-quit', () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    timerStore.getState().resetTimer()
  })
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (title, description, targetPomodoroCount, actualDuration) => set((state) => ({
        tasks: [...state.tasks, {
          id: Date.now().toString(),
          title,
          description,
          targetPomodoroCount,
          actualDuration,
          completed: false,
          createdAt: new Date().toISOString()
        }]
      })),
      toggleTask: (id, actualDuration) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? { ...task, completed: !task.completed, ...(actualDuration !== undefined ? { actualDuration } : {}), completedAt: !task.completed ? new Date().toISOString() : undefined } : task
        )
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(task => task.id !== id)
      })),
      deleteTasks: (ids) => set((state) => ({
        tasks: state.tasks.filter(task => !ids.includes(task.id))
      })),
      updateActualDuration: (id, duration) => set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? { ...task, actualDuration: duration } : task
        )
      }))
    }),
    {
      name: 'task-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        tasks: state.tasks
      })
    }
  )
)

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () => set((state) => {
        const newIsDark = !state.isDark
        if (newIsDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { isDark: newIsDark }
      })
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        isDark: state.isDark
      })
    }
  )
)
