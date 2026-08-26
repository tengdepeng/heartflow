// ============================================================
// 时光胶囊模块 · 测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

function futureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('capsule 模块', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  async function fresh() {
    const mod = await import('../index')
    return mod.useTimeCapsule()
  }

  it('createCapsule 创建未开启胶囊', async () => {
    const api = await fresh()
    const c = api.createCapsule('给未来的我', futureDate(30))
    expect(c.openedAt).toBeNull()
    expect(c.title).toBe('给未来的我')
    expect(api.capsules.value).toHaveLength(1)
  })

  it('openCapsule 未到开启日返回 false', async () => {
    const api = await fresh()
    const c = api.createCapsule('未到日', futureDate(10))
    expect(api.openCapsule(c.id)).toBe(false)
    expect(api.getCapsule(c.id)?.openedAt).toBeNull()
  })

  it('openCapsule 到达开启日可开启', async () => {
    const api = await fresh()
    const c = api.createCapsule('今日可开', futureDate(0))
    expect(api.isOpenable(c)).toBe(true)
    expect(api.openCapsule(c.id)).toBe(true)
    expect(api.getCapsule(c.id)?.openedAt).not.toBeNull()
  })

  it('resealCapsule 重新封存', async () => {
    const api = await fresh()
    const c = api.createCapsule('可重封', futureDate(0))
    api.openCapsule(c.id)
    api.resealCapsule(c.id)
    expect(api.getCapsule(c.id)?.openedAt).toBeNull()
  })

  it('removeCapsule 删除胶囊', async () => {
    const api = await fresh()
    const c = api.createCapsule('待删', futureDate(5))
    api.removeCapsule(c.id)
    expect(api.capsules.value).toHaveLength(0)
  })

  it('addItem / removeItem 维护胶囊内容', async () => {
    const api = await fresh()
    const c = api.createCapsule('带内容', futureDate(1))
    api.addItem(c.id, { type: 'note', id: 'n1', title: '笔记A' })
    api.addItem(c.id, { type: 'note', id: 'n1', title: '笔记A' }) // 去重
    expect(api.getCapsule(c.id)?.items).toHaveLength(1)
    api.removeItem(c.id, 'note', 'n1')
    expect(api.getCapsule(c.id)?.items).toHaveLength(0)
  })

  it('sealed / opened 计算属性分类正确', async () => {
    const api = await fresh()
    const sealedOne = api.createCapsule('封存中', futureDate(20))
    const openedOne = api.createCapsule('已开启', futureDate(0))
    api.openCapsule(openedOne.id)
    expect(api.sealed.value.map(c => c.id)).toContain(sealedOne.id)
    expect(api.opened.value.map(c => c.id)).toContain(openedOne.id)
  })

  it('daysUntilOpen 计算剩余天数', async () => {
    const { daysUntilOpen } = await import('../index')
    expect(daysUntilOpen(futureDate(5))).toBe(5)
    expect(daysUntilOpen(futureDate(0))).toBe(0)
  })
})
