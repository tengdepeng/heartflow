// ============================================================
// 记忆回廊 · 引擎纯函数单测（每日回顾 / 随机漫游 / 年龄标签）
// 时间戳一律取 12:00Z（本地东八区=当日 20:00），使本地日历日键与日期部分一致，
// 规避 UTC 偏移导致的日期漂移。
// ============================================================

process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it } from 'vitest'
import {
  ageLabel,
  collectMemories,
  excerptToMemory,
  hashSeed,
  pastMemories,
  photoToMemory,
  pickDailyReview,
  pickRoam,
  recallStats,
  seededShuffle,
  DAILY_REVIEW_COUNT,
} from '../recall'
import type { Excerpt } from '../../reading/reading-content'
import type { PhotoEntry } from '../../anchor/photo-diary'

function ex(over: Partial<Excerpt> = {}): Excerpt {
  return {
    id: 'e1',
    source: '《心流》',
    text: '专注是幸福的源泉',
    note: '',
    createdAt: '2026-08-20T12:00:00.000Z',
    ...over,
  }
}

function ph(over: Partial<PhotoEntry> = {}): PhotoEntry {
  return {
    id: 'p1',
    date: '2026-08-20',
    images: ['FULL'],
    thumbs: ['THUMB'],
    captions: [''],
    caption: '',
    createdAt: '2026-08-20T12:00:00.000Z',
    ...over,
  }
}

describe('记忆回廊 · 归一化', () => {
  it('摘录 → 记忆：映射 key/kind/date/title/text/note/color', () => {
    const m = excerptToMemory(ex({ id: 'e9', note: '我的随记', color: '#f0c040' }))
    expect(m.key).toBe('excerpt:e9')
    expect(m.kind).toBe('excerpt')
    expect(m.date).toBe('2026-08-20')
    expect(m.title).toBe('《心流》')
    expect(m.text).toBe('专注是幸福的源泉')
    expect(m.note).toBe('我的随记')
    expect(m.color).toBe('#f0c040')
  })

  it('照片 → 记忆：取首图缩略图与原图，说明回落 captions[0]', () => {
    const m = photoToMemory(ph({ caption: '', captions: ['', '图注二'] }))
    expect(m.key).toBe('photo:p1')
    expect(m.kind).toBe('photo')
    expect(m.date).toBe('2026-08-20')
    expect(m.thumb).toBe('THUMB')
    expect(m.src).toBe('FULL')
    expect(m.text).toBe('图注二')
  })

  it('照片 → 记忆：整条 caption 优先于逐图 captions', () => {
    const m = photoToMemory(ph({ caption: '整条说明', captions: ['逐图'] }))
    expect(m.text).toBe('整条说明')
  })
})

describe('记忆回廊 · 汇总与过滤', () => {
  it('collectMemories 合并两类并按日期倒序，剔除空内容项', () => {
    const out = collectMemories(
      [
        ex({ id: 'e_old', createdAt: '2026-01-01T12:00:00.000Z' }),
        ex({ id: 'e_empty', text: '', note: '' }),
      ],
      [ph({ id: 'p_new', date: '2026-09-09', createdAt: '2026-09-09T12:00:00.000Z' })],
    )
    expect(out.map(m => m.key)).toEqual(['photo:p_new', 'excerpt:e_old'])
  })

  it('pastMemories 只保留今天之前的旧记忆（今天与未来均排除）', () => {
    const mems = collectMemories(
      [ex({ id: 'e_past', createdAt: '2026-08-01T12:00:00.000Z' })],
      [
        ph({ id: 'p_today', date: '2026-10-04', createdAt: '2026-10-04T12:00:00.000Z' }),
        ph({ id: 'p_future', date: '2026-11-01', createdAt: '2026-11-01T12:00:00.000Z' }),
      ],
    )
    const past = pastMemories(mems, '2026-10-04')
    expect(past.map(m => m.key)).toEqual(['excerpt:e_past'])
  })
})

