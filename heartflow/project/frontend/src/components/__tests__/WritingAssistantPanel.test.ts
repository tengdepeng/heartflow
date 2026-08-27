/// <reference types="vitest/globals" />
// ============================================================
// 字镜阁 · 写作辅助面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const PROMPTS_KEY = 'hf:word_mirror:writing_prompts'
const RECORDS_KEY = 'hf:word_mirror:writing_records'

function word(overrides: Record<string, any> = {}) {
  return {
    id: `w_${Math.random().toString(36).slice(2, 8)}`,
    word: '春天',
    definition: '春季',
    proficiency: 2,
    favorite: false,
    tags: [],
    createdAt: '2026-08-20T08:00:00.000Z',
    reviewCount: 0,
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, words: any[] = []) {
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
  const mod = await import('../WritingAssistantPanel.vue')
  const wrapper = mount(mod.default, { props: { words } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('WritingAssistantPanel 写作辅助', () => {
  it('空状态展示今日提示与零统计', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.text()).toContain('写作辅助')
    expect(wrapper.text()).toContain('今日提示')
    expect(wrapper.text()).toContain('写作概览')
    // 默认提示会被加载（按日期取其一）
    expect(wrapper.text()).toMatch(/今日三件事|感恩记录/)
  })

  it('记录写作并持久化', async () => {
    const wrapper = await mountPanel({}, [word()])
    const textarea = wrapper.find('textarea.wa-textarea')
    await textarea.setValue('春天，万物复苏。')
    await wrapper.findAll('button.wa-btn').find(b => b.text() === '记录')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('写作记录')
    const kv = readKv()
    expect(kv[RECORDS_KEY]).toHaveLength(1)
    expect(kv[RECORDS_KEY][0].content).toBe('春天，万物复苏。')
    expect(kv[RECORDS_KEY][0].usedWords).toContain('春天')
  })

  it('添加自定义提示并持久化', async () => {
    const wrapper = await mountPanel({}, [])
    const titleInput = wrapper.findAll('input.wa-input')[1]
    await titleInput.setValue('我的自定义提示')
    await wrapper.vm.$nextTick()
    const descInput = wrapper.findAll('input.wa-input')[2]
    await descInput.setValue('一段自定义描述')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.wa-btn').find(b => b.text() === '添加提示')!.trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[PROMPTS_KEY].some((p: any) => p.title === '我的自定义提示')).toBe(true)
  })

  it('展示已有写作记录', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [{
        id: 'wr_1',
        content: '昨天写下的一段文字',
        wordCount: 8,
        usedWords: ['春天'],
        newWords: ['复苏'],
        style: null,
        createdAt: '2026-08-20T08:00:00.000Z',
        duration: 5,
      }],
    }, [])
    expect(wrapper.text()).toContain('昨天写下的一段文字')
    expect(wrapper.text()).toContain('8 字')
  })
})
