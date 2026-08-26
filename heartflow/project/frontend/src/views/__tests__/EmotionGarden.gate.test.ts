// ============================================================
// EmotionGarden · emotion:visualization 宪法门控（A2.3 批3）
// 锁定：条款关闭（默认禁用态）时不渲染情绪可视化（趋势图 / 日历）；
//       条款活跃时渲染日历（趋势图另受数据量 v-if 约束）。
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
const hoisted = vi.hoisted(() => ({ vizActive: { value: false } }))

vi.mock('../../engine/storage', () => ({
  storage: {
    getEmotions: () => [],
    setEmotions: vi.fn(),
    getSessions: () => [],
    getAnchors: () => [],
    getNotes: () => [],
    getPluginRegistry: () => ({}),
    getConstitution: () => null,
    getCrystals: () => [],
    getCarriers: () => [],
    getAdvisors: () => [],
    setAdvisors: vi.fn(),
    getAdvisorMessages: () => [],
    setAdvisorMessages: vi.fn(),
    getConfig: () => ({ advisor: { affinityIncrements: {}, messageStorageLimit: 100, dingyinThresholds: {}, witnessLogMax: 100, witnessLogDefaultLimit: 10, affinityMax: 100, bubbleDuration: 5000, advisorResetDate: '' } }),
    setConfig: vi.fn(),
    getKV: () => ({}),
    setKV: vi.fn(),
  },
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/emotion-garden' }),
  RouterLink: { template: '<a><slot/></a>' },
}))
vi.mock('../../modules/constitution/use-effect', () => ({
  useEffect: () => ({ active: hoisted.vizActive }),
}))

describe('EmotionGarden · emotion:visualization 宪法门控', () => {
  it('条款关闭时不渲染趋势图与日历', async () => {
    hoisted.vizActive.value = false
    setActivePinia(createPinia())
    const { default: EmotionGarden } = await import('../EmotionGarden.vue')
    const wrapper = mount(EmotionGarden, { global: { plugins: [createPinia()] } })
    expect(wrapper.find('.trend-section').exists()).toBe(false)
    expect(wrapper.find('.calendar-section').exists()).toBe(false)
  })

  it('条款活跃时渲染日历（趋势图另受数据量约束，此处仅锁定日历门控）', async () => {
    hoisted.vizActive.value = true
    setActivePinia(createPinia())
    const { default: EmotionGarden } = await import('../EmotionGarden.vue')
    const wrapper = mount(EmotionGarden, { global: { plugins: [createPinia()] } })
    expect(wrapper.find('.calendar-section').exists()).toBe(true)
  })
})
