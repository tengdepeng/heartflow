// ============================================================
// 桌面收纳空间（Desk Spaces）· 类型
// 形态对齐安卓桌面文件夹 / 「游戏空间」：桌面上一个收纳图标，
// 点开是一个只装着指定房间的独立空间，进来不必在全量侧栏里翻找。
// 收纳项 = 房间图（engine/room-graph）里的房间，与应用内导航同源。
// ============================================================

/** 收纳项类型：房间（应用内导航）或系统应用（PC/安卓已装 App） */
export type DeskItemKind = 'room' | 'app'

/** 一个桌面收纳空间 */
export interface DeskSpace {
  id: string
  name: string
  /** 空间图标（emoji 字形，零资源依赖） */
  icon: string
  /** 空间强调色：进入空间后的氛围主色 */
  accent: string
  /** 收纳的房间 ID 列表（对应 RoomNode.id） */
  roomIds: string[]
  /** 收纳的系统应用 ID 列表（对应 SystemApp.id，如 `sys:<exec|package>`） */
  appIds: string[]
  createdAt: number
}

/** 空间内的一个收纳项（RoomNode + 用户自定义覆盖解析后的结果，或系统应用映射） */
export interface DeskItem {
  id: string
  name: string
  icon: string
  color: string
  /** 房间路由路径；系统应用无此项 */
  path?: string
  /** 项类型：决定点击行为是「跳转房间」还是「启动应用」 */
  kind: DeskItemKind
  /** 系统应用的启动目标（.lnk/.app 路径或安卓包名）；仅 kind==='app' 有值 */
  launch?: string
}

/** 持久化键 */
export const DESK_SPACES_STORAGE_KEY = 'hf:desk:spaces'

/** 空间图标预设 */
export const DESK_ICON_PRESETS = [
  '🗂️', '🎮', '🌙', '☀️', '📚', '🍵',
  '🎧', '🧭', '🌿', '🔥', '💤', '🪐',
]

/** 空间强调色预设（沿用房间色板口径，保暗色暖琥珀） */
export const DESK_ACCENT_PRESETS = [
  '#c49a6a', '#7a9a5a', '#6a8ab0', '#b8788a', '#8aacb8', '#a0806a',
]
