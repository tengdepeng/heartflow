// ============================================================
// 幕僚体系 · 视图桥接层
// 蓝图定义：
//   统一交互状态聚合、幕僚作息管理、庆祝与退休、见证引擎、
//   幕僚关系网络、仪式管理、Archive 数据
//   服务于 AdvisorHub.vue, AdvisorChat.vue, AdvisorAffinity.vue,
//   AdvisorArchive.vue, AdvisorWitnessLog.vue
// ============================================================

import { ref, computed } from 'vue'
import { useAdvisorInteraction } from './interaction'
import { useAdvisorDailyLife } from './daily-life'
import { useAdvisorCelebration } from './celebration'
import { useAdvisorWitness } from './witness'
import type {
  InteractionType,
  InteractionIntensity,
  AdvisorRelation,
  InteractionRecord,
  ActivityType,
  TimeSlot,
  AdvisorActivity,
  LifeScene,
  DailySchedule,
  CelebrationType,
  CelebrationEvent,
  CelebrationRitual,
  RetirementPhase,
  RetirementCeremony,
  AdvisorLegacy,
  WitnessEventType,
  AdvisorWitnessRecord,
  WitnessStats,
} from './types'
import {
  INTERACTION_TYPE_META,
  TIME_SLOT_META,
  ACTIVITY_META,
  CELEBRATION_TYPE_META,
  RETIREMENT_PHASE_META,
  WITNESS_EVENT_META,
  ADVISOR_STORAGE_KEYS,
} from './types'

// ---- 重新导出上游类型 ----

export type {
  InteractionType,
  InteractionIntensity,
  AdvisorRelation,
  InteractionRecord,
  ActivityType,
  TimeSlot,
  AdvisorActivity,
  LifeScene,
  DailySchedule,
  CelebrationType,
  CelebrationEvent,
  CelebrationRitual,
  RetirementPhase,
  RetirementCeremony,
  AdvisorLegacy,
  WitnessEventType,
  AdvisorWitnessRecord,
  WitnessStats,
}

export {
  INTERACTION_TYPE_META,
  TIME_SLOT_META,
  ACTIVITY_META,
  CELEBRATION_TYPE_META,
  RETIREMENT_PHASE_META,
  WITNESS_EVENT_META,
  ADVISOR_STORAGE_KEYS,
}

// ---- 幕僚摘要 ----

export interface AdvisorSummary {
  id: string
  name: string
  role: string
  personality: string
  /** 当前活动 */
  currentActivity: AdvisorActivity | null
  /** 当日作息 */
  dailySchedule: DailySchedule | null
  /** 关系数量 */
  relationCount: number
  /** 总互动次数 */
  totalInteractions: number
  /** 平均亲密度 */
  averageCloseness: number
  /** 未读见证数 */
  unviewedWitnessCount: number
  /** 是否活跃 */
  isActive: boolean
}

// ---- 幕僚关系网络概览 ----

export interface RelationNetworkOverview {
  totalRelations: number
  totalInteractions: number
  averageCloseness: number
  mostConnectedAdvisor: string
  strongestBond: { a: string; b: string; closeness: number }
  /** 按亲密度分级统计 */
  closenessDistribution: {
    intimate: number
    close: number
    moderate: number
    distant: number
  }
}

// ---- 幕僚仪式摘要 ----

export interface RitualSummary {
  /** 今日待庆祝事件数 */
  todayCelebrations: number
  /** 即将到来的庆祝事件数 */
  upcomingCelebrations: number
  /** 活跃退休仪式数 */
  activeRetirements: number
  /** 已完成的退休仪式数 */
  completedRetirements: number
  /** 遗留物总数 */
  totalLegacies: number
}

// ---- 见证日志摘要 ----

export interface WitnessLogSummary {
  totalWitnessed: number
  unviewedCount: number
  /** 各类事件统计 */
  eventTypeBreakdown: { type: WitnessEventType; label: string; icon: string; count: number }[]
  /** 最近见证 */
  recentWitnesses: AdvisorWitnessRecord[]
}

// ============================================================
// useAdvisorBridge
// ============================================================

