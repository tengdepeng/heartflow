// ============================================================
// 逸趣阁 · 逸趣档案分析引擎测试
//
// 覆较为：概览 / 品类分布 / 心情种子成长 / 收藏节律 /
// 收藏健康（广度·深度·延续）/ 温和洞察。全纯函数，含 now。
// ============================================================

import { describe, expect, it } from 'vitest'
import type { PlayData } from '../types'
import type { TimeSeed as MoodSeed } from '../seeds'
import {
  moodSeedStage,
  seedEffectiveAge,
  playArchiveOverview,
  collectionTypeRows,
  moodSeedOverview,
  collectionRhythm,
  collectionHealth,
  playInsights,
  WATER_BOOST_MS,
} from '../play-analytics'

const DAY = 24 * 60 * 60 * 1000

function emptyData(): PlayData {
  return { games: [], toys: [], models: [], others: [] }
}

/** 基准 now：2026-08-23 12:00 */
const NOW = new Date('2026-08-23T12:00:00')

function game(id: string, name: string, platform: string, hours: number, daysAgo: number) {
  return { id, name, platform, hours, at: new Date(NOW.getTime() - daysAgo * DAY).toISOString() }
}
function toy(id: string, name: string, value: any, daysAgo: number) {
  return { id, name, note: '', value, at: new Date(NOW.getTime() - daysAgo * DAY).toISOString() }
}
function model(id: string, name: string, series: string, status: any, daysAgo: number) {
  return { id, name, series, status, at: new Date(NOW.getTime() - daysAgo * DAY).toISOString() }
}
function other(id: string, name: string, cat: string, daysAgo: number) {
  return { id, name, cat, at: new Date(NOW.getTime() - daysAgo * DAY).toISOString() }
}

function seed(id: string, mood: MoodSeed['mood'], createdAt: string, waterCount?: number) {
  const s: MoodSeed = { id, content: '', mood, createdAt }
  if (waterCount !== undefined) s.waterCount = waterCount
  return s
}

describe('逸趣档案分析·概览', () => {
  it('空数据概览各项为 0 或占位', () => {
    const ov = playArchiveOverview(emptyData(), [], NOW)
    expect(ov.totalItems).toBe(0)
    expect(ov.totalHours).toBe(0)
    expect(ov.platformCount).toBe(0)
    expect(ov.seriesCount).toBe(0)
    expect(ov.seedCount).toBe(0)
    expect(ov.recent30).toBe(0)
    expect(ov.topPlatform).toBe('—')
    expect(ov.topGame).toBe('—')
  })

  it('概览正确统计藏品与时长', () => {
    const data: PlayData = {
      games: [game('g1', '塞尔达', 'Switch', 80, 2), game('g2', '原神', 'PC', 30, 400)],
      toys: [toy('t1', '乐高', 'mint', 5)],
      models: [model('m1', '高达', 'GUNDAM', 'sealed', 60), model('m2', '独角兽', 'GUNDAM', 'display', 90)],
      others: [other('o1', '徽章', '周边', 10)],
    }
    const ov = playArchiveOverview(data, [seed('s1', 'happy', NOW.toISOString())], NOW)
    expect(ov.totalItems).toBe(6)
    expect(ov.totalHours).toBe(110)
    expect(ov.platformCount).toBe(2)
    expect(ov.seriesCount).toBe(1)
    expect(ov.seedCount).toBe(1)
    expect(ov.topGame).toBe('塞尔达')
    // 近7天：g1(2天) t1(5天) o1(10天? 否) → g1,t1 = 2；近30天再加 o1=3
    expect(ov.recent7).toBe(2)
    expect(ov.recent30).toBe(3)
  })
})

describe('逸趣档案分析·品类分布', () => {
  it('品类分布按数量降序且占比正确', () => {
    const data: PlayData = {
      games: [game('g1', 'A', 'PC', 10, 1), game('g2', 'B', 'PC', 5, 1)],
      toys: [toy('t1', 'C', 'mint', 1)],
      models: [],
      others: [other('o1', 'D', '周边', 1)],
    }
    const rows = collectionTypeRows(data)
    expect(rows.length).toBe(4)
    expect(rows[0].type).toBe('游戏')
    expect(rows[0].count).toBe(2)
    expect(rows[0].percentage).toBe(50)
    expect(rows.find(r => r.type === '玩具')!.percentage).toBe(25)
  })

  it('空数据占比为 0', () => {
    const rows = collectionTypeRows(emptyData())
    for (const r of rows) expect(r.percentage).toBe(0)
  })
})

