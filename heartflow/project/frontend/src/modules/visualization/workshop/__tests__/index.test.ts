// ============================================================
// 数据可视化基础框架 · 材质工坊引擎持久化测试
// 验证：明文 JSON 落盘于 storage kvStore，惰性恢复、增删改同步持久化
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- 模拟 storage（workshop 引擎经 '../../../../engine/storage' 组合层取用） ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

/** 每次动态 import 全新模块实例，保证 loaded 标志从 false 起（恢复路径可测） */
async function loadEngine() {
  vi.resetModules()
  return await import('../index')
}

describe('材质工坊引擎 · storage 持久化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
  })

  it('创建材质后写入 storage（键为 MATERIALS_STORAGE_KEY，值为含新材质的数组）', async () => {
    const engine = await loadEngine()
    const m = engine.createMaterial('暖金光点', {
      name: '暖金光点',
      metaphor: 'light',
      palette: { primary: '#e8b84a' },
      group: 'glow',
    })
    expect(mockSetKV).toHaveBeenCalledWith('hf:visualization:materials', expect.any(Array))
    const saved = mockStore['hf:visualization:materials'] as any[]
    expect(saved.some((x) => x.id === m.id && x.name === '暖金光点' && x.group === 'glow')).toBe(true)
  })

  it('从 storage 惰性恢复既有材质（首次访问读取已落盘数据）', async () => {
    mockStore['hf:visualization:materials'] = [
      { id: 'mat_seed', name: '种子材质', metaphor: 'ink', palette: { primary: '#1a1815' }, elementDefaults: {}, createdAt: 1, updatedAt: 2, group: 'ink' },
    ]
    const engine = await loadEngine()
    const lib = engine.getMaterialLibrary()
    expect(lib).toHaveLength(1)
    expect(lib[0].name).toBe('种子材质')
    expect(engine.getMaterialCount()).toBe(1)
  })

  it('编辑材质后同步持久化（改名与调色板更新落盘）', async () => {
    const engine = await loadEngine()
    const m = engine.createMaterial('旧名', {
      name: '旧名',
      metaphor: 'wood',
      palette: { primary: '#8a6a40' },
    })
    engine.editMaterial(m.id, { name: '新名', palette: { primary: '#ff0000' } })
    const saved = mockStore['hf:visualization:materials'] as any[]
    const found = saved.find((x) => x.id === m.id)
    expect(found.name).toBe('新名')
    expect(found.palette.primary).toBe('#ff0000')
  })

  it('删除材质后持久化移除该条目', async () => {
    const engine = await loadEngine()
    const a = engine.createMaterial('A', { name: 'A', metaphor: 'light', palette: {} })
    engine.createMaterial('B', { name: 'B', metaphor: 'ink', palette: {} })
    expect(engine.deleteMaterial(a.id)).toBe(true)
    const saved = mockStore['hf:visualization:materials'] as any[]
    expect(saved.some((x) => x.id === a.id)).toBe(false)
    expect(saved).toHaveLength(1)
  })

  it('删除不存在的材质返回 false 且不触发写入', async () => {
    const engine = await loadEngine()
    const before = mockSetKV.mock.calls.length
    expect(engine.deleteMaterial('mat_none')).toBe(false)
    expect(mockSetKV.mock.calls.length).toBe(before)
  })

  it('清空材质库后持久化空数组', async () => {
    const engine = await loadEngine()
    engine.createMaterial('A', { name: 'A', metaphor: 'light', palette: {} })
    engine.clearMaterialStore()
    expect(mockStore['hf:visualization:materials']).toEqual([])
  })

  it('保存的材质带创建/更新时间戳，恢复后时间戳保留', async () => {
    mockStore['hf:visualization:materials'] = [
      { id: 'mat_ts', name: '带时间戳', metaphor: 'earth', palette: {}, elementDefaults: {}, createdAt: 111, updatedAt: 222, group: 'texture' },
    ]
    const engine = await loadEngine()
    const m = engine.getMaterial('mat_ts')
    expect(m?.createdAt).toBe(111)
    expect(m?.updatedAt).toBe(222)
  })

  it('storage 中脏数据为对象时安全回退为空库（getKV 默认值守卫）', async () => {
    mockStore['hf:visualization:materials'] = { not: 'an array' }
    const engine = await loadEngine()
    expect(engine.getMaterialCount()).toBe(0)
  })
})
