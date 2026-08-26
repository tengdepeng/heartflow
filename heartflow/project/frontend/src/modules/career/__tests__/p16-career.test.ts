// ============================================================
// 业脉 · P16-7 · 单元测试
// 自动职业转型推荐引擎 + 技能缺口补充建议引擎
// ============================================================

import { describe, expect, it } from 'vitest'
import { useTransitionRecommender } from '../transition-recommend'
import { useSkillGapAdvisor } from '../skill-gap-advisor'
import { useCareerSimulator } from '../career-simulator'
import { useSkillGapVisualization } from '../skill-gap-visualization'
import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone, MilestoneType } from '../skill-map'
import type { Contact, CareerConnection, CareerPosition } from '../types'
import type { PrioritizedGap } from '../skill-gap-advisor'

// ---- 测试辅助函数 ----

function createTestSkill(
  id: string,
  name: string,
  category: SkillCategory,
  proficiency: ProficiencyLevel,
  isCore: boolean = false,
  yearsOfExperience: number = 3,
): SkillNode {
  const proficiencyScores: Record<ProficiencyLevel, number> = {
    novice: 15, beginner: 30, intermediate: 50, advanced: 70, expert: 85, master: 95,
  }

  return {
    id,
    name,
    category,
    proficiency,
    proficiencyScore: proficiencyScores[proficiency],
    yearsOfExperience,
    relatedPositions: [],
    prerequisites: [],
    complements: [],
    isCore,
  }
}

function createTestContact(
  id: string,
  name: string,
  role: string,
  nodeType: 'mentor' | 'colleague' | 'superior' | 'peer' = 'colleague',
  tier: 'core' | 'active' | 'extended' | 'peripheral' = 'active',
  affinity: number = 5,
): Contact {
  return {
    id,
    name,
    role,
    tier,
    nodeType,
    affinity,
    tags: [],
    firstContactAt: '2025-01-01T00:00:00.000Z',
    lastContactAt: '2026-07-01T00:00:00.000Z',
    contactCount: 10,
  }
}

function createTestConnection(
  id: string,
  fromId: string,
  toId: string,
  type: 'collaboration' | 'mentorship' = 'collaboration',
  strength: number = 5,
): CareerConnection {
  return {
    id,
    fromId,
    toId,
    type,
    strength,
    createdAt: '2025-01-01T00:00:00.000Z',
  }
}

function createTestMilestone(
  id: string,
  title: string,
  description: string,
  type: MilestoneType = 'project-completion',
  impact: number = 5,
  date: string = '2026-01-01T00:00:00.000Z',
  relatedSkills: string[] = [],
): CareerMilestone {
  return {
    id,
    type,
    title,
    description,
    date,
    impact,
    relatedSkills,
    relatedContacts: [],
  }
}

function createTestPosition(
  id: string,
  title: string,
  organization: string,
  startDate: string = '2024-01-01',
): CareerPosition {
  return {
    id,
    title,
    organization,
    startDate,
    description: `${title} at ${organization}`,
    skills: [],
    achievements: [],
  }
}

// ============================================================
// 1. 自动职业转型推荐引擎
// ============================================================

