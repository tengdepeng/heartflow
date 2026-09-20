// ============================================================
// WorklogBridgePanel 更漏·桥接总览（INCR-390）
// mock 直接子路径 ../../modules/worklog/worklog-module-bridge 注入受控 ref
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

function baseSummary() {
  return { totalEntries: 0, todayEntries: 0, weekEntries: 0, streakDays: 0, mostProductiveDay: '', mostProductiveHour: 9 }
}

const summary = ref<any>(baseSummary())
const filteredEntries = ref<any[]>([])

vi.mock('../../modules/worklog/worklog-module-bridge', () => ({
  useWorklogModuleBridge: () => ({
    summary,
    filteredEntries,
  }),
}))

async function mountPanel() {
  const mod = await import('../WorklogBridgePanel.vue')
  return mount(mod.default)
}

function entry(over: Record<string, any> = {}) {
  return { id: 'e1', type: 'journal', title: '灰度系统重构', content: '今天完成了灰度系统重构。', tags: [], createdAt: new Date(2026, 4, 15, 9, 30).toISOString(), updatedAt: new Date(2026, 4, 15, 9, 30).toISOString(), ...over }
}

describe('WorklogBridgePanel 更漏·桥接总览（INCR-390）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    summary.value = baseSummary()
    filteredEntries.value = []
  })

  it('空态：标题 + 徽标待记录 + 六格概览 + 空态引导 + 无最近记录', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="worklog-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.find('.wbp-title').text()).toContain('更漏·桥接总览')
    expect(wrapper.find('[data-test="wbp-status"]').classes()).toContain('idle')
    expect(wrapper.text()).toContain('待记录')
    expect(wrapper.find('[data-test="wbp-summary"]').exists()).toBe(true)
    const cells = wrapper.findAll('[data-test="wbp-cell"]')
    expect(cells.length).toBe(6)
    expect(cells[0].text()).toContain('总条目')
    expect(cells[4].text()).toContain('最有效率日')
    expect(wrapper.find('[data-test="wbp-recent"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="wbp-empty"]').text()).toContain('更漏还没记下第一篇日志')
  })

  it('概览六格：总/今日/本周/连续/最有效率日·时 数值', async () => {
    summary.value = { totalEntries: 12, todayEntries: 3, weekEntries: 8, streakDays: 4, mostProductiveDay: '周一', mostProductiveHour: 10 }
    filteredEntries.value = []
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="wbp-status"]').classes()).toContain('today')
    expect(wrapper.text()).toContain('今日 3 条')
    const cells = wrapper.findAll('[data-test="wbp-cell"]')
    expect(cells[0].text()).toContain('12')
    expect(cells[1].text()).toContain('3')
    expect(cells[2].text()).toContain('8')
    expect(cells[3].text()).toContain('4')
    expect(cells[4].text()).toContain('周一')
    expect(cells[5].text()).toContain('10时')
    expect(wrapper.find('[data-test="wbp-empty"]').exists()).toBe(false)
  })

  it('徽标有回响：无今日但有历史条目', async () => {
    summary.value = { ...baseSummary(), totalEntries: 6, weekEntries: 2 }
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="wbp-status"]').classes()).toContain('echo')
    expect(wrapper.text()).toContain('共 6 条')
  })

  it('快捷键归零：最有效率日 — 与最有效率时 —', async () => {
    const wrapper = await mountPanel()
    const cells = wrapper.findAll('[data-test="wbp-cell"]')
    expect(cells[4].text()).toContain('—')
    expect(cells[5].text()).toContain('—')
  })

  it('最近记录：标题/类型/时间 + 无空态引导', async () => {
    summary.value = { ...baseSummary(), totalEntries: 2, todayEntries: 1 }
    filteredEntries.value = [
      entry({ id: 'e2', title: '搭建内核框架', type: 'work', createdAt: new Date(2026, 4, 14, 8, 0).toISOString() }),
    ]
    const wrapper = await mountPanel()
    const items = wrapper.findAll('[data-test="wbp-recent-item"]')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('搭建内核框架')
    expect(items[0].text()).toContain('工作')
    expect(items[0].text()).toContain('5/14 08:00')
    expect(wrapper.find('[data-test="wbp-empty"]').exists()).toBe(false)
  })
})