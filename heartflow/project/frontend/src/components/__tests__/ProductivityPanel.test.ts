import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeEntry(overrides: Record<string, any> = {}, dayOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - dayOffset)
  return {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'journal',
    title: '日志记录',
    content: '今天完成了一个阶段性目标，收获很大。',
    mood: 'calm',
    tags: ['工作'],
    sessionIds: ['s1'],
    roomId: 'workhub',
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
    ...overrides,
  }
}

async function mountPanel(entries: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {
      'worklog:entries': entries,
    },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ProductivityPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

describe('ProductivityPanel 生产力洞察', () => {
  it('空状态提示尚无日志', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有工作日志')
    expect(wrapper.find('.pp-score').exists()).toBe(false)
  })

  it('有日志时渲染效率评分与 5 个维度', async () => {
    const entries = Array.from({ length: 30 }, (_, i) => makeEntry({}, i))
    const wrapper = await mountPanel(entries)
    expect(wrapper.find('.pp-score').exists()).toBe(true)
    expect(wrapper.find('.pp-score-ring b').text()).toMatch(/^\d+$/)
    expect(wrapper.findAll('.pp-dim').length).toBe(5)
    expect(wrapper.find('.pp-comment').exists()).toBe(true)
  })

  it('渲染近 30 日趋势条形并给出趋势方向', async () => {
    const entries = Array.from({ length: 30 }, (_, i) => makeEntry({}, i))
    const wrapper = await mountPanel(entries)
    expect(wrapper.findAll('.pp-bar-wrap').length).toBe(31)
    expect(wrapper.find('.pp-dir').exists()).toBe(true)
  })

  it('有充足数据时渲染未来一周 7 天预测', async () => {
    const entries = Array.from({ length: 30 }, (_, i) => makeEntry({}, i))
    const wrapper = await mountPanel(entries)
    const preds = wrapper.findAll('.pp-pred')
    expect(preds.length).toBe(7)
    preds.forEach(p => expect(p.find('.pp-pred-label').exists()).toBe(true))
  })

  it('低频记录会触发一致性智能建议', async () => {
    // 仅 2 天含记录 -> consistency 得分很低，触发「建立每日记录习惯」高优先级建议
    const entries = [
      makeEntry({ createdAt: new Date().toISOString() }),
      makeEntry({ title: '前一天', createdAt: new Date(Date.now() - 86400000).toISOString() }),
    ]
    const wrapper = await mountPanel(entries)
    const sugs = wrapper.findAll('.pp-sug')
    expect(sugs.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('智能建议')
    // 高优先级建议应带暖金边
    expect(wrapper.find('.pp-sug.pr-high').exists()).toBe(true)
  })
})