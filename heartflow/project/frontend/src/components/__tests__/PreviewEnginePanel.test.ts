// ============================================================
// 空间自定义 · 预览引擎面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const CONFIGS_KEY = 'hf:space_configs'
const HISTORY_KEY = 'hf:customization:history'
const BATCH_OPS_KEY = 'hf:customization:batch-ops'

function config(overrides: Record<string, any> = {}) {
  return {
    id: `space_${Math.random().toString(36).slice(2, 8)}`,
    name: '我的空间',
    description: '',
    presetId: '',
    dimensions: [],
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function historyRecord(overrides: Record<string, any> = {}) {
  return {
    id: `hist_${Math.random().toString(36).slice(2, 6)}`,
    configId: 'space_1',
    description: '应用预览修改',
    type: 'update',
    changes: ['名称已更新'],
    timestamp: '2026-08-01T08:00:00.000Z',
    operator: 'user',
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
  const mod = await import('../PreviewEnginePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('PreviewEnginePanel 预览引擎', () => {
  it('空状态显示无历史且撤销不可用', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('预览引擎')
    expect(wrapper.text()).toContain('暂无装修历史')
    const undo = wrapper.findAll('button.pe-btn').find(b => b.text().startsWith('↩'))
    expect((undo!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('展示装修历史', async () => {
    const wrapper = await mountPanel({
      [HISTORY_KEY]: JSON.stringify([historyRecord({ description: '调整了配色' })]),
    })
    expect(wrapper.text()).toContain('调整了配色')
    expect(wrapper.text()).toContain('装修历史')
  })

  it('创建批量操作并持久化', async () => {
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config({ id: 'space_a', name: '空间A' }), config({ id: 'space_b', name: '空间B' })],
    })
    await wrapper.findAll('button.pe-btn-primary').find(b => b.text() === '创建')!.trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    const ops = JSON.parse(kv[BATCH_OPS_KEY])
    expect(ops).toHaveLength(1)
    expect(ops[0].type).toBe('update')
    expect(wrapper.text()).toContain('更新')
  })

  it('开始预览后展示预览中状态', async () => {
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config({ id: 'space_a', name: '空间A' })],
    })
    await wrapper.find('select.pe-select').setValue('space_a')
    await wrapper.findAll('button.pe-btn-primary').find(b => b.text() === '开始预览')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('预览中')
    expect(wrapper.text()).toContain('空间A')
  })

  it('执行批量操作后状态更新', async () => {
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config({ id: 'space_a', name: '空间A' })],
    })
    await wrapper.findAll('button.pe-btn-primary').find(b => b.text() === '创建')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.pe-btn').find(b => b.text() === '执行')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('成功 1')
  })
})
