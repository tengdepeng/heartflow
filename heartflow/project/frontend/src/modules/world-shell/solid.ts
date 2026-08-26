// ============================================================
// 世界壳 · 纯色（极简氛围底）
// 三层架构「底层常驻氛围壳」的模式之一：以单一底色铺满屏幕，
// 仅保留极轻的亮度呼吸，作为最克制的背景（同温层深墨兜底）。
// 颜色来自 config.solidColor（用户可改，宪法：不写死）。
// ============================================================

import type { WorldShellRenderer, ShellContext } from './types'
import { registerShell } from './types'

export class SolidShell implements WorldShellRenderer {
  readonly kind = 'solid' as const

  private ctx: CanvasRenderingContext2D | null = null
  private width = 0
  private height = 0
  private intensity = 1
  private color = '#0b0f1a'
  /** 已铺底标记，避免每帧重绘纯色（纯色无需逐帧重绘） */
  private painted = false

  mount(shellCtx: ShellContext): void {
    this.ctx = shellCtx.ctx
    this.width = shellCtx.width
    this.height = shellCtx.height
    this.intensity = shellCtx.intensity
    this.readColor(shellCtx.config)
    this.painted = false
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.painted = false
  }

  updateContext(partial: Partial<ShellContext>): void {
    if (partial.intensity !== undefined) this.intensity = partial.intensity
    if (partial.config !== undefined) {
      this.readColor(partial.config)
      this.painted = false
    }
  }

  render(_timestamp: number): void {
    const ctx = this.ctx
    if (!ctx) return
    // 纯色底：仅首帧铺底 + 极轻呼吸（呼吸用极低 alpha 叠加，避免闪）
    if (!this.painted) {
      ctx.clearRect(0, 0, this.width, this.height)
      ctx.fillStyle = this.color
      ctx.fillRect(0, 0, this.width, this.height)
      this.painted = true
    }
    // 极轻亮度呼吸（0.96–1.0），保持"介质活着"但不喧宾夺主
    const breathe = 0.98 + 0.02 * (0.5 + 0.5 * Math.sin(_timestamp * 0.0006))
    ctx.save()
    ctx.globalAlpha = (1 - breathe) * 0.4 * this.intensity
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.restore()
  }

  destroy(): void {
    this.ctx = null
    this.painted = false
  }

  private readColor(config?: Record<string, unknown>): void {
    if (config && typeof config.solidColor === 'string' && config.solidColor) {
      this.color = config.solidColor
    }
  }
}

registerShell('solid', () => new SolidShell())
