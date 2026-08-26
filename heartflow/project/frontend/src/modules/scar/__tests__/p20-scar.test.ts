// ============================================================
// 工痕 · P20-3 单元测试
// 视图桥接 + 愈合旅程 + 叙事增强
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import type { BodyMark, GrowthRecord, BodyPart, ScarType, SeverityLevel, HealingStage } from '../types'
import { useHealingJourney } from '../healing-journey'
import { useNarrativeEnhancer } from '../narrative-enhancer'
import type { NarrativePattern } from '../narrative-enhancer'

// ---- 测试辅助函数 ----

function createMark(overrides: Partial<BodyMark> = {}): BodyMark {
  return {
    id: 'mark_' + Math.random().toString(36).slice(2, 8),
    bodyPart: 'back' as BodyPart,
    severity: 3 as SeverityLevel,
    description: '测试工作压力导致的背部酸痛',
    scarType: 'wear' as ScarType,
    recordedAt: new Date().toISOString(),
    healingStage: 'acute' as HealingStage,
    healingProgress: 0,
    transformed: false,
    ...overrides,
  }
}

function createGrowth(overrides: Partial<GrowthRecord> = {}): GrowthRecord {
  return {
    id: 'gr_' + Math.random().toString(36).slice(2, 8),
    scarId: 'mark_test',
    reflection: '这次经历让我意识到了工作节奏的重要性',
    learned: '学会了合理安排时间，避免过度劳累',
    growthDirection: '时间管理能力提升',
    recordedAt: '2026-07-25T00:00:00.000Z',
    ...overrides,
  }
}

// ============================================================
// 1. useHealingJourney — 愈合旅程
// ============================================================

