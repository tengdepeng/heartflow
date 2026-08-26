// ============================================================
// 心流工坊 · 功能空间层 - 统一导出
// ============================================================

// 空间编排引擎
export {
  useSpaceOrchestrator,
  CATEGORY_LABELS as ORCHESTRATION_CATEGORY_LABELS,
  CATEGORY_ICONS as ORCHESTRATION_CATEGORY_ICONS,
} from './space-orchestrator'
export type {
  SpaceStatus,
  SpaceCategory,
  SpaceDependency,
  SpaceLifecycleHooks,
  SpaceOrchestrationConfig,
  OrchestrationSnapshot,
  SpaceGroupInfo,
  SpaceTransitionEvent,
} from './space-orchestrator'

// 房间模板系统
export {
  useRoomTemplates,
  CATEGORY_LABELS as TEMPLATE_CATEGORY_LABELS,
  CATEGORY_ICONS as TEMPLATE_CATEGORY_ICONS,
} from './room-templates'
export type {
  TemplateType,
  TemplateCategory,
  RoomLayoutTemplate,
  SpaceTemplate,
  SpaceScenePreset,
  RoomSceneConfig,
  SceneAtmosphere,
} from './room-templates'

// 动态路由配置引擎
export {
  useDynamicRoutes,
  LOAD_STRATEGY_LABELS,
} from './dynamic-routes'
export type {
  RouteSource,
  RouteLoadStrategy,
  DynamicRouteConfig,
  RouteRegistrationEvent,
  RouteGuardConfig,
  RouteStats,
  RoutePreloadTask,
} from './dynamic-routes'

// 空间健康度监控
export {
  useSpaceHealth,
  HEALTH_LEVELS,
} from './space-health'
export type {
  HealthLevel,
  HealthMetricType,
  HealthMetric,
  SpaceHealthReport,
  HealthIssue,
  PerformanceSnapshot,
  DependencyValidationResult,
  ErrorTrackingEntry,
  HealthAlert,
} from './space-health'

// 应用空间管理仪表盘
export {
  useAppSpaceManager,
  APP_SPACE_ENTRIES,
} from './app-space-manager'
export type {
  AppSpaceEntry,
  AppSpaceUsageStats,
  AppSpaceActivity,
  SpaceComparison,
} from './app-space-manager'

// 应用市场
export {
  useAppMarket,
  MARKET_ITEMS,
} from './app-market'
export type {
  MarketItemType,
  MarketItemStatus,
  MarketItem,
  MarketFilter,
  MarketStats,
  InstallRecord,
} from './app-market'