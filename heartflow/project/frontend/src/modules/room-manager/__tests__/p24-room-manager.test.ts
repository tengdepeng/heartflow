// ============================================================
// P24-1 房间管理器 · 视图桥接与状态管理测试
// 覆盖：useRoomManager composable / configs 响应式 /
//       updateRoomConfig / toggleVisibility / resetRoomConfig /
//       roomEntries / roomsByGroup / stats / 持久化
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ROOM_CONFIG_STORAGE_KEY } from '../types'

// ---- 测试数据工厂 ----

interface TestRoomNode {
  id: string
  name: string
  group: string
  path: string
}

function makeRooms(): TestRoomNode[] {
  return [
    { id: 'home',       name: '家',     group: 'gravity',    path: '/' },
    { id: 'timeline',   name: '时间线', group: 'gravity',    path: '/timeline' },
    { id: 'garden',     name: '花园',   group: 'gravity',    path: '/garden' },
    { id: 'goals',      name: '目标',   group: 'main-path',  path: '/goals' },
    { id: 'reading',    name: '阅览',   group: 'main-path',  path: '/reading' },
    { id: 'body',       name: '身体',   group: 'world',      path: '/body' },
    { id: 'scar',       name: '工痕',   group: 'work',       path: '/scar' },
    { id: 'reward',     name: '劳酬',   group: 'work',       path: '/reward' },
    { id: 'craft',      name: '匠庐',   group: 'work',       path: '/craft' },
    { id: 'career',     name: '业脉',   group: 'work',       path: '/career' },
    { id: 'bag',        name: '行囊',   group: 'work',       path: '/bag' },
    { id: 'rest',       name: '息壤',   group: 'work',       path: '/rest' },
    { id: 'sanctuary',  name: '安全岛', group: 'system',     path: '/sanctuary' },
  ]
}

// ---- 共享可变状态 ----

const { getKvStore, resetKvStore, getRooms } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  let _rooms: TestRoomNode[] = makeRooms()

  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
    getRooms: () => _rooms,
    setRooms: (r: TestRoomNode[]) => { _rooms = r },
  }
})

// ---- Mock engine/room-graph ----

vi.mock('../../../engine/room-graph', () => ({
  getAllRooms: () => getRooms(),
  getRoomByPath: (path: string) => getRooms().find(r => r.path === path) ?? null,
}))

// ---- Mock engine/storage ----

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(key: string, def: T): T => {
      const store = getKvStore()
      return store[key] !== undefined ? store[key] as T : def
    },
    setKV: (key: string, val: any) => {
      const store = getKvStore()
      store[key] = val
    },
  },
}))

// ---- 动态导入 ----

async function importRoomManager() {
  const mod = await import('../index')
  return mod.useRoomManager()
}

// ============================================================
// P24-1 房间管理器视图桥接测试
// ============================================================

