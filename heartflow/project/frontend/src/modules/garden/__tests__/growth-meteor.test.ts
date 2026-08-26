// ============================================================
// 成长庭院 · 成长气象引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Goal } from '../../goal/types'
import {
  growthOverview,
  domainDistribution,
  stageDistribution,
  habitReview,
  growthMomentum,
  growthInsights,
  STAGE_LABELS,
} from '../growth-meteor'

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g' + Math.random().toString(36).slice(2, 6),
    title: '目标',
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    anchorCount: 0,
    anchorDone: 0,
    ...overrides,
  }
}

function seed(overrides: Partial<{ id: string; sprouted: boolean; at: string }> = {}) {
  return { id: 's' + Math.random().toString(36).slice(2, 5), sprouted: false, at: new Date().toISOString(), ...overrides }
}

function habit(overrides: Partial<{ id: string; text: string; streak: number; streakPct: number; ticks: string[] }> = {}) {
  return { id: 'h' + Math.random().toString(36).slice(2, 5), text: '习惯', streak: 0, streakPct: 0, ticks: [], ...overrides }
}

function cocoon(overrides: Record<string, any> = {}): any {
  return { id: 'c1', name: '蜕变', stage: 'gestating', createdAt: new Date().toISOString(), ...overrides }
}

describe('growthOverview 概览', () => {
  it('空数据概览全为 0', () => {
    const ov = growthOverview([], [], [], [])
    expect(ov.totalTargets).toBe(0)
    expect(ov.bloomRate).toBe(0)
    expect(ov.sproutRate).toBe(0)
    expect(ov.habitCount).toBe(0)
    expect(ov.cocoonCount).toBe(0)
  })

  it('统计开花率 / 发芽率 / 习惯 / 光茧', () => {
    const targets = [
      goal({ status: 'bloom' }),
      goal({ status: 'bloom' }),
      goal({ status: 'growing' }),
    ]
    const seeds = [seed({ sprouted: true }), seed({ sprouted: false })]
    const habits = [habit({ streak: 4 }), habit({ streak: 2 })]
    const cocoons = [cocoon({ stage: 'flying' })]
    const ov = growthOverview(targets, seeds, habits, cocoons as any)
    expect(ov.totalTargets).toBe(3)
    expect(ov.bloomed).toBe(2)
    expect(ov.growing).toBe(1)
    expect(ov.bloomRate).toBe(67)
    expect(ov.sproutRate).toBe(50)
    expect(ov.avgStreak).toBe(3)
    expect(ov.bestHabit).toBe(habits[0].text)
    expect(ov.cocoonCount).toBe(1)
    expect(ov.flyingCocoons).toBe(1)
  })
})

describe('domainDistribution 领域分布', () => {
  it('按领域统计目标数量与占比', () => {
    const targets = [
      goal({ domain: 'work' }),
      goal({ domain: 'work' }),
      goal({ domain: 'health' }),
    ]
    const dist = domainDistribution(targets)
    const work = dist.find(d => d.domain === 'work')!
    const health = dist.find(d => d.domain === 'health')!
    expect(work.count).toBe(2)
    expect(work.pct).toBe(67)
    expect(health.count).toBe(1)
    expect(health.pct).toBe(33)
    expect(health.label).toBe('健康')
  })

  it('空目标时无分布行', () => {
    expect(domainDistribution([])).toEqual([])
  })
})

describe('stageDistribution 阶段分布', () => {
  it('按生长阶段统计', () => {
    const targets = [
      goal({ status: 'seed' }),
      goal({ status: 'bloom' }),
      goal({ status: 'dormant' }),
    ]
    const stages = stageDistribution(targets)
    expect(stages.map(s => s.status).sort()).toEqual(['bloom', 'dormant', 'seed'])
    expect(STAGE_LABELS.bloom).toBe('已开花')
  })
})

describe('habitReview 习惯审视', () => {
  it('识别最佳 / 强壮 / 停滞习惯', () => {
    const habits = [
      habit({ streak: 6 }),
      habit({ streak: 4 }),
      habit({ streak: 1 }),
      habit({ streak: 0 }),
    ]
    const review = habitReview(habits)
    expect(review.best?.streak).toBe(6)
    expect(review.strong.length).toBe(2) // 6 和 4
    expect(review.stagnant.length).toBe(1)
  })

  it('无习惯时 best 为 null', () => {
    expect(habitReview([]).best).toBeNull()
  })
})

describe('growthMomentum 成长势能', () => {
  it('全空返回刚开垦 0 分', () => {
    const m = growthMomentum([], [], [])
    expect(m.score).toBe(0)
    expect(m.label).toBe('刚开垦')
  })

  it('有活跃目标与习惯时分数上升', () => {
    const m = growthMomentum(
      [goal({ status: 'growing' }), goal({ status: 'bloom' })],
      [seed({ sprouted: true })],
      [habit({ streak: 5 })],
    )
    expect(m.score).toBeGreaterThan(40)
  })

  it('全休眠目标时分数较低', () => {
    const m = growthMomentum([goal({ status: 'dormant' })], [], [])
    // 只有活跃占比 30*0=0，其余为 0
    expect(m.score).toBeLessThan(25)
  })

  it('分数钳制在 0~100', () => {
    const m = growthMomentum(
      [goal({ status: 'bloom' }), goal({ status: 'bloom' }), goal({ status: 'growing' })],
      [seed({ sprouted: true }), seed({ sprouted: true })],
      [habit({ streak: 7 }), habit({ streak: 7 })],
    )
    expect(m.score).toBeGreaterThanOrEqual(0)
    expect(m.score).toBeLessThanOrEqual(100)
  })
})

describe('growthInsights 温和洞察', () => {
  it('全空时给出引导', () => {
    const insights = growthInsights([], [], [], [], new Date(), 4)
    expect(insights[0]).toContain('花园还空着')
  })

  it('开花目标时提示果实', () => {
    const insights = growthInsights(
      [goal({ status: 'bloom' })],
      [], [], [],
      new Date(), 10,
    )
    expect(insights.some(s => s.includes('开花'))).toBe(true)
  })

  it('休眠目标时提示醒来', () => {
    const m = new Date('2026-08-08T10:00:00')
    const insights = growthInsights(
      [goal({ status: 'dormant' })],
      [], [], [], m, 10,
    )
    expect(insights.some(s => s.includes('休眠') && s.includes('推进'))).toBe(true)
  })

  it('停滞习惯时提示拆小', () => {
    const insights = growthInsights(
      [], [], [habit({ streak: 1, text: '早起' })], [],
      new Date(), 10,
    )
    expect(insights.some(s => s.includes('中断'))).toBe(true)
  })

  it('展翅光茧时提示蜕变', () => {
    const insights = growthInsights(
      [], [], [], [cocoon({ stage: 'flying' })],
      new Date(), 4,
    )
    expect(insights.some(s => s.includes('展翅'))).toBe(true)
  })
})