// ============================================================
// 业脉 · 视图桥接层（P20-4）
// 为 Career.vue 提供标准化模块接口，替代直接 storage 调用
// ============================================================

import { ref, computed } from 'vue'
import { useCareerPath } from './path'
import { useSkillMap, useTransitionAnalysis, useInteractionTracker, useCareerMilestones } from './skill-map'
import { useLearningPath, useInfluenceAnalysis, useCareerVisualization } from './skill-path'
import { useTransitionRecommender } from './transition-recommend'
import { useSkillGapAdvisor } from './skill-gap-advisor'
import { useCareerSimulator } from './career-simulator'
import { useSkillGapVisualization } from './skill-gap-visualization'
import type {
  Contact, CareerConnection, CareerProject, CareerPosition,
  CareerPathNode, NetworkStats, NetworkTier, NodeType, ConnectionType, ProjectStatus,
} from './types'
import { CAREER_STORAGE_KEYS, TIER_META, NODE_TYPE_DEFS, CONNECTION_TYPE_META } from './types'
import type {
  SkillCategory, ProficiencyLevel, SkillNode, TransitionAnalysis,
  InteractionRecord, CareerMilestone,
} from './skill-map'
import type {
  LearningPath, InfluenceScore, NetworkHealth, SkillRadarData,
} from './skill-path'
import type { TransitionRecommendation, TransitionRecommendResult } from './transition-recommend'
import type { SkillGapAnalysis, PrioritizedGap, LearningPlan } from './skill-gap-advisor'
import type { CareerScenario, SimulationResult, DecisionNode } from './career-simulator'
import type { SkillGapHeatmap, GapMatrix, ImprovementRoadmap } from './skill-gap-visualization'

// ============================================================
// 类型定义
// ============================================================

export interface CareerBridgeState {
  contacts: Contact[]
  connections: CareerConnection[]
  projects: CareerProject[]
  positions: CareerPosition[]
  pathNodes: CareerPathNode[]
  networkStats: NetworkStats
  skills: SkillNode[]
  transitionAnalysis: TransitionAnalysis | null
  interactions: InteractionRecord[]
  milestones: CareerMilestone[]
  learningPaths: LearningPath[]
  influenceScore: InfluenceScore | null
  networkHealth: NetworkHealth | null
  skillRadar: SkillRadarData[] | null
  skillGapAnalysis: SkillGapAnalysis | null
  simulationResult: SimulationResult | null
  gapHeatmap: SkillGapHeatmap | null
  improvementRoadmap: ImprovementRoadmap | null
}

export interface CareerQuickStats {
  totalContacts: number
  activeProjects: number
  pulseIndex: number
  totalSkills: number
  avgSkillLevel: number
  careerMilestones: number
  achievedMilestones: number
  recentInteractions: number
}

// ============================================================
// useCareerBridge Composable
// ============================================================

