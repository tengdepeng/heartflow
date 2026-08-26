// ============================================================
// 业脉 · 技能图谱 + 职业转型分析
// 增强功能：
//   1. 技能图谱（技能树+熟练度+关联网络）
//   2. 职业转型分析（可行路径+技能缺口+推荐策略）
//   3. 人脉互动记录（互动频率+关系质量+提醒）
//   4. 职业里程碑（关键事件时间线+影响评估）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { Contact } from './types'

// ---- 技能图谱 ----

/** 技能类别 */
export type SkillCategory = 'technical' | 'soft' | 'domain' | 'leadership' | 'creative'

/** 熟练度 */
export type ProficiencyLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'

/** 技能节点 */
export interface SkillNode {
  id: string
  name: string
  category: SkillCategory
  /** 熟练度 */
  proficiency: ProficiencyLevel
  /** 熟练度分值 0-100 */
  proficiencyScore: number
  /** 使用年限 */
  yearsOfExperience: number
  /** 关联职位 */
  relatedPositions: string[]
  /** 关联技能ID（前置技能） */
  prerequisites: string[]
  /** 关联技能ID（互补技能） */
  complements: string[]
  /** 是否核心技能 */
  isCore: boolean
  /** 学习建议 */
  learningAdvice?: string
}

/** 技能图谱 */
export interface SkillMap {
  nodes: SkillNode[]
  /** 技能总数 */
  totalSkills: number
  /** 核心技能数 */
  coreSkills: number
  /** 平均熟练度 */
  avgProficiency: number
  /** 技能覆盖度 */
  coverage: Record<SkillCategory, number>
  /** 生成时间 */
  generatedAt: string
}

// ---- 职业转型 ----

/** 转型策略 */
export type TransitionStrategy = 'gradual' | 'pivot' | 'leap' | 'downgrade' | 'lateral'

/** 职业转型路径 */
export interface TransitionPath {
  id: string
  /** 目标职位 */
  targetRole: string
  /** 目标行业 */
  targetIndustry: string
  /** 转型策略 */
  strategy: TransitionStrategy
  /** 所需技能缺口 */
  skillGaps: { skill: string; currentLevel: number; requiredLevel: number; priority: 'high' | 'medium' | 'low' }[]
  /** 预估时间（月） */
  estimatedMonths: number
  /** 难度评分 1-10 */
  difficulty: number
  /** 可行性评分 0-100 */
  feasibility: number
  /** 建议步骤 */
  steps: string[]
  /** 潜在风险 */
  risks: string[]
}

/** 转型分析 */
export interface TransitionAnalysis {
  /** 当前角色 */
  currentRole: string
  /** 可能的转型路径 */
  paths: TransitionPath[]
  /** 分析时间 */
  analyzedAt: string
}

// ---- 人脉互动 ----

/** 互动类型 */
export type InteractionType = 'meeting' | 'call' | 'message' | 'email' | 'coffee' | 'event' | 'collaboration'

/** 互动记录 */
export interface InteractionRecord {
  id: string
  contactId: string
  type: InteractionType
  date: string
  duration?: number
  topic: string
  outcome?: string
  /** 关系质量变化 -1到1 */
  qualityChange: number
}

/** 联系人健康度 */
export interface ContactHealth {
  contactId: string
  /** 最近互动日期 */
  lastInteractionAt?: string
  /** 距上次互动天数 */
  daysSinceLastInteraction: number
  /** 互动频率（每月） */
  interactionFrequency: number
  /** 关系质量趋势 */
  qualityTrend: 'improving' | 'stable' | 'declining'
  /** 是否需要提醒 */
  needsReminder: boolean
  /** 提醒原因 */
  reminderReason?: string
}

// ---- 职业里程碑 ----

/** 里程碑类型 */
export type MilestoneType = 'promotion' | 'job-change' | 'project-completion' | 'certification' | 'award' | 'publication' | 'speaking' | 'other'

/** 职业里程碑 */
export interface CareerMilestone {
  id: string
  type: MilestoneType
  title: string
  description: string
  date: string
  /** 影响程度 1-10 */
  impact: number
  /** 关联技能 */
  relatedSkills: string[]
  /** 关联联系人 */
  relatedContacts: string[]
  /** 经验教训 */
  lesson?: string
}

