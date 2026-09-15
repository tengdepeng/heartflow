// ============================================================
// 路由分片空闲预取引擎
// ------------------------------------------------------------
// 目标：消除「首次进入某房间」的一次性懒加载卡顿。
//   首次进入房间需现场 fetch + 解析该路由分片，阻塞主线程约 270ms；
//   第二次进入因模块已缓存则平滑（maxGap 由 ~273ms 降至 ~7ms）。
// 机制：应用空闲时（requestIdleCallback）按 DEFAULT_PREFETCH_ROOMS
//   串行预取对应路由分片；每片之间让出主线程，且任何失败均静默，
//   绝不阻塞首屏初始化或正常导航。
// 开关：useRoutePrefetch() 经 KV(perf:route-prefetch) 控制总开关，
//   默认关闭——本优化经 A/B 实测未能消除首进卡顿（首进卡顿源于 dev
//   编译产物 / 渲染管线，非懒加载分片本身），故作为可选优化保留，
//   由用户本地显式开启。
// 注意：loader 路径必须与 router/index.ts 中对应路由的 component 完全一致。
// ============================================================

import { ref } from 'vue'
import type { Component } from 'vue'
import { storage } from '../../engine/storage'

type RoomLoader = () => Promise<{ default: Component }>

interface PrefetchRoom {
  /** 房间标识（仅用于日志/去重，不参与加载） */
  name: string
  /** 懒加载器，路径与 router/index.ts 中对应路由的 component 完全一致 */
  loader: RoomLoader
}

// 12 个高频房间（landing / 核心日常流）。如需调整清单，直接改此数组。
const DEFAULT_PREFETCH_ROOMS: PrefetchRoom[] = [
  { name: 'home', loader: () => import('../../views/Home.vue') },
  { name: 'home-space', loader: () => import('../../views/HomeSpace.vue') },
  { name: 'timeline', loader: () => import('../../views/Timeline.vue') },
  { name: 'crystal', loader: () => import('../../views/Crystal.vue') },
  { name: 'sanctuary', loader: () => import('../../views/Sanctuary.vue') },
  { name: 'emotion-garden', loader: () => import('../../views/EmotionGarden.vue') },
  { name: 'work-log', loader: () => import('../../views/WorkLog.vue') },
  { name: 'mirror-self', loader: () => import('../../views/MirrorSelfView.vue') },
  { name: 'advisor-hub', loader: () => import('../../views/AdvisorHub.vue') },
  { name: 'settings', loader: () => import('../../views/Settings.vue') },
  { name: 'star-map', loader: () => import('../../views/StarMapView.vue') },
  { name: 'data-outflow', loader: () => import('../../views/DataOutflowView.vue') },
]

const PREFETCH_KV_KEY = 'perf:route-prefetch'

function scheduleIdle(cb: () => void): void {
  const w = window as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => void
  }
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 2000 })
  } else {
    setTimeout(cb, 200)
  }
}

/**
 * 串行预取高频房间路由分片。
 * 每片之间让出主线程（requestIdleCallback），失败静默，绝不抛错。
 * 总开关经 KV(perf:route-prefetch) 控制，默认关闭。
 */
export async function prefetchRooms(rooms: PrefetchRoom[] = DEFAULT_PREFETCH_ROOMS): Promise<void> {
  if (!storage.getKV<boolean>(PREFETCH_KV_KEY, false)) return
  for (const room of rooms) {
    await new Promise<void>((resolve) => {
      scheduleIdle(async () => {
        try {
          await room.loader()
        } catch {
          // 预取失败静默：绝不阻塞首屏或导航
        } finally {
          resolve()
        }
      })
    })
  }
}

/**
 * 空闲预取总开关（KV 持久化，默认关闭）。
 */
export function useRoutePrefetch() {
  const enabled = ref(storage.getKV<boolean>(PREFETCH_KV_KEY, false))
  function setEnabled(v: boolean) {
    enabled.value = v
    storage.setKV(PREFETCH_KV_KEY, v)
  }
  return { enabled, setEnabled }
}
