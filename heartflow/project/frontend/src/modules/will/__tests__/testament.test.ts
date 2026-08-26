// ============================================================
// 先祖遗志 · 殿堂遗嘱测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useTestament } from '../testament'

// 模拟 storage
const { mockKV } = vi.hoisted(() => {
  const mockKV: Record<string, any> = {}
  return { mockKV }
})
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, def: T) => mockKV[key] ?? def,
    setKV: (key: string, val: any) => { mockKV[key] = val },
  },
}))

function resetStore(): void {
  mockKV['hf:testaments'] = []
  mockKV['hf:execution_rituals'] = []
}

describe('殿堂遗嘱模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
    // 通过重新调用 useTestament 触发重新加载
    // 因为 composable 使用模块级 ref，我们需要通过清空内部状态
    // 这里我们直接清空存储并通过 load 方式刷新
    const t = useTestament()
    // 直接重置 testaments 和 rituals 数组
    ;(t as any).testaments.value = []
    ;(t as any).rituals.value = []
  })

  // ---- 基础测试 ----

  it('初始化时空遗嘱列表', () => {
    const t = useTestament()
    expect(t.allTestaments.value).toHaveLength(0)
    expect(t.stats.value.total).toBe(0)
  })

  it('创建遗嘱：默认草稿状态', () => {
    const t = useTestament()
    const result = t.createTestament({
      name: '我的精神遗产',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
      summary: '这是一份精神遗嘱',
    })

    expect(result.name).toBe('我的精神遗产')
    expect(result.testator).toBe('测试者')
    expect(result.type).toBe('spiritual')
    expect(result.trigger).toBe('immediate')
    expect(result.status).toBe('draft')
    expect(result.clauses).toHaveLength(0)
    expect(result.beneficiaries).toHaveLength(0)
    expect(result.summary).toBe('这是一份精神遗嘱')
    expect(t.allTestaments.value).toHaveLength(1)
    expect(t.draftTestaments.value).toHaveLength(1)
  })

  it('添加条款到遗嘱', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '测试遗嘱',
      testator: '测试者',
      type: 'material',
      trigger: 'immediate',
    })

    const clause = t.addClause(testament.id, {
      title: '第一条',
      content: '将所有书籍捐赠给图书馆',
      type: 'knowledge',
      beneficiaryIds: [],
    })

    expect(clause).not.toBeNull()
    expect(clause!.title).toBe('第一条')
    expect(clause!.order).toBe(1)
    expect(clause!.isCore).toBe(false)

    const updated = t.allTestaments.value.find(x => x.id === testament.id)
    expect(updated!.clauses).toHaveLength(1)
    expect(updated!.clauses[0].title).toBe('第一条')
  })

  it('添加受益人到遗嘱', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '测试遗嘱',
      testator: '测试者',
      type: 'material',
      trigger: 'immediate',
    })

    const ben = t.addBeneficiary(testament.id, {
      name: '张三',
      relationship: '挚友',
      priority: 1,
    })

    expect(ben).not.toBeNull()
    expect(ben!.name).toBe('张三')
    expect(ben!.relationship).toBe('挚友')
    expect(ben!.priority).toBe(1)
    expect(ben!.received).toBe(false)

    const updated = t.allTestaments.value.find(x => x.id === testament.id)
    expect(updated!.beneficiaries).toHaveLength(1)
  })

  // ---- 状态流转测试 ----

  it('封印遗嘱：草稿 → 已封印', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '待封印遗嘱',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    // 先添加一条条款
    t.addClause(testament.id, {
      title: '核心条款',
      content: '内容',
      type: 'spiritual',
      beneficiaryIds: [],
    })

    const result = t.sealTestament(testament.id)
    expect(result).not.toBeNull()
    expect(result!.status).toBe('sealed')
    expect(result!.encrypted).toBe(true)
  })

  it('激活遗嘱：已封印 → 生效中', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '待激活遗嘱',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    t.addClause(testament.id, {
      title: '条款',
      content: '内容',
      type: 'spiritual',
      beneficiaryIds: [],
    })

    t.sealTestament(testament.id)
    const result = t.activateTestament(testament.id)

    expect(result).not.toBeNull()
    expect(result!.status).toBe('active')
    expect(t.activeTestaments.value).toHaveLength(1)
  })

  it('撤销遗嘱', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '待撤销遗嘱',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    const result = t.revokeTestament(testament.id, '改变心意')
    expect(result).not.toBeNull()
    expect(result!.status).toBe('revoked')
    expect(result!.summary).toContain('改变心意')
  })

  // ---- 边界测试 ----

  it('无法封印零条款的遗嘱', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '空条款遗嘱',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    // 没有添加任何条款
    const result = t.sealTestament(testament.id)
    expect(result).toBeNull()

    // 状态仍然是草稿
    const updated = t.allTestaments.value.find(x => x.id === testament.id)
    expect(updated!.status).toBe('draft')
  })

  it('无法撤销已执行的遗嘱', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '已执行遗嘱',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    t.addClause(testament.id, {
      title: '条款',
      content: '内容',
      type: 'spiritual',
      beneficiaryIds: [],
    })

    t.sealTestament(testament.id)
    t.activateTestament(testament.id)

    // 模拟执行（直接修改状态，因为 executeTestament 是 async）
    const idx = (t as any).testaments.value.findIndex((x: any) => x.id === testament.id)
    ;(t as any).testaments.value[idx].status = 'executed'

    const result = t.revokeTestament(testament.id)
    expect(result).toBeNull()
  })

  // ---- 统计测试 ----

  it('统计计算：按类型和状态分布', () => {
    const t = useTestament()

    // 创建不同类型和状态的遗嘱
    t.createTestament({ name: '精神遗嘱', testator: 'A', type: 'spiritual', trigger: 'immediate' })
    const t2 = t.createTestament({ name: '数字遗嘱', testator: 'B', type: 'digital', trigger: 'timed' })
    const t3 = t.createTestament({ name: '物质遗嘱', testator: 'C', type: 'material', trigger: 'event' })

    // t2 封印并激活
    t.addClause(t2.id, { title: '条款1', content: '...', type: 'digital', beneficiaryIds: [] })
    t.sealTestament(t2.id)
    t.activateTestament(t2.id)

    // t3 撤销
    t.revokeTestament(t3.id)

    const stats = t.stats.value

    expect(stats.total).toBe(3)
    expect(stats.draft).toBe(1)   // t1
    expect(stats.active).toBe(1)  // t2
    expect(stats.executed).toBe(0)

    // byType 应该包含所有 5 种类型
    expect(stats.byType).toHaveLength(5)
    const spiritualType = stats.byType.find(x => x.type === 'spiritual')
    expect(spiritualType!.count).toBe(1)
    const digitalType = stats.byType.find(x => x.type === 'digital')
    expect(digitalType!.count).toBe(1)
    const materialType = stats.byType.find(x => x.type === 'material')
    expect(materialType!.count).toBe(1)

    // byStatus 应该包含所有 6 种状态
    expect(stats.byStatus).toHaveLength(6)
    const draftStatus = stats.byStatus.find(x => x.status === 'draft')
    expect(draftStatus!.count).toBe(1)
    const activeStatus = stats.byStatus.find(x => x.status === 'active')
    expect(activeStatus!.count).toBe(1)
    const revokedStatus = stats.byStatus.find(x => x.status === 'revoked')
    expect(revokedStatus!.count).toBe(1)
  })

  it('统计计算：总条款数和总受益人数', () => {
    const t = useTestament()

    const testament = t.createTestament({
      name: '统计测试遗嘱',
      testator: '测试者',
      type: 'knowledge',
      trigger: 'immediate',
    })

    t.addClause(testament.id, { title: '条款1', content: '...', type: 'knowledge', beneficiaryIds: [] })
    t.addClause(testament.id, { title: '条款2', content: '...', type: 'knowledge', beneficiaryIds: [] })
    t.addBeneficiary(testament.id, { name: '甲', relationship: '朋友' })
    t.addBeneficiary(testament.id, { name: '乙', relationship: '家人' })

    const stats = t.stats.value
    expect(stats.totalClauses).toBe(2)
    expect(stats.totalBeneficiaries).toBe(2)
  })

  // ---- 删除测试 ----

  it('删除遗嘱', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '待删除遗嘱',
      testator: '测试者',
      type: 'ritual',
      trigger: 'immediate',
    })

    expect(t.allTestaments.value).toHaveLength(1)

    const result = t.removeTestament(testament.id)
    expect(result).toBe(true)
    expect(t.allTestaments.value).toHaveLength(0)
  })

  it('删除不存在的遗嘱返回 false', () => {
    const t = useTestament()
    const result = t.removeTestament('non_existent_id')
    expect(result).toBe(false)
  })

  // ---- 条款重排序测试 ----

  it('删除条款后剩余条款重新排序', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '排序测试',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    t.addClause(testament.id, { title: '第一条', content: '...', type: 'spiritual', beneficiaryIds: [] })
    const c2 = t.addClause(testament.id, { title: '第二条', content: '...', type: 'spiritual', beneficiaryIds: [] })
    t.addClause(testament.id, { title: '第三条', content: '...', type: 'spiritual', beneficiaryIds: [] })

    // 删除中间的条款
    t.removeClause(testament.id, c2!.id)

    const updated = t.allTestaments.value.find(x => x.id === testament.id)
    expect(updated!.clauses).toHaveLength(2)

    // 剩余的两条应该重新排序为 1 和 2
    const orders = updated!.clauses.map(c => c.order).sort()
    expect(orders).toEqual([1, 2])

    // 第一条和第三条应该还在
    const titles = updated!.clauses.map(c => c.title).sort()
    expect(titles).toContain('第一条')
    expect(titles).toContain('第三条')
  })

  it('删除第一条后重排序', () => {
    const t = useTestament()
    const testament = t.createTestament({
      name: '删除首条测试',
      testator: '测试者',
      type: 'spiritual',
      trigger: 'immediate',
    })

    const c1 = t.addClause(testament.id, { title: '第一', content: '...', type: 'spiritual', beneficiaryIds: [] })
    t.addClause(testament.id, { title: '第二', content: '...', type: 'spiritual', beneficiaryIds: [] })
    t.addClause(testament.id, { title: '第三', content: '...', type: 'spiritual', beneficiaryIds: [] })

    t.removeClause(testament.id, c1!.id)

    const updated = t.allTestaments.value.find(x => x.id === testament.id)
    expect(updated!.clauses).toHaveLength(2)
    const orders = updated!.clauses.map(c => c.order).sort()
    expect(orders).toEqual([1, 2])
  })
})
