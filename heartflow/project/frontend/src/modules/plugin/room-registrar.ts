// ============================================================
// 插件房间注册器（方案 A · 插件化房子）
// 把插件 manifest 的 contributes.rooms 声明注册进：
//   1) 房间图（room-graph 运行时覆盖层）→ 侧栏/星盘/邻接导航可见
//   2) 路由表（vue-router addRoute，懒加载组件）→ 可直达访问
// 组件加载器由插件模块经 registerPluginRoomLoader 另行注册；
// 未注册自定义加载器的插件房间回退到通用外壳（PluginRoomShell），
// 因此任何可序列化声明 contributes.rooms 的插件安装后即拥有房间，
// 无需随应用打包专属视图。
// syncPluginRooms 采用状态对账式：以「已启用插件的声明」为准，
// 卸载/禁用/声明变更的插件房间在同步时被自动注销（幂等）。
// ============================================================

import type { Router, RouteComponent } from 'vue-router'
import { registerRoom, unregisterRoom, type RoomNode } from '../../engine/room-graph'
import { usePluginStore } from '../../stores/plugin'
import type { PluginManifest, PluginRoomContribution } from './types'

/** 插件房间组件加载器（懒加载 Vue 组件） */
export type RoomComponentLoader = () => Promise<RouteComponent>

/** 组件加载器注册表：pluginId → roomId → loader */
const ROOM_LOADERS = new Map<string, Map<string, RoomComponentLoader>>()

/** 已激活的插件房间：roomId → { pluginId, routeName }（路由与房间图的清理依据） */
interface ActiveRoomRef {
  pluginId: string
  routeName: string
}
const ACTIVE_ROOMS = new Map<string, ActiveRoomRef>()

/** 默认插件房外壳（无自定义加载器时的兜底组件） */
const PLUGIN_ROOM_SHELL: RoomComponentLoader = () => import('../../views/PluginRoomShell.vue')

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

/** 解析房间组件加载器：自定义优先，缺省回退通用外壳 */
function resolveLoader(pluginId: string, roomId: string): RoomComponentLoader {
  return ROOM_LOADERS.get(pluginId)?.get(roomId) ?? PLUGIN_ROOM_SHELL
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
    if (ACTIVE_ROOMS.has(rc.id)) continue
    registerRoom(toRoomNode(rc, manifest))
    const name = `plugin-room:${rc.id}`
    router.addRoute({
      path: rc.path,
      name,
      component: resolveLoader(manifest.meta.id, rc.id),
      meta: {
        title: rc.name,
        roomId: rc.id,
        pluginRoom: true,
        pluginId: manifest.meta.id,
        pluginName: manifest.meta.name,
      },
    })
    ACTIVE_ROOMS.set(rc.id, { pluginId: manifest.meta.id, routeName: name })
    n++
  }
  return n
}

function unregisterRoomByRef(router: Router, roomId: string): boolean {
  const ref = ACTIVE_ROOMS.get(roomId)
  if (!ref) return false
  router.removeRoute(ref.routeName)
  ACTIVE_ROOMS.delete(roomId)
  unregisterRoom(roomId)
  return true
}

/** 注册某个插件贡献的全部房间（返回注册数） */
export function registerPluginRooms(router: Router, pluginId: string): number {
  const store = usePluginStore()
  const p = store.plugins.find(x => x.manifest.meta.id === pluginId)
  if (!p) return 0
  return registerPluginRoomsFor(router, p.manifest)
}

/** 注销某个插件贡献的全部房间（返回注销数；不依赖 store，卸载后仍可清理） */
export function unregisterPluginRooms(router: Router, pluginId: string): number {
  let n = 0
  for (const [roomId, ref] of [...ACTIVE_ROOMS]) {
    if (ref.pluginId === pluginId && unregisterRoomByRef(router, roomId)) n++
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
 * 与当前插件启停状态对齐（状态对账式；幂等）：
 *  - 已启用插件声明的房间 → 注册（防重）
 *  - 已激活但插件已卸载/禁用/声明变更的房间 → 注销
 * 返回 { added, removed }。
 */
export function syncPluginRooms(router: Router): { added: number; removed: number } {
  const store = usePluginStore()
  const expected = new Map<string, string>() // roomId → pluginId
  for (const p of store.enabledPlugins) {
    for (const rc of p.manifest.contributes?.rooms ?? []) {
      expected.set(rc.id, p.manifest.meta.id)
    }
  }

  let added = 0
  let removed = 0
  for (const [roomId, ref] of [...ACTIVE_ROOMS]) {
    if (expected.get(roomId) !== ref.pluginId && unregisterRoomByRef(router, roomId)) removed++
  }
  for (const p of store.enabledPlugins) {
    added += registerPluginRoomsFor(router, p.manifest)
  }
  return { added, removed }
}

/** 测试用：重置模块级状态（ROOM_LOADERS / ACTIVE_ROOMS） */
export function __resetRegistrar(): void {
  ROOM_LOADERS.clear()
  ACTIVE_ROOMS.clear()
}
