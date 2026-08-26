// ============================================================
// 世界壳 · 星辰（深空星图）
// 框架与内容分离：屏风(计时器+玉珠+介质呼吸)是焊死的交互契约，
// 星辰壳只替换屏风之后的那层世界视觉语言。
// 空间锚点沿用 courtyard 的 ZONES 归一化坐标，保证「进深层级」跨壳一致：
//   屏风(screen)   —— 中央星核（心流原点，计时器/玉珠叠加其上）
//   前院(front-yard)—— 星团（三颗相邻星体：时间长廊/逐日心锚/情绪花房）
//   正堂(hall)     —— 星云（房间如星云里的节点）
//   后院(back-yard)—— 漂浮星体（生计）
//   厢房(side-wing)—— 漂浮星体（低频）
//   角门(corner)   —— 远处微星（系统）
// 星体大小 = 使用频率；星体亮度 = 近期活跃度；整体随介质呼吸与静谧态收敛。
// ============================================================

import type {
  WorldShellRenderer,
  ShellContext,
  ShellRoomAnchor,
  ShellSlot,
} from './types'

interface SlotZone {
  slot: ShellSlot
  /** 归一化中心坐标（相对画布比例） */
  x: number
  y: number
}

// 复用 courtyard 的院落空间拓扑，让「推门之后的世界」在宅院/星辰间无缝切换时位置不跳变
const ZONES: SlotZone[] = [
  { slot: 'screen', x: 0.5, y: 0.32 },     // 中央星核
  { slot: 'front-yard', x: 0.5, y: 0.66 }, // 前院星团
  { slot: 'hall', x: 0.5, y: 0.12 },       // 正堂星云
  { slot: 'back-yard', x: 0.82, y: -0.02 },// 后院星体群
  { slot: 'side-wing', x: 0.16, y: 0.5 },  // 厢房星体群
  { slot: 'corner', x: 0.5, y: 0.92 },     // 角门微星
]

/** 单个星体 */
interface StarBody {
  room: ShellRoomAnchor
  /** 锚点基准坐标（画布像素） */
  bx: number
  by: number
  /** 漂浮相位偏移 */
  phase: number
  /** 轨道半径（前院星团内相互散开） */
  orbit: number
  hue: number
  /** 命中半径（逻辑像素）：baseR + 容差，供 hitTest 用（与绘制大小一致） */
  hitR: number
  /** 实际绘制坐标缓存（含 floatY 漂浮偏移），hitTest 直接读此避免每帧重算 */
  drawX: number
  drawY: number
}

export class StarsShell implements WorldShellRenderer {
  readonly kind = 'stars' as const

  private ctx: CanvasRenderingContext2D | null = null
  private width = 0
  private height = 0
  private intensity = 1
  private sanctuary = false
  private config: Record<string, unknown> = {}
  private rooms: ShellRoomAnchor[] = []
  private stars: StarBody[] = []
  private backgroundStars: Array<{ x: number; y: number; r: number; tw: number; hue: number }> = []

  /** 各 zone 屏幕中心缓存（逻辑像素），layout 时重算，供 hitTest 用 */
  private zoneCenters: Array<{ slot: ShellSlot; x: number; y: number }> = []

  /** 悬停高亮状态（由 setHover 设置，render/drawStar 消费） */
  private hoverSlot: ShellSlot | null = null
  private hoverRoomId: string | null = null

  /** 高亮描金色（跟随 --accent，挂载时读取，回退暖琥珀） */
  private accentColor = 'rgba(212,165,116,1)'

  /** 命中容差（逻辑像素），给星体留一点点击余量 */
  private static readonly HIT_TOLERANCE = 10

  mount(shellCtx: ShellContext): void {
    this.ctx = shellCtx.ctx
    this.width = shellCtx.width
    this.height = shellCtx.height
    this.intensity = shellCtx.intensity
    this.sanctuary = shellCtx.sanctuary
    this.config = shellCtx.config ?? {}
    this.rooms = shellCtx.rooms ?? []
    this.layout()
    this.layoutHitTargets()
    // 跟随 --accent：高亮反馈不写死颜色
    if (typeof window !== 'undefined' && shellCtx.ctx.canvas) {
      const css = getComputedStyle(shellCtx.ctx.canvas)
      const accent = css.getPropertyValue('--accent').trim()
      if (accent) this.accentColor = accent
    }
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.layout()
    this.layoutHitTargets()
  }

  updateContext(partial: Partial<ShellContext>): void {
    if (partial.intensity !== undefined) this.intensity = partial.intensity
    if (partial.sanctuary !== undefined) this.sanctuary = partial.sanctuary
    if (partial.config !== undefined) this.config = partial.config
    if (partial.rooms !== undefined) {
      this.rooms = partial.rooms
      this.layout()
      this.layoutHitTargets()
    }
  }

