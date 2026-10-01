// ============================================================
// 殿堂触角 · 类型定义
// 桌面小组件、锁屏光痕、幕僚问候浮窗
// ============================================================

/** 桌面小组件类型 */
export type WidgetType =
  | 'pomodoro'
  | 'daily-anchor'
  | 'emotion-check'
  | 'quick-note'
  | 'weather'
  | 'quote'
  | 'quadrant'
  | 'calendar'
  | 'calendar-heatmap'

/** 小组件尺寸预设 */
export type WidgetSize = 'small' | 'medium' | 'large'

/** 小组件实例 */
export interface WidgetInstance {
  /** 唯一标识 */
  id: string
  /** 小组件类型 */
  type: WidgetType
  /** 桌面位置 x（百分比 0-100） */
  x: number
  /** 桌面位置 y（百分比 0-100） */
  y: number
  /** 尺寸 */
  size: WidgetSize
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: number
  /** 自定义标题 */
  customTitle?: string
  /** 外观主题（颜色/圆角/透明/背景），对齐 136apk「2.130 小组件主题一键切换」 */
  theme?: WidgetTheme
}

/** 小组件外观主题（每个实例可独立定制，经 CSS 变量在卡片外壳生效） */
export interface WidgetTheme {
  /** 强调色（今日高亮/热力着色），默认取品牌琥珀 */
  accent?: string
  /** 卡片圆角（px） */
  radius?: number
  /** 卡片背景透明度（0.4-1） */
  alpha?: number
  /** 卡片背景：空 = 玻璃拟态（跟随外壳），否则为具体色值 */
  bg?: string
}

/** 强调色预设（与全局品牌琥珀系一致，另补几支常用色） */
export const WIDGET_ACCENT_PRESETS: { id: string; label: string; value: string }[] = [
  { id: 'amber', label: '暖琥珀', value: '#d4a15a' },
  { id: 'azure', label: '天青', value: '#6b9fc4' },
  { id: 'jade', label: '玉绿', value: '#5ab8a0' },
  { id: 'rose', label: '霞绯', value: '#c46a5a' },
  { id: 'violet', label: '紫晶', value: '#8a6cd8' },
  { id: 'gold', label: '流金', value: '#e9c46a' },
]

/** 默认主题：玻璃拟态外壳 + 品牌琥珀强调 */
export const DEFAULT_WIDGET_THEME: Required<WidgetTheme> = {
  accent: '#d4a15a',
  radius: 12,
  alpha: 1,
  bg: '',
}

/** 把实例主题补成完整对象（缺失字段回退默认） */
export function resolveWidgetTheme(theme?: WidgetTheme): Required<WidgetTheme> {
  return {
    accent: theme?.accent || DEFAULT_WIDGET_THEME.accent,
    radius: theme?.radius ?? DEFAULT_WIDGET_THEME.radius,
    alpha: theme?.alpha ?? DEFAULT_WIDGET_THEME.alpha,
    bg: theme?.bg ?? DEFAULT_WIDGET_THEME.bg,
  }
}

/** 把主题展开成卡片外壳可用的 CSS 变量（accent/radius/alpha/bg） */
export function widgetThemeVars(theme?: WidgetTheme): Record<string, string> {
  const t = resolveWidgetTheme(theme)
  const vars: Record<string, string> = {
    '--ww-accent': t.accent,
    '--ww-radius': `${t.radius}px`,
    '--ww-alpha': String(t.alpha),
  }
  if (t.bg) vars['--ww-bg'] = t.bg
  return vars
}

/** 小组件元数据 */
export interface WidgetMeta {
  type: WidgetType
  label: string
  labelEn: string
  description: string
  defaultSize: WidgetSize
  icon: string
}

