// ============================================================
// 殿堂触角 · 触角编排引擎
// 多触角联动、场景感知、自适应布局、触角统计、性能优化
// ============================================================

import { ref, computed, watch } from 'vue'
import { storage } from '../../engine/storage'
import type { WidgetType, GlowConfig, FloatingConfig } from './types'
import { WIDGET_META } from './types'
import { usePerceptionStore } from '../../stores/perception'

// ============================================================
// 类型定义
// ============================================================

/** 触角联动规则 */
export interface LinkageRule {
  /** 规则 ID */
  id: string
  /** 规则名称 */
  name: string
  /** 触发触角类型 */
  sourceType: 'widget' | 'glow' | 'greeting' | 'notification'
  /** 触发条件 */
  trigger: LinkageTrigger
  /** 目标触角动作 */
  targets: LinkageTarget[]
  /** 是否启用 */
  enabled: boolean
  /** 优先级 */
  priority: number
  /** 冷却时间（毫秒） */
  cooldown: number
  /** 上次触发时间 */
  lastTriggeredAt: string | null
}

/** 联动触发条件 */
export interface LinkageTrigger {
  /** 触发类型 */
  type: 'state-change' | 'time-based' | 'user-action' | 'scene-switch'
  /** 触发参数 */
  params: Record<string, any>
}

/** 联动目标 */
export interface LinkageTarget {
  /** 目标触角类型 */
  targetType: 'widget' | 'glow' | 'greeting' | 'notification'
  /** 目标动作 */
  action: 'show' | 'hide' | 'update' | 'animate' | 'pause' | 'resume' | 'intensify' | 'dim'
  /** 动作参数 */
  params: Record<string, any>
  /** 延迟执行（毫秒） */
  delay: number
}

/** 场景上下文 */
export interface SceneContext {
  /** 场景类型 */
  type: 'focus' | 'rest' | 'morning-ritual' | 'evening-review' | 'creative' | 'social' | 'idle' | 'custom'
  /** 场景名称 */
  name: string
  /** 活跃的应用 */
  activeApp: string | null
  /** 当前时间 */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  /** 是否在专注模式 */
  isFocusing: boolean
  /** 是否在休息 */
  isResting: boolean
  /** 系统空闲时间（毫秒） */
  idleTime: number
  /** 屏幕尺寸 */
  screenSize: { width: number; height: number }
  /** 自定义上下文 */
  custom: Record<string, any>

  // —— 以下为 P2 感知层注入字段（由感知采集器经 updateScene 写入；后端库存于 custom 之外，便于类型消费）——
  /** 系统是否暗色（感知层） */
  isDark?: boolean
  /** 网络是否在线（感知层） */
  isOnline?: boolean
  /** 电量 0-1（感知层；null=不可用） */
  batteryLevel?: number | null
  /** 是否充电中（感知层；null=不可用） */
  isCharging?: boolean | null
  /** 是否低电量模式（感知层） */
  isLowPower?: boolean
  /** 设备自上次可见活动起的空闲毫秒数（感知层） */
  deviceIdleMs?: number
  /** 是否判定为用户闲置（感知层） */
  isUserIdle?: boolean
  /** 数据来源（降级标识） */
  perceptionSource?: 'tauri' | 'web'
}

/** 场景预设 */
export interface ScenePreset {
  /** 预设 ID */
  id: string
  /** 场景类型 */
  type: SceneContext['type']
  /** 预设名称 */
  name: string
  /** 描述 */
  description: string
  /** 推荐的小组件配置 */
  widgetConfig: {
    /** 显示的小组件类型 */
    visibleTypes: WidgetType[]
    /** 隐藏的小组件类型 */
    hiddenTypes: WidgetType[]
  }
  /** 光痕配置覆盖 */
  glowOverride: Partial<GlowConfig>
  /** 浮窗配置覆盖 */
  floatingOverride: Partial<FloatingConfig>
}

/** 自适应布局配置 */
export interface AdaptiveLayout {
  /** 布局 ID */
  id: string
  /** 屏幕尺寸范围 */
  screenRange: {
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
  }
  /** 布局名称 */
  name: string
  /** 列数 */
  columns: number
  /** 行数 */
  rows: number
  /** 间距（px） */
  gap: number
  /** 内边距（px） */
  padding: number
  /** 最大小组件数 */
  maxWidgets: number
  /** 小组件尺寸映射 */
  sizeMapping: Record<WidgetType, 'small' | 'medium' | 'large'>
}

/** 触角统计 */
export interface TouchpointStats {
  /** 统计 ID */
  id: string
  /** 统计周期 */
  period: 'daily' | 'weekly' | 'monthly'
  /** 触角类型 */
  touchpointType: 'widget' | 'glow' | 'greeting' | 'notification'
  /** 展示次数 */
  impressions: number
  /** 交互次数 */
  interactions: number
  /** 交互率 */
  interactionRate: number
  /** 平均展示时长（毫秒） */
  avgDisplayDuration: number
  /** 峰值时段 */
  peakHour: number
  /** 用户偏好 */
  userPreferences: {
    /** 偏好的触角类型 */
    preferredTypes: string[]
    /** 偏好的时段 */
    preferredTimes: string[]
    /** 禁用频率 */
    dismissRate: number
  }
  /** 统计时间 */
  timestamp: string
}

