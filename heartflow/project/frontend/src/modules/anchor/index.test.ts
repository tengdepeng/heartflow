// ============================================================
// anchor 模块测试
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
  const { invalidateCache } = await import('../../engine/storage/core')
  invalidateCache()
  const mod = await import('./index')
  const api = mod.useAnchor()
  api.load()
  return api
}

describe('anchor 模块', () => {
  it('useAnchor 返回 API 对象', async () => {
    const api = await fresh()
    expect(api).toBeDefined()
    expect(typeof api.add).toBe('function')
    expect(typeof api.addRaw).toBe('function')
    expect(typeof api.update).toBe('function')
    expect(typeof api.remove).toBe('function')
  })

  it('add 添加锚点', async () => {
    const api = await fresh()
    const anchor = api.addRaw('每日冥想', 'must')
    expect(anchor.text).toBe('每日冥想')
    expect(anchor.priority).toBe('must')
    expect(anchor.done).toBe(false)
    expect(anchor.id).toBeTruthy()
  })

  it('addRaw 添加多条锚点', async () => {
    const api = await fresh()
    api.addRaw('锚点A', 'must')
    api.addRaw('锚点B', 'can')
    expect(api.allAnchors.value).toHaveLength(2)
  })

  it('update 修改锚点', async () => {
    const api = await fresh()
    const a = api.addRaw('旧锚点', 'must')
    api.update(a.id, { text: '新锚点', done: true })
    const updated = api.allAnchors.value.find(an => an.id === a.id)
    expect(updated?.text).toBe('新锚点')
    expect(updated?.done).toBe(true)
  })

  it('remove 删除锚点', async () => {
    const api = await fresh()
    const a = api.addRaw('待删除', 'must')
    api.remove(a.id)
    expect(api.anchors.value).toHaveLength(0)
  })

  it('todayAnchors 筛选今日锚点', async () => {
    const api = await fresh()
    api.addRaw('今日锚点', 'must')
    // 明天的锚点通过 addRaw + extra 设置 targetDate
    api.addRaw('明日锚点', 'can', { targetDate: '2099-01-01' })
    expect(api.todayAnchors.value).toHaveLength(1)
    expect(api.todayAnchors.value[0].text).toBe('今日锚点')
  })

  it('markDone 标记完成', async () => {
    const api = await fresh()
    const a1 = api.addRaw('已完成', 'must')
    api.markDone(a1.id)
    const found = api.anchors.value.find(an => an.id === a1.id)
    expect(found?.done).toBe(true)
    expect(found?.doneAt).toBeTruthy()
  })

  it('markUndone 取消完成', async () => {
    const api = await fresh()
    const a = api.addRaw('可取消', 'must')
    api.markDone(a.id)
    api.markUndone(a.id)
    const found = api.anchors.value.find(an => an.id === a.id)
    expect(found?.done).toBe(false)
    expect(found?.doneAt).toBeUndefined()
  })

  it('markDone 对 non-active 锚点无效', async () => {
    const api = await fresh()
    const a = api.addRaw('已归档', 'must')
    // 修改 stage 为 pool（非 active）后调用 markDone 应无效
    const found = api.anchors.value.find(an => an.id === a.id)
    if (found) found.stage = 'pool'
    api.markDone(a.id)
    expect(api.anchors.value.find(an => an.id === a.id)?.done).toBe(false)
  })

  it('markDone/markUndone 切换完成状态', async () => {
    const api = await fresh()
    const a = api.addRaw('今日任务', 'must')
    api.markDone(a.id)
    expect(api.anchors.value.find(an => an.id === a.id)?.done).toBe(true)
    api.markUndone(a.id)
    expect(api.anchors.value.find(an => an.id === a.id)?.done).toBe(false)
  })

  it('toggleDone 切换完成状态', async () => {
    const api = await fresh()
    const a = api.addRaw('可切换', 'must')
    api.toggleDone(a.id)
    expect(api.anchors.value.find(an => an.id === a.id)?.done).toBe(true)
    api.toggleDone(a.id)
    expect(api.anchors.value.find(an => an.id === a.id)?.done).toBe(false)
  })
})