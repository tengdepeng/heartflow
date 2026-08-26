// ============================================================
// useParallelSelves 模块测试
// 可能性自我 (hf:parallel_alts) & 抉择分叉 (hf:decision_forks) 数据层
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useParallelSelves, type Fork, type AltSelf } from '../parallel-selves'

const K_FORKS = 'hf:decision_forks'
const K_ALTS = 'hf:parallel_alts'

function sampleFork(partial: Partial<Fork> = {}): Fork {
  return {
    id: 'f1',
    description: '岔路',
    chosen: 'A',
    alternative: 'B',
    date: '2024-01-01',
    at: new Date().toISOString(),
    ...partial,
  }
}

function sampleAlt(partial: Partial<AltSelf> = {}): AltSelf {
  return {
    id: 'a1',
    title: '远方的你',
    desc: '另一种人生',
    icon: '🌍',
    color: '#4f8cff',
    expanded: false,
    originForkId: null,
    ...partial,
  }
}

describe('useParallelSelves 可能性自我 & 抉择分叉', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例，避免跨用例泄漏
    useParallelSelves().load()
  })

  it('load 从存储读取 forks 与 alts', () => {
    store[K_FORKS] = [sampleFork()]
    store[K_ALTS] = [sampleAlt()]
    const m = useParallelSelves()
    m.load()
    expect(m.forks.value).toHaveLength(1)
    expect(m.alts.value).toHaveLength(1)
    expect(mockGetKV).toHaveBeenCalledWith(K_FORKS, [])
    expect(mockGetKV).toHaveBeenCalledWith(K_ALTS, [])
  })

  it('saveForks 持久化到 hf:decision_forks', () => {
    const m = useParallelSelves()
    m.forks.value = [sampleFork()]
    m.saveForks()
    expect(mockSetKV).toHaveBeenCalledWith(K_FORKS, expect.any(Array))
    expect(store[K_FORKS]).toHaveLength(1)
  })

  it('saveAlts 持久化到 hf:parallel_alts', () => {
    const m = useParallelSelves()
    m.alts.value = [sampleAlt()]
    m.saveAlts()
    expect(mockSetKV).toHaveBeenCalledWith(K_ALTS, expect.any(Array))
    expect(store[K_ALTS]).toHaveLength(1)
  })

  it('空存储时返回默认空列表', () => {
    const m = useParallelSelves()
    m.load()
    expect(m.forks.value).toEqual([])
    expect(m.alts.value).toEqual([])
  })

  it('load 重置单例，避免跨用例泄漏', () => {
    const m = useParallelSelves()
    m.forks.value = [sampleFork()]
    m.alts.value = [sampleAlt()]
    m.load()
    expect(m.forks.value).toEqual([])
    expect(m.alts.value).toEqual([])
  })
})
