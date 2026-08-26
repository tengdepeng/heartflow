// ============================================================
// 释光阁 · 四束光 本地规则推理引擎 单元测试
// 纯函数、确定性、无随机、无网络。
// ============================================================
import { describe, it, expect } from 'vitest'
import { evaluateFourLights, LIGHT_ORDER, LIGHT_META, type FourLightsInput } from '../four-lights'

function emptyInput(): FourLightsInput {
  return {
    reflectionCount: 0,
    reflectionRecentCount: 0,
    meditationSessions: 0,
    meditationStreak: 0,
    focusSessions: 0,
    focusTagVariety: 0,
    focusModeVariety: 0,
    avgFocusDurationMin: 0,
    wordMirrorCount: 0,
    wordHistoryCount: 0,
  }
}

describe('evaluateFourLights 确定性规则引擎', () => {
  it('空输入时四束光均为 0 分、微弱，且产出洞察', () => {
    const states = evaluateFourLights(emptyInput())
    expect(states.length).toBe(4)
    expect(states.map((s) => s.key)).toEqual(LIGHT_ORDER)
    states.forEach((s) => {
      expect(s.score).toBe(0)
      expect(s.level).toBe('微弱')
      expect(s.insights.length).toBeGreaterThan(0)
      expect(LIGHT_META[s.key].label).toBe(s.label)
    })
  })

  it('反思数据提升前提之光分数', () => {
    const input = { ...emptyInput(), reflectionCount: 12, reflectionRecentCount: 5, wordMirrorCount: 3 }
    const states = evaluateFourLights(input)
    const premise = states.find((s) => s.key === 'premise')!
    expect(premise.score).toBeGreaterThan(0)
    expect(premise.insights.some((t) => t.includes('12 条反思'))).toBe(true)
  })

  it('专注标签/模式多样性提升框架之光', () => {
    const input = { ...emptyInput(), focusTagVariety: 5, focusModeVariety: 3, meditationSessions: 4 }
    const frame = evaluateFourLights(input).find((s) => s.key === 'frame')!
    expect(frame.score).toBeGreaterThan(0)
    expect(frame.insights.some((t) => t.includes('5 类标签'))).toBe(true)
  })

  it('素镜墙行为痕迹提升情感之光', () => {
    const input = { ...emptyInput(), wordHistoryCount: 8, reflectionRecentCount: 2, meditationStreak: 6 }
    const emotion = evaluateFourLights(input).find((s) => s.key === 'emotion')!
    expect(emotion.score).toBeGreaterThan(0)
    expect(emotion.insights.some((t) => t.includes('8 条行为痕迹'))).toBe(true)
  })

  it('多渠道记录提升缺席之光，并提示留意被忽略的部分', () => {
    const input = { ...emptyInput(), reflectionCount: 3, wordMirrorCount: 2, wordHistoryCount: 4, meditationSessions: 5, focusSessions: 6 }
    const absence = evaluateFourLights(input).find((s) => s.key === 'absence')!
    expect(absence.score).toBeGreaterThan(0)
    expect(absence.insights.some((t) => t.includes('5 个渠道'))).toBe(true)
  })

  it('分数被钳制在 0-100 区间', () => {
    const huge = { ...emptyInput(), reflectionCount: 9999, meditationSessions: 9999 }
    evaluateFourLights(huge).forEach((s) => {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(100)
    })
  })

  it('等级分段正确（微弱/微光/明亮/辉耀）', () => {
    const s0 = evaluateFourLights(emptyInput()).find((s) => s.key === 'premise')!
    expect(s0.level).toBe('微弱')

    const sHigh = evaluateFourLights({ ...emptyInput(), reflectionCount: 30, reflectionRecentCount: 10, wordMirrorCount: 10 }).find((s) => s.key === 'premise')!
    expect(sHigh.score).toBe(100)
    expect(sHigh.level).toBe('辉耀')
  })

  it('负数/非有限输入被安全归零，不抛错', () => {
    const bad = { ...emptyInput(), reflectionCount: -5, avgFocusDurationMin: NaN }
    const states = evaluateFourLights(bad)
    expect(states.every((s) => s.score === 0)).toBe(true)
  })
})
