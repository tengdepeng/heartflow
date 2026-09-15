// ============================================================
// 业脉 · 技能缺口补充建议引擎（P16-7）
// 智能技能缺口分析、学习路径推荐和进度追踪
// ============================================================

import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone } from './skill-map'
import { PROFICIENCY_META } from './skill-map'
import type { LearningResource } from './skill-path'

// ---- 技能缺口建议类型 ----

/** 技能缺口分析结果 */
export interface SkillGapAnalysis {
  /** 分析目标 */
  target: string
  /** 当前技能纵览 */
  currentSkillsSummary: SkillSummary
  /** 缺口列表 */
  gaps: PrioritizedGap[]
  /** 推荐学习路径 */
  recommendedPath: LearningPlan
  /** 里程碑关联 */
  milestoneConnections: MilestoneSkillConnection[]
  /** 分析时间 */
  analyzedAt: string
}

/** 技能纵览 */
export interface SkillSummary {
  /** 技能总数 */
  totalSkills: number
  /** 核心技能数 */
  coreSkills: number
  /** 平均熟练度 */
  avgProficiency: number
  /** 各分类分布 */
  categoryDistribution: Record<SkillCategory, number>
  /** 最强技能 */
  strongestSkills: SkillNode[]
  /** 最弱技能 */
  weakestSkills: SkillNode[]
  /** 整体评分 0-100 */
  overallScore: number
}

/** 技能缺口档案（SkillGapArchivePanel 消费的整体聚合） */
export interface SkillGapProfile {
  /** 技能纵览 */
  summary: SkillSummary
  /** 优先级缺口列表 */
  gaps: PrioritizedGap[]
  /** 缺口数量（徽标用） */
  gapCount: number
  /** 里程碑所需技能的覆盖百分比 */
  coverage: number
  /** 里程碑关联准备度均值 */
  overallReadiness: number
  /** 学习路线图（由 generateRoadmap 生成） */
  roadmap: {
    currentLevel: string
    roadmap: { stage: number; name: string; skills: string[]; estimatedMonths: number; milestone: string }[]
    totalMonths: number
  }
  /** 里程碑-技能关联 */
  milestoneConnections: MilestoneSkillConnection[]
  /** 温和洞察 */
  insights: { title: string; description: string }[]
}

/** 优先级缺口 */
export interface PrioritizedGap {
  /** 技能名称 */
  skillName: string
  /** 技能分类 */
  category: SkillCategory
  /** 当前水平 */
  currentLevel: ProficiencyLevel
  /** 当前分数 */
  currentScore: number
  /** 目标水平 */
  targetLevel: ProficiencyLevel
  /** 目标分数 */
  targetScore: number
  /** 缺口大小 */
  gapSize: number
  /** 优先级 */
  priority: 'urgent' | 'high' | 'medium' | 'low'
  /** 优先级分数 */
  priorityScore: number
  /** 估计学习时长（小时） */
  estimatedHours: number
  /** 推荐学习资源 */
  resources: LearningResource[]
  /** 是否为前置技能（阻碍其他技能学习） */
  isPrerequisite: boolean
  /** 建议学习策略 */
  learningStrategy: string
}

/** 学习计划 */
export interface LearningPlan {
  /** 计划名称 */
  name: string
  /** 目标 */
  goal: string
  /** 学习阶段 */
  phases: LearningPhase[]
  /** 总估计时长 */
  totalEstimatedHours: number
  /** 建议每周学习时长 */
  weeklyHours: number
  /** 预计完成周数 */
  estimatedWeeks: number
  /** 里程碑检查点 */
  checkpoints: LearningCheckpoint[]
}

/** 学习阶段 */
export interface LearningPhase {
  /** 阶段编号 */
  phase: number
  /** 阶段名称 */
  name: string
  /** 阶段目标 */
  objective: string
  /** 阶段技能 */
  skills: string[]
  /** 阶段时长（小时） */
  estimatedHours: number
  /** 前置阶段 */
  prerequisites: number[]
  /** 完成标准 */
  completionCriteria: string
}

