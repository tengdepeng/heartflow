// ============================================================
// 装修工坊 · 视图桥接层（P21-2）
// 蓝图定义：
//   统一状态聚合（空间配置+主题+布局+预览+快照+环境+载体）
//   装修仪表盘数据
//   可视化预览数据（布局对比+主题预览+风格差异）
//   操作入口（CRUD+预览+撤销/重做+批量+风格迁移）
//   装修健康度评分
// ============================================================

import { ref, computed } from 'vue'
import {
  getSpaceConfigs,
  getActiveConfig,
  createSpaceConfig,
  updateSpaceConfig,
  deleteSpaceConfig,
  duplicateSpaceConfig,
} from './engine'
import { usePreviewEngine } from './preview-engine'
import { useLayoutTemplates, useThemeSystem, useSpaceSnapshots } from './layouts'
import type { Theme, SpaceSnapshot } from './layouts'
import { SPACE_PRESETS, getPresetById } from './presets'
import type { SpaceConfig, CustomDimension } from './types'
import { DIMENSION_META } from './types'
import type { LayoutTemplate, LayoutType } from './layouts'
import type { PreviewState, RenovationRecord, BatchOperation, StyleMigration } from './preview-engine'

// ---- 桥接层状态聚合 ----

/** 装修工坊统一状态 */
export interface CustomizationBridgeState {
  // 空间配置
  configs: SpaceConfig[]
  activeConfig: SpaceConfig | null
  configCount: number
  presetCount: number

  // 布局
  activeLayout: LayoutTemplate | null
  layoutType: LayoutType | null

  // 主题
  activeTheme: Theme | null
  themeCSSVariables: Record<string, string> | null

  // 快照
  snapshots: SpaceSnapshot[]
  snapshotCount: number

  // 预览
  preview: PreviewState
  canUndo: boolean
  canRedo: boolean
  undoCount: number
  redoCount: number
  recentHistory: RenovationRecord[]
  activeBatchOps: BatchOperation[]
  activeMigrations: StyleMigration[]
}

// ============================================================
// useCustomizationBridge — 装修工坊视图桥接
// ============================================================

