import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Anniversary, InteractionEntry, RelationshipHealth } from '../../modules/relation/interaction-journal'
import type { Person } from '../../modules/relation/types'

// ---- 引擎 mock（保留真实 ANNIVERSARY_TYPE_META / HEALTH_LEVEL_META） ----
const anniversaries: Ref<Anniversary[]> = ref([])
const interactions: Ref<InteractionEntry[]> = ref([])

const loadAnniversaries = vi.fn(() => anniversaries.value)
const createAnniversary = vi.fn(
  (personId: string, title: string, date: string, type: Anniversary['type'], recurring = true, reminderDays = 3, note?: string) => {
    const a: Anniversary = {
      id: `ann-${anniversaries.value.length + 1}`,
      personId,
      title,
      date,
      type,
      recurring,
      reminderDays,
      note,
      createdAt: '2026-09-01T00:00:00.000Z',
    }
    anniversaries.value = [...anniversaries.value, a]
    return a
  },
)
const getUpcomingAnniversaries = vi.fn<() => Anniversary[]>(() => [])
const getReminderAnniversaries = vi.fn<() => Anniversary[]>(() => [])
const daysUntilAnniversary = vi.fn<(id: string) => number>(() => 5)
const removeAnniversary = vi.fn((id: string) => {
  anniversaries.value = anniversaries.value.filter((a) => a.id !== id)
  return true
})

const computeAllHealth = vi.fn((persons: Person[]) =>
  persons.map((p, i) => ({
    personId: p.id,
    personName: p.name,
    score: 85 - i * 20,
    level: (i === 0 ? 'thriving' : 'healthy') as RelationshipHealth['level'],
    lastInteraction: null,
    interactionCount: 3,
    interactionFrequency: 2,
    anniversaryCount: 1,
    upcomingAnniversaries: [],
    suggestions: ['建议一', '建议二'],
  })),
)

vi.mock('../../modules/relation/interaction-journal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/relation/interaction-journal')>()
  return {
    ...actual,
    useInteractionJournal: () => ({
      interactions,
      loadInteractions: vi.fn(),
    }),
    useAnniversaries: () => ({
      anniversaries,
      loadAnniversaries,
      createAnniversary,
      getUpcomingAnniversaries,
      getReminderAnniversaries,
      daysUntilAnniversary,
      removeAnniversary,
    }),
    useRelationshipHealth: () => ({
      computeAllHealth,
      computeHealth: vi.fn(),
      computeInteractionStats: vi.fn(),
    }),
  }
})

import AnniversaryHealthPanel from '../AnniversaryHealthPanel.vue'

