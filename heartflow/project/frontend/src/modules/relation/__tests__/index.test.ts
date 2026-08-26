// ============================================================
// 羁绊之厅模块 · 测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('relation 模块', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  async function fresh() {
    const mod = await import('../index')
    const api = mod.useRelation()
    api.load()
    return api
  }

  it('导出 useRelation 函数', async () => {
    const mod = await import('../index')
    expect(typeof mod.useRelation).toBe('function')
  })

  it('useRelation 返回预期 API', async () => {
    const api = await fresh()
    expect(api.persons).toBeDefined()
    expect(api.count).toBeDefined()
    expect(typeof api.create).toBe('function')
    expect(typeof api.update).toBe('function')
    expect(typeof api.remove).toBe('function')
    expect(typeof api.addDate).toBe('function')
    expect(typeof api.removeDate).toBe('function')
    expect(typeof api.updateDate).toBe('function')
  })

  it('创建人物后 persons.value 增加', async () => {
    const api = await fresh()
    api.create('张三', 'friend')
    expect(api.persons.value).toHaveLength(1)
    expect(api.persons.value[0].name).toBe('张三')
    expect(api.persons.value[0].relation).toBe('friend')
  })

  it('创建多条人物', async () => {
    const api = await fresh()
    api.create('张三', 'friend')
    api.create('李四', 'colleague')
    expect(api.persons.value).toHaveLength(2)
  })

  it('update 更新人物信息', async () => {
    const api = await fresh()
    const p = api.create('张三', 'friend')
    api.update(p.id, { name: '张三丰', closeness: 0.8 })
    const updated = api.persons.value.find(pp => pp.id === p.id)
    expect(updated?.name).toBe('张三丰')
    expect(updated?.closeness).toBe(0.8)
  })

  it('remove 删除人物', async () => {
    const api = await fresh()
    const p = api.create('张三', 'friend')
    api.remove(p.id)
    expect(api.persons.value).toHaveLength(0)
  })

  it('addDate 添加重要日期', async () => {
    const api = await fresh()
    const p = api.create('张三', 'friend')
    api.addDate(p.id, '生日', '2026-01-15')
    const updated = api.persons.value.find(pp => pp.id === p.id)
    expect(updated?.importantDates).toHaveLength(1)
    expect(updated?.importantDates[0].label).toBe('生日')
  })

  it('removeDate 删除重要日期', async () => {
    const api = await fresh()
    const p = api.create('张三', 'friend')
    api.addDate(p.id, '生日', '2026-01-15')
    api.addDate(p.id, '纪念日', '2026-06-01')
    expect(api.persons.value[0].importantDates).toHaveLength(2)
    api.removeDate(p.id, 0)
    expect(api.persons.value[0].importantDates).toHaveLength(1)
    expect(api.persons.value[0].importantDates[0].label).toBe('纪念日')
  })

  it('updateDate 更新重要日期', async () => {
    const api = await fresh()
    const p = api.create('张三', 'friend')
    api.addDate(p.id, '生日', '2026-01-15')
    api.updateDate(p.id, 0, { label: '农历生日', date: '2026-01-28' })
    const d = api.persons.value[0].importantDates[0]
    expect(d.label).toBe('农历生日')
    expect(d.date).toBe('2026-01-28')
  })

  it('count 计算人物数量', async () => {
    const api = await fresh()
    expect(api.count.value).toBe(0)
    api.create('张三', 'friend')
    expect(api.count.value).toBe(1)
    api.create('李四', 'colleague')
    expect(api.count.value).toBe(2)
  })
})