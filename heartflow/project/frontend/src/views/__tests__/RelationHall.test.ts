// ============================================================
// RelationHall 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// 模拟 storage
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getConfig: () => ({
      display: {
        trendNoteCount: 20,
        titleTruncateLength: 8,
        excerptTruncateLength: 80,
        tagDisplayCount: 2,
        statsWindowDays: 30,
        searchResultLimit: 10,
        dreamStorageLimit: 100,
        cleanupThresholdDays: 30,
        moveTrajectoryCount: 20,
        healthRecentSleepCount: 14,
        healthRecentExerciseCount: 30,
        healthRecentMealCount: 5,
        noteMaxLength: 100,
      },
      health: {
        exerciseTarget: 150,
        sleepTarget: 7,
        sleepMinThreshold: 6,
        sleepCriticalThreshold: 5,
        sleepExcellentThreshold: 7.5,
      },
      worklog: {
        overtimeRate: 1.5,
        nightRate: 1.3,
        defaultStart: '09:00',
        defaultEnd: '18:00',
        trendDays: 30,
        trendMonths: 6,
        recentShiftLimit: 15,
      },
    }),
  },
}))

// 共享人员列表
const mockPersons = ref<any[]>([])

vi.mock('../../modules/relation', () => ({
  useRelation: () => ({
    persons: mockPersons,
    load: () => {},
    remove: (id: string) => { mockPersons.value = mockPersons.value.filter((p: any) => p.id !== id) },
  }),
}))

async function getWrapper() {
  const { default: RelationHall } = await import('../RelationHall.vue')
  return mount(RelationHall)
}

