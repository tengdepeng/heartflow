// ============================================================
// constitution store · 心流宪法管理测试
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConstitutionStore } from './constitution'
import { storage } from '../engine/storage'

describe('constitution store', () => {
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

  it('初始化时创建默认宪法', () => {
    const store = useConstitutionStore()
    expect(store.immutableRules.length).toBe(2)
    expect(store.mutableRules.length).toBeGreaterThan(30)
    expect(store.name).toBe('心流宪法')
    expect(store.version).toBe('1.0.0')
  })

  it('immutableRules 始终为 2 条核心条款（本地私有 + 超级自定义）', () => {
    const store = useConstitutionStore()
    expect(store.immutableRules.length).toBe(2)
    expect(store.immutableRules[0].id).toBe('core-local-private')
    expect(store.immutableRules[1].id).toBe('core-super-custom')
  })

  it('enabledMutableCount 统计启用的可变规则数', () => {
    const store = useConstitutionStore()
    const allEnabled = store.mutableRules.filter(r => r.enabled).length
    expect(store.enabledMutableCount).toBe(allEnabled)
  })

  it('addRule 添加新规则并分配 articleNumber', () => {
    const store = useConstitutionStore()
    const before = store.mutableRules.length
    const maxArticle = Math.max(...store.mutableRules.map(r => r.articleNumber ?? 0))
    store.addRule({ title: '测试规则', description: '测试描述', type: 'value', enabled: true, isDefault: false })
    expect(store.mutableRules.length).toBe(before + 1)
    const added = store.mutableRules[store.mutableRules.length - 1]
    expect(added.articleNumber).toBe(maxArticle + 1)
  })

  it('updateRule 更新规则', () => {
    const store = useConstitutionStore()
    const id = store.mutableRules[0].id
    store.updateRule(id, { title: '更新后的标题' })
    expect(store.mutableRules[0].title).toBe('更新后的标题')
  })

  it('removeRule 删除规则', () => {
    const store = useConstitutionStore()
    const before = store.mutableRules.length
    const id = store.mutableRules[0].id
    store.removeRule(id)
    expect(store.mutableRules.length).toBe(before - 1)
    expect(store.mutableRules.find(r => r.id === id)).toBeUndefined()
  })

  it('toggleRule 切换启用状态', () => {
    const store = useConstitutionStore()
    const rule = store.mutableRules[0]
    const original = rule.enabled
    store.toggleRule(rule.id)
    expect(rule.enabled).toBe(!original)
    store.toggleRule(rule.id)
    expect(rule.enabled).toBe(original)
  })

  it('reorderRules 重新排序', () => {
    const store = useConstitutionStore()
    const original = store.mutableRules.map(r => r.id)
    const reversed = [...original].reverse()
    store.reorderRules(reversed)
    expect(store.mutableRules[0].id).toBe(reversed[0])
    expect(store.mutableRules[store.mutableRules.length - 1].id).toBe(reversed[reversed.length - 1])
  })

  it('trackOnce 执行追踪', () => {
    const store = useConstitutionStore()
    store.addRule({ title: '可追踪规则', description: '测试', type: 'behavior', enabled: true, isDefault: false })
    const added = store.mutableRules[store.mutableRules.length - 1]
    store.initTracking(added.id, 5, 'daily')
    expect(added.tracking).toBeDefined()
    expect(added.tracking!.count).toBe(0)

    store.trackOnce(added.id)
    expect(added.tracking!.count).toBe(1)
    store.trackOnce(added.id)
    expect(added.tracking!.count).toBe(2)
  })

  it('trackOnce 不超过目标值', () => {
    const store = useConstitutionStore()
    store.addRule({ title: '可追踪规则', description: '测试', type: 'behavior', enabled: true, isDefault: false })
    const added = store.mutableRules[store.mutableRules.length - 1]
    store.initTracking(added.id, 3, 'daily')
    store.trackOnce(added.id); store.trackOnce(added.id); store.trackOnce(added.id)
    store.trackOnce(added.id) // 第 4 次不应超过 3
    expect(added.tracking!.count).toBe(3)
  })

  it('resetTracking 重置追踪计数', () => {
    const store = useConstitutionStore()
    store.addRule({ title: '可追踪规则', description: '测试', type: 'behavior', enabled: true, isDefault: false })
    const added = store.mutableRules[store.mutableRules.length - 1]
    store.initTracking(added.id, 5, 'daily')
    store.trackOnce(added.id); store.trackOnce(added.id)
    store.resetTracking(added.id)
    expect(added.tracking!.count).toBe(0)
  })

  it('exportConstitution 导出 JSON', () => {
    const store = useConstitutionStore()
    const json = store.exportConstitution()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe('1.0.0')
    expect(parsed.immutableRules.length).toBe(2)
    expect(parsed.mutableRules.length).toBeGreaterThan(30)
  })

  it('importConstitution 导入宪法', () => {
    const store = useConstitutionStore()
    const result = store.importConstitution({
      version: '1.0.0',
      name: '自定义宪法',
      preamble: '测试序言',
      immutableRules: [],
      mutableRules: [{ id: 'custom-1', title: '自定义规则', description: '测试', type: 'value', enabled: true, order: 0, isDefault: false }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(result).toBe(true)
    expect(store.name).toBe('自定义宪法')
    // immutableRules 应始终被核心 2 条覆盖
    expect(store.immutableRules.length).toBe(2)
  })

  it('importConstitution 无效数据返回 false', () => {
    const store = useConstitutionStore()
    expect(store.importConstitution(null)).toBe(false)
    expect(store.importConstitution({})).toBe(false)
    expect(store.importConstitution('invalid')).toBe(false)
  })

  it('resetToDefaults 重置为默认', () => {
    const store = useConstitutionStore()
    store.addRule({ title: '临时规则', description: '测试', type: 'value', enabled: true, isDefault: false })
    store.resetToDefaults()
    expect(store.name).toBe('心流宪法')
  })

  it('getRandomMantra 返回随机箴言', () => {
    const store = useConstitutionStore()
    const mantra = store.getRandomMantra()
    expect(mantra).toHaveProperty('text')
    expect(mantra).toHaveProperty('source')
    expect(typeof mantra.text).toBe('string')
    expect(typeof mantra.source).toBe('string')
  })
})