/** 性能指标 */
export interface PerformanceMetrics {
  /** 渲染时间（毫秒） */
  renderTime: number
  /** 内存使用（MB） */
  memoryUsage: number
  /** 活跃触角数 */
  activeTouchpoints: number
  /** 帧率 */
  fps: number
  /** 是否流畅 */
  isSmooth: boolean
  /** 性能等级 */
  grade: 'excellent' | 'good' | 'fair' | 'poor'
  /** 优化建议 */
  suggestions: string[]
}

/** 编排引擎配置 */
export interface OrchestrationConfig {
  /** 是否启用联动 */
  linkageEnabled: boolean
  /** 是否启用场景感知 */
  sceneAwarenessEnabled: boolean
  /** 是否启用自适应布局 */
  adaptiveLayoutEnabled: boolean
  /** 统计收集间隔（分钟） */
  statsInterval: number
  /** 性能监控间隔（毫秒） */
  perfMonitorInterval: number
  /** 最大同时活跃触角数 */
  maxActiveTouchpoints: number
  /** 性能降级阈值（FPS） */
  perfDegradeThreshold: number
}

// ============================================================
// 常量
// ============================================================

/** 默认编排配置 */
export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
  linkageEnabled: true,
  sceneAwarenessEnabled: true,
  adaptiveLayoutEnabled: true,
  statsInterval: 60,
  perfMonitorInterval: 5000,
  maxActiveTouchpoints: 8,
  perfDegradeThreshold: 30,
}

/** 场景预设 */
export const SCENE_PRESETS: Omit<ScenePreset, 'id'>[] = [
  {
    type: 'focus',
    name: '专注模式',
    description: '专注时只显示番茄钟，光痕增强，问候静默',
    widgetConfig: {
      visibleTypes: ['pomodoro'],
      hiddenTypes: ['daily-anchor', 'emotion-check', 'quick-note', 'weather', 'quote'],
    },
    glowOverride: { enabled: true, enhanceOnFocus: true, intensity: 0.9, speed: 6000 },
    floatingOverride: { enabled: false },
  },
  {
    type: 'rest',
    name: '休息模式',
    description: '休息时显示天气和每日一言，光痕柔和',
    widgetConfig: {
      visibleTypes: ['weather', 'quote'],
      hiddenTypes: ['pomodoro', 'daily-anchor', 'emotion-check', 'quick-note'],
    },
    glowOverride: { enabled: true, intensity: 0.3, speed: 12000, theme: 'zen' },
    floatingOverride: { enabled: false, animation: 'fade', displayDuration: 5000 },
  },
  {
    type: 'morning-ritual',
    name: '晨间仪式',
    description: '清晨显示心锚和情绪速记，问候浮窗开启',
    widgetConfig: {
      visibleTypes: ['daily-anchor', 'emotion-check', 'quote'],
      hiddenTypes: ['pomodoro', 'quick-note', 'weather'],
    },
    glowOverride: { enabled: true, theme: 'aurora', intensity: 0.6, speed: 10000 },
    floatingOverride: { enabled: false, greetingMode: 'morning', animation: 'slide-up', displayDuration: 10000 },
  },
  {
    type: 'evening-review',
    name: '晚间回顾',
    description: '晚上显示速记便签和心锚，光痕如星光',
    widgetConfig: {
      visibleTypes: ['quick-note', 'daily-anchor', 'quote'],
      hiddenTypes: ['pomodoro', 'emotion-check', 'weather'],
    },
    glowOverride: { enabled: true, theme: 'starlight', intensity: 0.5, speed: 8000 },
    floatingOverride: { enabled: false, greetingMode: 'evening', animation: 'fade', displayDuration: 8000 },
  },
  {
    type: 'creative',
    name: '创意模式',
    description: '创意工作时显示速记便签，光痕如萤火',
    widgetConfig: {
      visibleTypes: ['quick-note', 'quote'],
      hiddenTypes: ['pomodoro', 'daily-anchor', 'emotion-check', 'weather'],
    },
    glowOverride: { enabled: true, theme: 'firefly', intensity: 0.4, speed: 4000 },
    floatingOverride: { enabled: false },
  },
  {
    type: 'idle',
    name: '空闲模式',
    description: '空闲时显示所有触角，性能优化',
    widgetConfig: {
      visibleTypes: ['weather', 'quote'],
      hiddenTypes: ['pomodoro', 'daily-anchor', 'emotion-check', 'quick-note'],
    },
    glowOverride: { enabled: true, theme: 'zen', intensity: 0.2, speed: 15000 },
    floatingOverride: { enabled: false },
  },
]

