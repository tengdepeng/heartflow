// ============================================================
// Worklog 桥接层
// 简化透传：直接暴露各 composable 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import {
  useWorklog,
  useWorklogAnalytics,
  useWorklogHabits,
  useProductivityPrediction,
  useWorklogExport,
} from './index'
import type {
  LogEntry,
  LogEntryType,
  MoodTone,
  WorklogStats,
  ExportConfig,
  ExportResult,
} from './index'

export interface WorklogSummary {
  totalEntries: number
  todayEntries: number
  weekEntries: number
  streakDays: number
  mostProductiveDay: string
  mostProductiveHour: number
}

export function useWorklogModuleBridge() {
  const worklog = useWorklog()
  const analytics = useWorklogAnalytics()
  const habits = useWorklogHabits()
  const prediction = useProductivityPrediction()
  const exportTool = useWorklogExport()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed<WorklogSummary>(() => {
    const entries = worklog.entries.value
    const stats: WorklogStats = worklog.getStats()
    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const todayEntries = entries.filter(e => e.createdAt.startsWith(today)).length
    const weekEntries = entries.filter(
      e => new Date(e.createdAt) >= weekStart,
    ).length

    return {
      totalEntries: entries.length,
      todayEntries,
      weekEntries,
      streakDays: stats.streakDays,
      mostProductiveDay: stats.mostProductiveDay,
      mostProductiveHour: stats.mostProductiveHour,
    }
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      await worklog.load()
    } finally {
      isLoading.value = false
    }
  }

  function createEntry(data: {
    type: LogEntryType
    title: string
    content: string
    mood?: MoodTone
    tags?: string[]
    sessionIds?: string[]
    roomId?: string
  }): LogEntry {
    return worklog.addEntry(data)
  }

  function updateEntry(
    id: string,
    updates: Partial<Omit<LogEntry, 'id' | 'createdAt'>>,
  ): LogEntry | null {
    return worklog.updateEntry(id, updates)
  }

  function removeEntry(id: string): boolean {
    return worklog.removeEntry(id)
  }

  function getDailySummary(date?: Date) {
    return worklog.generateDailySummary(date ?? new Date())
  }

  function getWeeklySummary(date?: Date) {
    return worklog.generateWeeklySummary(date ?? new Date())
  }

  function refreshAnalytics(): void {
    const stats = worklog.getStats()
    analytics.updateAnalytics(worklog.entries.value, stats)
  }

  function exportData(
    config?: Partial<ExportConfig>,
  ): ExportResult {
    return exportTool.exportEntries(worklog.entries.value, config)
  }

  return {
    // 状态
    entries: worklog.entries,
    filteredEntries: worklog.filteredEntries,
    allTags: worklog.allTags,
    entryCount: worklog.entryCount,
    isLoading,
    summary,
    // 统计
    getStats: worklog.getStats,
    // 搜索/过滤
    setSearchQuery: worklog.setSearchQuery,
    setFilterType: worklog.setFilterType,
    setFilterTag: worklog.setFilterTag,
    getEntriesByDateRange: worklog.getEntriesByDateRange,
    getTodayEntries: worklog.getTodayEntries,
    // 操作
    initialize,
    createEntry,
    updateEntry,
    removeEntry,
    getEntry: worklog.getEntry,
    getDailySummary,
    getWeeklySummary,
    refreshAnalytics,
    exportData,
    // 子模块直通
    worklog,
    analytics,
    habits,
    prediction,
    exportTool,
  }
}