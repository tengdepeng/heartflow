// ============================================================
// 逐日心锚 · 深度可视化数据契约
// 锁定标签趋势 / 时间热力图所依赖的纯函数输出形状，
// 保证 DailyAnchor.vue 可视化层与数据层一致。
// ============================================================
import { describe, expect, it } from 'vitest'
import { computeScaleDistribution } from '../anchor-time-scale'
import type { Anchor } from '../types'

function mk(targetDate: string, done = false): Anchor {
  return {
    id: `a_${Math.random().toString(36).slice(2)}_${targetDate}`,
    text: 't',
    done,
    targetDate,
    createdAt: new Date().toISOString(),
    priority: 'can',
    stage: 'active',
    driftCount: 0,
  } as Anchor
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('computeScaleDistribution（时间热力图数据契约）', () => {
  it('返回三档分布且长度正确（日7 / 周5 / 月12）', () => {
    const now = new Date()
    const key = todayKey(now)
    const dist = computeScaleDistribution([mk(key, false), mk(key, true)], now)
    expect(dist.dailyInWeek).toHaveLength(7)
    expect(dist.weeklyInMonth).toHaveLength(5)
    expect(dist.monthlyInYear).toHaveLength(12)
  })

  it('今日锚点计入本周每日分布', () => {
    const now = new Date()
    const key = todayKey(now)
    const dist = computeScaleDistribution([mk(key), mk(key, true)], now)
    const entry = dist.dailyInWeek.find(x => x.date === key)
    expect(entry?.count).toBe(2)
  })

  it('忽略非 active（池子 / 归档）锚点', () => {
    const now = new Date()
    const key = todayKey(now)
    const anchors: Anchor[] = [
      mk(key),
      { ...mk(key), stage: 'pool' } as Anchor,
      { ...mk(key), stage: 'archived' as Anchor['stage'] } as Anchor,
    ]
    const dist = computeScaleDistribution(anchors, now)
    const entry = dist.dailyInWeek.find(x => x.date === key)
    expect(entry?.count).toBe(1)
  })

  it('完成与否都计入热力图密度', () => {
    const now = new Date()
    const key = todayKey(now)
    const dist = computeScaleDistribution([mk(key, true)], now)
    const entry = dist.dailyInWeek.find(x => x.date === key)
    expect(entry?.count).toBe(1)
  })
})
