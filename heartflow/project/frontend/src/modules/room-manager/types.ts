// ============================================================
// 房间管理器 · 类型定义
// ============================================================

import type { RoomSlot, RoomDomain } from '../../engine/room-graph'

export interface RoomConfig {
  /** 房间 ID，与 room-graph 中的 id 一致 */
  roomId: string
  /** 是否在导航/地图中可见 */
  visible: boolean
  /** 自定义显示名称（为空时使用 room-graph 默认名称） */
  customName: string | null
  /** 自定义图标（为空时使用 room-graph 默认图标） */
  customIcon: string | null
  /** 自定义主题色（为空时使用 room-graph 默认颜色） */
  customColor: string | null
  /** 排序权重（越小越靠前） */
  order: number
  /** 用户钉入的宅院分区（覆盖 room-graph 默认；null=沿用默认） */
  pinnedSlot?: RoomSlot | null
  /** 用户钉入的房间领域（覆盖 room-graph 默认；null=沿用默认） */
  pinnedDomain?: RoomDomain | null
}

/** KV 存储中房间配置的键名 */
export const ROOM_CONFIG_STORAGE_KEY = 'hf:room_configs'