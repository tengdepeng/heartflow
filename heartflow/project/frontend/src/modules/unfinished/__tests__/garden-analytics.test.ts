// ============================================================
// 未完成花园 · 复垦分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { gardenStats, rankForPickup, pickUpSuggestion, gardenInsights } from '../garden-analytics'
import type { UItem } from '../unfinished-store'

const NOW = new Date(2026, 1, 1, 12, 0, 0) // 2026-02-01 12:00

function mk(over: Partial<UItem> = {}): UItem {
  return {
    id: over.id || `i_${Math.random().toString(36).slice(2, 7)}`,
    type: over.type || 'seed',
    text: over.text || '一件事',
    at: over.at || '2026-01-01T00:00:00',
    updatedAt: over.updatedAt,
    dormantSince: over.dormantSince,
    status: over.status,
    progress: over.progress,
    completed: over.completed,
    completedAt: over.completedAt,
  }
}

const DAY = 86_400_000

describe('gardenStats', () => {
  it('空仓库返回零值', () => {
    const s = gardenStats([], NOW)
    expect(s.total).toBe(0)
    expect(s.completionRate).toBe(0)
  })

  it('统计完成率与类型分布', () => {
    const items = [
      mk({ type: 'seed', completed: true }),
      mk({ type: 'seed' }),
      mk({ type: 'book' }),
      mk({ type: 'draft' }),
    ]
    const s = gardenStats(items, NOW)
    expect(s.total).toBe(4)
    expect(s.completed).toBe(1)
    expect(s.completionRate).toBe(25)
    expect(s.byType.seed).toBe(1)
    expect(s.byType.book).toBe(1)
  })

  it('按沉淀时长分档（3 天→新芽，30 天→渐长边缘归蒙尘）', () => {
    const recent = new Date(NOW.getTime() - 3 * DAY).toISOString()
    const older = new Date(NOW.getTime() - 31 * DAY).toISOString()
    const items = [
      mk({ at: recent, updatedAt: recent }),
      mk({ at: older, updatedAt: older }),
    ]
    const s = gardenStats(items, NOW)
    const fresh = s.buckets.find((b) => b.key === 'fresh')!
    const dusty = s.buckets.find((b) => b.key === 'dusty')!
    expect(fresh.count).toBe(1)
    expect(dusty.count).toBe(1)
  })
})

describe('rankForPickup / pickUpSuggestion', () => {
  it('种子优先于被放弃的旧书', () => {
    const items = [
      mk({ id: 'seed-warm', type: 'seed', text: '散步', at: new Date(NOW.getTime() - DAY).toISOString() }),
      mk({ id: 'book-old', type: 'book', text: '厚书', status: 'abandoned', at: '2026-01-01T00:00:00' }),
    ]
    const ranked = rankForPickup(items, NOW)
    expect(ranked[0].item.id).toBe('seed-warm')
    expect(pickUpSuggestion(items, NOW)!.item.id).toBe('seed-warm')
  })

  it('无未完成项时建议为空', () => {
    const items = [
      mk({ completed: true }),
      mk({ completed: true }),
    ]
    expect(pickUpSuggestion(items, NOW)).toBeNull()
    expect(rankForPickup(items, NOW)).toHaveLength(0)
  })

  it('同类型下，有进度的书比刚开头的书更值得续读', () => {
    const items = [
      mk({ type: 'book', text: '刚翻开', progress: '开头', at: new Date(NOW.getTime() - 2 * DAY).toISOString() }),
      mk({ type: 'book', text: '读到半程', progress: '第5章', at: new Date(NOW.getTime() - 3 * DAY).toISOString() }),
    ]
    const ranked = rankForPickup(items, NOW)
    expect(ranked[0].item.id).toBe(items[1].id)
  })
})

describe('gardenInsights', () => {
  it('空花园给引导', () => {
    const list = gardenInsights([], NOW)
    expect(list.length).toBe(1)
    expect(list[0]).toContain('空着')
  })

  it('完成率高时给出收束洞察', () => {
    const items = [
      mk({ completed: true }),
      mk({ completed: true }),
      mk({ completed: true }),
      mk({ type: 'book' }),
    ]
    const list = gardenInsights(items, NOW)
    expect(list.some((s) => s.includes('完成率'))).toBe(true)
  })

  it('给出今日拾起建议', () => {
    const items = [mk({ text: '那本书' })]
    const list = gardenInsights(items, NOW)
    expect(list.some((s) => s.includes('那本书'))).toBe(true)
  })
})