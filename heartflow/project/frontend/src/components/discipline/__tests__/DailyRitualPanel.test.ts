// ============================================================
// DailyRitualPanel 组件测试 - 每日仪式（INCR-441）
// 真实挂载组件，桥接层 mock 为可控状态
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { DailyRitual } from '../../../modules/discipline/types'
import type { RitualTemplate } from '../../../modules/discipline/preset-library'

const mockRituals = ref<DailyRitual[]>([])
const mockCreateRitual = vi.fn()
const mockCompleteRitual = vi.fn()

const TEMPLATES: RitualTemplate[] = [
  { title: '晨间启动仪式', description: '用 15 分钟开启高效的一天', icon: '🌅', steps: ['喝一杯温水', '做 5 分钟拉伸'], estimatedDuration: 15, triggerTime: 'morning' },
  { title: '午间充电', description: '用 10 分钟恢复精力', icon: '☀️', steps: ['离开座位走动 5 分钟'], estimatedDuration: 10, triggerTime: 'afternoon' },
  { title: '晚间放松仪式', description: '用 20 分钟优雅结束一天', icon: '🌙', steps: ['写下感恩的事'], estimatedDuration: 20, triggerTime: 'evening' },
  { title: '周末回顾', description: '用 30 分钟回顾一周', icon: '📊', steps: ['回顾本周'], estimatedDuration: 30, triggerTime: 'anytime' },
  { title: '深度专注仪式', description: '进入深度工作前的准备', icon: '🎯', steps: ['清理桌面'], estimatedDuration: 5, triggerTime: 'anytime' },
]

// 相对本测试文件解析到 src/modules/discipline/workshop-bridge（与组件内 import 同一目标模块）
vi.mock('../../../modules/discipline/workshop-bridge', () => ({
  useDisciplineBridge: () => ({
    rituals: mockRituals,
    RITUAL_TEMPLATES: TEMPLATES,
    createRitualFromTemplate: mockCreateRitual,
    completeRitual: mockCompleteRitual,
  }),
}))

const today = new Date().toISOString().split('T')[0]

async function getWrapper() {
  const { default: DailyRitualPanel } = await import('../DailyRitualPanel.vue')
  return mount(DailyRitualPanel, {
    global: { stubs: { Teleport: true, Transition: true } },
  })
}

describe('DailyRitualPanel 每日仪式面板', () => {
  beforeEach(() => {
    mockRituals.value = []
    mockCreateRitual.mockClear()
    mockCompleteRitual.mockClear()
  })

  it('渲染 4 个时段分组（晨/午/晚/随时）', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('晨间')
    expect(text).toContain('午间')
    expect(text).toContain('晚间')
    expect(text).toContain('随时')
    // 「我的每日仪式」+「仪式模板库」各 4 组 = 8 个 .drp-time-group
    expect(wrapper.findAll('.drp-time-group')).toHaveLength(8)
  })

  it('模板库渲染全部 5 个预设模板', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    TEMPLATES.forEach(t => expect(text).toContain(t.title))
    expect(wrapper.findAll('.drp-tpl-card')).toHaveLength(5)
  })

  it('点击模板「添加」调用 createRitualFromTemplate 并传出该模板', async () => {
    const wrapper = await getWrapper()
    await wrapper.findAll('.drp-add-btn')[0].trigger('click')
    expect(mockCreateRitual).toHaveBeenCalledTimes(1)
    expect(mockCreateRitual.mock.calls[0][0].title).toBe('晨间启动仪式')
  })

  it('我的仪式按 triggerTime 分组渲染，点击「完成一次」调用 completeRitual(id)', async () => {
    mockRituals.value = [{
      id: 'r1', title: '晨间启动仪式', description: 'd', icon: '🌅',
      steps: ['a', 'b'], estimatedDuration: 15, triggerTime: 'morning',
      enabled: true, completionCount: 2, lastCompleted: '2026-01-01',
    }]
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.drp-ritual-card')).toHaveLength(1)
    await wrapper.find('.drp-done-btn').trigger('click')
    expect(mockCompleteRitual).toHaveBeenCalledWith('r1')
  })

  it('今日已完成的仪式按钮禁用并标记「今日已完成」', async () => {
    mockRituals.value = [{
      id: 'r2', title: '深度专注仪式', description: 'd', icon: '🎯',
      steps: ['x'], estimatedDuration: 5, triggerTime: 'anytime',
      enabled: true, completionCount: 5, lastCompleted: today,
    }]
    const wrapper = await getWrapper()
    const btn = wrapper.find('.drp-done-btn')
    expect(btn.text()).toContain('今日已完成')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.find('.drp-done-badge').exists()).toBe(true)
  })

  it('「今日已点亮」计数反映当日完成数', async () => {
    mockRituals.value = [
      { id: 'r1', title: '晨间启动仪式', description: 'd', icon: '🌅', steps: ['a'], estimatedDuration: 15, triggerTime: 'morning', enabled: true, completionCount: 2, lastCompleted: today },
      { id: 'r3', title: '晚间放松仪式', description: 'd', icon: '🌙', steps: ['b'], estimatedDuration: 20, triggerTime: 'evening', enabled: true, completionCount: 1, lastCompleted: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日已点亮 1 个')
    expect(wrapper.findAll('.drp-ritual-card').length).toBe(2)
  })
})
