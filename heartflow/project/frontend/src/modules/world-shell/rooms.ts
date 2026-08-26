// ============================================================
// 世界壳 · 房间锚点构建（共享）
// 将 room-graph 的 slot 数据映射为壳锚点，供各壳（底层氛围壳 / 中层交互面）复用，
// 避免 CanvasRoom 与中层 SurfaceStage 各自重复实现导致漂移。
// ============================================================

import type { ShellRoomAnchor } from './types'
import { getRoomsBySlot } from '../../engine/room-graph'
import type { RoomSlot } from '../../engine/room-graph'

// 宅院分区（room-graph 领域，RoomSlot）：仅这些分区挂房间，用于按 slot 查询带房间的壳锚点。
// 其余壳槽（screen / side-wing / corner 等，属 world-shell 私有 ShellSlot）无房间，不在此迭代。
const ROOM_SLOTS: RoomSlot[] = ['front-yard', 'hall', 'back-yard']

/** 将 room-graph 的 slot 数据映射为壳锚点（频率/活跃度取默认，待 usage 统计接入） */
export function buildShellRoomAnchors(): ShellRoomAnchor[] {
  const anchors: ShellRoomAnchor[] = []
  for (const slot of ROOM_SLOTS) {
    for (const room of getRoomsBySlot(slot)) {
      anchors.push({
        id: room.id,
        name: room.name,
        slot,
        path: room.path,
        frequency: 0.5,
        recency: 0.3,
      })
    }
  }
  return anchors
}
