// ============================================================
// 思绪书房 · 通话磁带面板测试
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
  const mod = await import('../TapesPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TapesPanel 通话磁带', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('通话磁带')
    expect(wrapper.text()).toContain('还没有磁带')
  })

  it('导入磁带并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tp-title').setValue('和老友的通话')
    await wrapper.find('.tp-participants').setValue('我, 老友')
    await wrapper.find('.tp-duration').setValue(125)
    await wrapper.find('.tp-textarea').setValue('聊了最近的项目进展')
    await wrapper.find('.tp-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('和老友的通话')
    expect(wrapper.text()).toContain('老友')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:study_tapes'].length).toBe(1)
    expect(saved.kvStore['hf:study_tapes'][0].title).toBe('和老友的通话')
  })

  it('展示预置磁带与时长', async () => {
    const wrapper = await mountPanel({
      'hf:study_tapes': [
        {
          id: 'tape_1',
          title: '和老友的通话',
          participants: ['我', '老友'],
          durationSeconds: 125,
          importDate: '2026-08-20T08:00:00.000Z',
          transcript: '聊了最近的项目进展',
        },
      ],
    })
    expect(wrapper.text()).toContain('和老友的通话')
    expect(wrapper.text()).toContain('2′05″')
  })

  it('删除磁带', async () => {
    const wrapper = await mountPanel({
      'hf:study_tapes': [
        {
          id: 'tape_1',
          title: '和老友的通话',
          participants: ['老友'],
          durationSeconds: 60,
          importDate: '2026-08-20T08:00:00.000Z',
          transcript: '',
        },
      ],
    })
    await wrapper.find('.tp-btn-danger').trigger('click')
    expect(wrapper.text()).toContain('还没有磁带')
  })
})
