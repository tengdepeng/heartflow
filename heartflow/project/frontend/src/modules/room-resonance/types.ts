// ============================================================
// 跨房间共鸣联动 · 类型
// 任务一（核心房间深度建设）首刀：把 6 个核心房间（情绪花房 / 逐日心锚 /
// 守护室 / 镜我 / 留光阁 / 思绪书房）的"当下状态"作为共鸣信号，在内存中
// 聚合成跨房间态势，让任意房间既能发射也能消费。
//
// 设计原则：
// - 纯前端、内存态、零新依赖（复用各房间既有 composable）。
// - 只读房间状态，不写各房间主 schema，不触发 migrate / saveSchema。
// - 信号仅在运行时计算，可解释、可测试，守「本地私有」（不外发、不落盘）。
// ============================================================

/** 6 个核心房间键（与路由 / 视图一一对应） */
export type RoomKey =
  | 'emotion-garden'
  | 'daily-anchor'
  | 'guard-room'
  | 'mirror-self'
  | 'light-pavilion'
  | 'study'

/** 共鸣信号种类 */
export type RoomSignalKind =
  | 'mood'
  | 'focus'
  | 'security'
  | 'mirror'
  | 'light'
  | 'note'
  | 'presence'

/** 一条房间共鸣信号 */
export interface RoomSignal {
  /** 来源房间 */
  room: RoomKey
  /** 信号种类 */
  kind: RoomSignalKind
  /** 展示标签（如「专注：本周心锚#3」） */
  label: string
  /** 人类可读补充 */
  detail?: string
  /** 归一化时间戳（ms） */
  ts: number
  /** 强度 0..1（可选） */
  strength?: number
}

/** 跨房间态势聚合结果 */
export interface RoomClimate {
  /** 窗口内活跃过的房间 */
  rooms: RoomKey[]
  /** 每房间窗口内最新信号 */
  latestByRoom: Partial<Record<RoomKey, RoomSignal>>
  /** 窗口内信号总数 */
  totalSignals: number
  /** 统计窗口（ms） */
  windowMs: number
}

/** 房间键 → 中文名（用于汇总文案） */
export const ROOM_LABELS: Record<RoomKey, string> = {
  'emotion-garden': '情绪花房',
  'daily-anchor': '逐日心锚',
  'guard-room': '守护室',
  'mirror-self': '镜我',
  'light-pavilion': '留光阁',
  study: '思绪书房',
}
