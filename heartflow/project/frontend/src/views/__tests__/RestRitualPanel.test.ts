// ============================================================
// RestRitualPanel 视图测试 - 休息仪式面板
// ============================================================
import { ref, computed } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 rest/rest-rituals 模块 ----
const mockRituals = ref([
  { id: 'r1', name: '番茄休息', description: '工作间隙的快速恢复', category: 'work-break', totalDuration: 5, expectedRecovery: 50, tags: ['工作', '快速'], executionCount: 3, steps: [{ order: 1, action: '停下工作', description: '放下手头任务', durationMinutes: 1 }, { order: 2, action: '深呼吸', description: '3次深呼吸', durationMinutes: 2 }] },
  { id: 'r2', name: '午间冥想', description: '午后的深度放松', category: 'meditation', totalDuration: 15, expectedRecovery: 70, tags: ['冥想', '午后'], executionCount: 1, steps: [{ order: 1, action: '闭眼', description: '轻轻闭上眼睛', durationMinutes: 1 }] },
])

const mockActiveCategory = ref('work-break')
const mockPlantOverview = ref([{ id: 'p1', name: '休息花', emoji: '🌿', phase: 'seedling', growth: 30 }])

vi.mock('../../modules/rest/rest-rituals', () => {
  const RITUAL_CATEGORY_META: Record<string, any> = {
    'work-break': { icon: '⏸️', label: '工作间隙' },
    'meditation': { icon: '🧘', label: '冥想' },
    'breathing': { icon: '🌬️', label: '呼吸' },
    'evening': { icon: '🌙', label: '晚间' },
    'morning': { icon: '🌅', label: '晨间' },
    'afternoon': { icon: '☀️', label: '午后' },
    'weekend': { icon: '🌿', label: '周末' },
  }
  const GROWTH_PHASE_META: Record<string, any> = {
    seed: { label: '种子', color: '#90EE90' },
    seedling: { label: '幼苗', color: '#7CCD7C' },
  }
  const FATIGUE_LEVEL_META: Record<string, any> = {
    energetic: { label: '精力充沛', icon: '⚡' },
    normal: { label: '正常', icon: '😊' },
    tired: { label: '疲劳', icon: '😫' },
    exhausted: { label: '精疲力竭', icon: '😵' },
    burnout: { label: '燃尽', icon: '🔥' },
  }
  const PRESET_RITUALS = [] as any[]

  return {
    useRestRituals: () => ({
      getRitualsByCategory: (cat: string) => mockRituals.value.filter(r => r.category === cat),
      executeRitual: vi.fn(),
      loadRituals: vi.fn(),
    }),
    usePlantGrowth: () => ({
      plantOverview: computed(() => mockPlantOverview.value),
    }),
    useRestCalendar: () => ({
      generateCalendar: () => ({ year: 2026, month: 1, days: [] }),
    }),
    useRestPrescription: () => ({
      generatePrescription: () => ({ suggestedDuration: 15, suggestedFrequency: '按需休息', recommendedRituals: [], cautions: [] }),
    }),
    RITUAL_CATEGORY_META,
    GROWTH_PHASE_META,
    FATIGUE_LEVEL_META,
    PRESET_RITUALS,
  }
})

// ---- 模拟 rest/types ----
vi.mock('../../modules/rest/types', () => ({
  DEFAULT_PRACTICES: [],
}))

async function getWrapper() {
  const { default: RestRitualPanel } = await import('../RestRitualPanel.vue')
  return mount(RestRitualPanel, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('RestRitualPanel 休息仪式面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    mockActiveCategory.value = 'work-break'
  })

  it('渲染"休息仪式"标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('休息仪式')
  })

  it('渲染仪式分类按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('工作间隙')
    expect(wrapper.text()).toContain('冥想')
  })

  it('显示仪式列表', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('番茄休息')
  })

  it('切换分类后更新仪式列表', async () => {
    const wrapper = await getWrapper()
    // Click the meditation category button
    const meditationBtn = wrapper.findAll('.ritual-cat-btn').find(b => b.text().includes('冥想'))
    if (meditationBtn) {
      await meditationBtn.trigger('click')
      await wrapper.vm.$nextTick()
    }
    expect(wrapper.text()).toContain('午间冥想')
  })

  it('选择仪式后显示步骤', async () => {
    const wrapper = await getWrapper()
    // 点击仪式卡片
    const cards = wrapper.findAll('.ritual-card')
    expect(cards.length).toBeGreaterThan(0)
    await cards[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('开始执行')
  })

  it('显示植物花园区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('植被花园')
  })

  it('显示疲劳评估', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('疲劳评估')
  })
})