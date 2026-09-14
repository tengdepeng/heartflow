// ============================================================
// LifeEpochPanel 生命刻度面板测试（INCR-99）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockConfig = computed(() => ({
  birthDate: '2000-01-01',
  expectedLifespan: 80,
  milestones: [
    { name: '成年', year: 18 },
    { name: '而立之年', year: 30 },
  ],
}))

const mockOverview = ref({
  elapsed: { years: 26, months: 8, days: 2, hours: 3, minutes: 4, seconds: 5 },
  progress: 33,
  remaining: '53 年 3 个月 28 天',
  milestones: [
    { name: '成年', year: 18, date: '2018-01-01', passed: true },
    { name: '而立之年', year: 30, date: '2030-01-01', passed: false },
  ],
})

const mockSetBirthDate = vi.fn()
const mockSetExpectedLifespan = vi.fn()
const mockAddMilestone = vi.fn()
const mockRemoveMilestone = vi.fn()

vi.mock('../../modules/life-epoch/life-epoch', () => ({
  useLifeEpoch: () => ({
    config: mockConfig,
    overview: mockOverview,
    setBirthDate: mockSetBirthDate,
    setExpectedLifespan: mockSetExpectedLifespan,
    addMilestone: mockAddMilestone,
    removeMilestone: mockRemoveMilestone,
  }),
}))

async function getWrapper() {
  const { default: LifeEpochPanel } = await import('../LifeEpochPanel.vue')
  return mount(LifeEpochPanel, {
    global: { stubs: { Teleport: true, Transition: true } },
  })
}

describe('LifeEpochPanel 生命刻度', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOverview.value = {
      elapsed: { years: 26, months: 8, days: 2, hours: 3, minutes: 4, seconds: 5 },
      progress: 33,
      remaining: '53 年 3 个月 28 天',
      milestones: [
        { name: '成年', year: 18, date: '2018-01-01', passed: true },
        { name: '而立之年', year: 30, date: '2030-01-01', passed: false },
      ],
    }
  })

  it('标题徽标与副题渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.lep').exists()).toBe(true)
    expect(wrapper.text()).toContain('生命刻度')
    expect(wrapper.text()).toContain('生之时 · 死之时 · 里程碑')
  })

  it('生之时：渲染六级粒度', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('生之时 · 已流逝')
    expect(wrapper.findAll('.lep-elapsed-item').length).toBe(6)
    expect(wrapper.text()).toContain('26')
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('5')
  })

  it('生命进度：渲染进度条与百分比', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.lep-progress-bar').exists()).toBe(true)
    expect(wrapper.find('.lep-progress-fill').attributes('style')).toContain('33%')
    expect(wrapper.text()).toContain('33%')
  })

  it('剩余时间渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('剩余：53 年 3 个月 28 天')
  })

  it('里程碑：渲染列表与已过/未至状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.lep-milestone').length).toBe(2)
    expect(wrapper.text()).toContain('成年')
    expect(wrapper.text()).toContain('已过')
    expect(wrapper.text()).toContain('而立之年')
    expect(wrapper.text()).toContain('未至')
    expect(wrapper.find('.lep-milestone.passed').exists()).toBe(true)
  })

  it('里程碑：空态', async () => {
    mockOverview.value = {
      ...mockOverview.value,
      milestones: [],
    }
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.text()).toContain('暂无里程碑')
  })

  it('配置：出生日期修改调用 setBirthDate', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('input[type="date"]')
    await input.setValue('1995-06-15')
    expect(mockSetBirthDate).toHaveBeenCalledWith('1995-06-15')
  })

  it('配置：期望寿命修改调用 setExpectedLifespan', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('input[type="number"]')
    await input.setValue('90')
    expect(mockSetExpectedLifespan).toHaveBeenCalledWith(90)
  })

  it('配置：添加里程碑调用 addMilestone', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('input.lep-input')
    await inputs[0].setValue('不惑之年')
    await inputs[1].setValue('40')
    await wrapper.find('form.lep-add').trigger('submit')
    expect(mockAddMilestone).toHaveBeenCalledWith('不惑之年', 40)
  })

  it('配置：空名称不触发添加', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('form.lep-add').trigger('submit')
    expect(mockAddMilestone).not.toHaveBeenCalled()
  })

  it('配置：删除里程碑调用 removeMilestone', async () => {
    const wrapper = await getWrapper()
    const buttons = wrapper.findAll('button.lep-btn--small')
    expect(buttons.length).toBe(2)
    await buttons[0].trigger('click')
    expect(mockRemoveMilestone).toHaveBeenCalledWith('成年')
  })
})
