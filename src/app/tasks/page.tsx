'use client'

import { useState } from 'react'
import { Plus, X, Check, Trash2, Edit3, Download } from 'lucide-react'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useTaskStore } from '../../lib/store'
import { useTimerStore } from '../../lib/store'

export default function TasksPage() {
  const { tasks, addTask, toggleTask, deleteTask, deleteTasks, updateActualDuration } = useTaskStore()
  const { workDuration } = useTimerStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetPomodoroCount, setTargetPomodoroCount] = useState(1)
  
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const [showDurationInput, setShowDurationInput] = useState(false)
  const [customDuration, setCustomDuration] = useState(0)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState<string>('all')
  const [exportCreatedStart, setExportCreatedStart] = useState('')
  const [exportCreatedEnd, setExportCreatedEnd] = useState('')
  const [exportCompletedStart, setExportCompletedStart] = useState('')
  const [exportCompletedEnd, setExportCompletedEnd] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const calculatedDuration = targetPomodoroCount * workDuration

  const toggleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const selectAllTasks = (taskIds: string[]) => {
    setSelectedTasks(taskIds)
  }

  const clearSelection = () => {
    setSelectedTasks([])
    setIsSelectionMode(false)
  }

  const handleBatchDelete = () => {
    if (selectedTasks.length > 0) {
      deleteTasks(selectedTasks)
      clearSelection()
    }
  }

  const handleAddTask = () => {
    if (title.trim()) {
      addTask(title.trim(), description.trim(), targetPomodoroCount, calculatedDuration)
      setTitle('')
      setDescription('')
      setTargetPomodoroCount(1)
      setIsModalOpen(false)
    }
  }

  const handleCompleteClick = (taskId: string) => {
    setCompletingTask(taskId)
    setShowDurationInput(false)
  }

  const handleCompleteConfirm = (updateDuration: boolean) => {
    if (completingTask) {
      if (updateDuration && showDurationInput && customDuration > 0) {
        toggleTask(completingTask, customDuration)
      } else {
        toggleTask(completingTask)
      }
      setCompletingTask(null)
      setShowDurationInput(false)
      setCustomDuration(0)
    }
  }

  const handleExport = async () => {
    let filteredTasks = [...tasks]

    if (exportStatus === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed === true)
    } else if (exportStatus === 'uncompleted') {
      filteredTasks = filteredTasks.filter(task => task.completed === false)
    }

    if (exportCreatedStart) {
      const startDate = new Date(exportCreatedStart)
      if (!isNaN(startDate.getTime())) {
        filteredTasks = filteredTasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return !isNaN(taskDate.getTime()) && taskDate >= startDate
        })
      }
    }

    if (exportCreatedEnd) {
      const endDate = new Date(exportCreatedEnd)
      if (!isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999)
        filteredTasks = filteredTasks.filter(task => {
          const taskDate = new Date(task.createdAt)
          return !isNaN(taskDate.getTime()) && taskDate <= endDate
        })
      }
    }

    if (exportCompletedStart) {
      const startDate = new Date(exportCompletedStart)
      if (!isNaN(startDate.getTime())) {
        filteredTasks = filteredTasks.filter(task => {
          if (!task.completedAt) return false
          const taskDate = new Date(task.completedAt)
          return !isNaN(taskDate.getTime()) && taskDate >= startDate
        })
      }
    }

    if (exportCompletedEnd) {
      const endDate = new Date(exportCompletedEnd)
      if (!isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999)
        filteredTasks = filteredTasks.filter(task => {
          if (!task.completedAt) return false
          const taskDate = new Date(task.completedAt)
          return !isNaN(taskDate.getTime()) && taskDate <= endDate
        })
      }
    }

    filteredTasks.sort((a, b) => {
      const dateA = new Date(a.createdAt)
      const dateB = new Date(b.createdAt)
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
      return dateB.getTime() - dateA.getTime()
    })

    const uncompleted = filteredTasks.filter(t => !t.completed)
    const completed = filteredTasks.filter(t => t.completed)

    const sanitizeCell = (text: string | undefined | null): string => {
      if (!text) return '-'
      return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    }

    let markdown = '# 任务导出\n\n'
    const exportTime = formatDateTime(new Date().toISOString())
    markdown += `> 导出时间: ${exportTime}\n\n`
    markdown += `> 筛选条件: 状态=${exportStatus === 'all' ? '全部' : exportStatus === 'completed' ? '已完成' : '进行中'}\n`
    if (exportCreatedStart || exportCreatedEnd) {
      markdown += `, 创建时间区间=${exportCreatedStart || '*'} ~ ${exportCreatedEnd || '*'}\n`
    }
    if (exportCompletedStart || exportCompletedEnd) {
      markdown += `, 完成时间区间=${exportCompletedStart || '*'} ~ ${exportCompletedEnd || '*'}\n`
    }
    markdown += '\n---\n\n'

    if (uncompleted.length > 0) {
      markdown += '## 进行中\n\n'
      markdown += '| 任务名称 | 描述 | 目标(个) | 实际时长(分钟) | 创建时间 |\n'
      markdown += '|---------|-----|---------|--------------|--------|\n'
      uncompleted.forEach(task => {
        markdown += `| ${sanitizeCell(task.title)} | ${sanitizeCell(task.description)} | ${task.targetPomodoroCount} | ${task.actualDuration} | ${formatDateTime(task.createdAt)} |\n`
      })
      markdown += '\n'
    }

    if (completed.length > 0) {
      markdown += '## 已完成\n\n'
      markdown += '| 任务名称 | 描述 | 目标(个) | 实际时长(分钟) | 创建时间 | 完成时间 |\n'
      markdown += '|---------|-----|---------|--------------|--------|----------|\n'
      completed.forEach(task => {
        markdown += `| ${sanitizeCell(task.title)} | ${sanitizeCell(task.description)} | ${task.targetPomodoroCount} | ${task.actualDuration} | ${formatDateTime(task.createdAt)} | ${task.completedAt ? formatDateTime(task.completedAt) : '-'} |\n`
      })
    }

    if (uncompleted.length === 0 && completed.length === 0) {
      markdown += '*暂无符合条件的任务*\n'
    }

    const safeExportTime = exportTime.replace(/[:\s\/\\\\|\<\>\?\"\*]/g, '-')
    const defaultFileName = `tasks-export-${safeExportTime}.md`

    try {
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      })

      if (filePath) {
        await writeTextFile(filePath, markdown)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }

    setIsExportModalOpen(false)
  }

  const uncompletedTasks = tasks.filter(task => !task.completed)
  const completedTasks = tasks.filter(task => task.completed)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayCompletedTasks = completedTasks.filter(task => {
    if (!task.completedAt) return false
    const completedDate = new Date(task.completedAt)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() === today.getTime()
  })

  const historicalTasks = completedTasks.filter(task => {
    if (!task.completedAt) return false
    const completedDate = new Date(task.completedAt)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() < today.getTime()
  })

  const taskToComplete = completingTask ? tasks.find(t => t.id === completingTask) : null

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <ThemeToggle />
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">任务管理</h1>
          <div className="flex space-x-2">
            {isSelectionMode ? (
              <>
                <Button variant="ghost" onClick={() => selectAllTasks([...uncompletedTasks.map(t => t.id), ...todayCompletedTasks.map(t => t.id), ...historicalTasks.map(t => t.id)])}>
                  全选
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleBatchDelete}
                  disabled={selectedTasks.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除 ({selectedTasks.length})
                </Button>
                <Button variant="secondary" onClick={clearSelection}>
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setIsSelectionMode(true)}>
                  选择
                </Button>
                <Button variant="ghost" onClick={() => setIsExportModalOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  导出
                </Button>
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-3 h-3 bg-primary rounded-full mr-2"></span>
              进行中 ({uncompletedTasks.length})
            </h2>
            <div className="space-y-2">
              {uncompletedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无进行中的任务</p>
              ) : (
                uncompletedTasks.map(task => (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-start space-x-3">
                      {isSelectionMode ? (
                        <button
                          onClick={() => toggleSelectTask(task.id)}
                          className="mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: selectedTasks.includes(task.id) ? '#22c55e' : '#d1d5db',
                            backgroundColor: selectedTasks.includes(task.id) ? '#22c55e' : 'transparent'
                          }}
                        >
                          {selectedTasks.includes(task.id) && <Check className="h-3 w-3 text-white" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCompleteClick(task.id)}
                          className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
                        >
                          <Check className="h-3 w-3 text-transparent hover:text-primary" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-500 truncate">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <span className="text-gray-500">目标: {task.targetPomodoroCount} 个番茄钟</span>
                          <span className="text-primary">实际时长: {task.actualDuration} 分钟</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400 space-y-1">
                          <div>创建: {formatDateTime(task.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateActualDuration(task.id, task.actualDuration + workDuration)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit3 className="h-4 w-4 text-primary" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              已完成 ({todayCompletedTasks.length})
            </h2>
            <div className="space-y-2">
              {todayCompletedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无今日已完成的任务</p>
              ) : (
                todayCompletedTasks.map(task => (
                  <Card key={task.id} className="p-3 opacity-70">
                    <div className="flex items-start space-x-3">
                      {isSelectionMode ? (
                        <button
                          onClick={() => toggleSelectTask(task.id)}
                          className="mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: selectedTasks.includes(task.id) ? '#22c55e' : '#d1d5db',
                            backgroundColor: selectedTasks.includes(task.id) ? '#22c55e' : 'transparent'
                          }}
                        >
                          {selectedTasks.includes(task.id) && <Check className="h-3 w-3 text-white" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="mt-1 w-5 h-5 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-white" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-through">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-500 truncate line-through">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <span className="text-gray-500">目标: {task.targetPomodoroCount} 个番茄钟</span>
                          <span className="text-green-600">实际时长: {task.actualDuration} 分钟</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400 space-y-1">
                          <div>创建: {formatDateTime(task.createdAt)}</div>
                          {task.completedAt && (
                            <div>完成: {formatDateTime(task.completedAt)}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
              历史任务 ({historicalTasks.length})
            </h2>
            <div className="space-y-2">
              {historicalTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无历史任务</p>
              ) : (
                historicalTasks.map(task => (
                  <Card key={task.id} className="p-3 opacity-60">
                    <div className="flex items-start space-x-3">
                      {isSelectionMode ? (
                        <button
                          onClick={() => toggleSelectTask(task.id)}
                          className="mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: selectedTasks.includes(task.id) ? '#22c55e' : '#d1d5db',
                            backgroundColor: selectedTasks.includes(task.id) ? '#22c55e' : 'transparent'
                          }}
                        >
                          {selectedTasks.includes(task.id) && <Check className="h-3 w-3 text-white" />}
                        </button>
                      ) : (
                        <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-400 bg-gray-400 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-through">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-500 truncate line-through">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <span className="text-gray-500">目标: {task.targetPomodoroCount} 个番茄钟</span>
                          <span className="text-gray-600">实际时长: {task.actualDuration} 分钟</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400 space-y-1">
                          <div>创建: {formatDateTime(task.createdAt)}</div>
                          {task.completedAt && (
                            <div>完成: {formatDateTime(task.completedAt)}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">添加新任务</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">任务名称 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入任务名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">任务描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入任务描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">番茄钟数量 *</label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setTargetPomodoroCount(Math.max(1, targetPomodoroCount - 1))}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-12 text-center">{targetPomodoroCount}</span>
                  <button
                    onClick={() => setTargetPomodoroCount(targetPomodoroCount + 1)}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">实际时长（自动计算）</label>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-primary">{calculatedDuration}</span>
                  <span className="text-gray-500">分钟</span>
                  <span className="text-sm text-gray-400">( {targetPomodoroCount} × {workDuration} 分钟 )</span>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddTask} disabled={!title.trim()}>
                  添加
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {completingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">完成任务</h2>
              <button onClick={() => { setCompletingTask(null); setShowDurationInput(false); setCustomDuration(0); }}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                确定要将任务 "{taskToComplete?.title}" 标记为完成吗？
              </p>
              {!showDurationInput ? (
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>是否更新实际完成时长？</span>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">实际完成时长（分钟）</label>
                  <input
                    type="number"
                    min="1"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="请输入实际完成时长"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    当前预估时长: {taskToComplete?.actualDuration} 分钟
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" onClick={() => { setCompletingTask(null); setShowDurationInput(false); setCustomDuration(0); }}>
                  取消
                </Button>
                {!showDurationInput ? (
                  <>
                    <Button variant="ghost" onClick={() => handleCompleteConfirm(false)}>
                      否，直接完成
                    </Button>
                    <Button onClick={() => setShowDurationInput(true)}>
                      是，更新时长
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setShowDurationInput(false)}>
                      返回
                    </Button>
                    <Button onClick={() => handleCompleteConfirm(true)} disabled={customDuration <= 0}>
                      确认完成
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">导出任务</h2>
              <button onClick={() => setIsExportModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">任务状态</label>
                <select
                  value={exportStatus}
                  onChange={(e) => setExportStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">全部</option>
                  <option value="completed">已完成</option>
                  <option value="uncompleted">进行中</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">创建时间区间</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={exportCreatedStart}
                    onChange={(e) => setExportCreatedStart(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="开始日期"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="date"
                    value={exportCreatedEnd}
                    onChange={(e) => setExportCreatedEnd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="结束日期"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">完成时间区间</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={exportCompletedStart}
                    onChange={(e) => setExportCompletedStart(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="开始日期"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="date"
                    value={exportCompletedEnd}
                    onChange={(e) => setExportCompletedEnd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="结束日期"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleExport}>
                  导出
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}