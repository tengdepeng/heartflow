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

  // ============================================================
  // INCR-451：接线 study/tapes 的 recentTapes（近 30 天导入数）——
  // 引擎早已算好，但面板概览 4 格（磁带/总时长/参与人/转录字数）独缺此项。
  // ============================================================
  it('INCR-451 概览展示「近30天新增」计数', async () => {
    const now = Date.now()
    const day = 86_400_000
    const iso = (daysAgo: number) => new Date(now - daysAgo * day).toISOString()
    const wrapper = await mountPanel({
      'hf:study_tapes': [
        { id: 't1', title: '近期A', participants: ['我'], durationSeconds: 60, importDate: iso(3), transcript: '' },
        { id: 't2', title: '近期B', participants: ['我'], durationSeconds: 60, importDate: iso(20), transcript: '' },
        { id: 't3', title: '陈旧C', participants: ['我'], durationSeconds: 60, importDate: iso(90), transcript: '' },
      ],
    })
    const stat = wrapper.findAll('.tp-stat').find((s) => s.text().includes('近30天新增'))
    expect(stat).toBeTruthy()
    // 3 条中 2 条在 30 天内
    expect(stat!.find('.tp-stat-num').text()).toBe('2')
    // 磁带总数仍是 3（不受近 30 天过滤影响）
    const total = wrapper.findAll('.tp-stat').find((s) => s.text().includes('磁带') && !s.text().includes('近30天'))
    expect(total!.find('.tp-stat-num').text()).toBe('3')
  })
})
