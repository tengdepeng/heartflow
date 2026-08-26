// ============================================================
// config store · 全局配置管理测试
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConfigStore } from './config'
import { storage } from '../engine/storage'

describe('config store', () => {
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
      matchMedia: vi.fn(() => ({ matches: false })),
    })
    setActivePinia(createPinia())
    storage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('初始化时加载默认配置', () => {
    const store = useConfigStore()
    expect(store.config).toBeDefined()
    expect(store.config.theme).toBeDefined()
    expect(store.config.timer).toBeDefined()
    expect(store.config.background).toBeDefined()
    expect(store.config.gestures).toBeDefined()
    expect(store.config.stats).toBeDefined()
  })

  it('updateTheme 更新主题', () => {
    const store = useConfigStore()
    store.updateTheme('light')
    expect(store.config.theme).toBe('light')
  })

  it('updateTimer 更新计时设置', () => {
    const store = useConfigStore()
    store.updateTimer({ defaultDuration: 45 })
    expect(store.config.timer.defaultDuration).toBe(45)
  })

  it('updateTimer 合并而非覆盖', () => {
    const store = useConfigStore()
    store.updateTimer({ breakDuration: 10 })
    expect(store.config.timer.defaultDuration).toBeDefined()
    expect(store.config.timer.breakDuration).toBe(10)
  })

  it('updateAdvisorEnabled 切换幕僚开关', () => {
    const store = useConfigStore()
    store.updateAdvisorEnabled(false)
    expect(store.config.advisorEnabled).toBe(false)
    store.updateAdvisorEnabled(true)
    expect(store.config.advisorEnabled).toBe(true)
  })

  it('updateBackgroundMedia 更新背景配置', () => {
    const store = useConfigStore()
    store.updateBackgroundMedia({ type: 'preset', presetScene: 'forest-dawn', dataUrl: null, mimeType: null, fileName: null, updatedAt: null })
    expect(store.config.background.type).toBe('preset')
    expect(store.config.background.presetScene).toBe('forest-dawn')
  })

  it('resetBackgroundMedia 重置为默认', () => {
    const store = useConfigStore()
    store.updateBackgroundMedia({ type: 'preset', presetScene: 'forest-dawn', dataUrl: null, mimeType: null, fileName: null, updatedAt: null })
    store.resetBackgroundMedia()
    expect(store.config.background.type).toBe('default')
    expect(store.config.background.presetScene).toBe('none')
  })

  it('setPresetScene 设置预设场景', () => {
    const store = useConfigStore()
    store.setPresetScene('snowy-night')
    expect(store.config.background.type).toBe('preset')
    expect(store.config.background.presetScene).toBe('snowy-night')
  })

  it('updateStats 更新统计配置', () => {
    const store = useConfigStore()
    store.updateStats({ dailyGoal: 180 })
    expect(store.config.stats.dailyGoal).toBe(180)
  })

  it('updateStats 合并而非覆盖', () => {
    const store = useConfigStore()
    store.updateStats({ weeklyGoal: 900 })
    expect(store.config.stats.dailyGoal).toBeDefined()
    expect(store.config.stats.weeklyGoal).toBe(900)
  })
})