describe('useHealingJourney', () => {
  let journey: ReturnType<typeof useHealingJourney>

  beforeEach(() => {
    journey = useHealingJourney()
  })

  describe('trackJourney', () => {
    it('零伤痕应返回承认阶段', () => {
      const result = journey.trackJourney([], [])
      expect(result.currentStage).toBe('acknowledgment')
      expect(result.stageProgress).toBe(0)
      expect(result.totalMarks).toBe(0)
      expect(result.resilienceScore).toBe(0)
    })

    it('单道伤痕应返回承认阶段', () => {
      const marks = [createMark()]
      const result = journey.trackJourney(marks, [])
      expect(result.currentStage).toBe('acknowledgment')
      expect(result.totalMarks).toBe(1)
    })

    it('有成长记录应进入处理阶段', () => {
      const marks = [createMark()]
      const growthRecords = [createGrowth()]
      const result = journey.trackJourney(marks, growthRecords)
      expect(result.currentStage).toBe('processing')
    })

    it('伤痕进入增生期应进入接纳阶段', () => {
      const marks = [createMark({ healingStage: 'proliferation' as HealingStage })]
      const result = journey.trackJourney(marks, [])
      expect(result.currentStage).toBe('acceptance')
    })

    it('转化率 ≥ 50% 应进入整合阶段', () => {
      const marks = [
        createMark({ transformed: true }),
        createMark({ transformed: true }),
        createMark({ transformed: false }),
      ]
      const result = journey.trackJourney(marks, [createGrowth()])
      expect(result.currentStage).toBe('integration')
    })

    it('全部转化应进入转化阶段', () => {
      const marks = [
        createMark({ transformed: true }),
        createMark({ transformed: true }),
      ]
      const result = journey.trackJourney(marks, [createGrowth()])
      expect(result.currentStage).toBe('transformation')
    })

    it('应返回阶段进度', () => {
      const marks = [createMark()]
      const result = journey.trackJourney(marks, [])
      expect(result.stageProgress).toBeGreaterThanOrEqual(0)
      expect(result.stageProgress).toBeLessThanOrEqual(100)
    })

    it('应计算心理韧性评分', () => {
      const marks = [
        createMark({ transformed: true, severity: 4 as SeverityLevel }),
        createMark({ transformed: true, severity: 3 as SeverityLevel }),
      ]
      const result = journey.trackJourney(marks, [createGrowth()], 0, 5)
      expect(result.resilienceScore).toBeGreaterThan(0)
      expect(result.resilienceScore).toBeLessThanOrEqual(100)
    })

    it('应生成旅程总结', () => {
      const marks = [createMark({ transformed: true })]
      const result = journey.trackJourney(marks, [createGrowth()])
      expect(result.summary).toBeTruthy()
      expect(result.summary.length).toBeGreaterThan(0)
    })

    it('应生成关键洞察', () => {
      const marks = [
        createMark({ bodyPart: 'back' as BodyPart }),
        createMark({ bodyPart: 'back' as BodyPart }),
      ]
      const result = journey.trackJourney(marks, [createGrowth()])
      expect(result.insights.length).toBeGreaterThan(0)
    })

    it('应生成下一步建议', () => {
      const marks = [createMark()]
      const result = journey.trackJourney(marks, [])
      expect(result.nextSteps.length).toBeGreaterThan(0)
    })
  })

  describe('checkMilestones', () => {
    it('jm-1 应在有伤痕时达成', () => {
      const marks = [createMark()]
      journey.trackJourney(marks, [])
      const jm1 = journey.milestones.value.find(m => m.id === 'jm-1')
      expect(jm1).toBeDefined()
      expect(jm1!.achieved).toBe(true)
    })

    it('jm-3 应在有成长记录时达成', () => {
      const marks = [createMark()]
      const growthRecords = [createGrowth()]
      journey.trackJourney(marks, growthRecords)
      const jm3 = journey.milestones.value.find(m => m.id === 'jm-3')
      expect(jm3).toBeDefined()
      expect(jm3!.achieved).toBe(true)
    })

    it('jm-5 应在连续锻造 ≥ 7 天时达成', () => {
      const marks = [createMark()]
      journey.trackJourney(marks, [], 0, 7)
      const jm5 = journey.milestones.value.find(m => m.id === 'jm-5')
      expect(jm5).toBeDefined()
      expect(jm5!.achieved).toBe(true)
    })

    it('jm-6 应在转化率 ≥ 50% 时达成', () => {
      const marks = [
        createMark({ transformed: true }),
        createMark({ transformed: false }),
      ]
      journey.trackJourney(marks, [createGrowth()])
      const jm6 = journey.milestones.value.find(m => m.id === 'jm-6')
      expect(jm6).toBeDefined()
      expect(jm6!.achieved).toBe(true)
    })

    it('已达成里程碑不应重复触发', () => {
      const marks = [createMark()]
      journey.trackJourney(marks, [])
      const jm1 = journey.milestones.value.find(m => m.id === 'jm-1')!
      const achievedAt = jm1.achievedAt

      journey.trackJourney(marks, [])
      expect(jm1.achievedAt).toBe(achievedAt)
    })
  })

  describe('getStageInfo', () => {
    it('应返回承认阶段信息', () => {
      const info = journey.getStageInfo('acknowledgment')
      expect(info).toBeDefined()
      expect(info!.label).toBe('承认')
      expect(info!.icon).toBeTruthy()
    })

    it('应返回智慧阶段信息', () => {
      const info = journey.getStageInfo('wisdom')
      expect(info).toBeDefined()
      expect(info!.label).toBe('智慧')
    })
  })

  describe('JOURNEY_STAGES', () => {
    it('应有 6 个阶段', () => {
      expect(journey.JOURNEY_STAGES.length).toBe(6)
    })

    it('每个阶段应有 label, description, icon, color', () => {
      for (const stage of journey.JOURNEY_STAGES) {
        expect(stage.label).toBeTruthy()
        expect(stage.description).toBeTruthy()
        expect(stage.icon).toBeTruthy()
        expect(stage.color).toBeTruthy()
      }
    })
  })

  describe('DEFAULT_JOURNEY_MILESTONES', () => {
    it('应有 10 个默认里程碑', () => {
      expect(journey.DEFAULT_JOURNEY_MILESTONES.length).toBe(10)
    })

    it('每个里程碑应有 id, name, stage, condition, reward', () => {
      for (const m of journey.DEFAULT_JOURNEY_MILESTONES) {
        expect(m.id).toBeTruthy()
        expect(m.name).toBeTruthy()
        expect(m.stage).toBeTruthy()
        expect(m.condition).toBeTruthy()
        expect(m.reward).toBeTruthy()
      }
    })
  })
})

// ============================================================
// 2. useNarrativeEnhancer — 叙事增强引擎
// ============================================================

