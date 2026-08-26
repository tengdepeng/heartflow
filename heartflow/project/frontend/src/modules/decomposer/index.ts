// ============================================================
// decomposer · 镜我 · 任务拆解器（模块七 P1）
// 自然语言任务 → 可执行步骤陈列（本地启发式）
// ============================================================

export {
  genId,
  detectIntent,
  hasExplicitParts,
  inferQuadrant,
  priorityFor,
  decompose,
  summarizePlan,
  useDecomposer,
  INTENT_META,
  DECOMPOSER_STORAGE_KEYS,
} from './decomposer'
export type {
  StepPriority,
  StepStatus,
  TaskIntent,
  DecomposedStep,
  DecomposePlan,
} from './decomposer'