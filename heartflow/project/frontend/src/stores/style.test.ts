// ============================================================
// style store · 风格包管理测试
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStyleStore } from './style'
import { storage } from '../engine/storage'

describe('style store', () => {
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
    // 模拟 DOM 环境
    const styleMap = new Map<string, string>()
    const attrMap = new Map<string, string>()
    vi.stubGlobal('document', {
      documentElement: {
        style: {
          setProperty: (k: string, v: string) => { styleMap.set(k, v) },
          getPropertyValue: (k: string) => styleMap.get(k) ?? '',
          removeProperty: (k: string) => { styleMap.delete(k) },
        },
        setAttribute: (k: string, v: string) => { attrMap.set(k, v) },
        removeAttribute: (k: string) => { attrMap.delete(k) },
        getAttribute: (k: string) => attrMap.get(k) ?? null,
      },
      body: { style: { background: '' } },
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

  it('初始化时加载内置风格包', () => {
    const store = useStyleStore()
    expect(store.packs.length).toBeGreaterThanOrEqual(3)
    expect(store.packs[0].id).toBe('default-gravity')
    expect(store.packs[0].name).toBe('心流科技风')
  })

  it('默认激活第一个风格包', () => {
    const store = useStyleStore()
    expect(store.activeId).toBe('default-gravity')
    expect(store.activePack.id).toBe('default-gravity')
  })

  it('activate 切换风格包', () => {
    const store = useStyleStore()
    const result = store.activate('deep-ocean')
    expect(result).toBe(true)
    expect(store.activeId).toBe('deep-ocean')
  })

  it('activate 无效 ID 返回 false', () => {
    const store = useStyleStore()
    const result = store.activate('non-existent')
    expect(result).toBe(false)
    expect(store.activeId).toBe('default-gravity')
  })

  it('installedPacks 返回 id 和 name', () => {
    const store = useStyleStore()
    const list = store.installedPacks
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list[0]).toHaveProperty('id')
    expect(list[0]).toHaveProperty('name')
  })

  it('createFromBaseColor 创建并激活新风格包', () => {
    const store = useStyleStore()
    const before = store.packs.length
    store.createFromBaseColor('测试主题', '#ff6600', 'dark')
    expect(store.packs.length).toBe(before + 1)
    expect(store.activeId).toMatch(/^custom-/)
    expect(store.activePack.name).toBe('测试主题')
  })

  it('createFromBaseColor 重复创建时替换已有包', () => {
    const store = useStyleStore()
    store.createFromBaseColor('测试主题', '#ff6600', 'dark')
    const before = store.packs.length
    store.createFromBaseColor('测试主题', '#ff6600', 'dark')
    expect(store.packs.length).toBe(before) // 替换而非新增
  })

  it('applyEnvironmentConfig light 背景翻转文本/边框为浅底可读', () => {
    const store = useStyleStore()
    store.applyEnvironmentConfig({ background: 'light' })
    const de = (document as any).documentElement
    expect(de.style.getPropertyValue('--bg-primary')).toBe('#f5f3ee')
    expect(de.style.getPropertyValue('--text-primary')).toBe('#1f1b16')
    expect(de.style.getPropertyValue('--border-color')).toBe('rgba(31,27,22,0.12)')
    expect(de.getAttribute('data-bg')).toBe('light')
  })

  it('applyEnvironmentConfig 非 light 背景可逆（重置回风格包派生值）', () => {
    const store = useStyleStore()
    store.applyEnvironmentConfig({ background: 'light' })
    store.applyEnvironmentConfig({ background: 'default' })
    const de = (document as any).documentElement
    // 浅底翻转被移除，data-bg 置空
    expect(de.getAttribute('data-bg')).toBeNull()
    // 翻转令牌重置回当前风格包（default-gravity）派生值，而非：
    // ① 清空落到 design-tokens.css 暖琥珀默认 ② 残留浅底深色文字值
    expect(de.style.getPropertyValue('--text-primary')).toBe('#e8e8ed')
    expect(de.style.getPropertyValue('--text-primary')).not.toBe('#1f1b16')
    expect(de.style.getPropertyValue('--border-color')).toBe('rgba(255,255,255,0.06)')
  })
})