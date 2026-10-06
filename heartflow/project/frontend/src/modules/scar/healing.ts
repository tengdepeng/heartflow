// ============================================================
// 工痕 · 愈合追踪 + 逆境成长
// 伤痕状态演化 + 愈合进度 + 逆境转化 + 成长记录
// ============================================================

import { storage } from '@/engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type {
  BodyMark, GrowthRecord, ForgingRecord,
  ScarStats, ScarState, HealingStage, SeverityLevel,
  BodyPart, ScarType,
} from './types'
import { SCAR_STORAGE_KEYS, HEALING_STAGES } from './types'

/**
 * 根据天数计算愈合阶段和进度
 */
function calcHealingStage(daysSince: number): { stage: HealingStage; progress: number } {
  for (const stage of HEALING_STAGES) {
    if (daysSince >= stage.daysRange[0] && daysSince < stage.daysRange[1]) {
      const stageDuration = stage.daysRange[1] - stage.daysRange[0]
      const daysInStage = daysSince - stage.daysRange[0]
      return {
        stage: stage.stage,
        progress: Math.min(Math.round((daysInStage / stageDuration) * 100), 100),
      }
    }
  }
  return { stage: 'matured', progress: 100 }
}

/**
 * 计算疤痕状态
 */
function calcScarState(daysSince: number): ScarState {
  if (daysSince < 3) return 'fresh'
  if (daysSince < 90) return 'healing'
  return 'scarred'
}

/**
 * 工痕愈合追踪
 */
export function useScarHealing() {
  const marks = ref<BodyMark[]>([])
  const growthRecords = ref<GrowthRecord[]>([])
  const forgingRecords = ref<ForgingRecord[]>([])

  async function load(): Promise<void> {
    const [savedMarks, savedGrowth, savedForging] = await Promise.all([
      storage.getKV<BodyMark[]>(SCAR_STORAGE_KEYS.MARKS, []),
      storage.getKV<GrowthRecord[]>(SCAR_STORAGE_KEYS.GROWTH, []),
      storage.getKV<ForgingRecord[]>(SCAR_STORAGE_KEYS.FORGING, []),
    ])
    marks.value = savedMarks
    growthRecords.value = savedGrowth
    forgingRecords.value = savedForging

    // 自动更新愈合状态
    updateHealingStates()
  }

  /**
   * 自动更新所有伤痕的愈合状态
   */
  function updateHealingStates(): void {
    const now = new Date()
    for (const mark of marks.value) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(mark.recordedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      const { stage, progress } = calcHealingStage(daysSince)
      mark.healingStage = stage
      mark.healingProgress = progress
    }
  }

  /**
   * 添加新伤痕
   */
  async function addMark(
    bodyPart: BodyPart,
    severity: SeverityLevel,
    scarType: ScarType,
    description: string,
    worklogId?: string
  ): Promise<BodyMark> {
    const mark: BodyMark = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      bodyPart,
      severity,
      description,
      scarType,
      recordedAt: new Date().toISOString(),
      worklogId,
      healingStage: 'acute',
      healingProgress: 0,
      transformed: false,
    }
    marks.value.unshift(mark)
    await persistMarks()
    return mark
  }

  /**
   * 记录逆境成长
   */
  async function recordGrowth(
    scarId: string,
    reflection: string,
    learned: string,
    growthDirection: string
  ): Promise<GrowthRecord> {
    const record: GrowthRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      scarId,
      reflection,
      learned,
      growthDirection,
      recordedAt: new Date().toISOString(),
    }
    growthRecords.value.unshift(record)

    // 标记伤疤已转化
    const mark = marks.value.find((m) => m.id === scarId)
    if (mark) {
      mark.transformed = true
      mark.growthInsight = learned
    }

    await Promise.all([persistMarks(), persistGrowth()])
    return record
  }

  /**
   * 获取伤痕的成长记录
   */
  function getGrowthForScar(scarId: string): GrowthRecord[] {
    return growthRecords.value.filter((r) => r.scarId === scarId)
  }

  /**
   * 记录锻造（砧板锻打）
   */
  async function recordForging(intensity: SeverityLevel): Promise<ForgingRecord> {
    const today = getLocalDateKey()
    const existing = forgingRecords.value.find((r) => r.date === today)

    if (existing) {
      existing.count++
      existing.intensity = Math.max(existing.intensity, intensity) as SeverityLevel
    } else {
      forgingRecords.value.unshift({
        id: Date.now().toString(36),
        count: 1,
        date: today,
        intensity,
      })
    }

    await persistForging()
    return existing || forgingRecords.value[0]
  }

  /**
   * 获取统计
   */
  function getStats(): ScarStats {
    const total = marks.value.length
    const fresh = marks.value.filter((m) => calcScarState(
      Math.floor((Date.now() - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    ) === 'fresh').length
    const healing = marks.value.filter((m) => calcScarState(
      Math.floor((Date.now() - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    ) === 'healing').length
    const scarred = total - fresh - healing
    const transformed = marks.value.filter((m) => m.transformed).length

    const bodyPartDistribution: Record<BodyPart, number> = {} as Record<BodyPart, number>
    const typeDistribution: Record<ScarType, number> = {
      impact: 0, cut: 0, burn: 0, wear: 0,
    }

    let totalProgress = 0
    for (const mark of marks.value) {
      bodyPartDistribution[mark.bodyPart] = (bodyPartDistribution[mark.bodyPart] || 0) + 1
      typeDistribution[mark.scarType]++
      totalProgress += mark.healingProgress
    }

    return {
      total,
      fresh,
      healing,
      scarred,
      transformed,
      bodyPartDistribution,
      typeDistribution,
      avgHealingProgress: total > 0 ? Math.round(totalProgress / total) : 0,
      transformationRate: total > 0 ? Math.round((transformed / total) * 100) : 0,
    }
  }

  /**
   * 获取最近的锻造天数
   */
  function getForgingStreak(): number {
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = getLocalDateKey(d)
      if (forgingRecords.value.some((r) => r.date === dateStr)) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  /**
   * 获取愈合建议
   */
  function getHealingAdvice(mark: BodyMark): string {
    const stage = HEALING_STAGES.find((s) => s.stage === mark.healingStage)
    const base = stage?.advice || '继续观察'
    if (mark.transformed) return '已从伤痛中成长，这份经验已成为你的力量。'
    if (mark.healingProgress >= 80) return '伤势即将痊愈，是时候反思这段经历带来的成长了。'
    return base
  }

  async function persistMarks(): Promise<void> {
    await storage.setKV(SCAR_STORAGE_KEYS.MARKS, marks.value)
  }
  async function persistGrowth(): Promise<void> {
    await storage.setKV(SCAR_STORAGE_KEYS.GROWTH, growthRecords.value)
  }
  async function persistForging(): Promise<void> {
    await storage.setKV(SCAR_STORAGE_KEYS.FORGING, forgingRecords.value)
  }

  load()

  return {
    marks,
    growthRecords,
    forgingRecords,
    addMark,
    recordGrowth,
    getGrowthForScar,
    recordForging,
    getStats,
    getForgingStreak,
    getHealingAdvice,
    updateHealingStates,
    load,
  }
}

import { ref } from 'vue'