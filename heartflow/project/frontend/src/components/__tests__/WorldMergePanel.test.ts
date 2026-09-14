// ============================================================
// 世界融合面板测试（INCR-79 · WorldMergePanel.vue）
// 空态 · 单分支引导 · 合并预览 · 冲突协调 · 遗产 · 回滚
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

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

function cp(id: string, branchId: string, over: Record<string, unknown> = {}) {
  return {
    id, branchId, label: id, description: '',
    snapshot: {}, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'], ...over,
  }
}

async function mountPanel(over: Record<string, unknown> = {}) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  const { default: WorldMergePanel } = await import('../WorldMergePanel.vue')
  const wrapper = mount(WorldMergePanel, {
    props: { branches: [], checkpoints: [], snapshots: [], ...over },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

function previewBtn(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('.wmp-btn').find(b => b.text() === '预览')!
}

describe('WorldMergePanel 世界融合', () => {
  beforeEach(() => { vi.clearAllMocks(); Object.keys(mockStore).forEach(k => delete mockStore[k]) })

  it('空态：标题 + 徽标 + 无分支引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.wmp').exists()).toBe(true)
    expect(wrapper.text()).toContain('世界融合')
    expect(wrapper.find('.wmp-badge').text()).toContain('0 次融合 · 0 回滚')
    expect(wrapper.text()).toContain('至少需要两个时间分支才能融合')
  })

  it('单分支引导', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界')] })
    expect(wrapper.text()).toContain('至少需要两个时间分支才能融合')
  })

  it('双分支：预览合并显示新增/修改统计', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [cp('a1', 'a'), cp('b1', 'b')],
    })
    await previewBtn(wrapper).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('合并预览')
    expect(wrapper.text()).toContain('新增检查点')
    expect(wrapper.text()).toContain('修改检查点')
    // 新增 1 · 修改 0
    expect(wrapper.findAll('.wmp-preview-num')[0].text()).toBe('1')
    expect(wrapper.findAll('.wmp-preview-num')[1].text()).toBe('0')
  })

  it('双分支：无冲突合并成功并沉淀遗产', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [cp('a1', 'a', { tags: ['life', 'work'] }), cp('b1', 'b')],
    })
    await wrapper.find('.wmp-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wmp-result').exists()).toBe(true)
    expect(wrapper.text()).toContain('✓ 融合成功')
    expect(wrapper.text()).toContain('遗产继承')
    expect(wrapper.find('.wmp-badge').text()).toContain('1 次融合')
  })

  it('冲突协调：自动解决非关键后手动解决关键冲突并合并', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
      ],
    })
    await previewBtn(wrapper).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.wmp-conflict').length).toBe(3)
    // 自动解决非关键（标签/标签名），关键数据冲突保留
    await wrapper.find('.wmp-auto').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.wmp-conflict-done').length).toBe(2)
    // 剩余关键冲突手动解决
    const critical = wrapper.findAll('.wmp-conflict').find(el => el.text().includes('数据冲突'))!
    await critical.find('.wmp-merge').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.wmp-conflict-done').length).toBe(3)
    await wrapper.find('.wmp-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('✓ 融合成功')
  })

  it('遗产展示继承项', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [cp('a1', 'a', { tags: ['life', 'work'] }), cp('b1', 'b')],
    })
    await wrapper.find('.wmp-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('遗产继承')
    expect(wrapper.text()).toContain('检查点')
    expect(wrapper.text()).toContain('标签')
    expect(wrapper.text()).toContain('主世界')
  })

  it('回滚页：合并后留下足迹', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [cp('a1', 'a'), cp('b1', 'b')],
    })
    await wrapper.find('.wmp-run').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wmp-rollback').exists()).toBe(true)
    expect(wrapper.text()).toContain('回滚历史')
    // 足迹记录包含两个分支名
    expect(wrapper.find('.wmp-rollback').text()).toContain('主世界')
    expect(wrapper.find('.wmp-rollback').text()).toContain('平行世界')
  })
})