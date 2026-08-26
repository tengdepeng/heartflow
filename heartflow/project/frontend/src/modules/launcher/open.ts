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