/** 学习检查点 */
export interface LearningCheckpoint {
  /** 周数 */
  week: number
  /** 描述 */
  description: string
  /** 预期完成技能 */
  expectedSkills: string[]
  /** 里程碑关联 */
  milestoneName?: string
}

/** 里程碑-技能关联 */
export interface MilestoneSkillConnection {
  /** 里程碑 */
  milestone: CareerMilestone
  /** 关联技能 */
  requiredSkills: string[]
  /** 当前准备度 */
  readiness: number
  /** 建议 */
  suggestion: string
}

/** 技能学习建议 */
export interface SkillLearningAdvice {
  /** 技能名称 */
  skillName: string
  /** 当前水平 */
  currentLevel: string
  /** 建议学习方式 */
  learningMethods: string[]
  /** 推荐资源 */
  resources: LearningResource[]
  /** 时间估计 */
  timeEstimate: string
  /** 难度提示 */
  difficultyNote: string
  /** 练习建议 */
  practiceSuggestions: string[]
}

// ---- 技能缺口建议引擎 ----

export function useSkillGapAdvisor() {
  /**
   * 分析技能缺口
   * 综合当前技能、目标要求和里程碑，生成优先级排序的缺口列表
   */
  function analyzeGaps(
    currentSkills: SkillNode[],
    targetSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[],
    milestones: CareerMilestone[],
    targetName: string = '目标角色',
  ): SkillGapAnalysis {
    // 1. 当前技能纵览
    const currentSkillsSummary = buildSkillSummary(currentSkills)

    // 2. 分析缺口
    const gaps = prioritizeGaps(currentSkills, targetSkills)

    // 3. 生成学习计划
    const recommendedPath = buildLearningPlan(gaps, targetName)

    // 4. 里程碑关联
    const milestoneConnections = connectMilestones(milestones, gaps, currentSkills)

    return {
      target: targetName,
      currentSkillsSummary,
      gaps,
      recommendedPath,
      milestoneConnections,
      analyzedAt: new Date().toISOString(),
    }
  }

  /**
   * 获取针对特定技能的学习建议
   */
  function getSkillAdvice(
    skillName: string,
    category: SkillCategory,
    currentLevel: ProficiencyLevel,
    targetLevel: ProficiencyLevel,
  ): SkillLearningAdvice {
    const currentScore = PROFICIENCY_META[currentLevel].score
    const targetScore = PROFICIENCY_META[targetLevel].score
    const gap = targetScore - currentScore

    const learningMethods = recommendLearningMethods(category, gap)
    const resources = recommendResources(skillName, category, currentLevel, targetLevel)
    const timeEstimate = estimateTime(gap, category)
    const difficultyNote = assessDifficulty(gap, category)
    const practiceSuggestions = suggestPractice(skillName, category, currentLevel, targetLevel)

    return {
      skillName,
      currentLevel: PROFICIENCY_META[currentLevel].label,
      learningMethods,
      resources,
      timeEstimate,
      difficultyNote,
      practiceSuggestions,
    }
  }

  /**
   * 为多目标同时分析技能缺口
   */
  function analyzeForMultipleTargets(
    currentSkills: SkillNode[],
    targets: { name: string; requiredSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[] }[],
    milestones: CareerMilestone[],
  ): SkillGapAnalysis[] {
    return targets.map(t => analyzeGaps(currentSkills, t.requiredSkills, milestones, t.name))
  }

  /**
   * 生成技能发展路线图
   */
  function generateRoadmap(
    currentSkills: SkillNode[],
    careerGoals: string[],
    milestones: CareerMilestone[],
  ): {
    currentLevel: string
    roadmap: { stage: number; name: string; skills: string[]; estimatedMonths: number; milestone: string }[]
    totalMonths: number
  } {
    const roadmap = careerGoals.map((goal, i) => {
      // 根据目标推断所需技能
      const inferredSkills = inferSkillsForGoal(goal, currentSkills)
      const stageMonths = Math.ceil(inferredSkills.length * 1.5)

      return {
        stage: i + 1,
        name: goal,
        skills: inferredSkills,
        estimatedMonths: stageMonths,
        milestone: milestones.find(m => m.title.includes(goal))?.title || `达成 ${goal}`,
      }
    })

    return {
      currentLevel: `${currentSkills.length} 项技能 · 平均熟练度 ${Math.round(currentSkills.reduce((s, sk) => s + sk.proficiencyScore, 0) / Math.max(currentSkills.length, 1))}%`,
      roadmap,
      totalMonths: roadmap.reduce((s, r) => s + r.estimatedMonths, 0),
    }
  }

  /**
   * 构建技能缺口档案（SkillGapArchivePanel 消费的整体聚合）。
   * 缺口来源为各里程碑的 relatedSkills：已具备的技能不计缺口，
   * 缺失的技能列为待补强项；无目标角色时也能给出自我提升视角。
   */
  function buildSkillGapProfile(
    skills: SkillNode[],
    milestones: CareerMilestone[],
  ): SkillGapProfile {
    // 从里程碑所需技能推得去重目标技能（保持出现顺序）
    const targetNames: string[] = []
    for (const m of milestones) {
      for (const s of m.relatedSkills) {
        if (!targetNames.some(n => n.toLowerCase() === s.toLowerCase())) targetNames.push(s)
      }
    }
    const targetSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[] =
      targetNames.map(name => ({ name, category: 'technical', level: 'intermediate' }))

    const analysis = analyzeGaps(skills, targetSkills, milestones)

    // 里程碑覆盖：所需技能中被当前技能覆盖的比例
    const ownedNames = skills.map(s => s.name.toLowerCase())
    const requiredAll = milestones.flatMap(m => m.relatedSkills)
    const covered = requiredAll.filter(s => ownedNames.includes(s.toLowerCase())).length
    const coverage = requiredAll.length ? Math.round((covered / requiredAll.length) * 100) : 0

    const connections = connectMilestones(milestones, analysis.gaps, skills)
    const overallReadiness = connections.length
      ? Math.round(connections.reduce((s, c) => s + c.readiness, 0) / connections.length)
      : 0

    const roadmap = generateRoadmap(skills, targetNames, milestones)
    const insights = buildProfileInsights(analysis, coverage, milestones.length)

    return {
      summary: analysis.currentSkillsSummary,
      gaps: analysis.gaps,
      gapCount: analysis.gaps.length,
      coverage,
      overallReadiness,
      roadmap,
      milestoneConnections: connections,
      insights,
    }
  }

  return {
    analyzeGaps,
    getSkillAdvice,
    analyzeForMultipleTargets,
    generateRoadmap,
    buildSkillGapProfile,
  }
}

