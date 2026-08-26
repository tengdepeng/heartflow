// ============================================================
// 应用空间自定义引擎 · 测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- mock storage 引擎 ----

const { mockStore, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    mockStore: store,
    mockGetKV: vi.fn((key: string, def: any) => store[key] ?? def),
    mockSetKV: vi.fn((key: string, val: any) => { store[key] = val }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: mockGetKV,
    setKV: mockSetKV,
  },
}))

// ---- 被测模块 ----

import { DIMENSION_META } from '../types'
import type { CustomDimension } from '../types'
import { SPACE_PRESETS, getPresetById, applyPreset } from '../presets'
import {
  createSpaceConfig,
  getSpaceConfigs,
  setActiveConfigId,
  getActiveConfigId,
  getActiveConfig,
  deleteSpaceConfig,
  duplicateSpaceConfig,
} from '../engine'

// ---- helper ----

const VALID_DIMENSIONS: CustomDimension[] = [
  'structure', 'features', 'interaction', 'style', 'data', 'permission', 'scene',
]

// ---- tests ----

describe('customization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空 mock store
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  // ============================================
  // 1. DIMENSION_META 包含 7 个维度
  // ============================================
  it('DIMENSION_META 包含 7 个维度', () => {
    const keys = Object.keys(DIMENSION_META) as CustomDimension[]
    expect(keys.length).toBe(7)
    // 验证每个维度都有 label / icon / desc
    for (const key of keys) {
      const meta = DIMENSION_META[key]
      expect(meta).toBeDefined()
      expect(typeof meta.label).toBe('string')
      expect(meta.label.length).toBeGreaterThan(0)
      expect(typeof meta.icon).toBe('string')
      expect(meta.icon.length).toBeGreaterThan(0)
      expect(typeof meta.desc).toBe('string')
      expect(meta.desc.length).toBeGreaterThan(0)
    }
    // 验证所有维度标识都在内
    for (const d of VALID_DIMENSIONS) {
      expect(DIMENSION_META[d]).toBeDefined()
    }
  })

  // ============================================
  // 2. SPACE_PRESETS 包含 8 个预置模板
  // ============================================
  it('SPACE_PRESETS 包含 8 个预置模板', () => {
    expect(SPACE_PRESETS.length).toBe(8)
    // 每个预设应有完整字段
    for (const preset of SPACE_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(preset.icon).toBeTruthy()
      expect(Array.isArray(preset.dimensions)).toBe(true)
      // 每个预设应有 7 个维度配置
      expect(preset.dimensions.length).toBe(7)
    }
  })

  // ============================================
  // 3. createSpaceConfig 创建配置
  // ============================================
  it('createSpaceConfig 创建配置', () => {
    const config = createSpaceConfig({
      name: '我的空间',
      description: '我的自定义空间',
      presetId: 'standard',
      dimensions: [],
    })

    expect(config).toBeDefined()
    expect(config.id).toBeTruthy()
    expect(config.name).toBe('我的空间')
    expect(config.description).toBe('我的自定义空间')
    expect(config.presetId).toBe('standard')
    expect(config.createdAt).toBeTruthy()
    expect(config.updatedAt).toBeTruthy()
    expect(config.createdAt).toBe(config.updatedAt)

    // 验证持久化到 storage
    expect(mockSetKV).toHaveBeenCalledWith('hf:space_configs', expect.any(Array))
    const saved = mockGetKV('hf:space_configs', [])
    expect(saved.length).toBe(1)
    expect(saved[0].name).toBe('我的空间')
  })

  // ============================================
  // 4. setActiveConfigId / getActiveConfigId 读写
  // ============================================
  it('setActiveConfigId / getActiveConfigId 读写', () => {
    // 初始为 null
    expect(getActiveConfigId()).toBeNull()

    // 写入后读取
    setActiveConfigId('config-abc')
    expect(getActiveConfigId()).toBe('config-abc')

    // 覆盖写入
    setActiveConfigId('config-xyz')
    expect(getActiveConfigId()).toBe('config-xyz')

    // 设为 null
    setActiveConfigId(null)
    expect(getActiveConfigId()).toBeNull()
  })

  // ============================================
  // 5. getActiveConfig 返回有效配置
  // ============================================
  it('getActiveConfig 返回有效配置', () => {
    // 先创建一个配置
    const config = createSpaceConfig({
      name: '活跃配置',
      description: '',
      presetId: 'standard',
      dimensions: [],
    })

    // 未设置活跃 ID 时返回 null
    expect(getActiveConfig()).toBeNull()

    // 设置活跃 ID 后返回对应配置
    setActiveConfigId(config.id)
    const active = getActiveConfig()
    expect(active).not.toBeNull()
    expect(active!.id).toBe(config.id)
    expect(active!.name).toBe('活跃配置')

    // 活跃 ID 指向不存在的配置时返回 null
    setActiveConfigId('nonexistent-id')
    expect(getActiveConfig()).toBeNull()
  })

  // ============================================
  // 6. deleteSpaceConfig 删除并清除活跃状态
  // ============================================
  it('deleteSpaceConfig 删除并清除活跃状态', () => {
    const config = createSpaceConfig({
      name: '待删除配置',
      description: '',
      presetId: 'minimal',
      dimensions: [],
    })

    setActiveConfigId(config.id)
    expect(getActiveConfigId()).toBe(config.id)

    // 删除后活跃状态应被清除
    const result = deleteSpaceConfig(config.id)
    expect(result).toBe(true)
    expect(getSpaceConfigs().length).toBe(0)
    expect(getActiveConfigId()).toBeNull()

    // 删除不存在的配置返回 false
    expect(deleteSpaceConfig('nonexistent')).toBe(false)
  })

  // ============================================
  // 7. duplicateSpaceConfig 复制配置
  // ============================================
  it('duplicateSpaceConfig 复制配置', () => {
    const original = createSpaceConfig({
      name: '原始配置',
      description: '原始描述',
      presetId: 'standard',
      dimensions: [
        { dimension: 'structure', label: '空间结构', icon: 'Layout', options: { rooms: ['home'] } },
        { dimension: 'features', label: '功能特性', icon: 'Zap', options: { enabled: ['timer'] } },
      ],
    })

    // 复制配置
    const duplicate = duplicateSpaceConfig(original.id)
    expect(duplicate).not.toBeNull()
    expect(duplicate!.id).not.toBe(original.id)
    expect(duplicate!.name).toBe('原始配置 (副本)')
    expect(duplicate!.description).toBe('原始描述')
    expect(duplicate!.presetId).toBe('standard')
    // 维度应深拷贝
    expect(duplicate!.dimensions).toEqual(original.dimensions)
    expect(duplicate!.dimensions).not.toBe(original.dimensions)
    // 副本应有自己的时间戳
    expect(duplicate!.createdAt).toBeTruthy()
    expect(duplicate!.updatedAt).toBeTruthy()

    // 验证存储中有两个配置
    expect(getSpaceConfigs().length).toBe(2)

    // 复制不存在的配置返回 null
    expect(duplicateSpaceConfig('nonexistent')).toBeNull()
  })

  // ============================================
  // 8. applyPreset 返回预设维度配置
  // ============================================
  it('applyPreset 返回预设维度配置', () => {
    const dims = applyPreset('standard')
    expect(dims).not.toBeNull()
    expect(dims!.length).toBe(7)
    // 验证返回的是深拷贝
    for (const d of dims!) {
      expect(d.dimension).toBeTruthy()
      expect(d.label).toBeTruthy()
      expect(d.icon).toBeTruthy()
      expect(d.options).toBeDefined()
    }

    const zenDims = applyPreset('zen')
    expect(zenDims).not.toBeNull()
    expect(zenDims!.length).toBe(7)

    // 不存在的预设返回 null
    expect(applyPreset('nonexistent')).toBeNull()
  })

  // ============================================
  // 9. getPresetById 正确查找
  // ============================================
  it('getPresetById 正确查找', () => {
    const standard = getPresetById('standard')
    expect(standard).toBeDefined()
    expect(standard!.id).toBe('standard')
    expect(standard!.name).toBe('标准空间')

    const minimal = getPresetById('minimal')
    expect(minimal).toBeDefined()
    expect(minimal!.id).toBe('minimal')
    expect(minimal!.name).toBe('极简空间')

    const zen = getPresetById('zen')
    expect(zen).toBeDefined()
    expect(zen!.id).toBe('zen')
    expect(zen!.name).toBe('禅意空间')

    const creative = getPresetById('creative')
    expect(creative).toBeDefined()
    expect(creative!.id).toBe('creative')
    expect(creative!.name).toBe('创意空间')

    const scholar = getPresetById('scholar')
    expect(scholar).toBeDefined()
    expect(scholar!.id).toBe('scholar')
    expect(scholar!.name).toBe('学人空间')

    const social = getPresetById('social')
    expect(social).toBeDefined()
    expect(social!.id).toBe('social')
    expect(social!.name).toBe('社交空间')

    const wanderer = getPresetById('wanderer')
    expect(wanderer).toBeDefined()
    expect(wanderer!.id).toBe('wanderer')
    expect(wanderer!.name).toBe('行者空间')

    const healer = getPresetById('healer')
    expect(healer).toBeDefined()
    expect(healer!.id).toBe('healer')
    expect(healer!.name).toBe('疗愈空间')

    // 不存在的 ID 返回 undefined
    expect(getPresetById('nonexistent')).toBeUndefined()
  })
})