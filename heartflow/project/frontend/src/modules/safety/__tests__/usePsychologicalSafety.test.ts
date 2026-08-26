// ============================================================
// 心理安全 composable · 纯函数测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { detectMoodKeywords, getLightNote, getCrisisHotline } from '../composables/usePsychologicalSafety'

describe('detectMoodKeywords', () => {
  it('正常文本不触发任何情绪', () => {
    const result = detectMoodKeywords('今天天气不错，心情很好')
    expect(result.hasLowEnergy).toBe(false)
    expect(result.hasSelfHarm).toBe(false)
    expect(result.hasAnxiety).toBe(false)
    expect(result.hasSadness).toBe(false)
    expect(result.hasAnger).toBe(false)
    expect(result.matchedKeywords).toEqual([])
    expect(result.severity).toBe(0)
  })

  it('检测低能量词', () => {
    const result = detectMoodKeywords('今天好累，没力气')
    expect(result.hasLowEnergy).toBe(true)
    expect(result.matchedKeywords).toContain('累')
    expect(result.matchedKeywords).toContain('没力气')
  })

  it('检测自伤/危机词', () => {
    const result = detectMoodKeywords('我觉得撑不住了，很绝望')
    expect(result.hasSelfHarm).toBe(true)
    expect(result.matchedKeywords).toContain('撑不住')
    expect(result.matchedKeywords).toContain('绝望')
  })

  it('检测焦虑词', () => {
    const result = detectMoodKeywords('最近很焦虑，晚上睡不着')
    expect(result.hasAnxiety).toBe(true)
    expect(result.matchedKeywords).toContain('焦虑')
    expect(result.matchedKeywords).toContain('睡不着')
  })

  it('检测悲伤词', () => {
    const result = detectMoodKeywords('感到孤独和失落，很难过')
    expect(result.hasSadness).toBe(true)
    expect(result.matchedKeywords).toContain('孤独')
    expect(result.matchedKeywords).toContain('失落')
    expect(result.matchedKeywords).toContain('难过')
  })

  it('检测愤怒词', () => {
    const result = detectMoodKeywords('真的很生气，烦死了')
    expect(result.hasAnger).toBe(true)
    expect(result.matchedKeywords).toContain('生气')
    expect(result.matchedKeywords).toContain('烦')
  })

  it('混合情绪关键词', () => {
    const result = detectMoodKeywords('又累又焦虑，还很伤心')
    expect(result.hasLowEnergy).toBe(true)
    expect(result.hasAnxiety).toBe(true)
    expect(result.hasSadness).toBe(true)
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(3)
  })

  it('严重程度随匹配数量增加', () => {
    const result = detectMoodKeywords('累 疲惫 焦虑 紧张 难过 伤心 生气 愤怒')
    // 8 个匹配 * 1.5 = 12，但上限为 10
    expect(result.severity).toBe(10)
    expect(result.matchedKeywords.length).toBe(8)
  })

  it('英文关键词也支持', () => {
    const result = detectMoodKeywords('I feel so tired and depressed')
    expect(result.hasLowEnergy).toBe(true)
    expect(result.hasSadness).toBe(true)
    expect(result.matchedKeywords).toContain('tired')
    expect(result.matchedKeywords).toContain('depressed')
  })

  it('空字符串不触发任何情绪', () => {
    const result = detectMoodKeywords('')
    expect(result.matchedKeywords).toEqual([])
    expect(result.severity).toBe(0)
  })
})

describe('getLightNote', () => {
  it('危机词触发 crisis 类型', () => {
    const result = getLightNote({
      hasSelfHarm: true,
      hasLowEnergy: false,
      hasAnxiety: false,
      hasSadness: false,
      hasAnger: false,
      matchedKeywords: [],
      severity: 0,
    })
    expect(result.type).toBe('crisis')
    expect(result.message).toContain('心理援助热线')
  })

  it('高焦虑触发 calm 类型', () => {
    const result = getLightNote({
      hasSelfHarm: false,
      hasLowEnergy: false,
      hasAnxiety: true,
      hasSadness: false,
      hasAnger: false,
      matchedKeywords: [],
      severity: 7,
    })
    expect(result.type).toBe('calm')
    expect(result.message).toContain('深呼吸')
  })

  it('低能量触发 comfort 类型', () => {
    const result = getLightNote({
      hasSelfHarm: false,
      hasLowEnergy: true,
      hasAnxiety: false,
      hasSadness: false,
      hasAnger: false,
      matchedKeywords: [],
      severity: 2,
    })
    expect(result.type).toBe('comfort')
    expect(result.message).toContain('累了就歇一歇')
  })

  it('悲伤触发 comfort 类型', () => {
    const result = getLightNote({
      hasSelfHarm: false,
      hasLowEnergy: false,
      hasAnxiety: false,
      hasSadness: true,
      hasAnger: false,
      matchedKeywords: [],
      severity: 3,
    })
    expect(result.type).toBe('comfort')
    expect(result.message).toContain('难过')
  })

  it('愤怒触发 calm 类型', () => {
    const result = getLightNote({
      hasSelfHarm: false,
      hasLowEnergy: false,
      hasAnxiety: false,
      hasSadness: false,
      hasAnger: true,
      matchedKeywords: [],
      severity: 2,
    })
    expect(result.type).toBe('calm')
    expect(result.message).toContain('愤怒')
  })

  it('低焦虑触发 calm 类型', () => {
    const result = getLightNote({
      hasSelfHarm: false,
      hasLowEnergy: false,
      hasAnxiety: true,
      hasSadness: false,
      hasAnger: false,
      matchedKeywords: [],
      severity: 3,
    })
    expect(result.type).toBe('calm')
    expect(result.message).toContain('紧张')
  })

  it('无情绪时返回默认提醒', () => {
    const result = getLightNote({
      hasSelfHarm: false,
      hasLowEnergy: false,
      hasAnxiety: false,
      hasSadness: false,
      hasAnger: false,
      matchedKeywords: [],
      severity: 0,
    })
    expect(result.type).toBe('reminder')
    expect(result.message).toContain('照顾好自己')
  })

  it('危机优先于其他情绪', () => {
    const result = getLightNote({
      hasSelfHarm: true,
      hasLowEnergy: true,
      hasAnxiety: true,
      hasSadness: true,
      hasAnger: true,
      matchedKeywords: [],
      severity: 10,
    })
    expect(result.type).toBe('crisis')
  })
})

describe('getCrisisHotline', () => {
  it('返回热线列表', () => {
    const hotlines = getCrisisHotline()
    expect(hotlines.length).toBeGreaterThanOrEqual(1)
    expect(hotlines[0]).toHaveProperty('name')
    expect(hotlines[0]).toHaveProperty('phone')
    expect(hotlines[0]).toHaveProperty('hours')
  })

  it('所有热线 phone 非空', () => {
    const hotlines = getCrisisHotline()
    for (const h of hotlines) {
      expect(h.phone).toBeTruthy()
    }
  })
})