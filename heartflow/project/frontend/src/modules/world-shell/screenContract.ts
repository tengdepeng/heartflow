// ============================================================
// 屏风契约 · 共享锚点
// 世界壳（CanvasRoom 内）在布局屏风矩形后将坐标写入此响应式对象，
// 门厅覆盖层（计时器+玉珠）据此固定屏位叠加，不随背景视角转动。
// 遵循「框架与内容分离」：壳换皮不动此契约。
// ============================================================

import { reactive } from 'vue'
import type { WorldShellType } from '../../types'

export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
  /** 屏侧玉珠位（相对画布的逻辑像素） */
  jade?: { x: number; y: number }
}

/**
 * 视口中心兜底屏风矩形。
 * 非 courtyard 壳（如星辰 stars / 海天 ocean）未布局真实屏位时，
 * 门厅计时器与玉珠据此保持空间关联——计时器居中、玉珠落其屏侧，
 * 不再出现「计时器 50%/22% 居中上 + 玉珠 x=40 贴左」的失联。
 */
export function computeFallbackRect(): ScreenRect {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const w = Math.min(380, Math.max(280, vw * 0.34))
  const h = Math.min(220, Math.max(160, vh * 0.28))
  const x = (vw - w) / 2
  const y = (vh - h) / 2
  // 屏侧玉珠位：矩形右侧中点（与 courtyard 契约一致）
  const jade = { x: x + w + 40, y: y + h / 2 }
  return { x, y, w, h, jade }
}

/**
 * 屏风契约共享状态。
 * - rect：当前激活壳的屏风矩形（courtyard 布局后写入；其余壳回落默认）。
 * - shell：当前激活世界壳。
 * - ready：壳是否已挂载并算出矩形（避免首帧 0 矩形误叠加）。
 */
export const screenContract = reactive<{
  rect: ScreenRect
  shell: WorldShellType
  ready: boolean
}>({
  rect: { x: 0, y: 0, w: 0, h: 0 },
  shell: 'courtyard',
  ready: false,
})

/** 写入门厅（屏风）矩形与当前壳种类 */
export function setScreenRect(rect: ScreenRect, shell: WorldShellType): void {
  screenContract.rect = rect
  screenContract.shell = shell
  screenContract.ready = true
}

/** 重置（壳卸载/未布局时） */
export function resetScreenRect(): void {
  screenContract.ready = false
}

/**
 * 取「有效屏风矩形」：壳已就绪(layout 出真实 rect)时返回该 rect；
 * 其余情形（未就绪 / 非 courtyard 壳无真实位）返回视口中心兜底矩形。
 * 门厅计时器与玉珠统一经此取位，确保空间关联稳定、首帧不跳位。
 */
export function getEffectiveScreenRect(): ScreenRect {
  if (screenContract.ready) {
    const r = screenContract.rect
    // 真实 rect 即便为 0 尺寸（边界情形）也回落兜底，避免 0 矩形误叠加
    if (r && r.w > 0 && r.h > 0) return r
  }
  return computeFallbackRect()
}
