import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { BodyLog } from '../../stores/health'
import MetricTrendsPanel from '../MetricTrendsPanel.vue'

function makeLog(type: BodyLog['type'], value: Record<string, any>, at: string, id: string): BodyLog {
  return { id, type, value, at }
}

/** 近 7 天睡眠 + 运动记录（每天一条，满足趋势 ≥3 点） */
function stableLogs(): BodyLog[] {
  const out: BodyLog[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    out.push(makeLog('sleep', { hours: 7.5 }, `${dateStr}T22:00:00`, `s_${i}`))
    out.push(makeLog('exercise', { minutes: 30 }, `${dateStr}T08:00:00`, `e_${i}`))
  }
  return out
}

/** 运动量逐日下降（60→12），触发下降趋势/低于目标预警 */
function decliningLogs(): BodyLog[] {
  const out: BodyLog[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    out.push(makeLog('sleep', { hours: 7.5 }, `${dateStr}T22:00:00`, `s_${i}`))
    out.push(makeLog('exercise', { minutes: 12 + i * 8 }, `${dateStr}T08:00:00`, `e_${i}`))
  }
  return out
}

function getWrapper(logs: BodyLog[]) {
  return mount(MetricTrendsPanel, { props: { logs } })
}

describe('MetricTrendsPanel · 指标趋势档案（INCR-135）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空态：无记录时显示引导', () => {
    const wrapper = getWrapper([])
    expect(wrapper.find('.mtp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('趋势还没生成')
    expect(wrapper.find('.mtp-trend').exists()).toBe(false)
  })

  it('数据充足：渲染整体评估与指标趋势卡片', () => {
    const wrapper = getWrapper(stableLogs())
    expect(wrapper.find('.mtp-empty').exists()).toBe(false)
    expect(wrapper.find('.mtp-assessment').exists()).toBe(true)
    const labels = wrapper.findAll('.mtp-trend-label').map((t) => t.text())
    expect(labels.some((t) => t.includes('睡眠'))).toBe(true)
    expect(labels.some((t) => t.includes('运动'))).toBe(true)
  })

  it('渲染最佳/最需关注指标', () => {
    const wrapper = getWrapper(stableLogs())
    expect(wrapper.find('.mtp-bw.best').exists()).toBe(true)
  })

  it('渲染温和洞察', () => {
    const wrapper = getWrapper(stableLogs())
    const insights = wrapper.findAll('.mtp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('下降趋势：渲染趋势预警并可确认', async () => {
    const wrapper = getWrapper(decliningLogs())
    const alerts = wrapper.findAll('.mtp-alert')
    expect(alerts.length).toBeGreaterThan(0)
    const ackBtn = alerts[0].find('.mtp-alert-ack')
    expect(ackBtn.exists()).toBe(true)
    await ackBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.mtp-alert-ack').length).toBeLessThan(alerts.length)
  })

  it('数据不足：单条记录不生成趋势', () => {
    const logs = [makeLog('sleep', { hours: 7 }, '2026-09-01T22:00:00', 's0')]
    const wrapper = getWrapper(logs)
    expect(wrapper.find('.mtp-empty').exists()).toBe(true)
    expect(wrapper.find('.mtp-trend').exists()).toBe(false)
  })
})
