// ============================================================
// StatsPanel 宪法门控测试（A2.3 批3 · stats:show-panel）
// 锁定：宪法「统计面板显示」条款关闭时，面板整体不渲染。
// 开启态（默认）由 StatsPanel.test.ts 经真实引擎默认生效覆盖。
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockGetSessions = vi.fn()
const mockGetCrystals = vi.fn()

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => mockGetSessions(...args),
    getCrystals: (...args: any[]) => mockGetCrystals(...args),
  },
}))

const mockConfigState = ref({ stats: { dailyGoal: 30, showTrendChart: true, showPanel: true, weeklyGoal: 120 } })
const mockStore = { config: mockConfigState }

vi.mock('../../stores/config', () => ({
  useConfigStore: () => mockStore,
}))

// 宪法条款关闭 → useEffect 返回 active=false
vi.mock('../../modules/constitution/use-effect', () => ({
  useEffect: () => ({ active: ref(false) }),
}))

async function getWrapper() {
  const { default: StatsPanel } = await import('../StatsPanel.vue')
  return mount(StatsPanel, {
    global: { stubs: { HeatmapGrid: true } },
  })
}

describe('StatsPanel 宪法门控（stats:show-panel 关闭）', () => {
  it('条款关闭时不渲染面板根节点（整体不消费 stats 数据）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.stats-panel').exists()).toBe(false)
  })
})
