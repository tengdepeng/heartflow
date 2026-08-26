// ============================================================
// 感知层 · 模块入口
// 统一导出采集器、类型定义、宪法合规控制
// ============================================================

export { usePerception, getPerception } from './usePerception'
export type { PerceptionListener } from './usePerception'

export {
  type EnvironmentState,
  type TimeOfDay,
  type PerceptionSource,
  type SystemTheme,
  type HealthSummary,
  timeOfDayFromHour,
  createDefaultEnvironmentState,
  DEFAULT_IDLE_THRESHOLD_MS,
  DEFAULT_LOW_POWER_LEVEL,
  PERCEPTION_TICK_MS,
} from './types'

export {
  USER_CONFIGURABLE_ITEMS,
  ALWAYS_ON_ITEMS,
  PERCEPTION_STORAGE_KEYS,
  isPerceptionAllowed,
  setPerceptionAllowed,
  getAllPerceptionPermissions,
  resetPerceptionPermissions,
} from './compliance'
export type { ConfigurablePerceptionItem } from './compliance'