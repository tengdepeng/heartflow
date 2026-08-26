// ============================================================
// 匠庐 · 材料管理系统测试
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

const kvStore: Record<string, any> = {}
vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, defaultVal: any) => {
    const val = kvStore[key]
    return val !== undefined ? val : JSON.parse(JSON.stringify(defaultVal))
  },
  setKV: (key: string, val: any) => { kvStore[key] = val },
}))

import { useCraftMaterials, CRAFT_STORAGE_KEYS, DEFAULT_MATERIALS } from '../materials'
import type { Material } from '../materials'

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '测试材料',
    icon: '✨',
    rarity: 'common',
    quantity: 5,
    unit: '个',
    maxQuantity: 10,
    description: '测试描述',
    tags: [],
    obtainedAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('useCraftMaterials', () => {
  beforeEach(() => {
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('初始化加载默认材料', () => {
    const m = useCraftMaterials()
    expect(m.materials.value.length).toBe(DEFAULT_MATERIALS.length)
    expect(m.getStats.value.totalMaterials).toBe(DEFAULT_MATERIALS.length)
  })

  it('添加材料', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'new-mat' })
    expect(m.addMaterial(mat)).toBe(true)
    expect(m.getMaterial('new-mat')?.name).toBe('测试材料')
    expect(m.getMaterial('new-mat')?.obtainedAt).toBeTruthy()
  })

  it('添加重复 id 返回 false', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'dup' })
    m.addMaterial(mat)
    expect(m.addMaterial({ ...mat })).toBe(false)
  })

  it('更新材料字段', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'u1', quantity: 3 })
    m.addMaterial(mat)
    expect(m.updateMaterial('u1', { quantity: 7 })).toBe(true)
    expect(m.getMaterial('u1')?.quantity).toBe(7)
    expect(m.updateMaterial('missing', { quantity: 1 })).toBe(false)
  })

  it('删除材料', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'd1' })
    m.addMaterial(mat)
    expect(m.removeMaterial('d1')).toBe(true)
    expect(m.getMaterial('d1')).toBeUndefined()
    expect(m.removeMaterial('d1')).toBe(false)
  })

  it('记录使用扣减库存', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'r1', quantity: 5 })
    m.addMaterial(mat)
    expect(m.recordUsage('r1', 'work-1', 2)).toBe(true)
    expect(m.getMaterial('r1')?.quantity).toBe(3)
    expect(m.usages.value.length).toBe(1)
    expect(m.usages.value[0].workId).toBe('work-1')
  })

  it('库存不足时记录使用失败', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'r2', quantity: 1 })
    m.addMaterial(mat)
    expect(m.recordUsage('r2', 'work-1', 5)).toBe(false)
    expect(m.getMaterial('r2')?.quantity).toBe(1)
    expect(m.usages.value.length).toBe(0)
  })

  it('低库存统计', () => {
    const m = useCraftMaterials()
    m.addMaterial(makeMaterial({ id: 'low1', quantity: 1, maxQuantity: 10 }))
    m.addMaterial(makeMaterial({ id: 'ok1', quantity: 9, maxQuantity: 10 }))
    expect(m.getLowStockMaterials.value.some(x => x.id === 'low1')).toBe(true)
    expect(m.getLowStockMaterials.value.some(x => x.id === 'ok1')).toBe(false)
    expect(m.getStats.value.lowStock.some(x => x.id === 'low1')).toBe(true)
    expect(m.getStats.value.lowStock.some(x => x.id === 'ok1')).toBe(false)
  })

  it('按稀有度统计', () => {
    const m = useCraftMaterials()
    m.addMaterial(makeMaterial({ id: 'c1', rarity: 'common' }))
    m.addMaterial(makeMaterial({ id: 'c2', rarity: 'common' }))
    m.addMaterial(makeMaterial({ id: 'r3', rarity: 'rare' }))
    expect(m.getStats.value.byRarity.common).toBe(3)
    expect(m.getStats.value.byRarity.rare).toBe(3)
    expect(m.getStats.value.byRarity.legendary).toBe(1)
  })

  it('查询作品材料', () => {
    const m = useCraftMaterials()
    const mat = makeMaterial({ id: 'wq1', quantity: 5 })
    m.addMaterial(mat)
    m.recordUsage('wq1', 'work-x', 2)
    const rows = m.getMaterialsForWork('work-x')
    expect(rows.length).toBe(1)
    expect(rows[0].material?.name).toBe('测试材料')
  })

  it('持久化到 KV', () => {
    const m = useCraftMaterials()
    m.addMaterial(makeMaterial({ id: 'p1' }))
    expect(kvStore[CRAFT_STORAGE_KEYS.MATERIALS]).toBeDefined()
    expect(kvStore[CRAFT_STORAGE_KEYS.MATERIALS].some((x: Material) => x.id === 'p1')).toBe(true)
  })
})
