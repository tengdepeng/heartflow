// ============================================================
// 存储引擎 · 向后兼容入口
// 所有导出已迁移至 src/engine/storage/ 领域模块
// ============================================================

export {
  storageVersion,
  invalidateCache,
  getStorageBackend,
  initStorage,
  flushStorage,
  clearAll,
  DEFAULT_CONFIG,
} from './storage/core'

export type { StorageBackend, StorageSchema } from './storage/core'

export { storage } from './storage/index'