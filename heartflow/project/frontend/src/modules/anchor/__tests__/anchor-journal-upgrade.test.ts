// ============================================================
// 逐日心锚 · 手札日记升级测试
// 验证：组合搜索（情绪/关键词/日期范围）、那年今日、情绪聚合、
//       日记模板系统。
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  filterJournals,
  journalsOnThisDay,
  journalMoodStats,
  journalDateKey,
} from '../anchor-journals'
import {
  JOURNAL_TEMPLATES,
  journalTemplateById,
  journalTemplateName,
} from '../anchor-journal-templates'
import type { AnchorJournal } from '../anchor-journals'

function mk(anchorId: string, createdAt: string, extra: Partial<AnchorJournal> = {}): AnchorJournal {
  return { anchorId, content: '', createdAt, updatedAt: createdAt, ...extra }
}

const SAMPLE: AnchorJournal[] = [
  mk('a1', '2026-08-01T08:00:00.000Z', { title: '晨跑', content: '沿江跑了五公里', mood: 'happy' }),
  mk('a2', '2026-08-02T09:00:00.000Z', { title: '加班', content: '项目上线前夜', mood: 'anxious' }),
  mk('a3', '2025-08-01T10:00:00.000Z', { content: '去年的今天在海边', mood: 'calm' }),
  mk('a4', '2024-08-01T11:00:00.000Z', { content: '前年今日的日记', mood: 'happy' }),
  mk('a5', '2026-07-31T12:00:00.000Z', { content: '七月最后一天', mood: 'sad' }),
]

describe('journalDateKey', () => {
  it('取 ISO 日期前 10 位为本地日期键', () => {
    expect(journalDateKey('2026-08-01T08:00:00.000Z')).toBe('2026-08-01')
  })
})

describe('filterJournals 组合搜索', () => {
  it('无过滤条件返回全部', () => {
    expect(filterJournals(SAMPLE, {}).length).toBe(5)
  })

  it('按情绪过滤', () => {
    const r = filterJournals(SAMPLE, { mood: 'happy' })
    expect(r.map(j => j.anchorId).sort()).toEqual(['a1', 'a4'])
  })

  it('按关键词匹配标题或内容', () => {
    expect(filterJournals(SAMPLE, { keyword: '海边' }).map(j => j.anchorId)).toEqual(['a3'])
    expect(filterJournals(SAMPLE, { keyword: '晨跑' }).map(j => j.anchorId)).toEqual(['a1'])
  })

  it('关键词大小写不敏感', () => {
    const items = [mk('x1', '2026-08-01T00:00:00.000Z', { title: 'READING', content: '读完了书' })]
    expect(filterJournals(items, { keyword: 'reading' }).length).toBe(1)
  })

  it('按日期范围过滤（含边界）', () => {
    const r = filterJournals(SAMPLE, { dateFrom: '2026-08-01', dateTo: '2026-08-02' })
    expect(r.map(j => j.anchorId).sort()).toEqual(['a1', 'a2'])
  })

  it('条件为「且」关系', () => {
    const r = filterJournals(SAMPLE, { mood: 'happy', dateFrom: '2026-08-01' })
    expect(r.map(j => j.anchorId)).toEqual(['a1'])
  })
})

describe('journalsOnThisDay 那年今日', () => {
  const now = new Date('2026-08-01T12:00:00.000Z')

  it('匹配往年同月同日，排除今年', () => {
    const r = journalsOnThisDay(SAMPLE, now)
    expect(r.map(j => j.anchorId).sort()).toEqual(['a3', 'a4'])
  })

  it('按时间倒序排列', () => {
    const r = journalsOnThisDay(SAMPLE, now)
    expect(r[0].anchorId).toBe('a3')
  })

  it('无匹配时返回空', () => {
    const r = journalsOnThisDay(SAMPLE, new Date('2026-12-25T12:00:00.000Z'))
    expect(r).toEqual([])
  })
})

describe('journalMoodStats 情绪聚合', () => {
  it('统计各情绪出现次数', () => {
    const stats = journalMoodStats(SAMPLE)
    expect(stats).toEqual({ happy: 2, anxious: 1, calm: 1, sad: 1 })
  })

  it('无情绪记录返回空对象', () => {
    expect(journalMoodStats([mk('x1', '2026-08-01T00:00:00.000Z')])).toEqual({})
  })
})

describe('JOURNAL_TEMPLATES 日记模板', () => {
  it('包含五种模板', () => {
    expect(JOURNAL_TEMPLATES.map(t => t.id)).toEqual([
      'three-things',
      'gratitude',
      'reflection',
      'inspiration',
      'free',
    ])
  })

  it('模板均含名称/图标/说明/脚手架', () => {
    for (const t of JOURNAL_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.icon.length).toBeGreaterThan(0)
      expect(t.hint.length).toBeGreaterThan(0)
      expect(typeof t.scaffold).toBe('string')
    }
  })

  it('journalTemplateById 命中与缺省', () => {
    expect(journalTemplateById('gratitude')?.name).toBe('今日感恩')
    expect(journalTemplateById('nope')).toBeUndefined()
    expect(journalTemplateById(undefined)).toBeUndefined()
  })

  it('journalTemplateName 返回名称或空串', () => {
    expect(journalTemplateName('reflection')).toBe('今日反思')
    expect(journalTemplateName('nope')).toBe('')
  })
})
