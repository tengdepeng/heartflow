// ============================================================
// 世界壳 · 宅院（宋明留白风）
// 2D 模式 = 极简骨架：6 栋宋明建筑剪影 + 中央留白（玉珠位）+ 淡墨纵深轴线
// 不画任何文字标签——2D 只做导航骨架，房间名/描述进 3D 或进房才看。
// 三进院落分区映射 room-graph 的 slot：
//   屏风(screen)   —— 影壁居中（最下，入口）
//   前院(front-yard) —— 影壁前方（较低频日常）
//   正堂(hall)     —— 影壁后方深处（核心）
//   后院(back-yard) —— 右侧
//   厢房(side-wing)—— 左侧
//   角门(corner)   —— 最上（系统）
// 介质呼吸：由描金剪影 opacity 微动承担。
// ============================================================

import type {
  WorldShellRenderer,
  ShellContext,
  ShellRoomAnchor,
  ShellSlot,
} from './types'

interface SlotZone {
  slot: ShellSlot
  /** 建筑类型，决定剪影形状 */
  form: 'screen' | 'front-yard' | 'hall' | 'back-yard' | 'side-wing' | 'corner'
  /** 归一化锚点中心（相对画布比例） */
  x: number
  y: number
  /** 建筑基准尺寸（相对画布短边比例） */
  w: number
  h: number
  /** 描金色相 */
  accent: string
}

// y 从小到大 = 从入口（下）到深处（上），营造"进门往里走"的纵深
const ZONES: SlotZone[] = [
  { slot: 'screen', form: 'screen', x: 0.5, y: 0.82, w: 0.4, h: 0.16, accent: 'rgba(212,165,116,0.95)' },
  { slot: 'front-yard', form: 'front-yard', x: 0.5, y: 0.62, w: 0.62, h: 0.14, accent: 'rgba(212,165,116,0.6)' },
  { slot: 'hall', form: 'hall', x: 0.5, y: 0.36, w: 0.46, h: 0.2, accent: 'rgba(212,165,116,0.5)' },
  { slot: 'back-yard', form: 'back-yard', x: 0.84, y: 0.5, w: 0.22, h: 0.3, accent: 'rgba(168,140,96,0.42)' },
  { slot: 'side-wing', form: 'side-wing', x: 0.16, y: 0.5, w: 0.22, h: 0.3, accent: 'rgba(168,140,96,0.38)' },
  { slot: 'corner', form: 'corner', x: 0.5, y: 0.14, w: 0.5, h: 0.08, accent: 'rgba(140,120,90,0.3)' },
]

export class CourtyardShell implements WorldShellRenderer {
  readonly kind = 'courtyard' as const

  private ctx: CanvasRenderingContext2D | null = null
  private width = 0
  private height = 0
  private intensity = 1
  private sanctuary = false
  private config: Record<string, unknown> = {}
  private rooms: ShellRoomAnchor[] = []

  /** 影壁中央计时器预留框（供 UI 或后续叠加层对齐） */
  readonly screenRect = { x: 0, y: 0, w: 0, h: 0 }

  /** 各 zone 的屏幕矩形缓存（逻辑像素），layout 时重算，供 hitTest 用 */
  private zoneRects: Array<{
    slot: ShellSlot
    x: number
    y: number
    w: number
    h: number
  }> = []

  /** 各房间锚点墨点屏幕坐标缓存（逻辑像素），layout 时重算，供 hitTest 用 */
  private anchorPoints: Array<{
    id: string
    slot: ShellSlot
    path?: string
    name: string
    x: number
    y: number
    r: number
  }> = []

  /** 悬停高亮状态（由 setHover 设置，render 时消费） */
  private hoverSlot: ShellSlot | null = null
  private hoverRoomId: string | null = null

  /** 高亮描金色（跟随 --accent，挂载时读取，回退暖金） */
  private accentColor = 'rgba(212,165,116,1)'

  /** 命中容差（逻辑像素），给墨点留一点点击余量 */
  private static readonly HIT_TOLERANCE = 8

