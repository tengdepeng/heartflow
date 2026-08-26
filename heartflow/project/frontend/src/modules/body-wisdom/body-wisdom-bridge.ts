// ============================================================
// 藏象阁 · 视图桥接层（P21-1）
// 蓝图定义：
//   统一状态聚合（经络追踪+体质分析+五运六气+健康分析+情绪）
//   子午流注可视化数据
//   体质趋势跟踪
//   健康仪表盘数据
//   操作入口（记录经络+体质分析+经络自检+生成报告）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { useMeridianTracker, getCurrentMeridian } from './meridians'
import { useConstitutionAnalyzer } from './constitution'
import { useFiveMovements, useMeridianCheck, useWellnessPlan } from './five-movements'
import { useHealthAnalysis } from './health-analysis'
import type {
  MeridianRecord,
  MeridianType,
  MeridianFeeling,
  ConstitutionType,
  ConstitutionAnalysis,
  FiveMovementsSixQi,
  MoodRecord,
  MeridianStats,
} from './types'
import { BODY_WISDOM_STORAGE_KEYS, MERIDIAN_HOURS, ORGAN_ELEMENT_MAP, CONSTITUTION_META } from './types'
import type { HealthAnalysisReport } from './health-analysis'

// ---- 桥接层状态聚合 ----

/** 桥接层统一状态 */
export interface BodyWisdomBridgeState {
  // 经络追踪
  meridianRecords: MeridianRecord[]
  meridianStats: MeridianStats | null
  currentMeridian: { hour: number; meridian: MeridianType; organ: string; advice: string } | null
  attentionMeridians: { meridian: MeridianType; organ: string; rate: number; advice: string }[]

  // 体质分析
  constitutionAnalysis: ConstitutionAnalysis | null
  constitutionHistory: ConstitutionAnalysis[]

  // 五运六气
  fiveMovementsSixQi: FiveMovementsSixQi | null

  // 健康分析
  latestHealthReport: HealthAnalysisReport | null
  healthReportHistory: HealthAnalysisReport[]

  // 情绪
  moodRecords: MoodRecord[]
  moodTrend: { date: string; positiveRate: number }[]

  // 经络自检
  latestCheckReport: ReturnType<typeof useMeridianCheck>['latestReport'] extends { value: infer T } ? T : never
  checkReportHistory: ReturnType<typeof useMeridianCheck>['checkReports'] extends { value: infer T } ? T : never

  // 加载状态
  isLoaded: boolean
}

// ---- 桥接层存储键 ----

const BRIDGE_STORAGE_KEYS = {
  constitutionHistory: 'hf:body-wisdom:constitution-history',
  moodTrend: 'hf:body-wisdom:mood-trend',
} as const

// ============================================================
// useBodyWisdomBridge — 藏象阁视图桥接
// ============================================================

