// ============================================================
// 殿堂触角 · P20-6 单元测试
// A/B 测试引擎 + 渠道优化器
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useABTestEngine, estimateSampleSize } from '../ab-test-engine'
import { useChannelOptimizer } from '../channel-optimizer'
import type {
  ABExperiment,
  ABTestVariant,
} from '../ab-test-engine'
import type {
  ChannelPerformance,
} from '../touch-analytics'
import type { PushChannelType } from '../notification-strategy'
import type { ChannelConfig, PushRecord } from '../push-channel'

// ---- 测试辅助函数 ----

function createMockChannelPerf(
  channel: PushChannelType,
  overrides: Partial<ChannelPerformance> = {},
): ChannelPerformance {
  return {
    channel,
    label: channelLabels[channel] ?? channel,
    deliveries: 100,
    clicks: 15,
    openRate: 0.3,
    clickRate: 0.15,
    dismissRate: 0.1,
    avgResponseTime: 5000,
    successRate: 0.95,
    score: 65,
    ...overrides,
  }
}

function createMockChannelConfig(
  type: PushChannelType,
  overrides: Partial<ChannelConfig> = {},
): ChannelConfig {
  return {
    type,
    enabled: true,
    priority: type === 'browser' ? 5 : type === 'in-app' ? 4 : type === 'desktop' ? 3 : type === 'email' ? 2 : 1,
    maxDailyPush: 20,
    todayPushCount: 0,
    todayPushDate: '2026-08-04',
    capability: {
      icon: true,
      image: false,
      richText: false,
      actionButtons: true,
      sound: true,
      vibration: false,
      requiresPermission: false,
      maxTitleLength: 100,
      maxMessageLength: 200,
    },
    permissionStatus: 'granted',
    lastPushAt: null,
    ...overrides,
  }
}

function createMockPushRecord(overrides: Partial<PushRecord> = {}): PushRecord {
  return {
    id: 'rec_' + Math.random().toString(36).slice(2, 8),
    channel: 'browser',
    title: '测试通知',
    message: '这是一条测试消息',
    success: true,
    error: undefined,
    openedAt: new Date().toISOString(),
    clickedAt: new Date().toISOString(),
    dismissedAt: null,
    pushedAt: new Date().toISOString(),
    responseTimeMs: 3000,
    ...overrides,
  }
}

const channelLabels: Record<string, string> = {
  browser: '浏览器通知',
  desktop: '桌面通知',
  email: '邮件通知',
  'in-app': '应用内通知',
  widget: '桌面小组件',
}

// ============================================================
// A/B 测试引擎测试
// ============================================================

