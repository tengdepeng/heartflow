// ============================================================
// 梦乡小筑 · 意象之镜测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Dream } from '../../../stores/dreamNook'
import {
  DREAM_OMENS,
  extractOmens,
  omensOfDream,
  omenFrequency,
  omenEchoPrefix,
  omenLine,
} from '../dream-omen'

function dream(content: string, tags: string[] = [], mood: Dream['mood'] = 'neutral'): Dream {
  return {
    id: 'x',
    title: '',
    content,
    mood,
    tags,
    at: new Date(2026, 7, 22, 12, 0, 0).toISOString(),
  }
}

describe('extractOmens', () => {
  it('识别「水」意象', () => {
    const hits = extractOmens('我梦见一片大海，浪很大')
    expect(hits.map(h => h.omen.id)).toContain('water')
  })

  it('识别「飞」意象', () => {
    const hits = extractOmens('我飞起来了，在云端')
    expect(hits.map(h => h.omen.id)).toContain('flying')
  })

  it('一段文本可命中多个意象', () => {
    const hits = extractOmens('我在考试，然后从悬崖坠落')
    const ids = hits.map(h => h.omen.id)
    expect(ids).toContain('exam')
    expect(ids).toContain('falling')
  })

  it('无命中返回空数组', () => {
    expect(extractOmens('今天吃了面条')).toEqual([])
  })

  it('matched 去重', () => {
    const hits = extractOmens('水，到处都是水，水漫上来')
    const water = hits.find(h => h.omen.id === 'water')
    expect(water).toBeDefined()
    expect(water!.matched).toEqual(['水'])
  })

  it('「死」不单独误命中（需组合词）', () => {
    expect(extractOmens('我心如死灰')).toHaveLength(0)
    expect(extractOmens('梦见一座坟墓')).toHaveLength(1)
  })
})

describe('omensOfDream', () => {
  it('合并内容与标签提取', () => {
    const hits = omensOfDream(dream('我梦见掉牙', ['镜子']))
    const ids = hits.map(h => h.omen.id)
    expect(ids).toContain('tooth')
    expect(ids).toContain('mirror')
  })
})

describe('omenFrequency', () => {
  it('跨多条统计高频意象并按次数降序', () => {
    const freq = omenFrequency([
      dream('梦见大海'),
      dream('又梦见水'),
      dream('梦见飞'),
    ])
    expect(freq[0]!.omen.id).toBe('water')
    expect(freq[0]!.count).toBe(2)
    expect(freq[1]!.omen.id).toBe('flying')
  })

  it('空列表返回空', () => {
    expect(omenFrequency([])).toEqual([])
  })
})

describe('omenEchoPrefix', () => {
  it('各情绪有对应回应', () => {
    expect(omenEchoPrefix('fear')).toContain('不安')
    expect(omenEchoPrefix('happy')).toContain('轻盈')
    expect(omenEchoPrefix('neutral')).toContain('意象')
  })
})

describe('omenLine', () => {
  it('拼出意象名 + 温和观照', () => {
    const hit = extractOmens('梦见大海')[0]!
    expect(omenLine(hit)).toContain('水')
    expect(omenLine(hit)).toContain('情绪')
  })
})

describe('DREAM_OMENS', () => {
  it('词库条目字段齐全且 id 唯一', () => {
    const ids = DREAM_OMENS.map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const o of DREAM_OMENS) {
      expect(o.name).toBeTruthy()
      expect(o.emoji).toBeTruthy()
      expect(o.keywords.length).toBeGreaterThan(0)
      expect(o.tone).toBeTruthy()
      expect(o.prompt).toBeTruthy()
    }
  })
})
