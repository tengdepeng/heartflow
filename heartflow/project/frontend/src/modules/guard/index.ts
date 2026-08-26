// ============================================================
// 守护室（guard）模块 barrel export
// 由顶层 src/modules/index.ts 统一注册，此处不修改顶层桶。
// ============================================================

export { useGuard } from './useGuard'
export type {
  GuardSessionActivity,
  GuardContact,
  GuardVisitLog,
  GuardPermissionStatus,
  GuardPermissionLight,
  GuardCrashLevel,
  GuardCrashLog,
} from './useGuard'
