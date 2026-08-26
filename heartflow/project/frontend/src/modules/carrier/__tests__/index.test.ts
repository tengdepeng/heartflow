// ============================================================
// carrier 模块入口测试
// ============================================================
import { describe, expect, it } from 'vitest'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
}

async function fresh() {
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  const mod = await import('../index')
  const api = mod.useCarrier()
  api.load()
  return api
}

describe('carrier 模块', () => {
  it('useCarrier 返回 API 对象', async () => {
    const api = await fresh()
    expect(api).toBeDefined()
    expect(typeof api.create).toBe('function')
    expect(typeof api.update).toBe('function')
    expect(typeof api.remove).toBe('function')
    expect(typeof api.setActive).toBe('function')
    expect(typeof api.advanceBead).toBe('function')
    expect(typeof api.resetBeads).toBe('function')
    expect(typeof api.getState).toBe('function')
    expect(typeof api.advanceLifecycle).toBe('function')
    expect(typeof api.retireCarrier).toBe('function')
    expect(typeof api.inheritCarrier).toBe('function')
    expect(typeof api.getActiveCarriers).toBe('function')
  })

  it('create 创建载体后 carriers.value 返回包含该载体', async () => {
    const api = await fresh()
    api.create('测试载体')
    const all = api.carriers.value
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('测试载体')
  })

  it('create 创建多条载体', async () => {
    const api = await fresh()
    api.create('第一')
    api.create('第二')
    expect(api.carriers.value).toHaveLength(2)
  })

  it('remove 删除载体', async () => {
    const api = await fresh()
    api.create('待删除')
    const all = api.carriers.value
    api.remove(all[0].id)
    expect(api.carriers.value).toHaveLength(0)
  })

  it('update 更新载体名称', async () => {
    const api = await fresh()
    const c = api.create('旧名称')
    api.update(c.id, { name: '新名称' })
    expect(api.carriers.value[0].name).toBe('新名称')
  })

  it('setActive 切换活跃载体', async () => {
    const api = await fresh()
    const c1 = api.create('第一')
    const c2 = api.create('第二')
    api.setActive(c1.id)
    expect(api.carriers.value.find(c => c.id === c1.id)?.active).toBe(true)
    expect(api.carriers.value.find(c => c.id === c2.id)?.active).toBe(false)
    expect(api.activeCarrier.value?.id).toBe(c1.id)
  })

  it('advanceBead 拨珠前进', async () => {
    const api = await fresh()
    const c = api.create('测试', 108)
    const state = api.advanceBead(c.id, 'forward')
    expect(state).not.toBeNull()
    expect(state!.currentBead).toBe(1)
  })

  it('advanceBead 拨珠后退', async () => {
    const api = await fresh()
    const c = api.create('测试', 108)
    api.advanceBead(c.id, 'forward')
    api.advanceBead(c.id, 'forward')
    const state = api.advanceBead(c.id, 'backward')
    expect(state!.currentBead).toBe(1)
  })

  it('resetBeads 重置计数', async () => {
    const api = await fresh()
    const c = api.create('测试', 108)
    api.advanceBead(c.id, 'forward')
    api.advanceBead(c.id, 'forward')
    api.resetBeads(c.id)
    expect(api.carriers.value[0].beadCount).toBe(0)
    expect(api.carriers.value[0].segment).toBe(1)
    expect(api.carriers.value[0].lifecycleStage).toBe('newborn')
  })

  it('getState 返回载体状态快照', async () => {
    const api = await fresh()
    const c = api.create('测试', 108)
    const state = api.getState(c.id)
    expect(state).not.toBeNull()
    expect(state!.currentBead).toBe(0)
    expect(state!.totalSegments).toBe(3)
  })

  it('create 创建载体默认 lifecycleStage 为 newborn', async () => {
    const api = await fresh()
    const c = api.create('生命周期测试', 108)
    expect(c.lifecycleStage).toBe('newborn')
    expect(c.usageCount).toBe(0)
    expect(c.lastUsedAt).toBeNull()
  })

  it('advanceBead 自动更新使用记录和生命周期', async () => {
    const api = await fresh()
    const c = api.create('使用测试', 108)
    api.advanceBead(c.id, 'forward')
    expect(api.carriers.value[0].usageCount).toBe(1)
    expect(api.carriers.value[0].lastUsedAt).toBeTruthy()
  })

  it('advanceLifecycle 手动推进阶段', async () => {
    const api = await fresh()
    const c = api.create('阶段测试', 108)
    expect(c.lifecycleStage).toBe('newborn')
    api.advanceLifecycle(c.id)
    expect(api.carriers.value.find(cr => cr.id === c.id)?.lifecycleStage).toBe('growing')
  })

  it('retireCarrier 退休载体', async () => {
    const api = await fresh()
    const c = api.create('退休测试', 108)
    const result = api.retireCarrier(c.id)
    expect(result).toBe(true)
    expect(api.carriers.value.find(cr => cr.id === c.id)?.lifecycleStage).toBe('retired')
    expect(api.carriers.value.find(cr => cr.id === c.id)?.active).toBe(false)
  })

  it('getActiveCarriers 排除退休载体', async () => {
    const api = await fresh()
    const c1 = api.create('第一', 108)
    const c2 = api.create('第二', 108)
    api.retireCarrier(c1.id)
    const active = api.getActiveCarriers()
    expect(active.find(c => c.id === c1.id)).toBeUndefined()
    expect(active.find(c => c.id === c2.id)).toBeDefined()
  })

  it('inheritCarrier 传承珠数', async () => {
    const api = await fresh()
    const source = api.create('源载体', 108)
    const target = api.create('目标载体', 108)
    // 源载体积累珠子
    for (let i = 0; i < 50; i++) api.advanceBead(source.id, 'forward')
    const sourceBeads = api.carriers.value.find(c => c.id === source.id)!.beadCount
    expect(sourceBeads).toBe(50)

    // 传承
    const result = api.inheritCarrier(source.id, target.id)
    expect(result).toBe(true)
    // 源载体退休
    expect(api.carriers.value.find(c => c.id === source.id)?.lifecycleStage).toBe('retired')
    expect(api.carriers.value.find(c => c.id === source.id)?.inheritedTo).toBe(target.id)
    // 目标载体获得 30% 珠数
    const targetBeads = api.carriers.value.find(c => c.id === target.id)!.beadCount
    expect(targetBeads).toBe(Math.floor(50 * 0.3))
    // 目标载体获得 inheritedFrom
    expect(api.carriers.value.find(c => c.id === target.id)?.inheritedFrom).toBe(source.id)
  })

  it('activeCarrier 初始为 null', async () => {
    const api = await fresh()
    expect(api.activeCarrier.value).toBeNull()
  })
})