// ============================================================
// 心流工坊 · 核心类型系统
// Phase 1: 内核类型定义
// ============================================================

/** 专注状态 */
export type FocusStatus = 'idle' | 'focusing' | 'paused' | 'completed' | 'interrupted'

/**
 * 三级操作模式（宪法第2条·超级自定义 的用户体验表达）
 * - silent 静默执行：系统安静地自动完成主动动作/自动化流程，不打扰（默认，对齐宪法"默认静默"）。
 * - confirm 执行前确认：主动动作/自动化流程先进入待确认队列，由用户点头才执行。
 * - suggest 仅建议：只提示建议，从不自动执行。
 */
export type OperationMode = 'silent' | 'confirm' | 'suggest'

/** 专注模式 */
export type FocusMode = 'focus' | 'nap' | 'free' | 'pomodoro' | 'countdown' | 'countup'

/** 载体类型 */
export type CarrierType = 'jade-bead' | 'crystal' | 'custom'

import type { GestureBindings } from '../modules/gesture/contracts'

// ---- 计时系统 ----

export interface TimerConfig {
  /** 默认专注时长（分钟） */
  defaultDuration: number
  /** 休息时长（分钟） */
  breakDuration: number
  /** 长休息时长（分钟） */
  longBreakDuration: number
  /** 多少个专注后长休息 */
  sessionsBeforeLongBreak: number
  /** 是否启用自动开始 */
  autoStart: boolean
}

export interface FocusSession {
  id: string
  status: FocusStatus
  mode: FocusMode
  /** 计划时长（毫秒） */
  plannedDuration: number
  /** 实际消耗（毫秒） */
  elapsed: number
  /** 开始时间 */
  startedAt: string | null
  /** 暂停累计（毫秒） */
  pausedDuration: number
  /** 当前这次暂停开始的时间 */
  pausedAt: string | null
  /** 结束时间 */
  completedAt: string | null
  /** 标签 */
  tags: string[]
  /** 备注 */
  note: string
  /** 载体 ID */
  carrierId: string | null
  /** 是否已软归档（data:cleanup 手动整理，仅标记、非硬删、可逆） */
  archived?: boolean
}

// ---- 时间结晶 ----

export interface TimeCrystal {
  id: string
  /** 关联的专注会话 ID */
  sessionId: string
  /** 结晶颜色 */
  color: string
  /** 结晶大小/强度 (0-1) */
  intensity: number
  /** 生成时间 */
  createdAt: string
  /** 结晶形状 */
  shape: CrystalShape
  /** 关联标签 */
  tags: string[]
  /** 解锁的感悟/备注 */
  insight: string | null
}

export type CrystalShape = 'sphere' | 'tetrahedron' | 'octahedron' | 'dodecahedron' | 'irregular'

// ---- 玉珠载体 ----

/** 载体生命周期阶段 */
export type LifecycleStage = 'newborn' | 'growing' | 'mature' | 'aging' | 'retired'

export interface JadeBeadCarrier {
  id: string
  name: string
  /** 载体类型 */
  type: CarrierType
  /** 当前珠数 */
  beadCount: number
  /** 最大珠数 */
  maxBeads: number
  /** 当前段数 */
  segment: number
  /** 颜色配置 */
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  /** 是否激活 */
  active: boolean
  /** 关联幕僚 ID */
  advisorId: string | null
  /** 载体形态：圆球/结晶/火焰/种子 */
  shape?: 'orb' | 'crystal' | 'flame' | 'seed'
  /** 光效列表：辉光/脉动/粒子 */
  effects?: string[]
  /** 绑定专注类型 */
  focusType?: string
  /** 创建时间 */
  createdAt: string
  /** 生命周期阶段 */
  lifecycleStage: LifecycleStage
  /** 最后使用时间 */
  lastUsedAt: string | null
  /** 使用次数 */
  usageCount: number
  /** 继承的目标载体 ID */
  inheritedTo: string | null
  /** 继承的来源载体 ID */
  inheritedFrom: string | null
}

// ---- 宪法 ----

/** 宪法不可变条款（前4条，硬编码不可修改） */
export interface ImmutableRule {
  id: string
  title: string
  description: string
  icon: string
  type: 'value'
}

/** 可变规则（用户自定义 + 官方弹性条款） */
export interface MutableRule {
  id: string
  title: string
  description: string
  type: 'value' | 'behavior' | 'limit' | 'ritual'
  /** 是否启用 */
  enabled: boolean
  /** 排序权重 */
  order: number
  /** 是否为官方弹性宪法条款（第 5-42 条） */
  isDefault?: boolean
  /** 宪法条款编号（仅默认条款有） */
  articleNumber?: number
  /** 行为追踪（针对 behavior/ritual 类型） */
  tracking?: {
    count: number
    target: number
    period: 'daily' | 'weekly' | 'monthly'
    lastReset: string | null
  }
}