// ---- 存储键 ----

const CAREER_ADVANCED_STORAGE_KEYS = {
  SKILLS: 'hf:career:skills',
  TRANSITIONS: 'hf:career:transitions',
  INTERACTIONS: 'hf:career:interactions',
  MILESTONES: 'hf:career:milestones',
} as const

// ---- 元数据 ----

export const SKILL_CATEGORY_META: Record<SkillCategory, { label: string; icon: string; color: string }> = {
  technical: { label: '技术技能', icon: '💻', color: '#6b9fc4' },
  soft: { label: '软技能', icon: '💬', color: '#8a9a7a' },
  domain: { label: '领域知识', icon: '📚', color: '#f0c040' },
  leadership: { label: '领导力', icon: '👑', color: '#c46a5a' },
  creative: { label: '创造力', icon: '🎨', color: '#d98c7a' },
}

export const PROFICIENCY_META: Record<ProficiencyLevel, { label: string; score: number; color: string; stars: string }> = {
  novice: { label: '入门', score: 15, color: '#94a3b8', stars: '⭐' },
  beginner: { label: '初级', score: 30, color: '#6b9fc4', stars: '⭐⭐' },
  intermediate: { label: '中级', score: 50, color: '#8a9a7a', stars: '⭐⭐⭐' },
  advanced: { label: '高级', score: 70, color: '#f0c040', stars: '⭐⭐⭐⭐' },
  expert: { label: '专家', score: 85, color: '#e0a96d', stars: '⭐⭐⭐⭐⭐' },
  master: { label: '大师', score: 95, color: '#c46a5a', stars: '👑' },
}

export const TRANSITION_STRATEGY_META: Record<TransitionStrategy, { label: string; description: string; icon: string }> = {
  gradual: { label: '渐进转型', description: '在现有工作中逐步积累新技能，平稳过渡', icon: '🐢' },
  pivot: { label: '轴心转型', description: '利用现有技能迁移到相邻领域', icon: '🔄' },
  leap: { label: '跳跃转型', description: '直接进入全新领域，需要较大投入', icon: '🚀' },
  downgrade: { label: '降级转型', description: '接受较低职位进入新领域', icon: '📉' },
  lateral: { label: '平行转型', description: '同级别切换到不同职能', icon: '↔️' },
}

export const INTERACTION_TYPE_META: Record<InteractionType, { label: string; icon: string; qualityImpact: number }> = {
  meeting: { label: '会面', icon: '🤝', qualityImpact: 0.3 },
  call: { label: '电话', icon: '📞', qualityImpact: 0.15 },
  message: { label: '消息', icon: '💬', qualityImpact: 0.05 },
  email: { label: '邮件', icon: '📧', qualityImpact: 0.05 },
  coffee: { label: '咖啡', icon: '☕', qualityImpact: 0.2 },
  event: { label: '活动', icon: '🎉', qualityImpact: 0.1 },
  collaboration: { label: '协作', icon: '🤝', qualityImpact: 0.25 },
}

export const MILESTONE_TYPE_META: Record<MilestoneType, { label: string; icon: string; color: string }> = {
  promotion: { label: '晋升', icon: '📈', color: '#f0c040' },
  'job-change': { label: '跳槽', icon: '🔄', color: '#6b9fc4' },
  'project-completion': { label: '项目完成', icon: '✅', color: '#8a9a7a' },
  certification: { label: '认证', icon: '📜', color: '#b5707a' },
  award: { label: '获奖', icon: '🏆', color: '#f0c040' },
  publication: { label: '发表', icon: '📝', color: '#6b9fc4' },
  speaking: { label: '演讲', icon: '🎤', color: '#d98c7a' },
  other: { label: '其他', icon: '📌', color: '#94a3b8' },
}

// ============================================================
// useSkillMap — 技能图谱
// ============================================================

