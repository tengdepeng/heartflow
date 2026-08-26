// ============================================================
// 殿堂装修工坊 · 环境模板系统 & 场景序列引擎
// 蓝图定义：
//   环境模板预设库，场景序列编排（多环境状态间的过渡动画）
//   支持环境快照、场景序列播放、过渡效果配置
// ============================================================

// ---- 环境模板 ----

export interface EnvironmentTemplate {
  id: string
  name: string
  description: string
  /** 背景氛围预设ID */
  atmosphere: AtmospherePreset
  /** 环境光色 */
  accentColor: string
  accentColorRgb: string
  /** 显示密度 */
  density: 'compact' | 'standard' | 'spacious'
  /** 字体偏好 */
  fontPreference: 'serif' | 'sans-serif' | 'monospace'
  /** 过渡动画 */
  transition: 'fade' | 'slide' | 'none'
  /** 标签 */
  tags: string[]
  /** 是否为内置模板 */
  builtin: boolean
  createdAt: string
}

export type AtmospherePreset =
  | 'default-warm'
  | 'dark-quiet'
  | 'bright-fresh'
  | 'natural-green'
  | 'ocean-blue'
  | 'sunset-amber'
  | 'midnight-purple'
  | 'forest-mist'
  | 'desert-sand'
  | 'aurora-borealis'

export const ATMOSPHERE_LABELS: Record<AtmospherePreset, string> = {
  'default-warm': '默认暖色',
  'dark-quiet': '深色静谧',
  'bright-fresh': '明亮清新',
  'natural-green': '自然绿意',
  'ocean-blue': '海洋蓝调',
  'sunset-amber': '日落琥珀',
  'midnight-purple': '午夜紫韵',
  'forest-mist': '森林薄雾',
  'desert-sand': '沙漠金沙',
  'aurora-borealis': '极光幻境',
}

export const ATMOSPHERE_COLORS: Record<AtmospherePreset, { accent: string; rgb: string }> = {
  'default-warm': { accent: '#f0c040', rgb: '240, 192, 64' },
  'dark-quiet': { accent: '#6c9cf5', rgb: '108, 156, 245' },
  'bright-fresh': { accent: '#34d399', rgb: '52, 211, 153' },
  'natural-green': { accent: '#4ade80', rgb: '74, 222, 128' },
  'ocean-blue': { accent: '#38bdf8', rgb: '56, 189, 248' },
  'sunset-amber': { accent: '#f59e6c', rgb: '245, 158, 108' },
  'midnight-purple': { accent: '#a78bfa', rgb: '167, 139, 250' },
  'forest-mist': { accent: '#86efac', rgb: '134, 239, 172' },
  'desert-sand': { accent: '#fbbf24', rgb: '251, 191, 36' },
  'aurora-borealis': { accent: '#67e8f9', rgb: '103, 232, 249' },
}

// ---- 内置环境模板 ----

