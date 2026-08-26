// ============================================================
// 外部 AI 端点出口闸（宪法第1条 本地私有 · fail-closed）
// ------------------------------------------------------------
// 设计目标：开箱零外部 AI 调用。任何非 localhost / 127.0.0.1 / ::1 的
// AI baseUrl 在真正发起请求前必须经过此闸；除非用户在第2条超级自定义
// 中显式开启 allowExternalAI，否则一律拦截（fail-closed）。
//
// 门控位置选在「传输边界（provider 层）」而非 AIEngine 编排器：
//  1) 覆盖 tauri-provider 的 analyzeSentiment / generateSummary /
//     suggestActions 旁路外呼（这些不经 AIEngine 漏斗）；
//  2) 不破坏 engine/ai/__tests__/index.test.ts（其 MockProvider 用远程
//     URL 且期望成功，置 orchestrator 层会误伤）。
//
// 读源：直接从存储读取 complianceOverride.allowExternalAI，避免引入 Pinia
// 依赖与循环引用；saveSchema 会清空 _schemaCache，故运行时开关即时生效。
// ============================================================

import { loadSchema } from '../storage/core'
import { showToast } from '../../modules/toast'

/**
 * 拦截通知节流：同一拦截原因在短时间窗口内只弹一次，避免一次操作触发
 * 多个 AI 旁路外呼（情感/摘要/建议）时堆叠大量相同 Toast。
 */
let lastNotifyAt = 0
const NOTIFY_THROTTLE_MS = 4000

/** 当用户触发被拦截的外部 AI 调用时，弹出告知（宪法第1条 fail-closed 的用户可见性）。 */
function notifyExternalAIBlocked(reason: string): void {
  const now = Date.now()
  if (now - lastNotifyAt < NOTIFY_THROTTLE_MS) return
  lastNotifyAt = now
  try {
    showToast(reason, 'error')
  } catch {
    /* 通知失败不应影响闸逻辑本身 */
  }
}

/**
 * 本地环回/局域网推理地址集合：永远放行，无需同意闸。
 * 覆盖 localhost、IPv4 环回、IPv6 环回、0.0.0.0（本地绑定全网卡）以及
 * *.localhost 保留后缀。
 */
const LOCAL_HOST_PATTERNS: Array<(host: string) => boolean> = [
  (h) => h === 'localhost',
  (h) => h === '127.0.0.1',
  (h) => h === '::1',
  (h) => h === '[::1]',
  (h) => h === '0.0.0.0',
  (h) => h.endsWith('.localhost'),
]

/** 从 baseUrl 解析出小写 host；无法解析（空/非法）时返回空串。 */
function extractHost(baseUrl?: string): string {
  if (!baseUrl) return ''
  try {
    return new URL(baseUrl).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * 是否为本地推理地址。localhost / 127.0.0.1 / ::1 / 0.0.0.0 / *.localhost
 * 永远视为本地，放行且不需要用户同意。
 */
export function isLocalAIModelHost(baseUrl?: string): boolean {
  const host = extractHost(baseUrl)
  if (!host) return false
  return LOCAL_HOST_PATTERNS.some((match) => match(host))
}

/**
 * 用户是否已显式同意远程 AI 端点（宪法第1条 fail-closed 例外）。
 * 任何异常（存储不可用等）一律回落为 false（拦截）。
 */
export function isExternalAIConsented(): boolean {
  try {
    const co = loadSchema().config.complianceOverride
    return co?.allowExternalAI === true
  } catch {
    return false
  }
}

/**
 * 外部 AI 端点出口闸。
 * @param baseUrl AI 提供商的 baseUrl（可能为 undefined）
 * @returns null 表示放行；非空字符串表示拦截原因。
 *
 * 规则：
 *  - 本地环回地址 → 放行；
 *  - 非本地地址 → 仅当用户显式开启 allowExternalAI 时放行，否则拦截。
 *
 * 拦截时（fail-closed）会向用户弹出可见提示（宪法第1条「绝对安静」之外，
 * 用户主动触发的外部调用必须让用户知情——默认关闭、调用即告知）。
 */
export function checkExternalAIGate(baseUrl?: string): string | null {
  if (isLocalAIModelHost(baseUrl)) return null
  if (isExternalAIConsented()) return null
  const reason = '外部 AI 端点未授权：需在宪法页面显式开启「允许远程 AI 端点」'
  notifyExternalAIBlocked(reason)
  return reason
}
