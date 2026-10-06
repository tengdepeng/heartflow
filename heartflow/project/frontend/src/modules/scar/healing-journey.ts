// ============================================================
// 工痕 · 愈合旅程引擎（P20-3）
// 愈合阶段追踪 + 里程碑系统 + 旅程可视化 + 心理韧性评估
// ============================================================

import { ref } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import type { BodyMark, GrowthRecord, ScarStats } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 旅程阶段 */
export type JourneyStage =
  | 'acknowledgment'  // 承认
  | 'acceptance'      // 接纳
  | 'processing'      // 处理
  | 'integration'     // 整合
  | 'transformation'  // 转化
  | 'wisdom'          // 智慧

/** 旅程里程碑 */
export interface JourneyMilestone {
  /** 里程碑 ID */
  id: string
  /** 里程碑名称 */
  name: string
  /** 描述 */
  description: string
  /** 对应阶段 */
  stage: JourneyStage
  /** 是否达成 */
  achieved: boolean
  /** 达成时间 */
  achievedAt?: string
  /** 条件描述 */
  condition: string
  /** 奖励 */
  reward: string
}

/** 愈合旅程 */
export interface HealingJourney {
  /** 当前阶段 */
  currentStage: JourneyStage
  /** 阶段进度 0-100 */
  stageProgress: number
  /** 总伤痕数 */
  totalMarks: number
  /** 已转化数 */
  transformedCount: number
  /** 旅程里程碑 */
  milestones: JourneyMilestone[]
  /** 旅程开始时间 */
  startedAt: string
  /** 预计完成时间 */
  estimatedCompletion?: string
  /** 心理韧性评分 0-100 */
  resilienceScore: number
  /** 旅程总结 */
  summary: string
  /** 关键洞察 */
  insights: string[]
  /** 下一步建议 */
  nextSteps: string[]
}

/** 阶段元数据 */
export interface JourneyStageMeta {
  stage: JourneyStage
  label: string
  description: string
  icon: string
  color: string
  /** 触发条件 */
  trigger: string
  /** 完成条件 */
  completion: string
}

// ============================================================
// 阶段元数据
// ============================================================

export const JOURNEY_STAGES: JourneyStageMeta[] = [
  {
    stage: 'acknowledgment',
    label: '承认',
    description: '承认伤痛的存在，正视它的影响',
    icon: '👁️',
    color: '#ef4444',
    trigger: '记录第一道伤痕',
    completion: '至少记录 1 道伤痕',
  },
  {
    stage: 'acceptance',
    label: '接纳',
    description: '接纳伤痛作为经历的一部分，不再抗拒',
    icon: '🤲',
    color: '#f59e0b',
    trigger: '伤痕开始愈合',
    completion: '至少 1 道伤痕进入增生期',
  },
  {
    stage: 'processing',
    label: '处理',
    description: '深入反思伤痛，提取经验教训',
    icon: '🔍',
    color: '#6b9fc4',
    trigger: '记录第一份成长心得',
    completion: '至少记录 1 份成长心得',
  },
  {
    stage: 'integration',
    label: '整合',
    description: '将教训整合到自我认知中',
    icon: '🧩',
    color: '#34d399',
    trigger: '伤痕转化率 ≥ 50%',
    completion: '转化率 ≥ 50%',
  },
  {
    stage: 'transformation',
    label: '转化',
    description: '伤痛转化为力量，成为你的铠甲',
    icon: '🦋',
    color: '#a07c8c',
    trigger: '所有伤痕已转化',
    completion: '转化率 = 100%',
  },
  {
    stage: 'wisdom',
    label: '智慧',
    description: '从伤痛中提炼出人生智慧，帮助他人',
    icon: '💎',
    color: '#d98c7a',
    trigger: '社区分享 ≥ 3 次',
    completion: '分享 ≥ 3 次 + 锻造连续 ≥ 30 天',
  },
]