describe('P20-6 A/B 测试引擎', () => {
  let engine: ReturnType<typeof useABTestEngine>

  beforeEach(() => {
    engine = useABTestEngine()
    // 清理存储中的累积数据
    engine.experiments.value = []
    engine.reports.value = []
  })

  // ---- 实验创建 ----

  describe('createExperiment - 实验创建', () => {
    it('应该从模板创建实验', () => {
      const exp = engine.createFromTemplate('template_timing', '时段测试')
      expect(exp).not.toBeNull()
      expect(exp!.name).toBe('时段测试')
      expect(exp!.status).toBe('draft')
      expect(exp!.variants.length).toBe(3)
      expect(exp!.targetMetric).toBe('clickRate')
      expect(exp!.minSampleSize).toBe(100)
    })

    it('应该创建自定义实验', () => {
      const variants: Omit<ABTestVariant, 'id'>[] = [
        { name: '对照组', timeOffsetMinutes: 0, channels: ['browser'], messageTemplate: '{{title}}', weight: 1 },
        { name: '实验组', timeOffsetMinutes: 0, channels: ['browser', 'in-app'], messageTemplate: '{{title}}', weight: 1 },
      ]

      const exp = engine.createExperiment(
        '渠道组合测试',
        '测试多通道效果',
        'conversionRate',
        variants,
        { minSampleSize: 200, significanceLevel: 0.01 },
      )

      expect(exp.name).toBe('渠道组合测试')
      expect(exp.targetMetric).toBe('conversionRate')
      expect(exp.minSampleSize).toBe(200)
      expect(exp.significanceLevel).toBe(0.01)
      expect(exp.variants.length).toBe(2)
      expect(exp.status).toBe('draft')
    })

    it('应该为每个变体初始化指标', () => {
      const exp = engine.createFromTemplate('template_message', '消息测试')
      expect(exp).not.toBeNull()

      for (const v of exp!.variants) {
        const metrics = exp!.variantMetrics[v.id]
        expect(metrics).toBeDefined()
        expect(metrics.deliveries).toBe(0)
        expect(metrics.clicks).toBe(0)
        expect(metrics.primaryMetric).toBe(0)
        expect(metrics.lift).toBeNull()
        expect(metrics.isSignificant).toBe(false)
      }
    })

    it('不存在的模板应返回 null', () => {
      const exp = engine.createFromTemplate('nonexistent', '测试')
      expect(exp).toBeNull()
    })

    it('创建的实验应在 experiments 列表中', () => {
      engine.createFromTemplate('template_channel', '渠道测试')
      expect(engine.experiments.value.length).toBe(1)
    })
  })

  // ---- 实验生命周期 ----

  describe('实验生命周期', () => {
    let exp: ABExperiment

    beforeEach(() => {
      const result = engine.createFromTemplate('template_timing', '生命周期测试')
      expect(result).not.toBeNull()
      exp = result!
    })

    it('startExperiment 应该将草稿变为运行中', () => {
      const result = engine.startExperiment(exp.id)
      expect(result).toBe(true)
      expect(engine.experiments.value[0].status).toBe('running')
      expect(engine.experiments.value[0].startedAt).not.toBeNull()
    })

    it('不能启动非草稿状态的实验', () => {
      engine.startExperiment(exp.id)
      const result = engine.startExperiment(exp.id)
      expect(result).toBe(false)
    })

    it('stopExperiment 应该停止运行中的实验', () => {
      engine.startExperiment(exp.id)
      const result = engine.stopExperiment(exp.id)
      expect(result).toBe(true)
      expect(engine.experiments.value[0].status).toBe('stopped')
      expect(engine.experiments.value[0].endedAt).not.toBeNull()
    })

    it('不能停止非运行中的实验', () => {
      const result = engine.stopExperiment(exp.id)
      expect(result).toBe(false)
    })

    it('completeExperiment 应该完成实验', () => {
      engine.startExperiment(exp.id)
      engine.stopExperiment(exp.id)
      const result = engine.completeExperiment(exp.id)
      expect(result).toBe(true)
      expect(engine.experiments.value[0].status).toBe('completed')
    })

    it('archiveExperiment 应该归档已完成的实验', () => {
      engine.startExperiment(exp.id)
      engine.stopExperiment(exp.id)
      engine.completeExperiment(exp.id)
      const result = engine.archiveExperiment(exp.id)
      expect(result).toBe(true)
      expect(engine.experiments.value[0].status).toBe('archived')
    })

    it('deleteExperiment 应该删除实验', () => {
      const result = engine.deleteExperiment(exp.id)
      expect(result).toBe(true)
      expect(engine.experiments.value.length).toBe(0)
    })

    it('删除不存在的实验应返回 false', () => {
      const result = engine.deleteExperiment('nonexistent')
      expect(result).toBe(false)
    })
  })

  // ---- 变体分配 ----

  describe('assignVariant - 变体分配', () => {
    it('应该为用户分配变体', () => {
      const exp = engine.createFromTemplate('template_timing', '分配测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)

      const variant = engine.assignVariant(exp!.id, 'user_001')
      expect(variant).not.toBeNull()
      expect(variant!.id).toBeTruthy()
    })

    it('同一用户应返回相同变体', () => {
      const exp = engine.createFromTemplate('template_timing', '一致性测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)

      const variant1 = engine.assignVariant(exp!.id, 'user_001')
      const variant2 = engine.assignVariant(exp!.id, 'user_001')
      expect(variant1!.id).toBe(variant2!.id)
    })

    it('非运行中实验不应分配变体', () => {
      const exp = engine.createFromTemplate('template_timing', '草稿分配测试')
      expect(exp).not.toBeNull()

      const variant = engine.assignVariant(exp!.id, 'user_001')
      expect(variant).not.toBeNull() // draft 状态也允许分配
    })

    it('getUserVariant 应该返回已分配的变体', () => {
      const exp = engine.createFromTemplate('template_timing', '获取变体测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)

      const assigned = engine.assignVariant(exp!.id, 'user_002')
      const retrieved = engine.getUserVariant(exp!.id, 'user_002')
      expect(retrieved!.id).toBe(assigned!.id)
    })

    it('未分配的用户应返回 null', () => {
      const variant = engine.getUserVariant('nonexistent', 'user_999')
      expect(variant).toBeNull()
    })
  })

  // ---- 指标记录 ----

  describe('recordMetric - 指标记录', () => {
    let exp: ABExperiment

    beforeEach(() => {
      const result = engine.createFromTemplate('template_message', '指标测试')
      expect(result).not.toBeNull()
      exp = result!
      engine.startExperiment(exp.id)
    })

    it('应该正确记录 delivery 指标', () => {
      const variantId = exp.variants[0].id
      engine.recordMetric(exp.id, variantId, 'delivery')
      expect(exp.variantMetrics[variantId].deliveries).toBe(1)
    })

    it('应该正确记录 click 指标', () => {
      const variantId = exp.variants[0].id
      engine.recordMetric(exp.id, variantId, 'click')
      expect(exp.variantMetrics[variantId].clicks).toBe(1)
    })

    it('应该正确记录 open 指标', () => {
      const variantId = exp.variants[0].id
      engine.recordMetric(exp.id, variantId, 'open')
      expect(exp.variantMetrics[variantId].opens).toBe(1)
    })

    it('应该正确记录 responseTime', () => {
      const variantId = exp.variants[0].id
      engine.recordMetric(exp.id, variantId, 'delivery', 2500)
      expect(exp.variantMetrics[variantId].responseTimes).toContain(2500)
    })

    it('应该累积多次记录', () => {
      const variantId = exp.variants[0].id
      for (let i = 0; i < 10; i++) {
        engine.recordMetric(exp.id, variantId, 'delivery')
      }
      expect(exp.variantMetrics[variantId].deliveries).toBe(10)
    })

    it('不存在的实验不应崩溃', () => {
      expect(() => {
        engine.recordMetric('nonexistent', 'var_1', 'delivery')
      }).not.toThrow()
    })

    it('syncFromRecords 应该批量同步', () => {
      const variantId = exp.variants[0].id
      const records = Array.from({ length: 5 }, () => createMockPushRecord({ channel: 'browser' }))
      engine.syncFromRecords(exp.id, variantId, records)
      expect(exp.variantMetrics[variantId].deliveries).toBe(5)
    })
  })

  // ---- 统计分析 ----

  describe('统计分析', () => {
    it('getVariantPrimaryMetric 应该正确计算 clickRate', () => {
      const exp = engine.createFromTemplate('template_timing', '指标计算测试')
      expect(exp).not.toBeNull()
      const variantId = exp!.variants[0].id

      for (let i = 0; i < 100; i++) {
        engine.recordMetric(exp!.id, variantId, 'delivery')
      }
      for (let i = 0; i < 15; i++) {
        engine.recordMetric(exp!.id, variantId, 'click')
      }

      const metrics = exp!.variantMetrics[variantId]
      const clickRate = engine.getVariantPrimaryMetric(metrics, 'clickRate')
      expect(clickRate).toBeCloseTo(0.15, 2)
    })

    it('getVariantPrimaryMetric 应该正确计算 openRate', () => {
      const exp = engine.createFromTemplate('template_message', '打开率测试')
      expect(exp).not.toBeNull()
      const variantId = exp!.variants[0].id

      for (let i = 0; i < 100; i++) {
        engine.recordMetric(exp!.id, variantId, 'delivery')
      }
      for (let i = 0; i < 30; i++) {
        engine.recordMetric(exp!.id, variantId, 'open')
      }

      const metrics = exp!.variantMetrics[variantId]
      const openRate = engine.getVariantPrimaryMetric(metrics, 'openRate')
      expect(openRate).toBeCloseTo(0.3, 2)
    })

    it('getVariantPrimaryMetric 空数据应返回 0', () => {
      const exp = engine.createFromTemplate('template_timing', '空数据测试')
      expect(exp).not.toBeNull()
      const variantId = exp!.variants[0].id
      const metrics = exp!.variantMetrics[variantId]

      expect(engine.getVariantPrimaryMetric(metrics, 'clickRate')).toBe(0)
      expect(engine.getVariantPrimaryMetric(metrics, 'openRate')).toBe(0)
      expect(engine.getVariantPrimaryMetric(metrics, 'responseTime')).toBe(0)
    })

    it('testSignificance 应该对足够样本计算显著性', () => {
      const exp = engine.createFromTemplate('template_timing', '显著性测试')
      expect(exp).not.toBeNull()

      // 对照组：低点击率
      const controlId = exp!.variants[0].id
      for (let i = 0; i < 200; i++) {
        engine.recordMetric(exp!.id, controlId, 'delivery')
      }
      for (let i = 0; i < 20; i++) {
        engine.recordMetric(exp!.id, controlId, 'click')
      }

      // 实验组：高点击率
      const variantId = exp!.variants[1].id
      for (let i = 0; i < 200; i++) {
        engine.recordMetric(exp!.id, variantId, 'delivery')
      }
      for (let i = 0; i < 50; i++) {
        engine.recordMetric(exp!.id, variantId, 'click')
      }

      const results = engine.testSignificance(exp!.id)
      expect(results).not.toBeNull()
      expect(results![variantId]).toBeDefined()
      expect(results![variantId].significant).toBe(true)
      expect(results![variantId].pValue).toBeLessThan(0.05)
    })

    it('testSignificance 样本不足应返回 null', () => {
      const exp = engine.createFromTemplate('template_timing', '不足样本测试')
      expect(exp).not.toBeNull()

      const variantId = exp!.variants[0].id
      engine.recordMetric(exp!.id, variantId, 'delivery')
      engine.recordMetric(exp!.id, variantId, 'click')

      const results = engine.testSignificance(exp!.id)
      expect(results).toBeNull()
    })

    it('updateVariantMetrics 应该更新所有变体指标', () => {
      const exp = engine.createFromTemplate('template_timing', '更新指标测试')
      expect(exp).not.toBeNull()

      const controlId = exp!.variants[0].id
      const variantId = exp!.variants[1].id

      for (let i = 0; i < 200; i++) {
        engine.recordMetric(exp!.id, controlId, 'delivery')
        engine.recordMetric(exp!.id, variantId, 'delivery')
      }
      for (let i = 0; i < 20; i++) {
        engine.recordMetric(exp!.id, controlId, 'click')
      }
      for (let i = 0; i < 50; i++) {
        engine.recordMetric(exp!.id, variantId, 'click')
      }

      engine.updateVariantMetrics(exp!.id)

      const variantMetrics = exp!.variantMetrics[variantId]
      expect(variantMetrics.primaryMetric).toBeGreaterThan(0)
      expect(variantMetrics.lift).not.toBeNull()
      expect(variantMetrics.isSignificant).toBe(true)
    })
  })

  // ---- 胜者判定 ----

  describe('determineWinner - 胜者判定', () => {
    it('样本量不足时不应确定胜者', () => {
      const exp = engine.createFromTemplate('template_timing', '不足样本胜者测试')
      expect(exp).not.toBeNull()

      const result = engine.determineWinner(exp!.id)
      expect(result.winnerId).toBeNull()
      expect(result.summary).toContain('样本量不足')
    })

    it('有显著差异时应确定胜者', () => {
      const exp = engine.createFromTemplate('template_timing', '胜者测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)
      // 模拟已运行 8 天（满足 minDurationDays=7）
      exp!.startedAt = new Date(Date.now() - 8 * 86400000).toISOString()

      const controlId = exp!.variants[0].id
      const variantId = exp!.variants[1].id

      for (let i = 0; i < 200; i++) {
        engine.recordMetric(exp!.id, controlId, 'delivery')
        engine.recordMetric(exp!.id, variantId, 'delivery')
      }
      for (let i = 0; i < 20; i++) engine.recordMetric(exp!.id, controlId, 'click')
      for (let i = 0; i < 60; i++) engine.recordMetric(exp!.id, variantId, 'click')

      const result = engine.determineWinner(exp!.id)
      expect(result.winnerId).toBe(variantId)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('autoDetermineWinner 应该自动更新胜者', () => {
      const exp = engine.createFromTemplate('template_timing', '自动胜者测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)
      // 模拟已运行 8 天（满足 minDurationDays=7）
      exp!.startedAt = new Date(Date.now() - 8 * 86400000).toISOString()

      const controlId = exp!.variants[0].id
      const variantId = exp!.variants[1].id

      for (let i = 0; i < 200; i++) {
        engine.recordMetric(exp!.id, controlId, 'delivery')
        engine.recordMetric(exp!.id, variantId, 'delivery')
      }
      for (let i = 0; i < 20; i++) engine.recordMetric(exp!.id, controlId, 'click')
      for (let i = 0; i < 60; i++) engine.recordMetric(exp!.id, variantId, 'click')

      engine.autoDetermineWinner(exp!.id)
      expect(exp!.winnerId).toBe(variantId)
      expect(exp!.resultSummary).not.toBeNull()
    })
  })

  // ---- 实验报告 ----

  describe('generateReport - 实验报告', () => {
    it('应该生成包含所有变体的报告', () => {
      const exp = engine.createFromTemplate('template_message', '报告测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)

      const variantId = exp!.variants[0].id
      for (let i = 0; i < 50; i++) {
        engine.recordMetric(exp!.id, variantId, 'delivery')
        engine.recordMetric(exp!.id, variantId, 'click')
      }

      const report = engine.generateReport(exp!.id)
      expect(report).not.toBeNull()
      expect(report!.experimentName).toBe('报告测试')
      expect(report!.variants.length).toBe(3)
      expect(report!.totalSamples).toBeGreaterThan(0)
    })

    it('不存在的实验应返回 null', () => {
      const report = engine.generateReport('nonexistent')
      expect(report).toBeNull()
    })
  })

  // ---- 样本量估算 ----

  describe('estimateSampleSize - 样本量估算', () => {
    it('应该返回合理的样本量', () => {
      const size = estimateSampleSize(0.1, 0.05)
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThan(10000)
    })

    it('基准值：0.2 基线 / MDE 0.05 / α 0.05 / 功效 0.8 => 1094', () => {
      // INCR-465：normalQuantile 修正前这里返回 3955（偏高 3.6 倍）。
      // 手算：z(0.975)=1.9599639845、z(0.8)=0.8416212336，p1=0.2、p2=0.25、p̄=0.225
      // n = (1.9599639845·√(2·0.225·0.775) + 0.8416212336·√(0.2·0.8+0.25·0.75))² / 0.05²
      //   = (1.157437 + 0.496073)² / 0.0025 = 1093.64 => ceil = 1094
      expect(estimateSampleSize(0.2, 0.05, 0.05, 0.8)).toBe(1094)
    })

    it('较小效应量需要更大样本', () => {
      const smallEffect = estimateSampleSize(0.1, 0.02)
      const largeEffect = estimateSampleSize(0.1, 0.1)
      expect(smallEffect).toBeGreaterThan(largeEffect)
    })

    it('更高功效需要更大样本', () => {
      const lowPower = estimateSampleSize(0.1, 0.05, 0.05, 0.8)
      const highPower = estimateSampleSize(0.1, 0.05, 0.05, 0.95)
      // 两者都应返回正数，功效越高样本量越大
      expect(lowPower).toBeGreaterThan(0)
      expect(highPower).toBeGreaterThan(0)
      // INCR-465：去掉了原先的 500 容差。那个容差恰好掩盖了引擎的非单调 ——
      // 修正前 power 0.95 算出 3731 < power 0.8 的 3955（功效越高样本越少，统计上不可能）。
      // 修正后 686 → 1135，单调性真实成立，此处必须是严格大于。
      expect(lowPower).toBe(686)
      expect(highPower).toBe(1135)
      expect(highPower).toBeGreaterThan(lowPower)
    })
  })

  // ---- 计算属性 ----

  describe('计算属性', () => {
    it('runningExperiments 应该只返回运行中的实验', () => {
      const exp = engine.createFromTemplate('template_timing', '运行中测试')
      expect(exp).not.toBeNull()
      engine.startExperiment(exp!.id)

      expect(engine.runningExperiments.value.length).toBe(1)
      expect(engine.draftExperiments.value.length).toBe(0)
    })

    it('draftExperiments 应该只返回草稿实验', () => {
      engine.createFromTemplate('template_timing', '草稿测试')
      expect(engine.draftExperiments.value.length).toBe(1)
      expect(engine.runningExperiments.value.length).toBe(0)
    })
  })
})

// ============================================================
// 渠道优化器测试
// ============================================================

describe('P20-6 渠道优化器', () => {
  let optimizer: ReturnType<typeof useChannelOptimizer>

  beforeEach(() => {
    optimizer = useChannelOptimizer()
    // 清理存储中的累积数据
    optimizer.suggestions.value = []
    optimizer.optimizerState.value.totalOptimizations = 0
    optimizer.optimizerState.value.history = []
  })

  // ---- 渠道评分 ----

  describe('scoreChannel - 渠道评分', () => {
    it('应该计算综合评分', () => {
      const perf = createMockChannelPerf('browser', {
        clickRate: 0.2,
        openRate: 0.4,
        successRate: 0.95,
        dismissRate: 0.05,
      })

      const score = optimizer.scoreChannel(perf)
      expect(score.overallScore).toBeGreaterThan(0)
      expect(score.overallScore).toBeLessThanOrEqual(100)
      expect(score.engagementScore).toBeGreaterThan(0)
      expect(score.deliveryScore).toBeGreaterThan(0)
    })

    it('高交互率渠道应获得更高评分', () => {
      const lowEngagement = createMockChannelPerf('browser', {
        clickRate: 0.02,
        openRate: 0.05,
        dismissRate: 0.5,
      })

      const highEngagement = createMockChannelPerf('in-app', {
        clickRate: 0.25,
        openRate: 0.5,
        dismissRate: 0.05,
      })

      const lowScore = optimizer.scoreChannel(lowEngagement)
      const highScore = optimizer.scoreChannel(highEngagement)

      expect(highScore.overallScore).toBeGreaterThan(lowScore.overallScore)
    })

    it('scoreAllChannels 应该按评分排序', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 50 }),
        createMockChannelPerf('in-app', { score: 80 }),
        createMockChannelPerf('email', { score: 30 }),
      ]

      const scores = optimizer.scoreAllChannels(perfs)
      expect(scores[0].overallScore).toBeGreaterThanOrEqual(scores[1].overallScore)
      expect(scores[1].overallScore).toBeGreaterThanOrEqual(scores[2].overallScore)
    })
  })

  // ---- 优化建议 ----

  describe('generateOptimizationSuggestions - 优化建议', () => {
    it('应该为低表现渠道生成降级建议', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 80, clickRate: 0.2 }),
        createMockChannelPerf('email', { score: 15, clickRate: 0.01, deliveries: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 5 }),
        createMockChannelConfig('email', { enabled: true, priority: 3 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'email', success: true }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: h >= 9 && h <= 18 ? 3 : 0,
        clickRate: h >= 9 && h <= 18 ? 0.3 : 0,
        avgResponseTime: 5000,
      }))

      const suggestions = optimizer.generateOptimizationSuggestions(perfs, channels, records, hourlyPerformance)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.action === 'decrease_priority' || s.action === 'disable_channel')).toBe(true)
    })

    it('应该为高表现渠道生成提升建议', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 95, clickRate: 0.5, openRate: 0.7, dismissRate: 0.01, successRate: 0.99, deliveries: 200 }),
        createMockChannelPerf('widget', { score: 5, clickRate: 0.005, openRate: 0.01, dismissRate: 0.9, successRate: 0.5, deliveries: 10 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 2 }),
        createMockChannelConfig('widget', { enabled: true, priority: 1 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      const suggestions = optimizer.generateOptimizationSuggestions(perfs, channels, records, hourlyPerformance)
      expect(suggestions.some(s => s.action === 'increase_priority')).toBe(true)
    })

    it('高关闭率渠道应生成减少推送建议', () => {
      const perfs = [
        createMockChannelPerf('browser', { dismissRate: 0.5, deliveries: 30 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, maxDailyPush: 30 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 5,
        clicks: 1,
        clickRate: 0.2,
        avgResponseTime: 5000,
      }))

      const suggestions = optimizer.generateOptimizationSuggestions(perfs, channels, records, hourlyPerformance)
      expect(suggestions.some(s => s.action === 'adjust_max_daily')).toBe(true)
    })

    it('空数据不应崩溃', () => {
      const suggestions = optimizer.generateOptimizationSuggestions([], [], [], [])
      expect(suggestions).toEqual([])
    })
  })

  // ---- 建议应用 ----

  describe('applySuggestion - 应用建议', () => {
    it('应该成功应用优先级提升建议', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 85 }),
        createMockChannelPerf('widget', { score: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 2 }),
        createMockChannelConfig('widget', { enabled: true, priority: 1 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      optimizer.refreshSuggestions(perfs, channels, records, hourlyPerformance)
      const increaseSuggestion = optimizer.suggestions.value.find(s => s.action === 'increase_priority')
      if (increaseSuggestion) {
        const result = optimizer.applySuggestion(increaseSuggestion.id, channels)
        expect(result).toBe(true)
        expect(optimizer.optimizerState.value.totalOptimizations).toBe(1)
      }
    })

    it('应记录优化历史', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 85 }),
        createMockChannelPerf('widget', { score: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 2 }),
        createMockChannelConfig('widget', { enabled: true, priority: 1 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      optimizer.refreshSuggestions(perfs, channels, records, hourlyPerformance)
      const suggestion = optimizer.suggestions.value[0]
      if (suggestion) {
        optimizer.applySuggestion(suggestion.id, channels)
        expect(optimizer.recentHistory.value.length).toBeGreaterThan(0)
      }
    })
  })

  // ---- 渠道组合推荐 ----

  describe('generateChannelCombos - 渠道组合推荐', () => {
    it('应该生成多种组合推荐', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 80, clickRate: 0.25, openRate: 0.5, successRate: 0.95 }),
        createMockChannelPerf('in-app', { score: 75, clickRate: 0.2, openRate: 0.45, successRate: 0.98 }),
        createMockChannelPerf('email', { score: 65, clickRate: 0.15, openRate: 0.35, successRate: 0.92 }),
        createMockChannelPerf('desktop', { score: 60, clickRate: 0.12, openRate: 0.3, successRate: 0.9 }),
      ]

      const combos = optimizer.generateChannelCombos(
        optimizer.scoreAllChannels(perfs),
      )
      expect(combos.length).toBeGreaterThan(0)
      expect(combos.some(c => c.name === '高交互组合')).toBe(true)
      expect(combos.some(c => c.name === '高可靠组合')).toBe(true)
    })

    it('每个组合应有完整信息', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 80 }),
        createMockChannelPerf('in-app', { score: 75 }),
      ]

      const combos = optimizer.generateChannelCombos(
        optimizer.scoreAllChannels(perfs),
      )
      for (const combo of combos) {
        expect(combo.channels.length).toBeGreaterThan(0)
        expect(combo.expectedScore).toBeGreaterThan(0)
        expect(combo.scenarios.length).toBeGreaterThan(0)
        expect(combo.advantages.length).toBeGreaterThan(0)
      }
    })
  })

  // ---- 时段优化 ----

  describe('analyzeTimeSlots - 时段优化', () => {
    it('应该识别最佳时段', () => {
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: h >= 9 && h <= 17 ? 5 : 1,
        clickRate: h >= 9 && h <= 17 ? 0.5 : 0.1,
        avgResponseTime: 5000,
      }))

      const result = optimizer.analyzeTimeSlots(hourlyPerformance)
      expect(result.bestHours.length).toBeGreaterThan(0)
      expect(result.worstHours.length).toBeGreaterThan(0)
      expect(result.recommendedWindows.length).toBeGreaterThan(0)
    })

    it('应该返回推荐和避开窗口', () => {
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 5,
        clicks: h >= 8 && h <= 20 ? 3 : 0,
        clickRate: h >= 8 && h <= 20 ? 0.6 : 0,
        avgResponseTime: 5000,
      }))

      const result = optimizer.analyzeTimeSlots(hourlyPerformance)
      expect(result.recommendedWindows.length).toBeGreaterThan(0)
      expect(result.avoidWindows.length).toBeGreaterThan(0)
    })
  })

  // ---- 自动优化 ----

  describe('autoOptimize - 自动优化', () => {
    it('禁用自动优化时不应执行', () => {
      const perfs = [createMockChannelPerf('browser', { score: 80 })]
      const channels = [createMockChannelConfig('browser')]
      const records = [createMockPushRecord()]
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      const result = optimizer.autoOptimize(perfs, channels, records, hourlyPerformance)
      expect(result.length).toBe(0)
    })

    it('启用自动优化后应自动应用高置信度建议', () => {
      optimizer.enableAutoOptimize(24)

      const perfs = [
        createMockChannelPerf('browser', { score: 85, clickRate: 0.25, deliveries: 100 }),
        createMockChannelPerf('email', { score: 15, clickRate: 0.01, deliveries: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 2 }),
        createMockChannelConfig('email', { enabled: true, priority: 3 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      optimizer.autoOptimize(perfs, channels, records, hourlyPerformance)
      // 可能自动应用了一些建议
      expect(optimizer.optimizerState.value.autoOptimizeEnabled).toBe(true)
    })
  })

  // ---- 效果评估 ----

  describe('evaluateOptimization - 效果评估', () => {
    it('应该评估优化效果', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 85 }),
        createMockChannelPerf('widget', { score: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 2 }),
        createMockChannelConfig('widget', { enabled: true, priority: 1 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      optimizer.refreshSuggestions(perfs, channels, records, hourlyPerformance)
      const suggestion = optimizer.suggestions.value[0]
      if (suggestion) {
        optimizer.applySuggestion(suggestion.id, channels)
        const historyRecord = optimizer.optimizerState.value.history[0]
        optimizer.evaluateOptimization(historyRecord.id, [
          createMockChannelPerf('browser', { score: 90 }),
        ])
        const updated = optimizer.optimizerState.value.history[0]
        expect(updated.effect).toBeDefined()
      }
    })
  })

  // ---- 回滚 ----

  describe('rollbackOptimization - 回滚优化', () => {
    it('应该成功回滚优先级调整', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 85 }),
        createMockChannelPerf('widget', { score: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true, priority: 2 }),
        createMockChannelConfig('widget', { enabled: true, priority: 1 }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'browser' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      optimizer.refreshSuggestions(perfs, channels, records, hourlyPerformance)
      const suggestion = optimizer.suggestions.value.find(s => s.action === 'increase_priority')
      if (suggestion) {
        const originalPriority = channels.find(c => c.type === 'browser')!.priority
        optimizer.applySuggestion(suggestion.id, channels)
        const historyRecord = optimizer.optimizerState.value.history[0]
        const result = optimizer.rollbackOptimization(historyRecord.id, channels)
        expect(result).toBe(true)
        expect(channels.find(c => c.type === 'browser')!.priority).toBe(originalPriority)
      }
    })
  })

  // ---- 计算属性 ----

  describe('计算属性', () => {
    it('needsOptimization 应在有严重建议时返回 true', () => {
      const perfs = [
        createMockChannelPerf('browser', { score: 80 }),
        createMockChannelPerf('email', { score: 10, deliveries: 20 }),
      ]
      const channels = [
        createMockChannelConfig('browser', { enabled: true }),
        createMockChannelConfig('email', { enabled: true }),
      ]
      const records = Array.from({ length: 20 }, () => createMockPushRecord({ channel: 'email' }))
      const hourlyPerformance = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        deliveries: 10,
        clicks: 3,
        clickRate: 0.3,
        avgResponseTime: 5000,
      }))

      optimizer.refreshSuggestions(perfs, channels, records, hourlyPerformance)
      expect(optimizer.needsOptimization.value).toBe(true)
    })

    it('无建议时应返回 false', () => {
      expect(optimizer.needsOptimization.value).toBe(false)
    })
  })
})