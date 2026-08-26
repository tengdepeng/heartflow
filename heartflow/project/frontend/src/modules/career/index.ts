// ============================================================
// 业脉 · 模块导出
// ============================================================

export { useCareerPath } from './path'
export { useSkillMap, useTransitionAnalysis, useInteractionTracker, useCareerMilestones } from './skill-map'
export {
  SKILL_CATEGORY_META,
  PROFICIENCY_META,
  TRANSITION_STRATEGY_META,
  INTERACTION_TYPE_META,
  MILESTONE_TYPE_META,
} from './skill-map'
export type {
  SkillCategory,
  ProficiencyLevel,
  SkillNode,
  SkillMap,
  TransitionStrategy,
  TransitionPath,
  TransitionAnalysis,
  InteractionType,
  InteractionRecord,
  ContactHealth,
  MilestoneType,
  CareerMilestone,
} from './skill-map'

export { useLearningPath, useInfluenceAnalysis, useCareerVisualization } from './skill-path'
export {
  LEARNING_PATH_TYPE_META,
} from './skill-path'

// ---- P16-7 自动职业转型推荐 + 技能缺口补充建议 ----
export { useTransitionRecommender } from './transition-recommend'
export type {
  CareerRoleProfile,
  TransitionRecommendation,
  SkillGapDetail,
  TransitionRecommendResult,
} from './transition-recommend'

export { useSkillGapAdvisor } from './skill-gap-advisor'
export type {
  SkillGapAnalysis,
  SkillSummary,
  PrioritizedGap,
  LearningPlan,
  LearningPhase,
  LearningCheckpoint,
  MilestoneSkillConnection,
  SkillLearningAdvice,
} from './skill-gap-advisor'

// ---- P20-4 职业模拟器 + 技能缺口可视化 ----
export { useCareerSimulator, SCENARIO_TYPE_META, DECISION_TYPE_META, PRESET_SCENARIOS } from './career-simulator'
export type {
  CareerScenario,
  ScenarioType,
  ScenarioAssumption,
  DecisionNode,
  DecisionType,
  DecisionOutcome,
  SimulationResult,
  DecisionPathStep,
  SkillChange,
  RiskAssessment,
  RiskFactor,
  AlternativeScenario,
} from './career-simulator'

export { useSkillGapVisualization } from './skill-gap-visualization'
export type {
  SkillGapHeatmap,
  HeatmapCell,
  GapMatrix,
  MatrixAnnotation,
  ImprovementRoadmap,
  ImprovementPhase,
  RoadmapMilestone,
  SkillComparisonView,
  SkillSnapshot,
  SkillGapEntry,
  RadarCategory,
} from './skill-gap-visualization'
export type {
  LearningPathType,
  LearningPathNode,
  LearningResource,
  LearningPath,
  SkillGap,
  CentralityMetrics,
  InfluenceScore,
  PropagationAnalysis,
  NetworkHealth,
  NetworkVisualization,
  CareerPathVisualization,
  SkillRadarData,
} from './skill-path'

export {
  CAREER_STORAGE_KEYS,
  TIER_META,
  NODE_TYPE_DEFS,
  CONNECTION_TYPE_META,
} from './types'

export type {
  NetworkTier,
  NodeType,
  ConnectionType,
  ProjectStatus,
  Contact,
  CareerConnection,
  CareerProject,
  CareerPosition,
  CareerPathNode,
  NodeTypeDef,
  NetworkNode,
  NetworkEdge,
  NetworkStats,
} from './types'

// ---- 视图数据层（Career.vue 下沉）----
export { useCareer } from './career'
export type {
  CareerContact,
  CareerConnection as CareerConn,
  CareerProject as CareerProj,
  NodeTypeId,
  ConnectionType as ConnType,
  ProjectStatus as ProjStatus,
} from './career'