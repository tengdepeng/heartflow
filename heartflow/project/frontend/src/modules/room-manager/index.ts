// ============================================================
// 房间管理器 · 状态管理
// ============================================================

import { ref, computed } from 'vue'
import type { RoomConfig } from './types'
import { ROOM_CONFIG_STORAGE_KEY } from './types'
import { getAllRooms, migrateRoomId, type RoomNode, type RoomGroup, type RoomSlot, type RoomDomain } from '../../engine/room-graph'
import { storage } from '../../engine/storage'

export type { RoomConfig, RoomNode, RoomGroup, RoomSlot, RoomDomain }
export { ROOM_CONFIG_STORAGE_KEY }

/** 为每个房间生成默认配置 */
function defaultConfig(roomId: string): RoomConfig {
  return {
    roomId,
    visible: true,
    customName: null,
    customIcon: null,
    customColor: null,
    order: 0,
  }
}

/** 把存档里的旧房间 id 改写为新 id（一次成表，不做链式迭代） */
function migrateRoomIds<T>(saved: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(saved)) out[migrateRoomId(k)] = v
  return out
}

/** 加载所有房间配置（补齐缺失的房间） */
function loadAllRoomConfigs(): RoomConfig[] {
  const rooms = getAllRooms()
  const saved = migrateRoomIds(
    storage.getKV<Record<string, Partial<RoomConfig>>>(ROOM_CONFIG_STORAGE_KEY, {}),
  )
  return rooms.map(room => {
    const cfg = saved[room.id]
    if (!cfg) return defaultConfig(room.id)
    return {
      ...defaultConfig(room.id),
      ...cfg,
      roomId: room.id,
    }
  })
}

/** 持久化所有房间配置 */
function saveAllRoomConfigs(configs: RoomConfig[]): void {
  const map: Record<string, Partial<RoomConfig>> = {}
  for (const cfg of configs) {
    map[cfg.roomId] = {
      visible: cfg.visible,
      customName: cfg.customName,
      customIcon: cfg.customIcon,
      customColor: cfg.customColor,
      order: cfg.order,
      pinnedSlot: cfg.pinnedSlot ?? null,
      pinnedDomain: cfg.pinnedDomain ?? null,
    }
  }
  storage.setKV(ROOM_CONFIG_STORAGE_KEY, map)
}

// ---- 模块级单例：所有调用方（App.vue 导航树 / 殿堂设置 / 房间管理器 / 聚合面板）共享同一份配置 ----
// 切换可见性 / 钉入归属后跨组件实时联动，无需重载。与 useRoomTaxonomy / useAstrolabeTheme 等单例一致。
const configs = ref<RoomConfig[]>(loadAllRoomConfigs())

/** 测试用：从存储重新载入配置，避免模块级单例在用例之间串味。真实应用无需调用。 */
export function resetRoomManager() {
  configs.value = loadAllRoomConfigs()
}

