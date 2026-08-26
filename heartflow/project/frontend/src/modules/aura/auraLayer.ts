// ============================================================
// AuraLayer · 状态组合式（模块级单例，跨视图共享）
// 持久化进明文 JSON 引擎 KV（沿用 engine/storage）。
//
// 持久化键：
//   aura:enabled          是否启用氛围层
//   aura:theme            当前主题 id
//   aura:hotkey           全局热键（如 CommandOrControl+Shift+A）
//   aura:exit-to-aura     退出软件是否缩小为美化层（保活 aura 窗）
//   aura:theme-overrides  每主题调参覆盖
// ============================================================

import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { storage } from '../../engine/storage'
import type { AuraThemeId, AuraThemeOverride } from './types'
import { THEME_META } from './themes'

const enabled = ref<boolean>(storage.getKV<boolean>('aura:enabled', false))
const themeId = ref<AuraThemeId>(storage.getKV<AuraThemeId>('aura:theme', 'breath'))
const hotkey = ref<string>(storage.getKV<string>('aura:hotkey', 'CommandOrControl+Shift+A'))
const exitToAura = ref<boolean>(storage.getKV<boolean>('aura:exit-to-aura', true))
const overrides = ref<Record<string, AuraThemeOverride>>(
  storage.getKV<Record<string, AuraThemeOverride>>('aura:theme-overrides', {}),
)

/** 是否运行在独立的 aura 透明窗（Tauri）。web 模式下恒为 false（主窗内预览浮层）。 */
const isAuraWindow = ref<boolean>(false)

function setEnabled(v: boolean): void {
  enabled.value = v
  storage.setKV('aura:enabled', v)
}

function setTheme(id: AuraThemeId): void {
  themeId.value = id
  storage.setKV('aura:theme', id)
}

function setHotkey(k: string): void {
  hotkey.value = k
  storage.setKV('aura:hotkey', k)
}

function setExitToAura(v: boolean): void {
  exitToAura.value = v
  storage.setKV('aura:exit-to-aura', v)
}

function setOverride(id: AuraThemeId, patch: AuraThemeOverride): void {
  const next: Record<string, AuraThemeOverride> = {
    ...overrides.value,
    [id]: { ...(overrides.value[id] ?? {}), ...patch },
  }
  overrides.value = next
  storage.setKV('aura:theme-overrides', next)
}

/** 合并主题默认值与用户覆盖，得到当前生效参数 */
const resolvedTheme = computed(() => ({
  ...THEME_META[themeId.value].defaults,
  ...(overrides.value[themeId.value] ?? {}),
}))

/**
 * 探测是否处于 aura 窗（仅 Tauri 运行时有效，web 静默失败）。
 * 成功时给 <html> 加 .aura-window（透明背景），并标记 isAuraWindow。
 */
async function detectAuraWindow(): Promise<void> {
  try {
    const mod = await import('@tauri-apps/api/window')
    const w = mod.getCurrentWindow()
    if (w.label === 'aura') {
      isAuraWindow.value = true
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('aura-window')
      }
    }
  } catch {
    isAuraWindow.value = false
  }
}

/** 仅 Tauri：把前端持久化的「退出缩小为美化层」开关同步给 Rust 保活逻辑。 */
function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function syncExitToAura(): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    await invoke('set_exit_to_aura', { value: exitToAura.value })
  } catch {
    /* 命令未注册 / aura 窗未起，静默忽略 */
  }
}

export function useAura() {
  return {
    enabled,
    themeId,
    hotkey,
    exitToAura,
    overrides,
    isAuraWindow,
    resolvedTheme,
    setEnabled,
    setTheme,
    setHotkey,
    setExitToAura,
    setOverride,
    detectAuraWindow,
    syncExitToAura,
  }
}
