// ============================================================
// 蜕变势能分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { transformMomentum, transformCadence, typeHeat, transformInsights } from '../transform-analytics'
import type { Transformation } from '../gallery'

function mk(over: Partial<Transformation> = {}): Transformation {
  return {
    id: over.id || `t_${over.createdAt || Math.random()}`,
    type: over.type || 'body',
    description: over.description || 'd',
    duration: over.duration ?? 0,
    createdAt: over.createdAt || '2026-01-15T00:00:00.000Z',
  }
}

// 以 2026-02-01 为"现在"
const NOW = new Date(2026, 1, 1, 12, 0, 0) // 2026-02-01 12:00

describe('transformMomentum', () => {
  it('无记录时势能为 0 且无最后间隔', () => {
    const m = transformMomentum([], NOW)
    expect(m.score).toBe(0)
    expect(m.level).toBe('sparking')
    expect(m.daysSinceLast).toBeNull()
    expect(m.last7Count).toBe(0)
  })

  it('近一周活跃给出高分与勃发档位', () => {
    // 8 天内记录 4 次（近30天），覆盖 3 类
    const recs = [
      mk({ type: 'body', createdAt: '2026-02-01T00:00:00' }),
      mk({ type: 'mind', createdAt: '2026-01-30T00:00:00' }),
      mk({ type: 'emotion', createdAt: '2026-01-25T00:00:00' }),
      mk({ type: 'social', createdAt: '2026-01-20T00:00:00' }),
    ]
    const m = transformMomentum(recs, NOW)
    expect(m.last7Count).toBe(2)
    expect(m.last30Count).toBe(4)
    expect(m.activeTypes.length).toBeGreaterThanOrEqual(3)
    expect(m.score).toBeGreaterThan(60)
  })

  it('久未蜕变的势能接近零', () => {
    const recs = [mk({ createdAt: '2026-01-01T00:00:00' })]
    const m = transformMomentum(recs, NOW)
    expect(m.daysSinceLast).toBe(31)
    expect(m.score).toBeLessThan(20)
  })
})

describe('transformCadence', () => {
  it('两条记录计算平均间隔与最长空窗', () => {
    const recs = [
      mk({ createdAt: '2026-01-01T00:00:00' }),
      mk({ createdAt: '2026-01-11T00:00:00' }),
    ]
    const c = transformCadence(recs, NOW)
    expect(c.avgIntervalDays).toBe(10)
    expect(c.longestGapDays).toBe(10)
    expect(c.totalActiveWeeks).toBeGreaterThanOrEqual(1)
  })

  it('单条记录无间隔', () => {
    const c = transformCadence([mk({ createdAt: '2026-01-01T00:00:00' })], NOW)
    expect(c.avgIntervalDays).toBeNull()
    expect(c.longestGapDays).toBeNull()
  })

  it('跨连续两周记录则当前连续周数为 2', () => {
    // 2026-01-26 为周一所在周（当前周），2026-01-19 为其前一周
    const recs = [
      mk({ createdAt: '2026-01-21T00:00:00' }), // 上一周（1-19 周）
      mk({ createdAt: '2026-01-30T00:00:00' }), // 当前周（1-26 周）
    ]
    const c = transformCadence(recs, NOW)
    expect(c.currentWeekStreak).toBeGreaterThanOrEqual(2)
  })
})

describe('typeHeat', () => {
  it('按记录数倒序计算占比', () => {
    const recs = [
      mk({ type: 'body' }),
      mk({ type: 'body' }),
      mk({ type: 'mind' }),
    ]
    const heat = typeHeat(recs)
    expect(heat[0].type).toBe('body')
    expect(heat[0].count).toBe(2)
    expect(heat[0].ratio).toBe(67)
  })
})

describe('transformInsights', () => {
  it('空记录给出引导性洞察', () => {
    const list = transformInsights([], NOW)
    expect(list.length).toBe(1)
    expect(list[0]).toContain('第一段蜕变')
  })

  it('空窗较久生成拾起提醒', () => {
    const list = transformInsights([mk({ createdAt: '2026-01-01T00:00:00' })], NOW)
    expect(list.some((s) => s.includes('天没有记录'))).toBe(true)
  })

  it('类型高度集中生成偏好洞察', () => {
    const recs = [
      mk({ type: 'body' }),
      mk({ type: 'body' }),
      mk({ type: 'body' }),
      mk({ type: 'body' }),
      mk({ type: 'body' }),
    ]
    const list = transformInsights(recs, NOW)
    expect(list.some((s) => s.includes('body'))).toBe(true)
  })
})