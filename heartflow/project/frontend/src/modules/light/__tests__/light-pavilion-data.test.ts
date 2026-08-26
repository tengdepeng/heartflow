// ============================================================
// useLightPavilionData 模块测试
// 留光阁视图数据层：财富目标（数值⇄字符串）+ 专项规划
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
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useLightPavilionData } from '../pavilion-data'

const WEALTH_KEY = 'hf:wealth_target'
const PLANS_KEY = 'hf:special_plans'

function samplePlan(partial: any = {}) {
  return {
    id: 'sp-x',
    title: '专项',
    description: '',
    relatedGoalIds: [],
    milestones: [],
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...partial,
  }
}

describe('useLightPavilionData 留光阁视图数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((k: string, d: any) => (k in store ? store[k] : d))
    // 重置模块级单例
    useLightPavilionData().load()
  })

  it('load 从空存储读取财富目标为 0、专项规划为空', () => {
    const m = useLightPavilionData()
    expect(m.wealthTarget.value).toBe(0)
    expect(m.specialPlans.value).toEqual([])
    expect(mockGetKV).toHaveBeenCalledWith(WEALTH_KEY, 0)
  })

  it('load 将字符串形态的财富目标转回数值', () => {
    store[WEALTH_KEY] = '88000'
    const m = useLightPavilionData()
    m.load()
    expect(m.wealthTarget.value).toBe(88000)
  })

  it('saveWealthTarget 写入字符串形态并保持数值', () => {
    const m = useLightPavilionData()
    m.saveWealthTarget(5000)
    expect(m.wealthTarget.value).toBe(5000)
    expect(mockSetKV).toHaveBeenCalledWith(WEALTH_KEY, '5000')
  })

  it('saveSpecialPlans 持久化专项规划列表', () => {
    const m = useLightPavilionData()
    const plans = [samplePlan({ id: 'a' }), samplePlan({ id: 'b' })]
    m.saveSpecialPlans(plans)
    expect(m.specialPlans.value.map((p) => p.id)).toEqual(['a', 'b'])
    expect(mockSetKV).toHaveBeenCalledWith(PLANS_KEY, plans)
  })

  it('load 读取已存储的专项规划', () => {
    store[PLANS_KEY] = [samplePlan({ id: 'stored' })]
    const m = useLightPavilionData()
    m.load()
    expect(m.specialPlans.value[0].id).toBe('stored')
  })
})
