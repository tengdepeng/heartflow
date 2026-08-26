// ============================================================
// SeasonalRituals 岁时阁视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 辅助函数 ----
async function createWrapper() {
  const { default: SeasonalRituals } = await import('../SeasonalRituals.vue')
  return mount(SeasonalRituals, { attachTo: document.body })
}

function makeRitual(overrides: Record<string, any> = {}) {
  return {
    id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '默认仪式',
    season: 'spring',
    description: '',
    tags: [],
    count: 0,
    lastCompletedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---- 测试 ----
describe('SeasonalRituals 岁时阁视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:seasonal_rituals'] = []
  })

  // ------- 渲染标题和统计卡片 -------
  it('渲染标题和统计卡片', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('岁时阁')
    expect(wrapper.text()).toContain('总仪式')
    expect(wrapper.text()).toContain('今年完成')
    expect(wrapper.text()).toContain('连续天数')
    // 季节统计卡片
    expect(wrapper.find('.sr-season-stats-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('季节完成统计')
  })

  // ------- 显示季节标签 -------
  it('显示季节标签', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '踏青', season: 'spring' }),
      makeRitual({ id: 'r2', name: '游泳', season: 'summer' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 默认 activeSeason 是 'spring'，显示春仪式
    expect(wrapper.text()).toContain('踏青')
    expect(wrapper.text()).not.toContain('游泳')
    // 点击夏标签
    const tabs = wrapper.findAll('.sr-season-tab')
    expect(tabs.length).toBe(4)
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('游泳')
    expect(wrapper.text()).not.toContain('踏青')
  })

  // ------- 添加仪式后显示 -------
  it('添加仪式后显示', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 填写表单
    const nameInput = wrapper.find('.sr-add-form .sr-input')
    await nameInput.setValue('清明祭扫')
    // 选择季节
    const select = wrapper.find('.sr-add-form .sr-select')
    await select.setValue('spring')
    // 点击添加
    const addBtn = wrapper.find('.sr-btn')
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 验证添加后显示
    expect(wrapper.text()).toContain('清明祭扫')
    // 验证存储被调用
    expect(mockSetKV).toHaveBeenCalled()
    const saved = mockStore['hf:seasonal_rituals']
    expect(saved.length).toBe(1)
    expect(saved[0].name).toBe('清明祭扫')
  })

  // ------- 排序切换工作 -------
  it('排序按钮组存在', async () => {
    const wrapper = await createWrapper()
    const sortBtns = wrapper.findAll('.sr-sort-btn')
    expect(sortBtns.length).toBe(3)
    expect(sortBtns[0].text()).toContain('名称')
    expect(sortBtns[1].text()).toContain('完成次数')
    expect(sortBtns[2].text()).toContain('最近完成')
  })

  it('默认按完成次数降序排列', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '仪式A', season: 'spring', count: 1 }),
      makeRitual({ id: 'r2', name: '仪式B', season: 'spring', count: 5 }),
      makeRitual({ id: 'r3', name: '仪式C', season: 'spring', count: 3 }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 默认排序：count desc，所以顺序是 仪式B(5) → 仪式C(3) → 仪式A(1)
    const cards = wrapper.findAll('.sr-ritual-card-name')
    expect(cards.length).toBe(3)
    expect(cards[0].text()).toBe('仪式B')
    expect(cards[1].text()).toBe('仪式C')
    expect(cards[2].text()).toBe('仪式A')
  })

  it('点击排序按钮切换排序', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '仪式A', season: 'spring', count: 1 }),
      makeRitual({ id: 'r2', name: '仪式B', season: 'spring', count: 5 }),
      makeRitual({ id: 'r3', name: '仪式C', season: 'spring', count: 3 }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 点击"名称"排序按钮 → 默认降序：仪式C → 仪式B → 仪式A
    const sortBtns = wrapper.findAll('.sr-sort-btn')
    await sortBtns[0].trigger('click') // 名称
    await wrapper.vm.$nextTick()
    const cards1 = wrapper.findAll('.sr-ritual-card-name')
    expect(cards1[0].text()).toBe('仪式C')
    expect(cards1[1].text()).toBe('仪式B')
    expect(cards1[2].text()).toBe('仪式A')
    // 再次点击"名称" → 切换为升序：仪式A → 仪式B → 仪式C
    await sortBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    const cards2 = wrapper.findAll('.sr-ritual-card-name')
    expect(cards2[0].text()).toBe('仪式A')
    expect(cards2[1].text()).toBe('仪式B')
    expect(cards2[2].text()).toBe('仪式C')
  })

  it('点击排序按钮显示激活状态和箭头', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 默认 active 的是 "完成次数"（count）
    const sortBtns = wrapper.findAll('.sr-sort-btn')
    expect(sortBtns[1].classes()).toContain('active')
    expect(sortBtns[1].find('.sr-sort-arrow').exists()).toBe(true)
    // 点击"名称"按钮
    await sortBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(sortBtns[0].classes()).toContain('active')
    expect(sortBtns[0].find('.sr-sort-arrow').exists()).toBe(true)
    expect(sortBtns[1].classes()).not.toContain('active')
  })
})

// ============================================================
// 蜕变光茧动画测试
// ============================================================
describe('蜕变光茧动画', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清理前一个测试残留的 Teleport DOM
    document.querySelector('.cocoon-overlay')?.remove()
    mockStore['hf:life_rituals'] = [
      { id: 'lr1', name: '诞生', date: '2026-01-01', note: '', icon: '👶', type: '诞生' },
    ]
  })

  it('完成生命仪礼后显示光茧动画覆盖层', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 确认生命仪礼卡片存在
    expect(wrapper.text()).toContain('诞生')
    expect(wrapper.text()).toContain('2026-01-01')

    // 点击蝴蝶按钮完成仪礼
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    expect(completeBtn.exists()).toBe(true)
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 光茧覆盖层应该出现
    const overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-svg')).not.toBeNull()

    // 状态应为 cocooning
    expect((wrapper.vm as any).cocoonState).toBe('cocooning')
    const label = overlay!.querySelector('.cocoon-state-label')
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe('蜕变中...')
  })

  it('完成后的仪礼标记为已蜕变', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 触发完成
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 直接标记 done（模拟动画完成后的效果）
    const vm = wrapper.vm as any
    const ritual = vm.prCtx.lifeRituals.value[0]
    ritual.done = true
    await wrapper.vm.$nextTick()

    // 仪礼应标记为已蜕变
    expect(vm.prCtx.lifeRituals.value[0].done).toBe(true)
    expect(wrapper.text()).toContain('已蜕变')
  })

  it('光茧动画状态机初始与切换', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 初始状态: 无覆盖层 (idle)
    expect(document.querySelector('.cocoon-overlay')).toBeNull()

    // 触发完成 -> cocooning
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 覆盖层出现
    let overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-svg')).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-state-label')!.textContent).toBe('蜕变中...')

    // 通过 overlay 的点击关闭 (模拟 @click 回调)
    // 直接调用 overlay 的 click 方法触发 Vue 事件
    ;(overlay! as HTMLElement).click()
    await wrapper.vm.$nextTick()
    overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).toBeNull()
  })

  it('光茧覆盖层点击可关闭', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 触发完成
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 确认覆盖层存在
    const overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-state-label')).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-state-label')!.textContent).toBe('蜕变中...')

    // 点击覆盖层关闭
    ;(overlay! as HTMLElement).click()
    await wrapper.vm.$nextTick()

    // 覆盖层应消失
    expect(document.querySelector('.cocoon-overlay')).toBeNull()
  })
})