// ---- 内部函数 ----

/** 构建技能纵览 */
function buildSkillSummary(skills: SkillNode[]): SkillSummary {
  const totalSkills = skills.length
  const coreSkills = skills.filter(s => s.isCore).length
  const avgProficiency = totalSkills > 0
    ? Math.round(skills.reduce((s, sk) => s + sk.proficiencyScore, 0) / totalSkills)
    : 0

  const categoryDistribution: Record<SkillCategory, number> = {
    technical: 0,
    soft: 0,
    domain: 0,
    leadership: 0,
    creative: 0,
  }
  for (const s of skills) {
    categoryDistribution[s.category] = (categoryDistribution[s.category] || 0) + 1
  }

  const sorted = [...skills].sort((a, b) => b.proficiencyScore - a.proficiencyScore)
  const strongestSkills = sorted.slice(0, 3)
  const weakestSkills = sorted.slice(-3).reverse()

  const overallScore = totalSkills > 0
    ? Math.round(
        avgProficiency * 0.4 +
        coreSkills / Math.max(totalSkills, 1) * 100 * 0.3 +
        Object.values(categoryDistribution).filter(c => c > 0).length / 5 * 100 * 0.3
      )
    : 0

  return {
    totalSkills,
    coreSkills,
    avgProficiency,
    categoryDistribution,
    strongestSkills,
    weakestSkills,
    overallScore,
  }
}

