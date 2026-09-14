// ============================================================
// 思绪书房 · 版本历史面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { Note } from '../../types'

const sampleNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note_1',
  title: '测试笔记',
  content: '第一版内容',
  tags: ['vue'],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
})

async function mountPanel(
  kvStore: Record<string, any> = {},
  notes: Note[] = [sampleNote()],
) {
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
  const mod = await import('../VersionHistoryPanel.vue')
  const wrapper = mount(mod.default, { props: { notes } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function seedVersion(kvStore: Record<string, any>, noteId: string, n: number) {
  const versions = Array.from({ length: n }, (_, i) => ({
    id: `ver_${i + 1}`,
    noteId,
    versionNumber: i + 1,
    title: `版本标题 ${i + 1}`,
    content: `第 ${i + 1} 版内容\n第二行`,
    tags: ['vue'],
    createdAt: new Date(2026, 7, 1, 10 + i).toISOString(),
    description: i === 0 ? '初始版本' : `手动保存 (v${i + 1})，变更 10 字符`,
    autoSaved: false,
    isMilestone: i === 1,
    milestoneLabel: i === 1 ? '重要节点' : undefined,
    changeSize: 10,
  }))
  kvStore['hf:note_versions'] = versions
}

describe('VersionHistoryPanel 版本历史', () => {
  it('渲染标题与概览', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('版本历史')
    expect(wrapper.text()).toContain('自动保存')
    expect(wrapper.text()).toContain('总版本')
    expect(wrapper.text()).toContain('里程碑')
  })

  it('空态显示引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('选择一篇笔记查看版本')
  })

  it('选择笔记后显示版本列表', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 3)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    expect(wrapper.findAll('.vhp-version').length).toBe(3)
    expect(wrapper.text()).toContain('v1')
    expect(wrapper.text()).toContain('v3')
  })

  it('无版本笔记显示空提示', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.vhp-select').setValue('note_1')
    expect(wrapper.text()).toContain('这篇笔记还没有版本')
  })

  it('里程碑版本带徽标', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 3)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    expect(wrapper.find('.vhp-badge').exists()).toBe(true)
    expect(wrapper.text()).toContain('重要节点')
  })

  it('查看差异展示变更行', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 2)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    const diffBtns = wrapper.findAll('.vhp-version-actions .vhp-btn')
    const diffBtn = diffBtns.find(b => b.text().includes('查看差异'))
    await diffBtn!.trigger('click')
    expect(wrapper.find('.vhp-diff').exists()).toBe(true)
    expect(wrapper.text()).toContain('相似度')
  })

  it('标记里程碑', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 1)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    const markBtn = wrapper.findAll('.vhp-version-actions .vhp-btn').find(b => b.text().includes('标记里程碑'))
    await markBtn!.trigger('click')
    expect(wrapper.find('.vhp-badge').exists()).toBe(true)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:note_versions'][0].isMilestone).toBe(true)
  })

  it('存为里程碑写入新版本', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 1)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    await wrapper.find('.vhp-input').setValue('发布版')
    const saveBtn = wrapper.findAll('.vhp-head-actions .vhp-btn').find(b => b.text().includes('存为里程碑'))
    await saveBtn!.trigger('click')
    expect(wrapper.findAll('.vhp-version').length).toBe(2)
    expect(wrapper.text()).toContain('发布版')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:note_versions'].length).toBe(2)
  })

  it('恢复版本发出 restore 事件', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 2)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    const restoreBtn = wrapper.findAll('.vhp-version-actions .vhp-btn').find(b => b.text().includes('恢复此版本'))
    await restoreBtn!.trigger('click')
    const emitted = wrapper.emitted('restore')
    expect(emitted).toBeTruthy()
    const payload = emitted![0][0] as { noteId: string; snapshot: { title: string; content: string; tags: string[] } }
    expect(payload.noteId).toBe('note_1')
    expect(payload.snapshot.title).toBe('版本标题 1')
  })

  it('删除版本', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 2)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    expect(wrapper.findAll('.vhp-version').length).toBe(2)
    const delBtn = wrapper.findAll('.vhp-version-actions .vhp-btn').find(b => b.text().includes('删除'))
    await delBtn!.trigger('click')
    expect(wrapper.findAll('.vhp-version').length).toBe(1)
  })

  it('清空本笔记版本', async () => {
    const kvStore: Record<string, any> = {}
    seedVersion(kvStore, 'note_1', 3)
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-select').setValue('note_1')
    const clearBtn = wrapper.findAll('.vhp-head-actions .vhp-btn').find(b => b.text().includes('清空'))
    await clearBtn!.trigger('click')
    expect(wrapper.text()).toContain('这篇笔记还没有版本')
  })

  it('配置面板可展开并更新', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.vhp-config-toggle').trigger('click')
    expect(wrapper.find('.vhp-config-body').exists()).toBe(true)
    expect(wrapper.text()).toContain('每篇最大版本数')
    const input = wrapper.find('.vhp-config-row input[type="number"]')
    await input.setValue('30')
    await input.trigger('change')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:note_version_config'].maxVersionsPerNote).toBe(30)
  })

  it('恢复默认设置', async () => {
    const kvStore: Record<string, any> = {}
    kvStore['hf:note_version_config'] = { maxVersionsPerNote: 5 }
    const wrapper = await mountPanel(kvStore)
    await wrapper.find('.vhp-config-toggle').trigger('click')
    const resetBtn = wrapper.findAll('.vhp-config-body .vhp-btn').find(b => b.text().includes('恢复默认设置'))
    await resetBtn!.trigger('click')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:note_version_config'].maxVersionsPerNote).toBe(50)
  })
})
