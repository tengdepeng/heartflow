// ============================================================
// 业脉 · 自动职业转型推荐引擎（P16-7）
// 基于技能图谱、人脉网络和里程碑的智能职业路径推荐
// ============================================================

import type { Contact, CareerConnection, CareerPosition } from './types'
import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone } from './skill-map'
import type { InfluenceScore } from './skill-path'
import { PROFICIENCY_META } from './skill-map'

// ---- 转型推荐类型 ----

/** 职业角色画像 */
export interface CareerRoleProfile {
  /** 角色名称 */
  role: string
  /** 行业 */
  industry: string
  /** 角色描述 */
  description: string
  /** 核心技能要求 */
  requiredSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[]
  /** 推荐技能 */
  recommendedSkills: { name: string; category: SkillCategory; level: ProficiencyLevel }[]
  /** 典型职业路径 */
  typicalPaths: string[]
  /** 平均薪资范围 */
  salaryRange?: string
  /** 市场需求评分 0-100 */
  marketDemand: number
  /** 增长潜力 */
  growthPotential: 'high' | 'medium' | 'low'
}

/** 转型推荐项 */
export interface TransitionRecommendation {
  /** 目标角色 */
  targetRole: CareerRoleProfile
  /** 综合匹配度 0-100 */
  overallMatch: number
  /** 技能匹配度 0-100 */
  skillMatch: number
  /** 网络支持度 0-100 */
  networkSupport: number
  /** 里程碑对齐度 0-100 */
  milestoneAlignment: number
  /** 市场匹配度 0-100 */
  marketFit: number
  /** 技能缺口 */
  skillGaps: SkillGapDetail[]
  /** 推荐策略 */
  strategy: 'direct' | 'stepwise' | 'bridge' | 'explore'
  /** 估计转型时间（月） */
  estimatedMonths: number
  /** 难度 */
  difficulty: 1 | 2 | 3 | 4 | 5
  /** 推荐理由 */
  reasons: string[]
  /** 风险提示 */
  risks: string[]
  /** 优先级排名 */
  rank: number
}

/** 技能缺口详情 */
export interface SkillGapDetail {
  skillName: string
  category: SkillCategory
  currentLevel: number
  requiredLevel: number
  gapSize: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedLearningHours: number
}

/** 转型推荐结果 */
export interface TransitionRecommendResult {
  /** 当前角色 */
  currentRole: string
  /** 当前技能 */
  currentSkills: SkillNode[]
  /** 推荐列表 */
  recommendations: TransitionRecommendation[]
  /** 分析时间 */
  analyzedAt: string
  /** 总体建议 */
  summary: string
}

// ---- 职业角色分类学 ----

