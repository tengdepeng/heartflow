// ============================================================
// AnchorTimeScalePanel 组件测试（INCR-01：逐日心锚时间流）
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnchorTimeScalePanel from '../AnchorTimeScalePanel.vue'
import type { Anchor } from '../../modules/anchor/types'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function base(t: string, priority: Anchor['priority'], done = false, stage: Anchor['stage'] = 'active'): Anchor {
  return { id: t + priority, text: `锚：${t}-${priority}`, done, targetDate: t, createdAt: new Date().toISOString(), priority, stage, driftCount: 0 }
}

describe('AnchorTimeScalePanel', () => {
  it('空锚点显示空态', () => {
    const wrapper = mount(AnchorTimeScalePanel, { props: { anchors: [] } })
    expect(wrapper.text()).toContain('时间流')
    expect(wrapper.text()).toContain('暂无锚点')
  })

  it('周尺度展示时间范围与锚点', () => {
    const anchors = [base(todayKey(), 'must'), base(todayKey(), 'can')]
    const wrapper = mount(AnchorTimeScalePanel, { props: { anchors } })
    expect(wrapper.find('.ats-scales').exists()).toBe(true)
    // 本周尺度内应有 2 条
    expect(wrapper.text()).toContain('共 2')
    expect(wrapper.text()).toContain('完成率')
  })

  it('切换日/周/月/年尺度', async () => {
    const anchors = [base(todayKey(), 'float')]
    const wrapper = mount(AnchorTimeScalePanel, { props: { anchors } })
    for (const s of ['日', '周', '月', '年']) {
      await wrapper.findAll('.ats-scale').find((b) => b.text() === s)!.trigger('click')
      expect(wrapper.find('.ats-scale.on').text()).toBe(s)
    }
  })

  it('已完成锚点计入完成数', () => {
    const anchors = [
      base(todayKey(), 'must', true),
      base(todayKey(), 'can', false),
    ]
    const wrapper = mount(AnchorTimeScalePanel, { props: { anchors } })
    expect(wrapper.text()).toContain('已完成 1')
  })
})