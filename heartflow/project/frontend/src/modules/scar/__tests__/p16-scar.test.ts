// ============================================================
// 工痕 · P16-6 单元测试
// 伤痕因果链分析 + 愈合预测引擎
// ============================================================

import { describe, expect, it } from 'vitest'
import type { BodyMark, GrowthRecord, BodyPart, ScarType, SeverityLevel, HealingStage } from '../types'
import { useCausalChain } from '../causal-chain'
import { useHealingPredictor } from '../healing-predict'
import type { HealingBaseline } from '../healing-predict'

// ---- 测试辅助函数 ----

function createTestBodyMark(
  id: string,
  overrides: Partial<BodyMark> = {},
): BodyMark {
  return {
    id,
    bodyPart: 'back' as BodyPart,
    severity: 3 as SeverityLevel,
    description: '测试工作压力导致的背部酸痛',
    scarType: 'wear' as ScarType,
    recordedAt: '2026-07-15T00:00:00.000Z',
    healingStage: 'proliferation' as HealingStage,
    healingProgress: 45,
    transformed: false,
    ...overrides,
  }
}

function createTestGrowthRecord(
  id: string,
  scarId: string,
  overrides: Partial<GrowthRecord> = {},
): GrowthRecord {
  return {
    id,
    scarId,
    reflection: '这次经历让我意识到了工作节奏的重要性',
    learned: '学会了合理安排时间，避免过度劳累',
    growthDirection: '时间管理能力提升',
    recordedAt: '2026-07-25T00:00:00.000Z',
    ...overrides,
  }
}

// ============================================================
// 1. 伤痕因果链分析
// ============================================================

