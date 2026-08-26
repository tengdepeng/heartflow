// ============================================================
// 藏象阁 · 节气养生测试
// 二十四节气数据完整性 + 当前节气判定 + 打卡单例
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import {
  SOLAR_TERM_WELLNESS,
  SOLAR_TERM_ORDER,
  SOLAR_SEASON_META,
  getCurrentSolarTerm,
  getNextSolarTerm,
  daysToNextSolarTerm,
  solarTermInsights,
  useSolarTermStore,
  getSolarTermStore,
} from '../solar-term'
import { storage } from '../../../engine/storage'

const CHECKIN_KEY = 'hf:body-wisdom:solar-term-checkins'

describe('SOLAR_TERM_WELLNESS - 二十四节气数据完整性', () => {
  it('包含全部 24 个节气', () => {
    expect(SOLAR_TERM_WELLNESS).toHaveLength(24)
  })

  it('节气名互不重复', () => {
    const names = SOLAR_TERM_WELLNESS.map(t => t.name)
    expect(new Set(names).size).toBe(24)
  })

  it('每个节气都有完整养生字段', () => {
    for (const t of SOLAR_TERM_WELLNESS) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.month).toBeGreaterThanOrEqual(1)
      expect(t.month).toBeLessThanOrEqual(12)
      expect(t.day).toBeGreaterThanOrEqual(1)
      expect(t.day).toBeLessThanOrEqual(31)
      expect(['春', '夏', '秋', '冬']).toContain(t.season)
      expect(t.sixQi.length).toBeGreaterThan(0)
      expect(t.element.length).toBeGreaterThan(0)
      expect(t.theme.length).toBeGreaterThan(0)
      expect(t.diet.length).toBeGreaterThan(0)
      expect(t.exercise.length).toBeGreaterThan(0)
      expect(t.acupressure.length).toBeGreaterThan(0)
      expect(t.lifestyle.length).toBeGreaterThan(0)
      expect(t.emotional.length).toBeGreaterThan(0)
      expect(t.taboo.length).toBeGreaterThan(0)
    }
  })

  it('SOLAR_TERM_ORDER 覆盖全部 24 个节气', () => {
    expect(SOLAR_TERM_ORDER).toHaveLength(24)
    const orderNames = new Set(SOLAR_TERM_ORDER)
    for (const t of SOLAR_TERM_WELLNESS) {
      expect(orderNames.has(t.name)).toBe(true)
    }
  })

  it('SOLAR_SEASON_META 覆盖四季', () => {
    expect(Object.keys(SOLAR_SEASON_META)).toHaveLength(4)
    for (const season of ['春', '夏', '秋', '冬']) {
      expect(SOLAR_SEASON_META[season as keyof typeof SOLAR_SEASON_META].label).toBe(season)
    }
  })

  it('每季 6 个节气', () => {
    const counts: Record<string, number> = { 春: 0, 夏: 0, 秋: 0, 冬: 0 }
    for (const t of SOLAR_TERM_WELLNESS) {
      counts[t.season]++
    }
    expect(counts).toEqual({ 春: 6, 夏: 6, 秋: 6, 冬: 6 })
  })
})

describe('getCurrentSolarTerm - 当前节气判定', () => {
  it('立春（2/4）判定为立春', () => {
    const term = getCurrentSolarTerm(new Date(2026, 1, 4))
    expect(term.name).toBe('立春')
  })

  it('惊蛰（3/5）判定为惊蛰', () => {
    const term = getCurrentSolarTerm(new Date(2026, 2, 5))
    expect(term.name).toBe('惊蛰')
  })

  it('夏至（6/21）判定为夏至', () => {
    const term = getCurrentSolarTerm(new Date(2026, 5, 21))
    expect(term.name).toBe('夏至')
  })

  it('冬至（12/22）判定为冬至', () => {
    const term = getCurrentSolarTerm(new Date(2026, 11, 22))
    expect(term.name).toBe('冬至')
  })

  it('小寒（1/5）判定为小寒（跨年）', () => {
    const term = getCurrentSolarTerm(new Date(2026, 0, 5))
    expect(term.name).toBe('小寒')
  })

  it('大寒（1/20）判定为大寒', () => {
    const term = getCurrentSolarTerm(new Date(2026, 0, 20))
    expect(term.name).toBe('大寒')
  })

  it('立春前（1/25）仍为大寒', () => {
    const term = getCurrentSolarTerm(new Date(2026, 0, 25))
    expect(term.name).toBe('大寒')
  })

  it('节气之间取前一个（2/10 在立春与雨水之间 → 立春）', () => {
    const term = getCurrentSolarTerm(new Date(2026, 1, 10))
    expect(term.name).toBe('立春')
  })
})

