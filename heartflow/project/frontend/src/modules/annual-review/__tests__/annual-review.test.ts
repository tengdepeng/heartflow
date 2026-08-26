import { describe, expect, it } from 'vitest'
import { collectAnnual, renderLetter, countByMonth, hasAnyTrace, CLOSING_TEMPLATE } from '../annual-review'
import type { AnnualSource } from '../annual-review'

function src(partial: Partial<AnnualSource> = {}): AnnualSource {
  return {
    emotions: [],
    focus: [],
    anchors: [],
    milestones: [],
    ...partial,
  }
}

describe('annual-review · 年度对话', () => {
  it('按年过滤，只陈列所选年份的留痕', () => {
    const letter = collectAnnual(2025, src({
      emotions: [
        { at: '2025-03-05T10:00:00Z', type: 'happy' },
        { at: '2026-03-05T10:00:00Z', type: 'sad' },
      ],
      anchors: [{ at: '2025-07-01T08:00:00Z', text: '写一封信', done: true }],
    }))
    expect(letter.year).toBe(2025)
    expect(letter.months.length).toBe(2) // 仅 3 月 + 7 月
    const march = letter.months.find(m => m.month === 3)!
    expect(march.notes.join(' ')).toContain('轻快')
    expect(march.notes.join(' ')).not.toContain('低落') // 2026 年被过滤
    expect(letter.tone).toBe('陈列')
  })

  it('陈列而非叙事：notes 不含因果/总结连接词', () => {
    const letter = collectAnnual(2025, src({
      emotions: [{ at: '2025-01-01T00:00:00Z', type: 'anxious' }],
      focus: [{ at: '2025-06-15T00:00:00Z', totalSeconds: 7200 }],
    }))
    const joined = letter.months.map(m => m.notes.join(' ')).join(' ')
    const banned = ['所以', '因此', '导致', '这说明', '意味着', '由此可见']
    for (const b of banned) expect(joined).not.toContain(b)
  })

  it('专注以小时表述，心愿锚完成项被陈列', () => {
    const letter = collectAnnual(2025, src({
      focus: [{ at: '2025-02-20T00:00:00Z', totalSeconds: 9000 }],
      anchors: [{ at: '2025-02-21T00:00:00Z', text: '读完一本书', done: true }],
    }))
    const feb = letter.months.find(m => m.month === 2)!
    expect(feb.notes.join(' ')).toContain('2h30m')
    expect(feb.notes.join(' ')).toContain('读完一本书')
  })

  it('未完成的心愿锚不陈列，里程碑汇总到单独列表', () => {
    const letter = collectAnnual(2025, src({
      anchors: [{ at: '2025-03-01T00:00:00Z', text: '未完成的事', done: false }],
      milestones: [{ at: '2025-09-10T00:00:00Z', label: '重塑更漏' }],
    }))
    expect(letter.months).toHaveLength(0)
    expect(letter.milestones).toContain('9 月 · 重塑更漏')
  })

  it('空年返回静默语气，且以铁律收尾', () => {
    const letter = collectAnnual(2025, src())
    expect(letter.tone).toBe('静默')
    expect(letter.closing).toBe(CLOSING_TEMPLATE)
    expect(letter.months).toHaveLength(0)
  })

  it('renderLetter 组装可读信纸', () => {
    const letter = collectAnnual(2025, src({
      emotions: [{ at: '2025-01-01T00:00:00Z', type: 'calm' }],
    }))
    const text = renderLetter(letter)
    expect(text).toContain('2025 年的陈列')
    expect(text).toContain('1 月')
    expect(text).toContain(CLOSING_TEMPLATE)
  })

  it('countByMonth 统计各类留痕，hasAnyTrace 判空月', () => {
    const s = src({
      emotions: [{ at: '2025-04-01T00:00:00Z', type: 'happy' }, { at: '2025-04-02T00:00:00Z', type: 'calm' }],
      focus: [{ at: '2025-04-03T00:00:00Z', totalSeconds: 3600 }],
      anchors: [{ at: '2025-04-04T00:00:00Z', text: '晨跑', done: true }],
    })
    const counts = countByMonth(s, 2025).get(4)!
    expect(counts.emotions).toBe(2)
    expect(counts.focus).toBe(1)
    expect(counts.anchors).toBe(1)
    expect(counts.milestones).toBe(0)
    expect(hasAnyTrace(s, 2025)).toBe(true)
    expect(hasAnyTrace(src(), 2025)).toBe(false)
  })
})