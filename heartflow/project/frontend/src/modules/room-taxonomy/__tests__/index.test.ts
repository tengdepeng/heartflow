// ============================================================
// room-taxonomy 单测
// ----------------------------------------------------------
// 重点覆盖两条真实用户投诉的根因（分组头集合 = 「实际有房间的桶」）：
//   (a) 把某组房间全部移走后，源分组头消失 → 拖拽落点不存在 → 再也移不回去；
//   (b) createCustomGroup() 建出来的是空组，不进任何桶 → 侧栏完全看不到。
// 修复后分组头集合 = 维度全集 ∪ 实际有房间的桶，空组也渲染。
// ============================================================
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DOMAIN_LABELS,
  GROUP_LABELS,
  SLOT_LABELS,
  UNGROUPED_KEY,
  collectTaxonomyKeys,
  useRoomTaxonomy,
} from '../index'

describe('collectTaxonomyKeys', () => {
  it('domain：全集恒为七领域，与实际占用无关', () => {
    const keys = collectTaxonomyKeys('domain', [])
    expect(keys).toEqual(Object.keys(DOMAIN_LABELS))
    expect(keys).toEqual(['inward', 'outward', 'body', 'knowledge', 'work', 'time', 'system'])
  })

  it('group：全集恒为四个物理分组', () => {
    expect(collectTaxonomyKeys('group', [])).toEqual(Object.keys(GROUP_LABELS))
  })

  it('slot：全集恒为六个宅院分区（空分区也保留头）', () => {
    expect(collectTaxonomyKeys('slot', [])).toEqual(Object.keys(SLOT_LABELS))
    expect(collectTaxonomyKeys('slot', [])).toEqual(
      ['screen', 'front-yard', 'hall', 'back-yard', 'side-wing', 'corner'],
    )
  })

  it('回归 (a)：房间从「屏风」全部移走后，screen 分组头仍在（可拖回去）', () => {
    // 移走前：screen 与 front-yard 都有房间
    const before = collectTaxonomyKeys('slot', ['screen', 'front-yard'])
    expect(before).toContain('screen')

    // 移走后：只剩 front-yard 有房间 —— 旧实现会丢掉 screen 头，导致落点消失
    const after = collectTaxonomyKeys('slot', ['front-yard'])
    expect(after).toContain('screen')
    expect(after).toContain('front-yard')
    // 全集顺序稳定，不因占用情况变化而抖动
    expect(after).toEqual(Object.keys(SLOT_LABELS))
  })

  it('custom：空分组与「未分组」兜底都在全集里', () => {
    const keys = collectTaxonomyKeys('custom', [], ['ug-1', 'ug-2'])
    expect(keys).toEqual(['ug-1', 'ug-2', UNGROUPED_KEY])
  })

  it('custom：无自定义分组时至少保留「未分组」', () => {
    expect(collectTaxonomyKeys('custom', [], [])).toEqual([UNGROUPED_KEY])
  })

  it('额外 key（用户自定义 pinned 值 / 残留 groupId）追加在固有全集之后且去重', () => {
    const keys = collectTaxonomyKeys('domain', ['time', 'my-own-domain', 'system'])
    expect(keys.indexOf('time')).toBeLessThan(keys.indexOf('my-own-domain'))
    expect(keys.filter((k) => k === 'time')).toHaveLength(1)
    expect(keys).toContain('my-own-domain')
  })
})

