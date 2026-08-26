// ============================================================
// 藏象阁 · 被动健康意象（#86）测试
// 覆盖：无数据占位 / 睡眠·运动·饮食·经络聚合 / 近7天窗口 / 确定性 / 中性 / 不抛出
// 纯函数、无 storage 依赖，无需 mock。
// ============================================================

import { describe, it, expect } from 'vitest'
import { derivePassiveHealthImagery } from '../passive-health-imagery'
import type { IPassiveBodyLog, IPassiveMeridianLog } from '../passive-health-imagery'

const BASE = '2026-08-12' // 基准日（非真实"今天"，保证时辰占位确定性）

function sleep(at: string, hours: number): IPassiveBodyLog {
  return { id: `s_${at}`, type: 'sleep', value: { hours }, at }
}
function exercise(at: string, minutes: number): IPassiveBodyLog {
  return { id: `e_${at}`, type: 'exercise', value: { minutes }, at }
}
function meal(at: string): IPassiveBodyLog {
  return { id: `m_${at}`, type: 'meal', value: { note: '餐' }, at }
}
function meridian(hour: number, feeling: string): IPassiveMeridianLog {
  return { hour, feeling, at: `${BASE}T${String(hour).padStart(2, '0')}:00:00Z` }
}

describe('无数据 → 确定性时辰占位', () => {
  it('完全无日志：返回单条中性占位（来源 neutral-placeholder，强度 50）', () => {
    const out = derivePassiveHealthImagery({ dateStr: BASE })
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('时辰')
    expect(out[0].source).toBe('neutral-placeholder')
    expect(out[0].intensity).toBe(50)
    // 中性时辰占位：呈现当令经络 + 静养提示（不评判、不编造健康结论）
    expect(out[0].summary).toMatch(/^当前 .+ 经当令，顺应时辰静养即可。$/)
  })

  it('空数组：同样返回占位', () => {
    const out = derivePassiveHealthImagery({ bodyLogs: [], meridianLogs: [], dateStr: BASE })
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('时辰')
  })
})

describe('聚合本地日志', () => {
  it('睡眠：平均小时数正确（保留 1 位小数摘要）', () => {
    const out = derivePassiveHealthImagery({
      bodyLogs: [sleep('2026-08-10T23:00:00Z', 7), sleep('2026-08-09T23:00:00Z', 8)],
      dateStr: BASE,
    })
    const sig = out.find(s => s.key === '睡眠')
    expect(sig).toBeDefined()
    expect(sig!.source).toBe('local-logs')
    expect(sig!.summary).toContain('7.5')
    expect(sig!.intensity).toBeGreaterThan(0)
    expect(sig!.intensity).toBeLessThanOrEqual(100)
  })

  it('运动：仅计入近 7 天窗口内的记录', () => {
    const inWindow = exercise('2026-08-10T08:00:00Z', 30)
    const outWindow = exercise('2026-08-01T08:00:00Z', 999) // 超出 7 天
    const out = derivePassiveHealthImagery({
      bodyLogs: [inWindow, outWindow],
      dateStr: BASE,
    })
    const sig = out.find(s => s.key === '运动')
    expect(sig).toBeDefined()
    expect(sig!.summary).toContain('30') // 仅 30 分钟入账
    expect(sig!.summary).not.toContain('999')
  })

  it('饮食：近 7 天记录条数正确', () => {
    const out = derivePassiveHealthImagery({
      bodyLogs: [meal('2026-08-11T08:00:00Z'), meal('2026-08-08T12:00:00Z'), meal('2026-07-30T12:00:00Z')],
      dateStr: BASE,
    })
    const sig = out.find(s => s.key === '饮食')
    expect(sig).toBeDefined()
    expect(sig!.summary).toContain('2 条') // 仅 2 条在近 7 天
  })

  it('经络：良/一般/不适分布进入摘要，不评判', () => {
    const out = derivePassiveHealthImagery({
      meridianLogs: [meridian(7, 'good'), meridian(9, 'good'), meridian(11, 'bad')],
      dateStr: BASE,
    })
    const sig = out.find(s => s.key === '经络')
    expect(sig).toBeDefined()
    expect(sig!.source).toBe('meridian')
    expect(sig!.summary).toContain('不适 1 条')
    expect(sig!.summary).toContain('2 平和')
    // 中性：不应出现"建议/诊断/评估"等结论性措辞
    expect(sig!.summary).not.toMatch(/建议|诊断|评估|推荐|你应/)
  })

  it('综合：睡眠+运动+饮食+经络 多信号共存', () => {
    const out = derivePassiveHealthImagery({
      bodyLogs: [
        sleep('2026-08-10T23:00:00Z', 7),
        exercise('2026-08-10T08:00:00Z', 40),
        meal('2026-08-10T08:00:00Z'),
      ],
      meridianLogs: [meridian(7, 'good')],
      dateStr: BASE,
    })
    const keys = out.map(s => s.key)
    expect(keys).toEqual(expect.arrayContaining(['睡眠', '运动', '饮食', '经络']))
  })
})

describe('确定性 / 强度边界', () => {
  it('运动分钟极大 → 强度封顶 100（clamp）', () => {
    const out = derivePassiveHealthImagery({
      bodyLogs: [exercise('2026-08-10T08:00:00Z', 99999)],
      dateStr: BASE,
    })
    const sig = out.find(s => s.key === '运动')!
    expect(sig.intensity).toBe(100)
  })

  it('相同输入恒得相同输出（无随机）', () => {
    const input = {
      bodyLogs: [sleep('2026-08-10T23:00:00Z', 6.5), exercise('2026-08-10T08:00:00Z', 25)],
      dateStr: BASE,
    }
    expect(derivePassiveHealthImagery(input)).toEqual(derivePassiveHealthImagery(input))
  })
})

describe('健壮性：永不抛出', () => {
  it('value 缺失 / at 非法：返回数组不抛出', () => {
    expect(() => derivePassiveHealthImagery({
      bodyLogs: [{ id: 'x', type: 'sleep', value: undefined as any, at: 'not-a-date' }],
      dateStr: BASE,
    })).not.toThrow()
    const out = derivePassiveHealthImagery({
      bodyLogs: [{ id: 'x', type: 'sleep', value: undefined as any, at: 'not-a-date' }],
      dateStr: BASE,
    })
    expect(Array.isArray(out)).toBe(true)
  })

  it('入参为空对象：返回占位不抛出', () => {
    expect(() => derivePassiveHealthImagery()).not.toThrow()
    const out = derivePassiveHealthImagery()
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBeGreaterThanOrEqual(1)
  })
})
