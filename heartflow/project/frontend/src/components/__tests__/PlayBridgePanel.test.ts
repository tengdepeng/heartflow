// ============================================================
// PlayBridgePanel 逸趣桥组件测试（INCR-375）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: { getKV: (...args: any[]) => (mockGetKV as any)(...args), setKV: (...args: any[]) => (mockSetKV as any)(...args) },
}))

function seedData(overrides: Record<string, any[]> = {}) {
  mockStore['hf:play_v2'] = { games: [], toys: [], models: [], others: [], ...overrides }
}

async function mountPanel() {
  const { default: PlayBridgePanel } = await import('../PlayBridgePanel.vue')
  return mount(PlayBridgePanel)
}

describe('PlayBridgePanel 逸趣桥（INCR-375）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    seedData()
  })

  it('空态：标题与摘要渲染，热度/偏好/种子区块不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="play-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('逸趣桥 · 此刻')
    expect(wrapper.find('[data-test="pbp-count-badge"]').text()).toBe('0 件收藏')
    // 游玩摘要全 0
    expect(wrapper.find('[data-test="pbp-total-items"]').text()).toBe('0')
    expect(wrapper.text()).toContain('总时长')
    // 空态守卫：热度/偏好/种子均不渲染
    expect(wrapper.find('[data-test="pbp-heatmap"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pbp-profile"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pbp-seeds"]').exists()).toBe(false)
    // 里程碑卡渲染但已解锁 0；ROI 卡渲染（分布恒定）且给出时间建议
    expect(wrapper.find('[data-test="pbp-milestones"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pbp-milestone-unlocked"]').text()).toBe('0')
    expect(wrapper.find('[data-test="pbp-roi"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('游戏时间较少')
  })

  it('有收藏时游玩摘要更新（总数/时长/平均/游戏数）', async () => {
    seedData({
      games: [
        { id: 'g1', name: '游戏A', platform: 'PC', hours: 120, at: '2026-06-15T00:00:00.000Z' },
        { id: 'g2', name: '游戏B', platform: 'Switch', hours: 30, at: '2026-06-15T00:00:00.000Z' },
      ],
    })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="pbp-count-badge"]').text()).toBe('2 件收藏')
    expect(wrapper.find('[data-test="pbp-total-items"]').text()).toBe('2')
    expect(wrapper.text()).toContain('150')
    expect(wrapper.text()).toContain('75')
  })

  it('时长达标解锁里程碑并渲染已解锁 chip', async () => {
    seedData({
      games: [
        { id: 'g1', name: '超长游戏', platform: 'PC', hours: 120, at: '2026-06-15T00:00:00.000Z' },
      ],
    })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="pbp-milestone-unlocked"]').text()).toBe('3')
    // 120h → ms_hours_10/50/100 解锁，ms_hours_500 未达
    expect(wrapper.find('[data-test="pbp-milestone-ms_hours_100"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pbp-milestone-ms_hours_500"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('资深玩家')
  })

  it('时间投资回报分布与建议渲染', async () => {
    seedData({
      games: [
        { id: 'g1', name: '深度游戏', platform: 'PC', hours: 120, at: '2026-06-15T00:00:00.000Z' },
      ],
    })
    const wrapper = await mountPanel()
    const roi = wrapper.find('[data-test="pbp-roi"]')
    expect(roi.exists()).toBe(true)
    expect(roi.text()).toContain('硬核')
    expect(roi.text()).toContain('深度投入')
  })

  it('收藏热度按年渲染并给出偏好画像', async () => {
    seedData({
      games: [
        { id: 'g1', name: '游戏A', platform: 'PC', hours: 120, at: '2025-06-15T00:00:00.000Z' },
        { id: 'g2', name: '游戏B', platform: 'Switch', hours: 30, at: '2026-06-15T00:00:00.000Z' },
      ],
    })
    const wrapper = await mountPanel()
    const heat = wrapper.find('[data-test="pbp-heatmap"]')
    expect(heat.exists()).toBe(true)
    expect(heat.text()).toContain('2025')
    expect(heat.text()).toContain('2026')
    expect(heat.text()).toContain('高峰')
    const profile = wrapper.find('[data-test="pbp-profile"]')
    expect(profile.exists()).toBe(true)
    expect(profile.text()).toContain('PC')
    expect(profile.text()).toContain('Switch')
    expect(profile.text()).toContain('80%')
    expect(profile.text()).toContain('20%')
    expect(profile.text()).toContain('资深玩家')
  })

  it('种子概览汇总收藏生成的种子（总数/LOD/稀有度标签）', async () => {
    seedData({
      games: [
        { id: 'g1', name: '游戏A', platform: 'PC', hours: 120, at: '2026-06-15T00:00:00.000Z' },
        { id: 'g2', name: '游戏B', platform: 'PC', hours: 30, at: '2026-06-15T00:00:00.000Z' },
      ],
    })
    const wrapper = await mountPanel()
    const seeds = wrapper.find('[data-test="pbp-seeds"]')
    expect(seeds.exists()).toBe(true)
    expect(wrapper.find('[data-test="pbp-seed-total"]').text()).toBe('2')
    expect(seeds.text()).toContain('high')
    expect(seeds.text()).toContain('传说')
    expect(seeds.text()).toContain('稀有')
  })

  it('收藏活跃度下降时给出高优先级建议', async () => {
    seedData({
      games: [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `g${i}`,
          name: `旧游戏${i}`,
          platform: 'PC',
          hours: 10,
          at: '2025-06-15T00:00:00.000Z',
        })),
        { id: 'g5', name: '新游戏', platform: 'PC', hours: 10, at: '2026-06-15T00:00:00.000Z' },
      ],
    })
    const wrapper = await mountPanel()
    const recs = wrapper.find('[data-test="pbp-recommendations"]')
    expect(recs.exists()).toBe(true)
    expect(recs.text()).toContain('收藏活跃度')
    expect(recs.text()).toContain('优先')
  })
})