describe('记忆回廊 · 年龄标签', () => {
  it('按天/周/月/年分桶', () => {
    expect(ageLabel('2026-10-04', '2026-10-04')).toBe('今天')
    expect(ageLabel('2026-10-03', '2026-10-04')).toBe('昨天')
    expect(ageLabel('2026-10-01', '2026-10-04')).toBe('3 天前')
    expect(ageLabel('2026-09-24', '2026-10-04')).toBe('1 周前')
    expect(ageLabel('2026-08-25', '2026-10-04')).toBe('1 个月前')
    expect(ageLabel('2025-10-04', '2026-10-04')).toBe('1 年前')
  })

  it('非法日期返回空串', () => {
    expect(ageLabel('', '2026-10-04')).toBe('')
    expect(ageLabel('bad', '2026-10-04')).toBe('')
  })
})

describe('记忆回廊 · 确定性抽样', () => {
  it('hashSeed 对同一输入稳定', () => {
    expect(hashSeed('daily:2026-10-04')).toBe(hashSeed('daily:2026-10-04'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
  })

  it('seededShuffle 同种子同结果、为原数组排列且不改入参', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = seededShuffle(src, 12345)
    const b = seededShuffle(src, 12345)
    expect(a).toEqual(b)
    expect([...a].sort((x, y) => x - y)).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('pickDailyReview 同日稳定、条数受限、仅取旧记忆', () => {
    const mems = collectMemories(
      Array.from({ length: 10 }, (_, i) =>
        ex({ id: `e${i}`, createdAt: `2026-0${(i % 9) + 1}-10T12:00:00.000Z` }),
      ),
      [ph({ id: 'p_today', date: '2026-10-04', createdAt: '2026-10-04T12:00:00.000Z' })],
    )
    const a = pickDailyReview(mems, '2026-10-04', 4)
    const b = pickDailyReview(mems, '2026-10-04', 4)
    expect(a.map(m => m.key)).toEqual(b.map(m => m.key))
    expect(a.length).toBe(4)
    expect(a.every(m => m.kind === 'excerpt')).toBe(true)
  })

  it('pickDailyReview 跨日会换一批（多种子覆盖多条目）', () => {
    const mems = collectMemories(
      Array.from({ length: 12 }, (_, i) =>
        ex({ id: `e${i}`, createdAt: `2026-0${(i % 9) + 1}-10T12:00:00.000Z` }),
      ),
      [],
    )
    const seen = new Set<string>()
    for (let d = 1; d <= 20; d++) {
      const key = `2026-11-${String(d).padStart(2, '0')}`
      for (const m of pickDailyReview(mems, key, 3)) seen.add(m.key)
    }
    expect(seen.size).toBeGreaterThan(3)
  })

  it('pickDailyReview 无旧记忆时返回空数组', () => {
    expect(pickDailyReview([], '2026-10-04', DAILY_REVIEW_COUNT)).toEqual([])
  })
})

describe('记忆回廊 · 随机漫游', () => {
  const mems = collectMemories(
    [
      ex({ id: 'e1', createdAt: '2026-08-01T12:00:00.000Z' }),
      ex({ id: 'e2', createdAt: '2026-08-02T12:00:00.000Z' }),
      ex({ id: 'e3', createdAt: '2026-08-03T12:00:00.000Z' }),
    ],
    [],
  )

  it('注入随机源后结果确定（池按日期倒序）', () => {
    expect(pickRoam(mems, '2026-10-04', undefined, () => 0)?.key).toBe('excerpt:e3')
    expect(pickRoam(mems, '2026-10-04', undefined, () => 0.99)?.key).toBe('excerpt:e1')
  })

  it('excludeKey 避免连续重复', () => {
    const picked = pickRoam(mems, '2026-10-04', 'excerpt:e1', () => 0)
    expect(picked?.key).not.toBe('excerpt:e1')
  })

  it('无旧记忆时返回 null', () => {
    expect(pickRoam([], '2026-10-04')).toBeNull()
  })
})

describe('记忆回廊 · 统计', () => {
  it('统计总数/分类数与最早天数', () => {
    const mems = collectMemories(
      [
        ex({ id: 'e1', createdAt: '2026-09-01T12:00:00.000Z' }),
        ex({ id: 'e2', createdAt: '2026-09-02T12:00:00.000Z' }),
      ],
      [ph({ id: 'p1', date: '2026-08-01', createdAt: '2026-08-01T12:00:00.000Z' })],
    )
    const s = recallStats(mems, '2026-10-04')
    expect(s.total).toBe(3)
    expect(s.excerpts).toBe(2)
    expect(s.photos).toBe(1)
    expect(s.oldestDays).toBe(64)
  })
})
