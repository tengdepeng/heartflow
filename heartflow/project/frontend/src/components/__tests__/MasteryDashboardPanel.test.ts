// ============================================================
// 掌握度面板（MasteryDashboardPanel）集成测试
// 覆盖：空态 / 收录知识点 / 难度录入 / 评分反馈改变掌握状态 /
//       待加强优先排序与掌握档案指标
// 数据源：storage['hf:mastery_items']（序列化）。useMastery 每次
//       挂载重新读取 storage，故各例重置 mock 后播种即可。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { MasteryItem } from '../../modules/mastery'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const clone = (v: any) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? clone(store[k]) : d))
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = clone(v) })
  return { store, mockGetKV, mockSetKV }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

function mkItem(over: Partial<MasteryItem> = {}): MasteryItem {
  return {
    id: 'm1', topic: '概念', confidence: 0, attempts: 0, difficulty: 1,
    updatedAt: new Date().toISOString(), ...over,
  }
}

async function prepare(seed?: MasteryItem[]) {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  if (seed) store['hf:mastery_items'] = seed
  const mod = await import('../MasteryDashboardPanel.vue')
  return mount(mod.default)
}

describe('MasteryDashboardPanel · 掌握度', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('无知识点时呈现空态且掌握档案归零', async () => {
    const w = await prepare()
    expect(w.find('.mdp-title').text()).toContain('掌握度')
    expect(w.find('.mdp-sub').text()).toContain('Khan 式')
    expect(w.find('.mdp-empty').exists()).toBe(true)
    expect(w.find('.mdp-empty').text()).toContain('还没有知识点')
    expect(w.find('.mdp-item').exists()).toBe(false)
    const metrics = w.findAll('.mdp-metric b')
    expect(metrics[0].text()).toBe('0')   // 知识点
    expect(metrics[1].text()).toBe('0')   // 已通晓
    expect(metrics[2].text()).toBe('0')   // 平均掌握
    expect(metrics[3].text()).toBe('0%')  // 掌握率
    // 洞察给出空态引导
    expect(w.findAll('.mdp-insights li')[0].text()).toContain('还没有知识点')
  })

  it('收录知识点后列表出现该项并更新档案', async () => {
    const w = await prepare()
    const inputs = w.findAll('.mdp-input')
    await inputs[0].setValue('微积分')
    await w.find('.mdp-btn').trigger('click')

    const item = w.find('.mdp-item')
    expect(item.exists()).toBe(true)
    expect(item.find('.mdp-topic').text()).toBe('微积分')
    expect(item.find('.mdp-conf').text()).toBe('0')
    expect(item.find('.mdp-state').text()).toBe('待学') // confidence 0 → new
    expect(item.find('.mdp-meta').text()).toContain('练 0 次')

    const metrics = w.findAll('.mdp-metric b')
    expect(metrics[0].text()).toBe('1')   // 知识点总数
    // 空态消失
    expect(w.find('.mdp-empty').exists()).toBe(false)
    // 收录即持久化
    expect(mockSetKV).toHaveBeenCalledWith('hf:mastery_items', expect.any(Array))
  })

  it('可录入难度系数并在列表中体现', async () => {
    const w = await prepare()
    const inputs = w.findAll('.mdp-input')
    await inputs[0].setValue('线性代数')
    await inputs[1].setValue('5') // difficulty
    await w.find('.mdp-btn').trigger('click')

    const meta = w.find('.mdp-item').find('.mdp-meta')
    expect(meta.text()).toContain('难度 ×5')
  })

  it('评分反馈驱动掌握状态跃迁（练习中 → 已通晓）', async () => {
    // confidence 75 → learning；反馈 60 → applyFeedback 后 86 → mastered
    const w = await prepare([mkItem({ id: 'x', topic: '微积分', confidence: 75, attempts: 0, difficulty: 1 })])
    let item = w.find('.mdp-item')
    expect(item.find('.mdp-state').text()).toBe('练习中')
    expect(item.find('.mdp-conf').text()).toBe('75')

    // 点「半」= 反馈 60
    await item.findAll('.mdp-mini').find((b) => b.text() === '半')!.trigger('click')

    item = w.find('.mdp-item')
    // increment = 0.28*60/(1+0.5*1)=11.2 → 75+11=86（math.round）
    expect(item.find('.mdp-conf').text()).toBe('86')
    expect(item.find('.mdp-state').text()).toBe('已通晓')
    expect(item.find('.mdp-meta').text()).toContain('练 1 次')
  })

  it('待加强优先排序且掌握档案按三态分布', async () => {
    const w = await prepare([
      mkItem({ id: 'matured', topic: '已通概念', confidence: 90, attempts: 1 }),
      mkItem({ id: 'mid', topic: '卡壳概念', confidence: 50, attempts: 1 }),
      mkItem({ id: 'fresh', topic: '崭新概念', confidence: 10, attempts: 0 }),
    ])
    // 待加强优先：confidence 升序
    const topics = w.findAll('.mdp-topic').map((n) => n.text())
    expect(topics).toEqual(['崭新概念', '卡壳概念', '已通概念'])

    // 掌握档案
    const metrics = w.findAll('.mdp-metric b')
    expect(metrics[0].text()).toBe('3')   // total
    expect(metrics[1].text()).toBe('1')   // mastered
    expect(metrics[2].text()).toBe('50')  // avg (90+50+10)/3=50
    expect(metrics[3].text()).toBe('33%') // mastered 1/3

    // 三态分布
    const dist = w.findAll('.mdp-dist-row')
    expect(dist.length).toBe(3)
    const labels = dist.map((r) => r.find('.mdp-dist-label').text())
    expect(labels).toEqual(['待学', '练习中', '已通晓'])
    const counts = dist.map((r) => r.find('.mdp-dist-n').text())
    expect(counts).toEqual(['1', '1', '1'])

    // 待回炉排除已通晓
    const weak = w.findAll('.mdp-weak-tok').map((n) => n.text())
    expect(weak).toEqual(['崭新概念', '卡壳概念'])
    // 洞察含回炉建议
    expect(w.find('.mdp-rhythm').exists()).toBe(true)
  })
})