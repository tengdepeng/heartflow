import { describe, it, expect, vi, beforeEach } from 'vitest'
import { effect } from 'vue'
import { registerRoom, unregisterRoom, getAllRooms, type RoomNode } from '../../engine/room-graph'
import { safePush } from '../../utils/router-safe'
import type { CommandItem } from '../../modules/command-palette/types'

// App.vue commandItems 构建契约：房间命令来自 getAllRooms()（静态 + 运行时插件房），
// 插件房经 registerRoom 注册后无需任何额外接线即可被命令面板检索/导航。
function buildRoomCommands(): CommandItem[] {
  const rooms: CommandItem[] = getAllRooms().map((r) => ({
    id: 'room:' + r.id,
    kind: 'room',
    label: r.name,
    keywords: r.id + ' ' + r.path,
    hint: r.path,
    run: () => safePush(routerStub, r.path),
  }))
  return rooms
}

const routerStub = { push: vi.fn(() => Promise.resolve()) } as unknown as import('vue-router').Router

function makeNode(id: string, path: string, name = id): RoomNode {
  return {
    id,
    name,
    path,
    icon: '🧩',
    color: '#d4a574',
    group: 'world',
    domain: 'other',
  } as unknown as RoomNode
}

describe('命令面板 · 插件房可达性（App commandItems 契约）', () => {
  beforeEach(() => {
    // 清理运行时注册残留，保证用例隔离
    for (const r of getAllRooms()) {
      if (!['home-space'].includes(r.id)) unregisterRoom(r.id)
    }
    vi.clearAllMocks()
  })

  it('插件房注册后自动进入房间命令（room: 前缀 + 关键词可检索）', () => {
    const before = buildRoomCommands()
    expect(before.some((c) => c.id === 'room:daily-review-room')).toBe(false)

    registerRoom(makeNode('daily-review-room', '/daily-review', '每日回顾房'))

    const items = buildRoomCommands()
    const cmd = items.find((c) => c.id === 'room:daily-review-room')
    expect(cmd).toBeDefined()
    expect(cmd!.kind).toBe('room')
    expect(cmd!.label).toBe('每日回顾房')
    expect(cmd!.keywords).toContain('/daily-review')
    expect(cmd!.hint).toBe('/daily-review')
  })

  it('插件房命令 run 经 safePush 导航（router 缺失安全降级）', () => {
    registerRoom(makeNode('quote-daily-room', '/quote-daily', '每日一言房'))
    const cmd = buildRoomCommands().find((c) => c.id === 'room:quote-daily-room')!
    expect(() => cmd.run()).not.toThrow()
    expect(routerStub.push).toHaveBeenCalledWith('/quote-daily')
  })

  it('注册/注销触发命令列表响应式更新（禁用插件 → 命令项实时消失）', () => {
    const lengths: number[] = []
    const stop = effect(() => { lengths.push(buildRoomCommands().length) })
    try {
      registerRoom(makeNode('plug-cmd', '/plug-cmd'))
      unregisterRoom('plug-cmd')
    } finally {
      stop()
    }
    // effect 初跑 1 次，之后每次注册/注销（含用例间清理）各追加一次；
    // 关键契约：注册值 = 前值 + 1，注销值回到注册前
    const base = lengths[0]
    const regIdx = lengths.findIndex((n) => n === base + 1)
    expect(regIdx).toBeGreaterThan(0)
    expect(lengths[regIdx + 1]).toBe(base)
  })

  it('静态房间命令不受影响（命令项含主链路房间）', () => {
    const items = buildRoomCommands()
    expect(items.some((c) => c.id === 'room:home')).toBe(true)
    expect(items.some((c) => c.id === 'room:goals')).toBe(true)
    expect(items.some((c) => c.id === 'room:crystal')).toBe(true)
  })
})
