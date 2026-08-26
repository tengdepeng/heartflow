// ============================================================
// useAutomationFlows 数据层测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useAutomationFlows } from '../flows'
import type { SavedFlow } from '../flows'

const KEY = 'hf:automation_flows'

function mkflow(over: Partial<SavedFlow> = {}): SavedFlow {
  return {
    id: over.id || 'sf_1',
    name: over.name || '流程1',
    actor: over.actor || '✨',
    steps: over.steps || [],
    createdAt: over.createdAt || '2026-01-01T00:00:00Z',
    ...over,
  } as SavedFlow
}

describe('useAutomationFlows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[KEY] = []
    useAutomationFlows().load()
  })

  it('load 从存储载入流程', () => {
    store[KEY] = [mkflow({ id: 'a', name: 'A' }), mkflow({ id: 'b', name: 'B' })]
    const { flows, load } = useAutomationFlows()
    load()
    expect(flows.value).toHaveLength(2)
    expect(flows.value[0].name).toBe('A')
  })

  it('load 在存储为空时回退默认空数组', () => {
    const { flows } = useAutomationFlows()
    expect(flows.value).toEqual([])
  })

  it('save 持久化当前列表', () => {
    const { flows, save } = useAutomationFlows()
    flows.value = [mkflow({ id: 'x' })]
    save()
    expect(mockSetKV).toHaveBeenCalledWith(KEY, flows.value)
    expect(store[KEY]).toHaveLength(1)
  })

  it('add 追加到列表头部并持久化', () => {
    store[KEY] = [mkflow({ id: 'a' })]
    const { add, flows, load } = useAutomationFlows()
    load()
    add(mkflow({ id: 'b', name: '新流程' }))
    expect(flows.value[0].id).toBe('b')
    expect(flows.value).toHaveLength(2)
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('remove 删除指定流程', () => {
    store[KEY] = [mkflow({ id: 'a' }), mkflow({ id: 'b' })]
    const { remove, flows, load } = useAutomationFlows()
    load()
    remove('a')
    expect(flows.value.map((f) => f.id)).toEqual(['b'])
  })
})