/** 小组件元数据映射 */
export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  pomodoro: {
    type: 'pomodoro',
    label: '番茄钟',
    labelEn: 'Pomodoro',
    description: '桌面浮窗显示当前专注计时',
    defaultSize: 'small',
    icon: '🍅',
  },
  'daily-anchor': {
    type: 'daily-anchor',
    label: '逐日心锚',
    labelEn: 'Daily Anchor',
    description: '显示今日未完成的心锚事项',
    defaultSize: 'medium',
    icon: '⚓',
  },
  'emotion-check': {
    type: 'emotion-check',
    label: '情绪速记',
    labelEn: 'Emotion Check',
    description: '快速记录当前情绪状态',
    defaultSize: 'small',
    icon: '🌸',
  },
  'quick-note': {
    type: 'quick-note',
    label: '速记便签',
    labelEn: 'Quick Note',
    description: '桌面快速记录灵感碎片',
    defaultSize: 'medium',
    icon: '📝',
  },
  weather: {
    type: 'weather',
    label: '气象心情',
    labelEn: 'Weather Mood',
    description: '根据天气推荐心情调节建议',
    defaultSize: 'small',
    icon: '🌤️',
  },
  quote: {
    type: 'quote',
    label: '每日一言',
    labelEn: 'Daily Quote',
    description: '桌面展示一句哲思语录',
    defaultSize: 'small',
    icon: '💬',
  },
  quadrant: {
    type: 'quadrant',
    label: '四象限',
    labelEn: 'Quadrant Board',
    description: '紧急 × 重要 四象限任务分布概览（复用自律工坊任务池）',
    defaultSize: 'medium',
    icon: '🗂️',
  },
  calendar: {
    type: 'calendar',
    label: '月历',
    labelEn: 'Month Calendar',
    description: '整月专注/速记活跃分布，今日高亮、有纪录日标点',
    defaultSize: 'medium',
    icon: '📅',
  },
  'calendar-heatmap': {
    type: 'calendar-heatmap',
    label: '日历热力',
    labelEn: 'Activity Heatmap',
    description: '滚动数周的专注/速记热度图（GitHub 式格阵）',
    defaultSize: 'medium',
    icon: '🔥',
  },
}

// ============================================================
// 锁屏光痕
// ============================================================

/** 光痕主题 */
export type GlowTheme = 'aurora' | 'starlight' | 'heartbeat' | 'zen' | 'firefly' | 'custom'

/** 光痕主题元数据 */
export interface GlowThemeMeta {
  theme: GlowTheme
  label: string
  labelEn: string
  description: string
  /** 默认颜色调色板 */
  palette: string[]
  /** 默认动画速度 (ms) */
  speed: number
  /** 默认强度 (0-1) */
  intensity: number
}

/** 光痕主题元数据映射 */
export const GLOW_THEME_META: Record<GlowTheme, GlowThemeMeta> = {
  aurora: {
    theme: 'aurora',
    label: '极光',
    labelEn: 'Aurora',
    description: '仿极光流动的渐变光痕',
    palette: ['#5ab8a0', '#6b9fc4', '#073b4c'],
    speed: 8000,
    intensity: 0.7,
  },
  starlight: {
    theme: 'starlight',
    label: '星光',
    labelEn: 'Starlight',
    description: '星星点点的闪烁光痕',
    palette: ['#ffd166', '#f4a261', '#e9c46a'],
    speed: 3000,
    intensity: 0.5,
  },
  heartbeat: {
    theme: 'heartbeat',
    label: '心跳',
    labelEn: 'Heartbeat',
    description: '跟随呼吸节奏的脉冲光痕',
    palette: ['#c46a5a', '#f4a261', '#e76f51'],
    speed: 2000,
    intensity: 0.6,
  },
  zen: {
    theme: 'zen',
    label: '禅意',
    labelEn: 'Zen',
    description: '淡雅柔和的水墨光痕',
    palette: ['#a8c4c0', '#6b9fc4', '#2a3540'],
    speed: 12000,
    intensity: 0.3,
  },
  firefly: {
    theme: 'firefly',
    label: '萤火',
    labelEn: 'Firefly',
    description: '萤火虫般飘浮的光点',
    palette: ['#e9c46a', '#f4a261', '#5ab8a0'],
    speed: 5000,
    intensity: 0.4,
  },
  custom: {
    theme: 'custom',
    label: '自定义',
    labelEn: 'Custom',
    description: '自定义光痕参数',
    palette: ['#6b9fc4', '#cf8b6b', '#8a9a7a'],
    speed: 6000,
    intensity: 0.5,
  },
}