/** 默认里程碑 */
export const DEFAULT_JOURNEY_MILESTONES: JourneyMilestone[] = [
  {
    id: 'jm-1',
    name: '初次印记',
    description: '记录你的第一道伤痕',
    stage: 'acknowledgment',
    achieved: false,
    condition: '记录至少 1 道伤痕',
    reward: '解锁工痕房间',
  },
  {
    id: 'jm-2',
    name: '开始愈合',
    description: '伤痕从新鲜期进入增生期',
    stage: 'acceptance',
    achieved: false,
    condition: '至少 1 道伤痕进入增生期',
    reward: '解锁愈合追踪面板',
  },
  {
    id: 'jm-3',
    name: '初次反思',
    description: '记录第一份成长心得',
    stage: 'processing',
    achieved: false,
    condition: '记录至少 1 份成长心得',
    reward: '解锁成长日记',
  },
  {
    id: 'jm-4',
    name: '伤痕叙事',
    description: '为一道伤痕编写完整故事',
    stage: 'processing',
    achieved: false,
    condition: '创建至少 1 个伤痕故事',
    reward: '解锁叙事编辑器',
  },
  {
    id: 'jm-5',
    name: '砧板初锻',
    description: '连续 7 天在砧板上锻造',
    stage: 'processing',
    achieved: false,
    condition: '连续锻造 ≥ 7 天',
    reward: '解锁锻造特效',
  },
  {
    id: 'jm-6',
    name: '半程转化',
    description: '半数伤痕已完成转化',
    stage: 'integration',
    achieved: false,
    condition: '转化率 ≥ 50%',
    reward: '解锁转化仪式',
  },
  {
    id: 'jm-7',
    name: '因果洞察',
    description: '完成因果链分析',
    stage: 'integration',
    achieved: false,
    condition: '完成至少 1 次因果链分析',
    reward: '解锁因果链可视化',
  },
  {
    id: 'jm-8',
    name: '全面转化',
    description: '所有伤痕已完成转化',
    stage: 'transformation',
    achieved: false,
    condition: '转化率 = 100%',
    reward: '解锁智慧殿堂',
  },
  {
    id: 'jm-9',
    name: '共鸣之声',
    description: '在社区分享你的故事并获得共鸣',
    stage: 'wisdom',
    achieved: false,
    condition: '社区分享 ≥ 3 次',
    reward: '解锁共鸣徽章',
  },
  {
    id: 'jm-10',
    name: '锻造大师',
    description: '连续 30 天在砧板上锻造',
    stage: 'wisdom',
    achieved: false,
    condition: '连续锻造 ≥ 30 天',
    reward: '解锁锻造大师称号',
  },
]

// ============================================================
// useHealingJourney Composable
// ============================================================