export const BUILTIN_TEMPLATES: EnvironmentTemplate[] = [
  {
    id: 'env_default_warm',
    name: '暖琥珀',
    description: '经典暖色调，适合日常使用',
    atmosphere: 'default-warm',
    accentColor: '#f0c040',
    accentColorRgb: '240, 192, 64',
    density: 'standard',
    fontPreference: 'sans-serif',
    transition: 'fade',
    tags: ['经典', '日常', '暖色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_dark_quiet',
    name: '深夜食堂',
    description: '深色静谧氛围，适合夜间专注',
    atmosphere: 'dark-quiet',
    accentColor: '#6c9cf5',
    accentColorRgb: '108, 156, 245',
    density: 'compact',
    fontPreference: 'sans-serif',
    transition: 'fade',
    tags: ['夜间', '专注', '深色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_bright_fresh',
    name: '晨光初照',
    description: '明亮清新，适合晨间复盘',
    atmosphere: 'bright-fresh',
    accentColor: '#34d399',
    accentColorRgb: '52, 211, 153',
    density: 'spacious',
    fontPreference: 'serif',
    transition: 'slide',
    tags: ['早晨', '清新', '明亮'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_natural_green',
    name: '林间小径',
    description: '自然绿意，适合阅读与思考',
    atmosphere: 'natural-green',
    accentColor: '#4ade80',
    accentColorRgb: '74, 222, 128',
    density: 'standard',
    fontPreference: 'serif',
    transition: 'fade',
    tags: ['自然', '阅读', '绿色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_ocean_blue',
    name: '深海潜行',
    description: '海洋蓝调，适合深度工作',
    atmosphere: 'ocean-blue',
    accentColor: '#38bdf8',
    accentColorRgb: '56, 189, 248',
    density: 'compact',
    fontPreference: 'monospace',
    transition: 'none',
    tags: ['工作', '深度', '蓝色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_sunset_amber',
    name: '落日余晖',
    description: '日落琥珀，适合黄昏放松',
    atmosphere: 'sunset-amber',
    accentColor: '#f59e6c',
    accentColorRgb: '245, 158, 108',
    density: 'standard',
    fontPreference: 'sans-serif',
    transition: 'fade',
    tags: ['黄昏', '放松', '暖色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_midnight_purple',
    name: '午夜紫韵',
    description: '紫韵氛围，适合冥想与创作',
    atmosphere: 'midnight-purple',
    accentColor: '#a78bfa',
    accentColorRgb: '167, 139, 250',
    density: 'compact',
    fontPreference: 'serif',
    transition: 'fade',
    tags: ['冥想', '创作', '紫色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_forest_mist',
    name: '雾林晨光',
    description: '森林薄雾，适合慢节奏阅读',
    atmosphere: 'forest-mist',
    accentColor: '#86efac',
    accentColorRgb: '134, 239, 172',
    density: 'spacious',
    fontPreference: 'serif',
    transition: 'slide',
    tags: ['阅读', '慢节奏', '自然'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_desert_sand',
    name: '大漠金沙',
    description: '沙漠暖金，适合记录与书写',
    atmosphere: 'desert-sand',
    accentColor: '#fbbf24',
    accentColorRgb: '251, 191, 36',
    density: 'standard',
    fontPreference: 'sans-serif',
    transition: 'none',
    tags: ['记录', '书写', '金色'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'env_aurora_borealis',
    name: '极光幻境',
    description: '极光渐变，适合创意与头脑风暴',
    atmosphere: 'aurora-borealis',
    accentColor: '#67e8f9',
    accentColorRgb: '103, 232, 249',
    density: 'spacious',
    fontPreference: 'monospace',
    transition: 'slide',
    tags: ['创意', '头脑风暴', '极光'],
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

// ---- 模板管理 ----

/** 创建自定义环境模板 */
export function createTemplate(
  name: string,
  atmosphere: AtmospherePreset,
  options: Partial<Pick<EnvironmentTemplate, 'description' | 'density' | 'fontPreference' | 'transition' | 'tags'>> = {},
): EnvironmentTemplate {
  const colors = ATMOSPHERE_COLORS[atmosphere]
  return {
    id: `env_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    description: options.description || '',
    atmosphere,
    accentColor: colors.accent,
    accentColorRgb: colors.rgb,
    density: options.density || 'standard',
    fontPreference: options.fontPreference || 'sans-serif',
    transition: options.transition || 'fade',
    tags: options.tags || [],
    builtin: false,
    createdAt: new Date().toISOString(),
  }
}

/** 更新模板 */
export function updateTemplate(
  template: EnvironmentTemplate,
  updates: Partial<Pick<EnvironmentTemplate, 'name' | 'description' | 'atmosphere' | 'density' | 'fontPreference' | 'transition' | 'tags'>>,
): EnvironmentTemplate {
  const result = { ...template, ...updates }
  if (updates.atmosphere) {
    const colors = ATMOSPHERE_COLORS[updates.atmosphere]
    result.accentColor = colors.accent
    result.accentColorRgb = colors.rgb
  }
  return result
}

// ============================================================
// 场景序列引擎
// ============================================================

/** 场景序列中的一个场景步骤 */
export interface SceneStep {
  id: string
  /** 环境模板ID */
  templateId: string
  /** 本场景持续时间（毫秒） */
  duration: number
  /** 过渡效果 */
  transition: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom' | 'none'
  /** 过渡持续时间（毫秒） */
  transitionDuration: number
  /** 触发条件 */
  trigger?: SceneTrigger
  /** 标签 */
  label?: string
}

/** 场景触发条件 */
export interface SceneTrigger {
  type: 'time' | 'event' | 'condition' | 'manual'
  /** 时间触发：HH:mm 格式 */
  time?: string
  /** 事件触发：事件名称 */
  event?: string
  /** 条件触发：JavaScript 表达式 */
  condition?: string
}

/** 场景序列 */
export interface SceneSequence {
  id: string
  name: string
  description: string
  /** 场景步骤列表 */
  steps: SceneStep[]
  /** 是否循环 */
  loop: boolean
  /** 是否启用 */
  enabled: boolean
  /** 当前步骤索引 */
  currentStepIndex: number
  /** 是否正在播放 */
  playing: boolean
  createdAt: string
  updatedAt: string
}

// ---- 场景序列管理 ----

/** 创建场景序列 */
export function createSequence(
  name: string,
  description: string = '',
  loop: boolean = false,
): SceneSequence {
  const now = new Date().toISOString()
  return {
    id: `seq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    description,
    steps: [],
    loop,
    enabled: false,
    currentStepIndex: -1,
    playing: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** 添加场景步骤 */
export function addStep(
  sequence: SceneSequence,
  templateId: string,
  duration: number,
  transition: SceneStep['transition'] = 'fade',
  transitionDuration: number = 500,
  options: Partial<Pick<SceneStep, 'trigger' | 'label'>> = {},
): SceneSequence {
  const step: SceneStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    templateId,
    duration,
    transition,
    transitionDuration,
    trigger: options.trigger,
    label: options.label,
  }
  return {
    ...sequence,
    steps: [...sequence.steps, step],
    updatedAt: new Date().toISOString(),
  }
}

/** 移除场景步骤 */
export function removeStep(sequence: SceneSequence, stepId: string): SceneSequence {
  return {
    ...sequence,
    steps: sequence.steps.filter(s => s.id !== stepId),
    updatedAt: new Date().toISOString(),
  }
}

/** 重新排序场景步骤 */
export function reorderSteps(sequence: SceneSequence, fromIndex: number, toIndex: number): SceneSequence {
  const steps = [...sequence.steps]
  const [moved] = steps.splice(fromIndex, 1)
  steps.splice(toIndex, 0, moved)
  return {
    ...sequence,
    steps,
    updatedAt: new Date().toISOString(),
  }
}

/** 获取序列总时长 */
export function getSequenceDuration(sequence: SceneSequence): number {
  return sequence.steps.reduce((total, step) => total + step.duration + step.transitionDuration, 0)
}

/** 获取当前步骤 */
export function getCurrentStep(sequence: SceneSequence): SceneStep | null {
  if (sequence.currentStepIndex < 0 || sequence.currentStepIndex >= sequence.steps.length) return null
  return sequence.steps[sequence.currentStepIndex] || null
}

/** 前进到下一步 */
export function advanceStep(sequence: SceneSequence): SceneSequence {
  let next = sequence.currentStepIndex + 1
  if (next >= sequence.steps.length) {
    next = sequence.loop ? 0 : -1
  }
  return {
    ...sequence,
    currentStepIndex: next,
    playing: next >= 0,
    updatedAt: new Date().toISOString(),
  }
}

// ---- 预设场景序列 ----

export const BUILTIN_SEQUENCES: SceneSequence[] = [
  {
    id: 'seq_day_cycle',
    name: '一日循环',
    description: '从晨光到午夜的氛围演变',
    steps: [
      { id: 'seq_day_1', templateId: 'env_bright_fresh', duration: 4 * 60 * 60 * 1000, transition: 'fade', transitionDuration: 2000, label: '早晨' },
      { id: 'seq_day_2', templateId: 'env_default_warm', duration: 4 * 60 * 60 * 1000, transition: 'fade', transitionDuration: 2000, label: '上午' },
      { id: 'seq_day_3', templateId: 'env_ocean_blue', duration: 4 * 60 * 60 * 1000, transition: 'fade', transitionDuration: 2000, label: '下午' },
      { id: 'seq_day_4', templateId: 'env_sunset_amber', duration: 2 * 60 * 60 * 1000, transition: 'fade', transitionDuration: 2000, label: '黄昏' },
      { id: 'seq_day_5', templateId: 'env_dark_quiet', duration: 6 * 60 * 60 * 1000, transition: 'fade', transitionDuration: 3000, label: '夜晚' },
      { id: 'seq_day_6', templateId: 'env_midnight_purple', duration: 4 * 60 * 60 * 1000, transition: 'fade', transitionDuration: 3000, label: '深夜' },
    ],
    loop: true,
    enabled: false,
    currentStepIndex: -1,
    playing: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seq_focus_sprint',
    name: '专注冲刺',
    description: '快速切换专注环境，适合番茄钟',
    steps: [
      { id: 'seq_focus_1', templateId: 'env_default_warm', duration: 25 * 60 * 1000, transition: 'fade', transitionDuration: 1000, label: '专注中' },
      { id: 'seq_focus_2', templateId: 'env_ocean_blue', duration: 25 * 60 * 1000, transition: 'fade', transitionDuration: 1000, label: '深度专注' },
      { id: 'seq_focus_3', templateId: 'env_natural_green', duration: 5 * 60 * 1000, transition: 'slide-left', transitionDuration: 800, label: '休息' },
    ],
    loop: true,
    enabled: false,
    currentStepIndex: -1,
    playing: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seq_creative_flow',
    name: '创意流动',
    description: '从自然到极光的灵感激发序列',
    steps: [
      { id: 'seq_creative_1', templateId: 'env_forest_mist', duration: 30 * 60 * 1000, transition: 'fade', transitionDuration: 1500, label: '放松' },
      { id: 'seq_creative_2', templateId: 'env_desert_sand', duration: 20 * 60 * 1000, transition: 'fade', transitionDuration: 1500, label: '书写' },
      { id: 'seq_creative_3', templateId: 'env_aurora_borealis', duration: 30 * 60 * 1000, transition: 'zoom', transitionDuration: 2000, label: '创作' },
    ],
    loop: false,
    enabled: false,
    currentStepIndex: -1,
    playing: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

// ---- 环境快照 ----

export interface EnvironmentSnapshot {
  id: string
  name: string
  /** 关联的模板ID */
  templateId: string
  /** 快照时的完整配置 */
  config: Record<string, any>
  /** 截图描述 */
  description: string
  createdAt: string
}

/** 创建环境快照 */
export function createSnapshot(
  name: string,
  templateId: string,
  config: Record<string, any>,
  description: string = '',
): EnvironmentSnapshot {
  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    templateId,
    config,
    description,
    createdAt: new Date().toISOString(),
  }
}