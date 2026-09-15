// ============================================================
// Launcher · 启动外部应用
// 机制（桌面可行，见设计规格 §3.2）：
//   - 有 deepLink 且 useDeepLink → plugin-shell 的 open(deepLink)（OS 默认处理器解析）
//   - 否则 open(launch)（.exe/.app 路径，OS 关联打开）
// 优雅降级（§3.3 / §7）：深链协议随目标 App 失效时，回退 launch（停在首页级），
//   永远不报错卡死。
// web 模式（无 Tauri）降级为 window.open，让用户在浏览器验证交互。
// ============================================================

import type { ExternalAppEntry } from './types'

/** 当前是否运行在 Tauri 运行时（用于决定是否走 plugin-shell） */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 不作为深链接放行的协议。
 * `file` 被禁止：深链语义是「交给应用自己的 URL handler」，
 * 若允许 file:// 等同于可打开任意本地文件，超出深链职责。
 */
const BLOCKED_DEEPLINK_SCHEMES = new Set(['file'])

/**
 * 深链接安全校验：必须是「协议 URL」形式（scheme:... / scheme://...）。
 *
 * 注意：此处**只约束 deepLink，不约束 launch**。
 * launch 字段本就是本地应用路径（.exe / .app），启动本地应用是 Launcher 的
 * 核心能力，对其做可执行文件黑名单会直接破坏功能。风险边界是：
 * 条目数据当前仅来自用户本人在本地 UI 录入（无导入/分享面），属可信来源。
 * 若未来支持配置导入，需在此处对 launch 增加二次确认或路径白名单。
 */
function isSafeDeepLink(target: string): boolean {
  const m = /^([a-zA-Z][a-zA-Z0-9+\-.]*):/.exec(target)
  if (!m) return false // 非协议形式（如裸文件路径）不得作为深链接
  return !BLOCKED_DEEPLINK_SCHEMES.has(m[1].toLowerCase())
}

export interface LaunchResult {
  ok: boolean
  /** 实际尝试打开的目标（深链或路径） */
  target: string
  /** 是否走了降级路径（深链失败回退 launch / web 模式） */
  degraded?: boolean
}

/**
 * 启动一个外部应用条目。
 * @returns ok=false 表示完全无法打开（target 为空 / 异常），调用方据此提示。
 */
export async function launchApp(entry: ExternalAppEntry): Promise<LaunchResult> {
  const preferred = entry.useDeepLink && entry.deepLink ? entry.deepLink : entry.launch
  if (!preferred) return { ok: false, target: '' }

  // 深链接必须是「协议 URL」形式；非法深链 fail-closed 直接拒绝，
  // 且不回退到 launch（避免被诱导用不可信深链触发本地路径启动）。
  if (entry.useDeepLink && entry.deepLink && !isSafeDeepLink(entry.deepLink)) {
    return { ok: false, target: entry.deepLink }
  }

  // web 模式：无 Tauri，降级为浏览器打开（仅用于验证交互，真实拉起在桌面端）
  if (!isTauri()) {
    try {
      window.open(preferred, '_blank', 'noopener')
      return { ok: true, target: preferred, degraded: true }
    } catch {
      return { ok: false, target: preferred }
    }
  }

  try {
    const mod = await import('@tauri-apps/plugin-shell')
    await mod.open(preferred)
    return { ok: true, target: preferred }
  } catch {
    // 深链失败 → 回退 launch（若与深链不同）
    if (entry.useDeepLink && entry.deepLink && entry.launch && entry.launch !== preferred) {
      try {
        const mod = await import('@tauri-apps/plugin-shell')
        await mod.open(entry.launch)
        return { ok: true, target: entry.launch, degraded: true }
      } catch {
        return { ok: false, target: entry.launch }
      }
    }
    return { ok: false, target: preferred }
  }
}
