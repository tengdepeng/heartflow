// ============================================================
// 根脉之庭 · 视图桥接层（P20-5）
// 为 Roots.vue 提供标准化模块接口，替代直接 storage 调用
// ============================================================

import { ref, computed } from 'vue'
import { useRoots } from './roots-store'
import type { Root, RootLayer } from './types'
import { LAYER_CONFIG, STORAGE_KEY } from './types'
import type { TraceTree, TraceTreeNode, TraceThread, TreeStats, SuggestedConnection } from './root-tree'
import type { RootNarrative, RootHealth, RootGardenHealth, NarrativeMode } from './root-narrative'
import { generateOriginNarrative, generateEraNarrative, generateBranchNarrative, computeGardenHealth } from './root-narrative'
import { useDecayEngine } from './decay-engine'
import type { DecayConfig, DecayRecord, DecayReport, VitalityScore } from './decay-engine'
import { useRootVisualization } from './root-visualization'
import type { RootVisualTree, RootVitalityMap, GrowthAnimation, RootCluster } from './root-visualization'

// ============================================================
// 类型定义
// ============================================================

/** 桥接层返回的完整状态 */
export interface RootBridgeState {
  /** 根系列表 */
  roots: Root[]
  /** 溯源树 */
  traceTree: TraceTree
  /** 连接建议 */
  connectionSuggestions: SuggestedConnection[]
  /** 树统计 */
  treeStats: TreeStats
  /** 根脉叙事 */
  originNarrative: RootNarrative | null
  eraNarrative: RootNarrative | null
  branchNarrative: RootNarrative | null
  /** 根系健康 */
  gardenHealth: RootGardenHealth | null
  /** 衰减报告 */
  decayReport: DecayReport | null
  /** 可视化树 */
  visualTree: RootVisualTree | null
  /** 生命力地图 */
  vitalityMap: RootVitalityMap | null
  /** 根系聚类 */
  clusters: RootCluster[]
}

/** 快捷统计 */
export interface RootQuickStats {
  /** 总根系数 */
  totalRoots: number
  /** 各层数量 */
  soilCount: number
  eraCount: number
  branchCount: number
  /** 平均强度 */
  avgStrength: number
  /** 需要关注的根系（强度 < 0.3） */
  weakRoots: number
  /** 关联最多的根系 */
  mostConnected: string
  /** 连接数 */
  totalConnections: number
  /** 最近更新 */
  lastUpdated: string
  /** 花园健康评分 */
  gardenHealthScore: number
}

// ============================================================
// useRootBridge Composable
// ============================================================

export function useRootBridge() {
  // ---- 子模块 ----
  const roots = useRoots()
  const decayEngine = useDecayEngine()
  const visualization = useRootVisualization()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 初始化 ----

  function initialize(): void {
    roots.load()
    refreshAll()
  }

  function refreshAll(): void {
    const data = roots.allRoots.value

    // 衰减检查
    if (data.length > 0) {
      decayEngine.runDecayCheck(data)
    }

    // 可视化
    if (data.length > 0) {
      visualization.generateVisualTree(data, roots.traceTree.value)
      visualization.generateVitalityMap(data)
      visualization.clusterRoots(data)
    }
  }

  // ============================================================
  // 快捷统计
  // ============================================================

  const quickStats = computed<RootQuickStats>(() => {
    const data = roots.allRoots.value
    const avgStrength = data.length > 0
      ? Math.round(data.reduce((s, r) => s + r.strength, 0) / data.length * 100) / 100
      : 0

    const weakRoots = data.filter(r => r.strength < 0.3).length

    // 找关联最多的根系
    let mostConnected = '—'
    let maxConnections = 0
    for (const r of data) {
      if (r.connections.length > maxConnections) {
        maxConnections = r.connections.length
        mostConnected = r.text
      }
    }

    const totalConnections = data.reduce((s, r) => s + r.connections.length, 0) / 2

    const lastUpdated = data.length > 0
      ? data.reduce((latest, r) =>
          r.lastUpdatedAt > latest ? r.lastUpdatedAt : latest, data[0].lastUpdatedAt)
      : '—'

    const gardenHealth = computeGardenHealth(data)

    return {
      totalRoots: data.length,
      soilCount: data.filter(r => r.layer === 'soil').length,
      eraCount: data.filter(r => r.layer === 'era').length,
      branchCount: data.filter(r => r.layer === 'branch').length,
      avgStrength,
      weakRoots,
      mostConnected,
      totalConnections,
      lastUpdated,
      gardenHealthScore: gardenHealth.overallScore,
    }
  })

  // ============================================================
  // 完整状态
  // ============================================================

  const bridgeState = computed<RootBridgeState>(() => {
    const data = roots.allRoots.value
    const tree = roots.traceTree.value

    // 叙事
    const originNarrative = data.length > 0 ? generateOriginNarrative(data, tree) : null
    const eraNarrative = data.length > 0 ? generateEraNarrative(data) : null
    const branchNarrative = data.length > 0 ? generateBranchNarrative(data[0], data) : null

    // 健康
    const gardenHealth = data.length > 0 ? computeGardenHealth(data) : null

    return {
      roots: data,
      traceTree: tree,
      connectionSuggestions: roots.connectionSuggestions.value,
      treeStats: roots.treeStats.value,
      originNarrative,
      eraNarrative,
      branchNarrative,
      gardenHealth,
      decayReport: decayEngine.report?.value ?? null,
      visualTree: visualization.visualTree?.value ?? null,
      vitalityMap: visualization.vitalityMap?.value ?? null,
      clusters: visualization.clusters?.value ?? [],
    }
  })

  // ============================================================
  // 根系操作
  // ============================================================

  function addRoot(config: {
    layer: RootLayer
    text: string
    detail?: string
    era?: string
    icon?: string
    strength?: number
    connections?: string[]
    tags?: string[]
    color?: string
    willId?: string | null
  }): Root {
    const root = roots.add({
      layer: config.layer,
      text: config.text,
      detail: config.detail ?? '',
      era: config.era ?? '',
      icon: config.icon ?? '',
      strength: config.strength ?? 0.5,
      connections: config.connections ?? [],
      tags: config.tags ?? [],
      color: config.color ?? '#d4a574',
      willId: config.willId ?? null,
    })
    refreshAll()
    return root
  }

  function removeRoot(id: string): void {
    roots.remove(id)
    refreshAll()
  }

  function updateRoot(id: string, updates: Partial<Root>): void {
    roots.update(id, updates)
    refreshAll()
  }

  return {
    // 状态
    isLoading,
    quickStats,
    bridgeState,

    // 根系操作
    addRoot,
    removeRoot,
    updateRoot,

    // 子模块
    roots,
    decayEngine,
    visualization,

    // 生命周期
    initialize,
    refreshAll,
  }
}

// ============================================================
// 导出常量
// ============================================================

export { LAYER_CONFIG, STORAGE_KEY }
export type { Root, RootLayer }
export type { TraceTree, TraceTreeNode, TraceThread, TreeStats, SuggestedConnection }
export type { RootNarrative, RootHealth, RootGardenHealth, NarrativeMode }
export type { DecayConfig, DecayRecord, DecayReport, VitalityScore }
export type { RootVisualTree, RootVitalityMap, GrowthAnimation, RootCluster }