export function useBodyWisdomBridge() {
  const meridianTracker = useMeridianTracker()
  const constitutionAnalyzer = useConstitutionAnalyzer()
  const fiveMovements = useFiveMovements()
  const meridianCheck = useMeridianCheck()
  const wellnessPlan = useWellnessPlan()
  const healthAnalysis = useHealthAnalysis()

  const isLoaded = ref(false)

  // 体质历史
  const constitutionHistory = ref<ConstitutionAnalysis[]>(
    storage.getKV<ConstitutionAnalysis[]>(BRIDGE_STORAGE_KEYS.constitutionHistory, []),
  )

  // 情绪记录
  const moodRecords = ref<MoodRecord[]>(
    storage.getKV<MoodRecord[]>(BODY_WISDOM_STORAGE_KEYS.MOODS, []),
  )

  /** 加载所有数据 */
  async function loadAll(): Promise<void> {
    await meridianTracker.load()
    await constitutionAnalyzer.load()
    fiveMovements.calculateYearlyMovement(new Date().getFullYear())
    meridianCheck.loadCheckReports()
    healthAnalysis.getReportHistory()
    isLoaded.value = true
  }

  // ---- 计算属性 ----

  /** 经络统计 */
  const meridianStats = computed(() => meridianTracker.getStats())

  /** 当前经络 */
  const currentMeridian = computed(() => getCurrentMeridian())

  /** 需要关注的经络 */
  const attentionMeridians = computed(() => meridianTracker.getAttentionMeridians())

  /** 五运六气 */
  const fiveMovementsSixQi = computed(() => fiveMovements.yearlyMovement.value)

  /** 最新健康报告 */
  const latestHealthReport = computed(() => healthAnalysis.latestReport.value)

  /** 健康报告历史 */
  const healthReportHistory = computed(() => healthAnalysis.getReportHistory(10))

  /** 最新经络自检报告 */
  const latestCheckReport = computed(() => meridianCheck.latestReport.value)

  /** 经络自检历史 */
  const checkReportHistory = computed(() => meridianCheck.checkReports.value)

  /** 情绪趋势 */
  const moodTrend = computed(() => {
    const trend: { date: string; positiveRate: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayRecords = moodRecords.value.filter(r => r.recordedAt.startsWith(dateStr))
      const positive = dayRecords.filter(r => r.mood === 'calm' || r.mood === 'happy').length
      trend.push({
        date: dateStr.slice(5),
        positiveRate: dayRecords.length > 0 ? Math.round((positive / dayRecords.length) * 100) : 0,
      })
    }
    return trend
  })

  /** 子午流注时钟数据（12时辰可视化） */
  const meridianClockData = computed(() => {
    return MERIDIAN_HOURS.map(mh => {
      const stats = meridianStats.value?.meridianHealth[mh.meridian]
      const organInfo = ORGAN_ELEMENT_MAP[mh.organ as keyof typeof ORGAN_ELEMENT_MAP]
      return {
        ...mh,
        healthRate: stats?.rate ?? 0,
        recordCount: stats?.total ?? 0,
        color: organInfo?.color ?? '#6b9fc4',
        isCurrent: currentMeridian.value?.meridian === mh.meridian,
      }
    })
  })

  /** 五脏健康雷达图数据 */
  const organRadarData = computed(() => {
    const organs = Object.entries(ORGAN_ELEMENT_MAP) as [string, typeof ORGAN_ELEMENT_MAP[keyof typeof ORGAN_ELEMENT_MAP]][]
    return organs.map(([organ, info]) => {
      // 找到对应的经络
      const relatedMeridians = MERIDIAN_HOURS.filter(mh => mh.organ === organ)
      const rates = relatedMeridians
        .map(mh => meridianStats.value?.meridianHealth[mh.meridian]?.rate ?? 0)
        .filter(r => r > 0)
      const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
      return {
        organ,
        element: info.element,
        emotion: info.emotion,
        color: info.color,
        healthRate: avgRate,
        season: info.season,
      }
    })
  })

  /** 体质分布数据 */
  const constitutionDistribution = computed(() => {
    if (!constitutionAnalyzer.analysis.value) return null
    const scores = constitutionAnalyzer.analysis.value.scores
    return Object.entries(scores)
      .map(([type, score]) => ({
        type: type as ConstitutionType,
        label: CONSTITUTION_META[type as ConstitutionType]?.label ?? type,
        score,
        isPrimary: type === constitutionAnalyzer.analysis.value?.type,
      }))
      .sort((a, b) => b.score - a.score)
  })

  // ---- 操作方法 ----

  /** 记录经络感受 */
  async function recordMeridianFeeling(
    meridian: MeridianType,
    feeling: MeridianFeeling,
    note?: string,
  ): Promise<MeridianRecord> {
    return meridianTracker.recordFeeling(meridian, feeling, note)
  }

  /** 执行体质分析 */
  async function performConstitutionAnalysis(answers: boolean[]): Promise<ConstitutionAnalysis> {
    const result = constitutionAnalyzer.analyzeFromAnswers(answers)
    await constitutionAnalyzer.saveAnalysis(result)

    // 保存到历史
    constitutionHistory.value.push(result)
    if (constitutionHistory.value.length > 20) {
      constitutionHistory.value = constitutionHistory.value.slice(-20)
    }
    storage.setKV(BRIDGE_STORAGE_KEYS.constitutionHistory, constitutionHistory.value)

    return result
  }

  /** 执行经络自检 */
  function performSelfCheck(): ReturnType<typeof meridianCheck.performMeridianCheck> {
    return meridianCheck.performMeridianCheck(meridianTracker.records.value)
  }

  /** 生成健康报告 */
  function generateHealthReport(): HealthAnalysisReport {
    return healthAnalysis.generateReport(
      meridianTracker.records.value,
      moodRecords.value,
      constitutionHistory.value.map(c => ({
        date: c.analyzedAt,
        type: c.type,
        score: c.scores[c.type] * 100,
      })),
    )
  }

  /** 生成调理方案 */
  function generateWellness(): ReturnType<typeof wellnessPlan.generateWellnessPlan> | null {
    if (!constitutionAnalyzer.analysis.value) return null
    return wellnessPlan.generateWellnessPlan(constitutionAnalyzer.analysis.value)
  }

  /** 记录情绪 */
  function recordMood(mood: MoodRecord['mood'], insight: string, relatedOrgan?: MoodRecord['relatedOrgan']): MoodRecord {
    const record: MoodRecord = {
      id: `mood_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      mood,
      insight,
      recordedAt: new Date().toISOString(),
      relatedOrgan,
    }
    moodRecords.value.unshift(record)
    // 限制最大条数
    if (moodRecords.value.length > 500) {
      moodRecords.value = moodRecords.value.slice(0, 500)
    }
    storage.setKV(BODY_WISDOM_STORAGE_KEYS.MOODS, moodRecords.value)
    return record
  }

  /** 今日经络记录 */
  const todayRecords = computed(() => meridianTracker.getTodayRecords())

  /** 健康摘要 */
  const healthSummary = computed(() => {
    const report = latestHealthReport.value
    const check = latestCheckReport.value
    const stats = meridianStats.value
    const constitution = constitutionAnalyzer.analysis.value

    return {
      overallScore: report?.overallScore ?? 0,
      meridianScore: report?.meridianScore ?? 0,
      constitutionScore: report?.constitutionScore ?? 0,
      moodScore: report?.moodScore ?? 0,
      rhythmScore: report?.rhythmScore ?? 0,
      totalRecords: stats?.totalRecords ?? 0,
      goodRate: stats ? Math.round((stats.goodCount / Math.max(1, stats.totalRecords)) * 100) : 0,
      attentionCount: attentionMeridians.value.length,
      checkScore: check?.overallScore ?? 0,
      constitutionType: constitution?.label ?? '未分析',
      hasIssues: (check?.issues?.length ?? 0) > 0,
    }
  })

  // 初始化加载
  loadAll()

  return {
    // 状态
    isLoaded,
    meridianRecords: meridianTracker.records,
    moodRecords,
    constitutionHistory,
    constitutionAnalysis: constitutionAnalyzer.analysis,

    // 计算属性
    meridianStats,
    currentMeridian,
    attentionMeridians,
    fiveMovementsSixQi,
    latestHealthReport,
    healthReportHistory,
    latestCheckReport,
    checkReportHistory,
    moodTrend,
    meridianClockData,
    organRadarData,
    constitutionDistribution,
    todayRecords,
    healthSummary,

    // 操作
    loadAll,
    recordMeridianFeeling,
    performConstitutionAnalysis,
    performSelfCheck,
    generateHealthReport,
    generateWellness,
    recordMood,

    // 子模块引用
    fiveMovements,
    constitutionAnalyzer,
    meridianCheck,
    wellnessPlan,
    healthAnalysis,
  }
}