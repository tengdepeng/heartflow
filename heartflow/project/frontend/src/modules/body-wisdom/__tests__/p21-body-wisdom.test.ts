// ============================================================
// 藏象阁 · P21-1 单元测试
// 经络可视化 + 体质趋势追踪 + 视图桥接
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { MeridianRecord, MeridianFeeling, MeridianType, ConstitutionAnalysis, MoodRecord } from '../types'
import { CONSTITUTION_META, BODY_WISDOM_STORAGE_KEYS } from '../types'
import { useMeridianVisualization } from '../meridian-visualization'
import { useConstitutionTrend } from '../constitution-trend'
import { useBodyWisdomBridge } from '../body-wisdom-bridge'
import type { YearlyMovement } from '../five-movements'
import { storage } from '../../../engine/storage'

// ---- 测试辅助函数 ----

function createMeridianRecord(overrides: Partial<MeridianRecord> = {}): MeridianRecord {
  return {
    id: 'mr_' + Math.random().toString(36).slice(2, 8),
    meridian: 'heart' as MeridianType,
    feeling: 'good' as MeridianFeeling,
    recordedAt: new Date().toISOString(),
    hour: 12,
    ...overrides,
  }
}

function createMoodRecord(overrides: Partial<MoodRecord> = {}): MoodRecord {
  return {
    id: 'md_' + Math.random().toString(36).slice(2, 8),
    mood: 'calm',
    insight: '心情平静',
    recordedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createConstitutionAnalysis(type: string = 'balanced'): ConstitutionAnalysis {
  const scores: Record<string, number> = {
    balanced: 0.8,
    'qi-deficiency': 0.3,
    'yang-deficiency': 0.2,
    'yin-deficiency': 0.1,
    'phlegm-dampness': 0.1,
    'damp-heat': 0.1,
    'blood-stasis': 0.05,
    'qi-stagnation': 0.1,
    allergic: 0.05,
  }
  return {
    type: type as any,
    label: CONSTITUTION_META[type as keyof typeof CONSTITUTION_META]?.label ?? type,
    scores: scores as any,
    characteristics: ['面色润泽'],
    recommendations: ['保持良好习惯'],
    analyzedAt: new Date().toISOString(),
  }
}

function createYearlyMovement(overrides: Partial<YearlyMovement> = {}): YearlyMovement {
  return {
    year: 2026,
    heavenlyStem: '甲',
    earthlyBranch: '子',
    greatMovement: 'wood',
    isExcess: true,
    celestialManager: '少阴君火',
    terrestrialSpring: '阳明燥金',
    hostMovement: '太角',
    guestMovement: '少徵',
    currentTerm: '立春',
    currentHostQi: '厥阴风木',
    currentGuestQi: '少阳相火',
    healthAdvice: '宜疏肝理气',
    ...overrides,
  }
}

// ============================================================
// 1. useMeridianVisualization — 经络可视化引擎
// ============================================================

describe('P21-1 经络可视化引擎', () => {
  let viz: ReturnType<typeof useMeridianVisualization>

  beforeEach(() => {
    viz = useMeridianVisualization()
  })

  describe('computeClockNodes - 子午流注时钟', () => {
    it('空记录返回12个节点', () => {
      const nodes = viz.computeClockNodes([])
      expect(nodes).toHaveLength(12)
    })

    it('所有节点健康率为0且无当前标记时', () => {
      const nodes = viz.computeClockNodes([])
      for (const node of nodes) {
        expect(node.healthRate).toBe(0)
        expect(node.recordCount).toBe(0)
      }
    })

    it('有记录时正确计算健康率', () => {
      const records: MeridianRecord[] = [
        createMeridianRecord({ meridian: 'heart', feeling: 'good' }),
        createMeridianRecord({ meridian: 'heart', feeling: 'good' }),
        createMeridianRecord({ meridian: 'heart', feeling: 'bad' }),
      ]
      const nodes = viz.computeClockNodes(records)
      const heartNode = nodes.find(n => n.meridian === 'heart')
      expect(heartNode).toBeDefined()
      expect(heartNode!.healthRate).toBe(67) // 2/3 ≈ 67%
      expect(heartNode!.recordCount).toBe(3)
    })

    it('节点角度均匀分布360度', () => {
      const nodes = viz.computeClockNodes([])
      const angles = nodes.map(n => n.angle)
      // 第一个节点从-90度开始
      expect(angles[0]).toBe(-90)
      expect(angles[11]).toBe(240)
    })

    it('当前时辰节点标记 isCurrent', () => {
      const nodes = viz.computeClockNodes([])
      const current = nodes.filter(n => n.isCurrent)
      expect(current).toHaveLength(1)
    })

    it('每个节点有颜色', () => {
      const nodes = viz.computeClockNodes([])
      for (const node of nodes) {
        expect(node.color).toBeTruthy()
        expect(node.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })

  describe('currentClockNode - 当前时辰节点', () => {
    it('返回当前时辰对应的节点', () => {
      const node = viz.currentClockNode.value
      expect(node).toBeDefined()
      expect(node!.meridian).toBeTruthy()
      expect(node!.isCurrent).toBe(true)
    })
  })

  describe('getHourReminders - 时辰养生提醒', () => {
    it('返回12个时辰提醒', () => {
      const reminders = viz.getHourReminders()
      expect(reminders).toHaveLength(12)
    })

    it('每个提醒包含时辰、经络、建议', () => {
      const reminders = viz.getHourReminders()
      for (const r of reminders) {
        expect(r.hour).toBeGreaterThanOrEqual(0)
        expect(r.meridian).toBeTruthy()
        expect(r.organ).toBeTruthy()
        expect(r.advice).toBeTruthy()
        expect(r.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })

    it('当前时辰标记 isActive', () => {
      const reminders = viz.getHourReminders()
      const active = reminders.filter(r => r.isActive)
      expect(active).toHaveLength(1)
    })

    it('00:00-00:59（子时后半）应激活胆经，不出现空集', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 7, 8, 0, 30))
      try {
        const reminders = viz.getHourReminders()
        const active = reminders.filter(r => r.isActive)
        expect(active).toHaveLength(1)
        expect(active[0].meridian).toBe('gallbladder')
        const advice = viz.getCurrentHourAdvice()
        expect(advice.current.isActive).toBe(true)
        expect(advice.current.meridian).toBe('gallbladder')
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('computeHeatmapData - 经络热力图', () => {
    it('空记录返回12个经络热力图数据', () => {
      const data = viz.computeHeatmapData([])
      expect(data).toHaveLength(12)
    })

    it('空记录所有评分为0', () => {
      const data = viz.computeHeatmapData([])
      for (const d of data) {
        expect(d.averageScore).toBe(0)
      }
    })

    it('有记录时计算7天数据', () => {
      const records: MeridianRecord[] = [
        createMeridianRecord({ meridian: 'liver', feeling: 'good' }),
        createMeridianRecord({ meridian: 'liver', feeling: 'good' }),
        createMeridianRecord({ meridian: 'liver', feeling: 'ok' }),
      ]
      const data = viz.computeHeatmapData(records)
      const liverData = data.find(d => d.meridian === 'liver')
      expect(liverData).toBeDefined()
      expect(liverData!.dailyFeelings).toHaveLength(7)
    })

    it('按评分升序排列', () => {
      const data = viz.computeHeatmapData([])
      for (let i = 1; i < data.length; i++) {
        expect(data[i].averageScore).toBeGreaterThanOrEqual(data[i - 1].averageScore)
      }
    })

    it('改善趋势判断正确', () => {
      const now = new Date()
      const records: MeridianRecord[] = []
      // 最近3天良好，前3天不好
      for (let i = 0; i < 3; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        records.push(createMeridianRecord({
          meridian: 'kidney',
          feeling: 'good',
          recordedAt: d.toISOString(),
        }))
      }
      for (let i = 3; i < 6; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        records.push(createMeridianRecord({
          meridian: 'kidney',
          feeling: 'bad',
          recordedAt: d.toISOString(),
        }))
      }
      const data = viz.computeHeatmapData(records)
      const kidneyData = data.find(d => d.meridian === 'kidney')
      expect(kidneyData).toBeDefined()
      expect(kidneyData!.trend).toBe('improving')
    })
  })

  describe('computeElementRelations - 五行生克关系', () => {
    it('返回10条五行关系', () => {
      const relations = viz.computeElementRelations([])
      expect(relations).toHaveLength(10)
    })

    it('包含5条生关系和5条克关系', () => {
      const relations = viz.computeElementRelations([])
      const generating = relations.filter(r => r.type === 'generating')
      const controlling = relations.filter(r => r.type === 'controlling')
      expect(generating).toHaveLength(5)
      expect(controlling).toHaveLength(5)
    })

    it('每条关系有 source, target, strength', () => {
      const relations = viz.computeElementRelations([])
      for (const r of relations) {
        expect(r.source).toBeTruthy()
        expect(r.target).toBeTruthy()
        expect(r.strength).toBeGreaterThan(0)
        expect(r.strength).toBeLessThanOrEqual(1)
      }
    })

    it('健康率高时生关系强度增加', () => {
      const records: MeridianRecord[] = []
      for (let i = 0; i < 10; i++) {
        records.push(createMeridianRecord({ meridian: 'liver', feeling: 'good' }))
      }
      const relations = viz.computeElementRelations(records)
      // 木生火 - 木元素健康率高，强度应增加
      const woodFire = relations.find(r => r.source === '木' && r.target === '火')
      expect(woodFire).toBeDefined()
      expect(woodFire!.strength).toBeGreaterThanOrEqual(0.8)
    })
  })

  describe('getElementPositions - 五行动态节点位置', () => {
    it('返回5个元素位置', () => {
      const positions = viz.getElementPositions()
      expect(positions).toHaveLength(5)
    })

    it('每个元素有 x, y, color', () => {
      const positions = viz.getElementPositions()
      for (const p of positions) {
        expect(p.x).toBeGreaterThan(0)
        expect(p.y).toBeGreaterThan(0)
        expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })

  describe('computeTrendData - 经络趋势图', () => {
    it('空记录返回30天趋势点', () => {
      const trend = viz.computeTrendData([])
      expect(trend).toHaveLength(30)
    })

    it('指定经络过滤', () => {
      const records: MeridianRecord[] = [
        createMeridianRecord({ meridian: 'heart', feeling: 'good' }),
        createMeridianRecord({ meridian: 'liver', feeling: 'bad' }),
      ]
      const trend = viz.computeTrendData(records, 'heart')
      for (const point of trend) {
        expect(point.recordCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('computeAggregateTrend - 聚合趋势', () => {
    it('返回12条数据集', () => {
      const result = viz.computeAggregateTrend([])
      expect(result.datasets).toHaveLength(12)
      expect(result.labels).toHaveLength(7)
    })
  })

  describe('computeHealthSummary - 经络健康摘要', () => {
    it('空记录返回0评分', () => {
      const summary = viz.computeHealthSummary([])
      expect(summary.totalRecords).toBe(0)
      expect(summary.overallGoodRate).toBe(0)
      expect(summary.coveredMeridians).toBe(0)
    })

    it('有记录时计算最佳和最差经络', () => {
      const records: MeridianRecord[] = [
        createMeridianRecord({ meridian: 'heart', feeling: 'good' }),
        createMeridianRecord({ meridian: 'heart', feeling: 'good' }),
        createMeridianRecord({ meridian: 'heart', feeling: 'good' }),
        createMeridianRecord({ meridian: 'liver', feeling: 'bad' }),
        createMeridianRecord({ meridian: 'liver', feeling: 'bad' }),
        createMeridianRecord({ meridian: 'liver', feeling: 'bad' }),
      ]
      const summary = viz.computeHealthSummary(records)
      expect(summary.totalRecords).toBe(6)
      expect(summary.overallGoodRate).toBe(50)
      expect(summary.bestMeridian).toBeDefined()
      expect(summary.worstMeridian).toBeDefined()
    })
  })

  describe('getCurrentHourAdvice - 当前时辰养生建议', () => {
    it('返回当前、下一个、上一个时辰建议', () => {
      const advice = viz.getCurrentHourAdvice()
      expect(advice.current).toBeDefined()
      expect(advice.next).toBeDefined()
      expect(advice.previous).toBeDefined()
      expect(advice.current.isActive).toBe(true)
    })
  })

  describe('selectMeridian / updateConfig', () => {
    it('selectMeridian 设置选中经络', () => {
      viz.selectMeridian('heart')
      expect(viz.config.value.selectedMeridian).toBe('heart')
    })

    it('selectMeridian null 清除选中', () => {
      viz.selectMeridian('heart')
      viz.selectMeridian(null)
      expect(viz.config.value.selectedMeridian).toBeNull()
    })

    it('updateConfig 部分更新配置', () => {
      viz.updateConfig({ clockRadius: 300, showLabels: false })
      expect(viz.config.value.clockRadius).toBe(300)
      expect(viz.config.value.showLabels).toBe(false)
      expect(viz.config.value.animate).toBe(true) // 未改
    })
  })
})

// ============================================================
// 2. useConstitutionTrend — 体质趋势追踪
// ============================================================

// 存储键常量
const TREND_STORAGE_KEYS = {
  trendHistory: 'hf:body-wisdom:constitution-trend-history',
  wellnessScores: 'hf:body-wisdom:wellness-scores',
  changeLog: 'hf:body-wisdom:constitution-change-log',
}

describe('P21-1 体质趋势追踪', () => {
  let trend: ReturnType<typeof useConstitutionTrend>

  beforeEach(() => {
    // 清除存储避免测试间污染
    storage.setKV(TREND_STORAGE_KEYS.trendHistory, [])
    storage.setKV(TREND_STORAGE_KEYS.wellnessScores, [])
    storage.setKV(TREND_STORAGE_KEYS.changeLog, [])
    trend = useConstitutionTrend()
  })

  describe('addTrendPoint - 添加趋势点', () => {
    it('添加第一个趋势点稳定性为1', () => {
      const analysis = createConstitutionAnalysis('balanced')
      const point = trend.addTrendPoint(analysis)
      expect(point.type).toBe('balanced')
      expect(point.stability).toBe(1)
      expect(point.primaryScore).toBeGreaterThan(0)
    })

    it('多次添加计算稳定性', () => {
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      const point2 = trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      expect(point2.stability).toBeGreaterThanOrEqual(0.9)
      expect(trend.trendHistory.value).toHaveLength(2)
    })

    it('体质变化时稳定性降低', () => {
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      // 创建 scores 差异较大的分析
      const newAnalysis = createConstitutionAnalysis('qi-deficiency')
      // 修改 scores 使差异更大
      newAnalysis.scores['qi-deficiency'] = 0.9
      newAnalysis.scores['balanced'] = 0.1
      const point2 = trend.addTrendPoint(newAnalysis)
      // 由于分数变化较大，稳定性应降低
      expect(point2.stability).toBeLessThan(1)
    })

    it('历史限制50条', () => {
      for (let i = 0; i < 60; i++) {
        trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      }
      expect(trend.trendHistory.value.length).toBeLessThanOrEqual(50)
    })
  })

  describe('trendChartData - 趋势图表数据', () => {
    it('空趋势返回null', () => {
      expect(trend.trendChartData.value).toBeNull()
    })

    it('有趋势时返回图表数据', () => {
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      const data = trend.trendChartData.value
      expect(data).not.toBeNull()
      expect(data!.labels).toHaveLength(1)
      expect(data!.datasets).toHaveLength(9) // 9种体质
    })
  })

  describe('recentTrend - 最近趋势', () => {
    it('少于2个点返回null', () => {
      expect(trend.recentTrend.value).toBeNull()
    })

    it('多个点返回趋势方向', () => {
      trend.addTrendPoint(createConstitutionAnalysis('qi-deficiency'))
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      const t = trend.recentTrend.value
      expect(t).not.toBeNull()
      expect(t!.direction).toBeTruthy()
    })
  })

  describe('predictShift - 体质偏移预测', () => {
    it('无风险因素时概率为0', () => {
      const analysis = createConstitutionAnalysis('balanced')
      const prediction = trend.predictShift(analysis, null, [], [])
      expect(prediction.shiftProbability).toBe(0)
      expect(prediction.riskLevel).toBe('low')
      expect(prediction.triggers).toHaveLength(0)
    })

    it('五运六气影响生成触发因素', () => {
      const analysis = createConstitutionAnalysis('qi-stagnation')
      const fiveSix = createYearlyMovement()
      const prediction = trend.predictShift(analysis, fiveSix, [], [])
      expect(prediction.triggers.length).toBeGreaterThanOrEqual(1)
      expect(prediction.shiftProbability).toBeGreaterThanOrEqual(0.2)
    })

    it('经络不良率触发因素', () => {
      const analysis = createConstitutionAnalysis('qi-deficiency')
      const records: MeridianRecord[] = []
      for (let i = 0; i < 5; i++) {
        records.push(createMeridianRecord({ feeling: 'bad' }))
      }
      const prediction = trend.predictShift(analysis, null, records, [])
      expect(prediction.triggers.some(t => t.includes('经络不良率'))).toBe(true)
    })

    it('负面情绪多触发因素', () => {
      const analysis = createConstitutionAnalysis('qi-stagnation')
      const moods: MoodRecord[] = [
        createMoodRecord({ mood: 'anxious' }),
        createMoodRecord({ mood: 'sad' }),
        createMoodRecord({ mood: 'angry' }),
        createMoodRecord({ mood: 'fearful' }),
      ]
      const prediction = trend.predictShift(analysis, null, [], moods)
      expect(prediction.triggers.some(t => t.includes('负面情绪'))).toBe(true)
    })

    it('多触发因素时风险等级为high', () => {
      const analysis = createConstitutionAnalysis('qi-stagnation')
      const fiveSix = createYearlyMovement()
      const records: MeridianRecord[] = Array.from({ length: 5 }, () => createMeridianRecord({ feeling: 'bad' }))
      const moods: MoodRecord[] = Array.from({ length: 5 }, () => createMoodRecord({ mood: 'anxious' }))
      const prediction = trend.predictShift(analysis, fiveSix, records, moods)
      expect(prediction.triggers.length).toBeGreaterThanOrEqual(3)
      expect(prediction.shiftProbability).toBe(0.6)
      expect(prediction.riskLevel).toBe('high')
      expect(prediction.preventionAdvice.length).toBeGreaterThan(0)
    })
  })

  describe('detectChange - 体质转变检测', () => {
    it('无历史返回null', () => {
      const analysis = createConstitutionAnalysis('balanced')
      expect(trend.detectChange(analysis)).toBeNull()
    })

    it('类型不变且得分变化不大返回null', () => {
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      const analysis = createConstitutionAnalysis('balanced')
      expect(trend.detectChange(analysis)).toBeNull()
    })

    it('类型改变检测到转变', () => {
      trend.addTrendPoint(createConstitutionAnalysis('qi-deficiency'))
      const analysis = createConstitutionAnalysis('balanced')
      const change = trend.detectChange(analysis)
      expect(change).not.toBeNull()
      expect(change!.hasChanged).toBe(true)
      expect(change!.previousType).toBe('qi-deficiency')
      expect(change!.currentType).toBe('balanced')
      expect(change!.direction).toBe('improved')
    })

    it('转向平和质为改善', () => {
      trend.addTrendPoint(createConstitutionAnalysis('qi-deficiency'))
      const analysis = createConstitutionAnalysis('balanced')
      const change = trend.detectChange(analysis)
      expect(change!.direction).toBe('improved')
    })

    it('从平和质转为偏颇为恶化', () => {
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      const analysis = createConstitutionAnalysis('qi-deficiency')
      const change = trend.detectChange(analysis)
      expect(change!.direction).toBe('worsened')
    })
  })

  describe('computeWellnessScore - 养生评分', () => {
    it('计算各维度评分', () => {
      const analysis = createConstitutionAnalysis('balanced')
      const records: MeridianRecord[] = [
        createMeridianRecord({ feeling: 'good' }),
        createMeridianRecord({ feeling: 'good' }),
      ]
      const moods: MoodRecord[] = [
        createMoodRecord({ mood: 'calm' }),
        createMoodRecord({ mood: 'happy' }),
      ]
      const score = trend.computeWellnessScore(analysis, records, moods, null)
      expect(score.overall).toBeGreaterThan(0)
      expect(score.overall).toBeLessThanOrEqual(100)
      expect(score.dimensions.physical).toBeGreaterThan(0)
      expect(score.dimensions.emotional).toBeGreaterThan(0)
      expect(score.dimensions.meridian).toBeGreaterThan(0)
      expect(score.dimensions.lifestyle).toBe(65)
    })

    it('平和质体质评分高', () => {
      const analysis = createConstitutionAnalysis('balanced')
      const score = trend.computeWellnessScore(analysis, [], [], null)
      expect(score.dimensions.physical).toBe(90)
    })

    it('趋势变化正确', () => {
      const analysis = createConstitutionAnalysis('balanced')
      trend.computeWellnessScore(analysis, [], [], null)
      const score2 = trend.computeWellnessScore(analysis, [], [], null)
      // 两次评分相同，趋势应为 stable
      expect(score2.trend).toBe('stable')
    })

    it('评分保存到历史', () => {
      const analysis = createConstitutionAnalysis('balanced')
      trend.computeWellnessScore(analysis, [], [], null)
      expect(trend.wellnessScores.value).toHaveLength(1)
    })
  })

  describe('latestWellnessScore / wellnessTrend', () => {
    it('无评分时 latestWellnessScore 为 null', () => {
      expect(trend.latestWellnessScore.value).toBeNull()
    })

    it('有评分时返回最新', () => {
      const analysis = createConstitutionAnalysis('balanced')
      trend.computeWellnessScore(analysis, [], [], null)
      expect(trend.latestWellnessScore.value).not.toBeNull()
      expect(trend.latestWellnessScore.value!.overall).toBeGreaterThan(0)
    })

    it('wellnessTrend 返回最近14个评分', () => {
      const analysis = createConstitutionAnalysis('balanced')
      trend.computeWellnessScore(analysis, [], [], null)
      const wt = trend.wellnessTrend.value
      expect(wt.length).toBeGreaterThan(0)
      expect(wt[0].overall).toBeGreaterThan(0)
    })
  })

  describe('generatePersonalizedAdvice - 个性化调理建议', () => {
    it('返回所有维度的建议', () => {
      const analysis = createConstitutionAnalysis('balanced')
      const advice = trend.generatePersonalizedAdvice(analysis, null, [], [])
      expect(advice.diet.length).toBeGreaterThan(0)
      expect(advice.exercise.length).toBeGreaterThan(0)
      expect(advice.acupressure.length).toBeGreaterThan(0)
      expect(advice.lifestyle.length).toBeGreaterThan(0)
      expect(advice.emotional.length).toBeGreaterThan(0)
      expect(advice.seasonal.length).toBeGreaterThan(0)
    })

    it('气虚质增加黄芪建议', () => {
      const analysis = createConstitutionAnalysis('qi-deficiency')
      const advice = trend.generatePersonalizedAdvice(analysis, null, [], [])
      const hasHuangqi = advice.diet.some(d => d.food === '黄芪')
      expect(hasHuangqi).toBe(true)
    })

    it('气郁质增加太冲穴', () => {
      const analysis = createConstitutionAnalysis('qi-stagnation')
      const advice = trend.generatePersonalizedAdvice(analysis, null, [], [])
      const hasTaichong = advice.acupressure.some(a => a.point === '太冲')
      expect(hasTaichong).toBe(true)
    })

    it('血瘀/气郁质增加太极运动', () => {
      const analysis = createConstitutionAnalysis('blood-stasis')
      const advice = trend.generatePersonalizedAdvice(analysis, null, [], [])
      const hasTaiji = advice.exercise.some(e => e.type === '太极')
      expect(hasTaiji).toBe(true)
    })

    it('五运六气建议追加', () => {
      const fiveSix = createYearlyMovement()
      const analysis = createConstitutionAnalysis('balanced')
      const advice = trend.generatePersonalizedAdvice(analysis, fiveSix, [], [])
      expect(advice.fiveSixBased.length).toBeGreaterThan(0)
    })
  })

  describe('stabilityAnalysis - 体质稳定性分析', () => {
    it('少于2个点返回null', () => {
      expect(trend.stabilityAnalysis.value).toBeNull()
    })

    it('稳定体质返回稳定分析', () => {
      for (let i = 0; i < 5; i++) {
        trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      }
      const analysis = trend.stabilityAnalysis.value
      expect(analysis).not.toBeNull()
      expect(analysis!.stable).toBe(true)
      expect(analysis!.stability).toBe(1)
    })

    it('波动体质返回不稳定分析', () => {
      trend.addTrendPoint(createConstitutionAnalysis('balanced'))
      trend.addTrendPoint(createConstitutionAnalysis('qi-deficiency'))
      trend.addTrendPoint(createConstitutionAnalysis('yin-deficiency'))
      const analysis = trend.stabilityAnalysis.value
      expect(analysis).not.toBeNull()
      expect(analysis!.stable).toBe(false)
      expect(analysis!.uniqueTypes).toBeGreaterThan(1)
    })
  })
})

// ============================================================
// 3. useBodyWisdomBridge — 视图桥接
// ============================================================

describe('P21-1 视图桥接层', () => {
  let bridge: ReturnType<typeof useBodyWisdomBridge>

  beforeEach(() => {
    // 清除存储避免测试间污染
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.CONSTITUTION, null)
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.MERIDIANS, [])
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.MOODS, [])
    storage.setKV('hf:body-wisdom:constitution-history', [])
    bridge = useBodyWisdomBridge()
  })

  describe('基础状态', () => {
    it('isLoaded 初始化后为 true', () => {
      expect(bridge.isLoaded.value).toBe(true)
    })

    it('meridianRecords 初始化为数组', () => {
      expect(Array.isArray(bridge.meridianRecords.value)).toBe(true)
    })

    it('constitutionHistory 初始化为数组', () => {
      expect(Array.isArray(bridge.constitutionHistory.value)).toBe(true)
    })

    it('moodRecords 初始化为数组', () => {
      expect(Array.isArray(bridge.moodRecords.value)).toBe(true)
    })
  })

  describe('计算属性', () => {
    it('currentMeridian 返回当前时辰经络', () => {
      const cm = bridge.currentMeridian.value
      expect(cm).toBeDefined()
      expect(cm!.meridian).toBeTruthy()
      expect(cm!.organ).toBeTruthy()
      expect(cm!.advice).toBeTruthy()
    })

    it('meridianStats 返回统计数据', () => {
      const stats = bridge.meridianStats.value
      expect(stats).toBeDefined()
      expect(stats.totalRecords).toBeGreaterThanOrEqual(0)
    })

    it('meridianClockData 返回12个时钟节点', () => {
      const data = bridge.meridianClockData.value
      expect(data).toHaveLength(12)
    })

    it('organRadarData 返回5个器官数据', () => {
      const data = bridge.organRadarData.value
      expect(data).toHaveLength(5)
      for (const d of data) {
        expect(d.organ).toBeTruthy()
        expect(d.element).toBeTruthy()
        expect(d.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })

    it('moodTrend 返回14天趋势', () => {
      const trend = bridge.moodTrend.value
      expect(trend).toHaveLength(14)
    })

    it('todayRecords 返回今日记录', () => {
      const records = bridge.todayRecords.value
      expect(Array.isArray(records)).toBe(true)
    })

    it('healthSummary 返回健康摘要', () => {
      const summary = bridge.healthSummary.value
      expect(summary.overallScore).toBeGreaterThanOrEqual(0)
      expect(summary.constitutionType).toBeTruthy()
    })
  })

  describe('recordMood - 记录情绪', () => {
    it('记录情绪追加到 moodRecords', () => {
      const initialLen = bridge.moodRecords.value.length
      const record = bridge.recordMood('calm', '心情平静')
      expect(record.mood).toBe('calm')
      expect(record.insight).toBe('心情平静')
      expect(bridge.moodRecords.value.length).toBe(initialLen + 1)
    })

    it('可选关联脏腑', () => {
      const record = bridge.recordMood('anxious', '焦虑不安', 'spleen')
      expect(record.relatedOrgan).toBe('spleen')
    })

    it('限制最大500条', () => {
      for (let i = 0; i < 510; i++) {
        bridge.recordMood('calm', `记录${i}`)
      }
      expect(bridge.moodRecords.value.length).toBeLessThanOrEqual(500)
    })
  })

  describe('performConstitutionAnalysis - 体质分析', () => {
    it('执行体质分析并保存', async () => {
      const answers = new Array(15).fill(false)
      const result = await bridge.performConstitutionAnalysis(answers)
      expect(result).toBeDefined()
      expect(result.type).toBeTruthy()
      expect(result.label).toBeTruthy()
    })

    it('分析结果追加到历史', async () => {
      const initialLen = bridge.constitutionHistory.value.length
      const answers = new Array(15).fill(false)
      await bridge.performConstitutionAnalysis(answers)
      expect(bridge.constitutionHistory.value.length).toBe(initialLen + 1)
    })

    it('历史限制20条', async () => {
      for (let i = 0; i < 25; i++) {
        await bridge.performConstitutionAnalysis(new Array(15).fill(i % 2 === 0))
      }
      expect(bridge.constitutionHistory.value.length).toBeLessThanOrEqual(20)
    })
  })

  describe('generateHealthReport - 生成健康报告', () => {
    it('生成健康报告', () => {
      const report = bridge.generateHealthReport()
      expect(report).toBeDefined()
      expect(report.id).toMatch(/^health_/)
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.meridianScore).toBeGreaterThanOrEqual(0)
      expect(report.moodScore).toBeGreaterThanOrEqual(0)
      expect(report.rhythmScore).toBeGreaterThanOrEqual(0)
      expect(report.meridianDetails).toBeDefined()
      expect(report.recommendations).toBeDefined()
    })
  })

  describe('generateWellness - 生成调理方案', () => {
    it('无体质分析时返回null', () => {
      expect(bridge.generateWellness()).toBeNull()
    })
  })

  describe('constitutionDistribution - 体质分布', () => {
    it('无分析时返回null', () => {
      expect(bridge.constitutionDistribution.value).toBeNull()
    })
  })

  describe('子模块引用', () => {
    it('fiveMovements 可访问', () => {
      expect(bridge.fiveMovements).toBeDefined()
      expect(bridge.fiveMovements.calculateYearlyMovement).toBeInstanceOf(Function)
    })

    it('constitutionAnalyzer 可访问', () => {
      expect(bridge.constitutionAnalyzer).toBeDefined()
      expect(bridge.constitutionAnalyzer.analyzeFromAnswers).toBeInstanceOf(Function)
    })

    it('meridianCheck 可访问', () => {
      expect(bridge.meridianCheck).toBeDefined()
    })

    it('wellnessPlan 可访问', () => {
      expect(bridge.wellnessPlan).toBeDefined()
    })

    it('healthAnalysis 可访问', () => {
      expect(bridge.healthAnalysis).toBeDefined()
      expect(bridge.healthAnalysis.generateReport).toBeInstanceOf(Function)
    })
  })
})