export function useCareerBridge() {
  // ---- 子模块 ----
  const careerPath = useCareerPath()
  const skillMap = useSkillMap()
  const transitionAnalysis = useTransitionAnalysis()
  const interactionTracker = useInteractionTracker()
  const careerMilestones = useCareerMilestones()
  const learningPath = useLearningPath()
  const influenceAnalysis = useInfluenceAnalysis()
  const careerVisualization = useCareerVisualization()
  const transitionRecommender = useTransitionRecommender()
  const skillGapAdvisor = useSkillGapAdvisor()
  const careerSimulator = useCareerSimulator()
  const gapVisualization = useSkillGapVisualization()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 初始化 ----

  function initialize(): void {
    refreshAll()
  }

  function refreshAll(): void {
    // 各项数据由各模块内部管理，桥接层仅做聚合
  }

  // ============================================================
  // 快捷统计
  // ============================================================

  const quickStats = computed<CareerQuickStats>(() => {
    const contacts = careerPath.contacts?.value ?? []
    const projects = careerPath.projects?.value ?? []
    const skills = skillMap.skills?.value ?? []
    const milestones = careerMilestones.milestones?.value ?? []
    const interactions = interactionTracker.interactions?.value ?? []

    const avgSkillLevel = skills.length > 0
      ? Math.round(skills.reduce((s, sk) => s + (sk.proficiencyScore || 0), 0) / skills.length * 10) / 10
      : 0

    const thirtyDaysAgo = Date.now() - 30 * 86400000
    const recentInteractions = interactions.filter(
      i => new Date(i.date).getTime() > thirtyDaysAgo
    ).length

    return {
      totalContacts: contacts.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      pulseIndex: careerPath.getNetworkStats().pulseIndex,
      totalSkills: skills.length,
      avgSkillLevel,
      careerMilestones: milestones.length,
      achievedMilestones: milestones.length,
      recentInteractions,
    }
  })

  // ============================================================
  // 完整状态
  // ============================================================

  const bridgeState = computed<CareerBridgeState>(() => {
    const contacts = careerPath.contacts?.value ?? []
    const connections = careerPath.connections?.value ?? []
    const positions = careerPath.positions?.value ?? []
    const skills = skillMap.skills?.value ?? []
    const milestones = careerMilestones.milestones?.value ?? []

    // 影响力评分
    let influenceScore: InfluenceScore | null = null
    let networkHealth: NetworkHealth | null = null
    if (contacts.length > 0) {
      const scores = influenceAnalysis.computeInfluenceScores?.(contacts, connections) ?? []
      influenceScore = scores.length > 0 ? scores[0] : null
      networkHealth = influenceAnalysis.computeNetworkHealth?.(contacts, connections) ?? null
    }

    // 可视化数据
    let skillRadar: SkillRadarData[] | null = null
    if (skills.length > 0) {
      skillRadar = careerVisualization.skillRadar?.value ?? null
    }

    return {
      contacts,
      connections,
      projects: careerPath.projects?.value ?? [],
      positions,
      pathNodes: careerPath.buildCareerPath(),
      networkStats: careerPath.getNetworkStats(),
      skills,
      transitionAnalysis: transitionAnalysis.analysis?.value ?? null,
      interactions: interactionTracker.interactions?.value ?? [],
      milestones,
      learningPaths: learningPath.learningPaths?.value ?? [],
      influenceScore,
      networkHealth,
      skillRadar,
      skillGapAnalysis: null,
      simulationResult: careerSimulator.result?.value ?? null,
      gapHeatmap: gapVisualization.heatmap?.value ?? null,
      improvementRoadmap: gapVisualization.roadmap?.value ?? null,
    }
  })

  return {
    // 状态
    isLoading,
    quickStats,
    bridgeState,

    // 子模块
    careerPath,
    skillMap,
    transitionAnalysis,
    interactionTracker,
    careerMilestones,
    learningPath,
    influenceAnalysis,
    careerVisualization,
    transitionRecommender,
    skillGapAdvisor,
    careerSimulator,
    gapVisualization,

    // 生命周期
    initialize,
    refreshAll,
  }
}

// ============================================================
// 导出常量
// ============================================================

export { CAREER_STORAGE_KEYS, TIER_META, NODE_TYPE_DEFS, CONNECTION_TYPE_META }
export type { Contact, CareerConnection, CareerProject, CareerPosition, CareerPathNode, NetworkStats, NetworkTier, NodeType, ConnectionType, ProjectStatus }
export type { SkillCategory, ProficiencyLevel, SkillNode, TransitionAnalysis, InteractionRecord, CareerMilestone }
export type { LearningPath, InfluenceScore, NetworkHealth, SkillRadarData }
export type { TransitionRecommendation, TransitionRecommendResult }
export type { SkillGapAnalysis, PrioritizedGap, LearningPlan }
export type { CareerScenario, SimulationResult, DecisionNode }
export type { SkillGapHeatmap, GapMatrix, ImprovementRoadmap }