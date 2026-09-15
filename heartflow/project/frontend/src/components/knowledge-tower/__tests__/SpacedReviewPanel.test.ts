import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

function makeNode(overrides: Record<string, any> = {}) {
  return {
    id: 'n_' + Math.random().toString(36).slice(2, 7),
    title: '测试节点',
    desc: '一段描述',
    tags: ['心流'],
    cat: '认知',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(nodes: Record<string, any>[] = [], reviewPlans: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (nodes.length) kvStore['hf:knowledge_nodes'] = nodes
  if (reviewPlans.length) kvStore['hf:knowledge:review_plans'] = reviewPlans
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../SpacedReviewPanel.vue')
  const wrapper = mount(mod.default)
  return wrapper
}

describe('SpacedReviewPanel 间隔复习', () => {
  it('无知识节点时展示空态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有知识节点')
  })

  it('有节点但无计划时提供生成入口', async () => {
    const wrapper = await mountPanel([makeNode({ title: '专注力' })])
    expect(wrapper.text()).toContain('生成今日复习计划')
    expect(wrapper.findAll('.srp-stat').length).toBe(0)
  })

  it('生成本日计划后展示统计与今日到期', async () => {
    const wrapper = await mountPanel([makeNode({ title: '记忆宫殿' })])
    await wrapper.find('.srp-btn--primary').trigger('click')
    expect(wrapper.findAll('.srp-stat').length).toBe(5)
    expect(wrapper.text()).toContain('今日到期')
    expect(wrapper.text()).toContain('记忆宫殿')
  })

  it('生成计划后可点击翻面打分完成复习', async () => {
    const wrapper = await mountPanel([makeNode({ title: '认知负荷', desc: '工作记忆有限' })])
    await wrapper.find('.srp-btn--primary').trigger('click')
    expect(wrapper.find('.srp-card').exists()).toBe(true)
    // 翻面显示描述
    await wrapper.find('.srp-card').trigger('click')
    expect(wrapper.text()).toContain('工作记忆有限')
    // 打分（记得）
    await wrapper.find('.srp-quality--good').trigger('click')
    expect(wrapper.text()).toContain('今日复习已完成')
  })

  it('有历史计划时直接渲染统计与熟练度分布', async () => {
    const today = new Date().toISOString().split('T')[0]
    const plan = {
      id: `review-plan-${today}`,
      date: today,
      completed: true,
      correctCount: 2,
      incorrectCount: 0,
      totalCount: 2,
      items: [
        { nodeId: 'n1', title: '概念A', category: '认知', reviewCount: 3, lastReviewedAt: null, nextReviewAt: today, due: false, mastery: 0.8, difficulty: 0.4 },
        { nodeId: 'n2', title: '概念B', category: '记忆', reviewCount: 5, lastReviewedAt: null, nextReviewAt: today, due: false, mastery: 0.5, difficulty: 0.6 },
      ],
    }
    const wrapper = await mountPanel([
      makeNode({ id: 'n1', title: '概念A' }),
      makeNode({ id: 'n2', title: '概念B' }),
    ], [plan])
    expect(wrapper.findAll('.srp-stat').length).toBe(5)
    expect(wrapper.text()).toContain('平均熟练度')
    expect(wrapper.text()).toContain('精通')
    expect(wrapper.find('.srp-mastery-bar').exists()).toBe(true)
  })
})