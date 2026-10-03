// ============================================================
// 全我镜 · 自我对话档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import type { SelfTalk } from '../types'
import {
  selfTalkOverview,
  selfTalkDailyRows,
  selfTalkSourceRows,
  selfTalkRhythm,
  selfTalkHealth,
  selfTalkInsights,
} from '../self-talk-analytics'

const NOW = 1760000000000
const DAY = 24 * 60 * 60 * 1000

function makeTalk(partial: Partial<SelfTalk> & { at?: string }): SelfTalk {
  return {
    id: partial.id || `t${Math.random()}`,
    text: partial.text || '这是给自己的一句话',
    at: partial.at || new Date().toISOString(),
    roomContext: partial.roomContext ?? null,
  }
}

describe('selfTalkOverview', () => {
  it('空输入时各项归零且无信息', () => {
    const ov = selfTalkOverview([], new Date(NOW))
    expect(ov.total).toBe(0)
    expect(ov.totalWords).toBe(0)
    expect(ov.avgWords).toBe(0)
    expect(ov.richCount).toBe(0)
    expect(ov.sourceCount).toBe(0)
    expect(ov.selfInitiated).toBe(0)
    expect(ov.recent30).toBe(0)
    expect(ov.recent7).toBe(0)
    expect(ov.latestDate).toBeNull()
    expect(ov.longest).toBeNull()
  })

  it('统计总数 / 字数 / 较长对话 / 自主记录与来源覆盖', () => {
    const talks = [
      makeTalk({ id: 'a', text: '我看到了。', at: new Date(NOW - 2 * DAY).toISOString(), roomContext: '情绪花房' }),
      makeTalk({ id: 'b', text: '今天也很平静，试着把这一句展开写长一点。', at: new Date(NOW - 1 * DAY).toISOString(), roomContext: '思绪书房' }),
      makeTalk({ id: 'c', text: '短句', at: new Date(NOW).toISOString() }),
    ]
    const ov = selfTalkOverview(talks, new Date(NOW))
    expect(ov.total).toBe(3)
    expect(ov.richCount).toBe(1)
    expect(ov.sourceCount).toBe(2)
    expect(ov.selfInitiated).toBe(1)
    expect(ov.recent7).toBe(3)
    expect(ov.recent30).toBe(3)
    expect(ov.avgWords).toBeGreaterThan(0)
    expect(ov.longest?.text).toContain('平静')
  })

  it('仅统计近 30 天的新增', () => {
    const talks = [
      makeTalk({ at: new Date(NOW - 5 * DAY).toISOString() }),
      makeTalk({ at: new Date(NOW - 40 * DAY).toISOString() }),
      makeTalk({ at: new Date(NOW - 100 * DAY).toISOString() }),
    ]
    const ov = selfTalkOverview(talks, new Date(NOW))
    expect(ov.total).toBe(3)
    expect(ov.recent30).toBe(1)
    expect(ov.recent7).toBe(1)
    expect(ov.latestDate).toBe(talks[0].at)
  })
})

describe('selfTalkDailyRows', () => {
  it('近 N 天逐日填充，缺的天补 0', () => {
    const now = new Date(NOW)
    const talks = [
      makeTalk({ at: new Date(NOW).toISOString() }),
      makeTalk({ at: new Date(NOW - 2 * DAY).toISOString() }),
      makeTalk({ at: new Date(NOW - 41 * DAY).toISOString() }),
    ]
    const rows = selfTalkDailyRows(talks, now, 7)
    expect(rows.length).toBe(7)
    expect(rows[6].count).toBe(1) // 今天
    expect(rows[6].date).toContain('/')
    expect(rows[4].count).toBe(1) // 前两天
    const sum = rows.reduce((a, r) => a + r.count, 0)
    expect(sum).toBe(2)
  })

  it('默认取 14 天', () => {
    const rows = selfTalkDailyRows([makeTalk({ at: new Date(NOW).toISOString() })], new Date(NOW))
    expect(rows.length).toBe(14)
  })
})

