// ============================================================
// 桌面收纳空间 · 状态引擎（模块级单例，跨视图共享）
// 持久化走 engine/storage KV，键 `hf:desk:spaces`。
// 只存「房间 ID 引用」，不复制房间数据——房间改名/换图标后空间内自动跟随。
// ============================================================

import { computed, ref } from 'vue'
import { storage } from '../../engine/storage'
import { getAllRooms } from '../../engine/room-graph'
import type { RoomNode } from '../../engine/room-graph'
import { useRoomManager } from '../room-manager'
import { useSystemApps } from './system-apps'
import type { DeskSpace, DeskItem } from './types'
import {
  DESK_SPACES_STORAGE_KEY,
  DESK_ICON_PRESETS,
  DESK_ACCENT_PRESETS,
} from './types'

function genId(): string {
  return `space_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** 归一化历史数据：旧空间可能没有 appIds 字段 */
function normalize(s: DeskSpace): DeskSpace {
  return {
    ...s,
    appIds: Array.isArray(s.appIds) ? s.appIds : [],
  }
}

function load(): DeskSpace[] {
  try {
    const raw = storage.getKV<DeskSpace[]>(DESK_SPACES_STORAGE_KEY, [])
    if (Array.isArray(raw)) return raw.map(normalize)
  } catch {
    /* 数据损坏时回落空 */
  }
  return []
}

// 系统已装应用枚举（模块级单例共享）；首次进入收纳面板时触发枚举。
const systemApps = useSystemApps()

const spaces = ref<DeskSpace[]>(load())

function persist(): void {
  storage.setKV(DESK_SPACES_STORAGE_KEY, spaces.value)
}

/** 测试用：从存储重新载入，避免模块级单例在用例之间串味。真实应用无需调用。 */
export function resetDeskSpaces(): void {
  spaces.value = load()
}

export function useDeskSpaces() {
  const rm = useRoomManager()

  /** RoomNode → 收纳项（应用用户在房间管理器里的自定义名/图标/色） */
  function toItem(r: RoomNode): DeskItem {
    const cfg = rm.getRoomConfig(r.id)
    return {
      id: r.id,
      name: cfg?.customName || r.name,
      icon: cfg?.customIcon || r.icon,
      color: cfg?.customColor || r.color,
      path: r.path,
      kind: 'room',
    }
  }

  /** 可收纳候选：房间图全量 ∪ 系统已装应用 */
  const candidates = computed<DeskItem[]>(() => [
    ...getAllRooms().map(toItem),
    ...systemApps.appItems.value,
  ])

  /** 解析空间内的收纳项（保持收纳顺序；房间/应用被移除时自动跳过） */
  function itemsOf(space: DeskSpace): DeskItem[] {
    const roomMap = new Map(
      candidates.value.filter(i => i.kind === 'room').map(i => [i.id, i]),
    )
    const appMap = systemApps.registry.value
    const out: DeskItem[] = []
    for (const id of space.roomIds) {
      const it = roomMap.get(id)
      if (it) out.push(it)
    }
    for (const id of (space.appIds ?? [])) {
      const it = appMap.get(id)
      if (it) out.push(it)
    }
    return out
  }

  function createSpace(name = '新空间', icon: string = DESK_ICON_PRESETS[0], accent: string = DESK_ACCENT_PRESETS[0]): DeskSpace {
    const space: DeskSpace = {
      id: genId(),
      name,
      icon,
      accent,
      roomIds: [],
      appIds: [],
      createdAt: Date.now(),
    }
    spaces.value = [...spaces.value, space]
    persist()
    return space
  }

  function renameSpace(id: string, name: string): void {
    const next = name.trim()
    if (!next) return
    spaces.value = spaces.value.map(s => (s.id === id ? { ...s, name: next } : s))
    persist()
  }

  function setSpaceIcon(id: string, icon: string): void {
    spaces.value = spaces.value.map(s => (s.id === id ? { ...s, icon } : s))
    persist()
  }

  function setSpaceAccent(id: string, accent: string): void {
    spaces.value = spaces.value.map(s => (s.id === id ? { ...s, accent } : s))
    persist()
  }

  function removeSpace(id: string): void {
    spaces.value = spaces.value.filter(s => s.id !== id)
    persist()
  }

  function addRoom(spaceId: string, roomId: string): void {
    spaces.value = spaces.value.map(s => {
      if (s.id !== spaceId) return s
      if (s.roomIds.includes(roomId)) return s
      return { ...s, roomIds: [...s.roomIds, roomId] }
    })
    persist()
  }

  function removeRoom(spaceId: string, roomId: string): void {
    spaces.value = spaces.value.map(s =>
      s.id === spaceId ? { ...s, roomIds: s.roomIds.filter(r => r !== roomId) } : s,
    )
    persist()
  }

  /** 收纳 / 取出切换（候选列表点选用） */
  function toggleRoom(spaceId: string, roomId: string): void {
    const space = spaces.value.find(s => s.id === spaceId)
    if (!space) return
    if (space.roomIds.includes(roomId)) removeRoom(spaceId, roomId)
    else addRoom(spaceId, roomId)
  }

  function hasRoom(spaceId: string, roomId: string): boolean {
    return spaces.value.find(s => s.id === spaceId)?.roomIds.includes(roomId) ?? false
  }

  // ---- 系统应用收纳 ----
  function addApp(spaceId: string, appId: string): void {
    spaces.value = spaces.value.map(s => {
      if (s.id !== spaceId) return s
      const appIds = s.appIds ?? []
      if (appIds.includes(appId)) return s
      return { ...s, appIds: [...appIds, appId] }
    })
    persist()
  }

  function removeApp(spaceId: string, appId: string): void {
    spaces.value = spaces.value.map(s =>
      s.id === spaceId ? { ...s, appIds: (s.appIds ?? []).filter(a => a !== appId) } : s,
    )
    persist()
  }

  function toggleApp(spaceId: string, appId: string): void {
    const space = spaces.value.find(s => s.id === spaceId)
    if (!space) return
    if ((space.appIds ?? []).includes(appId)) removeApp(spaceId, appId)
    else addApp(spaceId, appId)
  }

  function hasApp(spaceId: string, appId: string): boolean {
    return spaces.value.find(s => s.id === spaceId)?.appIds?.includes(appId) ?? false
  }

  /** 按项类型路由的收纳切换（候选列表点选用） */
  function toggleItem(spaceId: string, item: DeskItem): void {
    if (item.kind === 'app') toggleApp(spaceId, item.id)
    else toggleRoom(spaceId, item.id)
  }

  /** 按项类型路由的归属判断 */
  function hasItem(spaceId: string, item: DeskItem): boolean {
    return item.kind === 'app' ? hasApp(spaceId, item.id) : hasRoom(spaceId, item.id)
  }

  /** 从空间取出某个收纳项（房间或应用） */
  function removeItem(spaceId: string, item: DeskItem): void {
    if (item.kind === 'app') removeApp(spaceId, item.id)
    else removeRoom(spaceId, item.id)
  }

  function getSpace(id: string): DeskSpace | undefined {
    return spaces.value.find(s => s.id === id)
  }

  // 首次使用时触发系统应用枚举（幂等并发保护在 refresh 内）
  void systemApps.refresh()

  return {
    spaces,
    candidates,
    itemsOf,
    createSpace,
    renameSpace,
    setSpaceIcon,
    setSpaceAccent,
    removeSpace,
    addRoom,
    removeRoom,
    toggleRoom,
    hasRoom,
    addApp,
    removeApp,
    toggleApp,
    hasApp,
    toggleItem,
    hasItem,
    removeItem,
    getSpace,
    systemApps,
  }
}
