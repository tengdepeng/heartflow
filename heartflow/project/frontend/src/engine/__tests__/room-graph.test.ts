// ============================================================
// 心流工坊 · 房间图引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  getAllRooms,
  getRoomsByGroup,
  getRoom,
  getRoomByPath,
  getAdjacentRooms,
  getMainPath,
  getPreviousOnMainPath,
  getNextOnMainPath,
  isOnMainPath,
  getReturnPath,
  getPathTo,
  getAdjacencyPairs,
  getBranchRooms,
  getBranchAncestors,
} from '../room-graph'

describe('room-graph 房间图引擎', () => {
  // ------- 基础查询 -------
  it('getAllRooms 返回所有房间', () => {
    const rooms = getAllRooms()
    expect(rooms.length).toBeGreaterThan(30)
  })

  it('getRoom 通过 ID 获取房间', () => {
    const home = getRoom('home')
    expect(home).toBeDefined()
    expect(home?.name).toBe('心流')
  })

  it('getRoom 返回 undefined 对不存在的 ID', () => {
    const room = getRoom('non-existent')
    expect(room).toBeUndefined()
  })

  it('getRoomByPath 通过路径获取房间', () => {
    const room = getRoomByPath('/')
    expect(room).toBeDefined()
    expect(room?.id).toBe('home')
  })

  it('getRoomByPath 返回 undefined 对不存在的路径', () => {
    const room = getRoomByPath('/non-existent')
    expect(room).toBeUndefined()
  })

  // ------- 分组查询 -------
  it('getRoomsByGroup 按组查询', () => {
    const mainPathRooms = getRoomsByGroup('main-path')
    expect(mainPathRooms.length).toBe(3)
    expect(mainPathRooms[0].id).toBe('timeline')
    expect(mainPathRooms[2].id).toBe('garden')
  })

  it('getRoomsByGroup 返回世界房间', () => {
    const worldRooms = getRoomsByGroup('world')
    expect(worldRooms.length).toBeGreaterThan(20)
  })

  it('getRoomsByGroup 返回系统房间', () => {
    const systemRooms = getRoomsByGroup('system')
    expect(systemRooms.length).toBe(4)
  })

  // ------- 主链路 -------
  it('getMainPath 返回正确顺序的主链路', () => {
    const path = getMainPath()
    expect(path.length).toBe(3)
    expect(path[0].id).toBe('timeline')
    expect(path[1].id).toBe('anchor')
    expect(path[2].id).toBe('garden')
  })

  it('getPreviousOnMainPath 返回前一个房间', () => {
    const prev = getPreviousOnMainPath('anchor')
    expect(prev).toBeDefined()
    expect(prev?.id).toBe('timeline')
  })

  it('getPreviousOnMainPath 返回 undefined 对第一个房间', () => {
    const prev = getPreviousOnMainPath('timeline')
    expect(prev).toBeUndefined()
  })

  it('getNextOnMainPath 返回后一个房间', () => {
    const next = getNextOnMainPath('anchor')
    expect(next).toBeDefined()
    expect(next?.id).toBe('garden')
  })

  it('getNextOnMainPath 返回 undefined 对最后一个房间', () => {
    const next = getNextOnMainPath('garden')
    expect(next).toBeUndefined()
  })

  it('getNextOnMainPath 返回 undefined 对非主链路房间', () => {
    const next = getNextOnMainPath('reading')
    expect(next).toBeUndefined()
  })

  it('isOnMainPath 正确判断', () => {
    expect(isOnMainPath('home')).toBe(false)
    expect(isOnMainPath('sanctuary')).toBe(false)
    expect(isOnMainPath('reading')).toBe(false)
    expect(isOnMainPath('non-existent')).toBe(false)
  })

  // ------- 邻接关系 -------
  it('getAdjacentRooms 返回相邻房间', () => {
    const adjacent = getAdjacentRooms('home')
    expect(adjacent.length).toBeGreaterThan(0)
    // 心流应该连接到时间长廊
    expect(adjacent.some(r => r.id === 'timeline')).toBe(true)
    // 心流应该连接到逐日心锚
    expect(adjacent.some(r => r.id === 'anchor')).toBe(true)
    // 心流应该连接到情绪花房
    expect(adjacent.some(r => r.id === 'garden')).toBe(true)
    // 心流连接 home-space（重力组）和 4 个主链路房间
    expect(adjacent.some(r => r.id === 'home-space' && r.group === 'gravity')).toBe(true)
    expect(adjacent.length).toBe(5)
  })

  it('getAdjacentRooms 返回空数组对不存在的房间', () => {
    const adjacent = getAdjacentRooms('non-existent')
    expect(adjacent).toEqual([])
  })

  it('getAdjacentRooms 返回的房间都有有效数据', () => {
    const adjacent = getAdjacentRooms('home')
    for (const room of adjacent) {
      expect(room.name).toBeDefined()
      expect(room.path).toBeDefined()
      expect(room.icon).toBeDefined()
    }
  })

  // ------- 邻接关系对称性 -------
  it('邻接关系形成连通图（所有房间可到达心流）', () => {
    const rooms = getAllRooms()

    // 反向 BFS：从每个房间向 home 探索
    for (const room of rooms) {
      if (room.id === 'home') continue
      const revVisited = new Set<string>()
      const revQueue = [room.id]
      revVisited.add(room.id)
      let foundHome = false
      while (revQueue.length > 0) {
        const current = revQueue.shift()!
        if (current === 'home') {
          foundHome = true
          break
        }
        const currentRoom = getRoom(current)
        if (!currentRoom) continue
        for (const adjId of currentRoom.adjacentTo) {
          if (!revVisited.has(adjId)) {
            revVisited.add(adjId)
            revQueue.push(adjId)
          }
        }
      }
      expect(foundHome).toBe(true)
    }
  })

  // ------- 返回路径 -------
  it('getReturnPath 从心流返回自身', () => {
    const path = getReturnPath('home')
    expect(path.length).toBeGreaterThanOrEqual(1)
    expect(path[0]).toBe('home')
  })

  it('getReturnPath 从主链路房间返回包含心流', () => {
    const path = getReturnPath('garden')
    expect(path.length).toBeGreaterThan(0)
    expect(path[path.length - 1]).toBe('home-space')
  })

  // ------- 导航路径 -------
  it('getPathTo 从心流到自身', () => {
    const path = getPathTo('home')
    expect(path).toEqual(['home'])
  })

  it('getPathTo 到主链路房间', () => {
    const path = getPathTo('garden')
    expect(path.length).toBe(4)
    expect(path[0]).toBe('home-space')
    expect(path[1]).toBe('timeline')
    expect(path[2]).toBe('anchor')
    expect(path[3]).toBe('garden')
  })

  it('getPathTo 到世界房间', () => {
    const path = getPathTo('reading')
    expect(path.length).toBe(2)
    expect(path[0]).toBe('home-space')
    expect(path[1]).toBe('reading')
  })

  // ------- 邻接对 -------
  it('getAdjacencyPairs 返回所有唯一的邻接对', () => {
    const pairs = getAdjacencyPairs()
    expect(pairs.length).toBeGreaterThan(0)
    // 检查无重复
    const keys = pairs.map(([a, b]) => [a, b].sort().join('::'))
    expect(new Set(keys).size).toBe(keys.length)
  })

  // ------- 分支关系 -------
  it('世界房间有 branchFrom 定义', () => {
    const worldRooms = getRoomsByGroup('world')
    for (const room of worldRooms) {
      expect(room.branchFrom).toBeDefined()
    }
  })

  it('世界房间的 branchFrom 链最终指向主链路或重力枢纽', () => {
    const worldRooms = getRoomsByGroup('world')
    const isTerminal = (id: string) => isOnMainPath(id) || getRoom(id)?.group === 'gravity'
    for (const room of worldRooms) {
      // 沿 branchFrom 回溯，最终应到达主链路或重力枢纽房间
      let current = room.branchFrom
      let foundTerminal = false
      const visited = new Set<string>()
      while (current && !visited.has(current)) {
        visited.add(current)
        if (isTerminal(current)) {
          foundTerminal = true
          break
        }
        const parent = getRoom(current)
        current = parent?.branchFrom
      }
      expect(foundTerminal).toBe(true)
    }
  })

  it('主链路房间没有 branchFrom', () => {
    const mainPathRooms = getRoomsByGroup('main-path')
    for (const room of mainPathRooms) {
      expect(room.branchFrom).toBeUndefined()
    }
  })

  // ------- 分支查询 -------
  it('getBranchRooms 返回从指定房间分支的所有房间', () => {
    const homeBranches = getBranchRooms('home-space')
    // home-space 有大量直接分支
    expect(homeBranches.length).toBeGreaterThan(10)
    expect(homeBranches.some(r => r.id === 'reading')).toBe(true)
    expect(homeBranches.some(r => r.id === 'relations')).toBe(true)
    expect(homeBranches.some(r => r.id === 'body')).toBe(true)
    // 所有分支房间的 branchFrom 都应指向 home-space
    for (const room of homeBranches) {
      expect(room.branchFrom).toBe('home-space')
    }
  })

  it('getBranchRooms 返回空数组对无分支的房间', () => {
    const noBranches = getBranchRooms('dictionary')
    expect(noBranches).toEqual([])
  })

  it('getBranchRooms 返回空数组对不存在的 ID', () => {
    const noBranches = getBranchRooms('non-existent')
    expect(noBranches).toEqual([])
  })

  it('getBranchRooms 正确返回深层分支', () => {
    const readingBranches = getBranchRooms('reading')
    expect(readingBranches.length).toBeGreaterThan(0)
    expect(readingBranches.some(r => r.id === 'dictionary')).toBe(true)
    expect(readingBranches.some(r => r.id === 'knowledge')).toBe(true)
  })

  it('getBranchAncestors 返回空数组对主链路房间', () => {
    const ancestors = getBranchAncestors('home')
    expect(ancestors).toEqual([])
  })

  it('getBranchAncestors 返回直接分支的祖先', () => {
    const ancestors = getBranchAncestors('reading')
    expect(ancestors.length).toBe(1)
    expect(ancestors[0].id).toBe('home-space')
  })

  it('getBranchAncestors 返回深层分支的完整祖先链', () => {
    const ancestors = getBranchAncestors('dictionary')
    // dictionary → reading → home-space
    expect(ancestors.length).toBe(2)
    expect(ancestors[0].id).toBe('home-space')
    expect(ancestors[1].id).toBe('reading')
  })

  it('getBranchAncestors 返回多层分支的祖先链', () => {
    const ancestors = getBranchAncestors('advisor-affinity')
    // advisor-affinity → advisors → relations → home-space
    expect(ancestors.length).toBe(3)
    expect(ancestors[0].id).toBe('home-space')
    expect(ancestors[1].id).toBe('relations')
    expect(ancestors[2].id).toBe('advisors')
  })

  it('getBranchAncestors 返回空数组对不存在的房间', () => {
    const ancestors = getBranchAncestors('non-existent')
    expect(ancestors).toEqual([])
  })

  // ------- 数据完整性 -------
  it('所有房间的路径都是唯一的', () => {
    const rooms = getAllRooms()
    const paths = rooms.map(r => r.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('所有房间的 ID 都是唯一的', () => {
    const rooms = getAllRooms()
    const ids = rooms.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个房间至少有一个邻接房间', () => {
    const rooms = getAllRooms()
    for (const room of rooms) {
      expect(room.adjacentTo.length).toBeGreaterThan(0)
    }
  })

  it('所有邻接 ID 都指向存在的房间', () => {
    const rooms = getAllRooms()
    const allIds = new Set(rooms.map(r => r.id))
    for (const room of rooms) {
      for (const adjId of room.adjacentTo) {
        expect(allIds.has(adjId)).toBe(true)
      }
    }
  })

  // ------- 接入层收口：新注册功能空间 -------
  describe('接入层收口 · 新注册功能空间', () => {
    const newRooms = [
      'automation-workshop',
      'transform-gallery',
      'output',
      'study',
      'dream-nook',
      'growth-garden',
      'app-space',
      'decoration-workshop',
      'space-customizer',
      'time-corridor',
      'timeline-index',
    ]
    for (const id of newRooms) {
      it(`房间 ${id} 已注册且路径可被星盘解析`, () => {
        const room = getRoom(id)
        expect(room).toBeDefined()
        expect(room?.path).toBeDefined()
        // 路径必须与已注册路由一致：getRoomByPath 应命中同一房间
        const byPath = getRoomByPath(room!.path)
        expect(byPath?.id).toBe(id)
      })
    }

    it('新注册空间的 branchFrom 指向已存在的房间', () => {
      for (const id of newRooms) {
        const room = getRoom(id)!
        if (room.branchFrom) {
          expect(getRoom(room.branchFrom)).toBeDefined()
        }
      }
    })
  })
})