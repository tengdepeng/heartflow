// ============================================================
// dispatch · 镜我 · 幕僚调度（模块七 P1）
// 单一 / 并行 / 串行三态调度 + 调令结果汇总
// ============================================================

export {
  genId,
  detectStrategy,
  hasPerAdvisorClauses,
  createDispatch,
  splitOrderDetail,
  summarize,
  useDispatch,
  DISPATCH_STORAGE_KEYS,
} from './dispatch'
export type {
  DispatchStrategy,
  DispatchStep,
  DispatchRecord,
  DispatchSummary,
} from './dispatch'