describe('getNextSolarTerm - 下一节气', () => {
  it('立春之后是雨水', () => {
    const next = getNextSolarTerm('立春')
    expect(next?.name).toBe('雨水')
  })

  it('冬至之后是（跨年）小寒', () => {
    const next = getNextSolarTerm('冬至')
    expect(next?.name).toBe('小寒')
  })

  it('未知节气返回 null', () => {
    expect(getNextSolarTerm('不存在')).toBeNull()
  })
})

describe('daysToNextSolarTerm - 距下一节气天数', () => {
  it('立春到雨水约 15 天', () => {
    const days = daysToNextSolarTerm('立春', new Date(2026, 1, 4))
    expect(days).toBeGreaterThan(10)
    expect(days).toBeLessThanOrEqual(20)
  })

  it('冬至到小寒约 14 天', () => {
    const days = daysToNextSolarTerm('冬至', new Date(2026, 11, 22))
    expect(days).toBeGreaterThan(10)
    expect(days).toBeLessThanOrEqual(20)
  })
})

describe('solarTermInsights - 节气洞察', () => {
  it('返回当前节气与下一节气', () => {
    const insight = solarTermInsights(new Date(2026, 5, 21))
    expect(insight.current.name).toBe('夏至')
    expect(insight.next?.name).toBe('小暑')
  })

  it('包含养生要点', () => {
    const insight = solarTermInsights(new Date(2026, 5, 21))
    expect(insight.highlights.length).toBeGreaterThan(0)
    expect(insight.highlights[0]).toContain('节气主题')
  })

  it('立春有季节转换提示', () => {
    const insight = solarTermInsights(new Date(2026, 1, 4))
    expect(insight.transition).not.toBeNull()
    expect(insight.transition).toContain('春')
  })

  it('非换季节气无转换提示', () => {
    const insight = solarTermInsights(new Date(2026, 5, 21))
    expect(insight.transition).toBeNull()
  })
})

describe('getSolarTermStore - 打卡单例', () => {
  beforeEach(() => {
    storage.setKV(CHECKIN_KEY, [])
  })

  it('多次调用返回同一实例', () => {
    const a = getSolarTermStore()
    const b = getSolarTermStore()
    expect(a).toBe(b)
  })

  it('打卡当前节气并持久化', () => {
    const store = getSolarTermStore()
    store.checkIn('立春', '吃了春饼', true)
    expect(store.checkIns.value).toHaveLength(1)
    expect(store.checkIns.value[0].term).toBe('立春')
    expect(store.isCheckedIn('立春')).toBe(true)
    const saved = storage.getKV<unknown[]>('hf:body-wisdom:solar-term-checkins', [])
    expect(saved).toHaveLength(1)
  })

  it('同一年同一节气重复打卡覆盖', () => {
    const store = getSolarTermStore()
    store.checkIn('立春', '第一次')
    store.checkIn('立春', '第二次')
    expect(store.checkIns.value).toHaveLength(1)
    expect(store.checkIns.value[0].note).toBe('第二次')
  })

  it('checkInStats 统计当年打卡', () => {
    const store = getSolarTermStore()
    store.checkIn('立春', '', true)
    store.checkIn('雨水', '', false)
    const stats = store.checkInStats.value
    expect(stats.total).toBe(2)
    expect(stats.done).toBe(1)
  })

  it('load() 从存储重载（跨实例同步）', () => {
    const writer = useSolarTermStore()
    writer.checkIn('惊蛰', '', true)

    const store = getSolarTermStore()
    store.load()
    expect(store.checkIns.value).toHaveLength(1)
    expect(store.checkIns.value[0].term).toBe('惊蛰')
  })
})
