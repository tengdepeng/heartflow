// ============================================================
// 自律工坊 · 自然语言时间解析测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { parseDueText, sortByDue } from '../time-parse'

describe('parseDueText 相对日期', () => {
  it('今天', () => {
    const r = parseDueText('今天')
    expect(r.dayOffset).toBe(0)
    expect(r.label).toBe('今天')
    expect(r.sortKey).toBeGreaterThanOrEqual(0)
  })
  it('明天下午3点 → 补正为 15:00', () => {
    const r = parseDueText('明天下午3点')
    expect(r.dayOffset).toBe(1)
    expect(r.label).toBe('明天 15:00')
    expect(r.sortKey).toBe(100 + 15)
  })
  it('后天上午9点半', () => {
    const r = parseDueText('后天上午9点半')
    expect(r.dayOffset).toBe(2)
    expect(r.label).toBe('后天 09:30')
  })
  it('大后天 → 3 天', () => {
    expect(parseDueText('大后天').dayOffset).toBe(3)
  })
  it('今晚 → 今天 + 晚上默认 20:00', () => {
    const r = parseDueText('今晚')
    expect(r.dayOffset).toBe(0)
    expect(r.label).toMatch(/今天 20:00/)
  })
})

describe('parseDueText 星期', () => {
  it('周五得到 0..6 偏移（不抛错，dayOffset 非空）', () => {
    const r = parseDueText('周五')
    expect(r.dayOffset).toBeGreaterThanOrEqual(0)
    expect(r.label).toMatch(/周五|周/)
  })
})

describe('parseDueText 未识别', () => {
  it('无时间语料回退为原文', () => {
    const r = parseDueText('尽快')
    expect(r.dayOffset).toBeNull()
    expect(r.label).toBe('尽快')
    expect(r.sortKey).toBe(999 * 100)
  })
})

describe('sortByDue', () => {
  it('按到期先后排序，未识别到来 → 末尾', () => {
    const list = ['尽快', '明天上午', '今天', '后天']
    const sorted = sortByDue(list)
    expect(sorted).toEqual(['今天', '明天上午', '后天', '尽快'])
  })
})