// ============================================================
// 逐日心锚 · 日历导出面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { Anchor } from '../../modules/anchor/types'

function anchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    id: `a_${Math.random().toString(36).slice(2, 8)}`,
    text: '写周报',
    done: false,
    targetDate: '2026-08-27',
    createdAt: '2026-08-27T08:00:00.000Z',
    priority: 'must',
    stage: 'active',
    driftCount: 0,
    ...overrides,
  }
}

async function mountPanel(anchors: Anchor[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CalendarExportPanel.vue')
  const wrapper = mount(mod.default, { props: { anchors } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CalendarExportPanel 日历导出', () => {
  it('空锚点禁用导出', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('日历导出')
    const btn = wrapper.find('.ce-btn-primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('导出 ICS 生成结果', async () => {
    const wrapper = await mountPanel([anchor(), anchor({ text: '读书', priority: 'can' })])
    await wrapper.find('.ce-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('导出结果')
    expect(wrapper.text()).toContain('.ics')
    expect(wrapper.text()).toContain('2 个事件')
    expect(wrapper.text()).toContain('BEGIN:VCALENDAR')
  })

  it('导出 JSON 生成结果', async () => {
    const wrapper = await mountPanel([anchor()])
    await wrapper.find('.ce-select').setValue('json')
    await wrapper.find('.ce-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('.json')
    expect(wrapper.text()).toContain('1 个事件')
  })

  it('按日期范围筛选导出', async () => {
    const wrapper = await mountPanel([
      anchor({ targetDate: '2026-08-20' }),
      anchor({ targetDate: '2026-09-10' }),
    ])
    await wrapper.find('.ce-input').setValue('2026-08-01')
    await wrapper.findAll('.ce-input')[1].setValue('2026-08-31')
    await wrapper.find('.ce-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('1 个事件')
  })
})