describe('P16-7 自动职业转型推荐引擎', () => {
  const recommender = useTransitionRecommender()

  describe('getRoleLibrary - 角色库', () => {
    it('应返回完整的职业角色库', () => {
      const library = recommender.getRoleLibrary()
      expect(library.length).toBeGreaterThanOrEqual(8)
      expect(library.some(r => r.role === '高级前端工程师')).toBe(true)
      expect(library.some(r => r.role === '全栈工程师')).toBe(true)
      expect(library.some(r => r.role === '技术负责人/Tech Lead')).toBe(true)
    })

    it('每个角色应有必需的元数据', () => {
      const library = recommender.getRoleLibrary()
      for (const role of library) {
        expect(role.role.length).toBeGreaterThan(0)
        expect(role.industry.length).toBeGreaterThan(0)
        expect(role.description.length).toBeGreaterThan(0)
        expect(role.requiredSkills.length).toBeGreaterThan(0)
        expect(role.marketDemand).toBeGreaterThanOrEqual(0)
        expect(role.marketDemand).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('getRolesByIndustry - 按行业筛选', () => {
    it('应按行业筛选角色', () => {
      const techRoles = recommender.getRolesByIndustry('互联网/科技')
      expect(techRoles.length).toBeGreaterThan(0)
      expect(techRoles.every(r => r.industry === '互联网/科技')).toBe(true)
    })

    it('不存在的行业应返回空数组', () => {
      const roles = recommender.getRolesByIndustry('不存在的行业')
      expect(roles.length).toBe(0)
    })
  })

  describe('recommend - 转型推荐', () => {
    it('应为前端工程师推荐合适的转型方向', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
        createTestSkill('s2', 'React/Vue', 'technical', 'expert', true),
        createTestSkill('s3', '前端架构', 'technical', 'advanced', true),
        createTestSkill('s4', 'Node.js', 'technical', 'intermediate'),
        createTestSkill('s5', '性能优化', 'technical', 'advanced'),
      ]

      const contacts = [
        createTestContact('c1', '张工', '高级前端工程师', 'colleague', 'core', 8),
        createTestContact('c2', '李工', '全栈工程师', 'colleague', 'active', 7),
      ]

      const connections = [
        createTestConnection('conn1', 'c1', 'c2'),
      ]

      const milestones = [
        createTestMilestone('m1', '完成前端架构升级', '主导了公司前端架构从Vue2到Vue3的升级', 'project-completion', 8, '2026-03-01', ['TypeScript', '前端架构']),
      ]

      const positions = [
        createTestPosition('p1', '前端工程师', 'ABC公司'),
        createTestPosition('p2', '高级前端工程师', 'XYZ公司'),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        contacts,
        connections,
        milestones,
        positions,
      )

      expect(result.currentRole).toBe('前端工程师')
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.recommendations.length).toBeLessThanOrEqual(5)
      expect(result.summary.length).toBeGreaterThan(0)
      expect(result.analyzedAt).toBeDefined()

      // 排名第一的推荐应是最高匹配度
      const top = result.recommendations[0]
      expect(top.overallMatch).toBeGreaterThanOrEqual(30)
      expect(top.rank).toBe(1)
      expect(top.reasons.length).toBeGreaterThan(0)
    })

    it('推荐应包含技能匹配度评分', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
        createTestSkill('s2', 'React/Vue', 'technical', 'advanced', true),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      for (const rec of result.recommendations) {
        expect(rec.skillMatch).toBeGreaterThanOrEqual(0)
        expect(rec.skillMatch).toBeLessThanOrEqual(100)
      }
    })

    it('推荐应包含网络支持度评分', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      for (const rec of result.recommendations) {
        expect(rec.networkSupport).toBeGreaterThanOrEqual(0)
        expect(rec.networkSupport).toBeLessThanOrEqual(100)
      }
    })

    it('推荐应包含转型策略', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      for (const rec of result.recommendations) {
        expect(['direct', 'stepwise', 'bridge', 'explore']).toContain(rec.strategy)
      }
    })

    it('推荐应包含难度评级', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      for (const rec of result.recommendations) {
        expect(rec.difficulty).toBeGreaterThanOrEqual(1)
        expect(rec.difficulty).toBeLessThanOrEqual(5)
      }
    })

    it('高技能匹配度应有直接转型策略', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
        createTestSkill('s2', 'React/Vue', 'technical', 'expert', true),
        createTestSkill('s3', '前端架构', 'technical', 'expert', true),
        createTestSkill('s4', 'Node.js', 'technical', 'advanced'),
        createTestSkill('s5', 'Webpack/Vite', 'technical', 'advanced'),
        createTestSkill('s6', '性能优化', 'technical', 'expert'),
        createTestSkill('s7', '团队管理', 'leadership', 'intermediate'),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      // 高级前端工程师应匹配度很高
      const seniorFE = result.recommendations.find(r => r.targetRole.role === '高级前端工程师')
      if (seniorFE) {
        expect(seniorFE.skillMatch).toBeGreaterThanOrEqual(60)
      }
    })

    it('有相关人脉网络时网络支持度应更高', () => {
      const currentSkills = [
        createTestSkill('s1', 'Python', 'technical', 'advanced', true),
        createTestSkill('s2', '机器学习', 'technical', 'intermediate', true),
      ]

      const techContacts = [
        createTestContact('c1', 'AI专家', 'AI/机器学习工程师', 'mentor', 'core', 9),
        createTestContact('c2', '数据科学家', '数据科学家', 'colleague', 'active', 8),
      ]

      const connections = [
        createTestConnection('conn1', 'c1', 'c2'),
      ]

      const resultWithNetwork = recommender.recommend(
        '软件工程师',
        currentSkills,
        techContacts,
        connections,
        [],
        [],
      )

      const resultWithoutNetwork = recommender.recommend(
        '软件工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      const aiRoleWith = resultWithNetwork.recommendations.find(r => r.targetRole.role === 'AI/机器学习工程师')
      const aiRoleWithout = resultWithoutNetwork.recommendations.find(r => r.targetRole.role === 'AI/机器学习工程师')

      if (aiRoleWith && aiRoleWithout) {
        expect(aiRoleWith.networkSupport).toBeGreaterThanOrEqual(aiRoleWithout.networkSupport)
      }
    })

    it('有相关里程碑时应提升对齐度', () => {
      const currentSkills = [
        createTestSkill('s1', 'Python', 'technical', 'advanced', true),
        createTestSkill('s2', '机器学习', 'technical', 'advanced', true),
      ]

      const milestones = [
        createTestMilestone('m1', '完成机器学习项目', '开发了推荐系统', 'project-completion', 8, '2026-06-01', ['Python', '机器学习']),
        createTestMilestone('m2', '获得数据科学认证', '完成Coursera数据科学专项', 'certification', 7, '2026-01-01', ['数据科学']),
      ]

      const resultWithMilestones = recommender.recommend(
        '软件工程师',
        currentSkills,
        [],
        [],
        milestones,
        [],
      )

      const resultWithoutMilestones = recommender.recommend(
        '软件工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      const aiRoleWith = resultWithMilestones.recommendations.find(r => r.targetRole.role === 'AI/机器学习工程师')
      const aiRoleWithout = resultWithoutMilestones.recommendations.find(r => r.targetRole.role === 'AI/机器学习工程师')

      if (aiRoleWith && aiRoleWithout) {
        expect(aiRoleWith.milestoneAlignment).toBeGreaterThanOrEqual(aiRoleWithout.milestoneAlignment)
      }
    })

    it('推荐应包含风险提示', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'beginner', true),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      // 技能差距大时应有风险提示
      const lowMatchRecs = result.recommendations.filter(r => r.skillMatch < 40)
      for (const rec of lowMatchRecs) {
        expect(rec.risks.length).toBeGreaterThan(0)
      }
    })

    it('topN 参数应限制返回数量', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
      ]

      const result = recommender.recommend(
        '前端工程师',
        currentSkills,
        [],
        [],
        [],
        [],
        [],
        3,
      )

      expect(result.recommendations.length).toBeLessThanOrEqual(3)
    })

    it('推荐应包含技能缺口详情', () => {
      const currentSkills: SkillNode[] = []

      const result = recommender.recommend(
        '无技能者',
        currentSkills,
        [],
        [],
        [],
        [],
      )

      for (const rec of result.recommendations) {
        expect(rec.skillGaps).toBeDefined()
        if (rec.skillGaps.length > 0) {
          const gap = rec.skillGaps[0]
          expect(gap.skillName.length).toBeGreaterThan(0)
          expect(gap.priority).toBeDefined()
          expect(gap.estimatedLearningHours).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('recommendForRole - 特定角色推荐', () => {
    it('应为存在的角色返回推荐', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
        createTestSkill('s2', 'React/Vue', 'technical', 'expert', true),
      ]

      const rec = recommender.recommendForRole(
        currentSkills,
        [],
        [],
        [],
        [],
        '高级前端工程师',
      )

      expect(rec).not.toBeNull()
      expect(rec!.targetRole.role).toBe('高级前端工程师')
      expect(rec!.overallMatch).toBeGreaterThanOrEqual(0)
    })

    it('不存在的角色应返回 null', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'expert', true),
      ]

      const rec = recommender.recommendForRole(
        currentSkills,
        [],
        [],
        [],
        [],
        '不存在的角色',
      )

      expect(rec).toBeNull()
    })
  })
})

