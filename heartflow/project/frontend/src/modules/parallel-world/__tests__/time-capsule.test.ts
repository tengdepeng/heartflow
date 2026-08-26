// ============================================================
// 平行世界 · 时间胶囊测试（抽取自 ParallelWorld.vue，主动开启无提醒）
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('平行世界 时间胶囊', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  async function getCapsule() {
    const mod = await import('../time-capsule')
    return mod.useTimeCapsule()
  }

  it('默认无胶囊', async () => {
    const tc = await getCapsule()
    expect(tc.capsules.value.length).toBe(0)
  })

  it('addCapsule 封存一封自由胶囊并重置表单', async () => {
    const tc = await getCapsule()
    tc.capForm.message = '给未来的自己'
    tc.capForm.openDate = '2099-01-01'
    tc.addCapsule()
    expect(tc.capsules.value.length).toBe(1)
    expect(tc.capsules.value[0].opened).toBe(false)
    expect(tc.capsules.value[0].scope).toBe('free')
    expect(tc.capForm.message).toBe('')
  })

  it('addCapsule 空内容不封存', async () => {
    const tc = await getCapsule()
    tc.capForm.message = ''
    tc.capForm.openDate = '2099-01-01'
    tc.addCapsule()
    expect(tc.capsules.value.length).toBe(0)
  })

  it('未到开启日期不可开启', async () => {
    const tc = await getCapsule()
    tc.capForm.message = 'x'
    tc.capForm.openDate = '2099-01-01'
    tc.addCapsule()
    const c = tc.capsules.value[0]
    expect(tc.checkReady(c)).toBe(false)
    tc.tryOpenCapsule(c)
    expect(c.opened).toBe(false)
  })

  it('到达开启日期后可主动开启', async () => {
    const tc = await getCapsule()
    tc.capForm.message = 'x'
    tc.capForm.openDate = '2000-01-01'
    tc.addCapsule()
    const c = tc.capsules.value[0]
    expect(tc.checkReady(c)).toBe(true)
    tc.tryOpenCapsule(c)
    expect(c.opened).toBe(true)
  })

  it('removeCapsule 删除胶囊', async () => {
    const tc = await getCapsule()
    tc.capForm.message = 'x'
    tc.capForm.openDate = '2099-01-01'
    tc.addCapsule()
    const id = tc.capsules.value[0].id
    tc.removeCapsule(id)
    expect(tc.capsules.value.length).toBe(0)
  })

  it('sortedCapsules 未开启在前', async () => {
    const tc = await getCapsule()
    tc.capForm.message = 'a'
    tc.capForm.openDate = '2099-01-01'
    tc.addCapsule()
    const opened = tc.capsules.value[0]
    opened.opened = true
    tc.capForm.message = 'b'
    tc.capForm.openDate = '2099-02-01'
    tc.addCapsule()
    const first = tc.sortedCapsules.value[0]
    expect(first.opened).toBe(false)
  })

  it('持久化：重载后可恢复', async () => {
    const tc = await getCapsule()
    tc.capForm.message = '持久'
    tc.capForm.openDate = '2099-01-01'
    tc.addCapsule()
    const tc2 = await getCapsule()
    expect(tc2.capsules.value.length).toBe(1)
  })
})
