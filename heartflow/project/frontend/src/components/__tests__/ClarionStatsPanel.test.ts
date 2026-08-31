// ============================================================
// 澄明统计面板测试（INCR-46）
// 覆盖空态（数据未显影）与填充态（冥想/释怀/趋势/最佳时段）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'

const mock = vi.hoisted(() => {
  const state = {
    meditations: [] as any[],
    releases: [] as any[],
    lightState: {
      clarity: 'clouded' as string,
      totalMeditationMinutes: 0,
      releaseCount: 0,
      meditationStreak: 0,
      lightIntensity: 0,
    },
  }
  return { state }
})

vi.mock('../../modules/light/pavilion', () => ({
  useLightPavilion: () => ({
    meditations: computed(() => mock.state.meditations),
    releases: computed(() => mock.state.releases),
    lightState: computed(() => mock.state.lightState),
  }),
}))

vi.mock('../../modules/light/guided-meditation', () => ({
  useClarityDashboard: () => ({
    computeClarityStats: (meditations: any[], releases: any[], lightState: any) => computeStats(meditations, releases, lightState),
  }),
}))

vi.mock('../../modules/light/types', () => ({
  MEDITATION_TYPE_META: {
    breath: { label: '呼吸冥想', icon: '🌬️', description: '' },
    body_scan: { label: '身体扫描', icon: '🧘', description: '' },
    loving_kindness: { label: '慈心冥想', icon: '💗', description: '' },
    silent: { label: '静坐冥想', icon: '🧎', description: '' },
    mantra: { label: '持咒冥想', icon: '🔔', description: '' },
  },
  CLARITY_LEVEL_META: {
    clouded: { label: '阴翳', icon: '🌫️', color: '#95a5a6' },
    unclear: { label: '微朦', icon: '🌥️', color: '#bdc3c7' },
    neutral: { label: '平和', icon: '🌤️', color: '#3498db' },
    clear: { label: '晴朗', icon: '☀️', color: '#f1c40f' },
    crystal: { label: '澄澈', icon: '💎', color: '#e8f4fd' },
  },
}))

function computeStats(meditations: any[], releases: any[], lightState: any) {
  const totalMeditations = meditations.length
  const totalMeditationMinutes = meditations.reduce((s: number, m: any) => s + m.duration, 0)
  const releaseCompletionRate = releases.length > 0
    ? Math.round((releases.filter(r => r.released).length / releases.length) * 100)
    : 0
  const typeDist: Record<string, { count: number; minutes: number }> = {}
  for (const m of meditations) {
    if (!typeDist[m.type]) typeDist[m.type] = { count: 0, minutes: 0 }
    typeDist[m.type].count++
    typeDist[m.type].minutes += m.duration
  }
  return {
    currentClarity: lightState.clarity,
    clarityTrend: trend('clarity'),
    totalMeditationMinutes,
    totalMeditations,
    monthlyMeditations: meditations.length,
    streak: lightState.meditationStreak,
    bestStreak: lightState.meditationStreak,
    releaseCompletionRate,
    meditationTypeDistribution: Object.entries(typeDist).map(([type, data]) => ({ type, ...data })),
    lightIntensityTrend: trend('light'),
    bestTimeOfDay: '清晨',
    recommendedType: 'breath',
  }
}

function trend(kind: 'clarity' | 'light') {
  return Array.from({ length: 30 }, (_, i) => ({
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
    ...(kind === 'clarity' ? { level: 'clear', score: 60 } : { intensity: 50 }),
  }))
}

function meditation(overrides: Record<string, any> = {}) {
  return {
    id: `m_${Math.random().toString(36).slice(2, 8)}`,
    type: 'breath',
    duration: 10,
    stateBefore: 'normal',
    stateAfter: 'calm',
    insight: '宁静',
    date: '2026-08-01',
    timestamp: '2026-08-01T08:00:00.000Z',
    ...overrides,
  }
}

function release(overrides: Record<string, any> = {}) {
  return {
    id: `r_${Math.random().toString(36).slice(2, 8)}`,
    content: '放下某件事',
    method: 'burn',
    released: true,
    date: '2026-08-01',
    ...overrides,
  }
}

async function mountPanel() {
  const { default: ClarionStatsPanel } = await import('../ClarionStatsPanel.vue')
  const wrapper = mount(ClarionStatsPanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.meditations = []
  mock.state.releases = []
  mock.state.lightState = {
    clarity: 'clouded',
    totalMeditationMinutes: 0,
    releaseCount: 0,
    meditationStreak: 0,
    lightIntensity: 0,
  }
})

describe('ClarionStatsPanel 空态', () => {
  it('无冥想也无释怀时显示「数据未显影」', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.cstp-panel').exists()).toBe(true)
    expect(wrapper.find('.cstp-badge-neutral').text()).toBe('数据未显影')
    expect(wrapper.text()).toContain('还没有可供统计的澄明记录')
    expect(wrapper.find('.cstp-block').exists()).toBe(false)
  })
})

describe('ClarionStatsPanel 填充态', () => {
  beforeEach(() => {
    mock.state.meditations = [
      meditation({ type: 'breath', duration: 10 }),
      meditation({ type: 'breath', duration: 15, timestamp: '2026-08-02T08:00:00.000Z' }),
      meditation({ type: 'silent', duration: 20, timestamp: '2026-08-03T20:00:00.000Z' }),
    ]
    mock.state.releases = [
      release({ released: true }),
      release({ released: false }),
    ]
    mock.state.lightState = {
      clarity: 'clear',
      totalMeditationMinutes: 45,
      releaseCount: 2,
      meditationStreak: 3,
      lightIntensity: 60,
    }
  })

  it('渲染标题与澄明徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.cstp-title').text()).toBe('✨ 澄明统计')
    expect(wrapper.find('.cstp-badge').exists()).toBe(true)
  })

  it('渲染澄明状态区块', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('澄明状态')
    expect(wrapper.text()).toContain('晴朗')
  })

  it('渲染冥想统计四格', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('总时长')
    expect(wrapper.text()).toContain('本月')
    expect(wrapper.text()).toContain('连续')
    expect(wrapper.text()).toContain('3')
  })

  it('渲染释怀统计与完成率', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('释怀统计')
    expect(wrapper.text()).toContain('释怀完成率')
    expect(wrapper.text()).toContain('50')
  })

  it('渲染冥想类型分布', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('冥想类型分布')
    expect(wrapper.text()).toContain('呼吸冥想')
    expect(wrapper.text()).toContain('静坐冥想')
  })

  it('渲染澄明趋势柱状图', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('澄明趋势')
    // 澄明趋势 + 光照强度各 30 根 → 共 60 根柱
    const cols = wrapper.findAll('.cstp-trend-col')
    expect(cols.length).toBe(60)
  })

  it('渲染光照强度趋势', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('光照强度')
    expect(wrapper.findAll('.cstp-trend-fill--light').length).toBe(30)
  })

  it('渲染最佳冥想时段与推荐类型', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('最佳冥想时段')
    expect(wrapper.text()).toContain('清晨')
    expect(wrapper.text()).toContain('推荐冥想类型')
    expect(wrapper.text()).toContain('呼吸冥想')
  })

  it('渲染温和洞察', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.cstp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('澄明状态')
    expect(wrapper.text()).toContain('冥想概览')
  })
})