  mount(shellCtx: ShellContext): void {
    this.ctx = shellCtx.ctx
    this.width = shellCtx.width
    this.height = shellCtx.height
    this.intensity = shellCtx.intensity
    this.sanctuary = shellCtx.sanctuary
    this.config = shellCtx.config ?? {}
    this.rooms = shellCtx.rooms ?? []
    this.layoutScreen()
    this.layoutHitTargets()
    if (typeof window !== 'undefined' && shellCtx.ctx.canvas) {
      const css = getComputedStyle(shellCtx.ctx.canvas)
      const accent = css.getPropertyValue('--accent').trim()
      if (accent) this.accentColor = accent
    }
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.layoutScreen()
    this.layoutHitTargets()
  }

  updateContext(partial: Partial<ShellContext>): void {
    if (partial.intensity !== undefined) this.intensity = partial.intensity
    if (partial.sanctuary !== undefined) this.sanctuary = partial.sanctuary
    if (partial.config !== undefined) this.config = partial.config
    if (partial.rooms !== undefined) {
      this.rooms = partial.rooms
      this.layoutHitTargets()
    }
  }

  destroy(): void {
    this.ctx = null
    this.rooms = []
    this.zoneRects = []
    this.anchorPoints = []
    this.hoverSlot = null
    this.hoverRoomId = null
  }

  setHover(slot: ShellSlot | null, roomId?: string | null): void {
    this.hoverSlot = slot
    this.hoverRoomId = roomId ?? null
  }

