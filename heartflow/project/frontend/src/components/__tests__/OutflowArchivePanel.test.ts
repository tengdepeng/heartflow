// ============================================================
// OutflowArchivePanel 外流态势面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OutflowArchivePanel from '../OutflowArchivePanel.vue'
import type { GuardOutflowLog, OutflowChannel } from '../../engine/data-outflow'

function mk(channel: OutflowChannel, daysAgo: number, hour = 10): GuardOutflowLog {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return {
    id: `${channel}_${daysAgo}_${hour}`,
    at: d.toISOString(),
    channel,
    channelLabel: channel,
    target: '外部模型API',
    summary: '测试',
  }
}

function mountPanel(logs: GuardOutflowLog[]) {
  return mount(OutflowArchivePanel, { props: { logs } })
}

describe('OutflowArchivePanel 外流态势', () => {
  it('空态：标题 + 去向安然徽标 + 引导文案', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('外流态势')
    expect(wrapper.text()).toContain('去向安然')
    expect(wrapper.text()).toContain('数据未曾离开本设备')
  })

  it('填充态：近7天有流出时徽标为外流活跃', () => {
    const logs = [mk('export', 0), mk('share', 1), mk('backup', 2)]
    const wrapper = mountPanel(logs)
    const badge = wrapper.find('.oap-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('外流活跃')
  })

  it('填充态：档案概览六格', () => {
    const logs = [mk('export', 0), mk('export', 1), mk('share', 2), mk('backup', 6)]
    const wrapper = mountPanel(logs)
    const overviewBlock = wrapper.findAll('.oap-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.oap-cell')
    expect(cells.length).toBe(6)
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('覆盖渠道')
    expect(wrapper.text()).toContain('近7天')
    expect(wrapper.text()).toContain('最常渠道')
  })

  it('填充态：渠道分布渲染图标与次数', () => {
    const logs = [mk('export', 0), mk('export', 1), mk('share', 2)]
    const wrapper = mountPanel(logs)
    const distBlock = wrapper.findAll('.oap-block').find((b) => b.text().includes('渠道分布'))!
    expect(distBlock.exists()).toBe(true)
    expect(distBlock.text()).toContain('导出')
    expect(distBlock.text()).toContain('分享')
    expect(distBlock.text()).toContain('2次')
  })

  it('填充态：近7天节奏渲染 7 天', () => {
    const logs = [mk('export', 0), mk('share', 1), mk('backup', 2)]
    const wrapper = mountPanel(logs)
    const rhythmBlock = wrapper.findAll('.oap-block').find((b) => b.text().includes('近7天节奏'))!
    const days = rhythmBlock.findAll('.oap-rhythm-day')
    expect(days.length).toBe(7)
    expect(rhythmBlock.text()).toContain('今天')
  })

  it('温和洞察列表有界且非空', () => {
    const logs = [
      mk('export', 0),
      mk('sync', 1),
      mk('external-ai', 2),
      mk('share', 3),
      mk('backup', 4),
    ]
    const wrapper = mountPanel(logs)
    const insights = wrapper.findAll('.oap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('数据联动：props 更新后从空态进入填充态', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('去向安然')
    await wrapper.setProps({
      logs: [mk('export', 0), mk('share', 1)],
    })
    expect(wrapper.text()).not.toContain('数据未曾离开本设备')
    expect(wrapper.text()).toContain('档案概览')
  })
})
