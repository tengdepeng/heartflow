// ============================================================
// knowledge（知识塔）域 · 时区判别力测试（TZ 日键治理 · 日键第十二批）
//
// 覆盖 graph-visualization 复习计划日键自洽簇：
//  - 405 行 plan.date / todayStr（计划落库键 + getTodayPlan 比对键）
//  - 410 行 nextReviewAt（间隔推算，today 由入参注入 → 干净入口）
//  - 540 行 streak while 条件（回溯日键与 plan.date 同基）
// 另及 useKnowledgeTowerUi 时间线桶键（586 today / 589 kn<ts> 记录键）
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// 本地 03-15 的日期在 UTC 口径下会写成 03-14 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import type { KnowledgeNode } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

function node(id: string): KnowledgeNode {
  return {
    id, title: `节点${id}`, desc: '', cat: 'concept', tags: [],
    createdAt: '2026-03-15T00:00:00.000Z', updatedAt: '2026-03-15T00:00:00.000Z',
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('knowledge 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('generateReviewPlan：plan.date 为注入 today 的本地日历日', async () => {
    const { useSpacedReview } = await import('../graph-visualization')
    const { generateReviewPlan } = useSpacedReview()
    // 注入本地凌晨时刻：UTC 口径下 todayStr 会退到 03-14
    const plan = generateReviewPlan([node('n1')], new Date(2026, 2, 15, 0, 30, 0))
    expect(plan.date).toBe('2026-03-15')
    expect(plan.id).toBe('review-plan-2026-03-15')
  })

  it('generateReviewPlan：nextReviewAt 间隔推算为本地日（今天+1 = 03-16）', async () => {
    const { useSpacedReview } = await import('../graph-visualization')
    const { generateReviewPlan } = useSpacedReview()
    const plan = generateReviewPlan([node('n1')], new Date(2026, 2, 15, 0, 30, 0))
    // reviewCount=0 ⇒ 落在 SPACED_INTERVALS[0] = 1 天
    expect(plan.items[0].nextReviewAt).toBe('2026-03-16')
  })

  it('getTodayPlan：本地今日计划可被命中（plan.date 与今日键同基）', async () => {
    const { useSpacedReview } = await import('../graph-visualization')
    const { generateReviewPlan, getTodayPlan } = useSpacedReview()
    generateReviewPlan([node('n1')], new Date(2026, 2, 15, 0, 30, 0))
    // 系统时间为本地 03-15 00:30 ⇒ getTodayPlan 应命中刚生成的 03-15 计划
    expect(getTodayPlan()?.date).toBe('2026-03-15')
  })

  it('generateReviewPlan：注入昨日时刻则落库键为 03-14（不与今日混淆）', async () => {
    const { useSpacedReview } = await import('../graph-visualization')
    const { generateReviewPlan } = useSpacedReview()
    const plan = generateReviewPlan([node('n1')], new Date(2026, 2, 14, 0, 30, 0))
    expect(plan.date).toBe('2026-03-14')
    expect(plan.items[0].nextReviewAt).toBe('2026-03-15')
  })
})
