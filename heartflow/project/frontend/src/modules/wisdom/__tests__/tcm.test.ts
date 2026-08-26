// ============================================================
// 中医经络穴位典籍引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  MERIDIANS,
  ACUPOINTS,
  CLASSIC_EXCERPTS,
  ACUPOINT_SONGS,
  listMeridians,
  meridianById,
  listAcupoints,
  acupointById,
  searchAcupoints,
  meridianClock,
  activeMeridianSlot,
  classicExcerpts,
  acupointSongs,
  useTcmFavorites,
  tcmInsights,
} from '../tcm'

describe('经络数据', () => {
  it('共 14 条经络（十二正经 + 任督二脉）', () => {
    expect(MERIDIANS).toHaveLength(14)
  })

  it('十二正经均有流注时辰与小时段，任督二脉无', () => {
    const regular = MERIDIANS.filter((m) => m.hours[0] >= 0)
    expect(regular).toHaveLength(12)
    const odd = MERIDIANS.filter((m) => m.hours[0] < 0)
    expect(odd.map((m) => m.id).sort()).toEqual(['cv', 'gv'])
  })

  it('十二正经流注小时段首尾相接覆盖 24 小时', () => {
    const regular = MERIDIANS.filter((m) => m.hours[0] >= 0)
    const sorted = [...regular].sort((a, b) => a.hours[0] - b.hours[0])
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i]
      const next = sorted[(i + 1) % sorted.length]
      const curEnd = cur.hours[1] <= cur.hours[0] ? cur.hours[1] + 24 : cur.hours[1]
      const nextStart = next.hours[0] < cur.hours[0] ? next.hours[0] + 24 : next.hours[0]
      expect(curEnd).toBe(nextStart)
    }
  })

  it('listMeridians 返回全部，meridianById 按 id 查找', () => {
    expect(listMeridians()).toHaveLength(14)
    expect(meridianById('lu')?.name).toBe('手太阴肺经')
    expect(meridianById('nope')).toBeUndefined()
  })
})

describe('穴位数据', () => {
  it('收录 40+ 个常用穴位', () => {
    expect(ACUPOINTS.length).toBeGreaterThanOrEqual(40)
  })

  it('每个穴位的经络 id 均有效', () => {
    for (const a of ACUPOINTS) {
      expect(meridianById(a.meridianId), `${a.name} 的经络 ${a.meridianId}`).toBeDefined()
    }
  })

  it('穴位 id 唯一', () => {
    const ids = ACUPOINTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('listAcupoints 支持按经络过滤', () => {
    expect(listAcupoints('lu').length).toBeGreaterThan(0)
    expect(listAcupoints('lu').every((a) => a.meridianId === 'lu')).toBe(true)
    expect(listAcupoints('none')).toHaveLength(0)
  })

  it('acupointById 查找', () => {
    expect(acupointById('li4')?.name).toBe('合谷')
    expect(acupointById('nope')).toBeUndefined()
  })

  it('searchAcupoints 支持穴名/拼音/代码/主治/经络检索', () => {
    expect(searchAcupoints('合谷').some((a) => a.id === 'li4')).toBe(true)
    expect(searchAcupoints('LI4').some((a) => a.id === 'li4')).toBe(true)
    expect(searchAcupoints('头痛').length).toBeGreaterThan(0)
    expect(searchAcupoints('手太阴').every((a) => a.meridianId === 'lu')).toBe(true)
    expect(searchAcupoints('')).toHaveLength(0)
  })
})

describe('子午流注', () => {
  it('meridianClock 恒返回 12 个时段', () => {
    expect(meridianClock(4)).toHaveLength(12)
    expect(meridianClock(0)).toHaveLength(12)
    expect(meridianClock(23)).toHaveLength(12)
  })

  it('寅时（3-5 点）从肺经开始', () => {
    const slots = meridianClock(4)
    expect(slots[0].period).toBe('寅时')
    expect(slots[0].meridian.id).toBe('lu')
  })

  it('子时（23-1 点）从胆经开始', () => {
    expect(meridianClock(23)[0].meridian.id).toBe('gb')
    expect(meridianClock(0)[0].meridian.id).toBe('gb')
  })

  it('丑时（1-3 点）从肝经开始', () => {
    expect(meridianClock(2)[0].meridian.id).toBe('lr')
  })

  it('activeMeridianSlot 返回当前经络', () => {
    expect(activeMeridianSlot(4)?.meridian.id).toBe('lu')
    expect(activeMeridianSlot(12)?.meridian.id).toBe('ht')
    expect(activeMeridianSlot(23)?.meridian.id).toBe('gb')
    expect(activeMeridianSlot(0)?.meridian.id).toBe('gb')
    expect(activeMeridianSlot(2)?.meridian.id).toBe('lr')
  })

  it('activeMeridianSlot 对负数小时归一化', () => {
    expect(activeMeridianSlot(-1)?.meridian.id).toBe('gb')
  })
})

describe('经典原文对照', () => {
  it('收录多条经典原文，且均含白话翻译', () => {
    expect(CLASSIC_EXCERPTS.length).toBeGreaterThanOrEqual(5)
    for (const c of CLASSIC_EXCERPTS) {
      expect(c.book).toBeTruthy()
      expect(c.original.length).toBeGreaterThan(0)
      expect(c.vernacular.length).toBeGreaterThan(0)
    }
  })

  it('classicExcerpts 返回全部', () => {
    expect(classicExcerpts()).toHaveLength(CLASSIC_EXCERPTS.length)
  })
})

describe('穴位歌诀', () => {
  it('收录四总穴歌等歌诀', () => {
    expect(ACUPOINT_SONGS.length).toBeGreaterThanOrEqual(4)
    expect(ACUPOINT_SONGS.some((s) => s.title === '四总穴歌')).toBe(true)
    expect(ACUPOINT_SONGS.some((s) => s.title === '八会穴歌')).toBe(true)
  })

  it('acupointSongs 返回全部', () => {
    expect(acupointSongs()).toHaveLength(ACUPOINT_SONGS.length)
  })
})

describe('收藏持久化', () => {
  it('toggleFavorite 收藏/取消收藏', () => {
    const fav = useTcmFavorites()
    const before = fav.isFavorite('li4')
    fav.toggleFavorite('li4')
    expect(fav.isFavorite('li4')).toBe(!before)
    fav.toggleFavorite('li4')
    expect(fav.isFavorite('li4')).toBe(before)
  })
})

describe('tcmInsights 洞察', () => {
  it('指出当前流注经络', () => {
    const insights = tcmInsights(4)
    expect(insights[0]).toContain('手太阴肺经')
    expect(insights[0]).toContain('寅时')
  })

  it('末行附医疗免责声明', () => {
    const insights = tcmInsights(12)
    expect(insights[insights.length - 1]).toContain('不构成医疗建议')
  })
})