/** 由档案聚合生成不超过 4 条的温和洞察 */
function buildProfileInsights(
  analysis: SkillGapAnalysis,
  coverage: number,
  milestoneCount: number,
): { title: string; description: string }[] {
  const out: { title: string; description: string }[] = []
  const total = analysis.currentSkillsSummary.totalSkills

  if (!total && !milestoneCount) {
    out.push({ title: '尚无数据', description: '还没有技能与里程碑可供分析。' })
    return out
  }

  if (analysis.gaps.length > 0) {
    out.push({
      title: '最需补强',
      description: `「${analysis.gaps[0].skillName}」是优先级最高的缺口，建议优先投入。`,
    })
  } else if (total > 0) {
    out.push({ title: '技能齐备', description: '当前技能已覆盖所有里程碑所需，保持即可。' })
  }

  if (milestoneCount > 0) {
    out.push({
      title: '里程碑覆盖',
      description: `当前技能覆盖 ${coverage}% 的里程碑所需技能。`,
    })
  }

  return out.slice(0, 4)
}

/** 优先级排序缺口 */
function prioritizeGaps(
  currentSkills: SkillNode[],
  targetSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[],
): PrioritizedGap[] {
  const gaps: PrioritizedGap[] = []

  for (const target of targetSkills) {
    const existing = currentSkills.find(
      s => s.name.toLowerCase() === target.name.toLowerCase() ||
          s.name.toLowerCase().includes(target.name.toLowerCase()) ||
          target.name.toLowerCase().includes(s.name.toLowerCase())
    )

    const currentLevel = existing ? existing.proficiency : 'novice'
    const currentScore = existing ? existing.proficiencyScore : 0
    const targetScore = PROFICIENCY_META[target.level].score
    const gapSize = targetScore - currentScore

    if (gapSize > 0) {
      // 检查是否为前置技能
      const isPrerequisite = existing
        ? currentSkills.some(s => s.prerequisites.includes(existing.id))
        : false

      // 计算优先级分数
      let priorityScore = gapSize * 0.4 // 缺口大小 40%
      priorityScore += (targetScore / 100) * 30 // 重要程度 30%
      priorityScore += isPrerequisite ? 20 : 0 // 前置技能加分 20%
      priorityScore += (5 - (existing?.yearsOfExperience || 0)) * 2 // 经验不足 10%

      let priority: 'urgent' | 'high' | 'medium' | 'low'
      if (priorityScore >= 60) priority = 'urgent'
      else if (priorityScore >= 40) priority = 'high'
      else if (priorityScore >= 20) priority = 'medium'
      else priority = 'low'

      gaps.push({
        skillName: target.name,
        category: target.category,
        currentLevel,
        currentScore,
        targetLevel: target.level,
        targetScore,
        gapSize,
        priority,
        priorityScore: Math.round(priorityScore),
        estimatedHours: estimateLearningHours(gapSize, target.category),
        resources: recommendResources(target.name, target.category, currentLevel, target.level),
        isPrerequisite,
        learningStrategy: generateLearningStrategy(target.category, gapSize, isPrerequisite),
      })
    }
  }

  // 排序：优先级高的在前
  gaps.sort((a, b) => b.priorityScore - a.priorityScore)

  return gaps
}

