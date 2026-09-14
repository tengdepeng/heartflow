// ============================================================
// 审计时间线面板测试（INCR-81 · AuditTimelinePanel.vue）
// 空态 · 时间线 · 搜索 · 分析 · 趋势 · 导出
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AuditLogEntry } from '../../modules/safety/incident-response'

function entry(id: string, over: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id, action: 'login', actor: 'user', target: 'system', result: 'success',
    detail: '', timestamp: '2026-09-01T10:00:00.000Z', ...over,
  }
}

function seedAuditLog(entries: AuditLogEntry[]) {
  localStorage.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    config: {},
    kvStore: { 'hf:safety:audit_log': entries },
  }))
}

async function mountPanel(entries: AuditLogEntry[] = []) {
  seedAuditLog(entries)
  const { default: AuditTimelinePanel } = await import('../AuditTimelinePanel.vue')
  const wrapper = mount(AuditTimelinePanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AuditTimelinePanel 审计时间线', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('空态：标题 + 徽标 + 引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.atp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('审计时间线')
    expect(wrapper.text()).toContain('0 事件')
    expect(wrapper.text()).toContain('暂无审计日志')
  })

  it('时间线页：展示分段与事件', async () => {
    const wrapper = await mountPanel([
      entry('e1', { action: 'login', result: 'success' }),
      entry('e2', { action: 'data_export', result: 'blocked' }),
    ])
    expect(wrapper.text()).toContain('2 事件')
    expect(wrapper.text()).toContain('认证')
    expect(wrapper.text()).toContain('成功')
    expect(wrapper.text()).toContain('拦截')
  })

  it('时间线页：搜索过滤事件', async () => {
    const wrapper = await mountPanel([
      entry('e1', { action: 'login', result: 'success' }),
      entry('e2', { action: 'backup', result: 'success' }),
    ])
    const search = wrapper.find('.atp-search')
    await search.setValue('backup')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('backup')
    expect(wrapper.text()).not.toContain('login')
  })

  it('分析页：聚合与异常摘要', async () => {
    const wrapper = await mountPanel([
      entry('e1', { action: 'login', result: 'failure' }),
      entry('e2', { action: 'data_export', result: 'blocked' }),
      entry('e3', { action: 'backup', result: 'success' }),
    ])
    await wrapper.findAll('.atp-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('聚合分析')
    expect(wrapper.text()).toContain('异常事件')
    expect(wrapper.text()).toContain('2')
  })

  it('趋势页：方向与异常点', async () => {
    const now = Date.now()
    const entries: AuditLogEntry[] = []
    for (let h = 5; h >= 1; h--) {
      for (let i = 0; i < 2; i++) {
        entries.push(entry(`n${h}_${i}`, { timestamp: new Date(now - h * 3600 * 1000).toISOString() }))
      }
    }
    for (let i = 0; i < 30; i++) {
      entries.push(entry(`spike_${i}`, { timestamp: new Date(now).toISOString() }))
    }
    const wrapper = await mountPanel(entries)
    await wrapper.findAll('.atp-tab')[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('趋势')
    expect(wrapper.text()).toContain('变化率')
    expect(wrapper.text()).toContain('异常点')
  })

  it('导出页：生成导出结果', async () => {
    const wrapper = await mountPanel([
      entry('e1', { action: 'login', result: 'success' }),
    ])
    await wrapper.findAll('.atp-tab')[3].trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.atp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.atp-export-result').exists()).toBe(true)
    expect(wrapper.text()).toContain('audit_timeline_')
    expect(wrapper.text()).toContain('字节')
  })
})
