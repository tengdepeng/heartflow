// ============================================================
// 输出管理 · 版本快照面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const SNAPSHOTS_KEY = 'hf:output_snapshots'
const RECORDS_KEY = 'hf:output_records'

function record(overrides: Record<string, any> = {}) {
  return {
    id: `or_${Math.random().toString(36).slice(2, 8)}`,
    type: 'note',
    content: '一篇输出记录',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    roomSource: '思绪书房',
    status: 'published',
    ...overrides,
  }
}

function snapshot(overrides: Record<string, any> = {}) {
  return {
    id: `snap_${Math.random().toString(36).slice(2, 8)}`,
    label: '发布前备份',
    createdAt: '2026-08-20T08:00:00.000Z',
    recordCount: 1,
    records: [record()],
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, records: any[] = []) {
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
  const mod = await import('../OutputSnapshotsPanel.vue')
  const wrapper = mount(mod.default, { props: { records } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('OutputSnapshotsPanel 版本快照', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.text()).toContain('版本快照')
    expect(wrapper.text()).toContain('快照概览')
    expect(wrapper.text()).toContain('暂无可备份内容')
  })

  it('展示已有快照', async () => {
    const wrapper = await mountPanel({
      [SNAPSHOTS_KEY]: [snapshot({ label: '发布前备份' })],
    })
    expect(wrapper.text()).toContain('发布前备份')
    expect(wrapper.text()).toContain('1 条')
  })

  it('创建快照并持久化', async () => {
    const wrapper = await mountPanel({}, [record()])
    await wrapper.find('input.os-input').setValue('上线前')
    await wrapper.find('button.os-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('上线前')
    const kv = readKv()
    expect(kv[SNAPSHOTS_KEY]).toHaveLength(1)
    expect(kv[SNAPSHOTS_KEY][0].label).toBe('上线前')
    expect(kv[SNAPSHOTS_KEY][0].recordCount).toBe(1)
  })

  it('删除快照', async () => {
    const wrapper = await mountPanel({
      [SNAPSHOTS_KEY]: [snapshot({ label: '待删快照' })],
    })
    expect(wrapper.text()).toContain('待删快照')
    await wrapper.find('button.os-snap-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待删快照')
  })

  it('恢复快照写回记录并触发事件', async () => {
    const wrapper = await mountPanel({
      [SNAPSHOTS_KEY]: [snapshot({ label: '恢复点', records: [record({ content: '快照里的内容' })] })],
    }, [record({ content: '当前内容' })])
    ;(globalThis as any).confirm = () => true
    await wrapper.find('button.os-btn-sm').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[RECORDS_KEY]).toHaveLength(1)
    expect(kv[RECORDS_KEY][0].content).toBe('快照里的内容')
    expect(wrapper.emitted('restored')).toBeTruthy()
  })
})
