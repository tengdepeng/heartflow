// ============================================================
// TransformGallery 蜕变回廊视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: { getKV: (...args: any[]) => (mockGetKV as any)(...args), setKV: (...args: any[]) => (mockSetKV as any)(...args) },
}))

async function getWrapper() {
  const { default: TransformGallery } = await import('../TransformGallery.vue')
  return mount(TransformGallery)
}

function makeRecord(overrides: Record<string, any> = {}) {
  return {
    id: `trans_${Date.now()}`,
    type: 'body',
    description: '锻炼身体',
    duration: 30,
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('TransformGallery 蜕变回廊视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:transformations'] = []
  })

  // ---- 渲染 ----

  it('渲染标题"蜕变回廊"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('蜕变回廊')
  })

  it('空状态显示提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('蜕变会在合适的时候发生')
  })

  it('有记录时显示统计', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', duration: 30 }),
      makeRecord({ id: 't2', type: 'mind', duration: 60 }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('1时30分')
  })

  it('显示类型分组', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', duration: 30 }),
      makeRecord({ id: 't2', type: 'mind', duration: 60 }),
    ]
    const wrapper = await getWrapper()
    const chips = wrapper.findAll('.tg-type-chip')
    // 5种类型，但只有2种有记录
    expect(chips.length).toBe(5)
    expect(wrapper.text()).toContain('身体')
    expect(wrapper.text()).toContain('心智')
  })

  it('显示时间线', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', description: '晨跑', createdAt: '2026-01-15T00:00:00.000Z' }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('晨跑')
    expect(wrapper.text()).toContain('2026年一月')
  })

  // ---- 搜索 ----

  it('有数据时显示搜索输入框', async () => {
    mockStore['hf:transformations'] = [makeRecord()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.tg-search-input').exists()).toBe(true)
  })

  it('搜索过滤蜕变记录', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', description: '晨跑打卡' }),
      makeRecord({ id: 't2', description: '读书笔记' }),
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.tg-search-input')
    await input.setValue('晨跑')
    expect(wrapper.text()).toContain('晨跑打卡')
    expect(wrapper.text()).not.toContain('读书笔记')
  })

  // ---- 类型筛选 ----

  it('点击类型芯片筛选记录', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', description: '锻炼' }),
      makeRecord({ id: 't2', type: 'mind', description: '读书' }),
      makeRecord({ id: 't3', type: 'body', description: '瑜伽' }),
    ]
    const wrapper = await getWrapper()
    // 点击"身体"芯片
    const chips = wrapper.findAll('.tg-type-chip')
    const bodyChip = chips[0] // 第一个是身体
    await bodyChip.trigger('click')
    await wrapper.vm.$nextTick()
    expect(bodyChip.classes()).toContain('active')
    // 应该只显示身体记录
    expect(wrapper.text()).toContain('锻炼')
    expect(wrapper.text()).toContain('瑜伽')
    expect(wrapper.text()).not.toContain('读书')
  })

  // ---- 排序 ----

  it('排序选择器默认显示最新优先', async () => {
    mockStore['hf:transformations'] = [makeRecord()]
    const wrapper = await getWrapper()
    const select = wrapper.find('.tg-sort-select')
    expect(select.exists()).toBe(true)
    expect((select.element as HTMLSelectElement).value).toBe('newest')
  })

  it('排序"最早优先"生效', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', description: '最近', createdAt: '2026-06-15T00:00:00.000Z' }),
      makeRecord({ id: 't2', description: '较早', createdAt: '2026-01-15T00:00:00.000Z' }),
    ]
    const wrapper = await getWrapper()
    const select = wrapper.find('.tg-sort-select')
    await select.setValue('oldest')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.tg-record-card')
    expect(cards[0].text()).toContain('较早')
    expect(cards[1].text()).toContain('最近')
  })

  // ---- 分布统计 ----

  it('显示分布柱状图', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body' }),
      makeRecord({ id: 't2', type: 'mind' }),
      makeRecord({ id: 't3', type: 'body' }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.tg-distribution').exists()).toBe(true)
    const distRows = wrapper.findAll('.tg-dist-row')
    // 5种类型
    expect(distRows.length).toBe(5)
  })

  it('分布统计正确显示计数', async () => {
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body' }),
      makeRecord({ id: 't2', type: 'body' }),
      makeRecord({ id: 't3', type: 'mind' }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('2') // body 有2条
    expect(wrapper.text()).toContain('1') // mind 有1条
  })

  // ============================================================
  // 集成：蜕变势能面板（INCR-225：补挂载孤儿面板 TransformMomentumPanel）
  // ============================================================

  it('渲染蜕变势能面板（含标题与空态引导）', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.find('.tmp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('蜕变势能')
    expect(wrapper.find('.tmp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('记录第一段蜕变')
  })

  it('有记录时显示势能评分/档位/节奏四格/覆盖事实', async () => {
    const now = new Date()
    const day = 86_400_000
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', createdAt: new Date(now.getTime() - day).toISOString() }),
      makeRecord({ id: 't2', type: 'body', createdAt: new Date(now.getTime() - 2 * day).toISOString() }),
      makeRecord({ id: 't3', type: 'mind', createdAt: new Date(now.getTime() - 3 * day).toISOString() }),
    ]
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.find('.tmp-score').exists()).toBe(true)
    expect(wrapper.find('.tmp-level').exists()).toBe(true)
    expect(wrapper.find('.tmp-momentum-facts').exists()).toBe(true)
    expect(wrapper.text()).toContain('近7天')
    const cells = wrapper.findAll('.tmp-cad-cell')
    expect(cells.length).toBe(4)
    expect(wrapper.text()).toContain('平均间隔')
    expect(wrapper.text()).toContain('连续蜕变')
  })

  it('类型热度按占比渲染', async () => {
    const now = new Date()
    const day = 86_400_000
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', createdAt: new Date(now.getTime() - day).toISOString() }),
      makeRecord({ id: 't2', type: 'body', createdAt: new Date(now.getTime() - 2 * day).toISOString() }),
      makeRecord({ id: 't3', type: 'mind', createdAt: new Date(now.getTime() - 3 * day).toISOString() }),
    ]
    const wrapper = await getWrapper()
    await nextTick()
    const rows = wrapper.findAll('.tmp-heat-row')
    expect(rows.length).toBe(2)
    expect(wrapper.text()).toContain('67%')
  })

  it('温和洞察随记录生成', async () => {
    const now = new Date()
    const day = 86_400_000
    mockStore['hf:transformations'] = [
      makeRecord({ id: 't1', type: 'body', createdAt: new Date(now.getTime() - day).toISOString() }),
      makeRecord({ id: 't2', type: 'mind', createdAt: new Date(now.getTime() - 2 * day).toISOString() }),
    ]
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.find('.tmp-insights').exists()).toBe(true)
    expect(wrapper.text()).toContain('近 30 天蜕变')
  })
})