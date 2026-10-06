// ============================================================
// emotion（情绪花园）域 · 时区判别力测试（TZ 日键治理 · 日键第十批）
//
// 覆盖：
//  - garden-narrative 的 formatDate 唯一日键出口（generateDiaryEntry 记录分桶）
//  - emotion-trends 的 buildTrends daily 分组键 + predictEmotions 按天分布
//  - emotion-bridge 今日故事 date
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// 本地 03-15 00:10 的记录（UTC 03-14 16:10）若实现仍按 UTC 切日，会被错算到
// 03-14 而落空本地「今天」桶 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import type { EmotionRecord } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

/** 本地某日某时 → Date */
function localAt(dayOffset: number, hour: number, minute = 0): Date {
  return new Date(2026, 2, 15 + dayOffset, hour, minute, 0)
}

function record(id: string, createdAt: string, type: EmotionRecord['type'] = 'happy'): EmotionRecord {
  return { id, type, note: '', createdAt } as EmotionRecord
}

/** generateDiaryEntry 所需的空 health / environment 骨架 */
const HEALTH = {
  score: 0, coverage: 0, diversity: 0, bloomRate: 0,
  recentActivity: 0, description: '',
} as any
const ENVIRONMENT = {
  sky: 'clear', ground: 'lush', ambientLight: 'rgba(200,220,240,0.3)',
  skyGradient: ['#d4e4f0', '#e8f0f8'], particleType: 'none',
  particleColor: '#ffffff', swayIntensity: 0.5,
} as any

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('emotion 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('garden-narrative：本地 03-15 凌晨记录归入 03-15 日记桶（UTC 口径会错归 03-14）', async () => {
    const { useGardenNarrative } = await import('../garden-narrative')
    const n = useGardenNarrative()
    const recs = [record('r1', localAt(0, 0, 10).toISOString())]
    // 以本地今日键生成日记：记录应命中
    const hit = n.generateDiaryEntry('2026-03-15', recs, [], HEALTH, ENVIRONMENT)
    expect(hit.date).toBe('2026-03-15')
    expect(hit.emotionSummary.happy).toBe(1)
    // 以 UTC 前一天键生成：记录不应命中（证明分桶确实按本地日切）
    const miss = n.generateDiaryEntry('2026-03-14', recs, [], HEALTH, ENVIRONMENT)
    expect(miss.emotionSummary.happy).toBe(0)
  })

  it('garden-narrative：昨日 23:30 记录归入 03-14 而非 03-15', async () => {
    const { useGardenNarrative } = await import('../garden-narrative')
    const n = useGardenNarrative()
    const recs = [record('y', localAt(-1, 23, 30).toISOString())]
    const d14 = n.generateDiaryEntry('2026-03-14', recs, [], HEALTH, ENVIRONMENT)
    expect(d14.emotionSummary.happy).toBe(1)
    const d15 = n.generateDiaryEntry('2026-03-15', recs, [], HEALTH, ENVIRONMENT)
    expect(d15.emotionSummary.happy).toBe(0)
  })

  it('emotion-trends：buildTrends daily 分组键按本地日（03-15 凌晨独立成桶）', async () => {
    const { useEmotionTrends } = await import('../emotion-trends')
    const t = useEmotionTrends()
    const recs = [
      record('a', localAt(0, 0, 10).toISOString()), // 本地 03-15（UTC 03-14）
      record('b', localAt(-1, 23, 30).toISOString()), // 本地 03-14（UTC 03-14）
    ]
    const points = t.buildTrends(recs, 'daily', 3)
    // 本地 03-15 00:10 的记录必须落在 03-15 桶，不能与 03-14 的记录混桶
    const at15 = points.find((p) => p.label === '2026-03-15')
    const at14 = points.find((p) => p.label === '2026-03-14')
    expect(at15).toBeDefined()
    expect(at15!.total).toBe(1)
    expect(at14).toBeDefined()
    expect(at14!.total).toBe(1)
  })

  it('emotion-trends：predictEmotions 预测日边界为本地日历日（首条 = 本地明天 03-16）', async () => {
    const { useEmotionTrends } = await import('../emotion-trends')
    const t = useEmotionTrends()
    // 需要 ≥7 天分布数据才产出预测；每天一条，本地正午，跨 UTC 日界线无歧义
    const recs = Array.from({ length: 7 }, (_, i) =>
      record(`p${i}`, localAt(i - 7, 12, 0).toISOString(), i % 2 === 0 ? 'happy' : 'calm'),
    )
    const preds = t.predictEmotions(recs)
    expect(preds.length).toBeGreaterThan(0)
    // 假时刻本地 03-15 00:30 → 明天是本地 03-16；UTC 口径会错成 03-15
    expect(preds[0].date).toBe('2026-03-16')
  })

  it('emotion-bridge：今日故事 date 为本地日历日', async () => {
    const { useEmotionBridge } = await import('../emotion-bridge')
    const bridge = useEmotionBridge()
    const story = bridge.createGardenStory('标题', '内容')
    expect(story.date).toBe('2026-03-15')
  })
})