/** 构建学习计划 */
function buildLearningPlan(gaps: PrioritizedGap[], targetName: string): LearningPlan {
  // 按优先级分组
  const urgentGaps = gaps.filter(g => g.priority === 'urgent')
  const highGaps = gaps.filter(g => g.priority === 'high')
  const mediumGaps = gaps.filter(g => g.priority === 'medium')
  const lowGaps = gaps.filter(g => g.priority === 'low')

  const phases: LearningPhase[] = []
  let phaseNum = 0

  if (urgentGaps.length > 0) {
    phaseNum++
    phases.push({
      phase: phaseNum,
      name: '基础补齐阶段',
      objective: '快速填补关键技能缺口，奠定转型基础',
      skills: urgentGaps.map(g => g.skillName),
      estimatedHours: urgentGaps.reduce((s, g) => s + g.estimatedHours, 0),
      prerequisites: [],
      completionCriteria: `所有关键技能达到 ${urgentGaps[0]?.targetLevel || '目标'} 水平`,
    })
  }

  if (highGaps.length > 0) {
    phaseNum++
    phases.push({
      phase: phaseNum,
      name: '核心提升阶段',
      objective: '系统提升核心技能，达到岗位基本要求',
      skills: highGaps.map(g => g.skillName),
      estimatedHours: highGaps.reduce((s, g) => s + g.estimatedHours, 0),
      prerequisites: urgentGaps.length > 0 ? [phaseNum - 1] : [],
      completionCriteria: '核心技能熟练度达到中级以上',
    })
  }

  if (mediumGaps.length > 0 || lowGaps.length > 0) {
    phaseNum++
    const allRest = [...mediumGaps, ...lowGaps]
    phases.push({
      phase: phaseNum,
      name: '全面精进阶段',
      objective: '拓展技能广度，建立竞争优势',
      skills: allRest.map(g => g.skillName),
      estimatedHours: allRest.reduce((s, g) => s + g.estimatedHours, 0),
      prerequisites: [phaseNum - 1],
      completionCriteria: '完成所有推荐技能学习，达到目标水平',
    })
  }

  const totalEstimatedHours = phases.reduce((s, p) => s + p.estimatedHours, 0)
  const weeklyHours = 10 // 默认按每周 10 小时估算
  const estimatedWeeks = Math.ceil(totalEstimatedHours / weeklyHours)

  // 生成检查点
  const checkpoints: LearningCheckpoint[] = []
  let currentWeek = 0
  for (const phase of phases) {
    const phaseWeeks = Math.ceil(phase.estimatedHours / weeklyHours)
    currentWeek += phaseWeeks
    checkpoints.push({
      week: currentWeek,
      description: `完成「${phase.name}」`,
      expectedSkills: phase.skills,
    })
  }

  return {
    name: `通往 ${targetName} 的学习计划`,
    goal: targetName,
    phases,
    totalEstimatedHours,
    weeklyHours,
    estimatedWeeks,
    checkpoints,
  }
}

/** 关联里程碑 */
function connectMilestones(
  milestones: CareerMilestone[],
  gaps: PrioritizedGap[],
  _currentSkills: SkillNode[],
): MilestoneSkillConnection[] {
  return milestones.map(m => {
    const gapSkillNames = gaps.map(g => g.skillName.toLowerCase())
    const relatedSkills = m.relatedSkills.filter(s =>
      gapSkillNames.some(g => g.includes(s.toLowerCase()) || s.toLowerCase().includes(g))
    )

    const readiness = relatedSkills.length > 0
      ? Math.min(Math.round(
          gaps.filter(g => relatedSkills.some(rs =>
            g.skillName.toLowerCase().includes(rs.toLowerCase())
          )).reduce((s, g) => s + (100 - g.gapSize), 0) / Math.max(relatedSkills.length, 1)
        ), 100)
      : 50

    return {
      milestone: m,
      requiredSkills: relatedSkills.length > 0 ? relatedSkills : [m.title],
      readiness,
      suggestion: readiness >= 70
        ? '技能储备充足，可推进此里程碑'
        : readiness >= 40
        ? '技能储备不足，相关缺口待补充'
        : '需要较多学习准备，可作为长期目标',
    }
  })
}