describe('逸趣档案分析·心情种子成长', () => {
  it('moodSeedStage 依有效生长时间分档', () => {
    expect(moodSeedStage(seed('s1', 'happy', NOW.toISOString()), NOW.getTime())).toBe('seed')
    expect(moodSeedStage(seed('s2', 'happy', new Date(NOW.getTime() - 2 * DAY).toISOString()), NOW.getTime())).toBe('sprout')
    expect(moodSeedStage(seed('s3', 'calm', new Date(NOW.getTime() - 5 * DAY).toISOString()), NOW.getTime())).toBe('seedling')
    expect(moodSeedStage(seed('s4', 'sad', new Date(NOW.getTime() - 8 * DAY).toISOString()), NOW.getTime())).toBe('bloom')
  })

  it('浇水加速进入下阶段', () => {
    // 24h 内本应 seed，浇水 6 次（每次 4h）后有效生长 = 8h + 24h = 32h → sprout
    const s = seed('s5', 'excited', new Date(NOW.getTime() - 8 * 60 * 60 * 1000).toISOString(), 6)
    expect(seedEffectiveAge(s, NOW.getTime())).toBe((8 + 6 * 4) * 60 * 60 * 1000)
    expect(moodSeedStage(s, NOW.getTime())).toBe('sprout')
  })

  it('moodSeedOverview 统计阶段与情绪分布', () => {
    const seeds = [
      seed('a', 'happy', NOW.toISOString()),
      seed('b', 'calm', new Date(NOW.getTime() - 2 * DAY).toISOString()),
      seed('c', 'happy', new Date(NOW.getTime() - 9 * DAY).toISOString()),
    ]
    const o = moodSeedOverview(seeds, NOW)
    expect(o.rows.length).toBe(4)
    expect(o.rows.find(r => r.stage === 'seed')!.count).toBe(1)
    expect(o.rows.find(r => r.stage === 'sprout')!.count).toBe(1)
    expect(o.rows.find(r => r.stage === 'bloom')!.count).toBe(1)
    expect(o.moodDist.find(m => m.mood === '开心')!.count).toBe(2)
    expect(o.totalWater).toBe(0)
  })

  it('空种子返回全零分布', () => {
    const o = moodSeedOverview([], NOW)
    for (const r of o.rows) expect(r.count).toBe(0)
    expect(o.moodDist).toEqual([])
    expect(o.avgWater).toBe(0)
  })
})

describe('逸趣档案分析·收藏节律', () => {
  it('记录活跃天数与跨度', () => {
    const data: PlayData = {
      games: [game('g1', 'A', 'PC', 5, 1), game('g2', 'B', 'PC', 5, 30)],
      toys: [],
      models: [],
      others: [],
    }
    const r = collectionRhythm(data, [], NOW)
    expect(r.activeDays).toBe(2)
    // 跨度 1天 → 30天
    expect(r.spanDays).toBe(29)
    // 本月新增（NOW 为 8/23，g1 是 1 天前=8/22，本月；g2 30天前=7/24 → 非本月）
    expect(r.monthAdditions).toBe(1)
  })

  it('空数据无活跃', () => {
    const r = collectionRhythm(emptyData(), [], NOW)
    expect(r.activeDays).toBe(0)
    expect(r.spanDays).toBe(0)
    expect(r.monthAdditions).toBe(0)
    expect(r.monthsTracked).toBe(0)
  })
})