/** 内置职业角色库 */
const CAREER_ROLE_LIBRARY: CareerRoleProfile[] = [
  // 技术方向
  {
    role: '高级前端工程师',
    industry: '互联网/科技',
    description: '负责复杂前端架构设计、性能优化和团队技术指导',
    requiredSkills: [
      { name: 'TypeScript', category: 'technical', level: 'advanced' },
      { name: 'React/Vue', category: 'technical', level: 'expert' },
      { name: '前端架构', category: 'technical', level: 'advanced' },
    ],
    recommendedSkills: [
      { name: 'Node.js', category: 'technical', level: 'intermediate' },
      { name: 'Webpack/Vite', category: 'technical', level: 'advanced' },
      { name: '性能优化', category: 'technical', level: 'advanced' },
      { name: '团队管理', category: 'leadership', level: 'intermediate' },
    ],
    typicalPaths: ['前端工程师', '全栈工程师', '前端架构师'],
    salaryRange: '30K-60K',
    marketDemand: 85,
    growthPotential: 'high',
  },
  {
    role: '全栈工程师',
    industry: '互联网/科技',
    description: '同时精通前端和后端开发，能够独立完成完整产品',
    requiredSkills: [
      { name: '前端框架', category: 'technical', level: 'advanced' },
      { name: '后端开发', category: 'technical', level: 'intermediate' },
      { name: '数据库', category: 'technical', level: 'intermediate' },
    ],
    recommendedSkills: [
      { name: 'DevOps', category: 'technical', level: 'intermediate' },
      { name: '云服务', category: 'technical', level: 'intermediate' },
      { name: '系统设计', category: 'technical', level: 'advanced' },
      { name: '产品思维', category: 'domain', level: 'intermediate' },
    ],
    typicalPaths: ['前端工程师', '后端工程师', '技术负责人'],
    salaryRange: '35K-70K',
    marketDemand: 80,
    growthPotential: 'high',
  },
  {
    role: '技术负责人/Tech Lead',
    industry: '互联网/科技',
    description: '负责技术团队管理、技术决策和架构设计',
    requiredSkills: [
      { name: '系统架构', category: 'technical', level: 'expert' },
      { name: '团队管理', category: 'leadership', level: 'advanced' },
      { name: '项目管理', category: 'leadership', level: 'intermediate' },
    ],
    recommendedSkills: [
      { name: '跨部门协作', category: 'soft', level: 'advanced' },
      { name: '技术战略', category: 'domain', level: 'advanced' },
      { name: '导师指导', category: 'leadership', level: 'expert' },
      { name: '预算管理', category: 'leadership', level: 'intermediate' },
    ],
    typicalPaths: ['高级工程师', '架构师', '技术总监'],
    salaryRange: '50K-100K',
    marketDemand: 75,
    growthPotential: 'high',
  },
  {
    role: 'AI/机器学习工程师',
    industry: '人工智能',
    description: '开发和部署机器学习模型，推动AI产品落地',
    requiredSkills: [
      { name: 'Python', category: 'technical', level: 'advanced' },
      { name: '机器学习', category: 'technical', level: 'advanced' },
      { name: '深度学习', category: 'technical', level: 'intermediate' },
    ],
    recommendedSkills: [
      { name: 'TensorFlow/PyTorch', category: 'technical', level: 'advanced' },
      { name: '数据处理', category: 'technical', level: 'advanced' },
      { name: 'MLOps', category: 'technical', level: 'intermediate' },
      { name: '数学/统计', category: 'domain', level: 'advanced' },
    ],
    typicalPaths: ['软件工程师', '数据科学家', 'AI研究员'],
    salaryRange: '40K-90K',
    marketDemand: 90,
    growthPotential: 'high',
  },
  // 产品方向
  {
    role: '产品经理',
    industry: '互联网/科技',
    description: '负责产品规划、需求分析和跨团队协调',
    requiredSkills: [
      { name: '需求分析', category: 'domain', level: 'advanced' },
      { name: '用户研究', category: 'domain', level: 'intermediate' },
      { name: '数据分析', category: 'technical', level: 'intermediate' },
    ],
    recommendedSkills: [
      { name: '沟通能力', category: 'soft', level: 'expert' },
      { name: '项目管理', category: 'leadership', level: 'intermediate' },
      { name: '商业分析', category: 'domain', level: 'advanced' },
      { name: '设计思维', category: 'creative', level: 'intermediate' },
    ],
    typicalPaths: ['技术背景转型', '业务分析师', '项目经理'],
    salaryRange: '25K-60K',
    marketDemand: 80,
    growthPotential: 'high',
  },
  {
    role: '技术产品经理',
    industry: '互联网/科技',
    description: '结合技术背景和产品思维，负责技术型产品的规划和落地',
    requiredSkills: [
      { name: '技术理解', category: 'technical', level: 'intermediate' },
      { name: '产品规划', category: 'domain', level: 'advanced' },
      { name: '需求分析', category: 'domain', level: 'advanced' },
    ],
    recommendedSkills: [
      { name: '系统设计', category: 'technical', level: 'intermediate' },
      { name: '数据分析', category: 'technical', level: 'advanced' },
      { name: '沟通能力', category: 'soft', level: 'expert' },
      { name: '商业思维', category: 'domain', level: 'advanced' },
    ],
    typicalPaths: ['软件工程师', '产品经理', '技术负责人'],
    salaryRange: '35K-80K',
    marketDemand: 85,
    growthPotential: 'high',
  },
  // 设计方向
  {
    role: 'UI/UX 设计师',
    industry: '互联网/设计',
    description: '负责产品界面设计和用户体验优化',
    requiredSkills: [
      { name: 'UI设计', category: 'creative', level: 'advanced' },
      { name: '用户体验', category: 'domain', level: 'advanced' },
      { name: '设计工具', category: 'technical', level: 'advanced' },
    ],
    recommendedSkills: [
      { name: '用户研究', category: 'domain', level: 'intermediate' },
      { name: '交互设计', category: 'creative', level: 'expert' },
      { name: '前端基础', category: 'technical', level: 'beginner' },
      { name: '设计系统', category: 'creative', level: 'advanced' },
    ],
    typicalPaths: ['视觉设计师', '交互设计师', '产品设计师'],
    salaryRange: '20K-50K',
    marketDemand: 75,
    growthPotential: 'medium',
  },
  // 管理方向
  {
    role: '工程经理',
    industry: '互联网/科技',
    description: '管理工程团队，负责人员发展、项目交付和流程优化',
    requiredSkills: [
      { name: '团队管理', category: 'leadership', level: 'expert' },
      { name: '项目管理', category: 'leadership', level: 'advanced' },
      { name: '技术背景', category: 'technical', level: 'advanced' },
    ],
    recommendedSkills: [
      { name: '绩效管理', category: 'leadership', level: 'advanced' },
      { name: '招聘面试', category: 'leadership', level: 'intermediate' },
      { name: '沟通能力', category: 'soft', level: 'expert' },
      { name: '战略规划', category: 'leadership', level: 'intermediate' },
    ],
    typicalPaths: ['高级工程师', 'Tech Lead', '技术总监'],
    salaryRange: '50K-120K',
    marketDemand: 70,
    growthPotential: 'high',
  },
  // 数据方向
  {
    role: '数据科学家',
    industry: '互联网/金融',
    description: '通过数据分析和建模驱动业务决策',
    requiredSkills: [
      { name: '统计学', category: 'domain', level: 'advanced' },
      { name: 'Python', category: 'technical', level: 'advanced' },
      { name: '机器学习', category: 'technical', level: 'intermediate' },
    ],
    recommendedSkills: [
      { name: 'SQL', category: 'technical', level: 'expert' },
      { name: '数据可视化', category: 'technical', level: 'advanced' },
      { name: '业务理解', category: 'domain', level: 'advanced' },
      { name: '沟通能力', category: 'soft', level: 'intermediate' },
    ],
    typicalPaths: ['数据分析师', '机器学习工程师', '数据负责人'],
    salaryRange: '35K-80K',
    marketDemand: 85,
    growthPotential: 'high',
  },
  // 创业方向
  {
    role: '独立开发者/创业者',
    industry: '互联网/创业',
    description: '独立开发产品，运营个人业务或创业',
    requiredSkills: [
      { name: '全栈开发', category: 'technical', level: 'advanced' },
      { name: '产品思维', category: 'domain', level: 'intermediate' },
      { name: '自我管理', category: 'soft', level: 'advanced' },
    ],
    recommendedSkills: [
      { name: '市场营销', category: 'domain', level: 'intermediate' },
      { name: '财务管理', category: 'domain', level: 'beginner' },
      { name: '商业分析', category: 'domain', level: 'intermediate' },
      { name: '人际网络', category: 'soft', level: 'advanced' },
    ],
    typicalPaths: ['软件工程师', '自由职业者', '创业者'],
    salaryRange: '不固定',
    marketDemand: 60,
    growthPotential: 'high',
  },
]