export interface Constitution {
  /** 宪法版本 */
  version: string
  /** 名称 */
  name: string
  /** 宪法序言 */
  preamble: string
  /** 不可变规则（4条核心，始终存在） */
  immutableRules: ImmutableRule[]
  /** 可修改规则（用户自定义） */
  mutableRules: MutableRule[]
  /** 签名/创建时间 */
  createdAt: string
  /** 最后修改时间 */
  updatedAt: string
}

// ---- 幕僚体系 —— 全部迁至 types/advisor.ts ----

import type { AdvisorProfile } from './advisor'

/** @deprecated 旧版幕僚接口，已迁移至 AdvisorProfile，留作存储迁移兼容 */
export interface Advisor {
  id: string
  name: string
  role: string
  /** 载体配置 */
  carrierConfig: Partial<JadeBeadCarrier>
  /** 是否解锁 */
  unlocked: boolean
}

// 新版幕僚全套类型
export * from './advisor'

// ---- 风格包 ----

export interface StylePack {
  id: string
  name: string
  version: string
  /** 主题色 */
  theme: {
    mode: 'dark' | 'light'
    colors: {
      accent: string
      bgPrimary: string
      bgSecondary: string
      textPrimary: string
      textSecondary: string
      border: string
    }
  }
  /** 字体 */
  fonts: {
    display: string
    body: string
    mono: string
  }
  /** 动画配置 */
  animations: {
    breathingSpeed: number
    particleDensity: number
  }
}

export type PresetScene = 'forest-dawn' | 'coast-starlight' | 'autumn-courtyard' | 'rainy-window' | 'mountain-cloud' | 'snowy-night' | 'none'

/** 场景预设 */
export interface ScenePreset {
  id: string
  name: string
  background: BackgroundMediaConfig
  createdAt: string
  updatedAt: string
}

export interface BackgroundMediaConfig {
  type: 'default' | 'image' | 'video' | 'preset'
  presetScene: PresetScene
  dataUrl: string | null
  mimeType: string | null
  fileName: string | null
  updatedAt: string | null
  /** 视频背景是否静音；省略或 true 表示静音播放（默认行为），false 表示保留原声 */
  muted?: boolean
}

// ---- 健康配置 ----

export interface HealthConfig {
  exerciseTarget: number
  sleepTarget: number
  sleepMinThreshold: number
  sleepCriticalThreshold: number
  sleepExcellentThreshold: number
}

// ---- 工作日志配置 ----

export interface WorklogConfig {
  overtimeRate: number
  nightRate: number
  defaultStart: string
  defaultEnd: string
  trendDays: number
  trendMonths: number
  recentShiftLimit: number
}

// ---- 显示配置 ----

export interface DisplayConfig {
  trendNoteCount: number
  titleTruncateLength: number
  excerptTruncateLength: number
  tagDisplayCount: number
  statsWindowDays: number
  searchResultLimit: number
  dreamStorageLimit: number
  cleanupThresholdDays: number
  moveTrajectoryCount: number
  healthRecentSleepCount: number
  healthRecentExerciseCount: number
  healthRecentMealCount: number
  noteMaxLength: number
  uploadImageMaxBytes: number
  uploadVideoMaxBytes: number
}

// ---- 可视化配置 ----

export interface VisualizationConfig {
  activeMetaphor: string
  builtinPaletteId: string
  customPalette: string | null
}

// ---- 生命周期配置 ----

export interface LifecycleConfig {
  autoProgression: boolean
  growingThreshold: number
  matureThreshold: number
  agingDays: number
  inheritRatio: number
  segments: number
}

// ---- 幕僚顾问配置 ----

export interface AdvisorConfig {
  dingyinThresholds: Record<string, number[]>
  rateLimitInterval: number
  dailyResponseLimit: number
  bubbleDuration: number
  witnessLogMax: number
  witnessLogDefaultLimit: number
  messageStorageLimit: number
  affinityMax: number
  affinityIncrements: Record<string, number>
  maxAdvisors: number
}

// ---- 世界壳（三层空间）配置类型 ----

/** 底层氛围壳种类（注册表全量：solid / stars / stars-3d / courtyard / courtyard-3d / video / custom） */
export type WorldShellType =
  | 'solid'
  | 'stars'
  | 'stars-3d'
  | 'courtyard'
  | 'courtyard-3d'
  | 'video'
  | 'custom'

/** 中层交互面三态（整屏互斥） */
export type SurfaceState = 'screen' | 'hall-3d' | 'map-2d'

/** 上层浮层实例 */
export interface FloatingLayerState {
  id: string
  title?: string
  source?: string
  x?: number
  y?: number
  visible: boolean
  meta?: Record<string, unknown>
}

