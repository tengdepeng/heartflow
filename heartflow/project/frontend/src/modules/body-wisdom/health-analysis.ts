// ============================================================
// 藏象阁 · 健康分析引擎
// 体质趋势分析、经络健康报告、五运六气适配、情绪-脏腑关联
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { MeridianRecord, MeridianType, ConstitutionType, MoodRecord, OrganType } from './types'
import { ORGAN_ELEMENT_MAP, MERIDIAN_HOURS } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 健康评分维度 */
export type HealthDimension = 'meridian' | 'constitution' | 'mood' | 'rhythm' | 'overall'

/** 健康分析报告 */
export interface HealthAnalysisReport {
  id: string
  /** 经络健康评分 0-100 */
  meridianScore: number
  /** 体质适配评分 0-100 */
  constitutionScore: number
  /** 情绪稳定评分 0-100 */
  moodScore: number
  /** 作息节律评分 0-100 */
  rhythmScore: number
  /** 综合健康评分 0-100 */
  overallScore: number
  /** 各经络详细状态 */
  meridianDetails: MeridianHealthDetail[]
  /** 体质趋势 */
  constitutionTrend: ConstitutionTrendPoint[]
  /** 情绪-脏腑关联 */
  moodOrganLinks: MoodOrganLink[]
  /** 建议列表 */
  recommendations: HealthRecommendation[]
  /** 生成时间 */
  generatedAt: string
}

/** 经络健康详情 */
export interface MeridianHealthDetail {
  meridian: MeridianType
  organ: string
  element: string
  /** 良好率 0-1 */
  goodRate: number
  /** 记录数 */
  recordCount: number
  /** 趋势: improving/stable/declining */
  trend: 'improving' | 'stable' | 'declining'
  /** 最近7天感受 */
  recentFeelings: string[]
  /** 时辰建议 */
  hourAdvice: string
}

/** 体质趋势点 */
export interface ConstitutionTrendPoint {
  date: string
  type: ConstitutionType
  score: number
}

/** 情绪-脏腑关联 */
export interface MoodOrganLink {
  mood: MoodRecord['mood']
  organ: OrganType
  element: string
  count: number
  /** 关联强度 0-1 */
  strength: number
}

/** 健康建议 */
export interface HealthRecommendation {
  id: string
  category: 'diet' | 'exercise' | 'rest' | 'mindfulness' | 'lifestyle'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  relatedOrgans: OrganType[]
}

/** 健康维度元数据 */
export const HEALTH_DIMENSION_META: Record<HealthDimension, { label: string; icon: string; weight: number }> = {
  meridian: { label: '经络', icon: '🔄', weight: 0.3 },
  constitution: { label: '体质', icon: '⚖️', weight: 0.25 },
  mood: { label: '情绪', icon: '💭', weight: 0.25 },
  rhythm: { label: '作息', icon: '🕐', weight: 0.2 },
  overall: { label: '综合', icon: '📊', weight: 1.0 },
}

/** 存储键 */
const HEALTH_ANALYSIS_KEY = 'hf:body-wisdom:health-analysis'

// ============================================================
// 健康分析引擎
// ============================================================