// ---- 转型推荐引擎 ----

export function useTransitionRecommender() {
  /**
   * 自动推荐职业转型路径
   * 基于当前技能、人脉网络和里程碑综合评分
   */
  function recommend(
    currentRole: string,
    currentSkills: SkillNode[],
    contacts: Contact[],
    connections: CareerConnection[],
    milestones: CareerMilestone[],
    positions: CareerPosition[],
    influenceScores?: InfluenceScore[],
    topN: number = 5,
  ): TransitionRecommendResult {
    const recommendations: TransitionRecommendation[] = []

    for (const targetRole of CAREER_ROLE_LIBRARY) {
      // 跳过相同角色
      if (targetRole.role === currentRole) continue

      // 1. 计算技能匹配度
      const { skillMatch, gaps } = computeSkillMatch(currentSkills, targetRole)

      // 2. 计算网络支持度
      const networkSupport = computeNetworkSupport(targetRole, contacts, connections)

      // 3. 计算里程碑对齐度
      const milestoneAlignment = computeMilestoneAlignment(targetRole, milestones)

      // 4. 计算市场匹配度
      const marketFit = computeMarketFit(targetRole, positions, influenceScores)

      // 5. 综合评分
      const overallMatch = Math.round(
        skillMatch * 0.40 +
        networkSupport * 0.20 +
        milestoneAlignment * 0.20 +
        marketFit * 0.20
      )

      // 6. 确定转型策略
      const strategy = determineStrategy(gaps, networkSupport, milestoneAlignment)

      // 7. 估计转型时间
      const estimatedMonths = estimateTransitionTime(gaps, strategy)

      // 8. 难度评级
      const difficulty = rateDifficulty(gaps, estimatedMonths, strategy)

      // 9. 生成理由和风险
      const { reasons, risks } = generateReasonsAndRisks(
        skillMatch, networkSupport, milestoneAlignment, marketFit, gaps, targetRole
      )

      if (overallMatch >= 30) {
        recommendations.push({
          targetRole,
          overallMatch,
          skillMatch,
          networkSupport,
          milestoneAlignment,
          marketFit,
          skillGaps: gaps,
          strategy,
          estimatedMonths,
          difficulty,
          reasons,
          risks,
          rank: 0,
        })
      }
    }

    // 排序并分配排名
    recommendations.sort((a, b) => b.overallMatch - a.overallMatch)
    recommendations.forEach((r, i) => { r.rank = i + 1 })

    const topRecommendations = recommendations.slice(0, topN)
    const summary = generateSummary(currentRole, topRecommendations)

    return {
      currentRole,
      currentSkills,
      recommendations: topRecommendations,
      analyzedAt: new Date().toISOString(),
      summary,
    }
  }

  /**
   * 为特定目标角色生成详细推荐
   */
  function recommendForRole(
    currentSkills: SkillNode[],
    contacts: Contact[],
    connections: CareerConnection[],
    milestones: CareerMilestone[],
    positions: CareerPosition[],
    targetRoleName: string,
    influenceScores?: InfluenceScore[],
  ): TransitionRecommendation | null {
    const targetRole = CAREER_ROLE_LIBRARY.find(r => r.role === targetRoleName)
    if (!targetRole) return null

    const { skillMatch, gaps } = computeSkillMatch(currentSkills, targetRole)
    const networkSupport = computeNetworkSupport(targetRole, contacts, connections)
    const milestoneAlignment = computeMilestoneAlignment(targetRole, milestones)
    const marketFit = computeMarketFit(targetRole, positions, influenceScores)

    const overallMatch = Math.round(
      skillMatch * 0.40 + networkSupport * 0.20 + milestoneAlignment * 0.20 + marketFit * 0.20
    )

    const strategy = determineStrategy(gaps, networkSupport, milestoneAlignment)
    const estimatedMonths = estimateTransitionTime(gaps, strategy)
    const difficulty = rateDifficulty(gaps, estimatedMonths, strategy)
    const { reasons, risks } = generateReasonsAndRisks(
      skillMatch, networkSupport, milestoneAlignment, marketFit, gaps, targetRole
    )

    return {
      targetRole,
      overallMatch,
      skillMatch,
      networkSupport,
      milestoneAlignment,
      marketFit,
      skillGaps: gaps,
      strategy,
      estimatedMonths,
      difficulty,
      reasons,
      risks,
      rank: 1,
    }
  }

  /**
   * 获取职业角色库
   */
  function getRoleLibrary(): CareerRoleProfile[] {
    return CAREER_ROLE_LIBRARY
  }

  /**
   * 按行业筛选角色
   */
  function getRolesByIndustry(industry: string): CareerRoleProfile[] {
    return CAREER_ROLE_LIBRARY.filter(r => r.industry === industry)
  }

  return {
    recommend,
    recommendForRole,
    getRoleLibrary,
    getRolesByIndustry,
  }
}