/** 壳渲染配置（星辰 / 宅院 2D·3D 切换等；宽松索引供各壳自定义扩展） */
export interface WorldShellShellConfig {
  starsMode?: '2d' | '3d'
  courtyardMode?: '2d' | '3d'
  courtyard3d?: boolean
  [k: string]: unknown
}

/** 世界壳配置切片（config.worldShell 单一真源） */
export interface WorldShellConfig {
  /** 当前底层氛围壳种类 */
  activeShell: WorldShellType
  /** 中层交互面状态 */
  surfaceState: SurfaceState
  /** 壳渲染配置 */
  shellConfig: WorldShellShellConfig
  /** 上层浮层实例注册表 */
  floatingLayers: FloatingLayerState[]
  /** 层切换触发配置（长按 / 手势） */
  switchTrigger?: { key: string; longPressMs: number }
}

// ---- 应用配置 ----

import type { AstrolabeConfig } from '../modules/astrolabe/types'
import type { AIEngineConfig } from '../engine/ai/types'

export interface AppConfig {
  /** 主题模式 */
  theme: 'light' | 'dark' | 'system'
  /** 当前风格包 ID */
  activeStylePack: string
  /** 计时配置 */
  timer: TimerConfig
  /** 交互设置 */
  interaction: {
    /** 启用键盘快捷键 */
    keyboardShortcuts: boolean
    /** 启用触觉反馈 */
    hapticFeedback: boolean
    /** 启用声音 */
    soundEnabled: boolean
  }
  /** 语言 */
  locale: string
  /** 幕僚顾问总开关（关闭后不再弹出任何幕僚对话） */
  advisorEnabled: boolean
  /**
   * 三级操作模式（宪法第2条·超级自定义 的用户体验表达）：
   * - silent 静默执行：系统安静地自动完成主动动作/自动化流程，不打扰（默认，对齐宪法"默认静默"）。
   * - confirm 执行前确认：主动动作/自动化流程先进入待确认队列，由用户点头才执行。
   * - suggest 仅建议：只提示建议，从不自动执行。
   */
  operationMode: OperationMode
  /** 幕僚每日重置日期（YYYY-MM-DD），用于判断是否跨天重置 */
  advisorResetDate: string | null
  /** 用户上次访问日期（YYYY-MM-DD），用于判断离开天数 */
  lastVisitDate: string | null
  /** 主画面自定义背景 */
  background: BackgroundMediaConfig
  /** 手势绑定配置 */
  gestures: {
    bindings: GestureBindings
    /** 采样间隔（ms） */
    sampleInterval: number
    /** 长按阈值（ms） */
    longPressThreshold: number
    /** 最小移动距离（px） */
    minMoveDistance: number
  }
  /** 统计配置 */
  stats: {
    /** 显示统计面板 */
    showPanel: boolean
    /** 显示趋势图 */
    showTrendChart: boolean
    /** 每日专注目标（分钟） */
    dailyGoal: number
    /** 每周专注目标（分钟） */
    weeklyGoal: number
  }
  /** 场景切换过渡时长（ms） */
  transitionDuration: number
  /** 星盘配置 */
  astrolabe: AstrolabeConfig
  /** 生命周期配置 */
  lifecycle: LifecycleConfig
  /** 幕僚顾问配置 */
  advisor: AdvisorConfig
  /** 健康配置 */
  health: HealthConfig
  /** 工作日志配置 */
  worklog: WorklogConfig
  /** 显示配置 */
  display: DisplayConfig
  /** 可视化配置 */
  visualization: VisualizationConfig
  /** 安全岛退出时长（ms） */
  sanctuaryExitDuration: number
  /** 自动化历史上限 */
  automationHistoryLimit: number
  /** 匠庐配置 */
  craft: {
    /** 最近作品显示数量 */
    recentLimit: number
    /** 作品标签显示数量 */
    tagDisplayCount: number
    /** 操作反馈消息超时（ms） */
    messageTimeout: number
  }
  /** AI 引擎配置 */
  ai: AIEngineConfig
  /**
   * 宪法合规覆盖层（第2条 超级自定义）
   * 用户可自由开关每项合规规则，系统尊重用户选择
   * 默认遵守宪法：除 notificationBlocked（无推送，fail-closed 默认 true）外均为 false；
   * 开启对应覆盖后，相关宪法限制不再生效
   */
  complianceOverride: {
    /** 关闭文案中立性检测（允许"你应该"、"你必须"等评价性文案） */
    forbiddenPatterns: boolean
    /** 关闭幕僚静默规则（允许幕僚默认主动问候/推送） */
    advisorEnabled: boolean
    /** 关闭比较性文案检测（允许"比上次"、"比昨天"等比较性表达） */
    comparativePhrases: boolean
    /** 关闭拟人化检测（允许幕僚"他/她觉得"、"他/她认为"等表达） */
    personification: boolean
    /** 允许计时器默认自动开始 */
    autoStartOverwrite: boolean
    /** 允许触觉反馈默认开启 */
    hapticFeedbackOverwrite: boolean
    /**
     * 关闭第4条「只给原材料不给结论」检测（允许幕僚文案出现结论性/评判性表达，
     * 如"建议/推荐/分析结论/诊断/评估/评分"等）。true = 关闭该过滤器，不报告命中。
     */
    dataDriven: boolean
    /**
     * 第5条「无推送」宪法门控：true = 阻断 OS 级通知（浏览器/桌面 OS 通知、弹窗、红点）。
     * 默认 true（fail-closed，遵守无推送原则）；宪法引擎在 elastic-exploration 启用时置 true，
     * 用户关闭该弹性条款（超级自定义）时置 false，恢复允许主动推送。
     */
    notificationBlocked: boolean
    /**
     * 第1条「本地私有·fail-closed」外部 AI 端点显式同意闸：true = 允许向非 localhost 的远程 AI 端点发起请求。
     * 默认 false（fail-closed）：开箱零外部 AI 调用，任何 localhost / 127.0.0.1 / ::1 之外的 AI baseUrl 都会被拦截，
     * 除非用户在此显式开启。本地推理（Ollama / 本地模型等环回地址）永远放行，无需开启此项。
     * 此项属于第1条硬约束的「显式同意」例外，必须由用户在宪法页面主动打开，系统不默认预设任何云端地址。
     */
    allowExternalAI: boolean
  }
  /** 世界壳（三层空间）配置单一真源 */
  worldShell: WorldShellConfig
  /**
   * 用户显式操作过的合规覆盖字段 key 列表（持久化）。
   * reload/重启后据此恢复「用户 touched 优先」语义，避免宪法引擎推导覆盖用户手动设置。
   */
  overrideUserTouched: string[]
}

