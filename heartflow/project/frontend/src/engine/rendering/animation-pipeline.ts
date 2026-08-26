// ============================================================
// 呈现引擎 · 动画协调管线
// 蓝图定义：
//   管理动画生命周期：注册 → 排队 → 播放 → 完成 → 清理
//   支持动画组、序列动画、并行动画、过渡动画
// ============================================================

import type {
  AnimationEntry,
  AnimationProperty,
  EasingType,
} from './types'

// ---- 动画构建器 ----

export interface AnimationBuilder {
  id: string
  name: string
  target: string
  duration: number
  delay: number
  easing: EasingType
  properties: AnimationProperty[]
  loop: boolean
  loopCount: number
  reverse: boolean
  onStart?: () => void
  onUpdate?: (progress: number) => void
  onComplete?: () => void
  onCancel?: () => void
}

/** 创建动画构建器 */
export function createAnimation(id: string, name: string, target: string): AnimationBuilder {
  return {
    id,
    name,
    target,
    duration: 300,
    delay: 0,
    easing: 'ease-out',
    properties: [],
    loop: false,
    loopCount: 0,
    reverse: false,
  }
}

/** 设置持续时间 */
export function withDuration(builder: AnimationBuilder, ms: number): AnimationBuilder {
  return { ...builder, duration: Math.max(0, ms) }
}

/** 设置延迟 */
export function withDelay(builder: AnimationBuilder, ms: number): AnimationBuilder {
  return { ...builder, delay: Math.max(0, ms) }
}

/** 设置缓动 */
export function withEasing(builder: AnimationBuilder, easing: EasingType): AnimationBuilder {
  return { ...builder, easing }
}

/** 添加属性动画 */
export function withProperty(
  builder: AnimationBuilder,
  name: string,
  from: number | string,
  to: number | string,
  unit?: string,
): AnimationBuilder {
  return {
    ...builder,
    properties: [...builder.properties, { name, from, to, unit }],
  }
}

/** 设置循环 */
export function withLoop(builder: AnimationBuilder, count: number = -1): AnimationBuilder {
  return { ...builder, loop: true, loopCount: count }
}

/** 设置回调 */
export function withCallbacks(
  builder: AnimationBuilder,
  callbacks: {
    onStart?: () => void
    onUpdate?: (progress: number) => void
    onComplete?: () => void
    onCancel?: () => void
  },
): AnimationBuilder {
  return { ...builder, ...callbacks }
}

/** 构建 AnimationEntry */
export function build(builder: AnimationBuilder): AnimationEntry {
  return {
    id: builder.id,
    name: builder.name,
    target: builder.target,
    duration: builder.duration,
    delay: builder.delay,
    easing: builder.easing,
    properties: builder.properties,
    loop: builder.loop,
    loopCount: builder.loopCount,
    reverse: builder.reverse,
    state: 'idle',
    progress: 0,
    startedAt: 0,
    onStart: builder.onStart,
    onUpdate: builder.onUpdate,
    onComplete: builder.onComplete,
    onCancel: builder.onCancel,
  }
}

// ---- 动画组 ----

export type AnimationGroupMode = 'parallel' | 'sequence' | 'stagger'

export interface AnimationGroup {
  id: string
  name: string
  mode: AnimationGroupMode
  animations: AnimationEntry[]
  /** 交错间隔 (ms)，仅 stagger 模式 */
  staggerDelay: number
  /** 当前播放索引 */
  currentIndex: number
  state: 'idle' | 'running' | 'paused' | 'completed'
}

/** 创建动画组 */
export function createAnimationGroup(
  id: string,
  name: string,
  mode: AnimationGroupMode,
  staggerDelay: number = 50,
): AnimationGroup {
  return {
    id,
    name,
    mode,
    animations: [],
    staggerDelay,
    currentIndex: 0,
    state: 'idle',
  }
}

/** 向动画组添加动画 */
export function addToGroup(group: AnimationGroup, animation: AnimationEntry): AnimationGroup {
  return {
    ...group,
    animations: [...group.animations, animation],
  }
}

/** 获取动画组中下一个待播放的动画索引 */
export function getNextInGroup(group: AnimationGroup): number {
  if (group.mode === 'parallel') return -1 // 并行模式不需要索引
  return group.currentIndex
}

/** 推进动画组播放索引 */
export function advanceGroup(group: AnimationGroup): AnimationGroup {
  return {
    ...group,
    currentIndex: group.currentIndex + 1,
    state: group.currentIndex + 1 >= group.animations.length ? 'completed' : group.state,
  }
}

/** 检查动画组是否全部完成 */
export function isGroupCompleted(group: AnimationGroup): boolean {
  return group.animations.every(a => a.state === 'completed')
}

// ---- 过渡动画 ----

export type TransitionType = 'fade' | 'slide' | 'scale' | 'rotate' | 'crossfade'

export interface TransitionConfig {
  type: TransitionType
  fromElement: string
  toElement: string
  duration: number
  easing: EasingType
}