  destroy(): void {
    this.ctx = null
    this.stars = []
    this.backgroundStars = []
    this.zoneCenters = []
    this.hoverSlot = null
    this.hoverRoomId = null
  }

  /** 根据 ZONES + 房间数据生成星体/背景星 */
  private layout(): void {
    const density = (this.config.starFieldDensity as number) ?? 0.5
    const cx = this.width * 0.5
    const cy = this.height * 0.32 // 星核锚点（与 courtyard 影壁同一中心）

    // 背景微星：密度由 starFieldDensity 控制
    const bgCount = Math.round(80 + density * 160)
    this.backgroundStars = Array.from({ length: bgCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: 0.4 + Math.random() * 1.6,
      tw: Math.random() * Math.PI * 2,
      hue: 200 + Math.random() * 40,
    }))

    // 房间星体：按 slot 归位，前院/正堂做内部散开
    this.stars = []
    for (const zone of ZONES) {
      const zoneRooms = this.rooms.filter(r => r.slot === zone.slot)
      const zx = this.width * zone.x
      const zy = this.height * zone.y
      zoneRooms.forEach((room, i) => {
        const spread = zone.slot === 'front-yard' ? 70 : zone.slot === 'hall' ? 60 : 46
        const angle = (i / Math.max(1, zoneRooms.length)) * Math.PI * 2 + Math.random()
        const orbit = zone.slot === 'screen' ? 0 : spread * (0.4 + Math.random() * 0.6)
        const bx = zx + (zone.slot === 'screen' ? 0 : Math.cos(angle) * orbit)
        const by = zy + (zone.slot === 'screen' ? 0 : Math.sin(angle) * orbit)
        this.stars.push({
          room,
          bx,
          by,
          phase: Math.random() * Math.PI * 2,
          orbit,
          hue: zone.slot === 'screen' ? 38 : 30 + Math.random() * 30,
          hitR: 3 + room.frequency * 9 + StarsShell.HIT_TOLERANCE,
          drawX: bx,
          drawY: by,
        })
      })
    }
    void cx
    void cy
  }

  /** 缓存 zone 中心屏幕坐标（逻辑像素），供 hitTest 判定 zone 命中区 */
  private layoutHitTargets(): void {
    this.zoneCenters = ZONES.map((z) => ({
      slot: z.slot,
      x: this.width * z.x,
      y: this.height * z.y,
    }))
  }

  /** 设置悬停高亮（CanvasRoom 命中层 pointermove 驱动） */
  setHover(slot: ShellSlot | null, roomId?: string | null): void {
    this.hoverSlot = slot
    this.hoverRoomId = roomId ?? null
  }

  /** 命中检测：给定画布逻辑坐标，返回命中的 zone 与（若命中星体）房间路由 */
  hitTest(x: number, y: number): {
    slot: ShellSlot
    roomPath?: string
    roomName?: string
    roomId?: string
  } | null {
    // 1) 先判具体房间星体（实际绘制坐标，含 floatY 漂浮偏移），更精确优先
    for (const s of this.stars) {
      const r = s.hitR
      const dx = x - s.drawX
      const dy = y - s.drawY
      if (dx * dx + dy * dy <= r * r) {
        return {
          slot: s.room.slot,
          roomPath: s.room.path,
          roomName: s.room.name,
          roomId: s.room.id,
        }
      }
    }
    // 2) 再判 zone 中心圆（半径 min(w,h)*0.12）
    const zoneR = Math.min(this.width, this.height) * 0.12
    for (const z of this.zoneCenters) {
      const dx = x - z.x
      const dy = y - z.y
      if (dx * dx + dy * dy <= zoneR * zoneR) {
        return { slot: z.slot }
      }
    }
    return null
  }

  render(timestamp: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const { width: w, height: h } = this

    ctx.clearRect(0, 0, w, h)

    // 深空底：径向渐变，中心微亮（星核辉光），边缘沉入暗蓝黑
    const bg = ctx.createRadialGradient(w / 2, h * 0.32, 0, w / 2, h * 0.32, Math.max(w, h) * 0.85)
    bg.addColorStop(0, 'rgba(26,32,54,0.55)')
    bg.addColorStop(0.5, 'rgba(12,16,30,0.85)')
    bg.addColorStop(1, 'rgba(6,8,16,0.95)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // 背景微星（呼吸闪烁）
    ctx.save()
    for (const s of this.backgroundStars) {
      const tw = 0.5 + Math.sin(timestamp / 1400 + s.tw) * 0.5
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${s.hue}, 60%, ${70 + tw * 20}%, ${(0.25 + tw * 0.4) * this.intensity})`
      ctx.fill()
    }
    ctx.restore()

    // 净谧态：整体收敛——降低背景星密度感，突出中央星核
    const dim = this.sanctuary ? 0.55 : 1
    const breath = this.sanctuary
      ? 0.5 + Math.sin(timestamp / 2800) * 0.08
      : 0.6 + Math.sin(timestamp / 2200) * 0.18

    // 星核（屏风位）—— 计时器与玉珠叠加其上，这里画辉光与脉动光环
    this.drawCore(ctx, w * 0.5, h * 0.32, breath, timestamp)

    // 连接线：星核 → 各 slot 星座连线（暗示「出门去不同星系」）
    ctx.save()
    ctx.strokeStyle = `rgba(150,180,235,${(0.12 * breath * dim).toFixed(3)})`
    ctx.lineWidth = 0.6
    for (const zone of ZONES) {
      if (zone.slot === 'screen') continue
      ctx.beginPath()
      ctx.moveTo(w * 0.5, h * 0.32)
      ctx.lineTo(this.width * zone.x, this.height * zone.y)
      ctx.stroke()
    }
    ctx.restore()

    // 房间星体
    for (const star of this.stars) {
      const hovered = this.hoverSlot === star.room.slot
      const isHover = this.hoverRoomId === star.room.id && hovered
      this.drawStar(ctx, star, breath, dim, timestamp, isHover)
    }
  }

  /** 星核：屏风位（计时器+玉珠叠加其上），这里绘制脉动光晕与光环 */
  private drawCore(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    breath: number,
    ts: number,
  ): void {
    const r = Math.min(this.width, this.height) * 0.08
    const pulse = r * (1 + Math.sin(ts / 1600) * 0.06)

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse * 3.2)
    glow.addColorStop(0, `rgba(255,225,170,${(0.5 * breath).toFixed(3)})`)
    glow.addColorStop(0.4, `rgba(212,165,116,${(0.22 * breath).toFixed(3)})`)
    glow.addColorStop(1, 'rgba(212,165,116,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, pulse * 3.2, 0, Math.PI * 2)
    ctx.fill()

    // 双层光环
    ctx.strokeStyle = `rgba(224,178,122,${(0.7 * breath).toFixed(3)})`
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([3, 6])
    ctx.strokeStyle = `rgba(190,210,235,${(0.4 * breath).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // 中央实心小核
    ctx.fillStyle = `rgba(255,238,200,${(0.9 * breath).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2)
    ctx.fill()
  }

  /** 单颗房间星体：大小=频率，亮度=活跃度；isHover 时辉光加亮 + 暖琥珀描边加粗 */
  private drawStar(
    ctx: CanvasRenderingContext2D,
    star: StarBody,
    breath: number,
    dim: number,
    ts: number,
    isHover: boolean,
  ): void {
    const freq = star.room.frequency
    const recency = star.room.recency
    const baseR = 3 + freq * 9
    const floatY = Math.sin(ts / 1800 + star.phase) * 4
    const x = star.bx
    const y = star.by + floatY

    // 缓存实际绘制坐标，供 hitTest 直接读取（与视觉一致，含漂浮偏移）
    star.drawX = x
    star.drawY = y

    // 辉光
    const glowR = baseR * (isHover ? 3.4 : 2.4)
    const g = ctx.createRadialGradient(x, y, 0, x, y, glowR)
    const light = 60 + recency * 35
    const glowAlpha = (isHover ? 0.85 : 0.5) * breath * dim
    g.addColorStop(0, `hsla(${star.hue}, 80%, ${light}%, ${glowAlpha.toFixed(3)})`)
    g.addColorStop(1, `hsla(${star.hue}, 80%, ${light}%, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, glowR, 0, Math.PI * 2)
    ctx.fill()

    // 实体星点
    if (isHover) {
      ctx.save()
      ctx.shadowColor = this.accentColor
      ctx.shadowBlur = 14
    }
    ctx.fillStyle = isHover
      ? this.accentColor
      : `hsla(${star.hue}, 85%, ${72 + recency * 20}%, ${(0.9 * breath * dim).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, baseR * (isHover ? 1.3 : 1), 0, Math.PI * 2)
    ctx.fill()
    if (isHover) ctx.restore()

    // 悬停描边（暖琥珀，跟随 --accent），给「可点」反馈
    if (isHover) {
      ctx.save()
      ctx.strokeStyle = this.accentColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, baseR * 1.3 + 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // 名称（轻色，深色/暗色主题下可读；悬停描金加亮）
    ctx.fillStyle = isHover
      ? this.accentColor
      : `rgba(220,228,255,${(0.55 * breath * dim).toFixed(3)})`
    ctx.font = `${isHover ? 'bold ' : ''}${Math.max(11, baseR * 1.2)}px "Songti SC", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(star.room.name, x, y + baseR * (isHover ? 1.3 : 1) + 3)
  }
}

// 自注册
import { registerShell } from './types'
registerShell('stars', () => new StarsShell())
