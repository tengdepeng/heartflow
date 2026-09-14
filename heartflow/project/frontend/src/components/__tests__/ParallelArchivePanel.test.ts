// ============================================================
// ParallelArchivePanel 平行档案面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

const DAY = 24 * 60 * 60 * 1000
function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString()
}

function fork(id: string, at: string) {
  return { id, description: '', chosen: 'A', alternative: 'B', date: '', at }
}
function alt(id: string, originForkId: string | null = null) {
  return { id, title: '远方的你', desc: '', icon: '🌍', color: '#6b9fc4', expanded: false, originForkId }
}
function capsule(id: string, opened = false, openDate = '2099-01-01') {
  return {
    id, title: 'hi', message: 'hi', items: [], createdAt: daysAgo(10),
    openDate, openedAt: opened ? daysAgo(1) : null, opened, at: daysAgo(10), scope: 'free',
  }
}
function branch(id: string, extra: Partial<Record<string, unknown>> = {}) {
  return {
    id, name: '枝', description: '', color: '#4A90D9', createdAt: daysAgo(3),
    isActive: false, checkpointCount: 0, parentBranchId: undefined, ...extra,
  }
}

async function mountPanel(seed?: Record<string, any>) {
  // 每个用例重置模块缓存，刷新 parallel-selves / capsule / engine/storage 的单例，
  // 避免上次 load() 的模块级 refs 与本次种子污染导致快照不一致。
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (seed) Object.assign(kvStore, seed)
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  const mod = await import('../ParallelArchivePanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

function seedParallel() {
  return {
    'hf:decision_forks': [
      fork('f1', daysAgo(2)),
      fork('f2', daysAgo(10)),
    ],
    'hf:parallel_alts': [
      alt('a1', 'f1'),
      alt('a2', 'f2'),
      alt('a3'),
    ],
    // modules/capsule 以 getKV<string> + JSON.parse 读取，故时间胶囊须序列化为字符串；
    // 抉择分叉 / 平行自我 / 时间分支 以 getKV<T[]> 直接读取，故存纯数组。
    'hf:time_capsules': JSON.stringify([
      capsule('c1', true),
      capsule('c2', false),
    ]),
    'hf:parallel-world:branches': [
      branch('b1', { checkpointCount: 2 }),
    ],
  }
}

describe('ParallelArchivePanel 平行档案面板', () => {
  it('空态渲染标题与守候引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.pap').exists()).toBe(true)
    expect(wrapper.text()).toContain('平行档案')
    expect(wrapper.text()).toContain('平行世界还是空的')
  })

  it('填充态展示潜力沉淀与概览', async () => {
    const wrapper = await mountPanel(seedParallel())
    expect(wrapper.text()).toContain('潜力沉淀')
    expect(wrapper.find('.pap-health-num').exists()).toBe(true)
    expect(wrapper.find('.pap-cell').exists()).toBe(true)
  })

  it('展示平行自我来源分布', async () => {
    const wrapper = await mountPanel(seedParallel())
    expect(wrapper.text()).toContain('平行自我来源')
    expect(wrapper.text()).toContain('分叉映照')
    expect(wrapper.text()).toContain('自由映照')
  })

  it('展示时间胶囊状态分布', async () => {
    const wrapper = await mountPanel(seedParallel())
    expect(wrapper.text()).toContain('时间胶囊状态')
    expect(wrapper.text()).toContain('已开启')
    expect(wrapper.text()).toContain('仍在等')
  })

  it('展示抉择节奏（近月抉择）', async () => {
    const wrapper = await mountPanel(seedParallel())
    expect(wrapper.text()).toContain('抉择节奏')
    expect(wrapper.text()).toContain('未遇新的岔路口')
  })

  it('温和洞察不超过 4 条', async () => {
    const wrapper = await mountPanel(seedParallel())
    const insights = wrapper.findAll('.pap-insights li')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})