/** 过渡动画属性映射 */
export const TRANSITION_PROPERTIES: Record<TransitionType, AnimationProperty[]> = {
  fade: [
    { name: 'opacity', from: 1, to: 0, unit: '' },
    { name: 'opacity', from: 0, to: 1, unit: '' },
  ],
  slide: [
    { name: 'transform', from: 'translateX(0)', to: 'translateX(-100%)', unit: '' },
    { name: 'transform', from: 'translateX(100%)', to: 'translateX(0)', unit: '' },
  ],
  scale: [
    { name: 'transform', from: 'scale(1)', to: 'scale(0.9)', unit: '' },
    { name: 'transform', from: 'scale(1.1)', to: 'scale(1)', unit: '' },
  ],
  rotate: [
    { name: 'transform', from: 'rotate(0deg)', to: 'rotate(-15deg)', unit: '' },
    { name: 'transform', from: 'rotate(15deg)', to: 'rotate(0deg)', unit: '' },
  ],
  crossfade: [
    { name: 'opacity', from: 1, to: 0, unit: '' },
    { name: 'opacity', from: 0, to: 1, unit: '' },
  ],
}

/** 创建过渡动画 */
export function createTransition(config: TransitionConfig): [AnimationEntry, AnimationEntry] {
  const props = TRANSITION_PROPERTIES[config.type]
  const now = Date.now()

  const outAnim: AnimationEntry = {
    id: `transition_out_${now}`,
    name: `离开动画`,
    target: config.fromElement,
    duration: config.duration,
    delay: 0,
    easing: config.easing,
    properties: [props[0]],
    loop: false,
    loopCount: 0,
    reverse: false,
    state: 'idle',
    progress: 0,
    startedAt: 0,
  }

  const inAnim: AnimationEntry = {
    id: `transition_in_${now}`,
    name: `进入动画`,
    target: config.toElement,
    duration: config.duration,
    delay: 0,
    easing: config.easing,
    properties: [props[1]],
    loop: false,
    loopCount: 0,
    reverse: false,
    state: 'idle',
    progress: 0,
    startedAt: 0,
  }

  return [outAnim, inAnim]
}

// ---- 预设动画 ----

export interface AnimationPreset {
  name: string
  properties: AnimationProperty[]
  duration: number
  easing: EasingType
}

/** 预设动画库 */
export const ANIMATION_PRESETS: Record<string, AnimationPreset> = {
  'fade-in': {
    name: '淡入',
    properties: [{ name: 'opacity', from: 0, to: 1 }],
    duration: 300,
    easing: 'ease-out',
  },
  'fade-out': {
    name: '淡出',
    properties: [{ name: 'opacity', from: 1, to: 0 }],
    duration: 300,
    easing: 'ease-in',
  },
  'slide-up': {
    name: '上滑进入',
    properties: [{ name: 'transform', from: 'translateY(20px)', to: 'translateY(0)' }],
    duration: 400,
    easing: 'ease-out',
  },
  'slide-down': {
    name: '下滑进入',
    properties: [{ name: 'transform', from: 'translateY(-20px)', to: 'translateY(0)' }],
    duration: 400,
    easing: 'ease-out',
  },
  'slide-left': {
    name: '左滑进入',
    properties: [{ name: 'transform', from: 'translateX(20px)', to: 'translateX(0)' }],
    duration: 400,
    easing: 'ease-out',
  },
  'scale-in': {
    name: '放大进入',
    properties: [{ name: 'transform', from: 'scale(0.9)', to: 'scale(1)' }],
    duration: 300,
    easing: 'ease-out',
  },
  'pulse': {
    name: '脉冲',
    properties: [{ name: 'transform', from: 'scale(1)', to: 'scale(1.05)' }],
    duration: 600,
    easing: 'ease-in-out',
  },
  'bounce-in': {
    name: '弹入',
    properties: [{ name: 'transform', from: 'scale(0.3)', to: 'scale(1)' }],
    duration: 600,
    easing: 'bounce',
  },
  'spin': {
    name: '旋转',
    properties: [{ name: 'transform', from: 'rotate(0deg)', to: 'rotate(360deg)' }],
    duration: 1000,
    easing: 'linear',
  },
  'shimmer': {
    name: '闪光',
    properties: [{ name: 'opacity', from: 0.5, to: 1 }],
    duration: 800,
    easing: 'ease-in-out',
  },
}

/** 从预设创建动画 */
export function animationFromPreset(
  id: string,
  name: string,
  target: string,
  presetKey: string,
): AnimationEntry | null {
  const preset = ANIMATION_PRESETS[presetKey]
  if (!preset) return null

  return {
    id,
    name: name || preset.name,
    target,
    duration: preset.duration,
    delay: 0,
    easing: preset.easing,
    properties: preset.properties.map(p => ({ ...p })),
    loop: false,
    loopCount: 0,
    reverse: false,
    state: 'idle',
    progress: 0,
    startedAt: 0,
  }
}

/** 获取所有预设名称 */
export function getPresetKeys(): string[] {
  return Object.keys(ANIMATION_PRESETS)
}