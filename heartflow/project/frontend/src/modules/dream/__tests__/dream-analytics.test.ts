// ============================================================
// 梦境档案分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Dream } from '../../../stores/dreamNook'
import {
  dreamOverview,
  moodDistribution,
  dominantMood,
  topThemes,
  dreamInsights,
} from '../dream-analytics'

const NOW = new Date(2026, 7, 22, 12, 0, 0)

function dream(
  daysAgo: number,
  opts: Partial<Pick<Dream, 'mood' | 'tags' | 'archived' | 'title' | 'content'>> & { hour?: number } = {}
): Dream {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  if (opts.hour !== undefined) d.setHours(opts.hour, 0, 0, 0)
  return {
    id: `d${daysAgo}-${opts.hour ?? 0}`,
    title: opts.title || '',
    content: opts.content ?? '梦境内容文字',
    mood: opts.mood || 'neutral',
    tags: opts.tags ?? [],
    at: d.toISOString(),
    archived: opts.archived ?? false,
  }
}

describe('dreamOverview', () => {
  it('空列表各项归零', () => {
    const ov = dreamOverview([], NOW)
    expect(ov.total).toBe(0)
    expect(ov.active).toBe(0)
    expect(ov.archived).toBe(0)
    expect(ov.thisMonth).toBe(0)
    expect(ov.thisWeek).toBe(0)
    expect(ov.avgWords).toBe(0)
    expect(ov.peakHour).toBeNull()
    expect(ov.consecutiveDays).toBe(0)
  })

  it('统计总数活跃与归档', () => {
    const ov = dreamOverview([dream(0), dream(1), dream(2, { archived: true })], NOW)
    expect(ov.total).toBe(3)
    expect(ov.active).toBe(2)
    expect(ov.archived).toBe(1)
  })

  it('近7天与本月计数', () => {
    const dreams = [dream(0), dream(2), dream(5), dream(20)]
    const ov = dreamOverview(dreams, NOW)
    expect(ov.thisWeek).toBe(3)
    expect(ov.thisMonth).toBe(4)
  })

  it('连续记录天数（今日有从今日倒推）', () => {
    const ov = dreamOverview([dream(0), dream(1), dream(2)], NOW)
    expect(ov.consecutiveDays).toBe(3)
  })

  it('今日无则从昨日回溯', () => {
    const ov = dreamOverview([dream(1), dream(2), dream(3)], NOW)
    expect(ov.consecutiveDays).toBe(3)
  })

  it('时段偏好取众数', () => {
    const ov = dreamOverview([dream(5, { hour: 23 }), dream(4, { hour: 0 }), dream(3, { hour: 23 })], NOW)
    expect(ov.peakHour).toBe(23)
  })
})

describe('moodDistribution / dominantMood', () => {
  it('按情绪归类统计占比', () => {
    const dist = moodDistribution([dream(0, { mood: 'happy' }), dream(1, { mood: 'happy' }), dream(2, { mood: 'fear' })])
    const happy = dist.find(e => e.mood === 'happy')!
    expect(happy.count).toBe(2)
    expect(happy.pct).toBe(67)
  })

  it('返回众数情绪', () => {
    const dom = dominantMood([dream(0, { mood: 'curious' }), dream(1, { mood: 'curious' }), dream(2, { mood: 'sad' })])
    expect(dom!.mood).toBe('curious')
  })

  it('空列表无众数', () => {
    expect(dominantMood([])).toBeNull()
  })
})

describe('topThemes', () => {
  it('按标签出现次数降序', () => {
    const themes = topThemes([
      dream(0, { tags: ['旧友'] }),
      dream(1, { tags: ['旧友', '飞行'] }),
      dream(2, { tags: ['飞行'] }),
    ])
    expect(themes[0].tag).toBe('旧友')
    expect(themes[0].count).toBe(2)
    expect(themes[1].tag).toBe('飞行')
    expect(themes[1].count).toBe(2)
  })

  it('limit 截断生效', () => {
    const themes = topThemes(
      ['a', 'b', 'c', 'd'].map((t, i) => dream(i, { tags: [t] })),
      2,
    )
    expect(themes.length).toBe(2)
  })
})

describe('dreamInsights', () => {
  it('空梦乡给出温和提示', () => {
    const ins = dreamInsights([], NOW, 10)
    expect(ins.length).toBe(1)
    expect(ins[0]).toContain('梦乡还空着')
  })

  it('连续记录被点名', () => {
    const ins = dreamInsights([dream(0), dream(1), dream(2)], NOW, 10)
    expect(ins.some(s => s.includes('3 夜'))).toBe(true)
  })

  it('高频主题被点名', () => {
    const ins = dreamInsights(
      [dream(0, { tags: ['教室'] }), dream(1, { tags: ['教室'] }), dream(2, { tags: ['教室'] })],
      NOW,
      10,
    )
    expect(ins.some(s => s.includes('教室'))).toBe(true)
  })

  it('limit 截断生效', () => {
    const dreams = [
      dream(0, { mood: 'happy', tags: ['教室'] }),
      dream(1, { mood: 'happy', tags: ['教室'] }),
      dream(2, { mood: 'happy', tags: ['教室'] }),
      dream(3, { tags: ['教室'] }),
      dream(4),
      dream(5, { archived: true }),
    ]
    const full = dreamInsights(dreams, NOW, 10)
    expect(full.length).toBeGreaterThan(4)
    const cut = dreamInsights(dreams, NOW, 2)
    expect(cut.length).toBe(2)
  })
})