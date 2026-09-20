// ============================================================
// 数据可视化基础框架 · 预置材质库测试
// 验证：起步种子覆盖蓝图声明的材质分类，且不覆盖用户数据
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetMaterialPresets, initMaterialPresets, getPresetMaterialTotal, MATERIAL_GROUPS, MATERIAL_GROUP_TOTALS } from '../presets'
import { getMaterialLibrary, getMaterialCount, createMaterial, clearMaterialStore } from '../index'

// ---- 模拟 storage（workshop 引擎持久化后，预置注入会触达 storage 读写） ----
const mockStore: Record<string, any> = {}
vi.mock('../../../../engine/storage', () => ({
  storage: {
    getKV: (_key: string, def: any) => mockStore[_key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

describe('预置材质库', () => {
  beforeEach(() => {
    // 每个用例从出厂预置出发（避免模块级 Map 跨用例污染）
    clearMaterialStore()
  })

  it('惰性初始化：库为空时注入全部预置材质', () => {
    expect(getMaterialCount()).toBe(0)
    const count = initMaterialPresets()
    expect(count).toBeGreaterThan(0)
    expect(count).toBe(getPresetMaterialTotal())
    expect(getMaterialCount()).toBe(count)
  })

  it('总量达成蓝图声明：发光15+水墨10+自然18+手工10+几何10+音波6+纹理9 = 78', () => {
    resetMaterialPresets()
    expect(getPresetMaterialTotal()).toBe(78)
    expect(getMaterialCount()).toBe(78)
  })

  it('各类数量逐项达成蓝图声明', () => {
    resetMaterialPresets()
    const library = getMaterialLibrary()
    const byGroup = new Map<string, number>()
    for (const m of library) byGroup.set(m.group ?? '?', (byGroup.get(m.group ?? '?') ?? 0) + 1)
    for (const g of MATERIAL_GROUPS) expect(byGroup.get(g.key)).toBe(MATERIAL_GROUP_TOTALS[g.key])
    // 每个预置材质都必须带所属分类
    expect(library.every((m) => m.group)).toBe(true)
  })

  it('库非空时不覆盖用户已建材质', () => {
    createMaterial('我的自定义', { name: '我的自定义', metaphor: 'light', palette: { primary: '#ff0000' } })
    const before = getMaterialCount()
    initMaterialPresets()
    // 用户数据保留，预置一律不再注入（幂等）
    expect(getMaterialLibrary().some((m) => m.name === '我的自定义')).toBe(true)
    expect(getMaterialCount()).toBe(before)
  })

  it('预置材质按蓝图七大分类组织', () => {
    expect(MATERIAL_GROUPS).toHaveLength(7)
    const keys = MATERIAL_GROUPS.map((g) => g.key)
    expect(keys).toEqual(['glow', 'ink', 'nature', 'handcraft', 'geometry', 'wave', 'texture'])
  })

  it('每类材质都有至少一组代表作', () => {
    const count = resetMaterialPresets()
    expect(count).toBe(getPresetMaterialTotal())
    expect(count).toBeGreaterThanOrEqual(24)
  })

  it('预置材质均为可编辑条目（保留 id / 名称 / 比喻 / 调色板 / 分类）', () => {
    resetMaterialPresets()
    const sample = getMaterialLibrary()
    expect(sample.length).toBeGreaterThan(0)
    for (const m of sample) {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.metaphor).toBeTruthy()
      expect(m.palette.primary).toBeTruthy()
      expect(m.group).toBeTruthy()
      expect(Number.isFinite(m.createdAt)).toBe(true)
    }
  })

  it('恢复默认：重设到出厂预置状态', () => {
    resetMaterialPresets()
    const baseline = getMaterialCount()
    createMaterial('临时', { name: '临时', metaphor: 'ink', palette: {} })
    expect(getMaterialCount()).toBe(baseline + 1)
    resetMaterialPresets()
    expect(getMaterialCount()).toBe(baseline)
    expect(getMaterialLibrary().some((m) => m.name === '临时')).toBe(false)
  })
})