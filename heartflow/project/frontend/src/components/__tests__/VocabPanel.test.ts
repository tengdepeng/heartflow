// ============================================================
// 知微阁 · 词书背单词面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BOOKS_KEY = 'hf:vocab_books'

function word(overrides: Record<string, any> = {}) {
  return {
    id: `vw_${Math.random().toString(36).slice(2, 8)}`,
    term: 'serendipity',
    definition: '意外发现珍宝的运气',
    example: '',
    phonetic: '',
    status: 'new',
    reviewCount: 0,
    wrongCount: 0,
    addedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

function book(overrides: Record<string, any> = {}) {
  return {
    id: `vb_${Math.random().toString(36).slice(2, 8)}`,
    name: '雅思核心',
    description: '',
    words: [],
    createdAt: '2026-08-20T08:00:00.000Z',
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
  const mod = await import('../VocabPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('VocabPanel 词书背单词', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('词书背单词')
    expect(wrapper.text()).toContain('学习总览')
    expect(wrapper.text()).toContain('还没有词书')
  })

  it('展示词书统计', async () => {
    const wrapper = await mountPanel({
      [BOOKS_KEY]: [
        book({ words: [word({ status: 'mastered' }), word({ status: 'learning' }), word()] }),
      ],
    })
    expect(wrapper.text()).toContain('雅思核心')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('33%')
  })

  it('新建词书并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input.vb-input').setValue('考研词汇')
    await wrapper.find('button.vb-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('考研词汇')
    const kv = readKv()
    expect(kv[BOOKS_KEY]).toHaveLength(1)
    expect(kv[BOOKS_KEY][0].name).toBe('考研词汇')
  })

  it('添加单词到词书', async () => {
    const wrapper = await mountPanel({
      [BOOKS_KEY]: [book()],
    })
    const addBlock = wrapper.findAll('.vb-block')[2]
    const inputs = addBlock.findAll('input.vb-input')
    await inputs[0].setValue('ephemeral')
    await inputs[2].setValue('短暂的')
    await addBlock.find('button.vb-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('ephemeral')
    expect(wrapper.text()).toContain('短暂的')
  })

  it('复习推进状态', async () => {
    const wrapper = await mountPanel({
      [BOOKS_KEY]: [book({ words: [word({ term: 'resilience' })] })],
    })
    expect(wrapper.text()).toContain('新词')
    const knowBtn = wrapper.findAll('button.vb-btn-know')
    await knowBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('巩固中')
  })

  it('删除词书', async () => {
    const wrapper = await mountPanel({
      [BOOKS_KEY]: [book({ name: '待删词书' })],
    })
    expect(wrapper.text()).toContain('待删词书')
    await wrapper.find('button.vb-btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待删词书')
  })
})
