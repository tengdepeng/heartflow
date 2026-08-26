// ============================================================
// 三层空间 · 上层浮层组合式（从物件激活、可关闭）
// 薄封装 configStore 的浮层注册表，提供语义化开/关。
// 宪法：浮层为本地状态，不写死；来源物件上下文走 meta。
// ============================================================

import { useConfigStore } from '../stores/config'
import type { FloatingLayerState } from '../types'

export function useFloatingLayer() {
  const configStore = useConfigStore()

  const layers = () => configStore.config.worldShell.floatingLayers ?? []

  /** 打开一个浮层（已存在则仅置可见） */
  function open(
    id: string,
    opts: { title?: string; source?: string; x?: number; y?: number; meta?: Record<string, unknown> } = {},
  ) {
    configStore.setFloatingLayer(id, true, opts)
  }

  /** 关闭一个浮层（保留实例，仅置不可见） */
  function close(id: string) {
    configStore.setFloatingLayer(id, false)
  }

  /** 彻底移除一个浮层实例 */
  function remove(id: string) {
    configStore.removeFloatingLayer(id)
  }

  /** 物件预览浮层：点物件激活，可关闭 */
  function openObjectPreview(room: { id: string; name: string; path?: string }) {
    open(`preview-${room.id}`, {
      title: room.name,
      source: room.id,
      meta: { path: room.path ?? null },
    })
  }

  return { layers, open, close, remove, openObjectPreview }
}

export type { FloatingLayerState }
