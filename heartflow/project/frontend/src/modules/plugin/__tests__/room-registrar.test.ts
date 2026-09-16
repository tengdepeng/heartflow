// ============================================================
// 插件房间注册器 · room-registrar.ts 测试
// 覆盖：组件加载器注册、插件房间注册/注销、全量注册、启停同步
// ============================================================
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Router } from 'vue-router'
import {
  registerPluginRoomLoader,
  registerCorePluginRooms,
  registerPluginRooms,
  unregisterPluginRooms,
  registerAllPluginRooms,
  syncPluginRooms,
  __resetRegistrar,
  type RoomComponentLoader,
} from '../room-registrar'
import { usePluginStore } from '../../../stores/plugin'
import type { PluginManifest } from '../types'
import { getRoom, getRoomByPath, getExtraRooms, unregisterRoom } from '../../../engine/room-graph'

// ---- 测试工具 ----
function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => store.clear(),
  })
}

function makeRouter() {
  const routes: { path: string; name: unknown }[] = []
  const removed: string[] = []
  const router = {
    addRoute: (r: { path: string; name: unknown }) => { routes.push({ path: r.path, name: r.name }) },
    removeRoute: (name: string) => { removed.push(name) },
  } as unknown as Router
  return { router, routes, removed }
}

const stubLoader: RoomComponentLoader = () => Promise.resolve({ render: () => null } as any)

function makeManifest(pluginId: string, room: { id: string; path: string }): PluginManifest {
  return {
    meta: {
      id: pluginId, name: `测试插件·${pluginId}`, version: '1.0.0', description: '测试',
      tier: 'experimental', category: 'other', icon: '🧩',
    },
    permissions: ['read:current'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
    entry: 'test:entry',
    contributes: {
      rooms: [{
        id: room.id, path: room.path, name: `测试房·${room.id}`, icon: '🧩', color: '#8a9ab8',
        description: '测试房间', group: 'world', adjacentTo: ['home-space', 'plugins'], branchFrom: 'home-space',
      }],
    },
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockLocalStorage()
  Object.defineProperty(globalThis, 'window', {
    value: { matchMedia: () => ({ matches: false }) },
    writable: true, configurable: true,
  })
})

afterEach(() => {
  __resetRegistrar()
  for (const r of getExtraRooms()) unregisterRoom(r.id)
})

// ============================================================
// 1. registerPluginRoomLoader + registerPluginRooms
// ============================================================
describe('registerPluginRooms', () => {
  it('注册加载器后把房间注册进房间图与路由', () => {
    const { router, routes } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-load-a'
    store.installPlugin(makeManifest(pid, { id: 't-room-a', path: '/t-room-a' }))
    registerPluginRoomLoader(pid, 't-room-a', stubLoader)

    expect(registerPluginRooms(router, pid)).toBe(1)
    const room = getRoom('t-room-a')
    expect(room).toBeDefined()
    expect(room?.path).toBe('/t-room-a')
    expect(room?.group).toBe('world')
    expect(room?.isMainPath).toBe(false)
    expect(room?.adjacentTo).toContain('home-space')
    expect(getRoomByPath('/t-room-a')?.id).toBe('t-room-a')
    expect(routes).toContainEqual({ path: '/t-room-a', name: 'plugin-room:t-room-a' })
  })

  it('无组件加载器时跳过房间注册', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    store.installPlugin(makeManifest('t-load-b', { id: 't-room-b', path: '/t-room-b' }))

    expect(registerPluginRooms(router, 't-load-b')).toBe(0)
    expect(getRoom('t-room-b')).toBeUndefined()
  })

  it('重复注册幂等（ACTIVE_ROUTES 防重）', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-load-c'
    store.installPlugin(makeManifest(pid, { id: 't-room-c', path: '/t-room-c' }))
    registerPluginRoomLoader(pid, 't-room-c', stubLoader)

    expect(registerPluginRooms(router, pid)).toBe(1)
    expect(registerPluginRooms(router, pid)).toBe(0)
    expect(getRoom('t-room-c')).toBeDefined()
  })

  it('对未安装的插件返回 0', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    expect(registerPluginRooms(router, 't-ghost')).toBe(0)
  })
})

