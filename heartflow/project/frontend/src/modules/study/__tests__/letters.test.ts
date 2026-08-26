// ============================================================
// 思绪书房 · 信笺模块测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { LetterBundle } from '../letters'
import {
  bundleMessageCount,
  bundleDateRange,
  lettersStat,
  distinctCorrespondents,
  searchLetterBundles,
} from '../letters'

function bundle(partial: Partial<LetterBundle> = {}): LetterBundle {
  return {
    id: 'b-1',
    correspondent: '阿岚',
    importedAt: '2026-08-01T00:00:00Z',
    messages: [
      { ts: '2026-08-01T09:00:00Z', from: 'me', text: '今天天气不错' },
      { ts: '2026-08-01T09:01:00Z', from: '阿岚', text: '是啊，出去走走' },
    ],
    ...partial,
  }
}

describe('letters', () => {
  it('bundleMessageCount 统计单束消息数', () => {
    expect(bundleMessageCount(bundle())).toBe(2)
    expect(bundleMessageCount(bundle({ messages: [] }))).toBe(0)
  })

  it('bundleDateRange 空束返回 null', () => {
    expect(bundleDateRange(bundle({ messages: [] }))).toBeNull()
  })

  it('bundleDateRange 返回首尾时间', () => {
    const r = bundleDateRange(bundle())
    expect(r).toEqual({ start: '2026-08-01T09:00:00Z', end: '2026-08-01T09:01:00Z' })
  })

  it('lettersStat 汇总全部信笺', () => {
    const s = lettersStat([
      bundle({ messages: [{ ts: '2026-05-01T00:00:00Z', from: 'a', text: '1' }] }),
      bundle({ messages: [{ ts: '2026-06-01T00:00:00Z', from: 'b', text: '2' }] }),
    ])
    expect(s.total).toBe(2)
    expect(s.messageCount).toBe(2)
    expect(s.dateRangeStart).toBe('2026-05-01T00:00:00Z')
    expect(s.dateRangeEnd).toBe('2026-06-01T00:00:00Z')
  })

  it('lettersStat 空列表返回零值', () => {
    const s = lettersStat([])
    expect(s.total).toBe(0)
    expect(s.dateRangeStart).toBeNull()
  })

  it('distinctCorrespondents 按人去重排序', () => {
    const list = [
      bundle({ correspondent: '阿岚' }),
      bundle({ correspondent: '小明' }),
      bundle({ correspondent: '阿岚' }),
    ]
    expect(distinctCorrespondents(list)).toEqual(['阿岚', '小明'])
  })

  it('searchLetterBundles 命中信对象或消息文本', () => {
    const list = [
      bundle({ id: 'a', correspondent: '阿岚', messages: [{ ts: 'x', from: 'me', text: '爬山' }] }),
      bundle({ id: 'b', correspondent: '小明' }),
    ]
    expect(searchLetterBundles(list, '阿岚').map(b => b.id)).toEqual(['a'])
    expect(searchLetterBundles(list, '爬山').map(b => b.id)).toEqual(['a'])
    expect(searchLetterBundles(list, '不存在')).toEqual([])
  })

  it('searchLetterBundles 空关键词返回原列表', () => {
    const list = [bundle()]
    expect(searchLetterBundles(list, '')).toBe(list)
  })
})