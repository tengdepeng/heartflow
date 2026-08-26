// ============================================================
// 家 · 3D 复刻房间导航
// 管理房间焦点、相机飞行动画、房间选择状态
// ============================================================

import { ref, computed } from 'vue'
import { HOME_ROOMS, type HomeRoom } from './rooms'
import { getRoomWorldPosition, getAllRoomIds } from './useHomeReplicaProcedural'

export interface RoomFocusState {
  /** 当前聚焦的房间 ID */
  roomId: string
  /** 房间信息 */
  room: HomeRoom
  /** 房间世界坐标 */
  worldPos: [number, number, number]
}

/** 所有可导航的房间 ID 列表 */
export const NAVIGABLE_ROOMS = getAllRoomIds()

/** 房间 ID → 显示名称映射 */
export const ROOM_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  HOME_ROOMS.map(r => [r.id, r.name]),
)

/** 房间 ID → 图标映射 */
export const ROOM_DISPLAY_ICONS: Record<string, string> = Object.fromEntries(
  HOME_ROOMS.map(r => [r.id, r.icon]),
)

/** 房间 ID → 氛围色映射 */
export const ROOM_ATMOSPHERE_COLORS: Record<string, string> = Object.fromEntries(
  HOME_ROOMS.map(r => [r.id, r.atmosphereColor]),
)

export function useHomeReplicaNavigation() {
  const currentRoomId = ref<string>(NAVIGABLE_ROOMS[0])
  const isTransitioning = ref(false)

  const currentRoom = computed<HomeRoom | undefined>(() =>
    HOME_ROOMS.find(r => r.id === currentRoomId.value),
  )

  const currentFocus = computed<RoomFocusState | null>(() => {
    const room = currentRoom.value
    if (!room) return null
    return {
      roomId: room.id,
      room,
      worldPos: getRoomWorldPosition(room.id),
    }
  })

  /** 按顺序获取房间列表 */
  const roomList = computed(() =>
    NAVIGABLE_ROOMS.map(id => ({
      id,
      name: ROOM_DISPLAY_NAMES[id] ?? id,
      icon: ROOM_DISPLAY_ICONS[id] ?? '🏠',
      color: ROOM_ATMOSPHERE_COLORS[id] ?? '#888',
      worldPos: getRoomWorldPosition(id),
    })),
  )

  /** 切换到指定房间 */
  function focusRoom(roomId: string): boolean {
    if (!NAVIGABLE_ROOMS.includes(roomId)) return false
    if (roomId === currentRoomId.value) return true
    isTransitioning.value = true
    currentRoomId.value = roomId
    // 过渡标志在动画完成后由调用方清除
    return true
  }

  /** 切换到下一个房间 */
  function focusNext(): void {
    const idx = NAVIGABLE_ROOMS.indexOf(currentRoomId.value)
    const next = NAVIGABLE_ROOMS[(idx + 1) % NAVIGABLE_ROOMS.length]
    focusRoom(next)
  }

  /** 切换到上一个房间 */
  function focusPrev(): void {
    const idx = NAVIGABLE_ROOMS.indexOf(currentRoomId.value)
    const prev = NAVIGABLE_ROOMS[(idx - 1 + NAVIGABLE_ROOMS.length) % NAVIGABLE_ROOMS.length]
    focusRoom(prev)
  }

  /** 标记过渡完成 */
  function endTransition(): void {
    isTransitioning.value = false
  }

  return {
    currentRoomId,
    currentRoom,
    currentFocus,
    roomList,
    isTransitioning,
    focusRoom,
    focusNext,
    focusPrev,
    endTransition,
  }
}