describe('逸趣档案分析·收藏健康', () => {
  it('健康分在 0-100 且结构完整', () => {
    const data: PlayData = {
      games: [game('g1', 'A', 'PC', 100, 1), game('g2', 'B', 'Switch', 100, 1)],
      toys: [toy('t1', 'C', 'mint', 1), toy('t2', 'D', 'mint', 1)],
      models: [model('m1', 'E', 'X', 'sealed', 1), model('m2', 'F', 'Y', 'sealed', 1)],
      others: [other('o1', 'G', '周边', 1)],
    }
    const seeds = [
      seed('a', 'happy', NOW.toISOString(), 1),
      seed('b', 'calm', new Date(NOW.getTime() - 2 * DAY).toISOString(), 1),
      seed('c', 'sad', new Date(NOW.getTime() - 9 * DAY).toISOString(), 1),
    ]
    const h = collectionHealth(data, seeds, NOW)
    expect(h.score).toBeGreaterThanOrEqual(0)
    expect(h.score).toBeLessThanOrEqual(100)
    expect(h.breadth).toBeGreaterThanOrEqual(0)
    expect(h.breadth).toBeLessThanOrEqual(40)
    expect(h.depth).toBeGreaterThanOrEqual(0)
    expect(h.depth).toBeLessThanOrEqual(35)
    expect(h.continuity).toBeGreaterThanOrEqual(0)
    expect(h.continuity).toBeLessThanOrEqual(25)
    expect(typeof h.label).toBe('string')
    expect(h.score).toBe(h.breadth + h.depth + h.continuity)
  })

  it('空收藏健康分为 0', () => {
    const h = collectionHealth(emptyData(), [], NOW)
    expect(h.score).toBe(0)
    expect(h.label).toBe('萌芽初探')
  })

  it('健康分越高标签越丰富', () => {
    const full: PlayData = {
      games: [game('g1', 'A', 'PC', 300, 1), game('g2', 'B', 'Switch', 200, 1), game('g3', 'C', 'Mobile', 200, 1)],
      toys: [toy('t1', 'C', 'mint', 1), toy('t2', 'D', 'mint', 1)],
      models: [model('m1', 'E', 'X', 'sealed', 1), model('m2', 'F', 'Y', 'sealed', 1), model('m3', 'G', 'Z', 'sealed', 1)],
      others: [other('o1', 'G', '周边', 1)],
    }
    const seeds = [
      seed('a', 'happy', NOW.toISOString(), 1),
      seed('b', 'calm', new Date(NOW.getTime() - 2 * DAY).toISOString(), 1),
    ]
    const h = collectionHealth(full, seeds, NOW)
    expect(h.score).toBeGreaterThan(30)
  })
})

describe('逸趣档案分析·温和洞察', () => {
  it('空收藏提示开始记录', () => {
    const ins = playInsights(emptyData(), [], NOW)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins[0].text).toContain('空白')
  })

  it('洞察数量不超过 4', () => {
    const data: PlayData = {
      games: [game('g1', 'A', 'PC', 400, 1), game('g2', 'B', 'Switch', 200, 1), game('g3', 'C', 'Mobile', 200, 1)],
      toys: [toy('t1', 'C', 'mint', 1)],
      models: [model('m1', 'E', 'X', 'sealed', 1)],
      others: [other('o1', 'G', '周边', 1)],
    }
    const seeds = [seed('a', 'happy', new Date(NOW.getTime() - 9 * DAY).toISOString(), 1)]
    const ins = playInsights(data, seeds, NOW)
    expect(ins.length).toBeLessThanOrEqual(4)
    expect(ins.length).toBeGreaterThan(0)
    for (const i of ins) {
      expect(typeof i.text).toBe('string')
      expect(['gentle', 'warm', 'flow']).toContain(i.tone)
    }
  })

  it('开花种子与近三十天活跃会触发对应洞察', () => {
    const data: PlayData = { games: [], toys: [], models: [], others: [other('o1', 'G', '周边', 1)] }
    const seeds = [seed('a', 'excited', new Date(NOW.getTime() - 9 * DAY).toISOString(), 1)]
    const texts = playInsights(data, seeds, NOW).map(i => i.text)
    expect(texts.some(t => t.includes('开出花'))).toBe(true)
    expect(texts.some(t => t.includes('近三十天'))).toBe(true)
  })

  it('WATER_BOOST_MS 常量为 4 小时', () => {
    expect(WATER_BOOST_MS).toBe(4 * 60 * 60 * 1000)
  })
})