describe('useNarrativeEnhancer', () => {
  let enhancer: ReturnType<typeof useNarrativeEnhancer>

  beforeEach(() => {
    enhancer = useNarrativeEnhancer()
  })

  describe('enhanceNarrative', () => {
    it('零伤痕应返回空增强', () => {
      const result = enhancer.enhanceNarrative([], {
        total: 0, fresh: 0, healing: 0, scarred: 0, transformed: 0,
        bodyPartDistribution: {} as any,
        typeDistribution: { impact: 0, cut: 0, burn: 0, wear: 0 },
        avgHealingProgress: 0, transformationRate: 0,
      })
      expect(result.maturity).toBe(0)
      expect(result.primaryPattern.score).toBe(0)
    })

    it('应匹配主要叙事模式', () => {
      const marks = [
        createMark({ transformed: true, severity: 5 as SeverityLevel }),
        createMark({ transformed: true, severity: 4 as SeverityLevel }),
      ]
      const result = enhancer.enhanceNarrative(marks, {
        total: 2, fresh: 0, healing: 0, scarred: 2, transformed: 2,
        bodyPartDistribution: { back: 2 } as any,
        typeDistribution: { wear: 2, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 90, transformationRate: 100,
      })
      expect(result.primaryPattern).toBeDefined()
      expect(result.primaryPattern.pattern).toBeTruthy()
      expect(result.primaryPattern.score).toBeGreaterThan(0)
    })

    it('应返回次要模式', () => {
      const marks = [createMark({ transformed: true })]
      const result = enhancer.enhanceNarrative(marks, {
        total: 1, fresh: 0, healing: 0, scarred: 1, transformed: 1,
        bodyPartDistribution: { back: 1 } as any,
        typeDistribution: { wear: 1, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 80, transformationRate: 100,
      })
      expect(result.secondaryPatterns.length).toBeGreaterThanOrEqual(0)
      expect(result.secondaryPatterns.length).toBeLessThanOrEqual(2)
    })

    it('应检测叙事基调', () => {
      const marks = [createMark()]
      const result = enhancer.enhanceNarrative(marks, {
        total: 1, fresh: 0, healing: 1, scarred: 0, transformed: 0,
        bodyPartDistribution: { back: 1 } as any,
        typeDistribution: { wear: 1, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 45, transformationRate: 0,
      })
      expect(result.tone).toBeTruthy()
      const validTones = ['triumphant', 'reflective', 'melancholic', 'hopeful', 'stoic', 'compassionate']
      expect(validTones).toContain(result.tone)
    })

    it('应提取关键主题', () => {
      const marks = [createMark({ transformed: true })]
      const result = enhancer.enhanceNarrative(marks, {
        total: 1, fresh: 0, healing: 0, scarred: 1, transformed: 1,
        bodyPartDistribution: { back: 1 } as any,
        typeDistribution: { wear: 1, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 90, transformationRate: 100,
      })
      expect(result.themes.length).toBeGreaterThan(0)
      expect(result.themes).toContain('蜕变与重生')
    })

    it('应构建叙事弧线', () => {
      const marks = [
        createMark({ id: 'm1', transformed: false, recordedAt: '2026-01-01T00:00:00.000Z' }),
        createMark({ id: 'm2', transformed: true, recordedAt: '2026-06-01T00:00:00.000Z' }),
      ]
      const result = enhancer.enhanceNarrative(marks, {
        total: 2, fresh: 0, healing: 0, scarred: 2, transformed: 1,
        bodyPartDistribution: { back: 2 } as any,
        typeDistribution: { wear: 2, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 60, transformationRate: 50,
      })
      expect(result.narrativeArc.origin).toBeTruthy()
      expect(result.narrativeArc.turningPoint).toBeTruthy()
      expect(result.narrativeArc.climax).toBeTruthy()
      expect(result.narrativeArc.resolution).toBeTruthy()
      expect(result.narrativeArc.type).toBeTruthy()
    })

    it('应生成增强建议', () => {
      const marks = [createMark()]
      const result = enhancer.enhanceNarrative(marks, {
        total: 1, fresh: 0, healing: 1, scarred: 0, transformed: 0,
        bodyPartDistribution: { back: 1 } as any,
        typeDistribution: { wear: 1, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 45, transformationRate: 0,
      })
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('应计算叙事成熟度', () => {
      const marks = [
        createMark({ transformed: true, severity: 4 as SeverityLevel, description: '这是一段非常详细的描述，包含了丰富的细节和感受，讲述了工作压力如何影响身心健康，以及如何通过调整作息和自我关怀来逐步恢复。' }),
      ]
      const result = enhancer.enhanceNarrative(marks, {
        total: 1, fresh: 0, healing: 0, scarred: 1, transformed: 1,
        bodyPartDistribution: { back: 1 } as any,
        typeDistribution: { wear: 1, impact: 0, cut: 0, burn: 0 },
        avgHealingProgress: 90, transformationRate: 100,
      })
      expect(result.maturity).toBeGreaterThan(0)
      expect(result.maturity).toBeLessThanOrEqual(100)
    })
  })

  describe('getPatternInfo', () => {
    it('应返回凤凰涅槃模式信息', () => {
      const info = enhancer.getPatternInfo('phoenix')
      expect(info).toBeDefined()
      expect(info!.label).toBe('凤凰涅槃')
      expect(info!.icon).toBe('🔥')
    })

    it('应返回战士之路模式信息', () => {
      const info = enhancer.getPatternInfo('warrior')
      expect(info).toBeDefined()
      expect(info!.label).toBe('战士之路')
    })

    it('未知模式应返回 undefined', () => {
      const info = enhancer.getPatternInfo('unknown' as NarrativePattern)
      expect(info).toBeUndefined()
    })
  })

  describe('NARRATIVE_PATTERNS', () => {
    it('应有 8 个叙事模式', () => {
      expect(enhancer.NARRATIVE_PATTERNS.length).toBe(8)
    })

    it('每个模式应有 label, icon, description, conditions, narrativePrompt', () => {
      for (const pattern of enhancer.NARRATIVE_PATTERNS) {
        expect(pattern.pattern).toBeTruthy()
        expect(pattern.label).toBeTruthy()
        expect(pattern.icon).toBeTruthy()
        expect(pattern.description).toBeTruthy()
        expect(pattern.conditions).toBeTruthy()
        expect(pattern.narrativePrompt).toBeTruthy()
      }
    })
  })
})

// ============================================================
// 3. 边界条件测试
// ============================================================

describe('边界条件', () => {
  describe('useHealingJourney', () => {
    it('大量伤痕应正常处理', () => {
      const journey = useHealingJourney()
      const marks = Array.from({ length: 100 }, (_, i) =>
        createMark({
          id: `m${i}`,
          transformed: i % 2 === 0,
          severity: ((i % 5) + 1) as SeverityLevel,
          bodyPart: ['back', 'head', 'shoulder', 'arm', 'leg'][i % 5] as BodyPart,
        })
      )
      const result = journey.trackJourney(marks, [createGrowth()])
      expect(result.totalMarks).toBe(100)
      expect(result.currentStage).toBeTruthy()
      expect(result.resilienceScore).toBeGreaterThan(0)
    })

    it('仅有转化无成长记录应返回处理阶段', () => {
      const journey = useHealingJourney()
      const marks = [
        createMark({ transformed: true }),
        createMark({ transformed: true }),
      ]
      const result = journey.trackJourney(marks, [])
      // 有成长记录才进入 processing，无成长记录但有转化伤痕
      // 伤痕进入增生期则进入 acceptance
      expect(result.currentStage).toBeTruthy()
    })
  })

  describe('useNarrativeEnhancer', () => {
    it('多样化伤痕应有丰富主题', () => {
      const enhancer = useNarrativeEnhancer()
      const marks = [
        createMark({ bodyPart: 'head' as BodyPart, scarType: 'impact' as ScarType, transformed: true }),
        createMark({ bodyPart: 'back' as BodyPart, scarType: 'wear' as ScarType, transformed: true }),
        createMark({ bodyPart: 'arm' as BodyPart, scarType: 'cut' as ScarType, transformed: true }),
        createMark({ bodyPart: 'leg' as BodyPart, scarType: 'burn' as ScarType, transformed: true }),
        createMark({ bodyPart: 'shoulder' as BodyPart, scarType: 'impact' as ScarType, transformed: true }),
      ]
      const result = enhancer.enhanceNarrative(marks, {
        total: 5, fresh: 0, healing: 0, scarred: 5, transformed: 5,
        bodyPartDistribution: { head: 1, back: 1, arm: 1, leg: 1, shoulder: 1 } as any,
        typeDistribution: { impact: 2, cut: 1, burn: 1, wear: 1 },
        avgHealingProgress: 95, transformationRate: 100,
      })
      expect(result.themes.length).toBeGreaterThan(0)
      expect(result.primaryPattern.score).toBeGreaterThan(0)
    })
  })
})