export function useCustomizationBridge() {
  // ---- 子模块 ----
  const previewEngine = usePreviewEngine()
  const layoutSystem = useLayoutTemplates()
  const themeSystem = useThemeSystem()
  const snapshotSystem = useSpaceSnapshots()

  // ---- 状态 ----
  const configs = ref<SpaceConfig[]>(getSpaceConfigs())

  /** 刷新配置列表 */
  function refreshConfigs() {
    configs.value = getSpaceConfigs()
  }

  // ---- 计算属性 ----

  /** 活跃配置 */
  const activeConfig = computed(() => getActiveConfig())

  /** 配置数量 */
  const configCount = computed(() => configs.value.length)

  /** 预设数量 */
  const presetCount = computed(() => SPACE_PRESETS.length)

  /** 当前活跃布局 */
  const activeLayout = computed(() => layoutSystem.getActiveLayout())

  /** 当前布局类型 */
  const layoutType = computed(() => activeLayout.value?.type ?? null)

  /** 当前活跃主题 */
  const activeTheme = computed(() => themeSystem.getActiveTheme())

  /** 主题 CSS 变量 */
  const themeCSSVariables = computed(() => {
    const theme = activeTheme.value
    if (!theme) return null
    return themeSystem.themeToCSSVariables(theme)
  })

  /** 快照列表 */
  const snapshots = computed(() => snapshotSystem.snapshots.value)

  /** 快照数量 */
  const snapshotCount = computed(() => snapshotSystem.snapshots.value.length)

  // ---- 预览相关 ----

  /** 预览状态 */
  const preview = computed(() => previewEngine.previewState.value)

  /** 是否可撤销 */
  const canUndo = computed(() => previewEngine.canUndo.value)

  /** 是否可重做 */
  const canRedo = computed(() => previewEngine.canRedo.value)

  /** 撤销步数 */
  const undoCount = computed(() => previewEngine.undoCount.value)

  /** 重做步数 */
  const redoCount = computed(() => previewEngine.redoCount.value)

  /** 最近历史 */
  const recentHistory = computed(() => previewEngine.recentHistory.value)

  /** 活跃批量操作 */
  const activeBatchOps = computed(() => previewEngine.activeBatchOps.value)

  /** 活跃风格迁移 */
  const activeMigrations = computed(() => previewEngine.activeMigrations.value)

  // ---- 仪表盘数据 ----

  /** 维度完成度 */
  const dimensionCompleteness = computed(() => {
    const config = activeConfig.value
    if (!config) return null

    return Object.keys(DIMENSION_META).map(key => {
      const dim = key as CustomDimension
      const dimConfig = config.dimensions.find(d => d.dimension === dim)
      const optionCount = dimConfig ? Object.keys(dimConfig.options).length : 0
      return {
        dimension: dim,
        label: DIMENSION_META[dim].label,
        icon: DIMENSION_META[dim].icon,
        configured: optionCount > 0,
        optionCount,
      }
    })
  })

  /** 装修健康度评分 */
  const renovationHealth = computed(() => {
    let score = 0
    const reasons: string[] = []

    // 有活跃配置 +20
    if (activeConfig.value) {
      score += 20
    } else {
      reasons.push('尚未选择活跃空间配置')
    }

    // 有预设匹配 +15
    if (activeConfig.value?.presetId) {
      score += 15
    }

    // 维度配置完整度 +30
    if (activeConfig.value) {
      const configuredDims = activeConfig.value.dimensions.filter(
        d => Object.keys(d.options).length > 0,
      ).length
      score += Math.round((configuredDims / 7) * 30)
      if (configuredDims < 4) {
        reasons.push(`仅有 ${configuredDims}/7 个维度已配置`)
      }
    }

    // 有主题 +15
    if (activeTheme.value) {
      score += 15
    } else {
      reasons.push('尚未设置主题')
    }

    // 有布局 +10
    if (activeLayout.value) {
      score += 10
    } else {
      reasons.push('尚未选择布局')
    }

    // 有快照 +10
    if (snapshotCount.value > 0) {
      score += 10
    }

    return { score, maxScore: 100, reasons }
  })

  /** 最近装修活动摘要 */
  const recentActivity = computed(() => {
    return previewEngine.recentHistory.value.slice(0, 10).map(r => ({
      id: r.id,
      description: r.description,
      type: r.type,
      changes: r.changes,
      timestamp: r.timestamp,
    }))
  })

  /** 布局对比数据 */
  function compareLayouts(layoutA: LayoutTemplate, layoutB: LayoutTemplate) {
    const diff: { roomId: string; change: 'added' | 'removed' | 'moved' | 'resized'; detail: string }[] = []

    const roomsA = new Map(layoutA.roomPositions.map(r => [r.roomId, r]))
    const roomsB = new Map(layoutB.roomPositions.map(r => [r.roomId, r]))

    // 检查新增/移除
    for (const [id, pos] of roomsB) {
      if (!roomsA.has(id)) {
        diff.push({ roomId: id, change: 'added', detail: `新增房间 (${pos.x},${pos.y})` })
      }
    }
    for (const [id] of roomsA) {
      if (!roomsB.has(id)) {
        diff.push({ roomId: id, change: 'removed', detail: '移除房间' })
      }
    }

    // 检查位置变化
    for (const [id, posA] of roomsA) {
      const posB = roomsB.get(id)
      if (posB) {
        if (posA.x !== posB.x || posA.y !== posB.y) {
          diff.push({
            roomId: id,
            change: 'moved',
            detail: `从 (${posA.x},${posA.y}) 移至 (${posB.x},${posB.y})`,
          })
        }
        if (posA.width !== posB.width || posA.height !== posB.height) {
          diff.push({
            roomId: id,
            change: 'resized',
            detail: `从 ${posA.width}x${posA.height} 变为 ${posB.width}x${posB.height}`,
          })
        }
      }
    }

    return {
      layoutA: layoutA.name,
      layoutB: layoutB.name,
      changes: diff,
      changeCount: diff.length,
    }
  }

  /** 配置差异对比 */
  function compareConfigs(configA: SpaceConfig, configB: SpaceConfig) {
    const changes: {
      dimension: CustomDimension
      label: string
      added: string[]
      removed: string[]
      changed: string[]
    }[] = []

    const dimsA = new Map(configA.dimensions.map(d => [d.dimension, d]))
    const dimsB = new Map(configB.dimensions.map(d => [d.dimension, d]))

    for (const dim of Object.keys(DIMENSION_META) as CustomDimension[]) {
      const optsA = dimsA.get(dim)?.options ?? {}
      const optsB = dimsB.get(dim)?.options ?? {}

      const keysA = new Set(Object.keys(optsA))
      const keysB = new Set(Object.keys(optsB))

      const added: string[] = []
      const removed: string[] = []
      const changed: string[] = []

      for (const key of keysB) {
        if (!keysA.has(key)) {
          added.push(key)
        } else if (JSON.stringify(optsA[key]) !== JSON.stringify(optsB[key])) {
          changed.push(key)
        }
      }
      for (const key of keysA) {
        if (!keysB.has(key)) {
          removed.push(key)
        }
      }

      if (added.length > 0 || removed.length > 0 || changed.length > 0) {
        changes.push({
          dimension: dim,
          label: DIMENSION_META[dim].label,
          added,
          removed,
          changed,
        })
      }
    }

    return {
      configA: configA.name,
      configB: configB.name,
      changes,
      changeCount: changes.reduce((s, c) => s + c.added.length + c.removed.length + c.changed.length, 0),
    }
  }

  /** 主题预览数据 */
  function generateThemePreview(theme: Theme) {
    return {
      ...theme,
      cssVariables: themeSystem.themeToCSSVariables(theme),
      previewColors: {
        primary: theme.primaryColor,
        background: theme.backgroundColor,
        surface: theme.surfaceColor,
        text: theme.textColor,
        mutedText: theme.mutedTextColor,
        border: theme.borderColor,
      },
    }
  }

  // ---- 操作入口 ----

  /** 创建空间配置 */
  function createConfig(name: string, description: string, presetId: string): SpaceConfig {
    const config = createSpaceConfig({ name, description, presetId, dimensions: [] })
    refreshConfigs()
    return config
  }

  /** 更新空间配置 */
  function updateConfig(id: string, updates: Partial<SpaceConfig>): SpaceConfig | null {
    const result = updateSpaceConfig(id, updates)
    refreshConfigs()
    return result
  }

  /** 删除空间配置 */
  function deleteConfig(id: string): boolean {
    const result = deleteSpaceConfig(id)
    refreshConfigs()
    return result
  }

  /** 复制空间配置 */
  function duplicateConfig(id: string, newName?: string): SpaceConfig | null {
    const result = duplicateSpaceConfig(id, newName)
    refreshConfigs()
    return result
  }

  /** 开始预览 */
  function startPreview(configId: string) {
    previewEngine.startPreview(configId)
  }

  /** 更新预览 */
  function updatePreview(changes: Partial<SpaceConfig>) {
    previewEngine.updatePreview(changes)
  }

  /** 提交预览 */
  function commitPreview(description: string) {
    previewEngine.commitPreview(description)
    refreshConfigs()
  }

  /** 取消预览 */
  function cancelPreview() {
    previewEngine.cancelPreview()
  }

  /** 撤销 */
  function undo() {
    previewEngine.undo()
    refreshConfigs()
  }

  /** 重做 */
  function redo() {
    previewEngine.redo()
    refreshConfigs()
  }

  /** 创建风格迁移 */
  function createStyleMigration(
    sourceId: string,
    targetIds: string[],
    dimensions: CustomDimension[],
    strategy: 'overwrite' | 'merge' | 'preview' = 'merge',
  ): StyleMigration {
    return previewEngine.createStyleMigration(sourceId, targetIds, dimensions, strategy)
  }

  /** 创建批量操作 */
  function createBatchOperation(
    type: 'update' | 'delete' | 'duplicate' | 'export' | 'import',
    targetIds: string[],
    params: Record<string, any> = {},
  ): BatchOperation {
    return previewEngine.createBatchOperation(type, targetIds, params)
  }

  /** 获取预设详情 */
  function getPresetDetail(presetId: string) {
    return getPresetById(presetId)
  }

  /** 创建空间快照 */
  function createSnapshot(name: string, description?: string) {
    return snapshotSystem.createSnapshot(
      name,
      description ?? '',
      activeConfig.value?.id ?? '',
      activeLayout.value?.id ?? '',
      activeTheme.value?.id ?? '',
      activeLayout.value?.roomPositions ?? [],
      [],
    )
  }

  /** 搜索快照 */
  function searchSnapshots(query: string) {
    return snapshotSystem.searchSnapshots(query)
  }

  return {
    // 状态
    configs,
    refreshConfigs,

    // 计算属性
    activeConfig,
    configCount,
    presetCount,
    activeLayout,
    layoutType,
    activeTheme,
    themeCSSVariables,
    snapshots,
    snapshotCount,
    preview,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    recentHistory,
    activeBatchOps,
    activeMigrations,

    // 仪表盘
    dimensionCompleteness,
    renovationHealth,
    recentActivity,

    // 可视化
    compareLayouts,
    compareConfigs,
    generateThemePreview,

    // 操作
    createConfig,
    updateConfig,
    deleteConfig,
    duplicateConfig,
    startPreview,
    updatePreview,
    commitPreview,
    cancelPreview,
    undo,
    redo,
    createStyleMigration,
    createBatchOperation,
    getPresetDetail,
    createSnapshot,
    searchSnapshots,
  }
}