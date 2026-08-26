// ============================================================
// 介质呼吸 · 模块入口（barrel）
// 仅为再导出层。呼吸引擎已下沉至 ./breathing-core，
// 以消除 BreathingLayer.vue ↔ index 的循环依赖。
// ============================================================

export { default as BreathingLayer } from './BreathingLayer.vue'
export type { BreathingMood, BreathingPhase, BreathingConfig, TimeOfDay } from './types'
export { DEFAULT_BREATHING_CONFIG } from './types'

// ---- 呼吸引擎（已抽取至叶子，公共 API 不变）----
export { useBreathing } from './breathing-core'