/** 光痕配置 */
export interface GlowConfig {
  /** 是否启用 */
  enabled: boolean
  /** 当前主题 */
  theme: GlowTheme
  /** 自定义调色板（仅 theme=custom 时有效） */
  customPalette?: string[]
  /** 动画速度 (ms) */
  speed: number
  /** 强度 (0-1) */
  intensity: number
  /** 定时开启时间（HH:mm 格式，为空表示不启用定时） */
  scheduleStart?: string
  /** 定时关闭时间（HH:mm 格式） */
  scheduleEnd?: string
  /** 专注模式下是否增强 */
  enhanceOnFocus: boolean
}

/** 默认光痕配置 */
export const DEFAULT_GLOW_CONFIG: GlowConfig = {
  enabled: false,
  theme: 'aurora',
  speed: 8000,
  intensity: 0.7,
  enhanceOnFocus: true,
}

// ============================================================
// 幕僚问候浮窗
// ============================================================

/** 浮窗位置 */
export type FloatingPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'

/** 浮窗动画类型 */
export type FloatingAnimation = 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'bounce'

/** 问候时段 */
export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night' | 'auto'

/** 问候模板 */
export interface GreetingTemplate {
  period: GreetingPeriod
  /** 问候语列表 */
  messages: string[]
  /** 副标题列表 */
  subtitles: string[]
}

/** 浮窗配置 */
export interface FloatingConfig {
  /** 是否启用 */
  enabled: boolean
  /** 浮窗位置 */
  position: FloatingPosition
  /** 动画类型 */
  animation: FloatingAnimation
  /** 显示时长 (ms)，0 表示不自动关闭 */
  displayDuration: number
  /** 是否显示幕僚头像 */
  showAvatar: boolean
  /** 问候时段模式 */
  greetingMode: GreetingPeriod
  /** 自定义问候语（覆盖默认模板） */
  customGreetings?: GreetingTemplate[]
  /** 是否在专注模式后显示 */
  showAfterFocus: boolean
  /** 是否在登录时显示 */
  showOnLogin: boolean
}

/** 默认浮窗配置 */
export const DEFAULT_FLOATING_CONFIG: FloatingConfig = {
  enabled: false,
  position: 'top-right',
  animation: 'slide-up',
  displayDuration: 8000,
  showAvatar: true,
  greetingMode: 'auto',
  showAfterFocus: true,
  showOnLogin: true,
}

/** 默认问候模板 */
export const DEFAULT_GREETING_TEMPLATES: GreetingTemplate[] = [
  {
    period: 'morning',
    messages: [
      '早安，新的一天开始了。',
      '清晨的阳光正好，适合播种。',
      '今天的第一缕光，为你而来。',
      '晨光熹微，万物苏醒。',
    ],
    subtitles: [
      '今日心锚已就绪',
      '昨日收获了 {count} 个专注时刻',
      '你的情绪花房等待浇灌',
      '新的一天，新的可能',
    ],
  },
  {
    period: 'afternoon',
    messages: [
      '午后时光，稍作休憩。',
      '阳光正好，继续前行。',
      '一杯茶，一段思绪。',
      '下午的节奏，由你掌控。',
    ],
    subtitles: [
      '已完成今日 {percent}% 的心锚',
      '专注时长累计 {minutes} 分钟',
      '午后小憩一下也不错',
      '继续加油，你做得很好',
    ],
  },
  {
    period: 'evening',
    messages: [
      '黄昏时分，适合回顾。',
      '夕阳西下，一天的收获满满。',
      '晚风轻拂，思绪沉淀。',
      '今天的你，辛苦了。',
    ],
    subtitles: [
      '今日专注 {count} 次',
      '回顾今日，为明天播种',
      '写下今天的感悟吧',
      '夜将至，心可安',
    ],
  },
  {
    period: 'night',
    messages: [
      '夜深了，该休息了。',
      '星月为伴，好梦。',
      '一天的尾声，感恩今日。',
      '万物入眠，你也该歇了。',
    ],
    subtitles: [
      '今日旅程已结束',
      '明日心锚等待着你',
      '晚安，心流旅人',
      '让思绪在梦中舒展',
    ],
  },
]

// ============================================================
// 存储键
// ============================================================

export const TOUCHPOINTS_STORAGE_KEYS = {
  widgets: 'hf:touchpoints:widgets',
  glow: 'hf:touchpoints:glow',
  floating: 'hf:touchpoints:floating',
} as const