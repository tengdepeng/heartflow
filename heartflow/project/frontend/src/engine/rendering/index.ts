// ============================================================
// 呈现引擎 · 导出入口
// 蓝图定义：
//   可插拔引擎层 — 呈现引擎
//   提供场景渲染、动画协调、视觉输出三大核心能力
// ============================================================

// 类型
export type {
  RenderPhase,
  Renderer,
  RenderContext,
  RenderPipelineConfig,
  RenderStats,
  AnimationEntry,
  EasingType,
  AnimationProperty,
  VisualEffectType,
  VisualEffect,
  BlendMode,
  PerformanceLevel,
  PerformanceConfig,
} from './types'

export {
  RENDER_PHASE_ORDER,
} from './types'

// 场景渲染器
export {
  SceneRenderer,
  sceneRenderer,
  DEFAULT_PIPELINE_CONFIG,
  PERFORMANCE_PROFILES,
} from './scene-renderer'

// 动画协调管线
export {
  createAnimation,
  withDuration,
  withDelay,
  withEasing,
  withProperty,
  withLoop,
  withCallbacks,
  build,
  createAnimationGroup,
  addToGroup,
  getNextInGroup,
  advanceGroup,
  isGroupCompleted,
  createTransition,
  animationFromPreset,
  getPresetKeys,
  ANIMATION_PRESETS,
  TRANSITION_PROPERTIES,
} from './animation-pipeline'

export type {
  AnimationBuilder,
  AnimationGroupMode,
  AnimationGroup,
  TransitionType,
  TransitionConfig,
  AnimationPreset,
} from './animation-pipeline'