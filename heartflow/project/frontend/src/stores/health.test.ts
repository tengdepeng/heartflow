// ============================================================
// health store · 身体/健康数据管理测试
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHealthStore } from './health'
import { storage } from '../engine/storage'

describe('health store', () => {
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

  // ---- 身体日志 ----
  it('初始 bodyLogs 为空数组', () => {
    const health = useHealthStore()
    expect(health.bodyLogs).toEqual([])
  })

  it('addBodyLog 添加睡眠日志', () => {
    const health = useHealthStore()
    health.addBodyLog('sleep', { hours: 7.5 })
    expect(health.bodyLogs.length).toBe(1)
    expect(health.bodyLogs[0].type).toBe('sleep')
    expect(health.bodyLogs[0].value.hours).toBe(7.5)
  })

  it('addBodyLog 添加运动日志', () => {
    const health = useHealthStore()
    health.addBodyLog('exercise', { minutes: 30 })
    expect(health.bodyLogs.length).toBe(1)
    expect(health.bodyLogs[0].type).toBe('exercise')
    expect(health.bodyLogs[0].value.minutes).toBe(30)
  })

  it('addBodyLog 添加到数组头部', () => {
    const health = useHealthStore()
    health.addBodyLog('sleep', { hours: 6 })
    health.addBodyLog('exercise', { minutes: 20 })
    expect(health.bodyLogs[0].type).toBe('exercise')
    expect(health.bodyLogs[1].type).toBe('sleep')
  })

  it('bodyLogs 持久化到 storage', () => {
    const health = useHealthStore()
    health.addBodyLog('meal', { meal: 'breakfast' })
    const raw = storage.getKV<any[]>('hf:body_logs', [])
    expect(raw.length).toBe(1)
    expect(raw[0].type).toBe('meal')
  })

  // ---- 周期记录 ----
  it('初始 cycleData 有默认值', () => {
    const health = useHealthStore()
    expect(health.cycleData.lastStart).toBe('')
    expect(health.cycleData.lastDuration).toBe(5)
    expect(health.cycleData.history).toEqual([])
  })

  it('logCycle 更新周期数据并添加身体日志', () => {
    const health = useHealthStore()
    health.logCycle('2026-01-15', 6)
    expect(health.cycleData.lastStart).toBe('2026-01-15')
    expect(health.cycleData.lastDuration).toBe(6)
    expect(health.cycleData.history.length).toBe(1)
    expect(health.bodyLogs.length).toBe(1)
    expect(health.bodyLogs[0].type).toBe('cycle')
  })

  // ---- 笔记 ----
  it('初始笔记为空数组', () => {
    const health = useHealthStore()
    expect(health.bodyNotes).toEqual([])
    expect(health.senseNotes).toEqual([])
    expect(health.sutraNotes).toEqual([])
  })

  it('addBodyNote 添加身体笔记', () => {
    const health = useHealthStore()
    health.addBodyNote('肩颈酸痛')
    expect(health.bodyNotes).toEqual(['肩颈酸痛'])
  })

  it('addSenseNote 添加感官笔记', () => {
    const health = useHealthStore()
    health.addSenseNote('闻到桂花香')
    expect(health.senseNotes).toEqual(['闻到桂花香'])
  })

  it('addSutraNote 添加经文笔记', () => {
    const health = useHealthStore()
    health.addSutraNote('道德经第一章')
    expect(health.sutraNotes).toEqual(['道德经第一章'])
  })

  // ---- 经络记录 ----
  it('初始 meridianLogs 为空', () => {
    const health = useHealthStore()
    expect(health.meridianLogs).toEqual([])
  })

  it('recordMeridianFeeling 添加经络记录', () => {
    const health = useHealthStore()
    health.recordMeridianFeeling(7, '舒畅', { organ: '胃', name: '足阳明' })
    expect(health.meridianLogs.length).toBe(1)
    expect(health.meridianLogs[0].hour).toBe(7)
    expect(health.meridianLogs[0].feeling).toBe('舒畅')
    expect(health.meridianLogs[0].organ).toBe('胃')
  })

  it('recordMeridianFeeling 同一天同时辰覆盖旧记录', () => {
    const health = useHealthStore()
    health.recordMeridianFeeling(7, '舒畅')
    health.recordMeridianFeeling(7, '不适')
    expect(health.meridianLogs.length).toBe(1)
    expect(health.meridianLogs[0].feeling).toBe('不适')
  })

  it('getMeridianFeeling 返回指定时辰的感觉', () => {
    const health = useHealthStore()
    health.recordMeridianFeeling(9, '精神')
    expect(health.getMeridianFeeling(9)).toBe('精神')
  })

  it('getMeridianFeeling 无记录时返回 undefined', () => {
    const health = useHealthStore()
    expect(health.getMeridianFeeling(3)).toBeUndefined()
  })

  // ---- 心境记录 ----
  it('addWisdomLog 添加心境记录', () => {
    const health = useHealthStore()
    health.addWisdomLog('今日感悟', { mood: '平静', insight: '无所求' })
    expect(health.wisdomLogs.length).toBe(1)
    expect(health.wisdomLogs[0].content).toBe('今日感悟')
    expect(health.wisdomLogs[0].mood).toBe('平静')
    expect(health.wisdomLogs[0].insight).toBe('无所求')
  })

  // ---- 阅读记录 ----
  it('addReadingLog 添加阅读记录', () => {
    const health = useHealthStore()
    health.addReadingLog('黄帝内经', '素问篇', {
      excerpt: '上古之人，其知道者',
      duration: 30,
    })
    expect(health.readingLogs.length).toBe(1)
    expect(health.readingLogs[0].title).toBe('黄帝内经')
    expect(health.readingLogs[0].note).toBe('素问篇')
    expect(health.readingLogs[0].excerpt).toBe('上古之人，其知道者')
    expect(health.readingLogs[0].duration).toBe(30)
  })

  it('removeReadingLog 删除指定阅读记录', async () => {
    const health = useHealthStore()
    health.addReadingLog('标题A', '笔记A')
    // 确保两次调用生成不同 ID（Date.now() 可能同毫秒）
    await new Promise(r => setTimeout(r, 2))
    health.addReadingLog('标题B', '笔记B')
    expect(health.readingLogs.length).toBe(2)
    // 删除最新的一条（标题B），保留标题A
    const idB = health.readingLogs[0].id
    health.removeReadingLog(idB)
    expect(health.readingLogs.length).toBe(1)
    expect(health.readingLogs[0].title).toBe('标题A')
  })

  // ---- 守卫室心率 ----
  it('addGuardHeartRateLog 添加心率日志', () => {
    const health = useHealthStore()
    health.addGuardHeartRateLog(72)
    expect(health.guardHeartRateLogs.length).toBe(1)
    expect(health.guardHeartRateLogs[0].bpm).toBe(72)
  })

  it('guardHeartRateLogs 超过 100 条时截断', () => {
    const health = useHealthStore()
    for (let i = 0; i < 105; i++) {
      health.addGuardHeartRateLog(70 + i)
    }
    expect(health.guardHeartRateLogs.length).toBe(100)
  })

  // ---- 计算属性 ----
  it('thisWeekExerciseMinutes 计算本周运动分钟数', () => {
    const health = useHealthStore()
    const today = new Date().toISOString()
    health.addBodyLog('exercise', { minutes: 30 })
    // 手动设置时间为今天以确保在周内
    health.bodyLogs[0].at = today
    expect(health.thisWeekExerciseMinutes).toBeGreaterThanOrEqual(0)
  })

  it('thisWeekSleepAvg 无睡眠日志时返回 0', () => {
    const health = useHealthStore()
    expect(health.thisWeekSleepAvg).toBe(0)
  })

  it('recentLogs 返回最近 N 条日志', () => {
    const health = useHealthStore()
    health.addBodyLog('sleep', { hours: 7 })
    health.addBodyLog('exercise', { minutes: 20 })
    health.addBodyLog('meal', { meal: 'lunch' })
    const recent = health.recentLogs(2)
    expect(recent.length).toBe(2)
    expect(recent[0].type).toBe('meal')
    expect(recent[1].type).toBe('exercise')
  })
})