// ============================================================
// 插件房间注册器（方案 A MVP · 插件化房子）
// 把插件 manifest 的 contributes.rooms 声明注册进：
//   1) 房间图（room-graph 运行时覆盖层）→ 侧栏/星盘/邻接导航可见
//   2) 路由表（vue-router addRoute，懒加载组件）→ 可直达访问
// 组件加载器由插件模块经 registerPluginRoomLoader 另行注册，
// manifest 保持可序列化数据（与市场存储兼容）。
// ============================================================

import type { Router, RouteComponent } from 'vue-router'
import { registerRoom, unregisterRoom, type RoomNode } from '../../engine/room-graph'
import { usePluginStore } from '../../stores/plugin'
import type { PluginManifest, PluginRoomContribution } from './types'

/** 插件房间组件加载器（懒加载 Vue 组件） */
export type RoomComponentLoader = () => Promise<RouteComponent>

/** 组件加载器注册表：pluginId → roomId → loader */
const ROOM_LOADERS = new Map<string, Map<string, RoomComponentLoader>>()

/** 已激活的插件房间路由：roomId → route name */
const ACTIVE_ROUTES = new Map<string, string>()

/**
 * 注册一个插件房间的组件加载器。
 * 由插件模块在引导期调用；manifest 声明房间数据，loader 提供真实组件。
 */
export function registerPluginRoomLoader(
  pluginId: string,
  roomId: string,
  loader: RoomComponentLoader,
): void {
  let m = ROOM_LOADERS.get(pluginId)
  if (!m) {
    m = new Map()
    ROOM_LOADERS.set(pluginId, m)
  }
  m.set(roomId, loader)
}

/** 内置核心插件贡献房间的组件加载器（MVP：演示房） */
export function registerCorePluginRooms(): void {
  registerPluginRoomLoader('demo-room', 'demo-room', () => import('../../views/PluginDemoRoom.vue'))
}

function toRoomNode(rc: PluginRoomContribution, manifest: PluginManifest): RoomNode {
  return {
    id: rc.id,
    path: rc.path,
    name: rc.name,
    icon: rc.icon,
    color: rc.color,
    group: rc.group ?? 'world',
    description: rc.description ?? `${manifest.meta.name} 贡献的房间`,
    adjacentTo: rc.adjacentTo ?? ['home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: rc.branchFrom,
    domain: rc.domain,
  }
}

function registerPluginRoomsFor(router: Router, manifest: PluginManifest): number {
  const rooms = manifest.contributes?.rooms ?? []
  let n = 0
  for (const rc of rooms) {
    if (ACTIVE_ROUTES.has(rc.id)) continue
    const loader = ROOM_LOADERS.get(manifest.meta.id)?.get(rc.id)
    if (!loader) continue
    registerRoom(toRoomNode(rc, manifest))
    const name = `plugin-room:${rc.id}`
    router.addRoute({
      path: rc.path,
      name,
      component: loader,
      meta: { title: rc.name, roomId: rc.id, pluginRoom: true },
    })
    ACTIVE_ROUTES.set(rc.id, name)
    n++
  }
  return n
}

/** 注册某个插件贡献的全部房间（返回注册数） */
export function registerPluginRooms(router: Router, pluginId: string): number {
  const store = usePluginStore()
  const p = store.plugins.find(x => x.manifest.meta.id === pluginId)
  if (!p) return 0
  return registerPluginRoomsFor(router, p.manifest)
}

/** 注销某个插件贡献的全部房间（返回注销数） */
export function unregisterPluginRooms(router: Router, pluginId: string): number {
  const store = usePluginStore()
  const p = store.plugins.find(x => x.manifest.meta.id === pluginId)
  let n = 0
  for (const rc of p?.manifest.contributes?.rooms ?? []) {
    const name = ACTIVE_ROUTES.get(rc.id)
    if (name) {
      router.removeRoute(name)
      ACTIVE_ROUTES.delete(rc.id)
    }
    unregisterRoom(rc.id)
    n++
  }
  return n
}

/** 注册全部已启用插件的房间（返回注册数） */
export function registerAllPluginRooms(router: Router): number {
  const store = usePluginStore()
  let n = 0
  for (const p of store.enabledPlugins) {
    n += registerPluginRoomsFor(router, p.manifest)
  }
  return n
}

/**
 * 与当前插件启停状态对齐：已禁用插件卸载房间、已启用插件注册房间。
 * 幂等；返回 { added, removed }。
 */
export function syncPluginRooms(router: Router): { added: number; removed: number } {
  const store = usePluginStore()
  let added = 0
  let removed = 0
  for (const p of store.plugins) {
    if (!p.enabled) removed += unregisterPluginRooms(router, p.manifest.meta.id)
  }
  for (const p of store.enabledPlugins) {
    added += registerPluginRoomsFor(router, p.manifest)
  }
  return { added, removed }
}

/** 测试用：重置模块级状态（ROOM_LOADERS / ACTIVE_ROUTES） */
export function __resetRegistrar(): void {
  ROOM_LOADERS.clear()
  ACTIVE_ROUTES.clear()
}