describe('P24-1 房间管理器', () => {
  let manager: ReturnType<typeof import('../index').useRoomManager>

  // ---- 空状态 ----
  describe('空状态', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      manager = await importRoomManager()
    })

    describe('初始化', () => {
      it('configs 包含所有房间', () => {
        expect(manager.configs.value.length).toBe(makeRooms().length)
      })

      it('所有房间默认 visible 为 true', () => {
        manager.configs.value.forEach(cfg => {
          expect(cfg.visible).toBe(true)
        })
      })

      it('所有房间默认 customName 为 null', () => {
        manager.configs.value.forEach(cfg => {
          expect(cfg.customName).toBeNull()
        })
      })

      it('所有房间默认 order 为 0', () => {
        manager.configs.value.forEach(cfg => {
          expect(cfg.order).toBe(0)
        })
      })
    })

    describe('getAllRoomConfigs', () => {
      it('返回与 configs 相同的数组', () => {
        const all = manager.getAllRoomConfigs()
        expect(all).toBe(manager.configs.value)
      })
    })

    describe('getRoomConfig', () => {
      it('存在的房间返回配置', () => {
        const cfg = manager.getRoomConfig('home')
        expect(cfg).toBeDefined()
        expect(cfg!.roomId).toBe('home')
      })

      it('不存在的房间返回 undefined', () => {
        const cfg = manager.getRoomConfig('nonexistent')
        expect(cfg).toBeUndefined()
      })
    })

    describe('stats', () => {
      it('total 等于房间总数', () => {
        expect(manager.stats.value.total).toBe(makeRooms().length)
      })

      it('初始全部 visible', () => {
        expect(manager.stats.value.visible).toBe(makeRooms().length)
        expect(manager.stats.value.hidden).toBe(0)
      })
    })
  })

  // ---- 状态管理 ----
  describe('状态管理', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      manager = await importRoomManager()
    })

    describe('updateRoomConfig', () => {
      it('部分更新已存在房间的配置', () => {
        manager.updateRoomConfig('home', { customName: '温馨的家', order: 5 })
        const cfg = manager.getRoomConfig('home')
        expect(cfg!.customName).toBe('温馨的家')
        expect(cfg!.order).toBe(5)
        expect(cfg!.visible).toBe(true) // 未修改的字段保持原值
      })

      it('对不存在房间自动创建配置', () => {
        manager.updateRoomConfig('new-room', { visible: false })
        const cfg = manager.getRoomConfig('new-room')
        expect(cfg).toBeDefined()
        expect(cfg!.visible).toBe(false)
      })

      it('更新后持久化到 storage', () => {
        manager.updateRoomConfig('home', { customName: '甜蜜小家' })
        const store = getKvStore()
        const saved = store[ROOM_CONFIG_STORAGE_KEY]
        expect(saved).toBeDefined()
        expect(saved['home'].customName).toBe('甜蜜小家')
      })

      it('partupdate 不覆盖 roomId', () => {
        manager.updateRoomConfig('home', { customName: 'X' })
        const cfg = manager.getRoomConfig('home')
        expect(cfg!.roomId).toBe('home')
      })
    })

    describe('toggleVisibility', () => {
      it('visible 从 true 切换为 false', () => {
        manager.toggleVisibility('home')
        const cfg = manager.getRoomConfig('home')
        expect(cfg!.visible).toBe(false)
      })

      it('visible 从 false 切换回 true', () => {
        manager.toggleVisibility('home')
        manager.toggleVisibility('home')
        const cfg = manager.getRoomConfig('home')
        expect(cfg!.visible).toBe(true)
      })

      it('对未配置房间默认 visible=true 切换', () => {
        manager.toggleVisibility('new-room')
        const cfg = manager.getRoomConfig('new-room')
        expect(cfg).toBeDefined()
        expect(cfg!.visible).toBe(false)
      })
    })

    describe('resetRoomConfig', () => {
      it('重置已修改的房间为默认值', () => {
        manager.updateRoomConfig('home', { customName: '我的家', visible: false, order: 99 })
        manager.resetRoomConfig('home')
        const cfg = manager.getRoomConfig('home')
        expect(cfg!.customName).toBeNull()
        expect(cfg!.visible).toBe(true)
        expect(cfg!.order).toBe(0)
      })

      it('不存在的房间不报错', () => {
        expect(() => manager.resetRoomConfig('nonexistent')).not.toThrow()
      })
    })
  })

  // ---- 路由/分组 ----
  describe('路由与分组', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      manager = await importRoomManager()
    })

    describe('roomEntries', () => {
      it('每个 room 都有 config', () => {
        manager.roomEntries.value.forEach(entry => {
          expect(entry.config).toBeDefined()
          expect(entry.config.roomId).toBe(entry.id)
        })
      })

      it('config 反映当前状态', () => {
        manager.updateRoomConfig('home', { customName: '甜蜜家' })
        const entry = manager.roomEntries.value.find(e => e.id === 'home')
        expect(entry!.config.customName).toBe('甜蜜家')
      })
    })

    describe('roomsByGroup', () => {
      it('包含 gravity / main-path / world / system / work 五个组', () => {
        const groups = manager.roomsByGroup.value
        expect(Object.keys(groups)).toContain('gravity')
        expect(Object.keys(groups)).toContain('main-path')
        expect(Object.keys(groups)).toContain('world')
        expect(Object.keys(groups)).toContain('system')
        expect(Object.keys(groups)).toContain('work')
      })

      it('work 组包含 6 个 work 分支房间', () => {
        const work = manager.roomsByGroup.value.work!
        expect(work.length).toBe(6)
        const ids = work.map(w => w.room.id)
        expect(ids).toContain('scar')
        expect(ids).toContain('reward')
        expect(ids).toContain('craft')
        expect(ids).toContain('career')
        expect(ids).toContain('bag')
        expect(ids).toContain('rest')
      })

      it('gravity 组包含 home / timeline / garden', () => {
        const gravity = manager.roomsByGroup.value.gravity!
        const ids = gravity.map(g => g.room.id)
        expect(ids).toContain('home')
        expect(ids).toContain('timeline')
        expect(ids).toContain('garden')
      })

      it('组内按 order 排序', () => {
        manager.updateRoomConfig('home', { order: 3 })
        manager.updateRoomConfig('timeline', { order: 1 })
        manager.updateRoomConfig('garden', { order: 2 })
        const gravity = manager.roomsByGroup.value.gravity!
        expect(gravity[0].room.id).toBe('timeline')
        expect(gravity[1].room.id).toBe('garden')
        expect(gravity[2].room.id).toBe('home')
      })
    })

    describe('stats', () => {
      it('隐藏房间后 visible/hidden 更新', () => {
        manager.toggleVisibility('home')
        manager.toggleVisibility('timeline')
        expect(manager.stats.value.visible).toBe(makeRooms().length - 2)
        expect(manager.stats.value.hidden).toBe(2)
      })

      it('全部隐藏后 visible 为 0', () => {
        for (const room of makeRooms()) {
          manager.toggleVisibility(room.id)
        }
        expect(manager.stats.value.visible).toBe(0)
        expect(manager.stats.value.hidden).toBe(makeRooms().length)
      })
    })
  })

  // ---- 持久化 ----
  describe('持久化', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      manager = await importRoomManager()
    })

    it('修改配置后自动保存到 storage', () => {
      manager.updateRoomConfig('home', { customName: '持久化测试' })
      const store = getKvStore()
      const saved = store[ROOM_CONFIG_STORAGE_KEY]
      expect(saved['home'].customName).toBe('持久化测试')
    })

    it('toggleVisibility 后自动保存', () => {
      manager.toggleVisibility('home')
      const store = getKvStore()
      const saved = store[ROOM_CONFIG_STORAGE_KEY]
      expect(saved['home'].visible).toBe(false)
    })

    it('resetRoomConfig 后自动保存', () => {
      manager.updateRoomConfig('home', { customName: '临时' })
      manager.resetRoomConfig('home')
      const store = getKvStore()
      const saved = store[ROOM_CONFIG_STORAGE_KEY]
      expect(saved['home'].customName).toBeNull()
    })
  })

  // ---- 工作流集成 ----
  describe('完整工作流', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      manager = await importRoomManager()
    })

    it('自定义多个房间并验证分组统计', () => {
      manager.updateRoomConfig('garden', { order: 3 })
      manager.updateRoomConfig('home', { customName: '暖居', order: 1 })
      manager.updateRoomConfig('timeline', { customName: '时光轴', order: 2 })
      manager.toggleVisibility('scar')

      const gravity = manager.roomsByGroup.value.gravity!
      expect(gravity[0].config.customName).toBe('暖居')
      expect(gravity[1].config.customName).toBe('时光轴')

      expect(manager.stats.value.hidden).toBe(1)
    })

    it('configs 响应式更新同步到 roomEntries', () => {
      manager.toggleVisibility('garden')
      const entry = manager.roomEntries.value.find(e => e.id === 'garden')
      expect(entry!.config.visible).toBe(false)
    })

    it('重置后恢复到初始状态', () => {
      manager.updateRoomConfig('home', { customName: 'X', order: 99 })
      manager.toggleVisibility('home')
      manager.resetRoomConfig('home')

      const cfg = manager.getRoomConfig('home')
      expect(cfg!.customName).toBeNull()
      expect(cfg!.visible).toBe(true)
      expect(cfg!.order).toBe(0)
    })
  })

  // ---- 排序移动 ----
  describe('moveOrder', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      manager = await importRoomManager()
    })

    it('默认 order=0 时首次移动会先按自然序归一化并交换相邻项', () => {
      manager.moveOrder('home', 1)
      expect(manager.getRoomConfig('home')!.order).toBe(2)
      expect(manager.getRoomConfig('timeline')!.order).toBe(1)
    })

    it('上移首项为 no-op（不报错）', () => {
      manager.moveOrder('home', -1)
      expect(manager.getRoomConfig('home')!.order).toBe(1)
    })

    it('下移末项为 no-op（不报错）', () => {
      manager.moveOrder('sanctuary', 1)
      expect(manager.getRoomConfig('sanctuary')!.order).toBe(13)
    })

    it('已显式设置 order 后按 order 相邻交换', () => {
      manager.updateRoomConfig('home', { order: 1 })
      manager.updateRoomConfig('timeline', { order: 2 })
      manager.updateRoomConfig('garden', { order: 3 })
      manager.moveOrder('garden', -1)
      expect(manager.getRoomConfig('garden')!.order).toBe(2)
      expect(manager.getRoomConfig('timeline')!.order).toBe(3)
    })

    it('移动后写入持久化', () => {
      manager.moveOrder('home', 1)
      const saved = getKvStore()[ROOM_CONFIG_STORAGE_KEY]
      expect(saved['home'].order).toBe(2)
    })
  })
})