export function useHealingJourney() {
  // ---- 状态 ----
  const journey = ref<HealingJourney | null>(null)
  const milestones = ref<JourneyMilestone[]>(
    DEFAULT_JOURNEY_MILESTONES.map(m => ({ ...m }))
  )

  // ---- 阶段判定 ----

  /**
   * 根据伤痕数据判定当前旅程阶段
   */
  function determineStage(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
    sharesCount: number,
    forgingStreak: number,
  ): JourneyStage {
    if (marks.length === 0) return 'acknowledgment'

    const totalMarks = marks.length
    const transformedCount = marks.filter(m => m.transformed).length
    const transformationRate = totalMarks > 0
      ? Math.round((transformedCount / totalMarks) * 100)
      : 0

    // 智慧：分享 ≥ 3 次 + 锻造 ≥ 30 天
    if (sharesCount >= 3 && forgingStreak >= 30) return 'wisdom'
    // 转化：全部转化
    if (transformationRate === 100) return 'transformation'
    // 整合：转化率 ≥ 50%
    if (transformationRate >= 50) return 'integration'
    // 处理：有成长记录
    if (growthRecords.length > 0) return 'processing'
    // 接纳：有伤痕进入增生期
    const hasHealing = marks.some(m => m.healingStage !== 'acute')
    if (hasHealing) return 'acceptance'
    // 承认：有伤痕记录
    return 'acknowledgment'
  }

  /**
   * 计算阶段进度
   */
  function calculateStageProgress(
    stage: JourneyStage,
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
    sharesCount: number,
    forgingStreak: number,
  ): number {
    const totalMarks = marks.length
    const transformedCount = marks.filter(m => m.transformed).length
    const transformationRate = totalMarks > 0
      ? Math.round((transformedCount / totalMarks) * 100)
      : 0

    switch (stage) {
      case 'acknowledgment':
        return Math.min(marks.length * 100, 100)
      case 'acceptance':
        return marks.length > 0
          ? Math.min(Math.round((marks.filter(m => m.healingStage !== 'acute').length / marks.length) * 100), 100)
          : 0
      case 'processing':
        return Math.min(growthRecords.length * 20, 100)
      case 'integration':
        return Math.min(Math.round((transformationRate / 50) * 100), 100)
      case 'transformation':
        return Math.min(Math.round((transformationRate / 100) * 100), 100)
      case 'wisdom':
        const shareScore = Math.min(sharesCount * 30, 90)
        const forgeScore = Math.min(Math.round((forgingStreak / 30) * 10), 10)
        return Math.min(shareScore + forgeScore, 100)
      default:
        return 0
    }
  }

  /**
   * 计算心理韧性评分
   */
  function calculateResilience(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
    forgingStreak: number,
  ): number {
    if (marks.length === 0) return 0

    const totalMarks = marks.length
    const transformedCount = marks.filter(m => m.transformed).length
    const transformationRate = totalMarks > 0
      ? (transformedCount / totalMarks) * 100
      : 0

    const avgSeverity = marks.reduce((s, m) => s + m.severity, 0) / totalMarks
    const avgHealingProgress = marks.reduce((s, m) => s + m.healingProgress, 0) / totalMarks

    // 韧性评分：转化率(40%) + 愈合进度(20%) + 成长记录(20%) + 锻造(10%) + 严重度应对(10%)
    const transformScore = Math.min(transformationRate, 100) * 0.4
    const healingScore = avgHealingProgress * 0.2
    const growthScore = Math.min(growthRecords.length * 10, 100) * 0.2
    const forgeScore = Math.min(forgingStreak * 3, 100) * 0.1
    const severityScore = Math.min(avgSeverity * 20, 100) * 0.1

    return Math.round(transformScore + healingScore + growthScore + forgeScore + severityScore)
  }

  /**
   * 生成旅程总结
   */
  function generateSummary(
    stage: JourneyStage,
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
    stats: ScarStats,
  ): string {
    const stageMeta = JOURNEY_STAGES.find(s => s.stage === stage)

    if (marks.length === 0) {
      return '你的工痕旅程尚未开始。每一道伤痕都是一次成长的机会，勇敢地记录下第一道伤痕吧。'
    }

    const parts: string[] = []
    parts.push(`你已记录了 ${stats.total} 道伤痕`)

    if (stats.transformed > 0) {
      parts.push(`其中 ${stats.transformed} 道已转化为成长的力量`)
    }

    if (growthRecords.length > 0) {
      parts.push(`记录了 ${growthRecords.length} 份成长心得`)
    }

    parts.push(`当前处于「${stageMeta?.label || stage}」阶段`)

    return parts.join('，') + '。'
  }

  /**
   * 生成关键洞察
   */
  function generateInsights(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
  ): string[] {
    const insights: string[] = []

    if (marks.length === 0) return insights

    // 最常受伤的部位
    const partCounts: Record<string, number> = {}
    for (const m of marks) {
      partCounts[m.bodyPart] = (partCounts[m.bodyPart] || 0) + 1
    }
    const topPart = Object.entries(partCounts).sort((a, b) => b[1] - a[1])[0]
    if (topPart && topPart[1] >= 2) {
      insights.push(`你的${topPart[0]}部位承受了最多伤痕（${topPart[1]}次），这可能暗示着某种反复出现的挑战模式。`)
    }

    // 转化洞察
    const transformedCount = marks.filter(m => m.transformed).length
    if (transformedCount > 0 && growthRecords.length > 0) {
      const directions = growthRecords.map(r => r.growthDirection)
      const uniqueDirections = new Set(directions)
      insights.push(`你从 ${transformedCount} 道伤痕中获得了成长，成长方向包括：${Array.from(uniqueDirections).slice(0, 3).join('、')}。`)
    }

    // 愈合速度
    const avgDays = marks.reduce((s, m) => {
      const days = Math.floor((Date.now() - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
      return s + days
    }, 0) / marks.length
    if (avgDays > 90) {
      insights.push(`你的伤痕平均已愈合 ${Math.round(avgDays)} 天，长时间的愈合过程往往意味着深刻的转变。`)
    }

    // 成长记录质量
    if (growthRecords.length > 0) {
      const avgLength = growthRecords.reduce((s, r) => s + r.reflection.length, 0) / growthRecords.length
      if (avgLength > 50) {
        insights.push('你的反思深度令人印象深刻，每一次成长心得都倾注了大量思考。')
      }
    }

    return insights
  }

  /**
   * 生成下一步建议
   */
  function generateNextSteps(
    stage: JourneyStage,
    marks: BodyMark[],
    _growthRecords: GrowthRecord[],
    forgingStreak: number,
    sharesCount: number,
  ): string[] {
    const steps: string[] = []

    switch (stage) {
      case 'acknowledgment':
        steps.push('记录一道伤痕，正视它的存在')
        steps.push('观察伤痕的愈合过程，感受时间的疗愈力量')
        break
      case 'acceptance':
        steps.push('每天花 5 分钟关注伤痕的愈合变化')
        steps.push('尝试在砧板上锻造，用仪式感加速接纳')
        break
      case 'processing':
        if (marks.some(m => !m.transformed)) {
          steps.push('为未转化的伤痕记录一份成长心得')
        }
        steps.push('尝试为一道伤痕编写完整的故事')
        if (forgingStreak < 7) {
          steps.push(`坚持锻造（当前连续 ${forgingStreak} 天），目标 7 天`)
        }
        break
      case 'integration':
        if (marks.some(m => !m.transformed)) {
          steps.push('继续转化剩余的伤痕，目标 100% 转化率')
        }
        steps.push('完成因果链分析，理解伤痕之间的关联')
        break
      case 'transformation':
        steps.push('恭喜！所有伤痕已完成转化')
        steps.push('在社区分享你的故事，帮助他人')
        break
      case 'wisdom':
        if (sharesCount < 3) {
          steps.push(`继续分享你的故事（当前 ${sharesCount} 次），目标 3 次`)
        }
        if (forgingStreak < 30) {
          steps.push(`坚持锻造（当前连续 ${forgingStreak} 天），目标 30 天`)
        }
        break
    }

    return steps
  }

  // ---- 核心方法 ----

  /**
   * 追踪愈合旅程
   */
  function trackJourney(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
    sharesCount: number = 0,
    forgingStreak: number = 0,
  ): HealingJourney {
    const stage = determineStage(marks, growthRecords, sharesCount, forgingStreak)
    const stageProgress = calculateStageProgress(stage, marks, growthRecords, sharesCount, forgingStreak)
    const resilienceScore = calculateResilience(marks, growthRecords, forgingStreak)

    // 更新里程碑
    const stats = computeStatsFromMarks(marks)
    checkMilestones(marks, growthRecords, sharesCount, forgingStreak, stats)

    // 计算预计完成时间
    let estimatedCompletion: string | undefined
    if (stage !== 'wisdom') {
      const remaining = marks.filter(m => !m.transformed).length
      if (remaining > 0) {
        const avgDays = marks.reduce((s, m) => {
          const days = Math.floor(
            (Date.now() - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60 * 24)
          )
          return s + days
        }, 0) / marks.length
        const estDays = Math.round(remaining * (avgDays / marks.length))
        const estDate = new Date(Date.now() + estDays * 86400000)
        estimatedCompletion = getLocalDateKey(estDate)
      }
    }

    const result: HealingJourney = {
      currentStage: stage,
      stageProgress,
      totalMarks: marks.length,
      transformedCount: marks.filter(m => m.transformed).length,
      milestones: milestones.value,
      startedAt: marks.length > 0
        ? marks.reduce((earliest, m) =>
            m.recordedAt < earliest ? m.recordedAt : earliest, marks[0].recordedAt)
        : new Date().toISOString(),
      estimatedCompletion,
      resilienceScore,
      summary: generateSummary(stage, marks, growthRecords, stats),
      insights: generateInsights(marks, growthRecords),
      nextSteps: generateNextSteps(stage, marks, growthRecords, forgingStreak, sharesCount),
    }

    journey.value = result
    return result
  }

  /**
   * 检查并更新里程碑
   */
  function checkMilestones(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
    sharesCount: number,
    forgingStreak: number,
    stats: ScarStats,
  ): JourneyMilestone[] {
    const newlyAchieved: JourneyMilestone[] = []

    for (const milestone of milestones.value) {
      if (milestone.achieved) continue

      let achieved = false
      switch (milestone.id) {
        case 'jm-1':
          achieved = marks.length >= 1
          break
        case 'jm-2':
          achieved = marks.some(m => m.healingStage !== 'acute')
          break
        case 'jm-3':
          achieved = growthRecords.length >= 1
          break
        case 'jm-4':
          achieved = marks.some(m => m.description.length > 20)
          break
        case 'jm-5':
          achieved = forgingStreak >= 7
          break
        case 'jm-6':
          achieved = stats.transformationRate >= 50
          break
        case 'jm-7':
          achieved = marks.length >= 2
          break
        case 'jm-8':
          achieved = stats.transformationRate === 100
          break
        case 'jm-9':
          achieved = sharesCount >= 3
          break
        case 'jm-10':
          achieved = forgingStreak >= 30
          break
      }

      if (achieved) {
        milestone.achieved = true
        milestone.achievedAt = new Date().toISOString()
        newlyAchieved.push(milestone)
      }
    }

    return newlyAchieved
  }

  /**
   * 获取阶段信息
   */
  function getStageInfo(stage: JourneyStage): JourneyStageMeta | undefined {
    return JOURNEY_STAGES.find(s => s.stage === stage)
  }

  return {
    journey,
    milestones,
    trackJourney,
    checkMilestones,
    getStageInfo,
    JOURNEY_STAGES,
    DEFAULT_JOURNEY_MILESTONES,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function computeStatsFromMarks(marks: BodyMark[]): ScarStats {
  const total = marks.length
  const fresh = marks.filter(m => {
    const days = Math.floor((Date.now() - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    return days < 3
  }).length
  const healing = marks.filter(m => {
    const days = Math.floor((Date.now() - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 3 && days < 90
  }).length
  const scarred = total - fresh - healing
  const transformed = marks.filter(m => m.transformed).length

  const bodyPartDistribution: Record<string, number> = {}
  const typeDistribution: Record<string, number> = { impact: 0, cut: 0, burn: 0, wear: 0 }
  let totalProgress = 0

  for (const mark of marks) {
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
    bodyPartDistribution: bodyPartDistribution as any,
    typeDistribution: typeDistribution as any,
    avgHealingProgress: total > 0 ? Math.round(totalProgress / total) : 0,
    transformationRate: total > 0 ? Math.round((transformed / total) * 100) : 0,
  }
}