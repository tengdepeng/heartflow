// ============================================================
// 空间自定义 · 布局与快照面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BASE = 'hf:customization:advanced'
const THEMES_KEY = `${BASE}:themes`
const SNAPSHOTS_KEY = `${BASE}:snapshots`

function snapshot(overrides: Record<string, any> = {}) {
  return {
    id: `snap_${Math.random().toString(36).slice(2, 8)}`,
    name: '初版布局',
    description: '',
    layoutId: 'layout_0',
    themeId: '',
    componentStates: { sidebarOpen: true },
    zoneConfigs: {},
    tags: [],
    createdAt: '2026-08-01T08:00:00.000Z',
    isMilestone: false,
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
  const mod = await import('../WorkspaceAdvancedPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('WorkspaceAdvancedPanel 布局与快照', () => {
  it('展示内置布局模板', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('布局与快照')
    expect(wrapper.text()).toContain('仪表盘视图')
    expect(wrapper.text()).toContain('专注模式')
  })

  it('从预设色板创建深度主题并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input.wa-input').setValue('暖阳主题')
    await wrapper.findAll('button.wa-btn-primary').find(b => b.text() === '创建')!.trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    const themes = JSON.parse(kv[THEMES_KEY])
    expect(themes).toHaveLength(1)
    expect(themes[0].name).toBe('暖阳主题')
    expect(wrapper.text()).toContain('暖阳主题')
  })

  it('创建快照并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.findAll('input.wa-input')[1].setValue('里程碑快照')
    await wrapper.findAll('button.wa-btn-primary').find(b => b.text() === '存档')!.trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    const snaps = JSON.parse(kv[SNAPSHOTS_KEY])
    expect(snaps).toHaveLength(1)
    expect(snaps[0].name).toBe('里程碑快照')
  })

  it('展示已有快照与里程碑标记', async () => {
    const wrapper = await mountPanel({
      [SNAPSHOTS_KEY]: JSON.stringify([
        snapshot({ name: '定稿' }),
        snapshot({ name: '里程碑', isMilestone: true }),
      ]),
    })
    expect(wrapper.text()).toContain('定稿')
    expect(wrapper.text()).toContain('里程碑')
  })

  it('对比两个快照展示差异', async () => {
    const wrapper = await mountPanel({
      [SNAPSHOTS_KEY]: JSON.stringify([
        snapshot({ id: 'snap_a', name: '快照A', componentStates: { sidebarOpen: true } }),
        snapshot({ id: 'snap_b', name: '快照B', componentStates: { sidebarOpen: false } }),
      ]),
    })
    const selects = wrapper.findAll('select.wa-select')
    await selects[1].setValue('snap_a')
    await selects[2].setValue('snap_b')
    await wrapper.findAll('button.wa-btn-primary').find(b => b.text() === '对比')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('处差异')
  })
})
