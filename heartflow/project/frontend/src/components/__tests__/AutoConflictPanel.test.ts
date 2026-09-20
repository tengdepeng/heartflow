// ============================================================
// 冲突仲裁面板测试（INCR-80 · AutoConflictPanel.vue）
// 空态 · 单分支引导 · 冲突检测 · 一键解决 · 规则管理 · 模式分析
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

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
  localStorage.clear()
  const { default: AutoConflictPanel } = await import('../AutoConflictPanel.vue')
  const wrapper = mount(AutoConflictPanel, {
    props: { branches: [], checkpoints: [], ...over },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AutoConflictPanel 冲突仲裁', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it('空态：标题 + 徽标 + 无分支引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.acp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('冲突仲裁')
    expect(wrapper.text()).toContain('0 次解决 · 5 条规则')
    expect(wrapper.text()).toContain('还没有平行分支可仲裁')
  })

  it('单分支引导', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界')] })
    expect(wrapper.text()).toContain('至少需要两个分支才能仲裁')
    expect(wrapper.text()).toContain('主世界')
  })

  it('双分支：检测冲突显示冲突列表', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [
        cp('sa', 'a', { label: '源', snapshot: { v: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['life', 'work'] }),
        cp('sb', 'b', { label: '目标', snapshot: { v: 2 }, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'] }),
      ],
    })
    const inputs = wrapper.findAll('.acp-input')
    await inputs[0].setValue('sa')
    await inputs[1].setValue('sb')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-detect').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('检测到 4 个冲突')
    expect(wrapper.text()).toContain('标签名称冲突')
    expect(wrapper.text()).toContain('数据字段冲突')
  })

  it('双分支：一键解决生成结果摘要并更新徽标', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [
        cp('sa', 'a', { label: '源', snapshot: { v: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['life', 'work'] }),
        cp('sb', 'b', { label: '目标', snapshot: { v: 2 }, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'] }),
      ],
    })
    const inputs = wrapper.findAll('.acp-input')
    await inputs[0].setValue('sa')
    await inputs[1].setValue('sb')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-detect').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-run').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.acp-result').exists()).toBe(true)
    expect(wrapper.text()).toContain('✓ 全部解决')
    expect(wrapper.text()).toContain('共解决 4 个冲突')
    expect(wrapper.find('.acp-badge').text()).toContain('1 次解决')
  })

  it('规则页：默认规则列表 + 新增规则', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')] })
    await wrapper.findAll('.acp-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('时间戳冲突取最新')
    expect(wrapper.text()).toContain('标签合并')
    const inputs = wrapper.findAll('.acp-input')
    await inputs[0].setValue('我的规则')
    // 并入 ConflictResolutionPanel 能力后新增规则需勾选冲突类型（INCR-400）
    await wrapper.find('.acp-type-cell input[value="data"]').setValue(true)
    await wrapper.find('.acp-add').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('我的规则')
    expect(wrapper.find('.acp-badge').text()).toContain('6 条规则')
  })

  it('默认策略：切换兜底策略并反映所选值（并入 ConflictResolutionPanel 独有能力 INCR-400）', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')] })
    const sel = wrapper.find('select[aria-label="默认策略"]')
    expect(sel.exists()).toBe(true)
    expect((sel.element as HTMLSelectElement).value).toBe('newest-wins')
    await sel.setValue('merge-fields')
    await wrapper.vm.$nextTick()
    expect((wrapper.find('select[aria-label="默认策略"]').element as HTMLSelectElement).value).toBe('merge-fields')
  })

  it('解决历史：解决后生成可点选历史记录（并入 ConflictResolutionPanel 独有能力 INCR-400）', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [
        cp('sa', 'a', { label: '源', snapshot: { v: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['life', 'work'] }),
        cp('sb', 'b', { label: '目标', snapshot: { v: 2 }, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'] }),
      ],
    })
    const inputs = wrapper.findAll('.acp-input')
    await inputs[0].setValue('sa')
    await inputs[1].setValue('sb')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-detect').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-run').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('解决历史（1）')
    const item = wrapper.find('.acp-history-item')
    expect(item.exists()).toBe(true)
    expect(item.text()).toContain('全部解决')
    await item.trigger('click')
    await wrapper.vm.$nextTick()
    expect(item.classes()).toContain('active')
  })

  it('新增规则：支持描述与字段规则及多冲突类型（并入 ConflictResolutionPanel 独有能力 INCR-400）', async () => {
    const wrapper = await mountPanel({ branches: [branch('a', '主世界'), branch('b', '平行世界')] })
    await wrapper.findAll('.acp-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.acp-input')
    await inputs[0].setValue('工作线优先')
    await inputs[1].setValue('工作相关的字段优先处理')
    await wrapper.find('.acp-type-cell input[value="data"]').setValue(true)
    await wrapper.find('.acp-type-cell input[value="tag"]').setValue(true)
    await inputs[4].setValue('goal,work')
    await wrapper.find('.acp-add').trigger('click')
    await wrapper.vm.$nextTick()
    // 徽标 5 默认 + 1 = 6；描述与类型标签均渲染
    expect(wrapper.find('.acp-badge').text()).toContain('6 条规则')
    expect(wrapper.text()).toContain('工作相关的字段优先处理')
    const rule = wrapper.findAll('.acp-rule').find(r => r.find('.acp-rule-name').text() === '工作线优先')!
    expect(rule.find('.acp-rule-desc').text()).toContain('工作相关的字段优先处理')
    const tags = rule.findAll('.acp-rule-type-tag').map(x => x.text())
    expect(tags).toContain('数据')
    expect(tags).toContain('标签')
  })

  it('分析页：解决后生成模式分析', async () => {
    const wrapper = await mountPanel({
      branches: [branch('a', '主世界'), branch('b', '平行世界')],
      checkpoints: [
        cp('sa', 'a', { snapshot: { v: 1 } }),
        cp('sb', 'b', { snapshot: { v: 2 } }),
      ],
    })
    const inputs = wrapper.findAll('.acp-input')
    await inputs[0].setValue('sa')
    await inputs[1].setValue('sb')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-detect').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.acp-run').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.acp-tab')[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已解决')
    expect(wrapper.text()).toContain('自动率')
    expect(wrapper.text()).toContain('高频冲突类型')
  })
})