/** 推荐学习方式 */
function recommendLearningMethods(category: SkillCategory, _gap: number): string[] {
  const methods: Record<SkillCategory, string[]> = {
    technical: ['在线课程系统学习', '动手实践项目', '阅读技术文档', '参与开源项目'],
    soft: ['阅读经典书籍', '参加工作坊', '日常刻意练习', '寻求反馈'],
    domain: ['行业报告研读', '参加行业会议', '与专家交流', '案例研究'],
    leadership: ['阅读管理书籍', '担任项目负责人', '寻找导师', '参加领导力培训'],
    creative: ['临摹优秀作品', '参与创意工作坊', '建立灵感库', '定期创作练习'],
  }

  return methods[category] || methods.technical
}

/** 推荐学习资源 */
function recommendResources(
  skillName: string,
  category: SkillCategory,
  _currentLevel: ProficiencyLevel,
  _targetLevel: ProficiencyLevel,
): LearningResource[] {
  const categoryResources: Record<SkillCategory, LearningResource[]> = {
    technical: [
      { type: 'course', title: `${skillName} 系统课程`, completed: false },
      { type: 'project', title: `${skillName} 实战项目`, completed: false },
      { type: 'book', title: `${skillName} 权威指南`, completed: false },
      { type: 'article', title: `${skillName} 最佳实践`, completed: false },
    ],
    soft: [
      { type: 'book', title: `${skillName} 经典著作`, completed: false },
      { type: 'video', title: `${skillName} TED 演讲集`, completed: false },
      { type: 'mentor', title: `${skillName} 领域导师`, completed: false },
    ],
    domain: [
      { type: 'course', title: `${skillName} 领域课程`, completed: false },
      { type: 'article', title: `${skillName} 行业分析`, completed: false },
      { type: 'book', title: `${skillName} 专业书籍`, completed: false },
    ],
    leadership: [
      { type: 'book', title: `${skillName} 管理经典`, completed: false },
      { type: 'course', title: `${skillName} 培训课程`, completed: false },
      { type: 'mentor', title: `${skillName} 高管导师`, completed: false },
    ],
    creative: [
      { type: 'course', title: `${skillName} 创意课程`, completed: false },
      { type: 'project', title: `${skillName} 创作项目`, completed: false },
      { type: 'video', title: `${skillName} 灵感集`, completed: false },
    ],
  }

  return categoryResources[category] || categoryResources.technical
}

/** 估计学习时长 */
function estimateLearningHours(gapSize: number, category: SkillCategory): number {
  const categoryMultiplier: Record<SkillCategory, number> = {
    technical: 1.2,   // 技术技能需要更多练习
    soft: 1.5,        // 软技能需要更长时间内化
    domain: 1.0,      // 领域知识标准
    leadership: 1.8,  // 领导力需要实践经验
    creative: 1.3,    // 创造力需要练习和灵感
  }

  const multiplier = categoryMultiplier[category] || 1.0
  return Math.ceil(gapSize / 10 * 20 * multiplier)
}

/** 估计学习时间 */
function estimateTime(gap: number, category: SkillCategory): string {
  const hours = estimateLearningHours(gap, category)
  if (hours <= 20) return '约 1-2 周'
  if (hours <= 40) return '约 1 个月'
  if (hours <= 80) return '约 2-3 个月'
  if (hours <= 160) return '约 3-6 个月'
  return '约 6 个月以上'
}

/** 评估难度 */
function assessDifficulty(gap: number, category: SkillCategory): string {
  const difficultyNotes: Record<SkillCategory, Record<string, string>> = {
    technical: {
      small: '可通过在线课程快速掌握',
      medium: '需要结合项目实践巩固',
      large: '可分阶段学习，从基础到高级逐步推进',
    },
    soft: {
      small: '可通过日常刻意练习提升',
      medium: '需要在真实场景中反复练习',
      large: '需要长期积累和深度反思',
    },
    domain: {
      small: '可通过阅读行业报告快速了解',
      medium: '需要结合实践逐步深入',
      large: '需要系统学习和行业经验积累',
    },
    leadership: {
      small: '可通过阅读和学习基本概念',
      medium: '需要在实践中验证和调整',
      large: '需要长期实践和导师指导',
    },
    creative: {
      small: '可通过模仿和练习快速提升',
      medium: '需要建立个人风格和方法论',
      large: '需要大量创作和反思积累',
    },
  }

  const size = gap <= 20 ? 'small' : gap <= 50 ? 'medium' : 'large'
  const catNotes = difficultyNotes[category] || difficultyNotes.technical
  return catNotes[size]
}

