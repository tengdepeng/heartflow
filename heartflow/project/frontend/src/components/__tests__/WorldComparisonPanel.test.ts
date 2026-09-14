// ============================================================
// 世界对照面板测试（INCR-77 · WorldComparisonPanel.vue）
// 空态 · 单分支引导 · 双分支运行对照 · 结果展示
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

function branch(id: string, name: string) {
  return {
    id, name, description: '', color: '#8a9a7a',
    createdAt: '2026-01-01T00:00:00.000Z', isActive: id === 'a', checkpointCount: 2,
  }
}
function cps() {
  return [
    { id: 's1', branchId: 'a', label: '共同检查点', description: '', snapshot: {}, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'] },
    { id: 's1', branchId: 'b', label: '共同检查点', description: '', snapshot: {}, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'] },
    { id: 'a1', branchId: 'a', label: 'A独有', description: '', snapshot: {}, createdAt: '2026-02-02T00:00:00.000Z', tags: ['work'] },
    { id: 'b1', branchId: 'b', label: 'B独有', description: '', snapshot: {}, createdAt: '2026-02-03T00:00:00.000Z', tags: ['travel'] },
  ]
}

async function mountPanel(over: Record<string, unknown> = {}) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  const { default: WorldComparisonPanel } = await import('../WorldComparisonPanel.vue')
  const wrapper = mount(WorldComparisonPanel, { props: { branches: [], checkpoints: [], ...over } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('WorldComparisonPanel 世界对照', () => {
  beforeEach(() => { vi.clearAllMocks(); Object.keys(mockStore).forEach(k => delete mockStore[k]) })

  it('空态：标题 + 徽标 + 无分支引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.wcp').exists()).toBe(true)
    expect(wrapper.text()).toContain('世界对照')
    expect(wrapper.find('.wcp-badge').text()).toContain('0 次对比')
    expect(wrapper.text()).toContain('至少需要两个时间分支才能对照')
  })

  it('单分支引导', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界')] })
    expect(wrapper.text()).toContain('至少需要两个时间分支才能对照')
  })

  it('双分支：默认选中前两分支，可运行对照并渲染结果', async () => {
    const a = branch('a', '主世界')
    const b = branch('b', '平行世界')
    const wrapper = await mountPanel({ branches: [a, b], checkpoints: cps() })
    const runBtn = wrapper.find('.wcp-run')
    expect(runBtn.attributes('disabled')).toBeUndefined()
    await runBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wcp-result').exists()).toBe(true)
    expect(wrapper.text()).toContain('主世界')
    expect(wrapper.text()).toContain('平行世界')
    // 徽标更新为 1 次对比
    expect(wrapper.find('.wcp-badge').text()).toContain('1 次对比')
  })

  it('运行对照后展示分维度相似度与检查点对比概览', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', 'A'), branch('b', 'B')], checkpoints: cps() })
    await wrapper.find('.wcp-run').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('维度相似度')
    expect(wrapper.findAll('.wcp-dim').length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('相似')
    expect(wrapper.findAll('.wcp-cp-stat').length).toBe(3)
  })
})