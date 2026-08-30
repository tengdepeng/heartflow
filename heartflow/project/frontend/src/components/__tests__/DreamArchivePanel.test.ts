// ============================================================
// DreamArchivePanel 测试 - 梦境档案（INCR-11）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Dream } from '../../stores/dreamNook'

type DreamMood = Dream['mood']

/** 距当前时刻 n 天的 ISO 串 */
function daysAgo(n: number, hour = 8): string {
  const d = new Date(Date.now() - n * 86400000)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/** 本地时区某时刻的 ISO 串，避免测试随 TZ 漂移 */
function atLocal(y: number, m: number, d: number, hour: number): string {
  return new Date(y, m - 1, d, hour).toISOString()
}

function dream(overrides: Record<string, any> = {}): Dream {
  return {
    id: `d${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    content: '一段梦境',
    mood: (overrides.mood ?? 'neutral') as DreamMood,
    tags: [] as string[],
    at: '2026-08-27T08:00:00.000Z',
    archived: false,
    ...overrides,
  } as Dream
}

describe('dream-analytics · 梦境档案引擎', () => {
  const NOW = new Date(2026, 7, 27, 12, 0, 0)
  const dreams = [
    dream({ content: '飞向云端', mood: 'happy', tags: ['水', '飞'], at: atLocal(2026, 8, 27, 3) }),
    dream({ content: '被追逐坠落', mood: 'fear', tags: ['水'], at: atLocal(2026, 8, 26, 22) }),
    dream({ content: '在天空飘', mood: 'curious', tags: ['飞'], at: atLocal(2026, 8, 25, 23), archived: true }),
    dream({ content: '梦回老屋', mood: 'sad', tags: ['家'], at: atLocal(2026, 8, 1, 10) }),
  ]

  it('概览统计总数/本月/近7天/连续夜', async () => {
    const { dreamOverview } = await import('../../modules/dream/dream-analytics')
    const ov = dreamOverview(dreams, NOW)
    expect(ov.total).toBe(4)
    expect(ov.active).toBe(3)
    expect(ov.archived).toBe(1)
    expect(ov.thisMonth).toBe(4)
    expect(ov.thisWeek).toBe(3)
    expect(ov.activeDays).toBe(4)
    expect(ov.consecutiveDays).toBe(3)
    expect(ov.peakHour).toBe(3)
    expect(ov.avgWords).toBeGreaterThan(0)
  })

  it('情绪分布按固定顺序给出占比', async () => {
    const { moodDistribution } = await import('../../modules/dream/dream-analytics')
    const dist = moodDistribution(dreams)
    expect(dist.length).toBe(4)
    expect(dist[0].mood).toBe('happy')
    expect(dist[0].pct).toBe(25)
    expect(dist.some(e => e.emoji === '😨')).toBe(true)
  })

  it('主导情绪返回计数最高者', async () => {
    const { dominantMood } = await import('../../modules/dream/dream-analytics')
    const withTwoHappy = [...dreams, dream({ mood: 'happy' })]
    const dom = dominantMood(withTwoHappy)
    expect(dom?.mood).toBe('happy')
    expect(dom?.count).toBe(2)
  })

  it('高频主题按出现次数排序', async () => {
    const { topThemes } = await import('../../modules/dream/dream-analytics')
    const themes = topThemes(dreams, 6)
    expect(themes.length).toBe(3)
    expect(themes[0].count).toBe(2)
    expect(themes[0].tag).toBe('水')
    expect(themes.map(t => t.tag)).toContain('飞')
  })

  it('空档案给守候洞察', async () => {
    const { dreamInsights } = await import('../../modules/dream/dream-analytics')
    const ins = dreamInsights([], NOW)
    expect(ins.some(s => s.includes('梦乡还空着'))).toBe(true)
  })

  it('活跃档案出连续夜/主题/时段洞察', async () => {
    const { dreamInsights } = await import('../../modules/dream/dream-analytics')
    const ins = dreamInsights(dreams, NOW)
    expect(ins.some(s => s.includes('已连续 3 夜记录梦境'))).toBe(true)
    expect(ins.some(s => s.includes('高频浮现在梦里的主题'))).toBe(true)
    expect(ins.some(s => s.includes('3:00 前后记录梦境'))).toBe(true)
    expect(ins.some(s => s.includes('1 段梦境收入归档'))).toBe(true)
  })
})

describe('DreamArchivePanel 梦境档案面板', () => {
  it('空态呈现守候文案', async () => {
    const { default: DreamArchivePanel } = await import('../DreamArchivePanel.vue')
    const wrapper = mount(DreamArchivePanel, { props: { dreams: [] } })
    expect(wrapper.text()).toContain('梦境档案')
    expect(wrapper.text()).toContain('梦乡还空着')
  })

  it('渲染统计速览与标签', async () => {
    const { default: DreamArchivePanel } = await import('../DreamArchivePanel.vue')
    const wrapper = mount(DreamArchivePanel, {
      props: { dreams: [dream(), dream({ at: daysAgo(1) })] },
    })
    expect(wrapper.text()).toContain('总梦境')
    expect(wrapper.text()).toContain('本月')
    expect(wrapper.text()).toContain('近7天')
    expect(wrapper.text()).toContain('连续夜')
  })

  it('渲染情绪分布', async () => {
    const { default: DreamArchivePanel } = await import('../DreamArchivePanel.vue')
    const wrapper = mount(DreamArchivePanel, {
      props: { dreams: [dream({ mood: 'happy' }), dream({ mood: 'fear' })] },
    })
    expect(wrapper.text()).toContain('梦的情绪')
    expect(wrapper.text()).toContain('😊')
    expect(wrapper.text()).toContain('😨')
  })

  it('渲染高频主题与连续夜洞察', async () => {
    const { default: DreamArchivePanel } = await import('../DreamArchivePanel.vue')
    const wrapper = mount(DreamArchivePanel, {
      props: {
        dreams: [
          dream({ tags: ['水'], at: daysAgo(0) }),
          dream({ tags: ['水'], at: daysAgo(1) }),
          dream({ tags: ['飞'], at: daysAgo(2) }),
        ],
      },
    })
    expect(wrapper.text()).toContain('高频主题')
    expect(wrapper.text()).toContain('水')
    expect(wrapper.text()).toContain('已连续 3 夜记录梦境')
  })
})