describe('P16-6 伤痕因果链分析', () => {
  const causalChain = useCausalChain()

  describe('buildCausalChain - 构建因果链', () => {
    it('应为基础伤痕构建包含触发→形成→应对的因果链', () => {
      const scar = createTestBodyMark('scar-1')
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      expect(chain.scar.id).toBe('scar-1')
      expect(chain.events.length).toBeGreaterThanOrEqual(3) // trigger + scar + coping
      expect(chain.links.length).toBeGreaterThanOrEqual(2)
      expect(chain.rootCauses.length).toBeGreaterThanOrEqual(1)
      expect(chain.depth).toBeGreaterThanOrEqual(2)
      expect(chain.generatedAt).toBeTruthy()
    })

    it('有 worklogId 的伤痕应包含影响事件', () => {
      const scar = createTestBodyMark('scar-2', { worklogId: 'wl-001' })
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      const impactEvent = chain.events.find(e => e.type === 'impact')
      expect(impactEvent).toBeDefined()
      expect(impactEvent!.scarId).toBe('scar-2')
      expect(chain.events.length).toBeGreaterThanOrEqual(4) // trigger + scar + impact + coping
    })

    it('有成长记录的伤痕应包含反思和成长事件', () => {
      const scar = createTestBodyMark('scar-3', { transformed: true })
      const growth = createTestGrowthRecord('gr-1', 'scar-3')
      const chain = causalChain.buildCausalChain(scar, [scar], [growth])

      const reflectionEvent = chain.events.find(e => e.type === 'reflection')
      const growthEvent = chain.events.find(e => e.type === 'growth')

      expect(reflectionEvent).toBeDefined()
      expect(growthEvent).toBeDefined()
      expect(growthEvent!.label).toContain('时间管理能力提升')
      expect(chain.growthOutcomes.length).toBeGreaterThanOrEqual(1)
    })

    it('多条成长记录应产生多个反思和成长事件', () => {
      const scar = createTestBodyMark('scar-4')
      const growth1 = createTestGrowthRecord('gr-a', 'scar-4', {
        reflection: '反思一：压力管理',
        learned: '学会了冥想',
        growthDirection: '情绪管理',
        recordedAt: '2026-07-20T00:00:00.000Z',
      })
      const growth2 = createTestGrowthRecord('gr-b', 'scar-4', {
        reflection: '反思二：边界设定',
        learned: '学会了拒绝',
        growthDirection: '自我保护',
        recordedAt: '2026-07-28T00:00:00.000Z',
      })

      const chain = causalChain.buildCausalChain(scar, [scar], [growth1, growth2])

      const reflections = chain.events.filter(e => e.type === 'reflection')
      const growths = chain.events.filter(e => e.type === 'growth')

      expect(reflections.length).toBe(2)
      expect(growths.length).toBe(2)
      expect(chain.growthOutcomes.length).toBe(2)
    })

    it('因果链应包含合理的链接强度', () => {
      const scar = createTestBodyMark('scar-5')
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      for (const link of chain.links) {
        expect(link.strength).toBeGreaterThan(0)
        expect(link.strength).toBeLessThanOrEqual(1)
        expect(link.description.length).toBeGreaterThan(0)
      }
    })

    it('事件应包含情感标签', () => {
      const scar = createTestBodyMark('scar-6', {
        description: '因为工作压力感到焦虑和疲惫，背部酸痛难忍',
      })
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      const triggerEvent = chain.events.find(e => e.type === 'trigger')
      expect(triggerEvent).toBeDefined()
      expect(triggerEvent!.emotions.length).toBeGreaterThan(0)
      // 应包含 fear (焦虑) 和 pain (痛)
      expect(triggerEvent!.emotions).toContain('fear')
      expect(triggerEvent!.emotions).toContain('pain')
    })
  })

  describe('buildAllChains - 批量构建', () => {
    it('应为所有伤痕构建因果链', () => {
      const scars = [
        createTestBodyMark('s1'),
        createTestBodyMark('s2'),
        createTestBodyMark('s3'),
      ]
      const chains = causalChain.buildAllChains(scars, [])

      expect(chains.length).toBe(3)
      chains.forEach(chain => {
        expect(chain.events.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('空伤痕列表应返回空数组', () => {
      const chains = causalChain.buildAllChains([], [])
      expect(chains).toEqual([])
    })
  })

  describe('analyzeChains - 因果链分析', () => {
    it('空链列表应返回零分析', () => {
      const analysis = causalChain.analyzeChains([])

      expect(analysis.totalScars).toBe(0)
      expect(analysis.chainCount).toBe(0)
      expect(analysis.avgDepth).toBe(0)
      expect(analysis.topRootCauses).toEqual([])
      expect(analysis.topGrowthDirections).toEqual([])
      expect(analysis.patterns).toEqual([])
      expect(analysis.transformationRate).toBe(0)
    })

    it('应正确统计根因类别', () => {
      const scars = [
        createTestBodyMark('s1', { description: '工作压力太大导致失眠' }),
        createTestBodyMark('s2', { description: '工作项目 deadline 紧张' }),
        createTestBodyMark('s3', { description: '与同事的沟通冲突' }),
      ]
      const chains = causalChain.buildAllChains(scars, [])
      const analysis = causalChain.analyzeChains(chains)

      expect(analysis.totalScars).toBe(3)
      expect(analysis.topRootCauses.length).toBeGreaterThan(0)
      // 工作和关系应排在前列
      const topLabels = analysis.topRootCauses.map(c => c.label)
      expect(topLabels).toContain('work')
    })

    it('应检测因果模式', () => {
      const scar = createTestBodyMark('s1')
      const growth = createTestGrowthRecord('gr-1', 's1', {
        recordedAt: '2026-07-20T00:00:00.000Z', // 5 天后 → 快速转化
      })
      const chains = causalChain.buildAllChains([scar], [growth])
      const analysis = causalChain.analyzeChains(chains)

      expect(analysis.patterns.length).toBeGreaterThan(0)
      const patternNames = analysis.patterns.map(p => p.name)
      expect(patternNames).toContain('快速转化')
    })

    it('应正确计算转化率', () => {
      const scars = [
        createTestBodyMark('s1', { transformed: true }),
        createTestBodyMark('s2', { transformed: false }),
        createTestBodyMark('s3', { transformed: true }),
        createTestBodyMark('s4', { transformed: false }),
      ]
      const chains = causalChain.buildAllChains(scars, [])
      const analysis = causalChain.analyzeChains(chains)

      expect(analysis.transformationRate).toBe(50)
    })
  })

  describe('tracePath - 路径追踪', () => {
    it('应追踪从触发到成长的完整路径', () => {
      const scar = createTestBodyMark('scar-trace')
      const growth = createTestGrowthRecord('gr-trace', 'scar-trace')
      const chain = causalChain.buildCausalChain(scar, [scar], [growth])

      const paths = causalChain.tracePath(chain, 'trigger', 'growth')
      expect(paths.length).toBeGreaterThan(0)
      expect(paths[0].length).toBeGreaterThanOrEqual(3)
      expect(paths[0][0].type).toBe('trigger')
      expect(paths[0][paths[0].length - 1].type).toBe('growth')
    })

    it('不存在的路径应返回空数组', () => {
      const scar = createTestBodyMark('scar-nopath')
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      const paths = causalChain.tracePath(chain, 'growth', 'trigger')
      expect(paths).toEqual([])
    })
  })

  describe('getChainSummary - 因果链摘要', () => {
    it('应生成可读的摘要', () => {
      const scar = createTestBodyMark('scar-summary')
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      const summary = causalChain.getChainSummary(chain)
      expect(summary.length).toBeGreaterThan(0)
      expect(summary).toContain('根因')
      expect(summary).toContain('深度')
      expect(summary).toContain('强度')
    })

    it('有成长的链应包含成长信息', () => {
      const scar = createTestBodyMark('scar-grown')
      const growth = createTestGrowthRecord('gr-grown', 'scar-grown')
      const chain = causalChain.buildCausalChain(scar, [scar], [growth])

      const summary = causalChain.getChainSummary(chain)
      expect(summary).toContain('成长')
    })

    it('无成长的链应提示尚未产生成长', () => {
      const scar = createTestBodyMark('scar-nogrowth')
      const chain = causalChain.buildCausalChain(scar, [scar], [])

      const summary = causalChain.getChainSummary(chain)
      expect(summary).toContain('尚未产生成长')
    })
  })

  describe('classifyRootCause - 根因分类', () => {
    it('工作相关描述应分类为 work', () => {
      expect(causalChain.classifyRootCause('工作压力太大')).toBe('work')
      expect(causalChain.classifyRootCause('项目 deadline 紧张')).toBe('work')
    })

    it('关系相关描述应分类为 relationship', () => {
      expect(causalChain.classifyRootCause('与同事的沟通冲突')).toBe('relationship')
      expect(causalChain.classifyRootCause('信任被背叛')).toBe('relationship')
    })

    it('其他描述应分类为 other', () => {
      expect(causalChain.classifyRootCause('今天天气不错')).toBe('other')
    })
  })

  describe('extractEmotions - 情感提取', () => {
    it('应从文本中提取情感标签', () => {
      const emotions = causalChain.extractEmotions('感到焦虑和痛苦')
      expect(emotions).toContain('fear')
      expect(emotions).toContain('pain')
    })

    it('无情感关键词应返回 neutral', () => {
      const emotions = causalChain.extractEmotions('今天做了三件事')
      expect(emotions).toEqual(['neutral'])
    })
  })
})

// ============================================================
// 2. 愈合预测引擎
// ============================================================

describe('P16-6 愈合预测引擎', () => {
  const predictor = useHealingPredictor()

  describe('predictHealing - 愈合预测', () => {
    it('已完全愈合的伤痕应返回零剩余天数', () => {
      const scar = createTestBodyMark('healed-1', {
        healingProgress: 100,
        healingStage: 'matured' as HealingStage,
      })
      const prediction = predictor.predictHealing(scar, [scar], [])

      expect(prediction.remainingDays).toBe(0)
      expect(prediction.confidence).toBe(1)
      expect(prediction.method).toBe('linear_fallback')
    })

    it('应返回完整的预测结构', () => {
      const scar = createTestBodyMark('scar-p1')
      const prediction = predictor.predictHealing(scar, [scar], [])

      expect(prediction.predictedDate).toBeTruthy()
      expect(prediction.predictedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(prediction.remainingDays).toBeGreaterThan(0)
      expect(prediction.confidence).toBeGreaterThan(0)
      expect(prediction.confidence).toBeLessThanOrEqual(1)
      expect(prediction.confidenceInterval.length).toBe(2)
      expect(prediction.confidenceInterval[0]).toBeLessThanOrEqual(prediction.confidenceInterval[1])
      expect(prediction.factorContributions.length).toBeGreaterThan(0)
      expect(prediction.method).toBeTruthy()
      expect(prediction.predictedAt).toBeTruthy()
    })

    it('严重度高的伤痕应预测更长的愈合时间', () => {
      const mildScar = createTestBodyMark('mild', {
        severity: 1 as SeverityLevel,
        healingProgress: 30,
      })
      const severeScar = createTestBodyMark('severe', {
        severity: 5 as SeverityLevel,
        healingProgress: 30,
      })

      const mildPred = predictor.predictHealing(mildScar, [mildScar], [])
      const severePred = predictor.predictHealing(severeScar, [severeScar], [])

      expect(severePred.remainingDays).toBeGreaterThan(mildPred.remainingDays)
    })

    it('有成长记录的伤痕愈合更快', () => {
      const scarNoGrowth = createTestBodyMark('no-growth', { healingProgress: 40 })
      const scarWithGrowth = createTestBodyMark('with-growth', {
        healingProgress: 40,
        transformed: true,
      })
      const growth = createTestGrowthRecord('gr-accel', 'with-growth')

      const predNoGrowth = predictor.predictHealing(scarNoGrowth, [scarNoGrowth], [])
      const predWithGrowth = predictor.predictHealing(
        scarWithGrowth,
        [scarWithGrowth],
        [growth],
      )

      expect(predWithGrowth.remainingDays).toBeLessThan(predNoGrowth.remainingDays)
    })

    it('有历史数据时置信度应更高', () => {
      // 创建一个已愈合的伤痕作为历史数据
      const healedScar = createTestBodyMark('healed-ref', {
        healingProgress: 100,
        healingStage: 'matured' as HealingStage,
        recordedAt: '2026-04-01T00:00:00.000Z', // 约 4 个月前
        scarType: 'wear' as ScarType,
        severity: 3 as SeverityLevel,
      })
      const newScar = createTestBodyMark('new-scar', {
        healingProgress: 40,
        scarType: 'wear' as ScarType,
        severity: 3 as SeverityLevel,
      })

      const predWithoutHistory = predictor.predictHealing(newScar, [newScar], [])
      const predWithHistory = predictor.predictHealing(newScar, [newScar, healedScar], [])

      expect(predWithHistory.confidence).toBeGreaterThanOrEqual(predWithoutHistory.confidence)
      expect(predWithHistory.method).toBe('historical_baseline')
    })
  })

  describe('predictAll - 批量预测', () => {
    it('应为所有伤痕生成预测', () => {
      const scars = [
        createTestBodyMark('s1'),
        createTestBodyMark('s2'),
        createTestBodyMark('s3'),
      ]
      const predictions = predictor.predictAll(scars, [])

      expect(predictions.size).toBe(3)
      for (const [id, pred] of predictions) {
        expect(scars.map(s => s.id)).toContain(id)
        expect(pred.remainingDays).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('analyzeFactors - 因子分析', () => {
    it('应返回各因子的贡献度', () => {
      const scar = createTestBodyMark('factor-scar')
      const baselines: HealingBaseline[] = []
      const factors = predictor.analyzeFactors(scar, [], baselines)

      expect(factors.length).toBeGreaterThanOrEqual(3) // 至少 type + severity + bodyPart
      for (const factor of factors) {
        expect(factor.factor).toBeTruthy()
        expect(factor.direction).toBeTruthy()
        expect(factor.weight).toBeGreaterThanOrEqual(0)
        expect(factor.description.length).toBeGreaterThan(0)
      }
    })

    it('burn 类型应为 slows 方向', () => {
      const scar = createTestBodyMark('burn-scar', {
        scarType: 'burn' as ScarType,
      })
      const factors = predictor.analyzeFactors(scar, [], [])

      const typeFactor = factors.find(f => f.factor.includes('burn'))
      expect(typeFactor).toBeDefined()
      expect(typeFactor!.direction).toBe('slows')
    })

    it('impact 类型应为 accelerates 方向', () => {
      const scar = createTestBodyMark('impact-scar', {
        scarType: 'impact' as ScarType,
      })
      const factors = predictor.analyzeFactors(scar, [], [])

      const typeFactor = factors.find(f => f.factor.includes('impact'))
      expect(typeFactor).toBeDefined()
      expect(typeFactor!.direction).toBe('accelerates')
    })
  })

  describe('computeBaseline - 愈合基线计算', () => {
    it('无已愈合伤痕时应返回空基线', () => {
      const scars = [
        createTestBodyMark('s1', { healingProgress: 50 }),
      ]
      const baselines = predictor.computeBaseline(scars, [])
      expect(baselines).toEqual([])
    })

    it('有已愈合伤痕时应计算基线', () => {
      const healed1 = createTestBodyMark('h1', {
        healingProgress: 100,
        healingStage: 'matured' as HealingStage,
        recordedAt: '2026-04-01T00:00:00.000Z',
        scarType: 'wear' as ScarType,
        severity: 3 as SeverityLevel,
        bodyPart: 'back' as BodyPart,
      })
      const healed2 = createTestBodyMark('h2', {
        healingProgress: 100,
        healingStage: 'matured' as HealingStage,
        recordedAt: '2026-03-01T00:00:00.000Z',
        scarType: 'wear' as ScarType,
        severity: 3 as SeverityLevel,
        bodyPart: 'back' as BodyPart,
      })
      const baselines = predictor.computeBaseline([healed1, healed2], [])

      expect(baselines.length).toBeGreaterThan(0)
      const baseline = baselines[0]
      expect(baseline.scarType).toBe('wear')
      expect(baseline.severity).toBe(3)
      expect(baseline.bodyPart).toBe('back')
      expect(baseline.avgDays).toBeGreaterThan(0)
      expect(baseline.sampleSize).toBe(2)
    })
  })

  describe('evaluatePrediction - 预测评估', () => {
    it('已愈合伤痕应计算预测误差', () => {
      const scar = createTestBodyMark('eval-scar', {
        healingProgress: 100,
        healingStage: 'matured' as HealingStage,
        recordedAt: '2026-05-01T00:00:00.000Z',
      })
      const prediction = predictor.predictHealing(scar, [scar], [])
      const history = predictor.evaluatePrediction(scar, prediction)

      expect(history.scarId).toBe('eval-scar')
      expect(history.actualHealingDays).toBeGreaterThan(0)
      expect(history.predictionError).toBeGreaterThanOrEqual(0)
      expect(history.accuracy).toBeDefined()
    })
  })

  describe('predictStageProgress - 分阶段预测', () => {
    it('应为各阶段生成进度预测', () => {
      const scar = createTestBodyMark('stage-scar', {
        healingStage: 'proliferation' as HealingStage,
        healingProgress: 30,
      })
      const stages = predictor.predictStageProgress(scar, [scar], [])

      expect(stages.length).toBeGreaterThanOrEqual(1)
      expect(stages[0].stage).toBe('proliferation')
      expect(stages[0].estimatedDays).toBeGreaterThan(0)
      expect(stages[0].progress).toBe(30)
    })
  })

  describe('getHistoricalAvg - 历史平均值', () => {
    it('有匹配基线时应返回平均值', () => {
      const baselines: HealingBaseline[] = [
        {
          scarType: 'wear' as ScarType,
          severity: 3 as SeverityLevel,
          bodyPart: 'back' as BodyPart,
          avgDays: 90,
          sampleSize: 5,
          stdDev: 10,
        },
      ]
      const avg = predictor.getHistoricalAvg('wear', 3, baselines)
      expect(avg).toBe(90)
    })

    it('无匹配基线时应返回 undefined', () => {
      const avg = predictor.getHistoricalAvg('burn', 5, [])
      expect(avg).toBeUndefined()
    })
  })
})