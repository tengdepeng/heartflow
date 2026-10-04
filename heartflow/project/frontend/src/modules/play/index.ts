// ⚠️ 本文件是纯 barrel（模块出口）：真实状态定义已下沉 ./play-store。
//    barrel 若自身定义符号、又被 bridge 反向引用，会构成 index ↔ bridge 循环依赖，
//    故本地定义一律外置，此处只做转发。

export { usePlayGallery } from './play-store'

// ============================================================
// 逸趣阁 · 业务逻辑模块
// ============================================================

// ---- 时间种子（心情种子 / 生长系统，数据层下沉，P 重构） ----
export { usePlaySeeds } from './seeds'

// ---- 时间种子 ----
export {
  seedFromGame,
  seedFromToy,
  seedFromModel,
  seedFromOther,
  inheritSeed,
  canInherit,
  computeSeedStats,
  computeLODLevel,
  applyLOD,
  SEED_RARITY_LABELS,
  SEED_RARITY_COLORS,
} from './time-seed'
export type { TimeSeed, SeedSource, SeedRarity, SeedStats, LODLevel } from './time-seed'

// ---- 种子分享与遗传 ----
export {
  exportSeed,
  importSeed,
  stringifySeed,
  parseSeed,
  createInheritance,
  buildLineage,
  buildSeedGraph,
  computeGraphSummary,
  mergeSeedCollections,
  filterByRarity,
  searchSeeds,
} from './seed-share'
export type {
  SeedSharePayload,
  ExportedSeed,
  InheritanceRecord,
  InheritanceLineage,
  SeedGraphNode,
  SeedGraphEdge,
  SeedGraph,
  SeedGraphSummary,
} from './seed-share'

// ---- 时间种子传递治理层（第46/47/48条） ----
export {
  seedTransferType,
  defaultAuthorization,
  buildInvestmentPreview,
  collectTimeInvestments,
  exportSeedGift,
  stringifySeedGift,
  parseSeedGift,
  recordTransfer,
  getTransferLogs,
  getTransferLog,
  revokeTransfer,
  isTransferViewable,
  TRANSFER_TYPE_LABELS,
  GRANULARITY_LABELS,
} from './seed-transfer'
export type {
  TransferType,
  TransferGranularity,
  TransferAuthorization,
  TransferPreview,
  TransferPreviewItem,
  TransferLog,
  RevokeResult,
  TimeInvestmentRecord,
  SeedGiftPayload,
  GiftItem,
} from './seed-transfer'

// ---- 接收端时间种子（第46条单向赠予落点 / 第48条反收回变暗） ----
export {
  addReceivedSeedsFromGift,
  importSeedGift,
  getReceivedSeeds,
  getReceivedSeed,
  plantSeed,
  admireSeed,
  rejectSeed,
  removeReceivedSeed,
  markRevokedByGift,
} from './received-seed'
export type {
  ReceivedSeed,
  ReceivedSeedState,
} from './received-seed'

// ==================== 导出数据常量 ====================

export { PLAY_TABS, TOY_FILTERS, valueLabel, statusLabel, formatDate } from './data'
export type { Game, Toy, Model, Other, PlayData, MonthlyStat, DistBuckets, ModelGroup, RecentItem, PlayTab, FilterOption, PlatformDistItem } from './types'

// ---- 高级统计与趋势 ----
export {
  checkMilestones,
  computePlaySummary,
  buildPlayTrend,
  computeTimeInvestmentROI,
  computeCollectionHeatmap,
  computePreferenceProfile,
  MILESTONE_DEFS,
} from './play-advanced'

// ---- 逸趣档案（逸趣阁·档案陈列，与 play-advanced 的趋势/偏好互补）----
export {
  seedEffectiveAge,
  moodSeedStage,
  playArchiveOverview,
  collectionTypeRows,
  moodSeedOverview,
  collectionRhythm,
  collectionHealth,
  playInsights,
  MOOD_SEED_STAGE_LABELS,
  MOOD_SEED_STAGE_COLORS,
} from './play-analytics'
export type {
  MoodSeedStage,
  PlayArchiveOverview,
  CollectionTypeRow,
  MoodSeedRow,
  MoodDistribution,
  MoodSeedOverview,
  CollectionRhythm,
  CollectionHealth,
  PlayInsight,
} from './play-analytics'
export type {
  PlayMilestone,
  MilestoneCategory,
  PlayTrend,
  PlaySummary,
  TimeInvestmentROI,
  CollectionHeatmap,
  PreferenceProfile,
} from './play-advanced'

// ---- 逸趣桥（视图桥接层，INCR-375）----
export { usePlayBridge } from './play-bridge'
export type {
  PlayOverview,
  GalleryStats,
  SeedOverview,
  PlayRecommendation,
} from './play-bridge'