// ---- 内部计算函数 ----

/** 计算技能匹配度 */
function computeSkillMatch(
  currentSkills: SkillNode[],
  targetRole: CareerRoleProfile,
): { skillMatch: number; gaps: SkillGapDetail[] } {
  const allRequired = [...targetRole.requiredSkills, ...targetRole.recommendedSkills]
  const gaps: SkillGapDetail[] = []
  let totalMatchScore = 0
  let totalWeight = 0

  for (const req of allRequired) {
    const isRequired = targetRole.requiredSkills.some(r => r.name === req.name)
    const weight = isRequired ? 1.5 : 1.0 // 必需技能权重更高
    totalWeight += weight

    const existing = currentSkills.find(
      s => s.name.toLowerCase() === req.name.toLowerCase() ||
          s.name.toLowerCase().includes(req.name.toLowerCase()) ||
          req.name.toLowerCase().includes(s.name.toLowerCase())
    )

    const currentLevel = existing
      ? proficiencyToScore(existing.proficiency)
      : 0
    const requiredLevel = proficiencyToScore(req.level)

    if (existing) {
      const matchRatio = Math.min(currentLevel / requiredLevel, 1)
      totalMatchScore += matchRatio * weight
    }

    if (currentLevel < requiredLevel) {
      gaps.push({
        skillName: req.name,
        category: req.category,
        currentLevel,
        requiredLevel,
        gapSize: requiredLevel - currentLevel,
        priority: classifyGapPriority(requiredLevel - currentLevel, isRequired),
        estimatedLearningHours: estimateLearningHours(requiredLevel - currentLevel, req.category),
      })
    }
  }

  // 额外加分：如果当前技能有超出目标要求的技能
  const extraSkillBonus = currentSkills.filter(s => {
    const isInTarget = allRequired.some(
      r => r.name.toLowerCase() === s.name.toLowerCase()
    )
    return !isInTarget && s.proficiencyScore >= 50
  }).length * 2

  const skillMatch = totalWeight > 0
    ? Math.min(Math.round((totalMatchScore / totalWeight) * 100) + extraSkillBonus, 100)
    : 50

  // 排序：必要技能缺口优先
  gaps.sort((a, b) => {
    const aIsRequired = targetRole.requiredSkills.some(r => r.name === a.skillName)
    const bIsRequired = targetRole.requiredSkills.some(r => r.name === b.skillName)
    if (aIsRequired !== bIsRequired) return aIsRequired ? -1 : 1
    return b.gapSize - a.gapSize
  })

  return { skillMatch, gaps }
}