export function useSkillMap() {
  const skills = ref<SkillNode[]>([])

  /** 加载技能 */
  function loadSkills(): SkillNode[] {
    const stored = storage.getKV<SkillNode[]>(CAREER_ADVANCED_STORAGE_KEYS.SKILLS, [])
    if (stored) skills.value = stored
    return skills.value
  }

  /** 添加技能 */
  function addSkill(
    name: string,
    category: SkillCategory,
    proficiency: ProficiencyLevel,
    yearsOfExperience: number = 0,
    isCore: boolean = false,
  ): SkillNode {
    const node: SkillNode = {
      id: `skill-${Date.now()}`,
      name,
      category,
      proficiency,
      proficiencyScore: PROFICIENCY_META[proficiency].score,
      yearsOfExperience,
      relatedPositions: [],
      prerequisites: [],
      complements: [],
      isCore,
    }

    skills.value.push(node)
    saveSkills()
    return node
  }

  /** 更新技能熟练度 */
  function updateProficiency(skillId: string, newLevel: ProficiencyLevel): boolean {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill) return false
    skill.proficiency = newLevel
    skill.proficiencyScore = PROFICIENCY_META[newLevel].score
    saveSkills()
    return true
  }

  /** 添加技能关联 */
  function addSkillRelation(skillId: string, targetId: string, relationType: 'prerequisites' | 'complements'): boolean {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill) return false
    if (!skill[relationType].includes(targetId)) {
      skill[relationType].push(targetId)
    }
    saveSkills()
    return true
  }

  /** 生成技能图谱 */
  const skillMap = computed((): SkillMap => {
    const totalSkills = skills.value.length
    const coreSkills = skills.value.filter(s => s.isCore).length
    const avgProficiency = totalSkills > 0
      ? Math.round(skills.value.reduce((s, sk) => s + sk.proficiencyScore, 0) / totalSkills)
      : 0

    const coverage: Record<SkillCategory, number> = {
      technical: 0,
      soft: 0,
      domain: 0,
      leadership: 0,
      creative: 0,
    }
    for (const s of skills.value) {
      coverage[s.category] = (coverage[s.category] || 0) + 1
    }

    return {
      nodes: skills.value,
      totalSkills,
      coreSkills,
      avgProficiency,
      coverage,
      generatedAt: new Date().toISOString(),
    }
  })

  /** 获取技能雷达图数据 */
  function getSkillRadarData(): { category: string; value: number }[] {
    return Object.entries(SKILL_CATEGORY_META).map(([key, meta]) => {
      const catSkills = skills.value.filter(s => s.category === key)
      const avgScore = catSkills.length > 0
        ? Math.round(catSkills.reduce((s, sk) => s + sk.proficiencyScore, 0) / catSkills.length)
        : 0
      return { category: meta.label, value: avgScore }
    })
  }

  /** 保存 */
  function saveSkills(): void {
    storage.setKV(CAREER_ADVANCED_STORAGE_KEYS.SKILLS, skills.value)
  }

  return {
    skills,
    skillMap,
    loadSkills,
    addSkill,
    updateProficiency,
    addSkillRelation,
    getSkillRadarData,
    saveSkills,
  }
}

// ============================================================
// useTransitionAnalysis — 职业转型分析
// ============================================================