// ============================================================
// 2. 技能缺口补充建议引擎
// ============================================================

describe('P16-7 技能缺口补充建议引擎', () => {
  const advisor = useSkillGapAdvisor()

  describe('analyzeGaps - 技能缺口分析', () => {
    it('应分析技能缺口并生成优先级排序', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'advanced', true),
        createTestSkill('s2', 'React/Vue', 'technical', 'intermediate', true),
      ]

      const targetSkills = [
        { name: 'TypeScript', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
        { name: 'React/Vue', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
        { name: 'Node.js', category: 'technical' as SkillCategory, level: 'intermediate' as ProficiencyLevel },
        { name: '团队管理', category: 'leadership' as SkillCategory, level: 'beginner' as ProficiencyLevel },
      ]

      const milestones: CareerMilestone[] = [
        createTestMilestone('m1', '前端架构升级', '完成架构升级', 'project-completion', 7, '2026-03-01', ['TypeScript', 'React/Vue']),
      ]

      const analysis = advisor.analyzeGaps(currentSkills, targetSkills, milestones, '高级前端工程师')

      expect(analysis.target).toBe('高级前端工程师')
      expect(analysis.currentSkillsSummary.totalSkills).toBe(2)
      expect(analysis.currentSkillsSummary.coreSkills).toBe(2)
      expect(analysis.gaps.length).toBeGreaterThan(0)
      expect(analysis.recommendedPath.name.length).toBeGreaterThan(0)
      expect(analysis.recommendedPath.phases.length).toBeGreaterThan(0)
      expect(analysis.analyzedAt).toBeDefined()
    })

    it('缺口应按优先级排序（urgent > high > medium > low）', () => {
      const currentSkills: SkillNode[] = []

      const targetSkills = [
        { name: '关键技能A', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
        { name: '次要技能B', category: 'soft' as SkillCategory, level: 'beginner' as ProficiencyLevel },
      ]

      const analysis = advisor.analyzeGaps(currentSkills, targetSkills, [], '测试目标')

      const priorities = analysis.gaps.map(g => g.priority)
      const priorityOrder = ['urgent', 'high', 'medium', 'low']

      // 验证优先级顺序
      for (let i = 1; i < priorities.length; i++) {
        const prevIdx = priorityOrder.indexOf(priorities[i - 1])
        const currIdx = priorityOrder.indexOf(priorities[i])
        expect(prevIdx).toBeLessThanOrEqual(currIdx)
      }
    })

    it('应正确计算技能纵览', () => {
      const currentSkills = [
        createTestSkill('s1', '技术A', 'technical', 'expert', true),
        createTestSkill('s2', '技术B', 'technical', 'advanced', true),
        createTestSkill('s3', '软技能A', 'soft', 'intermediate'),
        createTestSkill('s4', '领域A', 'domain', 'beginner'),
        createTestSkill('s5', '领导力A', 'leadership', 'novice'),
        createTestSkill('s6', '创意A', 'creative', 'master'),
      ]

      const analysis = advisor.analyzeGaps(currentSkills, [], [], '测试')

      const summary = analysis.currentSkillsSummary
      expect(summary.totalSkills).toBe(6)
      expect(summary.coreSkills).toBe(2)
      expect(summary.strongestSkills.length).toBe(3)
      expect(summary.weakestSkills.length).toBe(3)
      expect(summary.overallScore).toBeGreaterThan(0)

      // 最强技能应该是 master 级别的创意A
      const strongest = summary.strongestSkills[0]
      expect(strongest.name).toBe('创意A')

      // 最弱技能应该是 novice 级别的领导力A
      const weakest = summary.weakestSkills[0]
      expect(weakest.name).toBe('领导力A')
    })

    it('应生成合理的学习计划', () => {
      const currentSkills: SkillNode[] = []

      const targetSkills = [
        { name: '关键技能', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
        { name: '次要技能', category: 'soft' as SkillCategory, level: 'intermediate' as ProficiencyLevel },
      ]

      const analysis = advisor.analyzeGaps(currentSkills, targetSkills, [], '测试目标')

      const plan = analysis.recommendedPath
      expect(plan.totalEstimatedHours).toBeGreaterThan(0)
      expect(plan.weeklyHours).toBeGreaterThan(0)
      expect(plan.estimatedWeeks).toBeGreaterThan(0)
      expect(plan.checkpoints.length).toBeGreaterThan(0)

      // 每个阶段应有技能列表
      for (const phase of plan.phases) {
        expect(phase.skills.length).toBeGreaterThan(0)
        expect(phase.estimatedHours).toBeGreaterThan(0)
      }
    })

    it('应关联里程碑到技能缺口', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'intermediate', true),
      ]

      const targetSkills = [
        { name: 'TypeScript', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
      ]

      const milestones: CareerMilestone[] = [
        createTestMilestone('m1', '前端架构升级', '完成架构升级', 'project-completion', 7, '2026-03-01', ['TypeScript']),
      ]

      const analysis = advisor.analyzeGaps(currentSkills, targetSkills, milestones, '测试目标')

      expect(analysis.milestoneConnections.length).toBe(1)
      const connection = analysis.milestoneConnections[0]
      expect(connection.milestone.id).toBe('m1')
      expect(connection.readiness).toBeGreaterThanOrEqual(0)
      expect(connection.readiness).toBeLessThanOrEqual(100)
      expect(connection.suggestion.length).toBeGreaterThan(0)
    })
  })

  describe('getSkillAdvice - 技能学习建议', () => {
    it('应为技能缺口生成学习建议', () => {
      const advice = advisor.getSkillAdvice(
        'TypeScript',
        'technical',
        'intermediate',
        'expert',
      )

      expect(advice.skillName).toBe('TypeScript')
      expect(advice.currentLevel).toBe('中级')
      expect(advice.learningMethods.length).toBeGreaterThan(0)
      expect(advice.resources.length).toBeGreaterThan(0)
      expect(advice.timeEstimate.length).toBeGreaterThan(0)
      expect(advice.difficultyNote.length).toBeGreaterThan(0)
      expect(advice.practiceSuggestions.length).toBeGreaterThan(0)
    })

    it('不同分类应有不同的学习方式', () => {
      const techAdvice = advisor.getSkillAdvice('技术技能', 'technical', 'novice', 'expert')
      const softAdvice = advisor.getSkillAdvice('软技能', 'soft', 'novice', 'expert')

      // 技术和软技能的学习方式应该不同
      expect(techAdvice.learningMethods).not.toEqual(softAdvice.learningMethods)
    })

    it('缺口大小应影响难度评估', () => {
      const smallGap = advisor.getSkillAdvice('小缺口', 'technical', 'advanced', 'expert')
      const largeGap = advisor.getSkillAdvice('大缺口', 'technical', 'novice', 'expert')

      expect(smallGap.difficultyNote).not.toEqual(largeGap.difficultyNote)
    })
  })

  describe('analyzeForMultipleTargets - 多目标分析', () => {
    it('应为多个目标生成独立分析', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'advanced', true),
      ]

      const targets = [
        {
          name: '目标A',
          requiredSkills: [
            { name: 'TypeScript', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
            { name: 'React/Vue', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
            { name: 'Node.js', category: 'technical' as SkillCategory, level: 'advanced' as ProficiencyLevel },
          ],
        },
        {
          name: '目标B',
          requiredSkills: [
            { name: 'Python', category: 'technical' as SkillCategory, level: 'advanced' as ProficiencyLevel },
          ],
        },
      ]

      const results = advisor.analyzeForMultipleTargets(currentSkills, targets, [])

      expect(results.length).toBe(2)
      expect(results[0].target).toBe('目标A')
      expect(results[1].target).toBe('目标B')
      expect(results[0].gaps.length).not.toEqual(results[1].gaps.length)
    })
  })

  describe('generateRoadmap - 技能发展路线图', () => {
    it('应为职业目标生成路线图', () => {
      const currentSkills = [
        createTestSkill('s1', 'TypeScript', 'technical', 'advanced', true),
      ]

      const careerGoals = ['成为高级前端工程师', '成为技术负责人']
      const milestones: CareerMilestone[] = [
        createTestMilestone('m1', '成为高级前端工程师', '晋升', 'promotion', 8, '2026-06-01'),
      ]

      const roadmap = advisor.generateRoadmap(currentSkills, careerGoals, milestones)

      expect(roadmap.roadmap.length).toBe(2)
      expect(roadmap.roadmap[0].stage).toBe(1)
      expect(roadmap.roadmap[0].name).toBe('成为高级前端工程师')
      expect(roadmap.roadmap[1].stage).toBe(2)
      expect(roadmap.totalMonths).toBeGreaterThan(0)
      expect(roadmap.currentLevel.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// 3. P20-4 职业模拟器
// ============================================================

describe('P20-4 职业模拟器', () => {
  const simulator = useCareerSimulator()

  const baseSkills = [
    createTestSkill('cs1', 'TypeScript', 'technical', 'expert', true),
    createTestSkill('cs2', 'React/Vue', 'technical', 'advanced', true),
    createTestSkill('cs3', 'Node.js', 'technical', 'intermediate'),
  ]

  const baseContacts = [
    createTestContact('bc1', '张工', '高级工程师', 'colleague', 'core', 8),
    createTestContact('bc2', '李总', '技术总监', 'superior', 'core', 7),
  ]

  const baseConnections = [
    createTestConnection('bconn1', 'bc1', 'bc2'),
  ]

  const baseMilestones = [
    createTestMilestone('bm1', '前端架构升级', '主导架构升级', 'project-completion', 7, '2026-03-01', ['TypeScript', 'React/Vue']),
  ]

  describe('getPresetScenarios - 预设场景', () => {
    it('应返回 6 个预设场景', () => {
      const presets = simulator.getPresetScenarios()
      expect(presets.length).toBe(6)
      expect(presets.map(p => p.id)).toContain('preset-promotion')
      expect(presets.map(p => p.id)).toContain('preset-tech-transition')
      expect(presets.map(p => p.id)).toContain('preset-startup')
      expect(presets.map(p => p.id)).toContain('preset-freelance')
      expect(presets.map(p => p.id)).toContain('preset-advanced-study')
    })
  })

  describe('createScenario - 创建场景', () => {
    it('应创建有效的职业场景', () => {
      const scenario = simulator.createScenario({
        name: '测试晋升',
        description: '测试晋升场景',
        type: 'promotion',
        currentSkills: baseSkills,
        contacts: baseContacts,
        connections: baseConnections,
        milestones: baseMilestones,
        decisions: [],
      })

      expect(scenario.id).toBeDefined()
      expect(scenario.name).toBe('测试晋升')
      expect(scenario.type).toBe('promotion')
      expect(scenario.currentSkills.length).toBe(3)
      expect(scenario.assumptions.length).toBe(5)
    })

    it('场景应有默认假设', () => {
      const scenario = simulator.createScenario({
        name: '测试场景',
        description: '测试',
        type: 'transition',
        currentSkills: baseSkills,
        contacts: baseContacts,
        connections: baseConnections,
        milestones: baseMilestones,
        decisions: [],
      })

      expect(scenario.assumptions.length).toBeGreaterThan(0)
      for (const a of scenario.assumptions) {
        expect(a.name.length).toBeGreaterThan(0)
        expect(a.weight).toBeGreaterThan(0)
        expect(a.weight).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('createFromPreset - 从预设创建', () => {
    it('应从预设模板创建场景', () => {
      const scenario = simulator.createFromPreset(
        'preset-promotion',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )

      expect(scenario).not.toBeNull()
      expect(scenario!.type).toBe('promotion')
      expect(scenario!.decisions.length).toBeGreaterThan(0)
    })

    it('不存在预设应返回 null', () => {
      const scenario = simulator.createFromPreset(
        'nonexistent-preset',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )

      expect(scenario).toBeNull()
    })

    it('应支持自定义名称', () => {
      const scenario = simulator.createFromPreset(
        'preset-tech-transition',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
        '我的自定义场景',
      )

      expect(scenario!.name).toBe('我的自定义场景')
    })
  })

  describe('simulate - 运行模拟', () => {
    it('应生成模拟结果', () => {
      const scenario = simulator.createFromPreset(
        'preset-promotion',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const result = simulator.simulate(scenario)

      expect(result.scenarioId).toBe(scenario.id)
      expect(result.decisionPath.length).toBeGreaterThan(0)
      expect(result.finalOutcome).toBeDefined()
      expect(result.expectedValue).toBeDefined()
      expect(result.skillChanges).toBeDefined()
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.riskAssessment).toBeDefined()
      expect(result.recommendation.length).toBeGreaterThan(0)
      expect(result.alternatives.length).toBeGreaterThan(0)
    })

    it('晋升场景应包含相关决策节点', () => {
      const scenario = simulator.createFromPreset(
        'preset-promotion',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const result = simulator.simulate(scenario)

      expect(result.decisionPath.some(s => s.title.includes('晋升') || s.title.includes('申请'))).toBe(true)
    })

    it('创业场景风险应更高', () => {
      const promotionScenario = simulator.createFromPreset(
        'preset-promotion',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const startupScenario = simulator.createFromPreset(
        'preset-startup',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const promoResult = simulator.simulate(promotionScenario)
      const startupResult = simulator.simulate(startupScenario)

      expect(startupResult.riskAssessment.overallRisk).toBeGreaterThanOrEqual(promoResult.riskAssessment.overallRisk)
    })

    it('空技能场景应可正常模拟', () => {
      const scenario = simulator.createScenario({
        name: '无技能场景',
        description: '无技能',
        type: 'transition',
        currentSkills: [],
        contacts: [],
        connections: [],
        milestones: [],
        decisions: [],
      })

      const result = simulator.simulate(scenario)

      expect(result.overallScore).toBeLessThanOrEqual(20)
      expect(result.decisionPath.length).toBe(0)
    })
  })

  describe('quickSimulate - 快速模拟', () => {
    it('快速模拟应返回结果', () => {
      const scenario = simulator.createFromPreset(
        'preset-promotion',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const result = simulator.quickSimulate(scenario)
      expect(result).toBeDefined()
      expect(result.decisionPath.length).toBeGreaterThan(0)
    })
  })

  describe('compareScenarios - 对比场景', () => {
    it('应对比多个场景', () => {
      const promo = simulator.createFromPreset(
        'preset-promotion',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const transition = simulator.createFromPreset(
        'preset-tech-transition',
        baseSkills,
        baseContacts,
        baseConnections,
        baseMilestones,
      )!

      const results = simulator.compareScenarios(promo, transition)

      expect(results.length).toBe(2)
      expect(results[0].scenarioName).toBeDefined()
      expect(results[1].scenarioName).toBeDefined()
      expect(results[0].result).toBeDefined()
      expect(results[1].result).toBeDefined()
    })
  })

  describe('generateDecisionTree - 生成决策树', () => {
    it('晋升场景应生成决策树', () => {
      const tree = simulator.generateDecisionTree(
        'promotion',
        baseSkills,
        baseContacts,
        baseMilestones,
      )

      expect(tree.length).toBeGreaterThan(0)
      expect(tree[0].outcomes.length).toBeGreaterThan(0)
    })

    it('转型场景应生成决策树', () => {
      const tree = simulator.generateDecisionTree(
        'transition',
        baseSkills,
        baseContacts,
        baseMilestones,
      )

      expect(tree.length).toBeGreaterThan(0)
    })

    it('所有预设场景类型应生成决策树', () => {
      const types: Array<'promotion' | 'transition' | 'startup' | 'freelance' | 'education' | 'lateral' | 'sabbatical' | 'dual-track'> = [
        'promotion', 'transition', 'startup', 'freelance', 'education', 'lateral', 'sabbatical', 'dual-track',
      ]

      for (const type of types) {
        const tree = simulator.generateDecisionTree(type, baseSkills, baseContacts, baseMilestones)
        expect(tree.length).toBeGreaterThan(0)
      }
    })
  })

  describe('calculateDecisionEV - 计算期望值', () => {
    it('应计算决策期望值', () => {
      const outcomes = [
        {
          id: 'ev-1',
          description: '好结果',
          probability: 0.6,
          skillGains: [{ skillName: '技能A', gain: 20 }],
          networkGrowth: 0.5,
          incomeImpact: 30,
          satisfactionImpact: 80,
          isOptimal: true,
          isWorst: false,
        },
        {
          id: 'ev-2',
          description: '坏结果',
          probability: 0.4,
          skillGains: [{ skillName: '技能A', gain: 5 }],
          networkGrowth: 0.1,
          incomeImpact: -10,
          satisfactionImpact: 20,
          isOptimal: false,
          isWorst: true,
        },
      ]

      const ev = simulator.calculateDecisionEV(outcomes)
      expect(ev).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// 4. P20-4 技能缺口可视化
// ============================================================

describe('P20-4 技能缺口可视化', () => {
  const visualization = useSkillGapVisualization()
  const advisor = useSkillGapAdvisor()

  const currentSkills = [
    createTestSkill('vs1', 'TypeScript', 'technical', 'expert', true, 5),
    createTestSkill('vs2', 'React/Vue', 'technical', 'advanced', true, 4),
    createTestSkill('vs3', 'Node.js', 'technical', 'intermediate', false, 2),
    createTestSkill('vs4', '沟通能力', 'soft', 'intermediate', false, 3),
    createTestSkill('vs5', '前端架构', 'technical', 'advanced', true, 4),
  ]

  const targetSkills = [
    { name: 'TypeScript', category: 'technical' as SkillCategory, level: 'master' as ProficiencyLevel },
    { name: 'React/Vue', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
    { name: 'Node.js', category: 'technical' as SkillCategory, level: 'advanced' as ProficiencyLevel },
    { name: '团队管理', category: 'leadership' as SkillCategory, level: 'intermediate' as ProficiencyLevel },
    { name: '沟通能力', category: 'soft' as SkillCategory, level: 'advanced' as ProficiencyLevel },
    { name: 'UI设计', category: 'creative' as SkillCategory, level: 'beginner' as ProficiencyLevel },
  ]

  const milestones = [
    createTestMilestone('vm1', '完成架构升级', '完成架构升级', 'project-completion', 7, '2026-03-01', ['TypeScript', 'React/Vue']),
  ]

  function getGaps(): PrioritizedGap[] {
    const analysis = advisor.analyzeGaps(currentSkills, targetSkills, milestones, '高级前端工程师')
    return analysis.gaps
  }

  describe('generateHeatmap - 热力图', () => {
    it('应生成技能缺口热力图', () => {
      const gaps = getGaps()
      const heatmap = visualization.generateHeatmap(currentSkills, gaps)

      expect(heatmap.cells.length).toBeGreaterThan(0)
      expect(heatmap.rowLabels.length).toBeGreaterThan(0)
      expect(heatmap.colLabels.length).toBe(6)
      expect(heatmap.overallGapIndex).toBeGreaterThanOrEqual(0)
      expect(heatmap.weakestArea.length).toBeGreaterThan(0)
      expect(heatmap.strongestArea.length).toBeGreaterThan(0)
    })

    it('热力图单元格应有颜色编码', () => {
      const gaps = getGaps()
      const heatmap = visualization.generateHeatmap(currentSkills, gaps)

      for (const cell of heatmap.cells) {
        expect(cell.color).toBeDefined()
        expect(cell.intensity).toBeGreaterThanOrEqual(0)
        expect(cell.intensity).toBeLessThanOrEqual(1)
      }
    })

    it('空缺口应返回空热力图', () => {
      const heatmap = visualization.generateHeatmap([], [])
      expect(heatmap.cells.length).toBe(0)
      expect(heatmap.overallGapIndex).toBe(0)
    })
  })

  describe('generateGapMatrix - 缺口矩阵', () => {
    it('应生成缺口矩阵', () => {
      const matrix = visualization.generateGapMatrix(currentSkills, targetSkills, '测试矩阵')

      expect(matrix.name).toBe('测试矩阵')
      expect(matrix.skills.length).toBe(targetSkills.length)
      expect(matrix.dimensions.length).toBe(3)
      expect(matrix.data.length).toBe(targetSkills.length)
      expect(matrix.insights.length).toBeGreaterThan(0)
    })

    it('矩阵应包含标注', () => {
      const matrix = visualization.generateGapMatrix(currentSkills, targetSkills)

      expect(matrix.annotations.length).toBeGreaterThan(0)
      for (const anno of matrix.annotations) {
        expect(anno.text.length).toBeGreaterThan(0)
        expect(['critical', 'warning', 'info', 'success']).toContain(anno.type)
      }
    })

    it('已达标技能应有成功标注', () => {
      const matchedSkills = [
        { name: 'TypeScript', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
      ]
      const matrix = visualization.generateGapMatrix(currentSkills, matchedSkills)

      const successAnno = matrix.annotations.find(a => a.type === 'success')
      expect(successAnno).toBeDefined()
    })
  })

  describe('generateRoadmap - 改善路线图', () => {
    it('应生成改善路线图', () => {
      const gaps = getGaps()
      const roadmap = visualization.generateRoadmap(gaps, '技能提升路线图')

      expect(roadmap.name).toBe('技能提升路线图')
      expect(roadmap.phases.length).toBeGreaterThan(0)
      expect(roadmap.totalWeeks).toBeGreaterThan(0)
      expect(roadmap.priorityAdvice.length).toBeGreaterThan(0)
      expect(roadmap.estimatedCompletion).toBeDefined()
      expect(roadmap.keyMilestones.length).toBeGreaterThan(0)
    })

    it('每个阶段应有技能和资源', () => {
      const gaps = getGaps()
      const roadmap = visualization.generateRoadmap(gaps)

      for (const phase of roadmap.phases) {
        expect(phase.name.length).toBeGreaterThan(0)
        expect(phase.weeklyHours).toBeGreaterThan(0)
        expect(phase.weeks).toBeGreaterThan(0)
        expect(phase.completionCriteria.length).toBeGreaterThan(0)
      }
    })

    it('空缺口应返回保持阶段', () => {
      const roadmap = visualization.generateRoadmap([], '保持路线图')

      expect(roadmap.phases.length).toBe(1)
      expect(roadmap.phases[0].name).toBe('保持与深化')
    })
  })

  describe('generateComparison - 技能对比', () => {
    it('应生成技能对比视图', () => {
      const comparison = visualization.generateComparison(currentSkills, targetSkills, '技能对比')

      expect(comparison.name).toBe('技能对比')
      expect(comparison.current.totalSkills).toBe(5)
      expect(comparison.target.totalSkills).toBe(6)
      expect(comparison.gaps.length).toBe(6)
      expect(comparison.radarData.length).toBe(5)
    })

    it('差距条目应有正差距', () => {
      const comparison = visualization.generateComparison(currentSkills, targetSkills)

      // 有目标技能不存在于当前技能中，应有差距
      const uiGap = comparison.gaps.find(g => g.skillName === 'UI设计')
      expect(uiGap).toBeDefined()
      if (uiGap) {
        expect(uiGap.gap).toBeGreaterThan(0)
        expect(uiGap.currentScore).toBe(0)
      }
    })

    it('已达标技能应无差距', () => {
      const matchedSkills = [
        { name: 'TypeScript', category: 'technical' as SkillCategory, level: 'expert' as ProficiencyLevel },
      ]
      const comparison = visualization.generateComparison(currentSkills, matchedSkills)

      const tsGap = comparison.gaps.find(g => g.skillName === 'TypeScript')
      expect(tsGap).toBeDefined()
      if (tsGap) {
        expect(tsGap.gap).toBe(0)
      }
    })
  })

  describe('generateFullReport - 完整报告', () => {
    it('应生成完整可视化报告', () => {
      const gaps = getGaps()
      const report = visualization.generateFullReport(currentSkills, gaps, targetSkills, '完整报告')

      expect(report.heatmap).toBeDefined()
      expect(report.matrix).toBeDefined()
      expect(report.roadmap).toBeDefined()
      expect(report.comparison).toBeDefined()
      expect(report.heatmap.cells.length).toBeGreaterThan(0)
      expect(report.matrix.data.length).toBeGreaterThan(0)
    })
  })
})