/** 自适应布局预设 */
export const ADAPTIVE_LAYOUTS: Omit<AdaptiveLayout, 'id'>[] = [
  {
    screenRange: { minWidth: 0, maxWidth: 640, minHeight: 0, maxHeight: Infinity },
    name: '移动端布局',
    columns: 2,
    rows: 3,
    gap: 8,
    padding: 12,
    maxWidgets: 4,
    sizeMapping: {
      pomodoro: 'small',
      'daily-anchor': 'medium',
      'emotion-check': 'small',
      'quick-note': 'medium',
      weather: 'small',
      quote: 'small',
    },
  },
  {
    screenRange: { minWidth: 641, maxWidth: 1024, minHeight: 0, maxHeight: Infinity },
    name: '平板布局',
    columns: 3,
    rows: 3,
    gap: 12,
    padding: 16,
    maxWidgets: 6,
    sizeMapping: {
      pomodoro: 'medium',
      'daily-anchor': 'medium',
      'emotion-check': 'small',
      'quick-note': 'large',
      weather: 'small',
      quote: 'small',
    },
  },
  {
    screenRange: { minWidth: 1025, maxWidth: 1440, minHeight: 0, maxHeight: Infinity },
    name: '桌面布局',
    columns: 4,
    rows: 3,
    gap: 16,
    padding: 20,
    maxWidgets: 8,
    sizeMapping: {
      pomodoro: 'medium',
      'daily-anchor': 'large',
      'emotion-check': 'small',
      'quick-note': 'large',
      weather: 'medium',
      quote: 'small',
    },
  },
  {
    screenRange: { minWidth: 1441, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity },
    name: '宽屏布局',
    columns: 5,
    rows: 3,
    gap: 20,
    padding: 24,
    maxWidgets: 10,
    sizeMapping: {
      pomodoro: 'large',
      'daily-anchor': 'large',
      'emotion-check': 'medium',
      'quick-note': 'large',
      weather: 'medium',
      quote: 'medium',
    },
  },
]

/** 预设联动规则 */
export const PRESET_LINKAGE_RULES: Omit<LinkageRule, 'id' | 'lastTriggeredAt'>[] = [
  {
    name: '专注开始-光痕增强',
    sourceType: 'widget',
    trigger: { type: 'state-change', params: { widget: 'pomodoro', state: 'started' } },
    targets: [
      { targetType: 'glow', action: 'intensify', params: { intensity: 0.9 }, delay: 0 },
      { targetType: 'greeting', action: 'hide', params: {}, delay: 500 },
      { targetType: 'notification', action: 'pause', params: {}, delay: 0 },
    ],
    enabled: true,
    priority: 10,
    cooldown: 5000,
  },
  {
    name: '专注结束-问候恢复',
    sourceType: 'widget',
    trigger: { type: 'state-change', params: { widget: 'pomodoro', state: 'completed' } },
    targets: [
      { targetType: 'glow', action: 'dim', params: { intensity: 0.5 }, delay: 1000 },
      { targetType: 'greeting', action: 'show', params: { period: 'afternoon' }, delay: 2000 },
      { targetType: 'notification', action: 'resume', params: {}, delay: 0 },
    ],
    enabled: true,
    priority: 8,
    cooldown: 3000,
  },
  {
    name: '场景切换-联动',
    sourceType: 'greeting',
    trigger: { type: 'scene-switch', params: { from: 'any', to: 'focus' } },
    targets: [
      { targetType: 'widget', action: 'update', params: { visibleTypes: ['pomodoro'] }, delay: 0 },
      { targetType: 'glow', action: 'intensify', params: { intensity: 0.8 }, delay: 300 },
    ],
    enabled: true,
    priority: 5,
    cooldown: 10000,
  },
  {
    name: '夜间-全部静默',
    sourceType: 'notification',
    trigger: { type: 'time-based', params: { hour: 22, minute: 0 } },
    targets: [
      { targetType: 'glow', action: 'dim', params: { intensity: 0.1 }, delay: 0 },
      { targetType: 'greeting', action: 'hide', params: {}, delay: 0 },
      { targetType: 'notification', action: 'pause', params: {}, delay: 0 },
    ],
    enabled: true,
    priority: 3,
    cooldown: 3600000,
  },
  {
    name: '晨间-全部唤醒',
    sourceType: 'notification',
    trigger: { type: 'time-based', params: { hour: 7, minute: 0 } },
    targets: [
      { targetType: 'glow', action: 'show', params: { theme: 'aurora', intensity: 0.6 }, delay: 0 },
      { targetType: 'greeting', action: 'show', params: { period: 'morning' }, delay: 1000 },
      { targetType: 'notification', action: 'resume', params: {}, delay: 0 },
    ],
    enabled: true,
    priority: 3,
    cooldown: 3600000,
  },
]