/** 建议练习方式 */
function suggestPractice(
  skillName: string,
  category: SkillCategory,
  _currentLevel: ProficiencyLevel,
  _targetLevel: ProficiencyLevel,
): string[] {
  const practices: Record<SkillCategory, string[]> = {
    technical: [
      `完成 3 个 ${skillName} 相关项目`,
      `阅读 ${skillName} 官方文档并做笔记`,
      `在 GitHub 上贡献 ${skillName} 相关开源项目`,
      `写一篇 ${skillName} 技术博客分享`,
    ],
    soft: [
      `每天记录 ${skillName} 相关的实践和反思`,
      `寻找 ${skillName} 方面的榜样并学习`,
      `在团队中主动练习 ${skillName}`,
      `定期获取 ${skillName} 方面的反馈`,
    ],
    domain: [
      `每周阅读 ${skillName} 相关行业报告`,
      `参加 ${skillName} 相关线上/线下活动`,
      `与 ${skillName} 领域专家进行交流`,
      `整理 ${skillName} 知识体系`,
    ],
    leadership: [
      `主动承担 ${skillName} 相关责任`,
      `寻找 ${skillName} 方面的导师`,
      `阅读 ${skillName} 经典书籍并实践`,
      `定期复盘 ${skillName} 相关经验`,
    ],
    creative: [
      `每周完成 ${skillName} 练习作品`,
      `建立 ${skillName} 灵感收集系统`,
      `参加 ${skillName} 创意挑战`,
      `分享 ${skillName} 作品获取反馈`,
    ],
  }

  return practices[category] || practices.technical
}

/** 生成学习策略 */
function generateLearningStrategy(
  category: SkillCategory,
  gapSize: number,
  isPrerequisite: boolean,
): string {
  const strategies: Record<SkillCategory, string> = {
    technical: gapSize > 50
      ? '分阶段学习：基础 → 进阶 → 实战，每阶段设置明确目标'
      : '项目驱动学习，在实践中快速掌握',
    soft: '刻意练习 + 定期反思 + 寻求反馈，三步循环提升',
    domain: '系统阅读 + 行业交流 + 案例分析，建立知识框架',
    leadership: '理论学习 + 实践应用 + 导师指导，三位一体',
    creative: '大量输入 + 定期输出 + 迭代优化，循环提升',
  }

  const baseStrategy = strategies[category] || strategies.technical
  if (isPrerequisite) {
    return `【前置技能】优先学习，${baseStrategy}`
  }
  return baseStrategy
}

/** 根据目标推断所需技能 */
function inferSkillsForGoal(goal: string, currentSkills: SkillNode[]): string[] {
  const goalLower = goal.toLowerCase()
  const skills: string[] = []

  // 技术类目标
  if (goalLower.includes('技术') || goalLower.includes('开发') || goalLower.includes('工程')) {
    skills.push('系统架构', '性能优化', '团队管理')
  }
  // 产品类目标
  if (goalLower.includes('产品') || goalLower.includes('pm')) {
    skills.push('需求分析', '用户研究', '数据分析')
  }
  // 管理类目标
  if (goalLower.includes('管理') || goalLower.includes('lead') || goalLower.includes('经理')) {
    skills.push('团队管理', '项目管理', '沟通能力')
  }
  // 数据类目标
  if (goalLower.includes('数据') || goalLower.includes('data')) {
    skills.push('数据分析', '统计学', 'SQL')
  }
  // 设计类目标
  if (goalLower.includes('设计') || goalLower.includes('design')) {
    skills.push('UI设计', '用户体验', '设计系统')
  }

  // 过滤掉已有技能
  return skills.filter(s =>
    !currentSkills.some(cs => cs.name.toLowerCase().includes(s.toLowerCase()))
  )
}