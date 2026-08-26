// ============================================================
// 思绪书房 · 通话磁带模块测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Tape } from '../tapes'
import {
  formatTapeDuration,
  totalTapeDuration,
  tapeOverview,
  searchTapes,
  recentTapes,
} from '../tapes'

function tape(partial: Partial<Tape> = {}): Tape {
  return {
    id: 't-1',
    title: '与阿岚的谈话',
    participants: ['阿岚', '我'],
    durationSeconds: 125,
    importDate: '2026-08-01T00:00:00Z',
    transcript: '我们聊了很多最近的事',
    ...partial,
  }
}

describe('tapes', () => {
  it('formatTapeDuration 格式化为 mm′ss″', () => {
    expect(formatTapeDuration(0)).toBe('0′00″')
    expect(formatTapeDuration(125)).toBe('2′05″')
    expect(formatTapeDuration(3600)).toBe('60′00″')
  })

  it('totalTapeDuration 累加', () => {
    expect(totalTapeDuration([tape(), tape({ durationSeconds: 60 })])).toBe(185)
  })

  it('tapeOverview 统计数量/总时长/参与人/转录字数', () => {
    const o = tapeOverview([
      tape({ participants: ['阿岚', '我'], transcript: '你好世界' }),
      tape({ participants: ['小明'], transcript: '' }),
    ])
    expect(o.count).toBe(2)
    expect(o.totalSeconds).toBe(250)
    expect(o.totalLabel).toBe('4′10″')
    expect(o.participatedPeople).toEqual(['阿岚', '我', '小明']) // zh 拼音排序
    expect(o.transcriptWords).toBe(4)
  })

  it('tapeOverview 空列表返回零值', () => {
    const o = tapeOverview([])
    expect(o.count).toBe(0)
    expect(o.totalSeconds).toBe(0)
    expect(o.participatedPeople).toEqual([])
  })

  it('searchTapes 命中标题/参与者/转录', () => {
    const list = [
      tape({ id: 'a', title: '工作周会', participants: ['同事'] }),
      tape({ id: 'b', title: '家事', participants: ['阿岚'], transcript: '周末计划' }),
    ]
    expect(searchTapes(list, '周会').map(t => t.id)).toEqual(['a'])
    expect(searchTapes(list, '阿岚').map(t => t.id)).toEqual(['b'])
    expect(searchTapes(list, '周末').map(t => t.id)).toEqual(['b'])
    expect(searchTapes(list, 'xx')).toEqual([])
  })

  it('recentTapes 统计近30天导入', () => {
    const list = [
      tape({ id: 'a', importDate: '2026-08-10T00:00:00Z' }),
      tape({ id: 'b', importDate: '2026-06-01T00:00:00Z' }),
    ]
    const now = new Date('2026-08-20T00:00:00Z').getTime()
    expect(recentTapes(list, now)).toBe(1)
  })
})