// ============================================================
// 殿堂触角 · 模块入口
// 统一导出桌面小组件、锁屏光痕、幕僚问候浮窗
// ============================================================

export { useWidgetManager } from './widget-manager'
export { useGlowEngine } from './glow-engine'
export { useGreetingEngine } from './greeting-engine'

// ---- 通知引擎 ----
export { useNotificationEngine, DEFAULT_NOTIFICATION_PREFERENCES, DEFAULT_NOTIFICATION_RULES, NOTIFICATION_TYPE_META, NOTIFICATION_PRIORITY_META } from './notification-engine'
export type {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  Notification,
  NotificationRule,
  NotificationPreferences,
  NotificationStats,
} from './notification-engine'

export {
  WIDGET_META,
  GLOW_THEME_META,
  DEFAULT_GLOW_CONFIG,
  DEFAULT_FLOATING_CONFIG,
  DEFAULT_GREETING_TEMPLATES,
  TOUCHPOINTS_STORAGE_KEYS,
  WIDGET_ACCENT_PRESETS,
  DEFAULT_WIDGET_THEME,
  resolveWidgetTheme,
  widgetThemeVars,
} from './types'

export type {
  WidgetType,
  WidgetSize,
  WidgetInstance,
  WidgetMeta,
  WidgetTheme,
  GlowTheme,
  GlowThemeMeta,
  GlowConfig,
  FloatingPosition,
  FloatingAnimation,
  GreetingPeriod,
  GreetingTemplate,
  FloatingConfig,
} from './types'

// ---- 触角编排引擎（P15-2） ----
export { useOrchestrationEngine, DEFAULT_ORCHESTRATION_CONFIG, SCENE_PRESETS, ADAPTIVE_LAYOUTS, PRESET_LINKAGE_RULES } from './orchestration-engine'
export type {
  LinkageRule,
  LinkageTrigger,
  LinkageTarget,
  SceneContext,
  ScenePreset,
  AdaptiveLayout,
  TouchpointStats,
  PerformanceMetrics,
  OrchestrationConfig,
} from './orchestration-engine'

// ---- 通知触达策略引擎（P17-3） ----
export { useDeliveryStrategy, PRESET_STRATEGIES, DEFAULT_BEHAVIOR_PROFILE } from './notification-strategy'
export type {
  DeliveryPriority,
  DeliveryStrategy,
  PushChannelType,
  DeliveryQueueItem,
  UserBehaviorProfile,
  DeliveryStats,
  ABTestVariant,
  ABTest,
} from './notification-strategy'

// ---- 多通道推送引擎（P17-3） ----
export { usePushChannel, CHANNEL_CAPABILITIES, CHANNEL_LABELS, CHANNEL_ICONS, DEFAULT_CHANNEL_CONFIGS } from './push-channel'
export type {
  ChannelCapability,
  ChannelConfig,
  PushResult,
  PushRequest,
  PushRecord,
} from './push-channel'

// ---- 触达分析与优化（P17-3） ----
export { useTouchAnalytics } from './touch-analytics'
export type {
  FunnelStage,
  DeliveryFunnel,
  HourlyPerformance,
  ChannelPerformance,
  OptimizationSuggestion,
  TrendAnalysis,
  DeliveryReport,
} from './touch-analytics'

// ---- A/B 测试引擎（P20-6） ----
export { useABTestEngine, METRIC_LABELS, METRIC_DIRECTION, EXPERIMENT_TEMPLATES, estimateSampleSize } from './ab-test-engine'
export type {
  ExperimentStatus,
  ABExperiment,
  ExperimentMetric,
  VariantMetrics,
  SignificanceResult,
  ExperimentReport,
  ExperimentTemplate,
} from './ab-test-engine'

// ---- 自适应渠道优化器（P20-6） ----
export { useChannelOptimizer } from './channel-optimizer'
export type {
  OptimizationAction,
  ChannelOptimizationSuggestion,
  ChannelScore,
  ChannelComboRecommendation,
  TimeSlotOptimization,
  OptimizationRecord,
  OptimizerState,
} from './channel-optimizer'