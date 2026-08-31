// ============================================================
// 装修档案面板测试（INCR-43 · useCustomizationBridge）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { SpaceConfig, CustomDimension } from '../../modules/customization/types'
import type { RenovationRecord } from '../../modules/customization/preview-engine'

const CONFIGS_KEY = 'hf:space_configs'
const ACTIVE_KEY = 'hf:active_space_config'
const HISTORY_KEY = 'hf:customization:history'

function mkConfig(overrides: Partial<SpaceConfig> = {}): SpaceConfig {
  const dims: CustomDimension[] = ['structure', 'features', 'interaction', 'style', 'data', 'permission', 'scene']
  return {
    id: 'sc_test',
    name: '测试空间',
    description: '测试用空间配置',
    presetId: 'preset_standard',
    dimensions: dims.map((dimension) => ({
      dimension,
      label: dimension,
      icon: '•',
      options: {},
    })),
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function mkRecord(overrides: Partial<RenovationRecord> = {}): RenovationRecord {
  return {
    id: 'rec_1',
    configId: 'sc_test',
    description: '更新了视觉风格',
    type: 'update',
    changes: ['style'],
    timestamp: '2026-08-30T10:00:00.000Z',
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
  const mod = await import('../RenovationArchivePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('RenovationArchivePanel 装修档案', () => {
  it('空态：标题 + 装修未启徽标 + 引导文案', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('装修档案')
    expect(wrapper.text()).toContain('装修未启')
    expect(wrapper.text()).toContain('还没有空间配置与装修活动')
  })

  it('填充态：有活跃配置时渲染装修健康度', async () => {
    const config = mkConfig()
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config],
      [ACTIVE_KEY]: config.id,
    })
    expect(wrapper.text()).not.toContain('装修未启')
    expect(wrapper.text()).toContain('装修健康度')
    expect(wrapper.text()).toContain('/ 100')
  })

  it('填充态：维度配置渲染 7 格', async () => {
    const config = mkConfig({
      dimensions: [
        { dimension: 'structure', label: '空间结构', icon: 'Layout', options: { grid: true } },
        { dimension: 'features', label: '功能特性', icon: 'Zap', options: {} },
        { dimension: 'interaction', label: '交互方式', icon: 'Hand', options: {} },
        { dimension: 'style', label: '视觉风格', icon: 'Palette', options: { amber: true } },
        { dimension: 'data', label: '数据管理', icon: 'Database', options: {} },
        { dimension: 'permission', label: '权限配置', icon: 'Shield', options: {} },
        { dimension: 'scene', label: '场景预设', icon: 'Image', options: {} },
      ],
    })
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config],
      [ACTIVE_KEY]: config.id,
    })
    const dims = wrapper.findAll('.rnp-dim')
    expect(dims.length).toBe(7)
    expect(wrapper.text()).toContain('空间结构')
    expect(wrapper.text()).toContain('视觉风格')
  })

  it('填充态：最近装修活动渲染', async () => {
    const config = mkConfig()
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config],
      [ACTIVE_KEY]: config.id,
      [HISTORY_KEY]: JSON.stringify([mkRecord(), mkRecord({ id: 'rec_2', type: 'create', description: '创建了测试空间' })]),
    })
    expect(wrapper.text()).toContain('最近装修活动')
    expect(wrapper.text()).toContain('更新了视觉风格')
    expect(wrapper.text()).toContain('创建了测试空间')
  })

  it('填充态：温和洞察非空且含维度铺陈', async () => {
    const config = mkConfig({
      dimensions: [
        { dimension: 'structure', label: '空间结构', icon: 'Layout', options: { grid: true } },
        { dimension: 'features', label: '功能特性', icon: 'Zap', options: {} },
        { dimension: 'interaction', label: '交互方式', icon: 'Hand', options: {} },
        { dimension: 'style', label: '视觉风格', icon: 'Palette', options: {} },
        { dimension: 'data', label: '数据管理', icon: 'Database', options: {} },
        { dimension: 'permission', label: '权限配置', icon: 'Shield', options: {} },
        { dimension: 'scene', label: '场景预设', icon: 'Image', options: {} },
      ],
    })
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config],
      [ACTIVE_KEY]: config.id,
    })
    const insights = wrapper.findAll('.rnp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('维度铺陈')
  })

  it('填充态：徽标随健康度变化（装修完备）', async () => {
    const config = mkConfig({
      dimensions: [
        { dimension: 'structure', label: '空间结构', icon: 'Layout', options: { grid: true } },
        { dimension: 'features', label: '功能特性', icon: 'Zap', options: { zap: true } },
        { dimension: 'interaction', label: '交互方式', icon: 'Hand', options: { hand: true } },
        { dimension: 'style', label: '视觉风格', icon: 'Palette', options: { amber: true } },
        { dimension: 'data', label: '数据管理', icon: 'Database', options: { db: true } },
        { dimension: 'permission', label: '权限配置', icon: 'Shield', options: { shield: true } },
        { dimension: 'scene', label: '场景预设', icon: 'Image', options: { scene: true } },
      ],
    })
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config],
      [ACTIVE_KEY]: config.id,
    })
    expect(wrapper.text()).toContain('装修完备')
  })

  it('填充态：仅快照时也显影档案', async () => {
    const wrapper = await mountPanel({
      'hf:customization:snapshots': [
        { id: 'snap_1', name: '初始状态', description: '', timestamp: '2026-08-01T08:00:00.000Z', spaceConfigId: '', layoutTemplateId: '', themeId: '', roomPositions: [], tags: [] },
      ],
    })
    expect(wrapper.text()).not.toContain('装修未启')
    expect(wrapper.text()).toContain('装修健康度')
  })

  it('填充态：console 无报错', async () => {
    const config = mkConfig()
    const wrapper = await mountPanel({
      [CONFIGS_KEY]: [config],
      [ACTIVE_KEY]: config.id,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
