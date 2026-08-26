/**
 * 感知层 · 类型定义
 *
 * 这是 P2 唯一真正空白的核心层（蓝图第六部分「环境与氛围系统」+ 第八层「殿堂的触角」的上游数据源）。
 * 职责：把**原始环境/系统/设备信号**采集为一个统一的 EnvironmentState，供编排引擎、氛围引擎订阅消费。
 *
 * 设计约束：
 * - 仅承载"机器可观测的原始信号"，不承载"场景分类"（场景分类由 orchestration 的 detectScene 统一推导）。
 * - 对所有信号做 feature-detect，拿不到就填默认值 / null，**绝不抛错或阻断渲染**。
 * - 与 platform.ts 边界清晰：platform 是"我是谁/在哪跑"的静态身份，感知是"环境现在怎样"的动态状态。
 */

/** 时段分类 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/** 数据源（降级标识） */
export type PerceptionSource = 'tauri' | 'web'

/** 系统主题（Tauri 专属） */
export type SystemTheme = 'light' | 'dark'

/**
 * 健康数据摘要——仅存储脱敏摘要，不存原始数值。
 * 遵守宪法第4条"只是呈现，不评判"：此处仅存方向性趋势，不存具体指标值。
 */
export interface HealthSummary {
  /** 步数趋势：'more' | 'same' | 'less' | null（相对于昨日） */
  stepsTrend: 'more' | 'same' | 'less' | null
  /** 心率趋势：'higher' | 'stable' | 'lower' | null（相对于昨日） */
  heartRateTrend: 'higher' | 'stable' | 'lower' | null
  /** 睡眠时长趋势：'longer' | 'same' | 'shorter' | null（相对于昨日） */
  sleepTrend: 'longer' | 'same' | 'shorter' | null
  /** 数据来源 */
  source: 'manual' | 'healthkit' | 'google_fit' | null
  /** 最后同步时间戳（ms） */
  lastSynced: number | null
}

/**
 * 环境感知状态——单一真源。
 * 每一个可能缺失的信号都用 `| null` 表达"不可用"，UI 与下游据此降级。
 */
export interface EnvironmentState {
  /** 当前小时 0-23（来自 Date） */
  hour: number
  /** 时段（由 hour 推导） */
  timeOfDay: TimeOfDay

  /** 系统是否暗色（prefers-color-scheme: dark） */
  isDark: boolean

  /** 网络是否在线（navigator.onLine） */
  isOnline: boolean

  /** 电量 0-1；null = 不可用（浏览器/系统未提供） */
  batteryLevel: number | null
  /** 是否充电中；null = 不可用 */
  isCharging: boolean | null

  /** 设备自上次可见活动起的空闲毫秒数 */
  deviceIdleMs: number
  /** 是否判定为用户闲置（deviceIdleMs 超过阈值） */
  isUserIdle: boolean

  /** 是否低电量模式（低电量且未充电，或用户省电）。驱动氛围降频/降亮度 */
  isLowPower: boolean

  /** 活跃应用（Tauri 专属；web 恒为 null） */
  activeApp: string | null
  /** 活跃窗口标题（Tauri 专属；web 恒为 null） */
  activeWindowTitle: string | null

  /** 是否处于专注（由 runtime 圣所状态等权威来源派生，默认值 false） */
  isFocusing: boolean

  // —— P2 感知层增强字段 ——

  /** 环境光强度 (lux)；null = 不可用（浏览器未提供 AmbientLightSensor API） */
  ambientLight: number | null
  /** 屏幕是否常亮（wakeLock 激活或页面可见） */
  isScreenAwake: boolean
  /** 系统主题（Tauri 专属；web 用 matchMedia 替代，保持 null） */
  systemTheme: SystemTheme | null
  /** 系统音量 0-1；null = 不可用 */
  systemVolume: number | null

  /** 健康数据摘要（脱敏趋势，不存原始值）；null = 不可用或无数据 */
  healthSummary: HealthSummary | null

  /** 数据来源（降级标识） */
  source: PerceptionSource
  /** 最后更新时间戳（ms） */
  lastUpdated: number
}

/** 判断闲置的默认阈值（5 分钟，与 orchestration detectScene 的 idleTime 阈值对齐） */
export const DEFAULT_IDLE_THRESHOLD_MS = 300_000

/**
 * 由前台窗口标题派生「活跃应用」信号（蓝图第995行系统级感知层语义：本应用上下文内的活跃位置）。
 * 应用内 webview 能拿到的"前台应用"即当前窗口标题；空标题视为无信号 → null。
 * 纯函数，便于单测与降级渲染（web 恒为 null）。
 */
export function deriveActiveApp(activeWindowTitle: string | null): string | null {
  return activeWindowTitle && activeWindowTitle.length > 0 ? activeWindowTitle : null
}

/** 默认低电量阈值（电量 ≤ 20% 且未充电视为低电量） */
export const DEFAULT_LOW_POWER_LEVEL = 0.2

/** 感知轮询 tick 间隔（ms）——仅用于刷新时段/闲置/时间戳，事件型信号走各自监听器 */
export const PERCEPTION_TICK_MS = 15_000

/** 由小时推导时段 */
export function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

/** 创建默认（全降级）环境状态 */
export function createDefaultEnvironmentState(source: PerceptionSource = 'web'): EnvironmentState {
  const now = new Date()
  return {
    hour: now.getHours(),
    timeOfDay: timeOfDayFromHour(now.getHours()),
    isDark: false,
    isOnline: true,
    batteryLevel: null,
    isCharging: null,
    deviceIdleMs: 0,
    isUserIdle: false,
    isLowPower: false,
    activeApp: null,
    activeWindowTitle: null,
    isFocusing: false,
    ambientLight: null,
    isScreenAwake: true,
    systemTheme: null,
    systemVolume: null,
    healthSummary: null,
    source,
    lastUpdated: Date.now(),
  }
}
