// ============================================================
// 岁时阁 · 季节日志面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const JOURNAL_KEY = 'hf:seasonal_journals'

function entry(overrides: Record<string, any> = {}) {
  return {
    id: `sj_${Math.random().toString(36).slice(2, 8)}`,
    season: 'summer',
    year: 2026,
    title: '夏日随想',
    content: '热烈的季节，充满干劲',
    mood: 'reflective',
    keyEvents: [],
    relatedRitualIds: [],
    relatedCocoonIds: [],
    solarTerm: '大暑',
    weather: '',
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
  const mod = await import('../JournalPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('JournalPanel 季节日志', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('季节日志')
    expect(wrapper.text()).toContain('日志概览')
    expect(wrapper.text()).toContain('季节反思提示')
  })

  it('展示已有日志', async () => {
    const wrapper = await mountPanel({
      [JOURNAL_KEY]: [entry()],
    })
    expect(wrapper.text()).toContain('夏日随想')
    expect(wrapper.text()).toContain('热烈的季节')
    expect(wrapper.text()).toContain('大暑')
  })

  it('创建日志并持久化', async () => {
    const wrapper = await mountPanel({})
    const inputs = wrapper.findAll('input.jn-input')
    await inputs[0].setValue('夏日记录')
    await wrapper.find('textarea.jn-textarea').setValue('这个夏天很充实')
    await wrapper.find('button.jn-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('夏日记录')
    const kv = readKv()
    expect(kv[JOURNAL_KEY]).toHaveLength(1)
    expect(kv[JOURNAL_KEY][0].title).toBe('夏日记录')
  })

  it('删除日志', async () => {
    const wrapper = await mountPanel({
      [JOURNAL_KEY]: [entry({ title: '待删日志' })],
    })
    expect(wrapper.text()).toContain('待删日志')
    await wrapper.find('button.jn-entry-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待删日志')
  })

  it('展示情绪分析', async () => {
    // 情绪分析块按当前季节过滤：动态取当前季节种入，避免随系统日期漂移
    const { getCurrentSeason } = await import('../../modules/seasonal/seasonal-journal')
    const season = getCurrentSeason()
    const wrapper = await mountPanel({
      [JOURNAL_KEY]: [
        entry({ season, mood: 'reflective' }),
        entry({ season, mood: 'peaceful' }),
        entry({ season, mood: 'reflective' }),
      ],
    })
    expect(wrapper.text()).toContain('情绪趋势')
    expect(wrapper.text()).toContain('本季情绪分析')
    expect(wrapper.text()).toContain('主导情绪')
  })
})