/** 计算网络支持度 */
function computeNetworkSupport(
  targetRole: CareerRoleProfile,
  contacts: Contact[],
  _connections: CareerConnection[],
): number {
  if (contacts.length === 0) return 30

  // 检查是否有相关行业/角色的联系人
  const relevantContacts = contacts.filter(c => {
    const roleLower = c.role.toLowerCase()
    const targetIndustry = targetRole.industry.toLowerCase()
    const targetRoleLower = targetRole.role.toLowerCase()

    return targetRole.typicalPaths.some(path =>
      roleLower.includes(path.toLowerCase()) ||
      path.toLowerCase().includes(roleLower)
    ) || roleLower.includes(targetIndustry) ||
       roleLower.includes(targetRoleLower.split('/')[0])
  })

  const relevantRatio = relevantContacts.length / Math.max(contacts.length, 1)
  const highAffinityCount = relevantContacts.filter(c => c.affinity >= 7).length
  const coreCount = relevantContacts.filter(c => c.tier === 'core' || c.tier === 'active').length

  // 网络支持度 = 相关联系人占比 + 高质量联系人 + 核心圈层
  const score = Math.min(
    relevantRatio * 40 +
    (highAffinityCount / Math.max(contacts.length, 1)) * 30 +
    (coreCount / Math.max(contacts.length, 1)) * 30,
    100
  )

  return Math.round(score)
}

