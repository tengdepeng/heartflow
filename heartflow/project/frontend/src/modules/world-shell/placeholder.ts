// ============================================================
// 世界壳 · 占位壳（video / custom 等尚未实现渲染的模式）
// 三层架构「底层常驻氛围壳」中为视频、自定义等预留入口：
// 完整渲染器属后续里程碑，此处仅以同温层渐变兜底，保证切换不崩溃。
// 切换面板上这些模式标注「待实现」，用户选择后看到的是克制渐变而非报错。
// ============================================================

import type { WorldShellRenderer, ShellContext } from './types'
import { registerShell } from './types'

class PlaceholderShell implements WorldShellRenderer {
  readonly kind: 'video' | 'custom'

  /** 渐变两端同温层暗调（深墨 → 略亮的暖灰），克制不刺眼 */
  private readonly top = '#0b0f1a'
  private readonly bottom = '#161a24'

  constructor(kind: 'video' | 'custom') {
    this.kind = kind
  }

  private ctx: CanvasRenderingContext2D | null = null
  private width = 0
  private height = 0
  private painted = false

  mount(shellCtx: ShellContext): void {
    this.ctx = shellCtx.ctx
    this.width = shellCtx.width
    this.height = shellCtx.height
    this.painted = false
  }
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.painted = false
  }
  updateContext(): void {
    this.painted = false
  }
  render(): void {
    const ctx = this.ctx
    if (!ctx || this.painted) return
    const g = ctx.createLinearGradient(0, 0, 0, this.height)
    g.addColorStop(0, this.top)
    g.addColorStop(1, this.bottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, this.width, this.height)
    this.painted = true
  }
  destroy(): void {
    this.ctx = null
    this.painted = false
  }
}

registerShell('video', () => new PlaceholderShell('video'))
registerShell('custom', () => new PlaceholderShell('custom'))
