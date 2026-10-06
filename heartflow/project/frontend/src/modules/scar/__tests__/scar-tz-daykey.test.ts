// ============================================================
// scar（工痕）域 · 时区判别力测试（TZ 日键治理 · 日键第十五批）
//
// 覆盖 healing.ts 的锻造日键自洽簇：
//  - 145 行 recordForging 落库 date
//  - 212 行 getForgingStreak 桶键比对（与 r.date 同基）
// 另及 healing-predict 预测日（已愈/未来推算）与 healing-journey 预计完成日。
// 注意：与既有 scar-visualization-timezone.test.ts（narrative-template 域）不重叠。
//
// 判别力前提：假时刻 = 本地 2026-03-15 00:30（UTC 仍为 2026-03-14）。
// 本地 03-15 00:10 的锻造若按 UTC 落库会写成 03-14，
// 与 getForgingStreak 的今日桶错位 ⇒ 连续天数少算 1 天 ⇒ 用例转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { storage } from '../../../engine/storage'
import { SCAR_STORAGE_KEYS } from '../types'

/** 本地基准时刻：2026-03-15 00:30（UTC 仍为 03-14） */
const NOW = new Date(2026, 2, 15, 0, 30, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  // storage 为单例且 resetModules 不重置它，必须显式清空锻造 key，
  // 否则新 useScarHealing() 会从持久化 storage 读回上轮记录导致断言串味
  storage.setKV(SCAR_STORAGE_KEYS.FORGING, [])
})

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

describe('scar 域时区判别力 · 日键本地化', () => {
  it('前提：本机为 UTC+8，本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-03-14')
    expect(getLocalDateKey(new Date())).toBe('2026-03-15')
  })

  it('recordForging：落库 date 为本地日历日（凌晨记录不退回 UTC 前一天）', async () => {
    const { useScarHealing } = await import('../healing')
    const h = useScarHealing()
    await h.load() // 构造时 load() 是 fire-and-forget，须显式 await 否则读到空 ref
    const rec = await h.recordForging(3)
    expect(rec.date).toBe('2026-03-15')
  })

  it('getForgingStreak：今日凌晨的锻造记为 1 天（落库与桶键同基）', async () => {
    const { useScarHealing } = await import('../healing')
    const h = useScarHealing()
    await h.load()
    await h.recordForging(3)
    // UTC 口径下该记录会落成 03-14，而 03-14/03-13 无记录 ⇒ streak = 0
    expect(h.getForgingStreak()).toBe(1)
  })

  it('getForgingStreak：今日 + 昨日各一条记为 2 天（两侧同基才成立）', async () => {
    const { useScarHealing } = await import('../healing')
    const h = useScarHealing()
    await h.load()
    // 先造昨天（03-14 正午，本地与 UTC 同日，无判别力），再由 recordForging 造今天凌晨
    h.forgingRecords.value = [{
      id: 'y', count: 1, date: '2026-03-14', intensity: 2,
    }]
    await h.recordForging(3)
    // 若记录侧(145)与桶键侧(212)不同基，今日凌晨记录会落空 ⇒ streak 只有 1
    expect(h.getForgingStreak()).toBe(2)
  })

  it('recordForging：同一天重复锻造合并计数（今日键稳定不新增记录）', async () => {
    const { useScarHealing } = await import('../healing')
    const h = useScarHealing()
    await h.load()
    const a = await h.recordForging(2)
    const b = await h.recordForging(4)
    expect(a.date).toBe('2026-03-15')
    expect(b.date).toBe('2026-03-15')
    expect(b.count).toBe(2) // 同日合并而非两条记录
    expect(b.intensity).toBe(4) // 力度取较大者
  })
})