/** 计算里程碑对齐度 */
function computeMilestoneAlignment(
  targetRole: CareerRoleProfile,
  milestones: CareerMilestone[],
): number {
  if (milestones.length === 0) return 40

  const targetRoleLower = targetRole.role.toLowerCase()
  const targetIndustry = targetRole.industry.toLowerCase()

  // 检查里程碑是否与目标角色相关
  const relevantMilestones = milestones.filter(m => {
    const title = m.title.toLowerCase()
    const desc = m.description.toLowerCase()

    // 技术相关里程碑
    const techKeywords = ['技术', '开发', '编程', '架构', '系统', '代码', 'engineer', 'tech']
    const productKeywords = ['产品', '用户', '需求', '设计', 'product', 'ux', 'ui']
    const managementKeywords = ['管理', '团队', '领导', '项目', 'manager', 'lead', 'director']
    const dataKeywords = ['数据', '分析', '统计', '机器学习', 'data', 'analytics', 'ml']

    let relevant = false
    if (targetRoleLower.includes('技术') || targetRoleLower.includes('工程') || targetRoleLower.includes('开发')) {
      relevant = techKeywords.some(k => title.includes(k) || desc.includes(k))
    } else if (targetRoleLower.includes('产品')) {
      relevant = productKeywords.some(k => title.includes(k) || desc.includes(k))
    } else if (targetRoleLower.includes('管理') || targetRoleLower.includes('经理')) {
      relevant = managementKeywords.some(k => title.includes(k) || desc.includes(k))
    } else if (targetRoleLower.includes('数据')) {
      relevant = dataKeywords.some(k => title.includes(k) || desc.includes(k))
    } else {
      relevant = title.includes(targetIndustry) || desc.includes(targetIndustry)
    }

    return relevant
  })

  const relevantRatio = relevantMilestones.length / Math.max(milestones.length, 1)
  const highImpactMilestones = relevantMilestones.filter(m => m.impact >= 7).length
  const recentMilestones = relevantMilestones.filter(m => {
    const daysSince = (Date.now() - new Date(m.date).getTime()) / 86400000
    return daysSince <= 365 // 一年内
  }).length

  const score = Math.min(
    relevantRatio * 40 +
    (highImpactMilestones / Math.max(milestones.length, 1)) * 30 +
    (recentMilestones / Math.max(milestones.length, 1)) * 30,
    100
  )

  return Math.round(score)
}

/** 计算市场匹配度 */
function computeMarketFit(
  targetRole: CareerRoleProfile,
  positions: CareerPosition[],
  influenceScores?: InfluenceScore[],
): number {
  const baseDemand = targetRole.marketDemand
  const growthBonus = targetRole.growthPotential === 'high' ? 10 : targetRole.growthPotential === 'medium' ? 5 : 0

  // 历史职位相关性
  const positionBonus = positions.filter(p => {
    const title = p.title.toLowerCase()
    return targetRole.typicalPaths.some(path =>
      title.includes(path.toLowerCase())
    )
  }).length * 3

  // 影响力加分
  let influenceBonus = 0
  if (influenceScores && influenceScores.length > 0) {
    const avgInfluence = influenceScores.reduce((s, i) => s + i.overallInfluence, 0) / influenceScores.length
    influenceBonus = Math.min(avgInfluence / 10, 10)
  }

  return Math.min(Math.round(baseDemand * 0.7 + growthBonus + positionBonus + influenceBonus), 100)
}

/** 确定转型策略 */
function determineStrategy(
  gaps: SkillGapDetail[],
  networkSupport: number,
  milestoneAlignment: number,
): 'direct' | 'stepwise' | 'bridge' | 'explore' {
  const criticalGaps = gaps.filter(g => g.priority === 'critical')
  const totalGapSize = gaps.reduce((s, g) => s + g.gapSize, 0)

  if (criticalGaps.length === 0 && totalGapSize <= 30) {
    return 'direct' // 直接转型
  }
  if (criticalGaps.length <= 2 && networkSupport >= 50) {
    return 'stepwise' // 渐进转型
  }
  if (networkSupport >= 40 || milestoneAlignment >= 60) {
    return 'bridge' // 桥接转型
  }
  return 'explore' // 探索转型
}

/** 估计转型时间 */
function estimateTransitionTime(gaps: SkillGapDetail[], strategy: string): number {
  const totalHours = gaps.reduce((s, g) => s + g.estimatedLearningHours, 0)

  // 假设每天学习 2 小时，每月 22 天
  const baseMonths = Math.ceil(totalHours / (2 * 22))

  // 策略调整
  switch (strategy) {
    case 'direct': return Math.max(baseMonths, 1)
    case 'stepwise': return Math.max(baseMonths + 2, 3)
    case 'bridge': return Math.max(baseMonths + 4, 6)
    case 'explore': return Math.max(baseMonths + 6, 9)
    default: return baseMonths
  }
}