/** 标签分类节点（树形结构） */
export interface TagCategory {
  id: string
  name: string
  color: string
  children: TagCategory[]
  tags: string[]
}

// ---- 情绪记录 ----

export interface EmotionRecord {
  id: string
  type: 'happy' | 'calm' | 'sad' | 'anxious' | 'angry'
  note: string
  createdAt: string
}

// ---- 笔记 ----

/** 笔记优先级（语丝结构化抽取落库） */
export type NotePriority = 'low' | 'normal' | 'high'

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  /** 是否归档 */
  archived?: boolean
  /** 删除时间（软删除） */
  deletedAt?: string | null
  /** 关联房间（语丝从某房间创建时带上，用于房间级聚合；可空） */
  roomId?: string
  /** 截止时间（语丝抽取的相对/绝对日期，本地 YYYY-MM-DD 或带时间 YYYY-MM-DDTHH:mm:00；可空） */
  due?: string | null
  /** 执行人（@提及或"交给/让"抽取；可空） */
  assignee?: string | null
  /** 优先级（语丝抽取；默认 normal） */
  priority?: NotePriority
  /** 是否原子化笔记：一篇只装一个想法，便于被块级引用直接复用 */
  isAtomic?: boolean
}

// ---- 账本 ----

export type LedgerCategory = 'salary' | 'freelance' | 'investment' | 'gift' | 'other-income'
  | 'food' | 'transport' | 'shopping' | 'entertainment' | 'bills' | 'health' | 'education' | 'other-expense'

export interface LedgerRecord {
  id: string
  type: 'income' | 'expense'
  category: LedgerCategory
  amount: number
  note: string
  at: string
}

// ---- 存储 ----

export interface StorageSchema {
  version: number
  sessions: FocusSession[]
  crystals: TimeCrystal[]
  carriers: JadeBeadCarrier[]
  constitution: Constitution | null
  advisors: AdvisorProfile[]
  config: AppConfig
  emotions: EmotionRecord[]
  notes: Note[]
  /** 逐日心锚数据 */
  anchors: import('../modules/anchor/types').Anchor[]
  /** 留光阁目标数据 */
  goals: import('../modules/goal/types').Goal[]
  /** 羁绊之厅人物数据 */
  relations: import('../modules/relation/types').Person[]
  /** 幕僚消息记录 */
  advisorMessages: { id: string; text: string; at: string; trigger: string }[]
  /** 插件注册表 */
  pluginRegistry?: Record<string, { enabled: boolean; permissions: string[] }>
  /** 戒律之书账本 */
  ledger: LedgerRecord[]
  /** 标签分类树 */
  tagCategories: TagCategory[]
  /** 场景预设列表 */
  scenePresets: any[]
  /**
   * 通用 KV 存储
   * 供房间视图存放非核心数据（梦境、书签、辞典、运动记录等）
   * 所有数据统一纳入 schema，受版本迁移、导入导出、clear() 管理
   */
  kvStore: Record<string, any>
}
