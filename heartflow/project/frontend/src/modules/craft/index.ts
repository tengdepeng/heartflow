// ============================================================
// 匠庐 · 模块入口（barrel）
// 仅为再导出层。核心逻辑已下沉至 ./craft-store 等叶子模块，
// 以消除 index ↔ craft-bridge 的 barrel 循环依赖。
// ============================================================

// ---- 作品 Store（已抽取至叶子，公共 API 不变）----
export { useCraftStore } from './craft-store'
export type { CraftWork, WorkStatus, WorkType } from './types'

// ---- 材料管理导出 ----
export { useCraftMaterials } from './materials'
export type { MaterialRarity, Material, MaterialUsage, MaterialStats } from './materials'
export { MATERIAL_RARITY_META, CRAFT_STORAGE_KEYS, DEFAULT_MATERIALS } from './materials'

// ---- 高级工坊引擎 ----
export { useCraftAdvanced } from './craft-advanced'
export type {
  CraftAnalytics,
  EvolutionNode,
  InspirationEntry,
  WorkVersion,
} from './craft-advanced'

// ---- 视图桥接层（P21-5） ----
export { useCraftBridge } from './craft-bridge'
export type {
  CraftHealth,
  WorkOverview,
  CraftDashboard,
  WorkTrend,
  TypeDistribution,
  MaterialDistribution,
  BadgeProgress,
  SynthesisEfficiency,
  WorkRecommendation,
} from './craft-bridge'
