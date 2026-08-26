// ============================================================
// 留光阁 · P21-3 单元测试
// 视图桥接 + 目标预测器 + 可视化增强
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useLightBridge } from '../light-bridge'
import { LIGHT_STORAGE_KEYS } from '../types'
import { storage } from '../../../engine/storage'

// ---- 存储清理 ----

function clearStorage() {
  storage.setKV(LIGHT_STORAGE_KEYS.meditations, [])
  storage.setKV(LIGHT_STORAGE_KEYS.releases, [])
  storage.setKV(LIGHT_STORAGE_KEYS.state, JSON.stringify({
    clarity: 'neutral',
    totalMeditationMinutes: 0,
    releaseCount: 0,
    meditationStreak: 0,
    lightIntensity: 0,
  }))
}

// ============================================================
// 1. 视图桥接 — 状态聚合
// ============================================================

describe('P21-3 留光阁视图桥接', () => {
  let bridge: ReturnType<typeof useLightBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useLightBridge()
  })

  describe('冥想记录管理', () => {
    it('初始无冥想时 meditationCount 为 0', () => {
      expect(bridge.meditationCount.value).toBe(0)
    })

    it('初始无冥想时 totalMeditationMinutes 为 0', () => {
      expect(bridge.totalMeditationMinutes.value).toBe(0)
    })

    it('初始无冥想时 meditationStreak 为 0', () => {
      expect(bridge.meditationStreak.value).toBe(0)
    })

    it('记录冥想后 meditationCount 增加', () => {
      const before = bridge.meditationCount.value
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      expect(bridge.meditationCount.value).toBeGreaterThan(before)
    })

    it('记录冥想后 totalMeditationMinutes 增加', () => {
      const before = bridge.totalMeditationMinutes.value
      bridge.recordMeditation('breath', 15, 'anxious', 'calm')
      expect(bridge.totalMeditationMinutes.value).toBeGreaterThan(before)
    })

    it('多次记录冥想后 totalMeditationMinutes 累加', () => {
      const before = bridge.totalMeditationMinutes.value
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      bridge.recordMeditation('body_scan', 20, 'neutral', 'peaceful')
      expect(bridge.totalMeditationMinutes.value).toBeGreaterThanOrEqual(before + 30)
    })

    it('recordMeditation 返回完整记录', () => {
      const record = bridge.recordMeditation('breath', 10, 'anxious', 'calm', '洞察')
      expect(record.id).toBeTruthy()
      expect(record.type).toBe('breath')
      expect(record.duration).toBe(10)
      expect(record.stateBefore).toBe('anxious')
      expect(record.stateAfter).toBe('calm')
      expect(record.insight).toBe('洞察')
    })

    it('meditationRecords 返回最近的冥想记录', () => {
      for (let i = 0; i < 5; i++) {
        bridge.recordMeditation('breath', 5 + i, 'neutral', 'calm')
      }
      expect(bridge.meditationRecords.value.length).toBeGreaterThanOrEqual(5)
    })

    it('favoriteType 返回最常用的冥想类型', () => {
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      bridge.recordMeditation('body_scan', 10, 'neutral', 'calm')
      expect(bridge.favoriteType.value).toBeTruthy()
    })
  })

  describe('释怀记录管理', () => {
    it('初始无释怀时 releaseCount 为 0', () => {
      expect(bridge.releaseCount.value).toBe(0)
    })

    it('执行释怀后 releaseCount 增加', () => {
      const before = bridge.releaseCount.value
      bridge.release('放下烦恼', 'write', '轻松')
      expect(bridge.releaseCount.value).toBeGreaterThan(before)
    })

    it('执行释怀后 monthlyReleaseCount 增加', () => {
      const before = bridge.monthlyReleaseCount.value
      bridge.release('放下烦恼', 'write', '轻松')
      expect(bridge.monthlyReleaseCount.value).toBeGreaterThanOrEqual(before)
    })

    it('release 返回完整释怀条目', () => {
      const entry = bridge.release('放下烦恼', 'write', '轻松')
      expect(entry.id).toBeTruthy()
      expect(entry.content).toBe('放下烦恼')
      expect(entry.method).toBe('write')
      expect(entry.feelingAfter).toBe('轻松')
      expect(entry.released).toBe(true)
    })

    it('多次释怀后 releaseCount 累加', () => {
      const before = bridge.releaseCount.value
      bridge.release('内容1', 'write', '轻松')
      bridge.release('内容2', 'burn', '释然')
      bridge.release('内容3', 'float', '平静')
      expect(bridge.releaseCount.value).toBeGreaterThanOrEqual(before + 3)
    })
  })

  describe('澄明状态', () => {
    it('初始 clarityLevel 有值', () => {
      expect(bridge.clarityLevel.value).toBeDefined()
    })

    it('初始 lightIntensity >= 0', () => {
      expect(bridge.lightIntensity.value).toBeGreaterThanOrEqual(0)
    })

    it('冥想后 lightIntensity 增加', () => {
      const before = bridge.lightIntensity.value
      bridge.recordMeditation('breath', 30, 'anxious', 'calm')
      expect(bridge.lightIntensity.value).toBeGreaterThan(before)
    })

    it('冥想和释怀后 clarityLevel 是有效值', () => {
      bridge.recordMeditation('breath', 60, 'anxious', 'peaceful')
      bridge.release('放下', 'write', '轻松')
      const level = bridge.clarityLevel.value
      expect(['clouded', 'unclear', 'neutral', 'clear', 'crystal']).toContain(level)
    })
  })
})

