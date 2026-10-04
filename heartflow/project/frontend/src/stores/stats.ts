// ============================================================
// 统计数据集中管理
// 统一提供视图层所需的统计数据，避免 views 直接依赖 storage
// ============================================================

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { storage, storageVersion } from '../engine/storage'
import type { FocusSession } from '../modules/timer'
import { getLocalDateKey } from '../utils/time'

export const useStatsStore = defineStore('stats', () => {
  // ---- 原始数据（依赖 storageVersion 触发重算） ----

  const sessions = computed<FocusSession[]>(() => {
    storageVersion.value
    return storage.getSessions()
  })

  const completedSessions = computed<FocusSession[]>(() => {
    storageVersion.value
    return storage.getSessions().filter(s => s.status === 'completed')
  })

  const crystals = computed(() => {
    storageVersion.value
    return storage.getCrystals()
  })

  const notes = computed(() => {
    storageVersion.value
    return storage.getNotes()
  })

  const emotions = computed(() => {
    storageVersion.value
    return storage.getEmotions()
  })

  const anchors = computed(() => {
    storageVersion.value
    return storage.getAnchors()
  })

  const goals = computed(() => {
    storageVersion.value
    return storage.getGoals()
  })

  const relations = computed(() => {
    storageVersion.value
    return storage.getRelations()
  })

  const ledger = computed(() => {
    storageVersion.value
    return storage.getLedger()
  })

  const carriers = computed(() => {
    storageVersion.value
    return storage.getCarriers()
  })

  const pluginRegistry = computed(() => {
    storageVersion.value
    return storage.getPluginRegistry()
  })

  // ---- 基础计数 ----

  const sessionCount = computed(() => sessions.value.length)
  const completedSessionCount = computed(() => completedSessions.value.length)
  const crystalCount = computed(() => crystals.value.length)
  const noteCount = computed(() => notes.value.length)
  const emotionCount = computed(() => emotions.value.length)
  const anchorCount = computed(() => anchors.value.length)
  const goalCount = computed(() => goals.value.length)
  const relationCount = computed(() => relations.value.length)
  const ledgerCount = computed(() => ledger.value.length)
  const carrierCount = computed(() => carriers.value.length)
  const pluginCount = computed(() => Object.keys(pluginRegistry.value).length)

  // ---- 总记录数 ----

  const totalRecords = computed(() =>
    sessionCount.value +
    crystalCount.value +
    noteCount.value +
    emotionCount.value +
    anchorCount.value +
    goalCount.value +
    relationCount.value +
    ledgerCount.value +
    carrierCount.value
  )

  // ---- 专注时长 ----

  const totalFocusMinutes = computed(() =>
    Math.floor(completedSessions.value.reduce((sum, s) => sum + s.elapsed, 0) / 60000)
  )

  // 今日专注分钟：completedAt 为 UTC ISO 时间戳，今日边界与记录边界须同取本地日历日键。
  const todayFocusMinutes = computed(() => {
    const today = getLocalDateKey(new Date())
    return Math.floor(
      completedSessions.value
        .filter(s => s.completedAt && getLocalDateKey(new Date(s.completedAt)) === today)
        .reduce((sum, s) => sum + s.elapsed, 0) / 60000
    )
  })

  // ---- 连续天数 ----

  // 连续天数：completedAt/startedAt 为 UTC ISO 时间戳，日期键须同取本地日历日（否则东八区 00:00–08:00 跨日误判）。
  const streakDays = computed(() => {
    const dates = [...new Set(
      completedSessions.value
        .map(s => s.completedAt || s.startedAt || '')
        .filter(Boolean)
        .map(d => getLocalDateKey(new Date(d)))
    )].sort().reverse()
    if (dates.length === 0) return 0
    let streak = 1
    const today = getLocalDateKey(new Date())
    const diff = Math.abs(new Date(today).getTime() - new Date(dates[0]).getTime())
    if (diff > 86400000 * 2) return 0
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      const dayDiff = (prev.getTime() - curr.getTime()) / 86400000
      if (dayDiff <= 1.5) streak++
      else break
    }
    return streak
  })

  // ---- 情绪分类 ----

  const emotionByType = computed(() => {
    const map: Record<string, number> = {}
    for (const e of emotions.value) {
      map[e.type] = (map[e.type] || 0) + 1
    }
    return map
  })

  // ---- 数据卡片（Archive 用） ----

  const dataCards = computed(() => [
    { key: 'sessions', label: '专注记录', count: sessionCount.value },
    { key: 'crystals', label: '时间结晶', count: crystalCount.value },
    { key: 'notes', label: '笔记', count: noteCount.value },
    { key: 'emotions', label: '情绪标记', count: emotionCount.value },
    { key: 'anchors', label: '逐日心锚', count: anchorCount.value },
    { key: 'goals', label: '留光目标', count: goalCount.value },
    { key: 'relations', label: '羁绊人物', count: relationCount.value },
    { key: 'ledger', label: '账本条目', count: ledgerCount.value },
    { key: 'carriers', label: '玉珠载体', count: carrierCount.value },
  ])

  // ---- 概览卡片（Archive 用） ----

  const overviewCards = computed(() => [
    { label: '数据域数', count: 9 },
    { label: '总记录数', count: totalRecords.value },
    { label: '存储格式', count: 'JSON' },
  ])

  // ---- 殿堂状况（HomeSpace 用） ----

  const homeStats = computed(() => ({
    totalCrystals: crystalCount.value,
    totalEmotions: emotionCount.value,
    totalNotes: noteCount.value,
    todayFocus: completedSessionCount.value,
    totalAnchors: anchorCount.value,
    totalPlugins: pluginCount.value,
  }))

  // ---- 众生象统计（AllSelvesMirror 用） ----

  const mirrorStats = computed(() => ({
    sessions: completedSessionCount.value,
    notes: noteCount.value,
    emotions: emotionCount.value,
    relations: relationCount.value,
    anchors: anchorCount.value,
    goals: goalCount.value,
  }))

  return {
    // 原始数据
    sessions,
    completedSessions,
    crystals,
    notes,
    emotions,
    anchors,
    goals,
    relations,
    ledger,
    carriers,
    pluginRegistry,
    // 计数
    sessionCount,
    completedSessionCount,
    crystalCount,
    noteCount,
    emotionCount,
    anchorCount,
    goalCount,
    relationCount,
    ledgerCount,
    carrierCount,
    pluginCount,
    totalRecords,
    // 专注
    totalFocusMinutes,
    todayFocusMinutes,
    streakDays,
    // 情绪
    emotionByType,
    // 视图专用
    dataCards,
    overviewCards,
    homeStats,
    mirrorStats,
  }
})