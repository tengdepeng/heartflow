// ============================================================
// MeridianVisualizationPanel 经络可视化面板测试（INCR-90）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MeridianVisualizationPanel from '../MeridianVisualizationPanel.vue'
import type { MeridianRecord } from '../../modules/body-wisdom'

function makeRecord(overrides: Partial<MeridianRecord> = {}): MeridianRecord {
  return {
    id: 'r1',
    meridian: 'liver',
    feeling: 'good',
    recordedAt: new Date().toISOString(),
    hour: 1,
    ...overrides,
  }
}

function mountPanel(records: MeridianRecord[] = []) {
  return mount(MeridianVisualizationPanel, { props: { records } })
}

describe('MeridianVisualizationPanel 经络可视化面板', () => {
  it('空数据：渲染标题与空态', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('经络可视化')
    expect(wrapper.text()).toContain('子午流注 · 热力 · 五行 · 趋势')
    expect(wrapper.text()).toContain('还没有经络记录')
    expect(wrapper.findAll('.mvp-tab').length).toBe(5)
  })

  it('概览：有记录时展示统计与最佳/最差经络', async () => {
    const records = [
      makeRecord({ meridian: 'liver', feeling: 'good' }),
      makeRecord({ meridian: 'liver', feeling: 'good' }),
      makeRecord({ meridian: 'lung', feeling: 'bad' }),
    ]
    const wrapper = mountPanel(records)
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('最佳')
    expect(wrapper.text()).toContain('关注')
  })

  it('概览：时辰养生提醒展示当前时辰', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('时辰养生提醒')
    expect(wrapper.text()).toContain('当前')
    expect(wrapper.text()).toContain('上一个')
    expect(wrapper.text()).toContain('下一个')
  })

  it('时钟：切换到时钟页展示 12 时辰节点', async () => {
    const wrapper = mountPanel([])
    await wrapper.findAll('.mvp-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('子午流注时钟')
    expect(wrapper.findAll('.mvp-clock-node').length).toBe(12)
  })

  it('热力：切换到热力页展示 12 经络行', async () => {
    const wrapper = mountPanel([])
    await wrapper.findAll('.mvp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('经络热力图')
    expect(wrapper.findAll('.mvp-heat-row').length).toBe(12)
  })

  it('五行：切换到五行页展示生克关系', async () => {
    const wrapper = mountPanel([])
    await wrapper.findAll('.mvp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('五脏五行生克')
    expect(wrapper.findAll('.mvp-element').length).toBe(5)
    expect(wrapper.findAll('.mvp-relation').length).toBe(10)
  })

  it('趋势：切换到趋势页展示 30 天数据并支持经络筛选', async () => {
    const wrapper = mountPanel([])
    await wrapper.findAll('.mvp-tab')[4].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('经络趋势')
    expect(wrapper.findAll('.mvp-trend-point').length).toBe(30)
    expect(wrapper.findAll('.mvp-trend-chip').length).toBe(13)
  })
})