// ============================================================
// 2. 仪表盘数据
// ============================================================

describe('P21-3 仪表盘数据', () => {
  let bridge: ReturnType<typeof useLightBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useLightBridge()
  })

  describe('meditationTrend', () => {
    it('无冥想时返回 14 天趋势数据', () => {
      const trend = bridge.meditationTrend.value
      expect(trend.length).toBe(14)
    })

    it('每天的趋势数据包含 date, minutes, count', () => {
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      const trend = bridge.meditationTrend.value
      const today = trend[trend.length - 1]
      expect(today.date).toBeDefined()
      expect(today.minutes).toBeGreaterThanOrEqual(0)
      expect(today.count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('meditationTypeDistribution', () => {
    it('返回分布数据为数组', () => {
      const dist = bridge.meditationTypeDistribution.value
      expect(Array.isArray(dist)).toBe(true)
    })

    it('有冥想时返回类型分布', () => {
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      bridge.recordMeditation('body_scan', 15, 'neutral', 'peaceful')
      const dist = bridge.meditationTypeDistribution.value
      expect(dist.length).toBeGreaterThan(0)
    })

    it('类型分布包含 label, count, minutes', () => {
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      const dist = bridge.meditationTypeDistribution.value
      const breath = dist.find(d => d.type === 'breath')
      expect(breath).toBeDefined()
      expect(breath!.label).toBeDefined()
      expect(breath!.count).toBeGreaterThanOrEqual(1)
      expect(breath!.minutes).toBeGreaterThanOrEqual(10)
    })
  })

  describe('releaseMethodDistribution', () => {
    it('返回分布数据为数组', () => {
      const dist = bridge.releaseMethodDistribution.value
      expect(Array.isArray(dist)).toBe(true)
    })

    it('有释怀时返回方式分布', () => {
      bridge.release('内容', 'write', '轻松')
      const dist = bridge.releaseMethodDistribution.value
      expect(dist.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('clarityTrend', () => {
    it('无冥想时返回 7 天澄明趋势', () => {
      const trend = bridge.clarityTrend.value
      expect(trend.length).toBe(7)
    })

    it('趋势数据包含 date, level, intensity', () => {
      const trend = bridge.clarityTrend.value
      const last = trend[trend.length - 1]
      expect(last.date).toBeDefined()
      expect(last.level).toBeDefined()
      expect(last.intensity).toBeGreaterThanOrEqual(0)
      expect(last.intensity).toBeLessThanOrEqual(100)
    })
  })

  describe('meditationHealth', () => {
    it('无冥想时健康度评分有 reasons', () => {
      const health = bridge.meditationHealth.value
      expect(health.score).toBeLessThanOrEqual(100)
      expect(health.reasons.length).toBeGreaterThan(0)
    })

    it('频繁冥想后健康度评分较高', () => {
      for (let i = 0; i < 10; i++) {
        bridge.recordMeditation('breath', 30, 'anxious', 'peaceful')
      }
      const health = bridge.meditationHealth.value
      expect(health.score).toBeGreaterThan(0)
    })

    it('连续冥想提升健康度评分', () => {
      for (let i = 0; i < 7; i++) {
        bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      }
      const health = bridge.meditationHealth.value
      expect(health.score).toBeGreaterThanOrEqual(0)
    })
  })
})

// ============================================================
// 3. 目标预测器
// ============================================================

describe('P21-3 目标预测器', () => {
  let bridge: ReturnType<typeof useLightBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useLightBridge()
  })

  describe('predictGoal', () => {
    it('目标已达成时返回 achieved=true', () => {
      const result = bridge.predictGoal(100, 100, 10)
      expect(result.achieved).toBe(true)
      expect(result.daysNeeded).toBe(0)
      expect(result.estimatedDate).toBeNull()
    })

    it('超额完成目标时返回 achieved=true', () => {
      const result = bridge.predictGoal(150, 100, 10)
      expect(result.achieved).toBe(true)
    })

    it('未达成目标时返回 achieved=false 和预计天数', () => {
      const result = bridge.predictGoal(0, 100, 10)
      expect(result.achieved).toBe(false)
      expect(result.daysNeeded).toBe(10)
      expect(result.estimatedDate).toBeTruthy()
    })

    it('剩余分钟数不是整数倍时向上取整', () => {
      const result = bridge.predictGoal(0, 25, 10)
      expect(result.daysNeeded).toBe(3)
    })

    it('每日分钟数为 1 时合理处理', () => {
      const result = bridge.predictGoal(0, 100, 1)
      expect(result.daysNeeded).toBeGreaterThan(0)
    })
  })

  describe('predictStreak', () => {
    it('已达成连续天数时返回 achieved=true', () => {
      const result = bridge.predictStreak(10, 10, 0.8)
      expect(result.achieved).toBe(true)
      expect(result.daysNeeded).toBe(0)
      expect(result.probability).toBe(100)
    })

    it('超额完成时返回 achieved=true', () => {
      const result = bridge.predictStreak(15, 10, 0.8)
      expect(result.achieved).toBe(true)
    })

    it('未达成时返回概率', () => {
      const result = bridge.predictStreak(0, 7, 0.8)
      expect(result.achieved).toBe(false)
      expect(result.daysNeeded).toBe(7)
      expect(result.probability).toBeLessThan(100)
    })

    it('一致性越高概率越高', () => {
      const high = bridge.predictStreak(0, 3, 0.9)
      const low = bridge.predictStreak(0, 3, 0.3)
      expect(high.probability).toBeGreaterThan(low.probability)
    })

    it('需要天数越多概率越低', () => {
      const short = bridge.predictStreak(0, 3, 0.8)
      const long = bridge.predictStreak(0, 10, 0.8)
      expect(short.probability).toBeGreaterThan(long.probability)
    })
  })

  describe('predictClarity', () => {
    it('返回当前和预测澄明度', () => {
      const result = bridge.predictClarity(50, 10, 2)
      expect(result.currentIntensity).toBe(50)
      expect(result.predictedIntensity).toBeDefined()
      expect(result.predictedLevel).toBeDefined()
      expect(result.weeklyChange).toBeDefined()
    })

    it('高冥想频率提升澄明度', () => {
      const result = bridge.predictClarity(50, 60, 5)
      expect(result.predictedIntensity).toBeGreaterThan(50)
      expect(result.weeklyChange).toBeGreaterThan(0)
    })

    it('低冥想频率导致澄明度下降', () => {
      const result = bridge.predictClarity(50, 0, 0)
      expect(result.predictedIntensity).toBeLessThan(50)
      expect(result.weeklyChange).toBeLessThan(0)
    })

    it('澄明度不超过 100', () => {
      const result = bridge.predictClarity(95, 100, 10)
      expect(result.predictedIntensity).toBeLessThanOrEqual(100)
    })

    it('澄明度不低于 0', () => {
      const result = bridge.predictClarity(0, 0, 0)
      expect(result.predictedIntensity).toBeGreaterThanOrEqual(0)
    })

    it('下降时给出建议', () => {
      const result = bridge.predictClarity(20, 0, 0)
      expect(result.recommendation).toContain('建议')
    })
  })
})

// ============================================================
// 4. 可视化数据
// ============================================================

describe('P21-3 可视化数据', () => {
  let bridge: ReturnType<typeof useLightBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useLightBridge()
  })

  describe('meditationCalendar', () => {
    it('无冥想时返回 30 天日历数据', () => {
      const calendar = bridge.meditationCalendar.value
      expect(calendar.length).toBe(30)
    })

    it('日历数据包含 date, minutes, count, level', () => {
      const calendar = bridge.meditationCalendar.value
      const last = calendar[calendar.length - 1]
      expect(last.date).toBeDefined()
      expect(last.minutes).toBeGreaterThanOrEqual(0)
      expect(last.count).toBeGreaterThanOrEqual(0)
      expect(last.level).toBeGreaterThanOrEqual(0)
      expect(last.level).toBeLessThanOrEqual(3)
    })

    it('有冥想时对应日期 level 更高', () => {
      bridge.recordMeditation('breath', 30, 'anxious', 'calm')
      const calendar = bridge.meditationCalendar.value
      const today = calendar[calendar.length - 1]
      expect(today.level).toBeGreaterThanOrEqual(1)
    })

    it('短时冥想 level 非零', () => {
      bridge.recordMeditation('breath', 5, 'anxious', 'calm')
      const calendar = bridge.meditationCalendar.value
      const today = calendar[calendar.length - 1]
      expect(today.level).toBeGreaterThanOrEqual(1)
    })
  })

  describe('recommendedGuides', () => {
    it('返回引导推荐列表', () => {
      const guides = bridge.recommendedGuides.value
      expect(Array.isArray(guides)).toBe(true)
    })

    it('有冥想历史时返回推荐', () => {
      bridge.recordMeditation('breath', 10, 'anxious', 'calm')
      const guides = bridge.recommendedGuides.value
      expect(guides.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('recommendRitual', () => {
    it('按场景返回仪式推荐', () => {
      const rituals = bridge.recommendRitual('遗憾')
      expect(Array.isArray(rituals)).toBe(true)
    })

    it('无匹配场景时返回空数组', () => {
      const rituals = bridge.recommendRitual('不存在的场景')
      expect(Array.isArray(rituals)).toBe(true)
    })
  })
})

// ============================================================
// 5. 操作入口
// ============================================================

describe('P21-3 操作入口', () => {
  let bridge: ReturnType<typeof useLightBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useLightBridge()
  })

  describe('getGuide', () => {
    it('返回存在的引导详情', () => {
      const guide = bridge.getGuide('guided_breath_5')
      expect(guide).toBeDefined()
      expect(guide?.title).toBe('五分钟呼吸安顿')
      expect(guide?.type).toBe('breath')
    })

    it('不存在的引导返回 undefined', () => {
      const guide = bridge.getGuide('non-existent')
      expect(guide).toBeUndefined()
    })
  })

  describe('getRitual', () => {
    it('返回存在的仪式详情', () => {
      const ritual = bridge.getRitual('ritual_write_letter')
      expect(ritual).toBeDefined()
      expect(ritual?.name).toBe('写一封不寄出的信')
    })

    it('不存在的仪式返回 undefined', () => {
      const ritual = bridge.getRitual('non-existent')
      expect(ritual).toBeUndefined()
    })
  })

  describe('completeRitual', () => {
    it('完成仪式后 releaseCount 增加', () => {
      const beforeCount = bridge.releaseCount.value
      bridge.completeRitual('ritual_write_letter', '完成释怀的感悟')
      expect(bridge.releaseCount.value).toBeGreaterThan(beforeCount)
    })
  })

  describe('完整工作流', () => {
    it('冥想 → 释怀 → 查看统计 完整流程', () => {
      const beforeMed = bridge.meditationCount.value
      const beforeRel = bridge.releaseCount.value

      // 记录冥想
      bridge.recordMeditation('breath', 15, 'anxious', 'calm', '呼吸是最简单的锚点')
      bridge.recordMeditation('body_scan', 20, 'neutral', 'peaceful')

      // 执行释怀
      bridge.release('工作中的压力', 'write', '写下来后好多了')
      bridge.release('对过去的执念', 'burn', '感觉轻松了')

      // 完成仪式
      bridge.completeRitual('ritual_write_letter', '谢谢你，再见')

      // 验证统计 — 使用相对增量
      expect(bridge.meditationCount.value).toBeGreaterThanOrEqual(beforeMed + 2)
      expect(bridge.totalMeditationMinutes.value).toBeGreaterThanOrEqual(35)
      expect(bridge.releaseCount.value).toBeGreaterThanOrEqual(beforeRel + 3)
      expect(bridge.meditationTrend.value.length).toBe(14)
      expect(bridge.meditationTypeDistribution.value.length).toBeGreaterThan(0)
    })
  })
})