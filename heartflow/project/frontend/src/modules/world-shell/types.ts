// ============================================================
// 世界壳 · 策略接口与类型
// 蓝图定义（落地方案里程碑B）：
//   框架与内容分离 —— 屏风(计时器+玉珠+介质呼吸)是焊死的交互契约，
//   屏风背后的「世界」可换皮。WorldShellRenderer 是这一层的可插拔策略。
//   当前实现：courtyard(宅院·宋明留白风)。预留：stars/ocean/home-scan/custom。
// ============================================================

import type { WorldShellType } from '../../types'

/** 宅院六位置（与 room-graph RoomSlot 对齐，仅用于壳内分区锚点映射） */
export type ShellSlot =
  | 'screen' // 屏风/原点
  | 'front-yard' // 前院·高频日常
  | 'hall' // 正堂·深度核心
  | 'back-yard' // 后院·生计核心
  | 'side-wing' // 厢房·低频
  | 'corner' // 角门·系统

/** 壳渲染所需的房间数据（极简，仅位置锚点 + 名称 + 使用频率） */
export interface ShellRoomAnchor {
  id: string
  name: string
  slot: ShellSlot
  /** 路由路径（如 '/archive'），供命中检测点击进入；缺省时仅高亮不跳转 */
  path?: string
  /** 0–1，使用频率（决定星体大小/院落标签权重），缺省 0.5 */
  frequency: number
  /** 0–1，近期活跃度（决定亮度），缺省 0.3 */
  recency: number
}

/** 壳渲染上下文：由 CanvasRoom 注入 */
export interface ShellContext {
  /** 画布 2D 上下文（2D 壳使用） */
  ctx: CanvasRenderingContext2D
  /** 画布元素（3D 壳需自行取 WebGL 上下文；2D 壳可忽略） */
  canvas?: HTMLCanvasElement
  /**
   * 空间递进命中层元素（CanvasRoom 的 .shell-hit-layer，pointer-events:auto, z:5, 全屏）。
   * 3D 壳的 WebGL canvas 自身 pointer-events:none（命中由命中层接管），OrbitControls 必须
   * 绑到命中层才能收到拖拽/滚轮——否则 3D 旋转+缩放实质失效。2D 壳可忽略。
   */
  hitLayer?: HTMLElement | null
  /** 逻辑宽（CSS 像素，已考虑 DPR） */
  width: number
  /** 逻辑高 */
  height: number
  /** 路由/介质强度 0–1，影响整体呼吸幅度与亮度 */
  intensity: number
  /** 是否静谧态（安全岛），壳应收敛为极简 */
  sanctuary: boolean
  /** 世界壳配置（来自 config.worldShell.shellConfig） */
  config: Record<string, unknown>
  /** 房间锚点（来自 room-graph getRoomsBySlot） */
  rooms: ShellRoomAnchor[]
}

/** 世界壳策略接口 —— 任一壳都必须实现 */
export interface WorldShellRenderer {
  /** 壳种类标识 */
  readonly kind: WorldShellType
  /** 挂载：首次拿到 canvas 与上下文时调用 */
  mount(shellCtx: ShellContext): void
  /** 每帧绘制（timestamp 为 rAF 时间戳） */
  render(timestamp: number): void
  /** 视口尺寸变化 */
  resize(width: number, height: number): void
  /** 强度/静谧态等上下文参数变化（不重建实例） */
  updateContext(partial: Partial<ShellContext>): void
  /** 销毁：解绑事件、清理状态 */
  destroy(): void
  /**
   * 屏风（影壁）锚点矩形（逻辑像素，相对画布）。
   * 供 UI 叠加层（计时器/玉珠）对齐「屏风契约」位置。
   * 仅 courtyard 等已布局的壳实现；未实现时 UI 回退到默认门厅位。
   */
  getScreenRect?: () => { x: number; y: number; w: number; h: number; jade?: { x: number; y: number } }

  /**
   * 命中检测：给定画布逻辑坐标 (x,y)，返回命中的 zone 与（若命中具体房间墨点）房间路由。
   * 用于「空间递进」——点 zone 空白进该 slot 默认房间，点墨点进该房间。
   * 仅 courtyard 等已布局壳实现；未实现（星辰/stars 等）时 CanvasRoom 跳过点击进入。
   */
  hitTest?: (x: number, y: number) => {
    slot: ShellSlot
    roomPath?: string
    roomName?: string
    roomId?: string
  } | null

  /**
   * 设置悬停高亮状态（由 CanvasRoom 命中层 pointermove 驱动）。
   * hoverSlot 为整 zone 悬停，hoverRoomId 为具体房间墨点悬停（可空）。
   * 仅 courtyard 等已布局壳实现。
   */
  setHover?: (hoverSlot: ShellSlot | null, hoverRoomId?: string | null) => void
}

/** 壳工厂：根据 kind 构造对应策略实例 */
export type ShellFactory = () => WorldShellRenderer

const registry = new Map<WorldShellType, ShellFactory>()

/** 注册一个壳策略 */
export function registerShell(kind: WorldShellType, factory: ShellFactory): void {
  registry.set(kind, factory)
}

/** 取壳策略实例；未注册返回 null */
export function createShell(kind: WorldShellType): WorldShellRenderer | null {
  const factory = registry.get(kind)
  if (!factory) return null
  return factory()
}

/** 查询某壳是否已注册（用于 UI 判断是否「即将开放」） */
export function isShellRegistered(kind: WorldShellType): boolean {
  return registry.has(kind)
}