// ============================================================
// 2. unregisterPluginRooms
// ============================================================
describe('unregisterPluginRooms', () => {
  it('注销后房间从房间图与路由消失', () => {
    const { router, removed } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-unreg-a'
    store.installPlugin(makeManifest(pid, { id: 't-room-a', path: '/t-room-a' }))
    registerPluginRoomLoader(pid, 't-room-a', stubLoader)
    registerPluginRooms(router, pid)
    expect(getRoom('t-room-a')).toBeDefined()

    expect(unregisterPluginRooms(router, pid)).toBe(1)
    expect(getRoom('t-room-a')).toBeUndefined()
    expect(getRoomByPath('/t-room-a')).toBeUndefined()
    expect(removed).toContain('plugin-room:t-room-a')
  })

  it('对未激活的插件房间也执行注销清理', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-unreg-b'
    store.installPlugin(makeManifest(pid, { id: 't-room-b', path: '/t-room-b' }))

    expect(unregisterPluginRooms(router, pid)).toBe(1)
    expect(getRoom('t-room-b')).toBeUndefined()
  })
})

// ============================================================
// 3. registerAllPluginRooms
// ============================================================
describe('registerAllPluginRooms', () => {
  it('注册全部已启用插件的房间', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    store.installPlugin(makeManifest('t-all-a', { id: 't-all-room-a', path: '/t-all-room-a' }))
    store.installPlugin(makeManifest('t-all-b', { id: 't-all-room-b', path: '/t-all-room-b' }))
    registerPluginRoomLoader('t-all-a', 't-all-room-a', stubLoader)
    registerPluginRoomLoader('t-all-b', 't-all-room-b', stubLoader)

    expect(registerAllPluginRooms(router)).toBe(2)
    expect(getRoom('t-all-room-a')).toBeDefined()
    expect(getRoom('t-all-room-b')).toBeDefined()
  })

  it('已禁用插件的房间不注册', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-all-c'
    store.installPlugin(makeManifest(pid, { id: 't-all-room-c', path: '/t-all-room-c' }))
    registerPluginRoomLoader(pid, 't-all-room-c', stubLoader)
    store.disable(pid)

    expect(registerAllPluginRooms(router)).toBe(0)
    expect(getRoom('t-all-room-c')).toBeUndefined()
  })
})

// ============================================================
// 4. syncPluginRooms（启停同步）
// ============================================================
describe('syncPluginRooms', () => {
  it('禁用插件时移除其房间', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-sync-a'
    store.installPlugin(makeManifest(pid, { id: 't-sync-room-a', path: '/t-sync-room-a' }))
    registerPluginRoomLoader(pid, 't-sync-room-a', stubLoader)
    registerPluginRooms(router, pid)
    expect(getRoom('t-sync-room-a')).toBeDefined()

    store.disable(pid)
    const res = syncPluginRooms(router)
    expect(res.removed).toBe(1)
    expect(getRoom('t-sync-room-a')).toBeUndefined()
  })

  it('启用插件时注册其房间', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-sync-b'
    store.installPlugin(makeManifest(pid, { id: 't-sync-room-b', path: '/t-sync-room-b' }))
    registerPluginRoomLoader(pid, 't-sync-room-b', stubLoader)
    store.disable(pid)

    expect(syncPluginRooms(router).added).toBe(0)
    store.enable(pid)
    const res = syncPluginRooms(router)
    expect(res.added).toBe(1)
    expect(getRoom('t-sync-room-b')).toBeDefined()
    expect(getRoomByPath('/t-sync-room-b')?.id).toBe('t-sync-room-b')
  })

  it('同步幂等：重复同步不重复注册', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    const pid = 't-sync-c'
    store.installPlugin(makeManifest(pid, { id: 't-sync-room-c', path: '/t-sync-room-c' }))
    registerPluginRoomLoader(pid, 't-sync-room-c', stubLoader)

    expect(syncPluginRooms(router).added).toBe(1)
    expect(syncPluginRooms(router).added).toBe(0)
    expect(getRoom('t-sync-room-c')).toBeDefined()
  })
})

// ============================================================
// 5. registerCorePluginRooms（内置演示插件）
// ============================================================
describe('registerCorePluginRooms', () => {
  it('注册内置演示插件 demo-room 的组件加载器并登记房间', () => {
    const { router } = makeRouter()
    const store = usePluginStore()
    store.init()
    registerCorePluginRooms()

    expect(registerAllPluginRooms(router)).toBe(1)
    const room = getRoom('demo-room')
    expect(room).toBeDefined()
    expect(room?.name).toBe('示例插件房')
    expect(room?.path).toBe('/plugin-demo')
    expect(room?.icon).toBe('🧩')
    expect(room?.adjacentTo).toContain('plugins')
  })
})
