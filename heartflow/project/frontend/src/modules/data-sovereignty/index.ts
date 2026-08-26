// ============================================================
// 数据主权与遗忘退场 · 模块入口（barrel）
// 仅为再导出层。引擎逻辑已下沉至 ./sovereignty-engine，
// 经 export * 透出全部引擎 API，以消除 index ↔ composables 的循环依赖。
// ============================================================

export * from './sovereignty-engine'

// ---- 组合式函数（视图层状态管理）----
export { useForgetting } from './composables/useForgetting'
export { useHallExit } from './composables/useHallExit'
export { useDataExtradition } from './composables/useDataExtradition'
export { useCrossDevice } from './composables/useCrossDevice'

// ---- 手动数据整理（data:cleanup · B 类样板）----
export {
  isCleanupEnabled,
  listCleanupCandidates,
  applySoftArchive,
  applyRestore,
  softCleanup,
  restoreCleanup,
  getCleanupCandidates,
  CLEANUP_RETENTION_DAYS,
} from './manual-cleanup'
