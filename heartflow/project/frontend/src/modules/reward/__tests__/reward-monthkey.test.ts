// ============================================================
// 劳酬（reward）域 · 月键（闸门第 5 类形态 E）· 时区治理 INCR-466
//
// 缺陷背景：RewardRecord.at / recordedAt 是**跨设备存储的 UTC ISO 时间戳**
// （这个没错，不能改）。但「月视图 / 月报 / 预算 / 对账单」是用
// `r.at.slice(0, 7)` 从这条 UTC 串上硬切出「YYYY-MM」当**业务月键**的。
// 东八区下本地 00:00–08:00 发生的记账，UTC 上还停在**上个月**，
// ⇒ 月初凌晨的支出会被算进上个月，表现为「本月预算莫名没超 / 对账单少一行」。
//
// 2026-10-05 这批还顺带修掉一个自洽簇破损：上一批只把 reward 的日键
// 改成本地日历日，月键仍是 UTC，两者口径分裂（月过滤恒空）。故本批
// 把月键链路（模块 + BudgetAlertPanel/BudgetPanel/ExportPanel/
// MonthlyStatementPanel/WorklogExportPanel/Reward.vue/Vault.vue）一并打通。
//
// 官方口径：utils/time.ts 的 getLocalMonthKey()。
// 反向验证：把任一站点的 slice(0,7) 改回去，下面凌晨用例应转红。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey, getLocalMonthKey } from '../../../utils/time'
import { monthActivity } from '../daily-reminder'
import { useRewardMilestones } from '../milestones'
import type { RewardRecord as LedgerRecord } from '../types'
import { categorizeExpense } from '../budget-alert'
import { buildExportRows } from '../export'
import { monthStatement } from '../statement'
import { cardTrendStartMonth } from '../net-asset'
// ⚠️ 本域有两个同名 RewardRecord：./types 的是 recordedAt，./reward-list 的才是 at
import type { RewardRecord } from '../reward-list'

/** 本地某日某时 → UTC ISO 时间戳（本地 03:00 = UTC 前一天 19:00） */
function localDayISO(y: number, m: number, d: number, h: number, min = 0): string {
  return new Date(y, m - 1, d, h, min, 0).toISOString()
}

function rec(at: string, over: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: `r-${at}`,
    type: 'expense',
    category: 'tools',
    amount: 120,
    description: '凌晨记账',
    at,
    ...over,
  } as RewardRecord
}

function recLedger(recordedAt: string, over: Partial<LedgerRecord> = {}): LedgerRecord {
  return {
    id: `l-${recordedAt}`,
    type: 'expense',
    category: 'tools',
    amount: 120,
    description: '凌晨记账',
    recordedAt,
    ...over,
  } as LedgerRecord
}

describe('月键 · 本地日历月口径', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15（周日）10:00
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('getLocalMonthKey：本地月初 00:30 归本月，不能被 UTC 推到上月', () => {
    // 本地 2026-03-01 00:30 → UTC 2026-02-28 16:30，切 7 位会错成 2026-02
    expect(getLocalMonthKey(localDayISO(2026, 3, 1, 0, 30))).toBe('2026-03')
    // 本地月初 08:00 是日键分界，月键不受影响
    expect(getLocalMonthKey(localDayISO(2026, 3, 1, 8, 0))).toBe('2026-03')
    // 月末本地 23:30 归本月
    expect(getLocalMonthKey(localDayISO(2026, 2, 28, 23, 30))).toBe('2026-02')
  })

  it('getLocalMonthKey：非法输入返回空串，不产出 NaN-NaN', () => {
    expect(getLocalMonthKey('')).toBe('')
    expect(getLocalMonthKey('not-a-date')).toBe('')
    // 注意：传 undefined 会命中默认值 = new Date()，那是「取本月」而非非法输入
    expect(getLocalMonthKey(null as unknown as string)).toBe('')
  })

  it('monthActivity：月初凌晨的记账计入本月（月键与日键同源）', () => {
    const early = rec(localDayISO(2026, 3, 1, 0, 30))
    const act = monthActivity([early], '2026-03')
    expect(act.count).toBe(1)
    expect(act.activeDays).toBe(1)
    expect(act.byDay['2026-03-01']).toBe(-120)
  })

  it('monthActivity：月键必须走本地（UTC 月键过滤不到这条凌晨记录）', () => {
    const at = localDayISO(2026, 3, 1, 0, 30)
    // 缺陷根因：这条记录自身的 UTC 月是 2026-02（东八区 00:30 还没过 UTC 零点）
    expect(at.slice(0, 7)).toBe('2026-02')
    expect(monthActivity([rec(at)], at.slice(0, 7)).count).toBe(0) // 用 UTC 月过滤 → 漏
    expect(monthActivity([rec(at)], '2026-03').count).toBe(1) // 用本地月过滤 → 中
  })

  it('monthStatement：月初凌晨的支出计入本月对账单', () => {
    const st = monthStatement([rec(localDayISO(2026, 3, 1, 0, 30))], '2026-03')
    expect(st.count).toBe(1)
    expect(st.expense).toBe(120)
  })

  it('categorizeExpense：月初凌晨的支出计入本月类别聚合', () => {
    const out = categorizeExpense([rec(localDayISO(2026, 3, 1, 0, 30))], '2026-03')
    expect(out['tools']).toBe(120)
  })

  it('buildExportRows：scope=month 时按本地月过滤，月初凌晨不丢', () => {
    const rows = buildExportRows([rec(localDayISO(2026, 3, 1, 0, 30))], {
      scope: 'month',
      month: '2026-03',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].日期).toBe('2026-03-01')
  })

  it('cardTrendStartMonth：还款记录的月份取本地月（月初凌晨不该掉到上月）', () => {
    const card = {
      id: 'c1',
      name: '招行',
      kind: 'credit' as const,
      openingBalance: 0,
      repaymentDay: 10,
      repayments: [{ id: 'p1', amount: 500, at: localDayISO(2026, 3, 1, 0, 30) }],
    }
    // 若改回 rp.at.slice(0, 7)，这里会算出 2026-02
    expect(cardTrendStartMonth(card, '2026-03-10')).toBe('2026-03')
  })

  it('自洽性：同一条凌晨记录，月键必与它所属的日键同月', () => {
    const at = localDayISO(2026, 3, 1, 0, 30)
    expect(getLocalMonthKey(at)).toBe(getLocalDateKey(new Date(at)).slice(0, 7))
  })
})

