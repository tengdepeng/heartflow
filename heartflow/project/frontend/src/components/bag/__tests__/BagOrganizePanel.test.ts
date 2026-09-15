// ============================================================
// BagOrganizePanel 组件测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import { DEFAULT_CATEGORIES } from '../../../modules/bag/defaults'

const RULES_KEY = 'bag:organize:rules'
const RESULTS_KEY = 'bag:organize:results'
const SORT_KEY = 'bag:organize:sort-config'
const BATCH_KEY = 'bag:organize:batch-ops'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  setActivePinia(createPinia())
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = { 'bag:categories': DEFAULT_CATEGORIES, ...kv }
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../BagOrganizePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('BagOrganizePanel 背包整理', () => {
  it('无整理数据时展示默认规则与空态', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('背包整理')
    // 默认 4 条规则
    expect(wrapper.text()).toContain('按熟练度排序')
    expect(wrapper.text()).toContain('低熟练度清理')
    expect(wrapper.text()).toContain('重复物品合并')
    expect(wrapper.text()).toContain('按类别分组')
    // 空态
    expect(wrapper.text()).toContain('还没有执行过整理规则')
    // 默认分类应产生至少一条清理建议（获奖记录 proficiency 1 无备注）
    expect(wrapper.text()).toContain('清理建议')
    expect(wrapper.text()).toContain('获奖记录')
  })

  it('切换规则启用状态并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.bop-rule-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.bop-rule').classes()).toContain('off')
    const rules = storedKV()[RULES_KEY]
    expect(rules[0].enabled).toBe(false)
  })

  it('执行单条规则后写入整理记录', async () => {
    const wrapper = await mountPanel({})
    const runBtn = wrapper.findAll('.bop-rule .bop-btn')[0]
    await runBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('整理记录 · 1')
    expect(wrapper.text()).toContain('按熟练度排序')
    const results = storedKV()[RESULTS_KEY]
    expect(results.length).toBe(1)
    expect(results[0].ruleName).toBe('按熟练度排序')
  })

  it('执行全部规则生成多条记录', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.bop-btn.primary').trigger('click')
    await wrapper.vm.$nextTick()
    // 默认 4 条启用规则
    expect(wrapper.text()).toContain('整理记录 · 4')
    const results = storedKV()[RESULTS_KEY]
    expect(results.length).toBe(4)
  })

  it('添加自定义规则', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.bop-input').setValue('我的清理规则')
    await wrapper.find('.bop-add-row .bop-select').setValue('cleanup')
    await wrapper.find('.bop-add-row .bop-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('我的清理规则')
    const rules = storedKV()[RULES_KEY]
    expect(rules.length).toBe(5)
    expect(rules[4].action).toBe('cleanup')
  })

  it('修改排序策略并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.bop-sort-row .bop-select').setValue('name-asc')
    await wrapper.vm.$nextTick()
    const sortConfig = storedKV()[SORT_KEY]
    expect(sortConfig.strategy).toBe('name-asc')
  })

  it('切换倒序并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.bop-sort-row .bop-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const sortConfig = storedKV()[SORT_KEY]
    expect(sortConfig.reverse).toBe(true)
    expect(wrapper.text()).toContain('正序')
  })

  it('展示既有整理记录', async () => {
    const wrapper = await mountPanel({
      [RESULTS_KEY]: [{
        id: 'org-1',
        ruleId: 'rule-1',
        ruleName: '历史规则',
        action: 'cleanup',
        affectedItems: 3,
        details: ['已标记 3 项'],
        executedAt: '2026-08-01T00:00:00.000Z',
      }],
    })
    expect(wrapper.text()).toContain('整理记录 · 1')
    expect(wrapper.text()).toContain('历史规则')
    expect(wrapper.text()).toContain('3 项')
  })

  it('既有批量操作从存储加载', async () => {
    vi.resetModules()
    setActivePinia(createPinia())
    const storageMock = createMockStorage()
    const kvStore: Record<string, any> = {
      'bag:categories': DEFAULT_CATEGORIES,
      [BATCH_KEY]: [{
        id: 'batch-1',
        type: 'move',
        targetCategoryIds: ['tools'],
        itemNames: ['VS Code', 'Git'],
        params: {},
        executedAt: '2026-08-01T00:00:00.000Z',
        affectedCount: 2,
      }],
    }
    storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [] }))
    ;(globalThis as any).localStorage = storageMock
    invalidateCache()
    const { useBagOrganize } = await import('../../../modules/bag/organize')
    const org = useBagOrganize()
    expect(org.batchOps.value.length).toBe(1)
    expect(org.batchOps.value[0].type).toBe('move')
    expect(org.batchOps.value[0].itemNames).toEqual(['VS Code', 'Git'])
  })
})
