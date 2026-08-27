// ============================================================
// 空间自定义 · 高级定制面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const THEMES_KEY = 'hf:customization:themes'
const SNAPSHOTS_KEY = 'hf:customization:snapshots'

function theme(overrides: Record<string, any> = {}) {
  return {
    id: `theme_${Math.random().toString(36).slice(2, 8)}`,
    name: '青瓷',
    primaryColor: '#3b82f6',
    secondaryColor: '#f97316',
    backgroundColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#1e293b',
    textSecondaryColor: '#64748b',
    borderColor: '#e2e8f0',
    shadowColor: 'rgba(0,0,0,0.1)',
    materialPreset: { id: 'mat-clear-glass', name: '清透玻璃', type: 'glass' },
    animationPreset: { id: 'anim-gentle', name: '轻柔', enterAnimation: 'fadeIn' },
    fontFamily: 'Noto Sans SC',
    fontSize: 15,
    isDark: false,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function snapshot(overrides: Record<string, any> = {}) {
  return {
    id: `snap_${Math.random().toString(36).slice(2, 8)}`,
    name: '初始状态',
    description: '',
    themeId: '',
    layoutId: '',
    createdAt: '2026-08-01T08:00:00.000Z',
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
  const mod = await import('../CustomizationAdvancedPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('CustomizationAdvancedPanel 高级定制', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('高级定制')
    expect(wrapper.text()).toContain('还没有主题')
  })

  it('展示已有主题并激活', async () => {
    const wrapper = await mountPanel({
      [THEMES_KEY]: JSON.stringify([theme({ name: '青瓷' })]),
    })
    expect(wrapper.text()).toContain('青瓷')
    await wrapper.findAll('button.ca-mini').find(b => b.text() === '启用')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('青瓷')
  })

  it('创建主题并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input.ca-input').setValue('苔绿')
    await wrapper.findAll('button.ca-btn-primary').find(b => b.text() === '创建')!.trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    const themes = JSON.parse(kv[THEMES_KEY])
    expect(themes).toHaveLength(1)
    expect(themes[0].name).toBe('苔绿')
    expect(wrapper.text()).toContain('苔绿')
  })

  it('创建空间快照并持久化', async () => {
    const wrapper = await mountPanel({
      [THEMES_KEY]: JSON.stringify([theme({ name: '青瓷' })]),
    })
    await wrapper.findAll('input.ca-input')[1].setValue('定稿快照')
    await wrapper.findAll('button.ca-btn-primary').find(b => b.text() === '存档')!.trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    const snaps = JSON.parse(kv[SNAPSHOTS_KEY])
    expect(snaps).toHaveLength(1)
    expect(snaps[0].name).toBe('定稿快照')
  })

  it('展示已有快照', async () => {
    const wrapper = await mountPanel({
      [SNAPSHOTS_KEY]: JSON.stringify([snapshot({ name: '初版' })]),
    })
    expect(wrapper.text()).toContain('初版')
  })
})