export function useAdvisorBridge() {
  // ---- 子模块 ----
  const interaction = useAdvisorInteraction()
  const dailyLife = useAdvisorDailyLife()
  const celebration = useAdvisorCelebration()
  const witness = useAdvisorWitness()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 场景统计 ----

  const sceneStats = computed(() => {
    return dailyLife.getSceneStats()
  })

  // ---- 关系网络概览 ----

  const relationNetwork = computed<RelationNetworkOverview>(() => {
    const stats = interaction.getNetworkStats()
    const rels = interaction.allRelations.value

    const closenessDistribution = {
      intimate: rels.filter(r => r.closeness >= 80).length,
      close: rels.filter(r => r.closeness >= 60 && r.closeness < 80).length,
      moderate: rels.filter(r => r.closeness >= 30 && r.closeness < 60).length,
      distant: rels.filter(r => r.closeness < 30).length,
    }

    return {
      ...stats,
      closenessDistribution,
    }
  })

  // ---- 仪式摘要 ----

  const ritualSummary = computed<RitualSummary>(() => {
    const todayCels = celebration.getTodayCelebrations()
    const upcomingCels = celebration.getUpcomingCelebrations()
    const retireStats = celebration.getRetirementStats()

    return {
      todayCelebrations: todayCels.length,
      upcomingCelebrations: upcomingCels.length,
      activeRetirements: retireStats.active,
      completedRetirements: retireStats.completed,
      totalLegacies: retireStats.totalLegacies,
    }
  })

  // ---- 见证日志摘要 ----

  const witnessLogSummary = computed<WitnessLogSummary>(() => {
    const stats = witness.getWitnessStats()
    const recentWitnesses = witness.getRecentWitnesses(10)

    const eventTypeBreakdown = Object.entries(stats.byType).map(([type, count]) => {
      const meta = WITNESS_EVENT_META[type as WitnessEventType]
      return {
        type: type as WitnessEventType,
        label: meta?.label ?? type,
        icon: meta?.icon ?? '📌',
        count,
      }
    }).sort((a, b) => b.count - a.count)

    return {
      totalWitnessed: stats.totalWitnessed,
      unviewedCount: witness.unviewedCount.value,
      eventTypeBreakdown,
      recentWitnesses,
    }
  })

  // ---- 创建幕僚摘要 ----

  function createAdvisorSummary(
    id: string,
    name: string,
    role: string,
    personality: string,
  ): AdvisorSummary {
    const relations = interaction.getAdvisorRelations(id)
    const totalInteractions = relations.reduce((s, r) => s + r.interactionCount, 0)
    const averageCloseness = relations.length > 0
      ? Math.round(relations.reduce((s, r) => s + r.closeness, 0) / relations.length)
      : 0
    const currentActivity = dailyLife.currentActivities.value.find(a => a.advisorId === id) ?? null
    // schedules is internal to dailyLife; isActive is derived from currentActivity presence
    const schedule = null
    const advisorWitnesses = witness.getAdvisorWitnesses(id)
    const unviewedWitnessCount = advisorWitnesses.filter(w => !w.viewed).length

    return {
      id,
      name,
      role,
      personality,
      currentActivity,
      dailySchedule: schedule,
      relationCount: relations.length,
      totalInteractions,
      averageCloseness,
      unviewedWitnessCount,
      isActive: true,
    }
  }

  // ---- 初始化幕僚 ----

  function initializeAdvisor(
    id: string,
    _name: string,
    personality: string,
    _role: string,
  ): void {
    dailyLife.initSchedule(id, personality)
  }

  // ---- 操作入口 ----

  /**
   * 记录幕僚间互动
   */
  function logInteraction(
    initiatorId: string,
    recipientId: string,
    type: InteractionType,
    topic: string,
    summary: string,
    outcome: 'positive' | 'neutral' | 'negative' = 'neutral',
  ): InteractionRecord {
    return interaction.recordInteraction(initiatorId, recipientId, type, topic, summary, outcome)
  }

  /**
   * 开始幕僚活动
   */
  function startAdvisorActivity(
    advisorId: string,
    type: ActivityType,
    sceneId: string,
    description?: string,
  ): AdvisorActivity {
    return dailyLife.startActivity(advisorId, type, sceneId, description)
  }

  /**
   * 结束幕僚活动
   */
  function endAdvisorActivity(advisorId: string): AdvisorActivity | undefined {
    return dailyLife.endActivity(advisorId)
  }

  /**
   * 创建庆祝事件
   */
  function createCelebration(
    advisorId: string,
    type: CelebrationType,
    title: string,
    description: string,
    date?: string,
  ): CelebrationEvent {
    return celebration.createCelebration(advisorId, type, title, description, date)
  }

  /**
   * 完成庆祝
   */
  function completeCelebration(id: string, artifact?: string): boolean {
    return celebration.completeCelebration(id, artifact)
  }

  /**
   * 开始退休仪式
   */
  function startRetirement(
    advisorId: string,
    reason: string,
    witnesses: string[] = [],
  ): RetirementCeremony {
    return celebration.startRetirement(advisorId, reason, witnesses)
  }

  /**
   * 记录见证（仅中性元数据，禁储存描述/感受）
   */
  function recordWitness(
    advisorId: string,
    eventType: WitnessEventType,
    title: string,
  ): AdvisorWitnessRecord {
    return witness.recordWitness(advisorId, eventType, title)
  }

  /**
   * 标记见证为已读
   */
  function markWitnessViewed(id: string): boolean {
    return witness.markViewed(id)
  }

  /**
   * 标记所有见证为已读
   */
  function markAllWitnessesViewed(): void {
    const unviewed = witness.getUnviewedWitnesses()
    for (const w of unviewed) {
      witness.markViewed(w.id)
    }
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 聚合状态
    isLoading,
    sceneStats,
    relationNetwork,
    ritualSummary,
    witnessLogSummary,

    // 摘要生成
    createAdvisorSummary,
    initializeAdvisor,

    // 操作入口
    logInteraction,
    startAdvisorActivity,
    endAdvisorActivity,
    createCelebration,
    completeCelebration,
    startRetirement,
    recordWitness,
    markWitnessViewed,
    markAllWitnessesViewed,

    // 子模块直通（供高级场景使用）
    interaction,
    dailyLife,
    celebration,
    witness,
  }
}