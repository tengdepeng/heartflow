import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const TESTAMENTS_KEY = 'hf:testaments'

function testament(overrides: Record<string, any> = {}) {
  return {
    id: `testament_${Math.random().toString(36).slice(2, 8)}`,
    name: '我的遗嘱',
    testator: '我',
    type: 'spiritual',
    status: 'draft',
    trigger: 'immediate',
    triggerAt: null,
    triggerEvent: null,
    clauses: [],
    beneficiaries: [],
    linkedWills: [],
    summary: '',
    isPublic: false,
    encrypted: false,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    executedAt: null,
    guardian: null,
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../TestamentPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('TestamentPanel 殿堂遗嘱', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('殿堂遗嘱')
    expect(wrapper.text()).toContain('尚无遗嘱')
  })

  it('展示遗嘱统计', async () => {
    const wrapper = await mountPanel({
      [TESTAMENTS_KEY]: [
        testament({ status: 'draft' }),
        testament({ status: 'active' }),
        testament({ status: 'executed', clauses: [{ id: 'c1', title: '核心条款', content: '内容', type: 'spiritual', beneficiaryIds: [], isCore: true, order: 1 }], beneficiaries: [{ id: 'b1', name: '小明', relationship: '亲友', priority: 1, received: false, receivedAt: null, conditions: [] }] }),
      ],
    })
    expect(wrapper.text()).toContain('遗嘱统计')
    expect(wrapper.text()).toContain('受益人 1')
    expect(wrapper.text()).toContain('条款 1')
  })

  it('创建遗嘱并持久化', async () => {
    const wrapper = await mountPanel({})
    const inputs = wrapper.findAll('.will-input')
    await inputs[0].setValue('传家之嘱')
    await inputs[1].setValue('我')
    const createBtn = wrapper.findAll('.will-btn').find(b => b.text() === '立嘱')
    await createBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    const records = storedKV()[TESTAMENTS_KEY]
    expect(records.length).toBe(1)
    expect(records[0].name).toBe('传家之嘱')
    expect(wrapper.text()).toContain('传家之嘱')
  })

  it('封印→生效→执行完整流程', async () => {
    const t = testament({ id: 't_flow', status: 'active', clauses: [{ id: 'c1', title: '条款', content: '内容', type: 'spiritual', beneficiaryIds: [], isCore: true, order: 1 }] })
    const wrapper = await mountPanel({ [TESTAMENTS_KEY]: [t] })
    // 展开详情
    const detailBtn = wrapper.findAll('.will-btn').find(b => b.text() === '详情')
    await detailBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('详情')
    // 生效中的遗嘱可执行（未禁用）
    const executeBtn = wrapper.findAll('.will-btn').find(b => b.text() === '执行仪式')
    expect(executeBtn!.attributes('disabled')).toBeUndefined()
  })

  it('添加条款', async () => {
    const t = testament({ id: 't_clause' })
    const wrapper = await mountPanel({ [TESTAMENTS_KEY]: [t] })
    const detailBtn = wrapper.findAll('.will-btn').find(b => b.text() === '详情')
    await detailBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    // 输入框顺序：立嘱表单[0,1] → 条款表单[2,3] → 受益人表单[4,5]
    const inputs = wrapper.findAll('.will-input')
    await inputs[2].setValue('第一条')
    await inputs[3].setValue('把书留给小明')
    const addBtn = wrapper.findAll('.will-btn').find(b => b.text() === '加条款')
    await addBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('第一条')
    const records = storedKV()[TESTAMENTS_KEY]
    expect(records[0].clauses.length).toBe(1)
  })

  it('添加受益人', async () => {
    const t = testament({ id: 't_ben' })
    const wrapper = await mountPanel({ [TESTAMENTS_KEY]: [t] })
    const detailBtn = wrapper.findAll('.will-btn').find(b => b.text() === '详情')
    await detailBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    // 输入框顺序：立嘱表单[0,1] → 条款表单[2,3] → 受益人表单[4,5]
    const inputs = wrapper.findAll('.will-input')
    await inputs[4].setValue('小红')
    await inputs[5].setValue('挚友')
    const addBtn = wrapper.findAll('.will-btn').find(b => b.text() === '加受益人')
    await addBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('小红')
    const records = storedKV()[TESTAMENTS_KEY]
    expect(records[0].beneficiaries.length).toBe(1)
  })

  it('封印草稿遗嘱', async () => {
    const t = testament({ id: 't_seal', clauses: [{ id: 'c1', title: '条款', content: '内容', type: 'spiritual', beneficiaryIds: [], isCore: true, order: 1 }] })
    const wrapper = await mountPanel({ [TESTAMENTS_KEY]: [t] })
    const detailBtn = wrapper.findAll('.will-btn').find(b => b.text() === '详情')
    await detailBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    const sealBtn = wrapper.findAll('.will-btn').find(b => b.text() === '封印')
    await sealBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    const records = storedKV()[TESTAMENTS_KEY]
    expect(records[0].status).toBe('sealed')
    expect(wrapper.text()).toContain('已封印')
  })
})
