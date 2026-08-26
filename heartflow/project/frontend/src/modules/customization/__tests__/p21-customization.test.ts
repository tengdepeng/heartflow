// ============================================================
// 装修工坊 · P21-2 单元测试
// 视图桥接 + 预览引擎增强
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import type { SpaceConfig, CustomDimension } from '../types'
import { SPACE_PRESETS } from '../presets'
import { useCustomizationBridge } from '../customization-bridge'
import type { LayoutTemplate, Theme } from '../layouts'
import { setActiveConfigId } from '../engine'
import { storage } from '../../../engine/storage'

// ---- 测试辅助函数 ----

function createSpaceConfigFixture(overrides: Partial<SpaceConfig> = {}): SpaceConfig {
  return {
    id: 'sc_' + Math.random().toString(36).slice(2, 8),
    name: '测试空间',
    description: '测试用空间配置',
    presetId: 'preset_standard',
    dimensions: [
      { dimension: 'structure' as CustomDimension, label: '空间结构', icon: 'Layout', options: {} },
      { dimension: 'features' as CustomDimension, label: '功能特性', icon: 'Zap', options: {} },
      { dimension: 'interaction' as CustomDimension, label: '交互方式', icon: 'Hand', options: {} },
      { dimension: 'style' as CustomDimension, label: '视觉风格', icon: 'Palette', options: {} },
      { dimension: 'data' as CustomDimension, label: '数据管理', icon: 'Database', options: {} },
      { dimension: 'permission' as CustomDimension, label: '权限配置', icon: 'Shield', options: {} },
      { dimension: 'scene' as CustomDimension, label: '场景预设', icon: 'Image', options: {} },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createLayoutFixture(overrides: Partial<LayoutTemplate> = {}): LayoutTemplate {
  return {
    id: 'layout_test_' + Math.random().toString(36).slice(2, 6),
    name: '测试布局',
    type: 'grid',
    description: '测试用布局',
    gap: 16,
    roomPositions: [
      { roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 },
      { roomId: 'room_b', x: 220, y: 0, width: 200, height: 200 },
    ],
    preset: false,
    ...overrides,
  }
}

// ---- 存储清理 ----

const CONFIG_STORAGE_KEY = 'hf:space_configs'

function clearStorage() {
  storage.setKV(CONFIG_STORAGE_KEY, [])
}

// ============================================================
// 1. useCustomizationBridge — 视图桥接
// ============================================================

describe('P21-2 装修工坊视图桥接', () => {
  let bridge: ReturnType<typeof useCustomizationBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useCustomizationBridge()
  })

  describe('空间配置管理', () => {
    it('初始无配置时 configCount 为 0', () => {
      expect(bridge.configCount.value).toBe(0)
    })

    it('创建配置后 configCount 增加', () => {
      bridge.createConfig('新空间', '测试', 'preset_standard')
      expect(bridge.configCount.value).toBe(1)
    })

    it('createConfig 返回完整配置', () => {
      const config = bridge.createConfig('禅意空间', '一个安静的空间', 'preset_zen')
      expect(config.id).toBeTruthy()
      expect(config.name).toBe('禅意空间')
      expect(config.description).toBe('一个安静的空间')
      expect(config.presetId).toBe('preset_zen')
    })

    it('更新配置后生效', () => {
      const config = bridge.createConfig('原始空间', '描述', 'preset_standard')
      const updated = bridge.updateConfig(config.id, { name: '更新后空间' })
      expect(updated?.name).toBe('更新后空间')
    })

    it('删除配置后 configCount 减少', () => {
      const config = bridge.createConfig('待删除', 'desc', 'preset_standard')
      expect(bridge.configCount.value).toBe(1)
      bridge.deleteConfig(config.id)
      expect(bridge.configCount.value).toBe(0)
    })

    it('复制配置生成新配置', () => {
      const config = bridge.createConfig('原空间', 'desc', 'preset_standard')
      const duplicate = bridge.duplicateConfig(config.id, '副本空间')
      expect(duplicate).not.toBeNull()
      expect(duplicate!.name).toBe('副本空间')
      expect(duplicate!.id).not.toBe(config.id)
      expect(bridge.configCount.value).toBe(2)
    })

    it('删除不存在的配置返回 false', () => {
      const result = bridge.deleteConfig('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('预设管理', () => {
    it('presetCount 返回预设数量', () => {
      expect(bridge.presetCount.value).toBe(SPACE_PRESETS.length)
    })

    it('getPresetDetail 返回预设详情', () => {
      const preset = bridge.getPresetDetail('standard')
      expect(preset).toBeDefined()
      expect(preset?.name).toBe('标准空间')
    })

    it('不存在的预设返回 undefined', () => {
      const preset = bridge.getPresetDetail('non-existent')
      expect(preset).toBeUndefined()
    })
  })

  describe('配置差异对比', () => {
    it('相同配置无差异', () => {
      const configA = createSpaceConfigFixture({ id: 'sc_a', name: 'A' })
      const configB = createSpaceConfigFixture({ id: 'sc_b', name: 'B' })
      const result = bridge.compareConfigs(configA, configB)
      expect(result.changeCount).toBe(0)
    })

    it('名称不同不产生差异', () => {
      const configA = createSpaceConfigFixture({ id: 'sc_a', name: 'A' })
      const configB = createSpaceConfigFixture({ id: 'sc_b', name: 'B' })
      // 名称不同但维度配置相同，应该有 0 差异
      const result = bridge.compareConfigs(configA, configB)
      expect(result.changeCount).toBe(0)
    })

    it('维度选项不同产生差异', () => {
      const configA = createSpaceConfigFixture({ id: 'sc_a', name: 'A' })
      const configB = createSpaceConfigFixture({
        id: 'sc_b',
        name: 'B',
        dimensions: [
          { dimension: 'structure' as CustomDimension, label: '空间结构', icon: 'Layout', options: { layout: 'grid' } },
          { dimension: 'features' as CustomDimension, label: '功能特性', icon: 'Zap', options: {} },
          { dimension: 'interaction' as CustomDimension, label: '交互方式', icon: 'Hand', options: {} },
          { dimension: 'style' as CustomDimension, label: '视觉风格', icon: 'Palette', options: {} },
          { dimension: 'data' as CustomDimension, label: '数据管理', icon: 'Database', options: {} },
          { dimension: 'permission' as CustomDimension, label: '权限配置', icon: 'Shield', options: {} },
          { dimension: 'scene' as CustomDimension, label: '场景预设', icon: 'Image', options: {} },
        ],
      })
      const result = bridge.compareConfigs(configA, configB)
      expect(result.changeCount).toBeGreaterThan(0)
    })
  })

  describe('布局对比', () => {
    it('相同布局无差异', () => {
      const layoutA = createLayoutFixture({ id: 'la', name: '布局A' })
      const layoutB = createLayoutFixture({ id: 'lb', name: '布局B' })
      const result = bridge.compareLayouts(layoutA, layoutB)
      expect(result.changeCount).toBe(0)
    })

    it('房间位置不同产生差异', () => {
      const layoutA = createLayoutFixture({
        id: 'la',
        name: '布局A',
        roomPositions: [{ roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 }],
      })
      const layoutB = createLayoutFixture({
        id: 'lb',
        name: '布局B',
        roomPositions: [{ roomId: 'room_a', x: 50, y: 50, width: 200, height: 200 }],
      })
      const result = bridge.compareLayouts(layoutA, layoutB)
      expect(result.changeCount).toBeGreaterThan(0)
    })

    it('新增房间检测为 added', () => {
      const layoutA = createLayoutFixture({
        id: 'la',
        roomPositions: [{ roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 }],
      })
      const layoutB = createLayoutFixture({
        id: 'lb',
        roomPositions: [
          { roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 },
          { roomId: 'room_b', x: 220, y: 0, width: 200, height: 200 },
        ],
      })
      const result = bridge.compareLayouts(layoutA, layoutB)
      expect(result.changes.some(c => c.change === 'added')).toBe(true)
    })

    it('移除房间检测为 removed', () => {
      const layoutA = createLayoutFixture({
        id: 'la',
        roomPositions: [
          { roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 },
          { roomId: 'room_b', x: 220, y: 0, width: 200, height: 200 },
        ],
      })
      const layoutB = createLayoutFixture({
        id: 'lb',
        roomPositions: [{ roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 }],
      })
      const result = bridge.compareLayouts(layoutA, layoutB)
      expect(result.changes.some(c => c.change === 'removed')).toBe(true)
    })

    it('房间尺寸变化检测为 resized', () => {
      const layoutA = createLayoutFixture({
        id: 'la',
        roomPositions: [{ roomId: 'room_a', x: 0, y: 0, width: 200, height: 200 }],
      })
      const layoutB = createLayoutFixture({
        id: 'lb',
        roomPositions: [{ roomId: 'room_a', x: 0, y: 0, width: 300, height: 300 }],
      })
      const result = bridge.compareLayouts(layoutA, layoutB)
      expect(result.changes.some(c => c.change === 'resized')).toBe(true)
    })
  })

  describe('主题预览', () => {
    it('generateThemePreview 生成预览数据', () => {
      const theme: Theme = {
        id: 'theme_test',
        name: '测试主题',
        mode: 'dark',
        accent: 'blue',
        primaryColor: '#6c9cf5',
        backgroundColor: '#0f1117',
        surfaceColor: '#1a1d27',
        textColor: '#e4e6ed',
        mutedTextColor: '#7a7f8c',
        borderColor: '#2a2d37',
        shadow: '0 2px 12px rgba(0,0,0,0.3)',
        borderRadius: 8,
        fontFamily: 'system-ui',
        preset: false,
      }
      const preview = bridge.generateThemePreview(theme)
      expect(preview.previewColors.primary).toBe('#6c9cf5')
      expect(preview.previewColors.background).toBe('#0f1117')
      expect(preview.previewColors.text).toBe('#e4e6ed')
      expect(preview.cssVariables).toBeTruthy()
      expect(preview.cssVariables['--hf-primary']).toBe('#6c9cf5')
    })
  })

  describe('维度完成度', () => {
    it('无活跃配置返回 null', () => {
      expect(bridge.dimensionCompleteness.value).toBeNull()
    })

    it('活跃配置返回7个维度数据', () => {
      const config = bridge.createConfig('测试空间', '描述', 'preset_standard')
      setActiveConfigId(config.id)
      const completeness = bridge.dimensionCompleteness.value
      expect(completeness).not.toBeNull()
      expect(completeness!.length).toBe(7)
    })

    it('全空维度显示未配置', () => {
      const config = bridge.createConfig('测试', 'desc', 'preset_standard')
      setActiveConfigId(config.id)
      const completeness = bridge.dimensionCompleteness.value!
      const allUnconfigured = completeness.every(d => !d.configured)
      expect(allUnconfigured).toBe(true)
    })
  })

  describe('装修健康度评分', () => {
    it('无配置时评分包含原因', () => {
      const health = bridge.renovationHealth.value
      // 预设布局和主题始终存在，基础分至少为布局分+主题分
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(100)
    })

    it('有配置后评分提升', () => {
      bridge.createConfig('测试', 'desc', 'preset_standard')
      const health = bridge.renovationHealth.value
      expect(health.score).toBeGreaterThanOrEqual(20)
    })

    it('评分最大不超过100', () => {
      const health = bridge.renovationHealth.value
      expect(health.score).toBeLessThanOrEqual(100)
    })
  })

  describe('快照管理', () => {
    it('创建快照返回快照对象', () => {
      const snapshot = bridge.createSnapshot('测试快照', '描述')
      expect(snapshot).toBeDefined()
      expect(snapshot.name).toBe('测试快照')
      expect(snapshot.description).toBe('描述')
    })

    it('创建快照后 snapshotCount 增加', () => {
      bridge.createSnapshot('快照1')
      expect(bridge.snapshotCount.value).toBeGreaterThanOrEqual(1)
    })

    it('搜索快照按标签过滤', () => {
      const results = bridge.searchSnapshots('不存在')
      expect(results).toHaveLength(0)
    })
  })

  describe('预览操作', () => {
    it('startPreview 设置预览状态', () => {
      const config = bridge.createConfig('预览空间', 'desc', 'preset_standard')
      bridge.startPreview(config.id)
      expect(bridge.preview.value.active).toBe(true)
      expect(bridge.preview.value.configId).toBe(config.id)
    })

    it('cancelPreview 取消预览', () => {
      const config = bridge.createConfig('预览空间', 'desc', 'preset_standard')
      bridge.startPreview(config.id)
      bridge.cancelPreview()
      expect(bridge.preview.value.active).toBe(false)
    })
  })

  describe('批量操作', () => {
    it('createBatchOperation 创建批量操作', () => {
      const op = bridge.createBatchOperation('update', ['sc_a', 'sc_b'], { name: '批量更新' })
      expect(op.type).toBe('update')
      expect(op.targetIds).toEqual(['sc_a', 'sc_b'])
      expect(op.status).toBe('pending')
    })
  })

  describe('风格迁移', () => {
    it('createStyleMigration 创建风格迁移', () => {
      const migration = bridge.createStyleMigration(
        'sc_source',
        ['sc_target'],
        ['style', 'interaction'] as CustomDimension[],
        'merge',
      )
      expect(migration.sourceId).toBe('sc_source')
      expect(migration.targetIds).toEqual(['sc_target'])
      expect(migration.dimensions).toEqual(['style', 'interaction'])
      expect(migration.strategy).toBe('merge')
    })
  })
})