// ============================================================
// 本地注意力 · 数字健康模型 · 单元测试
// 覆盖：纯评估（确定性）、输入构建、持久化、感知→藏象阁 只读桥接。
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'

// ---- 模拟存储（隔离持久化逻辑） ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((key: string, def: any) => mockStore[key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import {
  evaluateAttention,
  buildLocalAttentionInput,
  deriveAttentionReport,
  recordAttentionSample,
  loadAttentionSamples,
  clearAttentionSamples,
  attentionToBodyWisdomSignal,
  ATTENTION_STORAGE_KEY,
} from '../attention-model'
import { createDefaultEnvironmentState, type EnvironmentState } from '../../perception'

const EMPTY_INPUT = {
  navigationCount: 0,
  focusMinutes: 0,
  idleMinutes: 0,
  screenAwake: true,
  isLateNight: false,
  activeWindowKnown: false,
  dateStr: '2026-01-01',
}

describe('attention-model · 纯评估（确定性）', () => {
  it('空输入 → 中性基线（沉寂 / 数字舒展）', () => {
    const r = evaluateAttention(EMPTY_INPUT)
    expect(r.score).toBe(14)
    expect(r.level).toBe('沉寂')
    expect(r.focusRatio).toBe(50)
    expect(r.wellbeingIndex).toBe(88)
    expect(r.fatigueSignal).toBe(10)
    expect(r.rhythmAlignment).toBe(85)
    expect(r.signals).toContain('整体数字状态舒展。')
  })

  it('高专注输入 → 注意力与专注占比升高', () => {
    const r = evaluateAttention({
      ...EMPTY_INPUT,
      navigationCount: 5,
      focusMinutes: 120,
    })
    expect(r.score).toBe(79)
    expect(r.level).toBe('专注')
    expect(r.focusRatio).toBe(88)
    expect(r.signals).toContain('今日已有约 120 分钟专注投入。')
  })

  it('深夜输入 → 疲劳升高、作息对齐下降', () => {
    const r = evaluateAttention({ ...EMPTY_INPUT, isLateNight: true })
    expect(r.fatigueSignal).toBe(62)
    expect(r.rhythmAlignment).toBe(20)
    expect(r.signals).toContain('检测到深夜使用，注意安排休息。')
  })

  it('长闲置输入 → 健康略降、疲劳略升并提示起身', () => {
    const r = evaluateAttention({ ...EMPTY_INPUT, idleMinutes: 60 })
    expect(r.wellbeingIndex).toBe(78)
    expect(r.fatigueSignal).toBe(28)
    expect(r.signals).toContain('已静置约 60 分钟，可起身活动。')
  })

  it('高频跳转输入 → 健康惩罚并提示被打散', () => {
    const r = evaluateAttention({ ...EMPTY_INPUT, navigationCount: 50 })
    expect(r.score).toBe(50)
    expect(r.level).toBe('平稳')
    expect(r.wellbeingIndex).toBe(74)
    expect(r.signals).toContain('今日应用内跳转较多，留意是否被打散。')
  })

  it('满输入 → 封顶 100（沉浸）', () => {
    const r = evaluateAttention({
      ...EMPTY_INPUT,
      navigationCount: 12,
      focusMinutes: 120,
    })
    expect(r.score).toBe(100)
    expect(r.level).toBe('沉浸')
  })

  it('负数 / NaN 输入安全降级（不产生 NaN）', () => {
    const r = evaluateAttention({
      navigationCount: NaN,
      focusMinutes: NaN,
      idleMinutes: NaN,
      screenAwake: true,
      isLateNight: false,
      activeWindowKnown: false,
      dateStr: '2026-01-01',
    })
    expect(Number.isFinite(r.score)).toBe(true)
    expect(r.score).toBe(14)
  })
})

describe('attention-model · 由感知层构建输入', () => {
  it('由 EnvironmentState + 本地信号正确映射', () => {
    const env: EnvironmentState = createDefaultEnvironmentState()
    env.deviceIdleMs = 120000
    env.hour = 23
    env.isScreenAwake = false
    env.activeApp = '心流工坊'

    const input = buildLocalAttentionInput(env, { navigationCount: 7, focusMinutes: 0 })
    expect(input.idleMinutes).toBe(2)
    expect(input.isLateNight).toBe(true)
    expect(input.screenAwake).toBe(false)
    expect(input.activeWindowKnown).toBe(true)
    expect(input.navigationCount).toBe(7)
    expect(input.dateStr).toBe(getLocalDateKey())
  })

  it('deriveAttentionReport 便捷路径与纯评估一致', () => {
    const env: EnvironmentState = createDefaultEnvironmentState()
    const r = deriveAttentionReport(env, { navigationCount: 5, focusMinutes: 120 })
    const direct = evaluateAttention(buildLocalAttentionInput(env, { navigationCount: 5, focusMinutes: 120 }))
    expect(r).toEqual(direct)
    expect(r.level).toBe('专注')
  })
})

describe('attention-model · 持久化（本地，仅摘要）', () => {
  beforeEach(() => {
    mockStore[ATTENTION_STORAGE_KEY] = undefined
    vi.clearAllMocks()
  })

  it('写入 / 覆盖同日样本，保留最近 90 天', () => {
    const report = evaluateAttention(EMPTY_INPUT)
    recordAttentionSample(report)
    let samples = loadAttentionSamples()
    expect(samples.length).toBe(1)
    expect(samples[0].dateStr).toBe('2026-01-01')

    // 同日覆盖，数量不变
    recordAttentionSample({ ...report, score: 99 })
    samples = loadAttentionSamples()
    expect(samples.length).toBe(1)
    expect(samples[0].report.score).toBe(99)
    expect(mockSetKV).toHaveBeenCalledWith(ATTENTION_STORAGE_KEY, expect.any(Array))
  })

  it('清空样本', () => {
    recordAttentionSample(evaluateAttention(EMPTY_INPUT))
    clearAttentionSamples()
    expect(loadAttentionSamples()).toEqual([])
  })
})

describe('attention-model · 感知 → 藏象阁 只读桥接', () => {
  it('基线报告仅给出「用度」方向性信号', () => {
    const r = evaluateAttention(EMPTY_INPUT)
    const signals = attentionToBodyWisdomSignal(r)
    expect(signals.length).toBe(1)
    expect(signals[0].key).toBe('用度')
  })

  it('高疲劳 + 低节律 → 追加神志 / 作息 信号', () => {
    const signals = attentionToBodyWisdomSignal({
      ...evaluateAttention(EMPTY_INPUT),
      fatigueSignal: 60,
      rhythmAlignment: 40,
      score: 50,
    })
    const keys = signals.map(s => s.key)
    expect(keys).toContain('神志')
    expect(keys).toContain('作息')
    expect(keys).toContain('用度')
    expect(signals.length).toBe(3)
  })
})