/** 难度评级 */
function rateDifficulty(
  gaps: SkillGapDetail[],
  estimatedMonths: number,
  strategy: string,
): 1 | 2 | 3 | 4 | 5 {
  const criticalCount = gaps.filter(g => g.priority === 'critical').length
  let score = 0

  score += criticalCount * 1.5
  score += Math.min(estimatedMonths / 6, 2)
  score += strategy === 'explore' ? 1 : strategy === 'bridge' ? 0.5 : 0

  if (score <= 1) return 1
  if (score <= 2) return 2
  if (score <= 3) return 3
  if (score <= 4) return 4
  return 5
}

/** 生成推荐理由和风险 */
function generateReasonsAndRisks(
  skillMatch: number,
  networkSupport: number,
  milestoneAlignment: number,
  marketFit: number,
  gaps: SkillGapDetail[],
  targetRole: CareerRoleProfile,
): { reasons: string[]; risks: string[] } {
  const reasons: string[] = []
  const risks: string[] = []

  if (skillMatch >= 70) {
    reasons.push(`技能匹配度高达 ${skillMatch}%，核心能力已就绪`)
  } else if (skillMatch >= 50) {
    reasons.push(`技能基础良好（${skillMatch}%），仅需补充 ${gaps.length} 项技能`)
  }

  if (networkSupport >= 50) {
    reasons.push(`人脉网络中有相关领域联系人，可提供转型支持`)
  }

  if (milestoneAlignment >= 60) {
    reasons.push(`过往里程碑与目标角色高度相关，经验可迁移`)
  }

  if (marketFit >= 70) {
    reasons.push(`目标角色市场需求旺盛（${targetRole.marketDemand}分），前景良好`)
  }

  if (targetRole.growthPotential === 'high') {
    reasons.push(`该角色增长潜力高，是长期发展的优质方向`)
  }

  if (reasons.length === 0) {
    reasons.push(`该角色值得探索，可作为中长期发展目标`)
  }

  // 风险
  const criticalGaps = gaps.filter(g => g.priority === 'critical')
  if (criticalGaps.length > 0) {
    risks.push(`存在 ${criticalGaps.length} 项关键技能缺口需要优先填补`)
  }

  if (skillMatch < 40) {
    risks.push('当前技能与目标角色差距较大，转型周期较长')
  }

  if (networkSupport < 30) {
    risks.push('人脉网络中相关领域支持较少（< 30）；是否主动拓展由你决定')
  }

  if (gaps.length >= 5) {
    risks.push(`需要学习 ${gaps.length} 项新技能，学习压力较大`)
  }

  return { reasons, risks }
}

/** 生成总结 */
function generateSummary(
  currentRole: string,
  recommendations: TransitionRecommendation[],
): string {
  if (recommendations.length === 0) {
    return `基于当前角色 "${currentRole}" 的技能和人脉分析，暂未发现匹配度较高的转型方向。是否先积累核心技能与行业经验，由你判断。`
  }

  const top = recommendations[0]
  return `基于当前角色 "${currentRole}" 的综合分析，与你的技能/人脉重合度最高的是 "${top.targetRole.role}"（匹配度 ${top.overallMatch}%）；该方向技能匹配度 ${top.skillMatch}%，按当前节奏约需 ${top.estimatedMonths} 个月。共发现 ${recommendations.length} 个可行方向，按匹配度从高到低排列，最终选择由你决定。`
}

// ---- 辅助函数 ----

function proficiencyToScore(level: ProficiencyLevel): number {
  return PROFICIENCY_META[level]?.score || 0
}

function classifyGapPriority(
  gapSize: number,
  isRequired: boolean,
): 'critical' | 'high' | 'medium' | 'low' {
  if (isRequired && gapSize >= 50) return 'critical'
  if (gapSize >= 50) return 'high'
  if (gapSize >= 25) return 'medium'
  return 'low'
}

function estimateLearningHours(gapSize: number, _category: SkillCategory): number {
  // 基础估计：每 10 分差距约需 20 小时
  return Math.max(Math.ceil(gapSize / 10) * 20, 10)
}