export function useHealthAnalysis() {
  const reports = ref<HealthAnalysisReport[]>(loadReports())

  function loadReports(): HealthAnalysisReport[] {
    try {
      const raw = storage.getKV<string>(HEALTH_ANALYSIS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveReports() {
    storage.setKV(HEALTH_ANALYSIS_KEY, JSON.stringify(reports.value))
  }

  // ---- 经络健康分析 ----

  /** 计算经络健康评分 */
  function calculateMeridianScore(records: MeridianRecord[]): number {
    if (records.length === 0) return 0
    const goodCount = records.filter(r => r.feeling === 'good').length
    const okCount = records.filter(r => r.feeling === 'ok').length
    return Math.round(((goodCount * 100 + okCount * 60) / (records.length * 100)) * 100)
  }

  /** 获取各经络详细状态 */
  function getMeridianDetails(records: MeridianRecord[]): MeridianHealthDetail[] {
    const meridianMap = new Map<string, MeridianRecord[]>()
    for (const r of records) {
      const list = meridianMap.get(r.meridian) || []
      list.push(r)
      meridianMap.set(r.meridian, list)
    }

    const details: MeridianHealthDetail[] = []
    for (const [meridian, recs] of meridianMap) {
      const meridianHour = MERIDIAN_HOURS.find(h => h.meridian === meridian)
      const goodCount = recs.filter(r => r.feeling === 'good').length
      const goodRate = recs.length > 0 ? goodCount / recs.length : 0
      const sorted = [...recs].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      const recent7 = sorted.slice(0, 7)
      const mid = Math.floor(recent7.length / 2)
      const firstHalf = recent7.slice(0, mid).filter(r => r.feeling === 'good').length
      const secondHalf = recent7.slice(mid).filter(r => r.feeling === 'good').length
      const trend: 'improving' | 'stable' | 'declining' =
        secondHalf > firstHalf ? 'improving' : secondHalf < firstHalf ? 'declining' : 'stable'

      details.push({
        meridian: meridian as MeridianType,
        organ: meridianHour?.organ ?? meridian,
        element: meridianHour?.element ?? 'unknown',
        goodRate,
        recordCount: recs.length,
        trend,
        recentFeelings: recent7.map(r => r.feeling),
        hourAdvice: meridianHour?.advice ?? '',
      })
    }
    return details.sort((a, b) => a.goodRate - b.goodRate)
  }

  // ---- 体质趋势分析 ----

  /** 分析体质趋势 */
  function analyzeConstitutionTrend(
    records: { date: string; type: ConstitutionType; score: number }[]
  ): ConstitutionTrendPoint[] {
    return [...records]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
  }

  // ---- 情绪-脏腑关联 ----

  /** 分析情绪与脏腑关联 */
  function analyzeMoodOrganLinks(moodRecords: MoodRecord[]): MoodOrganLink[] {
    const links: MoodOrganLink[] = []
    const moodOrganMap: Record<string, OrganType> = {
      calm: 'heart',
      anxious: 'spleen',
      sad: 'lung',
      happy: 'heart',
      angry: 'liver',
      fearful: 'kidney',
    }

    const counter = new Map<string, number>()
    for (const record of moodRecords) {
      const organ = record.relatedOrgan || moodOrganMap[record.mood] || 'heart'
      const key = `${record.mood}:${organ}`
      counter.set(key, (counter.get(key) ?? 0) + 1)
    }

    const total = moodRecords.length
    for (const [key, count] of counter) {
      const [mood, organ] = key.split(':') as [MoodRecord['mood'], OrganType]
      const organInfo = ORGAN_ELEMENT_MAP[organ]
      links.push({
        mood,
        organ,
        element: organInfo?.element ?? 'unknown',
        count,
        strength: total > 0 ? count / total : 0,
      })
    }
    return links.sort((a, b) => b.strength - a.strength)
  }

  // ---- 作息节律分析 ----

  /** 计算作息节律评分 */
  function calculateRhythmScore(records: MeridianRecord[]): number {
    if (records.length === 0) return 0
    // 检查是否在子午流注对应时辰有记录
    const hourSet = new Set(records.map(r => r.hour))
    let coveredHours = 0
    for (const mh of MERIDIAN_HOURS) {
      if (hourSet.has(mh.hour)) coveredHours++
    }
    return Math.round((coveredHours / MERIDIAN_HOURS.length) * 100)
  }

  // ---- 综合报告 ----

  /** 生成健康分析报告 */
  function generateReport(
    meridianRecords: MeridianRecord[],
    moodRecords: MoodRecord[],
    constitutionTrends: { date: string; type: ConstitutionType; score: number }[] = []
  ): HealthAnalysisReport {
    const meridianScore = calculateMeridianScore(meridianRecords)
    const rhythmScore = calculateRhythmScore(meridianRecords)
    const meridianDetails = getMeridianDetails(meridianRecords)
    const moodOrganLinks = analyzeMoodOrganLinks(moodRecords)
    const constitutionTrend = analyzeConstitutionTrend(constitutionTrends)

    // 情绪评分
    const moodScore = moodRecords.length > 0
      ? Math.round((moodRecords.filter(m => m.mood === 'calm' || m.mood === 'happy').length / moodRecords.length) * 100)
      : 0

    // 体质评分
    const constitutionScore = constitutionTrends.length > 0
      ? Math.round(constitutionTrends.reduce((sum, t) => sum + t.score, 0) / constitutionTrends.length)
      : 0

    // 综合评分
    const overallScore = Math.round(
      meridianScore * 0.3 + constitutionScore * 0.25 + moodScore * 0.25 + rhythmScore * 0.2
    )

    const recommendations = generateRecommendations(meridianDetails, moodOrganLinks, overallScore)

    const report: HealthAnalysisReport = {
      id: `health_${Date.now()}`,
      meridianScore,
      constitutionScore,
      moodScore,
      rhythmScore,
      overallScore,
      meridianDetails,
      constitutionTrend,
      moodOrganLinks,
      recommendations,
      generatedAt: new Date().toISOString(),
    }

    reports.value.push(report)
    saveReports()
    return report
  }

  /** 获取最新报告 */
  const latestReport = computed(() => {
    const sorted = [...reports.value].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    )
    return sorted[0] || null
  })

  /** 获取报告历史 */
  function getReportHistory(limit?: number): HealthAnalysisReport[] {
    const sorted = [...reports.value].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    )
    return limit ? sorted.slice(0, limit) : sorted
  }

  return {
    reports,
    latestReport,
    calculateMeridianScore,
    getMeridianDetails,
    analyzeConstitutionTrend,
    analyzeMoodOrganLinks,
    calculateRhythmScore,
    generateReport,
    getReportHistory,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function generateRecommendations(
  meridianDetails: MeridianHealthDetail[],
  moodOrganLinks: MoodOrganLink[],
  overallScore: number
): HealthRecommendation[] {
  const recommendations: HealthRecommendation[] = []

  // 经络相关建议
  const weakMeridians = meridianDetails.filter(m => m.goodRate < 0.5)
  for (const m of weakMeridians.slice(0, 3)) {
    recommendations.push({
      id: `rec_meridian_${m.meridian}`,
      category: 'lifestyle',
      title: `关注${m.organ}经健康`,
      description: `${m.organ}经良好率仅${Math.round(m.goodRate * 100)}%，建议${m.hourAdvice}`,
      priority: m.goodRate < 0.3 ? 'high' : 'medium',
      relatedOrgans: [m.organ as OrganType],
    })
  }

  // 情绪关联建议
  const strongMoodLinks = moodOrganLinks.filter(l => l.strength > 0.3)
  for (const link of strongMoodLinks.slice(0, 2)) {
    recommendations.push({
      id: `rec_mood_${link.organ}`,
      category: 'mindfulness',
      title: `情绪与${link.organ}关联`,
      description: `「${link.mood}」情绪频繁关联${link.organ}，建议适当调息养${link.organ}`,
      priority: 'medium',
      relatedOrgans: [link.organ],
    })
  }

  // 综合建议
  if (overallScore < 60) {
    recommendations.push({
      id: 'rec_overall_low',
      category: 'rest',
      title: '综合健康评分偏低',
      description: '建议规律作息，关注子午流注时辰，适当增加运动',
      priority: 'high',
      relatedOrgans: ['heart', 'liver', 'spleen', 'lung', 'kidney'],
    })
  }

  return recommendations
}