function makePerson(id: string, name: string, closeness = 0.5): Person {
  return {
    id,
    name,
    relation: 'friend',
    tags: [],
    notes: '',
    closeness,
    color: '#7c5cfc',
    lastContact: null,
    importantDates: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeAnn(id: string, type: Anniversary['type'], title: string, date = '2026-10-01', recurring = true, reminderDays = 3): Anniversary {
  return {
    id,
    personId: 'p1',
    title,
    date,
    type,
    recurring,
    reminderDays,
    createdAt: '2026-09-01T00:00:00.000Z',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  anniversaries.value = []
  interactions.value = []
  getUpcomingAnniversaries.mockReturnValue([])
  getReminderAnniversaries.mockReturnValue([])
  daysUntilAnniversary.mockReturnValue(5)
})

describe('AnniversaryHealthPanel · 纪念日与羁绊健康接线', () => {
  it('空态渲染标题、副题、统计 0 与空态提示', async () => {
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ahp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('纪念日与羁绊健康')
    expect(wrapper.text()).toContain('纪念日 · 提醒 · 关系健康')
    expect(wrapper.text()).toContain('纪念日统计')
    expect(wrapper.text()).toContain('添加纪念日')
    expect(wrapper.text()).toContain('纪念日列表')
    expect(wrapper.text()).toContain('关系健康')
    expect(wrapper.text()).toContain('暂无纪念日，在下方添加第一个纪念日。')
    expect(wrapper.text()).toContain('还没有人物数据，添加羁绊后查看关系健康。')
    expect(loadAnniversaries).toHaveBeenCalled()
  })

  it('纪念日统计渲染总数、即将到来、需提醒与覆盖人物', async () => {
    anniversaries.value = [
      makeAnn('a1', 'birthday', '生日'),
      makeAnn('a2', 'meet', '相识', '2026-11-01', false),
      makeAnn('a3', 'custom', '纪念日三'),
    ]
    getUpcomingAnniversaries.mockReturnValue([makeAnn('u1', 'wedding', '结婚纪念')])
    getReminderAnniversaries.mockReturnValue([makeAnn('r1', 'farewell', '告别日')])
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    await wrapper.vm.$nextTick()
    const cells = wrapper.findAll('.ahp-cell')
    expect(cells[0].text()).toContain('3')
    expect(cells[0].text()).toContain('总纪念日')
    expect(cells[1].text()).toContain('1')
    expect(cells[1].text()).toContain('即将到来')
    expect(cells[2].text()).toContain('1')
    expect(cells[2].text()).toContain('需提醒')
    expect(cells[3].text()).toContain('1')
    expect(cells[3].text()).toContain('覆盖人物')
  })

  it('添加纪念日选人物、填标题日期、选类型后调用 createAnniversary', async () => {
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    await wrapper.find('.ahp-select').setValue('p1')
    await wrapper.find('.ahp-input[aria-label="纪念日名称"]').setValue('相识纪念日')
    await wrapper.find('.ahp-input[aria-label="纪念日日期"]').setValue('2026-10-01')
    const typeBtns = wrapper.findAll('.ahp-type-btn')
    await typeBtns[1].trigger('click')
    await wrapper.find('.ahp-save').trigger('click')
    expect(createAnniversary).toHaveBeenCalledWith('p1', '相识纪念日', '2026-10-01', 'meet', true, 3, undefined)
    expect(wrapper.text()).toContain('相识纪念日')
  })

  it('未选人物或标题或日期时保存按钮禁用', async () => {
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    const save = wrapper.find('.ahp-save')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('.ahp-input[aria-label="纪念日名称"]').setValue('只有标题')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('.ahp-select').setValue('p1')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('.ahp-input[aria-label="纪念日日期"]').setValue('2026-10-01')
    expect(save.attributes('disabled')).toBeUndefined()
  })

  it('纪念日列表渲染类型图标、标题、人物名、日期与每年徽标', async () => {
    anniversaries.value = [
      makeAnn('a1', 'birthday', '生日', '2026-01-01', true),
      makeAnn('a2', 'meet', '相识', '2026-02-02', false),
    ]
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('🎂')
    expect(wrapper.text()).toContain('生日')
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('2026-01-01')
    expect(wrapper.text()).toContain('每年')
    expect(wrapper.text()).toContain('相识')
  })

  it('删除纪念日调用 removeAnniversary', async () => {
    anniversaries.value = [makeAnn('a1', 'birthday', '生日')]
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    await wrapper.vm.$nextTick()
    await wrapper.find('.ahp-ann-del').trigger('click')
    expect(removeAnniversary).toHaveBeenCalledWith('a1')
  })

  it('即将到来渲染剩余天数标签', async () => {
    anniversaries.value = [makeAnn('u1', 'wedding', '结婚纪念')]
    getUpcomingAnniversaries.mockReturnValue(anniversaries.value)
    daysUntilAnniversary.mockReturnValue(0)
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('即将到来')
    expect(wrapper.text()).toContain('结婚纪念')
    expect(wrapper.text()).toContain('今天')
  })

  it('需提醒渲染提前提醒天数', async () => {
    getReminderAnniversaries.mockReturnValue([makeAnn('r1', 'meet', '相识', '2026-10-05', true, 7)])
    const wrapper = mount(AnniversaryHealthPanel, { props: { persons: [makePerson('p1', '张三')] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('需提醒')
    expect(wrapper.text()).toContain('相识')
    expect(wrapper.text()).toContain('提前 7 天')
  })

  it('关系健康渲染姓名、分数、等级徽标、互动次数与建议', async () => {
    const wrapper = mount(AnniversaryHealthPanel, {
      props: { persons: [makePerson('p1', '张三'), makePerson('p2', '李四')] },
    })
    await wrapper.vm.$nextTick()
    expect(computeAllHealth).toHaveBeenCalled()
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('85')
    expect(wrapper.text()).toContain('蓬勃')
    expect(wrapper.text()).toContain('李四')
    expect(wrapper.text()).toContain('65')
    expect(wrapper.text()).toContain('健康')
    expect(wrapper.text()).toContain('互动 3 次')
    expect(wrapper.text()).toContain('频率 2')
    expect(wrapper.text()).toContain('纪念日 1')
    expect(wrapper.text()).toContain('建议一')
  })
})
