// ============================================================
// 羁绊之厅 · 模块入口（barrel）
// 仅为再导出层。核心逻辑已下沉至 ./relation-store，
// 以消除 index ↔ bond-bridge 的循环依赖。
// ============================================================

export type { RelationNetwork, FamilyTree, NetworkStats, MemorialSeat } from './relation-network'

// ---- 关系可视化增强 ----
export {
  computeForceLayout,
  buildInteractionHeatmap,
  buildRelationshipTimeline,
  computeRelationshipRadar,
  DAY_LABELS,
  RADAR_DIMENSIONS,
  DEFAULT_LAYOUT_CONFIG,
} from './relation-visualization'
export type {
  ForceNode,
  ForceEdge,
  ForceLayoutConfig,
  HeatmapCell,
  InteractionHeatmap,
  TimelineEvent,
  RelationshipTimeline,
  RadarDimension,
  RelationshipRadar,
} from './relation-visualization'

// ---- 互动日志 / 纪念日（INCR-13 羁绊档案数据背书）----
export { useInteractionJournal, useAnniversaries, INTERACTION_KIND_META } from './interaction-journal'
export type { InteractionEntry, InteractionKind, InteractionStats } from './interaction-journal'

// ---- 羁绊档案分析（INCR-13）----
export {
  relationOverview,
  relationTypeRows,
  relationRhythm,
  relationHealth,
  relationInsights,
  daysSinceLast,
} from './relation-analytics'
export type {
  RelationOverview,
  RelationTypeRow,
  RelationRhythm,
  RelationHealth,
} from './relation-analytics'

// ---- 状态管理（已抽取至叶子，公共 API 不变）----
export { useRelation } from './relation-store'

// ---- 留座（纪念座位）数据层 ----
export { useMemorialSeats } from './memorial-seats'

// ---- 视图桥接层 (P21-6) ----
export { useBondBridge } from './bond-bridge'
export type {
  PersonOverview,
  BondHealth,
  NetworkOverview,
  BondRecommendation,
} from './bond-bridge'
