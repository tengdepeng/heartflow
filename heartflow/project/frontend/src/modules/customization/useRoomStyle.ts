// ============================================================
// 应用空间自定义 · 单房间风格覆盖（全局为主 + 单房间可覆盖）
// ------------------------------------------------------------
// 在「材料工坊」为每个房间提供一套可单独调的主题（主色 + 底色 + 背景场景），
// 未开启则跟随全局主题。覆盖仅作用于内容容器 .main-content（不污染侧栏 / 壳层），
// 由 App.vue 统一绑定 :style 与 :background，天然随路由切换、无需 revert 逻辑。
//
// 设计要点：
// - 模块级单例 ref + storage.getKV/setKV 持久化（与 useAppearance 同源模式）。
// - deriveRoomVars 与 stores/style.ts 的 deriveVars 同源逻辑，保证覆盖后的
//   协调色板与全局引擎视觉一致。
// - 覆盖不写 :root（那是全局引擎的职责），只对外提供变量集供内容容器就地绑定。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { PresetScene } from '../../types'

export interface RoomStyleOverride {
  /** 是否启用本房间独立主题（false / 缺省 = 跟随全局） */
  enabled: boolean
  /** 主色（accent） */
  accent: string
  /** 底色（bgPrimary） */
  bgPrimary: string
  /** 背景预设场景 */
  presetScene: PresetScene
}

const STORAGE_KEY = 'customization:room-style-overrides'

const DEFAULT_OVERRIDE: RoomStyleOverride = {
  enabled: false,
  accent: '#7c6cf0',
  bgPrimary: '#0a0a0f',
  presetScene: 'none',
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#000000').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return [r, g, b]
}

/**
 * 从主色 + 底色推导协调的 CSS 变量集（与 stores/style.ts 的 deriveVars 同源）。
 * 应用为暗色语境（本应用房间均为暗色），文本色取近白以保证对比度。
 */
function deriveRoomVars(colors: { accent: string; bgPrimary: string }): Record<string, string> {
  const [pr, pg, pb] = hexToRgb(colors.accent)
  const bg = colors.bgPrimary || '#0a0a0f'
  return {
    '--accent': colors.accent,
    '--accent-rgb': `${pr}, ${pg}, ${pb}`,
    '--accent-dim': `rgba(${pr},${pg},${pb},0.3)`,
    '--accent-cyan': `rgba(${pr},${pg},${Math.min(pb + 80, 255)},0.8)`,
    '--accent-blue': `rgba(${pr},${pg},${Math.min(pb + 80, 255)},0.8)`,
    '--accent-purple': `rgba(${Math.min(pr + 20, 255)},${Math.max(pg - 20, 0)},${pb},0.8)`,
    '--bg-primary': bg,
    '--bg-secondary': bg,
    '--bg-card': `rgba(255,255,255,0.06)`,
    '--bg-card-hover': `rgba(255,255,255,0.08)`,
    '--bg-surface': bg,
    '--text-primary': '#e8e8ed',
    '--text-secondary': 'rgba(255,255,255,0.55)',
    '--text-muted': `rgba(255,255,255,0.35)`,
    '--border-color': `rgba(255,255,255,0.06)`,
    '--border': `rgba(255,255,255,0.06)`,
  }
}

// ---- 模块级单例：per-room 覆盖表 ----
const overrides = ref<Record<string, RoomStyleOverride>>(
  storage.getKV<Record<string, RoomStyleOverride>>(STORAGE_KEY, {}),
)

function persist(): void {
  storage.setKV(STORAGE_KEY, overrides.value)
}

export function useRoomStyle() {
  function getRoomOverride(roomId: string): RoomStyleOverride {
    return overrides.value[roomId] ?? { ...DEFAULT_OVERRIDE }
  }

  function isRoomOverridden(roomId: string): boolean {
    return !!overrides.value[roomId]?.enabled
  }

  /** 设置 / 更新某房间的覆盖项；不传 enabled 时默认开启（保证交互后能立即生效） */
  function setRoomOverride(roomId: string, patch: Partial<RoomStyleOverride>): void {
    const current = overrides.value[roomId] ?? { ...DEFAULT_OVERRIDE }
    overrides.value = {
      ...overrides.value,
      [roomId]: { ...current, ...patch, enabled: patch.enabled ?? true },
    }
    persist()
  }

  /** 移除某房间的覆盖，回到全局（跟随全局） */
  function clearRoomOverride(roomId: string): void {
    const next = { ...overrides.value }
    delete next[roomId]
    overrides.value = next
    persist()
  }

  /** 返回绑定到内容容器的 CSS 变量覆盖集；未启用则返回空对象（跟随全局） */
  function roomStyleVars(roomId: string): Record<string, string> {
    const ov = overrides.value[roomId]
    if (!ov || !ov.enabled) return {}
    return deriveRoomVars({ accent: ov.accent, bgPrimary: ov.bgPrimary })
  }

  /** 返回本房间覆盖的背景场景；未启用则返回 null（跟随全局背景） */
  function roomBackgroundScene(roomId: string): PresetScene | null {
    const ov = overrides.value[roomId]
    if (!ov || !ov.enabled) return null
    return ov.presetScene
  }

  return {
    overrides,
    getRoomOverride,
    isRoomOverridden,
    setRoomOverride,
    clearRoomOverride,
    roomStyleVars,
    roomBackgroundScene,
  }
}
