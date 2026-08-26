// ============================================================
// 安全岛 · 静修档案分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  sanctuaryOverview,
  retreatRhythm,
  sanctuaryGrowth,
  sanctuaryInsights,
} from '../sanctuary-analytics'
import type { SanctuaryLog, SanctuaryNote } from '../useSanctuary'

const NOW = new Date(2026, 7, 1, 12, 0, 0) // 2026-08-01 12:00
const DAY = 86_400_000

function mkLog(over: Partial<SanctuaryLog>): SanctuaryLog {
  return {
    id: over.id || `l${Math.random().toString(36).slice(2, 6)}`,
    enterAt: over.enterAt || '2026-07-31T10:00:00',
    exitAt: over.exitAt ?? null,
    durationSec: over.durationSec ?? 0,
    breathCount: over.breathCount ?? 0,
    notesReleased: over.notesReleased ?? 0,
  }
}

function at(daysAgo: number, hours = 10): string {
  return new Date(NOW.getTime() - daysAgo * DAY - hours * 0).toISOString()
}

describe('sanctuaryOverview', () => {
  it('空档案返回零值', () => {
    const s = sanctuaryOverview([])
    expect(s.totalVisits).toBe(0)
    expect(s.totalMinutes).toBe(0)
    expect(s.avgDurationSec).toBe(0)
    expect(s.settledRate).toBe(0)
    expect(s.activeDays14).toBe(0)
  })

  it('汇总停留/呼吸/便签与基础统计', () => {
    const logs = [
      mkLog({ enterAt: at(0), durationSec: 600, breathCount: 8, notesReleased: 2 }),
      mkLog({ enterAt: at(1), durationSec: 300, breathCount: 4, notesReleased: 0 }),
    ]
    const s = sanctuaryOverview(logs)
    expect(s.totalVisits).toBe(2)
    expect(s.totalSeconds).toBe(900)
    expect(s.totalMinutes).toBe(15)
    expect(s.avgDurationSec).toBe(450)
    expect(s.longestSec).toBe(600)
    expect(s.totalBreaths).toBe(12)
    expect(s.totalNotesReleased).toBe(2)
    expect(s.settledRate).toBe(100)
    expect(s.avgBreathsPerVisit).toBe(6)
  })

  it('只统计最近 14 天的活跃日', () => {
    const logs = [
      mkLog({ enterAt: at(1), durationSec: 60 }),
      mkLog({ enterAt: at(3), durationSec: 60 }),
      mkLog({ enterAt: at(20), durationSec: 60 }), // 超出 14 天
      mkLog({ enterAt: at(21), durationSec: 60 }), // 超出 14 天
    ]
    const s = sanctuaryOverview(logs, NOW)
    expect(s.totalVisits).toBe(4)
    expect(s.activeDays14).toBe(2)
  })
})

describe('retreatRhythm', () => {
  it('统计近 7 天次数与最近造访', () => {
    const logs = [
      mkLog({ enterAt: at(1) }),
      mkLog({ enterAt: at(3) }),
      mkLog({ enterAt: at(10) }),
    ]
    const r = retreatRhythm(logs, NOW)
    expect(r.weeklyVisits).toBe(2)
    expect(r.lastVisit !== null).toBe(true)
  })

  it('连续造访天数从今日回溯（今日已造访）', () => {
    const logs = [
      mkLog({ enterAt: at(0) }),
      mkLog({ enterAt: at(1) }),
      mkLog({ enterAt: at(2) }),
    ]
    const r = retreatRhythm(logs, NOW)
    expect(r.consecutiveDays).toBe(3)
  })

  it('今日未造访时从昨日回溯（昨日开始连续）', () => {
    // NOW 是 08-01 中午；构造 07-31（昨日）与 07-30（前天）各一次
    const logs = [
      mkLog({ enterAt: '2026-07-31T09:00:00' }),
      mkLog({ enterAt: '2026-07-30T09:00:00' }),
    ]
    const r = retreatRhythm(logs, NOW)
    expect(r.consecutiveDays).toBe(2)
  })

  it('取众数时段为偏好', () => {
    const logs = [
      mkLog({ enterAt: '2026-07-31T23:00:00' }),
      mkLog({ enterAt: '2026-07-30T22:00:00' }),
      mkLog({ enterAt: '2026-07-29T23:00:00' }),
      mkLog({ enterAt: '2026-07-28T10:00:00' }),
    ]
    const r = retreatRhythm(logs, NOW)
    expect(r.preferredHour).toBe(23)
  })
})

describe('sanctuaryGrowth', () => {
  it('空档案分数为 0', () => {
    const g = sanctuaryGrowth([], NOW)
    expect(g.score).toBe(0)
    expect(g.label).toBe('轻轻来过')
  })

  it('频繁而深沉的造访获得更高分数', () => {
    // 连续 7 天、每次 30 分钟 + 呼吸练习
    const logs: SanctuaryLog[] = []
    for (let i = 0; i < 7; i++) {
      logs.push(mkLog({ enterAt: at(i), durationSec: 1800, breathCount: 10, notesReleased: 1 }))
    }
    const g = sanctuaryGrowth(logs, NOW)
    expect(g.score).toBeGreaterThan(60)
    expect(g.label === '深耕静修' || g.label === '渐入静境').toBe(true)
  })
})

describe('sanctuaryInsights', () => {
  it('空档案给引导', () => {
    const list = sanctuaryInsights([], [], NOW)
    expect(list.length).toBe(1)
    expect(list[0]).toContain('空着')
  })

  it('连续造访给出节奏洞察', () => {
    const logs = [mkLog({ enterAt: at(0) }), mkLog({ enterAt: at(1) }), mkLog({ enterAt: at(2) })]
    const list = sanctuaryInsights(logs, [], NOW)
    expect(list.some((s) => s.includes('连续'))).toBe(true)
  })

  it('有呼吸与便签时给出累计提示', () => {
    const logs = [mkLog({ enterAt: at(0), breathCount: 8, notesReleased: 3, durationSec: 600 })]
    const notes: SanctuaryNote[] = [{ id: 'n1', text: '放下', at: at(0) }]
    const list = sanctuaryInsights(logs, notes, NOW, 10)
    expect(list.some((s) => s.includes('呼吸'))).toBe(true)
    expect(list.some((s) => s.includes('便签'))).toBe(true)
  })
})