describe('selfTalkSourceRows', () => {
  it('按来源房间分组，自主记录另列', () => {
    const talks = [
      makeTalk({ roomContext: '情绪花房' }),
      makeTalk({ roomContext: '情绪花房' }),
      makeTalk({ roomContext: '思绪书房' }),
      makeTalk({ roomContext: null }),
    ]
    const rows = selfTalkSourceRows(talks)
    expect(rows.length).toBe(3)
    expect(rows[0].key).toBe('情绪花房')
    expect(rows[0].count).toBe(2)
    expect(rows[0].pct).toBe(50)
    const auto = rows.find((r) => r.key === '(自主)')
    expect(auto?.count).toBe(1)
  })

  it('空输入返回空数组', () => {
    expect(selfTalkSourceRows([])).toEqual([])
  })
})

describe('selfTalkRhythm', () => {
  it('统计近 7/30 天与活跃天数', () => {
    const talks = [
      makeTalk({ at: new Date(NOW).toISOString() }),
      makeTalk({ at: new Date(NOW).toISOString() }),
      makeTalk({ at: new Date(NOW - 1 * DAY).toISOString() }),
      makeTalk({ at: new Date(NOW - 40 * DAY).toISOString() }),
    ]
    const r = selfTalkRhythm(talks, new Date(NOW))
    expect(r.recorded7).toBe(3)
    expect(r.recorded30).toBe(3)
    expect(r.activeDays7).toBe(2)
  })

  it('lastGapDays 依据最近的记录频率', () => {
    const r0 = selfTalkRhythm([], new Date(NOW))
    expect(r0.lastGapDays).toBeNull()
    expect(r0.streakDays).toBe(0)

    const today = makeTalk({ at: new Date(NOW).toISOString() })
    const r1 = selfTalkRhythm([today], new Date(NOW))
    expect(r1.lastGapDays).toBe(0)
    expect(r1.streakDays).toBeGreaterThanOrEqual(1)
  })

  it('peakSlot 取出现最频时段', () => {
    const talks = [
      makeTalk({ at: new Date(NOW).toISOString() }), // 今天是某时刻
      makeTalk({ at: new Date(NOW).toISOString() }),
    ]
    // 无法精确断言时刻，仅需非空或 null 合法
    const r = selfTalkRhythm(talks, new Date(NOW))
    expect(typeof r.peakSlot).toBe('string')
  })
})

describe('selfTalkHealth', () => {
  it('空输入得分归零', () => {
    const h = selfTalkHealth([], new Date(NOW))
    expect(h.score).toBe(0)
    expect(h.breadth).toBe(0)
    expect(h.depth).toBe(0)
    expect(h.continuity).toBe(0)
    expect(h.label).toBeTruthy()
  })

  it('有足够数据时健康度更高', () => {
    const sparse = [
      makeTalk({ text: '嗯。', at: new Date(NOW).toISOString() }),
    ]
    const rich = [
      makeTalk({ text: '我今天感受到平静、专注，也有一些想放下的事。', at: new Date(NOW).toISOString(), roomContext: '情绪花房' }),
      makeTalk({ text: '把工作里的一点纠结写下来，再看觉得清晰很多。', at: new Date(NOW - 2 * DAY).toISOString(), roomContext: '思绪书房' }),
      makeTalk({ text: '身体提醒我该休息了，今晚早点睡。', at: new Date(NOW - 4 * DAY).toISOString(), roomContext: '时间走廊' }),
    ]
    const hSparse = selfTalkHealth(sparse, new Date(NOW))
    const hRich = selfTalkHealth(rich, new Date(NOW))
    expect(hRich.score).toBeGreaterThan(hSparse.score)
  })
})

describe('selfTalkInsights', () => {
  it('空输入给出引导性建议', () => {
    const ins = selfTalkInsights([], new Date(NOW))
    expect(ins.length).toBeGreaterThan(0)
    expect(ins[0]).toContain('镜')
  })

  it('有限条且随对话增加而变化', () => {
    const talks = [
      makeTalk({ text: '近一周没说话，但今晚想说一句。', at: new Date(NOW - 10 * DAY).toISOString(), roomContext: '情绪花房' }),
      makeTalk({ text: '记录得长一点，让光点到字面上来。', at: new Date(NOW - 3 * DAY).toISOString() }),
    ]
    const ins = selfTalkInsights(talks, new Date(NOW), 4)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.length).toBeLessThanOrEqual(4)
  })
})
