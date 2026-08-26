// ============================================================
// 呈现引擎 · 类型定义
// 蓝图定义：
//   可插拔引擎层 — 呈现引擎
//   管理场景渲染管线、动画协调、视觉输出管理
//   支持渲染优先级调度、帧率控制、性能监控
// ============================================================

// ---- 渲染管线阶段 ----

export type RenderPhase = 'prepare' | 'layout' | 'paint' | 'composite' | 'animate'

export const RENDER_PHASE_ORDER: RenderPhase[] = [
  'prepare',
  'layout',
  'paint',
  'composite',
  'animate',
]

// ---- 渲染器 ----

export interface Renderer {
  /** 渲染器唯一 ID */
  id: string
  /** 渲染器名称 */
  name: string
  /** 渲染管线阶段 */
  phase: RenderPhase
  /** 优先级（0-100，越高越优先） */
  priority: number
  /** 是否启用 */
  enabled: boolean
  /** 渲染目标（CSS 选择器或组件 ID） */
  target: string
  /** 渲染函数 */
  render: (context: RenderContext) => Promise<void> | void
  /** 清理函数 */
  cleanup?: () => void
  /** 依赖的其他渲染器 ID */
  dependencies?: string[]
}

// ---- 渲染上下文 ----

export interface RenderContext {
  /** 当前时间戳 */
  timestamp: number
  /** 距上一帧的时间差 (ms) */
  deltaTime: number
  /** 当前帧率 */
  fps: number
  /** 画布尺寸 */
  viewport: { width: number; height: number }
  /** 是否首帧 */
  isFirstFrame: boolean
  /** 渲染阶段 */
  phase: RenderPhase
  /** 渲染帧 ID */
  frameId: number
}

// ---- 渲染管线配置 ----

export interface RenderPipelineConfig {
  /** 目标帧率 */
  targetFPS: number
  /** 帧间隔上限 (ms)，超过则跳帧 */
  maxFrameTime: number
  /** 是否启用 VSync */
  vsync: boolean
  /** 是否启用性能监控 */
  performanceMonitor: boolean
  /** 是否启用渲染器自动排序 */
  autoSort: boolean
  /** 跳帧阈值 (ms) */
  frameSkipThreshold: number
}

// ---- 渲染统计 ----

export interface RenderStats {
  /** 已渲染帧数 */
  totalFrames: number
  /** 当前帧率 */
  currentFPS: number
  /** 平均帧率 */
  averageFPS: number
  /** 最低帧率 */
  minFPS: number
  /** 最高帧率 */
  maxFPS: number
  /** 跳过的帧数 */
  skippedFrames: number
  /** 平均帧时间 (ms) */
  averageFrameTime: number
  /** 各阶段耗时 (ms) */
  phaseTimings: Record<RenderPhase, number>
  /** 各渲染器耗时 (ms) */
  rendererTimings: Record<string, number>
  /** 上次渲染时间 */
  lastRenderAt: string | null
}

// ---- 动画协调器 ----

export interface AnimationEntry {
  /** 动画唯一 ID */
  id: string
  /** 动画名称 */
  name: string
  /** 目标元素 */
  target: string
  /** 持续时间 (ms) */
  duration: number
  /** 延迟 (ms) */
  delay: number
  /** 缓动函数 */
  easing: EasingType
  /** 动画属性 */
  properties: AnimationProperty[]
  /** 是否循环 */
  loop: boolean
  /** 循环次数（-1 为无限） */
  loopCount: number
  /** 是否反向播放 */
  reverse: boolean
  /** 播放状态 */
  state: 'idle' | 'running' | 'paused' | 'completed'
  /** 进度 0-1 */
  progress: number
  /** 开始时间 */
  startedAt: number
  /** 回调 */
  onStart?: () => void
  onUpdate?: (progress: number) => void
  onComplete?: () => void
  onCancel?: () => void
}

export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic'
  | 'cubic-bezier'

export interface AnimationProperty {
  name: string
  from: number | string
  to: number | string
  unit?: string
}

// ---- 视觉输出 ----

export type VisualEffectType = 'blur' | 'glow' | 'shadow' | 'gradient' | 'particle' | 'filter' | 'overlay'

export interface VisualEffect {
  id: string
  type: VisualEffectType
  target: string
  params: Record<string, string | number>
  enabled: boolean
  /** 混合模式 */
  blendMode?: BlendMode
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'soft-light'
  | 'hard-light'
  | 'difference'
  | 'exclusion'

// ---- 性能配置 ----

export type PerformanceLevel = 'high' | 'balanced' | 'powersave'

export interface PerformanceConfig {
  level: PerformanceLevel
  /** 目标帧率 */
  targetFPS: number
  /** 是否启用粒子效果 */
  particlesEnabled: boolean
  /** 是否启用模糊效果 */
  blurEnabled: boolean
  /** 是否启用阴影 */
  shadowEnabled: boolean
  /** 是否启用抗锯齿 */
  antialiasEnabled: boolean
  /** 最大视觉效果数 */
  maxEffects: number
  /** 最大动画数 */
  maxAnimations: number
}