export function useTransitionAnalysis() {
  const analysis = ref<TransitionAnalysis | null>(null)

  /** 分析转型路径 */
  function analyzeTransition(
    currentRole: string,
    currentSkills: SkillNode[],
    targetRole: string,
    requiredSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[],
  ): TransitionAnalysis {
    const skillGaps: TransitionPath['skillGaps'] = []

    for (const req of requiredSkills) {
      const existing = currentSkills.find(s =>
        s.name.toLowerCase() === req.name.toLowerCase()
      )
      const currentScore = existing ? existing.proficiencyScore : 0
      const requiredScore = PROFICIENCY_META[req.level].score

      if (currentScore < requiredScore) {
        skillGaps.push({
          skill: req.name,
          currentLevel: currentScore,
          requiredLevel: requiredScore,
          priority: requiredScore - currentScore > 40 ? 'high' : requiredScore - currentScore > 20 ? 'medium' : 'low',
        })
      }
    }

    const highPriorityGaps = skillGaps.filter(g => g.priority === 'high').length
    const totalGaps = skillGaps.length

    // 确定策略
    let strategy: TransitionStrategy
    if (totalGaps === 0) strategy = 'lateral'
    else if (highPriorityGaps === 0 && totalGaps <= 3) strategy = 'pivot'
    else if (highPriorityGaps <= 2) strategy = 'gradual'
    else if (highPriorityGaps <= 5) strategy = 'leap'
    else strategy = 'downgrade'

    const estimatedMonths = totalGaps * 2 + highPriorityGaps * 3
    const difficulty = Math.min(highPriorityGaps * 2 + totalGaps, 10)
    const feasibility = Math.max(100 - difficulty * 10, 10)

    const steps: string[] = [
      `明确目标职位 "${targetRole}" 的核心要求`,
      ...skillGaps.filter(g => g.priority === 'high').map(g =>
        `优先学习 ${g.skill}（当前 ${g.currentLevel} → 目标 ${g.requiredLevel}）`
      ),
      ...skillGaps.filter(g => g.priority === 'medium').map(g =>
        `补充学习 ${g.skill}`
      ),
      '寻找相关项目或实习机会积累经验',
      '更新简历和 LinkedIn 突出相关技能',
      '通过人脉网络寻找内推机会',
    ]

    const risks: string[] = []
    if (strategy === 'leap' || strategy === 'downgrade') {
      risks.push('可能需要接受薪资下降')
    }
    if (highPriorityGaps > 3) {
      risks.push('技能缺口较大，转型周期较长')
    }
    if (estimatedMonths > 12) {
      risks.push(`预计转型时间超过 ${estimatedMonths} 个月，需要做好长期规划`)
    }

    const path: TransitionPath = {
      id: `transition-${Date.now()}`,
      targetRole,
      targetIndustry: '',
      strategy,
      skillGaps,
      estimatedMonths,
      difficulty,
      feasibility,
      steps,
      risks,
    }

    analysis.value = {
      currentRole,
      paths: [path],
      analyzedAt: new Date().toISOString(),
    }

    return analysis.value
  }

  /** 多路径分析 */
  function analyzeMultiplePaths(
    currentRole: string,
    currentSkills: SkillNode[],
    targets: { role: string; industry: string; requiredSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[] }[],
  ): TransitionAnalysis {
    const paths: TransitionPath[] = targets.map(t => {
      const single = analyzeTransition(currentRole, currentSkills, t.role, t.requiredSkills)
      const path = single.paths[0]
      path.targetIndustry = t.industry
      return path
    })

    analysis.value = {
      currentRole,
      paths: paths.sort((a, b) => b.feasibility - a.feasibility),
      analyzedAt: new Date().toISOString(),
    }

    return analysis.value
  }

  return {
    analysis,
    analyzeTransition,
    analyzeMultiplePaths,
  }
}

// ============================================================
// useInteractionTracker — 人脉互动记录
// ============================================================

