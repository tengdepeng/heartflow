// ============================================================
// 侧栏分类体系 · 拖拽落点回归
// ----------------------------------------------------------
// 用户投诉：「侧边栏内移动，我刚才从屏风移动前宅两个就移动不回去，且新建分组也有问题」。
//
// 本文件按 App.vue 的真实管线（navTree → dimKey → collectTaxonomyKeys → buildGroupHead）
// 复刻一套等价实现（见 App.vue:892-978），用真实 room-graph / room-manager / room-taxonomy
// 模块跑通两条可验证行为：
//   (1) 把 A 组房间全部拖到 B 组后，A 组头仍在，能再把房间拖回 A；
//   (2) 新建分组（空组）在「自定义」体系下立刻可见。
// ============================================================
import { beforeEach, describe, expect, it } from 'vitest'
import { getAllRooms, type RoomNode, type RoomSlot } from '../engine/room-graph'
import { resetRoomManager, useRoomManager } from '../modules/room-manager'
import {
  SLOT_LABELS,
  UNGROUPED_KEY,
  collectTaxonomyKeys,
  useRoomTaxonomy,
  type NavTaxonomy,
} from '../modules/room-taxonomy'

interface Head {
  id: string
  name: string
  roomIds: string[]
}

// ---- 以下 3 个函数与 App.vue 内同名实现一一对应 ----
function effSlot(rm: ReturnType<typeof useRoomManager>, r: RoomNode): RoomSlot {
  return (rm.getRoomConfig(r.id)?.pinnedSlot as RoomSlot) ?? r.slot ?? 'screen'
}

function dimKey(rm: ReturnType<typeof useRoomManager>, tax: ReturnType<typeof useRoomTaxonomy>, r: RoomNode, t: NavTaxonomy): string {
  if (t === 'slot') return effSlot(rm, r)
  if (t === 'group') return r.group
  if (t === 'custom') return tax.groupIdOf(r.id) ?? UNGROUPED_KEY
  return 'domain'
}

/** 复刻 App.vue:892-941 的 navTree 分组段（省略 home 原点，此处只关心分类头） */
function buildHeads(t: NavTaxonomy): Head[] {
  const rm = useRoomManager()
  const tax = useRoomTaxonomy()
  const rest = getAllRooms().filter((r) => r.id !== 'home-space' && r.id !== 'home')
  const buckets = new Map<string, RoomNode[]>()
  for (const r of rest) {
    const key = dimKey(rm, tax, r, t)
    buckets.set(key, [...(buckets.get(key) ?? []), r])
  }
  const keys = collectTaxonomyKeys(t, buckets.keys(), tax.customGroups.value.map((g) => g.id))
  return keys.map((key) => {
    const rooms = buckets.get(key) ?? []
    const name =
      t === 'slot' ? SLOT_LABELS[key as RoomSlot] ?? key
        : t === 'custom' ? (key === UNGROUPED_KEY ? '未分组' : tax.customGroups.value.find((g) => g.id === key)?.name ?? key)
          : key
    return { id: `tax-${t}-${key}`, name, roomIds: rooms.map((r) => r.id) }
  })
}

describe('侧栏分类体系 · 分组头落点', () => {
  beforeEach(() => {
    localStorage.clear()
    resetRoomManager()
    useRoomTaxonomy().customGroups.value = []
  })

  it('(1) 房间全部移出「屏风」后，屏风分组头仍在（可拖回去）', () => {
    const rm = useRoomManager()
    const before = buildHeads('slot')
    const screenBefore = before.find((h) => h.id === 'tax-slot-screen')!
    expect(screenBefore.roomIds.length).toBeGreaterThan(0)

    // 用户操作：把屏风下的房间一个个拖到「前院」（= onMoveNode 的 tax-slot-* 分支）
    for (const roomId of screenBefore.roomIds) {
      rm.updateRoomConfig(roomId, { pinnedSlot: 'front-yard' })
    }

    const after = buildHeads('slot')
    const screenAfter = after.find((h) => h.id === 'tax-slot-screen')
    // 核心回归点：修复前这里会是 undefined，落点消失 → 再也拖不回去
    expect(screenAfter).toBeTruthy()
    expect(screenAfter!.roomIds).toEqual([])
    expect(screenAfter!.name).toBe('屏风')

    // 前院确实收到了这些房间（前院原本就有房间，故按「包含」断言）
    const front = after.find((h) => h.id === 'tax-slot-front-yard')!
    for (const roomId of screenBefore.roomIds) {
      expect(front.roomIds).toContain(roomId)
    }

    // 拖回去：把其中一个房间改回屏风，屏风桶重新有成员
    rm.updateRoomConfig(screenBefore.roomIds[0], { pinnedSlot: 'screen' })
    const back = buildHeads('slot')
    expect(back.find((h) => h.id === 'tax-slot-screen')!.roomIds).toEqual([screenBefore.roomIds[0]])
  })

  it('(1b) 宅院六个分区头恒定存在，与是否有房间无关', () => {
    const heads = buildHeads('slot')
    expect(heads.map((h) => h.id)).toEqual(Object.keys(SLOT_LABELS).map((k) => `tax-slot-${k}`))
  })

  it('(2) 新建的空分组立刻出现在「自定义」体系下', () => {
    const tax = useRoomTaxonomy()
    // 建组前：只有「未分组」
    expect(buildHeads('custom').map((h) => h.id)).toEqual([`tax-custom-${UNGROUPED_KEY}`])

    const id = tax.createCustomGroup('旅行')
    const heads = buildHeads('custom')
    const created = heads.find((h) => h.id === `tax-custom-${id}`)
    expect(created).toBeTruthy()
    expect(created!.name).toBe('旅行')
    expect(created!.roomIds).toEqual([]) // 空组，但是有效落点

    // 把「劳酬」拖进新分组（= onMoveNode 的 tax-custom-* → addRoomToGroup 分支）
    tax.addRoomToGroup(id, 'reward')
    const after = buildHeads('custom')
    expect(after.find((h) => h.id === `tax-custom-${id}`)!.roomIds).toEqual(['reward'])
    expect(after.find((h) => h.id === `tax-custom-${UNGROUPED_KEY}`)!.roomIds).not.toContain('reward')
  })

  it('(2b) 连续新建多个分组互不干扰（同毫秒 id 撞车回归）', () => {
    const tax = useRoomTaxonomy()
    const a = tax.createCustomGroup('甲')
    const b = tax.createCustomGroup('乙')
    expect(a).not.toBe(b)
    tax.addRoomToGroup(b, 'reward')
    const heads = buildHeads('custom')
    expect(heads.find((h) => h.id === `tax-custom-${a}`)!.roomIds).toEqual([])
    expect(heads.find((h) => h.id === `tax-custom-${b}`)!.roomIds).toEqual(['reward'])
  })
})