// ============================================================
// 双侧同基：月键链路的最后一环（比较侧）
// ============================================================
// getLocalMonthKey 只是「键生产」改对了还不够。紧邻的过滤仍在
// `r.recordedAt.startsWith(month)` —— 那是拿本地月前缀去前缀匹配一条
// **UTC ISO 串**：月初凌晨记录在 UTC 上还停在上月，startsWith 恒 false，
// 等于把刚修好的破损又造了一遍。正确写法是 `getLocalMonthKey(x) === m`。
describe('月键 · 双侧同基（比较侧）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15 10:00：与上面的日期块保持同一口径
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('getStats：月初凌晨的收支必须算进本月，不能被 UTC 前 7 位漏掉', () => {
    const at = localDayISO(2026, 3, 1, 0, 30) // UTC 2026-02-28T16:30Z
    // 判别度：这两行说明「老写法」必然漏 —— UTC 前 7 位 ≠ 本地月键
    expect(at.slice(0, 7)).toBe('2026-02')
    expect(getLocalMonthKey(at)).toBe('2026-03')
    expect(at.startsWith(getLocalMonthKey(at))).toBe(false)

    const ms = useRewardMilestones()
    ms.records.value = [
      recLedger(at, { type: 'income', category: 'salary', amount: 1000 }),
      recLedger(at, { type: 'expense', category: 'other-expense', amount: 200 }),
    ]
    const st = ms.getStats()
    // 月统计
    expect(st.monthIncome).toBe(1000)
    expect(st.monthExpense).toBe(200)
    // 月度趋势（最近 12 个月）必须落到 2026-03 这一格
    const cell = st.monthlyTrend.find((t) => t.month === '2026-03')
    expect(cell).toBeDefined()
    expect(cell?.income).toBe(1000)
    expect(cell?.expense).toBe(200)
    // 最近 12 个月的格子里，本月应排最后一格
    expect(st.monthlyTrend[st.monthlyTrend.length - 1].month).toBe('2026-03')
  })

  it('getStats：跨月的两条记录各归各月，不得互相串档', () => {
    const ms = useRewardMilestones()
    ms.records.value = [
      // 本地 2026-02-28 23:30 → UTC 2026-02-28T15:30Z，两口径同月（用于对照）
      recLedger(localDayISO(2026, 2, 28, 23, 30), { type: 'income', amount: 500 }),
      // 本地 2026-03-01 00:30 → UTC 2026-02-28T16:30Z，UTC 口径会串到上月
      recLedger(localDayISO(2026, 3, 1, 0, 30), { type: 'income', amount: 700 }),
    ]
    const st = ms.getStats()
    // 判别度：两条记录的 UTC 串都停在 2026-02（16:30Z / 15:30Z），
    // 老写法 `recordedAt.startsWith('2026-03')` 对两条都 false ⇒ 本月收入为 0。
    expect(st.monthIncome).toBe(700) // 只有本地口径属于 3 月 1 日 00:30 的那条
    expect(st.monthlyTrend.find((t) => t.month === '2026-02')?.income).toBe(500)
    expect(st.monthlyTrend.find((t) => t.month === '2026-02')?.expense).toBe(0)
    // uniqueDays 也走本地日键：两条 = 两个不同本地日历日
    expect(st.career.workingDays).toBe(2)
  })
})
