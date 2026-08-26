// ============================================================
// stats store · 统计数据集中管理测试
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStatsStore } from './stats'
import { storage, storageVersion } from '../engine/storage'

describe('stats store', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => { memoryStorage.set(key, value) },
        removeItem: (key: string) => { memoryStorage.delete(key) },
      },
      configurable: true,
    })
    vi.stubGlobal('window', {
      setInterval: vi.fn(() => 123),
      clearInterval: vi.fn(),
      matchMedia: vi.fn(() => ({ matches: false })),
    })
    setActivePinia(createPinia())
    storage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---- 基础计数 ----
  it('初始所有计数为 0', () => {
    const stats = useStatsStore()
    expect(stats.sessionCount).toBe(0)
    expect(stats.crystalCount).toBe(0)
    expect(stats.noteCount).toBe(0)
    expect(stats.emotionCount).toBe(0)
    expect(stats.anchorCount).toBe(0)
    expect(stats.goalCount).toBe(0)
    expect(stats.relationCount).toBe(0)
    expect(stats.ledgerCount).toBe(0)
    expect(stats.carrierCount).toBe(0)
    expect(stats.pluginCount).toBe(0)
  })

  it('totalRecords 初始为 0', () => {
    const stats = useStatsStore()
    expect(stats.totalRecords).toBe(0)
  })

  it('totalRecords 聚合所有领域计数', () => {
    storage.setNotes([{ id: 'n1', content: 'test', category: 'test', createdAt: '2026-01-01', updatedAt: '2026-01-01' } as any])
    storage.setEmotions([{ id: 'e1', type: 'happy', label: '愉快', intensity: 3, at: '2026-01-01' } as any])
    storage.setAnchors([{ id: 'a1', content: 'test', targetDate: '2026-01-01', type: 'daily', done: false, createdAt: '2026-01-01' } as any])
    storageVersion.value++
    const stats = useStatsStore()
    expect(stats.totalRecords).toBeGreaterThanOrEqual(3)
  })

  // ---- 专注时长 ----
  it('totalFocusMinutes 初始为 0', () => {
    const stats = useStatsStore()
    expect(stats.totalFocusMinutes).toBe(0)
  })

  it('totalFocusMinutes 累计已完成会话时长', () => {
    storage.addSession({
      id: 's1', status: 'completed', label: 'test', mode: 'focus',
      startedAt: '2026-01-01', targetMin: 25, elapsed: 60000, pausedAt: 0, pauseTotal: 0,
    } as any)
    storage.addSession({
      id: 's2', status: 'completed', label: 'test2', mode: 'focus',
      startedAt: '2026-01-01', targetMin: 25, elapsed: 120000, pausedAt: 0, pauseTotal: 0,
    } as any)
    storageVersion.value++
    const stats = useStatsStore()
    expect(stats.totalFocusMinutes).toBe(3)
  })

  it('todayFocusMinutes 只计算今天的专注', () => {
    const today = new Date().toISOString()
    storage.addSession({
      id: 's1', status: 'completed', label: 'today', mode: 'focus',
      startedAt: today, targetMin: 25, elapsed: 60000, completedAt: today, pausedAt: 0, pauseTotal: 0,
    } as any)
    storageVersion.value++
    const stats = useStatsStore()
    expect(stats.todayFocusMinutes).toBe(1)
  })

  // ---- 连续天数 ----
  it('streakDays 无专注时返回 0', () => {
    const stats = useStatsStore()
    expect(stats.streakDays).toBe(0)
  })

  // ---- 情绪分类 ----
  it('emotionByType 初始为空对象', () => {
    const stats = useStatsStore()
    expect(stats.emotionByType).toEqual({})
  })

  it('emotionByType 按类型统计情绪', () => {
    storage.setEmotions([
      { id: 'e1', type: 'happy', label: '愉快', intensity: 3, at: '2026-01-01' },
      { id: 'e2', type: 'happy', label: '开心', intensity: 2, at: '2026-01-02' },
      { id: 'e3', type: 'calm', label: '平静', intensity: 1, at: '2026-01-03' },
    ] as any)
    storageVersion.value++
    const stats = useStatsStore()
    expect(stats.emotionByType).toEqual({ happy: 2, calm: 1 })
  })

  // ---- 数据卡片 ----
  it('dataCards 返回 9 个领域卡片', () => {
    const stats = useStatsStore()
    expect(stats.dataCards.length).toBe(9)
    expect(stats.dataCards[0].key).toBe('sessions')
  })

  it('dataCards 计数随数据变化', () => {
    storage.setNotes([{ id: 'n1', content: 'test', category: 'test', createdAt: '2026-01-01', updatedAt: '2026-01-01' } as any])
    storageVersion.value++
    const stats = useStatsStore()
    const noteCard = stats.dataCards.find(c => c.key === 'notes')
    expect(noteCard?.count).toBe(1)
  })

  // ---- 概览卡片 ----
  it('overviewCards 返回 3 个概览卡片', () => {
    const stats = useStatsStore()
    expect(stats.overviewCards.length).toBe(3)
  })

  // ---- 殿堂状况 ----
  it('homeStats 返回殿堂统计', () => {
    const stats = useStatsStore()
    expect(stats.homeStats.totalCrystals).toBe(0)
    expect(stats.homeStats.totalEmotions).toBe(0)
    expect(stats.homeStats.totalNotes).toBe(0)
    expect(stats.homeStats.todayFocus).toBe(0)
    expect(stats.homeStats.totalAnchors).toBe(0)
    expect(stats.homeStats.totalPlugins).toBe(0)
  })

  // ---- 众生象统计 ----
  it('mirrorStats 返回众生象统计', () => {
    const stats = useStatsStore()
    expect(stats.mirrorStats.sessions).toBe(0)
    expect(stats.mirrorStats.notes).toBe(0)
    expect(stats.mirrorStats.emotions).toBe(0)
    expect(stats.mirrorStats.relations).toBe(0)
    expect(stats.mirrorStats.anchors).toBe(0)
    expect(stats.mirrorStats.goals).toBe(0)
  })

  // ---- 响应式更新 ----
  it('storageVersion 变化触发 computed 重算', () => {
    storage.setNotes([{ id: 'n1', content: 'note1', category: 'test', createdAt: '2026-01-01', updatedAt: '2026-01-01' } as any])
    storageVersion.value++
    const stats = useStatsStore()
    expect(stats.noteCount).toBe(1)

    storage.setNotes([
      { id: 'n1', content: 'note1', category: 'test', createdAt: '2026-01-01', updatedAt: '2026-01-01' } as any,
      { id: 'n2', content: 'note2', category: 'test', createdAt: '2026-01-01', updatedAt: '2026-01-01' } as any,
    ])
    storageVersion.value++
    expect(stats.noteCount).toBe(2)
  })
})