/** 存储键 */
const ORCHESTRATION_CONFIG_KEY = 'hf:touchpoints:orchestration-config'
const LINKAGE_RULES_KEY = 'hf:touchpoints:linkage-rules'
const SCENE_PRESETS_KEY = 'hf:touchpoints:scene-presets'
const STATS_KEY = 'hf:touchpoints:stats'
const ADAPTIVE_LAYOUTS_KEY = 'hf:touchpoints:adaptive-layouts'

// ============================================================
// 触角编排引擎
// ============================================================

export function useOrchestrationEngine() {
  // ---- 状态 ----
  const orchestrationConfig = ref<OrchestrationConfig>(loadOrchestrationConfig())
  const linkageRules = ref<LinkageRule[]>(loadLinkageRules())
  const scenePresets = ref<ScenePreset[]>(loadScenePresets())
  const stats = ref<TouchpointStats[]>(loadStats())
  const adaptiveLayouts = ref<AdaptiveLayout[]>(loadAdaptiveLayouts())
  const performanceMetrics = ref<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    activeTouchpoints: 0,
    fps: 60,
    isSmooth: true,
    grade: 'excellent',
    suggestions: [],
  })

  /** 当前场景上下文 */
  const currentScene = ref<SceneContext>({
    type: 'idle',
    name: '空闲',
    activeApp: null,
    timeOfDay: 'morning',
    isFocusing: false,
    isResting: false,
    idleTime: 0,
    screenSize: { width: 1920, height: 1080 },
    custom: {},
  })

  /** 冷却中的联动规则 */
  const cooldownMap = new Map<string, number>()

  // ---- P2 感知层接入 ----
  // 让本编排实例自动消费「感知 store」这一统一真源（规避多实例陷阱，无需调用方手动 updateScene）。
  // 仅同步感知字段，场景 type 仍由 detectScene 在一处统一推导（低电量/夜间暗色分支已在 detectScene 内）。
  try {
    const perceptionStore = usePerceptionStore()
    watch(
      () => perceptionStore.environment,
      (env) => {
        updateScene({
          isDark: env.isDark,
          isOnline: env.isOnline,
          batteryLevel: env.batteryLevel,
          isCharging: env.isCharging,
          isLowPower: env.isLowPower,
          deviceIdleMs: env.deviceIdleMs,
          isUserIdle: env.isUserIdle,
          timeOfDay: env.timeOfDay,
          perceptionSource: env.source,
        })
        // 闲置时间也反映到原 idleTime 字段，供 detectScene 的 idle 分支使用
        currentScene.value.idleTime = env.deviceIdleMs
      },
      { immediate: true, deep: true },
    )
  } catch {
    // Pinia 未激活（非组件上下文）时跳过；运行期必在组件内激活
  }

  // ---- 持久化 ----

  function loadOrchestrationConfig(): OrchestrationConfig {
    try {
      const raw = storage.getKV<string>(ORCHESTRATION_CONFIG_KEY, '')
      if (!raw) return { ...DEFAULT_ORCHESTRATION_CONFIG }
      return { ...DEFAULT_ORCHESTRATION_CONFIG, ...JSON.parse(raw) }
    } catch { return { ...DEFAULT_ORCHESTRATION_CONFIG } }
  }
  function saveOrchestrationConfig() {
    storage.setKV(ORCHESTRATION_CONFIG_KEY, JSON.stringify(orchestrationConfig.value))
  }

  function loadLinkageRules(): LinkageRule[] {
    try {
      const raw = storage.getKV<string>(LINKAGE_RULES_KEY, '')
      if (!raw) {
        return PRESET_LINKAGE_RULES.map((r, i) => ({
          ...r,
          id: `linkage_rule_${i}`,
          lastTriggeredAt: null,
        }))
      }
      return JSON.parse(raw)
    } catch {
      return PRESET_LINKAGE_RULES.map((r, i) => ({
        ...r,
        id: `linkage_rule_${i}`,
        lastTriggeredAt: null,
      }))
    }
  }
  function saveLinkageRules() {
    storage.setKV(LINKAGE_RULES_KEY, JSON.stringify(linkageRules.value))
  }

  function loadScenePresets(): ScenePreset[] {
    try {
      const raw = storage.getKV<string>(SCENE_PRESETS_KEY, '')
      if (!raw) {
        return SCENE_PRESETS.map((p, i) => ({
          ...p,
          id: `scene_preset_${i}`,
        }))
      }
      return JSON.parse(raw)
    } catch {
      return SCENE_PRESETS.map((p, i) => ({
        ...p,
        id: `scene_preset_${i}`,
      }))
    }
  }
  function saveScenePresets() {
    storage.setKV(SCENE_PRESETS_KEY, JSON.stringify(scenePresets.value))
  }

  function loadStats(): TouchpointStats[] {
    try { return JSON.parse(storage.getKV<string>(STATS_KEY, '[]')) } catch { return [] }
  }
  function saveStats() {
    // 限制统计记录数量
    const maxStats = 500
    if (stats.value.length > maxStats) {
      stats.value = stats.value.slice(-maxStats)
    }
    storage.setKV(STATS_KEY, JSON.stringify(stats.value))
  }

  function loadAdaptiveLayouts(): AdaptiveLayout[] {
    try {
      const raw = storage.getKV<string>(ADAPTIVE_LAYOUTS_KEY, '')
      if (!raw) {
        return ADAPTIVE_LAYOUTS.map((l, i) => ({
          ...l,
          id: `adaptive_layout_${i}`,
        }))
      }
      return JSON.parse(raw)
    } catch {
      return ADAPTIVE_LAYOUTS.map((l, i) => ({
        ...l,
        id: `adaptive_layout_${i}`,
      }))
    }
  }
  function saveAdaptiveLayouts() {
    storage.setKV(ADAPTIVE_LAYOUTS_KEY, JSON.stringify(adaptiveLayouts.value))
  }

  // ---- 计算属性 ----

  /** 当前场景预设 */
  const activeScenePreset = computed(() =>
    scenePresets.value.find(p => p.type === currentScene.value.type)
  )

  /** 当前自适应布局 */
  const activeLayout = computed(() => {
    const { width, height } = currentScene.value.screenSize
    return adaptiveLayouts.value.find(
      l =>
        width >= l.screenRange.minWidth &&
        width <= l.screenRange.maxWidth &&
        height >= l.screenRange.minHeight &&
        height <= l.screenRange.maxHeight
    )
  })

  /** 活跃的联动规则 */
  const activeLinkageRules = computed(() =>
    linkageRules.value.filter(r => r.enabled && !isInCooldown(r.id))
  )

  /** 需要显示的小组件类型 */
  const visibleWidgetTypes = computed(() => {
    if (!activeScenePreset.value) return Object.keys(WIDGET_META) as WidgetType[]
    return activeScenePreset.value.widgetConfig.visibleTypes
  })

  /** 绩效统计摘要 */
  const statsSummary = computed(() => {
    const daily = stats.value.filter(s => s.period === 'daily')
    const totalImpressions = daily.reduce((sum, s) => sum + s.impressions, 0)
    const totalInteractions = daily.reduce((sum, s) => sum + s.interactions, 0)
    const avgRate = daily.length > 0
      ? daily.reduce((sum, s) => sum + s.interactionRate, 0) / daily.length
      : 0
    return { totalImpressions, totalInteractions, avgRate, recordCount: daily.length }
  })

  // ---- 场景感知 ----

  /** 更新场景上下文 */
  function updateScene(partial: Partial<SceneContext>): void {
    const previousType = currentScene.value.type
    currentScene.value = { ...currentScene.value, ...partial }

    // 自动判断时段
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) currentScene.value.timeOfDay = 'morning'
    else if (hour >= 12 && hour < 17) currentScene.value.timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 22) currentScene.value.timeOfDay = 'evening'
    else currentScene.value.timeOfDay = 'night'

    // 场景切换时触发联动
    if (orchestrationConfig.value.sceneAwarenessEnabled && previousType !== currentScene.value.type) {
      triggerSceneSwitch(previousType, currentScene.value.type)
      applyScenePreset()
    }
  }

  /** 检测当前场景 */
  function detectScene(): SceneContext['type'] {
    const hour = new Date().getHours()
    if (currentScene.value.isFocusing) return 'focus'
    if (currentScene.value.isResting) return 'rest'
    if (hour >= 5 && hour < 9) return 'morning-ritual'
    if (hour >= 18 && hour < 22) return 'evening-review'
    // —— P2 感知分支：低电量或深夜暗色 → 收敛到休息/夜间静默，降低打扰 ——
    if (currentScene.value.isLowPower) return 'rest'
    if ((hour >= 22 || hour < 5) && currentScene.value.isDark) return 'rest'
    if (currentScene.value.idleTime > 300000) return 'idle'
    return 'idle'
  }

  /** 应用场景预设 */
  function applyScenePreset(): void {
    const preset = activeScenePreset.value
    if (!preset || !orchestrationConfig.value.sceneAwarenessEnabled) return

    // 更新当前场景
    currentScene.value.type = preset.type
    currentScene.value.name = preset.name
  }

  /** 触发场景切换联动 */
  function triggerSceneSwitch(from: SceneContext['type'], to: SceneContext['type']): void {
    for (const rule of activeLinkageRules.value) {
      if (
        rule.trigger.type === 'scene-switch' &&
        (rule.trigger.params.from === 'any' || rule.trigger.params.from === from) &&
        rule.trigger.params.to === to
      ) {
        executeLinkageRule(rule)
      }
    }
  }

  // ---- 多触角联动 ----

  /** 检查规则是否在冷却中 */
  function isInCooldown(ruleId: string): boolean {
    const cooldownEnd = cooldownMap.get(ruleId)
    if (!cooldownEnd) return false
    return Date.now() < cooldownEnd
  }

  /** 执行联动规则 */
  function executeLinkageRule(rule: LinkageRule): void {
    if (!orchestrationConfig.value.linkageEnabled) return
    if (isInCooldown(rule.id)) return

    // 设置冷却
    cooldownMap.set(rule.id, Date.now() + rule.cooldown)

    // 更新触发时间
    rule.lastTriggeredAt = new Date().toISOString()
    saveLinkageRules()

    // 执行目标动作（按优先级排序）
    const sortedTargets = [...rule.targets].sort((a, b) => {
      const priorityMap: Record<string, number> = {
        hide: 10, pause: 9, dim: 8, show: 5, resume: 4, intensify: 3, update: 2, animate: 1,
      }
      return (priorityMap[b.action] ?? 0) - (priorityMap[a.action] ?? 0)
    })

    for (const target of sortedTargets) {
      setTimeout(() => {
        executeTargetAction(target)
      }, target.delay)
    }
  }

  /** 执行目标动作 */
  function executeTargetAction(target: LinkageTarget): void {
    // 动作由外部系统响应（widget-manager, glow-engine, greeting-engine, notification-engine）
    // 编排引擎通过回调函数通知外部系统
    const callback = actionCallbacks.get(target.targetType)
    if (callback) {
      callback(target.action, target.params)
    }
  }

  /** 动作回调映射 */
  const actionCallbacks = new Map<string, (action: string, params: Record<string, any>) => void>()

  /** 注册动作回调 */
  function registerActionCallback(
    touchpointType: string,
    callback: (action: string, params: Record<string, any>) => void,
  ): void {
    actionCallbacks.set(touchpointType, callback)
  }

  /** 手动触发联动规则 */
  function triggerLinkage(ruleId: string): void {
    const rule = linkageRules.value.find(r => r.id === ruleId)
    if (rule && rule.enabled) {
      executeLinkageRule(rule)
    }
  }

  /** 手动触发状态变更联动 */
  function triggerStateChange(sourceType: string, state: Record<string, any>): void {
    for (const rule of activeLinkageRules.value) {
      if (
        rule.sourceType === sourceType &&
        rule.trigger.type === 'state-change'
      ) {
        const params = rule.trigger.params
        const matches = Object.entries(params).every(([key, value]) => state[key] === value)
        if (matches) {
          executeLinkageRule(rule)
        }
      }
    }
  }

  // ---- 联动规则管理 ----

  /** 添加联动规则 */
  function addLinkageRule(rule: Omit<LinkageRule, 'id' | 'lastTriggeredAt'>): LinkageRule {
    const newRule: LinkageRule = {
      ...rule,
      id: `linkage_rule_${Date.now()}`,
      lastTriggeredAt: null,
    }
    linkageRules.value.push(newRule)
    saveLinkageRules()
    return newRule
  }

  /** 更新联动规则 */
  function updateLinkageRule(id: string, partial: Partial<LinkageRule>): LinkageRule | null {
    const idx = linkageRules.value.findIndex(r => r.id === id)
    if (idx === -1) return null
    linkageRules.value[idx] = { ...linkageRules.value[idx], ...partial }
    saveLinkageRules()
    return linkageRules.value[idx]
  }

  /** 删除联动规则 */
  function deleteLinkageRule(id: string): boolean {
    const idx = linkageRules.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    linkageRules.value.splice(idx, 1)
    saveLinkageRules()
    return true
  }

  /** 切换联动规则启用状态 */
  function toggleLinkageRule(id: string): LinkageRule | null {
    const rule = linkageRules.value.find(r => r.id === id)
    if (!rule) return null
    rule.enabled = !rule.enabled
    saveLinkageRules()
    return rule
  }

  /** 重置联动规则为预设 */
  function resetLinkageRules(): void {
    linkageRules.value = PRESET_LINKAGE_RULES.map((r, i) => ({
      ...r,
      id: `linkage_rule_${i}`,
      lastTriggeredAt: null,
    }))
    saveLinkageRules()
  }

  // ---- 场景预设管理 ----

  /** 添加场景预设 */
  function addScenePreset(preset: Omit<ScenePreset, 'id'>): ScenePreset {
    const newPreset: ScenePreset = {
      ...preset,
      id: `scene_preset_${Date.now()}`,
    }
    scenePresets.value.push(newPreset)
    saveScenePresets()
    return newPreset
  }

  /** 更新场景预设 */
  function updateScenePreset(id: string, partial: Partial<ScenePreset>): ScenePreset | null {
    const idx = scenePresets.value.findIndex(p => p.id === id)
    if (idx === -1) return null
    scenePresets.value[idx] = { ...scenePresets.value[idx], ...partial }
    saveScenePresets()
    return scenePresets.value[idx]
  }

  /** 删除场景预设 */
  function deleteScenePreset(id: string): boolean {
    const idx = scenePresets.value.findIndex(p => p.id === id)
    if (idx === -1) return false
    scenePresets.value.splice(idx, 1)
    saveScenePresets()
    return true
  }

  // ---- 自适应布局 ----

  /** 根据屏幕尺寸选择布局 */
  function selectLayout(width: number, height: number): AdaptiveLayout | null {
    return adaptiveLayouts.value.find(
      l =>
        width >= l.screenRange.minWidth &&
        width <= l.screenRange.maxWidth &&
        height >= l.screenRange.minHeight &&
        height <= l.screenRange.maxHeight
    ) ?? null
  }

  /** 更新屏幕尺寸 */
  function updateScreenSize(width: number, height: number): void {
    currentScene.value.screenSize = { width, height }
  }

  /** 添加自适应布局 */
  function addAdaptiveLayout(layout: Omit<AdaptiveLayout, 'id'>): AdaptiveLayout {
    const newLayout: AdaptiveLayout = {
      ...layout,
      id: `adaptive_layout_${Date.now()}`,
    }
    adaptiveLayouts.value.push(newLayout)
    saveAdaptiveLayouts()
    return newLayout
  }

  /** 更新自适应布局 */
  function updateAdaptiveLayout(id: string, partial: Partial<AdaptiveLayout>): AdaptiveLayout | null {
    const idx = adaptiveLayouts.value.findIndex(l => l.id === id)
    if (idx === -1) return null
    adaptiveLayouts.value[idx] = { ...adaptiveLayouts.value[idx], ...partial }
    saveAdaptiveLayouts()
    return adaptiveLayouts.value[idx]
  }

  /** 删除自适应布局 */
  function deleteAdaptiveLayout(id: string): boolean {
    const idx = adaptiveLayouts.value.findIndex(l => l.id === id)
    if (idx === -1) return false
    adaptiveLayouts.value.splice(idx, 1)
    saveAdaptiveLayouts()
    return true
  }

  // ---- 触角统计 ----

  /** 记录展示 */
  function recordImpression(
    touchpointType: TouchpointStats['touchpointType'],
    duration: number = 0,
  ): void {
    const today = new Date().toISOString().slice(0, 10)
    let dailyStat = stats.value.find(
      s => s.period === 'daily' && s.touchpointType === touchpointType && s.timestamp.startsWith(today)
    )

    if (!dailyStat) {
      dailyStat = {
        id: `stat_${Date.now()}`,
        period: 'daily',
        touchpointType,
        impressions: 0,
        interactions: 0,
        interactionRate: 0,
        avgDisplayDuration: 0,
        peakHour: 0,
        userPreferences: {
          preferredTypes: [],
          preferredTimes: [],
          dismissRate: 0,
        },
        timestamp: new Date().toISOString(),
      }
      stats.value.push(dailyStat)
    }

    dailyStat.impressions++
    if (duration > 0) {
      dailyStat.avgDisplayDuration =
        (dailyStat.avgDisplayDuration * (dailyStat.impressions - 1) + duration) / dailyStat.impressions
    }
    dailyStat.peakHour = new Date().getHours()

    saveStats()
  }

  /** 记录交互 */
  function recordInteraction(touchpointType: TouchpointStats['touchpointType']): void {
    const today = new Date().toISOString().slice(0, 10)
    let dailyStat = stats.value.find(
      s => s.period === 'daily' && s.touchpointType === touchpointType && s.timestamp.startsWith(today)
    )

    if (!dailyStat) {
      recordImpression(touchpointType)
      dailyStat = stats.value.find(
        s => s.period === 'daily' && s.touchpointType === touchpointType && s.timestamp.startsWith(today)
      )
    }

    if (dailyStat) {
      dailyStat.interactions++
      dailyStat.interactionRate =
        dailyStat.impressions > 0
          ? Math.round((dailyStat.interactions / dailyStat.impressions) * 100) / 100
          : 0
    }

    saveStats()
  }

  /** 获取触角统计 */
  function getStats(
    touchpointType?: TouchpointStats['touchpointType'],
    period?: TouchpointStats['period'],
    limit = 30,
  ): TouchpointStats[] {
    let result = stats.value
    if (touchpointType) result = result.filter(s => s.touchpointType === touchpointType)
    if (period) result = result.filter(s => s.period === period)
    return result.slice(-limit)
  }

  /** 获取统计摘要 */
  function getStatsSummary(): {
    byType: Record<string, { impressions: number; interactions: number; rate: number }>
    total: { impressions: number; interactions: number; rate: number }
  } {
    const daily = stats.value.filter(s => s.period === 'daily')
    const byType: Record<string, { impressions: number; interactions: number; rate: number }> = {}

    for (const s of daily) {
      if (!byType[s.touchpointType]) {
        byType[s.touchpointType] = { impressions: 0, interactions: 0, rate: 0 }
      }
      byType[s.touchpointType].impressions += s.impressions
      byType[s.touchpointType].interactions += s.interactions
    }

    for (const type of Object.keys(byType)) {
      const t = byType[type]
      t.rate = t.impressions > 0 ? Math.round((t.interactions / t.impressions) * 100) / 100 : 0
    }

    const total = {
      impressions: Object.values(byType).reduce((s, t) => s + t.impressions, 0),
      interactions: Object.values(byType).reduce((s, t) => s + t.interactions, 0),
      rate: 0,
    }
    total.rate = total.impressions > 0
      ? Math.round((total.interactions / total.impressions) * 100) / 100
      : 0

    return { byType, total }
  }

  /** 清除统计 */
  function clearStats(): void {
    stats.value = []
    saveStats()
  }

  // ---- 性能优化 ----

  /** 性能监控 */
  function monitorPerformance(): PerformanceMetrics {
    const activeCount = stats.value.filter(s => {
      const today = new Date().toISOString().slice(0, 10)
      return s.timestamp.startsWith(today) && s.impressions > 0
    }).length

    const metrics: PerformanceMetrics = {
      renderTime: performance.now() % 16, // 模拟渲染时间
      memoryUsage: 0,
      activeTouchpoints: activeCount,
      fps: 60,
      isSmooth: true,
      grade: 'excellent',
      suggestions: [],
    }

    // 性能评估
    if (activeCount > orchestrationConfig.value.maxActiveTouchpoints) {
      metrics.isSmooth = false
      metrics.grade = 'fair'
      metrics.suggestions.push(`活跃触角数(${activeCount})超过限制(${orchestrationConfig.value.maxActiveTouchpoints})，建议减少`)
    }

    if (metrics.renderTime > 16) {
      metrics.grade = 'poor'
      metrics.suggestions.push('渲染时间过长，建议优化动画效果')
    }

    if (metrics.fps < orchestrationConfig.value.perfDegradeThreshold) {
      metrics.grade = 'poor'
      metrics.suggestions.push(`帧率(${metrics.fps})低于阈值(${orchestrationConfig.value.perfDegradeThreshold})，建议降级`)
    }

    performanceMetrics.value = metrics
    return metrics
  }

  /** 性能降级 */
  function degradePerformance(): void {
    // 减少活跃触角数
    orchestrationConfig.value.maxActiveTouchpoints = Math.max(
      2,
      orchestrationConfig.value.maxActiveTouchpoints - 2
    )
    // 降低动画速度
    orchestrationConfig.value.perfMonitorInterval *= 2
    saveOrchestrationConfig()
  }

  /** 性能恢复 */
  function restorePerformance(): void {
    orchestrationConfig.value.maxActiveTouchpoints = DEFAULT_ORCHESTRATION_CONFIG.maxActiveTouchpoints
    orchestrationConfig.value.perfMonitorInterval = DEFAULT_ORCHESTRATION_CONFIG.perfMonitorInterval
    saveOrchestrationConfig()
  }

  // ---- 编排配置管理 ----

  /** 更新编排配置 */
  function updateOrchestrationConfig(partial: Partial<OrchestrationConfig>): void {
    orchestrationConfig.value = { ...orchestrationConfig.value, ...partial }
    saveOrchestrationConfig()
  }

  /** 重置编排配置 */
  function resetOrchestrationConfig(): void {
    orchestrationConfig.value = { ...DEFAULT_ORCHESTRATION_CONFIG }
    saveOrchestrationConfig()
  }

  // ---- 清理 ----

  function destroy(): void {
    actionCallbacks.clear()
    cooldownMap.clear()
  }

  return {
    // 状态
    orchestrationConfig,
    linkageRules,
    scenePresets,
    stats,
    adaptiveLayouts,
    performanceMetrics,
    currentScene,

    // 计算属性
    activeScenePreset,
    activeLayout,
    activeLinkageRules,
    visibleWidgetTypes,
    statsSummary,

    // 场景
    updateScene,
    detectScene,
    applyScenePreset,

    // 联动
    executeLinkageRule,
    registerActionCallback,
    triggerLinkage,
    triggerStateChange,

    // 联动规则管理
    addLinkageRule,
    updateLinkageRule,
    deleteLinkageRule,
    toggleLinkageRule,
    resetLinkageRules,

    // 场景预设管理
    addScenePreset,
    updateScenePreset,
    deleteScenePreset,

    // 自适应布局
    selectLayout,
    updateScreenSize,
    addAdaptiveLayout,
    updateAdaptiveLayout,
    deleteAdaptiveLayout,

    // 统计
    recordImpression,
    recordInteraction,
    getStats,
    getStatsSummary,
    clearStats,

    // 性能
    monitorPerformance,
    degradePerformance,
    restorePerformance,

    // 配置
    updateOrchestrationConfig,
    resetOrchestrationConfig,

    // 清理
    destroy,
  }
}

