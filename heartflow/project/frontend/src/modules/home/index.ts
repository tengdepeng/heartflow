// ============================================================
// 家 · 内部房间模块 barrel export
// 包含 11 个场景化空间的定义、选择面板、氛围渲染组件
// 深度交互引擎、房间活动系统
// ============================================================

export { default as HomeRoomPanel } from './HomeRoomPanel.vue'
export { default as HomeRoomAtmosphere } from './HomeRoomAtmosphere.vue'
export { HOME_ROOMS, DEFAULT_HOME_ROOM, getHomeRoom } from './rooms'
export type { HomeRoom } from './rooms'

export { useHomeRoomInteraction, DECORATION_LIBRARY, DECORATION_TYPE_META } from './home-room-interaction'
export type {
  RoomDecoration,
  RoomCustomState,
  SceneEditorConfig,
  RoomInteractionEvent,
} from './home-room-interaction'

export { useHomeInteractionEngine } from './home-interaction-engine'
export type {
  RoomActivityType,
  RoomActivity,
  RoomMoodSnapshot,
  InteractionStep,
  InteractionChain,
  ActivitySuggestion,
} from './home-interaction-engine'

// ---- 高级氛围引擎 ----
export {
  useHomeAtmosphereEngine,
  ATMOSPHERE_PRESETS,
  TRANSITION_PRESETS,
  TRANSITION_TYPE_META,
  SCENT_PROFILES,
  SCENT_PROFILE_MAP,
} from './home-atmosphere-engine'
export type {
  RoomTransitionType,
  RoomTransition,
  AtmosphereLayer,
  AtmospherePreset,
  AtmosphereSoundscape,
  AtmosphereScent,
  ScentProfile,
  RoomActivitySummary,
  HomeDashboard,
  HomeActivity,
} from './home-atmosphere-engine'

// ---- P21-4: 视图桥接层 ----
export { useHomeBridge } from './home-bridge'
export type {
  RoomOverview,
  HomeHealth,
  RoomHeatmapEntry,
  ActivityTimelineEntry,
  RoomRecommendation,
  HomeBridgeState,
} from './home-bridge'

// ---- F6: 今日跨房间聚合 ----
export { aggregateTodayRoomStats, getUtcDateKey } from './today-room-stats'
export type { TodayRoomStats } from './today-room-stats'