describe('RelationHall 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPersons.value = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('羁绊之厅')
  })

  it('空状态显示提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有记录')
  })

  it('有人员时显示卡片', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.8, notes: '好朋友', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('朋友')
  })

  it('显示亲密值', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.75, notes: '', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('75%')
  })

  it('显示网络图', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: [] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.5, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    const nodes = wrapper.findAll('.net-node-group')
    expect(nodes).toHaveLength(2)
    expect(nodes[0].text()).toContain('张三')
  })

  it('删除人员', async () => {
    mockPersons.value = [
      { id: 'p1', name: '待删除', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    await wrapper.find('.card-del').trigger('click')
    expect(mockPersons.value).toHaveLength(0)
  })

  it('点击"添加"打开创建表单', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.btn-new').trigger('click')
    await wrapper.vm.$nextTick()
    // 内容通过 Teleport 到 body
    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('添加')
  })

  it('显示重要日期', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [{ label: '生日', date: '01-01' }] },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('生日')
    expect(wrapper.text()).toContain('01-01')
  })

  it('显示备注', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '多年好友', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('多年好友')
  })

  // ---- 搜索 ----

  it('有数据时显示搜索输入框', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.rh-search-input').exists()).toBe(true)
  })

  it('搜索过滤姓名', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: [] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.rh-search-input')
    await input.setValue('张三')
    // 检查卡片列表而非概览（概览不受搜索影响）
    const grid = wrapper.find('.person-grid')
    expect(grid.text()).toContain('张三')
    expect(grid.text()).not.toContain('李四')
  })

  it('搜索过滤备注', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '大学同学', importantDates: [], tags: [] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '家人', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.rh-search-input')
    await input.setValue('大学')
    const grid = wrapper.find('.person-grid')
    expect(grid.text()).toContain('张三')
    expect(grid.text()).not.toContain('李四')
  })

  it('搜索过滤标签', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: ['同事', '项目组'] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [], tags: ['家人'] },
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.rh-search-input')
    await input.setValue('项目')
    const grid = wrapper.find('.person-grid')
    expect(grid.text()).toContain('张三')
    expect(grid.text()).not.toContain('李四')
  })

  // ---- 关系筛选 ----

  it('显示关系筛选按钮', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    const filters = wrapper.findAll('.rh-rel-filter')
    // 全部 + 6种关系类型 = 7
    expect(filters.length).toBe(7)
    expect(filters[0].text()).toBe('全部')
  })

  it('关系筛选只显示对应关系的人', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: [] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    const filters = wrapper.findAll('.rh-rel-filter')
    // 第2个按钮是"家人" (全部=0, 家人=1, 伴侣=2, 朋友=3...)
    const familyBtn = filters[1]
    await familyBtn.trigger('click')
    expect(familyBtn.classes()).toContain('active')
    const grid = wrapper.find('.person-grid')
    expect(grid.text()).toContain('李四')
    expect(grid.text()).not.toContain('张三')
  })

  // ---- 亲密度排序 ----

  it('排序选择器默认显示亲密度降序', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    const select = wrapper.find('.rh-sort-select')
    expect(select.exists()).toBe(true)
    expect((select.element as HTMLSelectElement).value).toBe('closeness-desc')
  })

  it('亲密度降序排列', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.3, notes: '', importantDates: [], tags: [] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [], tags: [] },
      { id: 'p3', name: '王五', relation: 'colleague', color: '#34d399', closeness: 0.6, notes: '', importantDates: [], tags: [] },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.person-card')
    // 默认降序: 李四(0.9) → 王五(0.6) → 张三(0.3)
    expect(cards[0].text()).toContain('李四')
    expect(cards[1].text()).toContain('王五')
    expect(cards[2].text()).toContain('张三')
  })

  // ============================================================
  // Tab 切换
  // ============================================================

  it('渲染3个选项卡', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].text()).toContain('关系网')
    expect(tabs[1].text()).toContain('家脉树')
    expect(tabs[2].text()).toContain('留座')
  })

  it('默认选中关系网选项卡', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    expect(tabs[0].classes()).toContain('active')
  })

  // ============================================================
  // 家脉树 Tab
  // ============================================================

  it('家脉树选项卡显示家人成员', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'family', color: '#4f8cff', closeness: 0.5, notes: '', importantDates: [] },
      { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [] },
      { id: 'p3', name: '王五', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    const familyBtn = wrapper.findAll('.rh-tab')[1]
    await familyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 仅检查家脉树SVG中的成员名称，而非全页文本（全页文本包含概览卡片）
    const memberNames = wrapper.findAll('.ft-member-name')
    expect(memberNames).toHaveLength(2)
    expect(memberNames[0].text()).toBe('张三')
    expect(memberNames[1].text()).toBe('李四')
  })

  it('家脉树无家人时显示空提示', async () => {
    mockPersons.value = [
      { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.5, notes: '', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    const familyBtn = wrapper.findAll('.rh-tab')[1]
    await familyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无家人记录')
  })

  it('家脉树显示成员首字', async () => {
    mockPersons.value = [
      { id: 'p1', name: '父亲', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [] },
      { id: 'p2', name: '母亲', relation: 'family', color: '#4f8cff', closeness: 0.85, notes: '', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    const familyBtn = wrapper.findAll('.rh-tab')[1]
    await familyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const initials = wrapper.findAll('.ft-member-initial')
    expect(initials).toHaveLength(2)
    expect(initials[0].text()).toBe('父')
    expect(initials[1].text()).toBe('母')
  })

  it('家脉树显示SVG根节点', async () => {
    mockPersons.value = [
      { id: 'p1', name: '父亲', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '', importantDates: [] },
    ]
    const wrapper = await getWrapper()
    const familyBtn = wrapper.findAll('.rh-tab')[1]
    await familyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ft-svg').exists()).toBe(true)
    expect(wrapper.find('.ft-root-circle').exists()).toBe(true)
    expect(wrapper.find('.ft-root-text').text()).toBe('你')
  })

  // ============================================================
  // 留座 Tab
  // ============================================================

  it('留座选项卡显示添加表单', async () => {
    const wrapper = await getWrapper()
    const memorialBtn = wrapper.findAll('.rh-tab')[2]
    await memorialBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('添加留座')
    expect(wrapper.find('.ms-form').exists()).toBe(true)
  })

  it('留座可以添加新纪念座位', async () => {
    mockGetKV.mockReturnValue([])
    const wrapper = await getWrapper()
    const memorialBtn = wrapper.findAll('.rh-tab')[2]
    await memorialBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 填写表单
    const nameInput = wrapper.find('.ms-input')
    await nameInput.setValue('怀念的人')

    // 点击提交
    const submitBtn = wrapper.find('.ms-submit')
    await submitBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证留座已添加
    expect(wrapper.text()).toContain('怀念的人')
    // setKV 应该被调用
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('留座添加后显示在列表中', async () => {
    mockGetKV.mockReturnValue([])
    const wrapper = await getWrapper()
    const memorialBtn = wrapper.findAll('.rh-tab')[2]
    await memorialBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const nameInput = wrapper.findAll('.ms-input')[0]
    const relInput = wrapper.findAll('.ms-input')[1]
    await nameInput.setValue('远方的朋友')
    await relInput.setValue('好友')

    const submitBtn = wrapper.find('.ms-submit')
    await submitBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 检查列表中显示
    const nameEl = wrapper.find('.ms-card-name')
    expect(nameEl.text()).toBe('远方的朋友')
    const relEl = wrapper.find('.ms-card-rel')
    expect(relEl.text()).toBe('好友')
  })

  it('留座选项卡显示原因标签', async () => {
    mockGetKV.mockReturnValue([])
    const wrapper = await getWrapper()
    const memorialBtn = wrapper.findAll('.rh-tab')[2]
    await memorialBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 默认选中"已故"
    const reasonBtns = wrapper.findAll('.ms-reason-btn')
    expect(reasonBtns).toHaveLength(3)
    expect(reasonBtns[0].classes()).toContain('active')
    expect(reasonBtns[0].text()).toContain('已故')

    // 切换原因
    await reasonBtns[1].trigger('click')
    expect(reasonBtns[1].classes()).toContain('active')
    expect(reasonBtns[0].classes()).not.toContain('active')
  })
})