export function useInteractionTracker() {
  const interactions = ref<InteractionRecord[]>([])

  /** 加载互动记录 */
  function loadInteractions(): InteractionRecord[] {
    const stored = storage.getKV<InteractionRecord[]>(CAREER_ADVANCED_STORAGE_KEYS.INTERACTIONS, [])
    if (stored) interactions.value = stored
    return interactions.value
  }

  /** 记录互动 */
  function recordInteraction(
    contactId: string,
    type: InteractionType,
    topic: string,
    outcome?: string,
    duration?: number,
  ): InteractionRecord {
    const record: InteractionRecord = {
      id: `int-${Date.now()}`,
      contactId,
      type,
      date: new Date().toISOString(),
      duration,
      topic,
      outcome,
      qualityChange: INTERACTION_TYPE_META[type].qualityImpact,
    }

    interactions.value.push(record)
    saveInteractions()
    return record
  }

  /** 分析联系人健康度 */
  function analyzeContactHealth(contact: Contact): ContactHealth {
    const contactInteractions = interactions.value
      .filter(i => i.contactId === contact.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const lastInteraction = contactInteractions[0]
    const daysSinceLastInteraction = lastInteraction
      ? Math.round((Date.now() - new Date(lastInteraction.date).getTime()) / 86400000)
      : 999

    // 计算每月互动频率
    const firstInteraction = contactInteractions[contactInteractions.length - 1]
    const totalMonths = firstInteraction
      ? Math.max((Date.now() - new Date(firstInteraction.date).getTime()) / (86400000 * 30), 1)
      : 1
    const interactionFrequency = Math.round(contactInteractions.length / totalMonths * 10) / 10

    // 关系质量趋势
    const recentQuality = contactInteractions.slice(0, 5).reduce((s, i) => s + i.qualityChange, 0)
    let qualityTrend: 'improving' | 'stable' | 'declining'
    if (recentQuality > 0.3) qualityTrend = 'improving'
    else if (recentQuality < -0.3) qualityTrend = 'declining'
    else qualityTrend = 'stable'

    const needsReminder = daysSinceLastInteraction > 90 || (contact.tier === 'core' && daysSinceLastInteraction > 30)
    const reminderReason = needsReminder
      ? daysSinceLastInteraction > 180
        ? `已超过半年未联系 ${contact.name}`
        : `已 ${daysSinceLastInteraction} 天未联系 ${contact.name}`
      : undefined

    return {
      contactId: contact.id,
      lastInteractionAt: lastInteraction?.date,
      daysSinceLastInteraction,
      interactionFrequency,
      qualityTrend,
      needsReminder,
      reminderReason,
    }
  }

  /** 获取需要提醒的联系人 */
  function getReminderContacts(contacts: Contact[]): { contact: Contact; health: ContactHealth }[] {
    return contacts
      .map(c => ({ contact: c, health: analyzeContactHealth(c) }))
      .filter(({ health }) => health.needsReminder)
      .sort((a, b) => b.health.daysSinceLastInteraction - a.health.daysSinceLastInteraction)
  }

  /** 保存 */
  function saveInteractions(): void {
    storage.setKV(CAREER_ADVANCED_STORAGE_KEYS.INTERACTIONS, interactions.value)
  }

  return {
    interactions,
    loadInteractions,
    recordInteraction,
    analyzeContactHealth,
    getReminderContacts,
    saveInteractions,
  }
}

// ============================================================
// useCareerMilestones — 职业里程碑
// ============================================================

export function useCareerMilestones() {
  const milestones = ref<CareerMilestone[]>([])

  /** 加载里程碑 */
  function loadMilestones(): CareerMilestone[] {
    const stored = storage.getKV<CareerMilestone[]>(CAREER_ADVANCED_STORAGE_KEYS.MILESTONES, [])
    if (stored) milestones.value = stored
    return milestones.value
  }

  /** 添加里程碑 */
  function addMilestone(
    type: MilestoneType,
    title: string,
    description: string,
    date: string,
    impact: number = 5,
    lesson?: string,
  ): CareerMilestone {
    const milestone: CareerMilestone = {
      id: `ms-${Date.now()}`,
      type,
      title,
      description,
      date,
      impact,
      relatedSkills: [],
      relatedContacts: [],
      lesson,
    }

    milestones.value.push(milestone)
    saveMilestones()
    return milestone
  }

  /** 获取里程碑时间线 */
  const milestoneTimeline = computed(() =>
    [...milestones.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  )

  /** 里程碑统计 */
  const milestoneStats = computed(() => {
    const byType: Record<string, number> = {}
    let totalImpact = 0

    for (const m of milestones.value) {
      byType[m.type] = (byType[m.type] || 0) + 1
      totalImpact += m.impact
    }

    return {
      total: milestones.value.length,
      byType,
      avgImpact: milestones.value.length > 0
        ? Math.round(totalImpact / milestones.value.length * 10) / 10
        : 0,
      totalImpact,
    }
  })

  /** 保存 */
  function saveMilestones(): void {
    storage.setKV(CAREER_ADVANCED_STORAGE_KEYS.MILESTONES, milestones.value)
  }

  return {
    milestones,
    milestoneTimeline,
    milestoneStats,
    loadMilestones,
    addMilestone,
    saveMilestones,
  }
}