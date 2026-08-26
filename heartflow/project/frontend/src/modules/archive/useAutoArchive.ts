// ============================================================
// 自动归档 · 组合式 / 调度入口（任务② · data:auto-archive）
// ------------------------------------------------------------
// 提供「仅启用时执行一次」与「每日幂等巡检」两个入口。
// 触发接线说明：本文件不自行 import 任何启动链路，避免副作用在 import 时静默发生。
// 请在应用启动处（App.vue 或 main.ts 的 bootstrap）调用一次
//   initAutoArchiveScheduler()
// 接入每日自动归档巡检。当前 App.vue / main.ts 为并行 WIP，接线留待用户接入。
// ============================================================

import { runAutoArchive } from './auto-archive'

const DAY_MS = 86_400_000
let schedulerTimer: ReturnType<typeof setInterval> | null = null

/** 仅当宪法条款启用时执行一次自动归档；条款未启用返回 skipped（零动作）。 */
export function runAutoArchiveIfEnabled(options?: { thresholdDays?: number }) {
  return runAutoArchive(options)
}

/**
 * 启动每日自动归档巡检（幂等：多次调用仅注册一个定时器）。
 * @param intervalMs 巡检间隔，默认 1 天
 */
export function initAutoArchiveScheduler(intervalMs: number = DAY_MS): void {
  if (schedulerTimer !== null) return
  schedulerTimer = setInterval(() => {
    runAutoArchiveIfEnabled()
  }, intervalMs)
  // 启动即跑一次（若条款已启用）
  runAutoArchiveIfEnabled()
}

/** 停止巡检（测试或卸载时用） */
export function stopAutoArchiveScheduler(): void {
  if (schedulerTimer !== null) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}