  hitTest(x: number, y: number): {
    slot: ShellSlot
    roomPath?: string
    roomName?: string
    roomId?: string
  } | null {
    for (const a of this.anchorPoints) {
      const r = a.r + CourtyardShell.HIT_TOLERANCE
      const dx = x - a.x
      const dy = y - a.y
      if (dx * dx + dy * dy <= r * r) {
        return { slot: a.slot, roomPath: a.path, roomName: a.name, roomId: a.id }
      }
    }
    for (const z of this.zoneRects) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
        // 命中建筑区域：携带该 slot 首个房间信息，使「点建筑任意处」也能进房/激活浮层，
        // 不必像素级点中墨点（墨点仅作微弱提示，见 drawAnchors）。
        const room = this.rooms.find((r) => r.slot === z.slot)
        return {
          slot: z.slot,
          roomPath: room?.path,
          roomName: room?.name,
          roomId: room?.id,
        }
      }
    }
    return null
  }

  /** 屏侧玉珠位（供 UI 叠加层对齐）—— 2D 骨架下玉珠在中央留白区，这里返回影壁中心 */
  getScreenRect(): { x: number; y: number; w: number; h: number; jade?: { x: number; y: number } } {
    return {
      x: this.screenRect.x,
      y: this.screenRect.y,
      w: this.screenRect.w,
      h: this.screenRect.h,
      jade: {
        x: this.screenRect.x + this.screenRect.w / 2,
        y: this.screenRect.y + this.screenRect.h / 2,
      },
    }
  }

  private layoutScreen(): void {
    const z = ZONES[0]
    const layout = (this.config.courtyardLayout as string) ?? 'three-entries'
    const widthScale =
      layout === 'one-entry' ? 0.7 : layout === 'circular' ? 0.85 : 1
    const w = this.width * z.w * widthScale
    const h = this.height * z.h
    this.screenRect.x = this.width * z.x - w / 2
    this.screenRect.y = this.height * z.y - h / 2
    this.screenRect.w = w
    this.screenRect.h = h
  }

  private layoutHitTargets(): void {
    this.zoneRects = ZONES.map((z) => {
      const zw = this.width * z.w
      const zh = this.height * z.h * 1.15 // 剪影顶部飞檐略超出矩形，留一点 hit 容差
      return {
        slot: z.slot,
        x: this.width * z.x - zw / 2,
        y: this.height * z.y - zh / 2,
        w: zw,
        h: zh,
      }
    })

    this.anchorPoints = []
    for (const z of ZONES) {
      const zw = this.width * z.w
      const zh = this.height * z.h
      const x = this.width * z.x - zw / 2
      const y = this.height * z.y - zh / 2
      const anchors = this.rooms.filter((r) => r.slot === z.slot)
      if (anchors.length === 0) continue
      const stepX = zw / (anchors.length + 1)
      anchors.forEach((room, i) => {
        const px = x + stepX * (i + 1)
        const py = y + zh * 0.72
        const dotR = 2 + room.frequency * 3.2
        this.anchorPoints.push({
          id: room.id,
          slot: room.slot,
          path: room.path,
          name: room.name,
          x: px,
          y: py,
          r: dotR,
        })
      })
    }
  }

  render(timestamp: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const { width: w, height: h } = this

    ctx.clearRect(0, 0, w, h)

    // 背景：极淡宣纸底（留白），不抢戏
    const paper = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.7)
    paper.addColorStop(0, 'rgba(250,247,240,0.05)')
    paper.addColorStop(1, 'rgba(250,247,240,0)')
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, w, h)

    // 呼吸相位
    const breath = this.sanctuary
      ? 0.5 + Math.sin(timestamp / 2600) * 0.12
      : 0.62 + Math.sin(timestamp / 3200) * 0.18
    const breathAmp = 0.4 + this.intensity * 0.6

    // 中央留白：纵向淡墨轴线（影壁→角门 的纵深暗示），极淡
    this.drawAxis(ctx, breath * 0.4)

    for (const zone of ZONES) {
      const hovered = this.hoverSlot === zone.slot
      this.drawSilhouette(ctx, zone, breath, breathAmp, hovered)
    }
  }

  /** 中央纵向轴线：从入口（影壁 y=0.82）到最深（角门 y=0.14），淡墨虚线 */
  private drawAxis(ctx: CanvasRenderingContext2D, a: number): void {
    ctx.save()
    ctx.strokeStyle = `rgba(150,135,108,${(a * 0.5).toFixed(3)})`
    ctx.lineWidth = 0.8
    ctx.setLineDash([2, 8])
    ctx.beginPath()
    ctx.moveTo(this.width * 0.5, this.height * 0.86)
    ctx.lineTo(this.width * 0.5, this.height * 0.1)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  /** 绘制一栋宋明建筑剪影（描金细线 path，无填充或极淡填充） */
  private drawSilhouette(
    ctx: CanvasRenderingContext2D,
    zone: SlotZone,
    breath: number,
    amp: number,
    hovered: boolean,
  ): void {
    const cx = this.width * zone.x
    const cy = this.height * zone.y
    const bw = this.width * zone.w
    const bh = this.height * zone.h

    const a = (zone.form === 'screen' ? 0.95 : 0.6) * breath
    ctx.save()

    // 极淡墨色填充（留白主体的体块感）
    ctx.beginPath()
    this.buildRoofPath(ctx, zone.form, cx, cy, bw, bh)
    ctx.fillStyle = `rgba(238,230,218,${0.04 + amp * 0.03})`
    ctx.fill()

    // 描金细线（呼吸）
    ctx.lineWidth = (zone.form === 'screen' ? 1.6 : 1.1) * (hovered ? 1.9 : 1)
    if (hovered) {
      ctx.strokeStyle = this.accentColor
      ctx.shadowColor = this.accentColor
      ctx.shadowBlur = 14
    } else {
      ctx.strokeStyle = zone.accent.replace(/[\d.]+\)$/, `${a.toFixed(3)})`)
    }
    ctx.stroke()
    ctx.restore()

    // 该 zone 的房间锚点（小墨点，无文字）—— 仅作"有内容"的微弱提示
    const anchors = this.rooms.filter((r) => r.slot === zone.slot)
    this.drawAnchors(ctx, anchors, cx, cy, bw, bh, breath, hovered)
  }

  /**
   * 宋明建筑剪影 path：
   * - screen 影壁：横长矩形 + 中间拱门洞（入口）
   * - hall 正堂：歇山顶（飞檐起翘）+ 台基
   * - front-yard 前院：单坡顶长屋（连廊感）
   * - side-wing 厢房：单坡顶小屋 + 小窗
   * - back-yard 后院：单坡顶 + 圆窗
   * - corner 角门：圆形门洞（满月门）
   */
  private buildRoofPath(
    ctx: CanvasRenderingContext2D,
    form: SlotZone['form'],
    cx: number,
    cy: number,
    bw: number,
    bh: number,
  ): void {
    const left = cx - bw / 2
    const right = cx + bw / 2
    const top = cy - bh / 2
    const bottom = cy + bh / 2
    const eave = Math.min(bw, bh) * 0.16 // 飞檐起翘高度

    ctx.beginPath()
    switch (form) {
      case 'screen': {
        // 影壁：横长墙 + 中央拱门
        ctx.rect(left, top, bw, bh)
        // 拱门洞（反向挖空用描边表现，这里只画轮廓，门洞另画）
        ctx.moveTo(cx - bw * 0.08, bottom)
        ctx.lineTo(cx - bw * 0.08, cy + bh * 0.1)
        ctx.arc(cx, cy + bh * 0.1, bw * 0.08, Math.PI, 0)
        ctx.lineTo(cx + bw * 0.08, bottom)
        break
      }
      case 'hall': {
        // 正堂：歇山顶（飞檐起翘）
        ctx.moveTo(left - eave, top + eave)
        ctx.quadraticCurveTo(left - eave, top - eave * 0.4, left + bw * 0.12, top - eave)
        ctx.lineTo(right - bw * 0.12, top - eave)
        ctx.quadraticCurveTo(right + eave, top - eave * 0.4, right + eave, top + eave)
        ctx.lineTo(right, top + bh * 0.28)
        ctx.lineTo(right, bottom)
        ctx.lineTo(left, bottom)
        ctx.lineTo(left, top + bh * 0.28)
        ctx.closePath()
        break
      }
      case 'front-yard': {
        // 前院：单坡顶长屋（右侧略低，连廊）
        ctx.moveTo(left - eave * 0.5, top + eave)
        ctx.lineTo(right + eave * 0.5, top + bh * 0.5)
        ctx.lineTo(right, top + bh * 0.5)
        ctx.lineTo(right, bottom)
        ctx.lineTo(left, bottom)
        ctx.closePath()
        break
      }
      case 'side-wing':
      case 'back-yard': {
        // 厢房/后院：单坡顶小屋 + 圆窗
        ctx.moveTo(left - eave * 0.4, top + eave)
        ctx.lineTo(right + eave * 0.4, top + bh * 0.45)
        ctx.lineTo(right, top + bh * 0.45)
        ctx.lineTo(right, bottom)
        ctx.lineTo(left, bottom)
        ctx.closePath()
        // 圆窗
        ctx.moveTo(cx + bw * 0.12, cy)
        ctx.arc(cx, cy, bw * 0.06, 0, Math.PI * 2)
        break
      }
      case 'corner': {
        // 角门：满月门洞
        ctx.moveTo(left, cy - bh * 0.5)
        ctx.lineTo(right, cy - bh * 0.5)
        ctx.lineTo(right, cy + bh * 0.1)
        ctx.arc(cx, cy + bh * 0.1, bh * 0.4, 0, Math.PI)
        ctx.lineTo(left, cy + bh * 0.1)
        ctx.closePath()
        break
      }
    }
  }

  /** 房间锚点：仅小墨点（无名称文字），frequency 决定点大小；悬停放大反馈 */
  private drawAnchors(
    ctx: CanvasRenderingContext2D,
    anchors: ShellRoomAnchor[],
    cx: number,
    cy: number,
    bw: number,
    bh: number,
    breath: number,
    hovered: boolean,
  ): void {
    if (anchors.length === 0) return
    const y = cy + bh * 0.2
    const stepX = bw / (anchors.length + 1)
    anchors.forEach((room, i) => {
      const px = cx - bw / 2 + stepX * (i + 1)
      const dotR = 1.8 + room.frequency * 2.8
      const isHover = this.hoverRoomId === room.id && hovered
      const r = isHover ? dotR * 1.7 : dotR
      ctx.save()
      if (isHover) {
        ctx.shadowColor = this.accentColor
        ctx.shadowBlur = 10
        ctx.fillStyle = this.accentColor
      } else {
        ctx.fillStyle = `rgba(224,178,122,${(0.5 + room.recency * 0.4) * breath})`
      }
      ctx.beginPath()
      ctx.arc(px, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }
}

// 自注册
import { registerShell } from './types'
registerShell('courtyard', () => new CourtyardShell())
