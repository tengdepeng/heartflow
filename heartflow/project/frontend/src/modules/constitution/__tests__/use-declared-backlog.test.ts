// ============================================================
// A2-EXT-4 · 诚实声明式 backlog 批量知悉（本地 KV）回归测试
// 锁定：可枚举 16 个 declared 目标；逐条 / 批量知悉落本地 KV；
// 进度计数正确；不影响引擎账本（仅 UI 知悉状态）。
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'

function setupMemoryStorage() {
  const mem = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
    },
    configurable: true,
  })
}

describe('useDeclaredBacklog（A2-EXT-4）', () => {
  beforeEach(() => {
    setupMemoryStorage()
    storage.clear()
  })

  it('枚举全部诚实声明式目标（与 effect-consumer-map 的 declared 一致）', async () => {
    const { getDeclaredTargets } = await import('../use-declared-backlog')
    const { EFFECT_CONSUMER_MAP } = await import('../effect-consumer-map')
    const expected = EFFECT_CONSUMER_MAP.filter(c => c.mechanism === 'declared').map(c => c.target)
    expect(getDeclaredTargets().sort()).toEqual(expected.sort())
    expect(getDeclaredTargets().length).toBeGreaterThanOrEqual(10)
  })

  it('逐条知悉后进度递增，全部知悉后 allAcked=true', async () => {
    const { useDeclaredBacklog } = await import('../use-declared-backlog')
    const b = useDeclaredBacklog()
    const total = b.total.value
    expect(b.ackCount.value).toBe(0)
    expect(b.remaining.value).toBe(total)
    const first = b.allTargets[0]
    b.acknowledge(first)
    expect(b.ackCount.value).toBe(1)
    expect(b.isAcked(first)).toBe(true)
    b.acknowledgeAll()
    expect(b.ackCount.value).toBe(total)
    expect(b.allAcked.value).toBe(true)
    expect(b.remaining.value).toBe(0)
  })

  it('知悉状态持久化到本地 KV（重新实例化可恢复）', async () => {
    const { useDeclaredBacklog } = await import('../use-declared-backlog')
    const b = useDeclaredBacklog()
    b.acknowledge(b.allTargets[0])
    b.acknowledge(b.allTargets[1])
    // 模拟面板重挂载：新实例应读回已知悉项
    const b2 = useDeclaredBacklog()
    expect(b2.ackCount.value).toBe(2)
  })

  it('acknowledge 忽略非法 target（不污染进度）', async () => {
    const { useDeclaredBacklog } = await import('../use-declared-backlog')
    const b = useDeclaredBacklog()
    b.acknowledge('not-a-real-target')
    expect(b.ackCount.value).toBe(0)
  })
})
