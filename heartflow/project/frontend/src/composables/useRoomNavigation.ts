// ============================================================
// 心流工坊 · 房间导航组合式函数
// 提供房间感知的导航体验：穿行、邻接、返回路径
// ============================================================

import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  getRoom,
  getRoomByPath,
  getAdjacentRooms,
  getMainPath,
  getPreviousOnMainPath,
  getNextOnMainPath,
  isOnMainPath,
  getReturnPath,
  getPathTo,
  getAllRooms,
} from '../engine/room-graph'
import { storage } from '../engine/storage'

/**
 * 房间感知导航（模块级，供组件 setup 与组合式内调用）。
 * 按房间 id 跳转；房间不存在则静默不跳（与 enterRoom 同语义）。
 * 调用时取 useRouter()，因此必须在组件 setup / 组合式方法上下文中调用
 * （本仓所有调用点均满足：组件事件处理、调令执行器等）。
 * 不在此导入路由单例模块，以免触发其顶层 createRouter 副作用影响单测隔离。
 */
export function navigateToRoom(roomId: string): void {
  const room = getRoom(roomId)
  if (!room) return
  useRouter().push(room.path)
}

/** 导航方向类型 */
export type NavDirection = 'forward' | 'backward' | 'branch' | 'return'

interface NavigationEvent {
  from: string
  to: string
  direction: NavDirection
}

/**
 * 房间导航组合式函数
 * 提供空间感知的导航体验
 */
export function useRoomNavigation() {
  const router = useRouter()
  const route = useRoute()

  // ---- 当前房间状态 ----
  const currentRoomId = computed(() => {
    const room = getRoomByPath(route.path)
    return room?.id ?? 'home'
  })

  const currentRoom = computed(() => getRoom(currentRoomId.value))
  const isOnMainPathNow = computed(() => isOnMainPath(currentRoomId.value))
  const mainPath = computed(() => getMainPath())

  const adjacentRooms = computed(() => getAdjacentRooms(currentRoomId.value))
  const previousOnMainPath = computed(() => getPreviousOnMainPath(currentRoomId.value))
  const nextOnMainPath = computed(() => getNextOnMainPath(currentRoomId.value))

  const returnPath = computed(() => getReturnPath(currentRoomId.value))
  const pathToHome = computed(() => getPathTo(currentRoomId.value))

  // ---- 导航历史栈（持久化） ----
  const NAV_HISTORY_KEY = 'heartflow:nav-history'

  function loadHistory(): string[] {
    try {
      return storage.getKV(NAV_HISTORY_KEY, [])
    } catch {
      return []
    }
  }

  function saveHistory(h: string[]) {
    try {
      storage.setKV(NAV_HISTORY_KEY, h)
    } catch {
      // 存储不可用时静默忽略
    }
  }

  const history = ref<string[]>(loadHistory())
  const lastNavigation = ref<NavigationEvent | null>(null)

  // 监听历史变化，自动持久化
  watch(history, (h) => {
    saveHistory(h)
  }, { deep: true })

  // 监听路由变化，自动记录历史
  watch(
    () => route.path,
    (newPath, oldPath) => {
      if (!oldPath) return
      const newRoom = getRoomByPath(newPath)
      const oldRoom = getRoomByPath(oldPath)
      if (newRoom && oldRoom && newRoom.id !== oldRoom.id) {
        history.value.push(oldRoom.id)
        // 限制历史栈深度
        if (history.value.length > 50) {
          history.value = history.value.slice(-50)
        }
        // 判断导航方向（主链路前后/分支/返回）
        let direction: NavDirection = 'forward'
        const newIsMain = isOnMainPath(newRoom.id)
        const oldIsMain = isOnMainPath(oldRoom.id)
        if (newIsMain && oldIsMain) {
          // 主链路内前后方向
          const oldIdx = getMainPath().findIndex(r => r.id === oldRoom.id)
          const newIdx = getMainPath().findIndex(r => r.id === newRoom.id)
          direction = newIdx > oldIdx ? 'forward' : 'backward'
        } else if (!newIsMain && oldIsMain) {
          // 从主链路进入分支 = 向下（分支）
          direction = 'branch'
        } else if (newIsMain && !oldIsMain) {
          // 从分支返回主链路 = 向上（返回）
          direction = 'return'
        }
        lastNavigation.value = {
          from: oldRoom.id,
          to: newRoom.id,
          direction,
        }
      }
    },
  )

  // ---- 导航方法 ----

  /** 进入一个房间（空间感知的导航） */
  function enterRoom(roomId: string) {
    navigateToRoom(roomId)
  }

  /** 返回上一个房间 */
  function goBack() {
    if (history.value.length === 0) {
      // 没有历史记录时回到心流
      router.push('/')
      return
    }
    const prev = history.value.pop()!
    const room = getRoom(prev)
    if (room) {
      router.push(room.path)
    }
  }

  /** 返回心流（家） */
  function goHome() {
    history.value = []
    router.push('/')
  }

  /** 沿主链路前进到下一个房间 */
  function goNextOnMainPath() {
    if (nextOnMainPath.value) {
      enterRoom(nextOnMainPath.value.id)
    }
  }

  /** 沿主链路后退到上一个房间 */
  function goPreviousOnMainPath() {
    if (previousOnMainPath.value) {
      enterRoom(previousOnMainPath.value.id)
    }
  }

  /** 获取导航方向（用于动画） */
  function getNavDirection(newRoomId: string): 'left' | 'right' | 'up' | 'down' | 'none' {
    if (!lastNavigation.value) return 'none'
    const current = currentRoomId.value
    if (!current) return 'none'

    // 主链路前后：左右方向
    if (isOnMainPath(current) && isOnMainPath(newRoomId)) {
      const currentIdx = mainPath.value.findIndex(r => r.id === current)
      const newIdx = mainPath.value.findIndex(r => r.id === newRoomId)
      if (newIdx > currentIdx) return 'left' // 前进 = 向左滑动
      if (newIdx < currentIdx) return 'right' // 后退 = 向右滑动
    }

    // 分支：从上往下
    return isOnMainPath(newRoomId) ? 'up' : 'down'
  }

  // ---- 浏览模式 ----
  const browseMode = computed(() => {
    return {
      canGoBack: history.value.length > 0 || (currentRoomId.value !== 'home' && currentRoomId.value !== 'home-space'),
      canGoNext: !!nextOnMainPath.value,
      canGoPrev: !!previousOnMainPath.value,
      isHome: currentRoomId.value === 'home' || currentRoomId.value === 'home-space',
      roomCount: getAllRooms().length,
      adjacentCount: adjacentRooms.value.length,
    }
  })

  return {
    // 状态
    currentRoomId,
    currentRoom,
    isOnMainPath: isOnMainPathNow,
    mainPath,
    adjacentRooms,
    previousOnMainPath,
    nextOnMainPath,
    returnPath,
    pathToHome,
    history,
    lastNavigation,
    browseMode,

    // 方法
    enterRoom,
    goBack,
    goHome,
    goNextOnMainPath,
    goPreviousOnMainPath,
    getNavDirection,
  }
}