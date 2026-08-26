import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const ENTRIES_KEY = 'worklog:entries'

function entry(overrides: Record<string, any> = {}) {
  return {
    id: `log_${Math.random().toString(36).slice(2, 8)}`,
    type: 'journal',
    title: '今日记录',
    content: '完成了导出模块的联调',
    mood: 'calm',
    tags: ['工作', '导出'],
    sessionIds: [],
    roomId: undefined,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../WorklogExportPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('WorklogExportPanel 更漏导出', () => {
  beforeEach(() => {
    // 复制/下载依赖的浏览器 API 在 jsdom 中缺失，统一 mock（保留 userAgent 供 platform 检测）
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    })
  })

  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('导出留档')
    expect(wrapper.text()).toContain('日志概览')
  })

  it('展示日志概览统计', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [entry(), entry({ tags: ['工作'] })],
    })
    expect(wrapper.text()).toContain('导出留档')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('日志')
  })

  it('导出条目并显示结果与预览', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [entry({ title: '导出测试' })],
    })
    await wrapper.find('button.we-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已导出 1 条')
    expect(wrapper.text()).toContain('worklog_')
    expect(wrapper.text()).toContain('导出测试')
  })

  it('复制到剪贴板', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [entry({ title: '复制测试' })],
    })
    const buttons = wrapper.findAll('button.we-btn')
    const copyBtn = buttons.find(b => b.text() === '复制')!
    await copyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect((globalThis as any).navigator.clipboard.writeText).toHaveBeenCalled()
    const content = (globalThis as any).navigator.clipboard.writeText.mock.calls[0][0]
    expect(content).toContain('复制测试')
  })

  it('下载触发文件导出', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [entry({ title: '下载测试' })],
    })
    const buttons = wrapper.findAll('button.we-btn')
    const dlBtn = buttons.find(b => b.text() === '下载')!
    await dlBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(wrapper.text()).toContain('已导出 1 条')
  })

  it('生成周报并显示结果', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [entry({ title: '周报测试' })],
    })
    const buttons = wrapper.findAll('button.we-btn-primary')
    const reportBtn = buttons.find(b => b.text() === '生成')!
    await reportBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已生成')
    expect(wrapper.text()).toContain('worklog_weekly')
  })

  it('日期范围过滤导出', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [
        entry({ title: '范围内', createdAt: '2026-08-20T08:00:00.000Z' }),
        entry({ title: '范围外', createdAt: '2026-01-01T08:00:00.000Z' }),
      ],
    })
    const dates = wrapper.findAll('input[type="date"]')
    await dates[0].setValue('2026-08-01')
    await dates[1].setValue('2026-08-31')
    await wrapper.find('button.we-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已导出 1 条')
    expect(wrapper.text()).toContain('范围内')
    expect(wrapper.text()).not.toContain('范围外')
  })

  it('切换格式为 JSON 导出', async () => {
    const wrapper = await mountPanel({
      [ENTRIES_KEY]: [entry({ title: 'JSON测试' })],
    })
    await wrapper.find('select.we-select').setValue('json')
    await wrapper.find('button.we-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('.json')
    expect(wrapper.text()).toContain('JSON测试')
  })
})
