// ============================================================
// 思绪书房 · 信笺面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../LettersPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LettersPanel 信笺', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('信笺')
    expect(wrapper.text()).toContain('还没有信笺')
  })

  it('导入信束并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.lt-name').setValue('老友')
    await wrapper.find('.lt-textarea').setValue('2026-08-01 20:00|我|今天过得怎么样？\n2026-08-01 20:05|老友|挺好的，你呢？')
    await wrapper.find('.lt-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('老友')
    await wrapper.find('.lt-expand').trigger('click')
    expect(wrapper.text()).toContain('今天过得怎么样')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:study_letters'].length).toBe(1)
    expect(saved.kvStore['hf:study_letters'][0].correspondent).toBe('老友')
  })

  it('展示预置信束并检索', async () => {
    const wrapper = await mountPanel({
      'hf:study_letters': [
        {
          id: 'letter_1',
          correspondent: '老友',
          importedAt: '2026-08-01T12:00:00.000Z',
          messages: [
            { ts: '2026-08-01 20:00', from: '我', text: '今天过得怎么样？' },
            { ts: '2026-08-01 20:05', from: '老友', text: '挺好的' },
          ],
        },
        {
          id: 'letter_2',
          correspondent: '同事',
          importedAt: '2026-08-02T12:00:00.000Z',
          messages: [
            { ts: '2026-08-02 09:00', from: '同事', text: '项目进度如何？' },
          ],
        },
      ],
    })
    expect(wrapper.text()).toContain('老友')
    expect(wrapper.text()).toContain('同事')
    await wrapper.find('.lt-search').setValue('老友')
    expect(wrapper.text()).toContain('老友')
    expect(wrapper.text()).not.toContain('同事')
  })

  it('删除信束', async () => {
    const wrapper = await mountPanel({
      'hf:study_letters': [
        {
          id: 'letter_1',
          correspondent: '老友',
          importedAt: '2026-08-01T12:00:00.000Z',
          messages: [{ ts: '2026-08-01 20:00', from: '我', text: '你好' }],
        },
      ],
    })
    await wrapper.find('.lt-btn-danger').trigger('click')
    expect(wrapper.text()).toContain('还没有信笺')
  })
})