describe('useRoomTaxonomy · 自定义分组 CRUD', () => {
  beforeEach(() => {
    // 模块级单例：每个用例前清空，避免用例之间串味
    useRoomTaxonomy().customGroups.value = []
  })

  it('回归 (b)：新建的空分组立刻出现在分组头全集里', () => {
    const tax = useRoomTaxonomy()
    expect(collectTaxonomyKeys('custom', [], tax.customGroups.value.map((g) => g.id)))
      .toEqual([UNGROUPED_KEY])

    const id = tax.createCustomGroup('旅行')
    expect(tax.customGroups.value).toHaveLength(1)
    expect(tax.customGroups.value[0].roomIds).toEqual([]) // 空组

    const keys = collectTaxonomyKeys('custom', [], tax.customGroups.value.map((g) => g.id))
    expect(keys).toContain(id)
    expect(keys).toContain(UNGROUPED_KEY)
  })

  it('回归：同毫秒内连建多个分组 id 不得重复（原 Date.now() 实现会撞 id）', () => {
    const tax = useRoomTaxonomy()
    const ids = [
      tax.createCustomGroup('甲'),
      tax.createCustomGroup('乙'),
      tax.createCustomGroup('丙'),
      tax.createCustomGroup('丁'),
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(tax.customGroups.value.map((g) => g.id)).toEqual(ids)
  })

  it('房间移入/移出分组：groupIdOf 与 addRoomToGroup / removeRoomFromGroups 一致', () => {
    const tax = useRoomTaxonomy()
    const g1 = tax.createCustomGroup('甲组')
    const g2 = tax.createCustomGroup('乙组')

    tax.addRoomToGroup(g1, 'reward')
    expect(tax.groupIdOf('reward')).toBe(g1)
    // 归入 dimKey 后落到 g1 桶
    expect(collectTaxonomyKeys('custom', [tax.groupIdOf('reward') ?? UNGROUPED_KEY], [g1, g2]))
      .toEqual([g1, g2, UNGROUPED_KEY])

    // 改投乙组：自动从甲组移除，甲组头仍在（空组不消失）
    tax.addRoomToGroup(g2, 'reward')
    expect(tax.groupIdOf('reward')).toBe(g2)
    expect(tax.customGroups.value.find((g) => g.id === g1)!.roomIds).toEqual([])
    const keys = collectTaxonomyKeys('custom', [g2], [g1, g2])
    expect(keys).toEqual([g1, g2, UNGROUPED_KEY])

    // 回到未分组
    tax.removeRoomFromGroups('reward')
    expect(tax.groupIdOf('reward')).toBeNull()
  })

  it('删除分组后成员回到未分组，且不再出现在全集里', () => {
    const tax = useRoomTaxonomy()
    const id = tax.createCustomGroup('临时')
    tax.addRoomToGroup(id, 'reward')
    tax.deleteCustomGroup(id)
    expect(tax.customGroups.value).toHaveLength(0)
    expect(tax.groupIdOf('reward')).toBeNull()
    expect(collectTaxonomyKeys('custom', [], tax.customGroups.value.map((g) => g.id)))
      .toEqual([UNGROUPED_KEY])
  })
})

describe('useRoomTaxonomy · 自定义分组拖拽排序', () => {
  beforeEach(() => {
    useRoomTaxonomy().customGroups.value = []
  })

  it('reorderCustomGroups 调整顺序后数组顺序改变，且越界/相同下标 no-op', () => {
    const tax = useRoomTaxonomy()
    const a = tax.createCustomGroup('甲')
    const b = tax.createCustomGroup('乙')
    const c = tax.createCustomGroup('丙')
    expect(tax.customGroups.value.map((g) => g.id)).toEqual([a, b, c])

    // 把丙（index 2）拖到最前（index 0）
    tax.reorderCustomGroups(2, 0)
    expect(tax.customGroups.value.map((g) => g.id)).toEqual([c, a, b])

    // 把乙拖到末尾（index 2）
    tax.reorderCustomGroups(1, 2)
    expect(tax.customGroups.value.map((g) => g.id)).toEqual([c, b, a])

    // 越界 / 负下标 no-op
    const before = tax.customGroups.value.map((g) => g.id)
    tax.reorderCustomGroups(1, 9)
    tax.reorderCustomGroups(-1, 0)
    expect(tax.customGroups.value.map((g) => g.id)).toEqual(before)

    // from === to no-op
    tax.reorderCustomGroups(0, 0)
    expect(tax.customGroups.value.map((g) => g.id)).toEqual(before)
  })

  it('reorderCustomGroups 后房间归属不丢（组跟着顺序走，roomIds 不串）', () => {
    const tax = useRoomTaxonomy()
    const a = tax.createCustomGroup('甲')
    const b = tax.createCustomGroup('乙')
    tax.addRoomToGroup(a, 'reward')
    tax.addRoomToGroup(b, 'garden')
    tax.reorderCustomGroups(0, 1) // 甲乙互换
    expect(tax.customGroups.value.map((g) => g.id)).toEqual([b, a])
    // 顺序变了，但房间仍挂在原组上
    expect(tax.groupIdOf('reward')).toBe(a)
    expect(tax.groupIdOf('garden')).toBe(b)
  })
})