export function useRoomManager() {
  /** 获取所有房间配置 */
  function getAllRoomConfigs(): RoomConfig[] {
    return configs.value
  }

  /** 获取指定房间的配置 */
  function getRoomConfig(roomId: string): RoomConfig | undefined {
    return configs.value.find(c => c.roomId === roomId)
  }

  /** 更新指定房间的配置（部分更新） */
  function updateRoomConfig(roomId: string, partial: Partial<RoomConfig>): void {
    const idx = configs.value.findIndex(c => c.roomId === roomId)
    if (idx === -1) {
      configs.value.push({ ...defaultConfig(roomId), ...partial, roomId })
    } else {
      configs.value[idx] = { ...configs.value[idx], ...partial, roomId }
    }
    saveAllRoomConfigs(configs.value)
  }

  /** 切换房间可见性 */
  function toggleVisibility(roomId: string): void {
    const current = getRoomConfig(roomId)
    updateRoomConfig(roomId, { visible: !(current?.visible ?? true) })
  }

  /** 在可见房间列表内上/下移动排序（dir: -1 上移 / 1 下移）
   *  - 若当前存在未显式排序的房间（order===0，即沿用自然序），
   *    先按房间图自然序物化为 1..n，再与相邻项交换，保证顺序稳定可预期。 */
  function moveOrder(roomId: string, dir: -1 | 1): void {
    const visibleNow = configs.value.filter((c) => c.visible)
    if (visibleNow.some((c) => c.order === 0)) {
      const natural = getAllRooms().map((r) => r.id)
      const sorted = [...visibleNow].sort((a, b) => {
        const ia = natural.indexOf(a.roomId)
        const ib = natural.indexOf(b.roomId)
        return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib)
      })
      sorted.forEach((c, i) => updateRoomConfig(c.roomId, { order: i + 1 }))
    }
    const sorted = configs.value
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((c) => c.roomId === roomId)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    updateRoomConfig(a.roomId, { order: b.order })
    updateRoomConfig(b.roomId, { order: a.order })
  }

  /** 重置指定房间配置为默认值 */
  function resetRoomConfig(roomId: string): void {
    const idx = configs.value.findIndex(c => c.roomId === roomId)
    if (idx !== -1) {
      configs.value[idx] = defaultConfig(roomId)
      saveAllRoomConfigs(configs.value)
    }
  }

  /** 钉入房间归属：覆盖宅院分区/领域（null=沿用 room-graph 默认） */
  function setRoomPin(roomId: string, slot: RoomSlot | null, domain: RoomDomain | null): void {
    updateRoomConfig(roomId, { pinnedSlot: slot, pinnedDomain: domain })
  }

  /** 同组内排序：把 draggedId 移到 targetId 之前（同组可见房间内） */
  function reorderWithinGroup(draggedId: string, targetId: string): void {
    if (draggedId === targetId) return
    const groupOf = (id: string): string => {
      const cfg = getRoomConfig(id)
      const room = getAllRooms().find((r) => r.id === id)
      return cfg?.pinnedDomain ?? room?.domain ?? ''
    }
    const g = groupOf(draggedId)
    // 注意：可见性判定必须与 App.vue isNavVisible 一致（visible !== false）。
    // 原先写成 c.visible（真值判断）会把「从未显式设过 visible」的房间
    // （configs 里大量房间 visible 为 undefined）直接排除掉，
    // 导致 fromIdx/toIdx = -1 提前 return —— 拖拽移动静默失效、无任何报错，
    // 表现为「房间拖过去没反应 / 拖不回原来的组」。
    const group = configs.value
      .filter((c) => c.visible !== false && groupOf(c.roomId) === g)
      .sort((a, b) => a.order - b.order)
    const fromIdx = group.findIndex((c) => c.roomId === draggedId)
    const toIdx = group.findIndex((c) => c.roomId === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const reordered = [...group]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    reordered.forEach((c, i) => updateRoomConfig(c.roomId, { order: i + 1 }))
  }

  /** 全部房间的数据（合并 room-graph 信息） */
  const roomEntries = computed(() => {
    const rooms = getAllRooms()
    return rooms.map(room => {
      const cfg = configs.value.find(c => c.roomId === room.id) ?? defaultConfig(room.id)
      return {
        ...room,
        config: cfg,
      }
    })
  })

  /** 按组分组的房间列表 */
  const roomsByGroup = computed(() => {
    const groups: Record<string, Array<{ room: RoomNode; config: RoomConfig }>> = {
      gravity: [],
      'main-path': [],
      world: [],
      system: [],
    }
    // 将 work 类房间单独归类（worklog 分支下的房间）
    const workBranchIds = new Set([
      'scar', 'reward', 'craft', 'career', 'bag', 'rest',
    ])
    for (const entry of roomEntries.value) {
      const { config, ...roomData } = entry
      const room = roomData as RoomNode
      if (workBranchIds.has(room.id)) {
        if (!groups.work) groups.work = []
        groups.work.push({ room, config })
      } else {
        if (!groups[room.group]) groups[room.group] = []
        groups[room.group].push({ room, config })
      }
    }
    // 组内排序
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.config.order - b.config.order)
    }
    return groups
  })

  /** 统计信息 */
  const stats = computed(() => {
    const all = roomEntries.value
    const total = all.length
    const visible = all.filter(e => e.config.visible).length
    const hidden = total - visible
    return { total, visible, hidden }
  })

  return {
    configs,
    roomEntries,
    roomsByGroup,
    stats,
    getAllRoomConfigs,
    getRoomConfig,
    updateRoomConfig,
    toggleVisibility,
    moveOrder,
    resetRoomConfig,
    setRoomPin,
    reorderWithinGroup,
  }
}