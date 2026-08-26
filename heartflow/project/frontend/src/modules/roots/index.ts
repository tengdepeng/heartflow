// ============================================================
// 根脉之庭 · 模块入口（barrel）
// 仅为再导出层。核心逻辑已下沉至 ./roots-store，
// 以消除 index ↔ root-bridge 的循环依赖。
// ============================================================

export type { Root, RootLayer } from './types'
export type { TraceTree, TraceTreeNode, TraceThread, SuggestedConnection, TreeStats, ThreadReason } from './root-tree'
export { LAYER_CONFIG, DEFAULT_STRENGTH, STORAGE_KEY } from './types'

// ---- 根系叙事与健康 ----
export {
  generateOriginNarrative,
  generateEraNarrative,
  generateBranchNarrative,
  computeRootHealth,
  computeGardenHealth,
  HEALTH_LEVELS,
  EMOTIONAL_TONES,
  NARRATIVE_MODE_LABELS,
} from './root-narrative'
export type {
  NarrativeMode,
  NarrativeParagraph,
  RootNarrative,
  RootHealth,
  RootGardenHealth,
} from './root-narrative'

// ---- 衰减引擎（P20-5） ----
export {
  useDecayEngine,
  DEFAULT_DECAY_CONFIG,
} from './decay-engine'
export type {
  DecayConfig,
  DecayRecord,
  DecayReport,
  VitalityScore,
} from './decay-engine'

// ---- 增强可视化引擎（P20-5） ----
export { useRootVisualization } from './root-visualization'
export type {
  RootVisualNode,
  RootVisualEdge,
  RootVisualTree,
  RootVitalityMap,
  GrowthAnimation,
  RootCluster,
  VitalityNode,
  LayoutType as VisualLayoutType,
} from './root-visualization'

// ---- 核心逻辑（已抽取至叶子，公共 API 不变）----
export { useRoots, getStats } from './roots-store'

// ---- 视图桥接层（P20-5） ----
export { useRootBridge } from './root-bridge'
export type { RootBridgeState, RootQuickStats } from './root-bridge'

// ---- 根系数据层（裸 storage 下沉） ----
export { useRootGarden } from './roots-garden'
