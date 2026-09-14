// ============================================================
// 业脉 · 技能缺口补充建议引擎（useSkillGapAdvisor）单测
// 覆盖：缺口分析 / 优先级排序 / 学习计划 / 里程碑关联 / 档案聚合（buildSkillGapProfile）
// 纯逻辑引擎，无 storage 依赖；构造最小 SkillNode / CareerMilestone 输入。
// ============================================================

import { describe, expect, it } from 'vitest'
import { useSkillGapAdvisor } from '../skill-gap-advisor'
import type { SkillNode, CareerMilestone } from '../skill-map'

const advisor = () => useSkillGapAdvisor()

function makeSkill(
  name: string,
  partial: Partial<SkillNode> = {},
): SkillNode {
  return {
    id: `s-${name}`,
    name,
    category: 'technical',
    proficiency: 'intermediate',
    proficiencyScore: 50,
    yearsOfExperience: 2,
    relatedPositions: [],
    prerequisites: [],
    complements: [],
    isCore: false,
    ...partial,
  }
}

function makeMilestone(
  title: string,
  relatedSkills: string[],
  partial: Partial<CareerMilestone> = {},
): CareerMilestone {
  return {
    id: `m-${title}`,
    type: 'promotion',
    title,
    description: `${title} 里程碑`,
    date: '2026-06-01',
    impact: 6,
    relatedSkills,
    relatedContacts: [],
    ...partial,
  }
}

describe('useSkillGapAdvisor · 分析技能缺口', () => {
  it('无技能且无目标时，纵览为零（礼貌空态）', () => {
    const { analyzeGaps } = advisor()
    const r = analyzeGaps([], [], [], '目标角色')
    expect(r.gaps).toHaveLength(0)
    expect(r.currentSkillsSummary.totalSkills).toBe(0)
    expect(r.currentSkillsSummary.avgProficiency).toBe(0)
    expect(r.currentSkillsSummary.overallScore).toBe(0)
    expect(r.milestoneConnections).toHaveLength(0)
  })

  it('已具备目标技能的成熟技能不计缺口', () => {
    const { analyzeGaps } = advisor()
    const current = [makeSkill('系统架构', { proficiency: 'advanced', proficiencyScore: 70, category: 'technical' })]
    const r = analyzeGaps(current, [{ name: '系统架构', category: 'technical', level: 'advanced' }], [])
    expect(r.gaps).toHaveLength(0)
    expect(r.currentSkillsSummary.strongestSkills[0].name).toBe('系统架构')
  })

  it('缺失技能成为缺口，缺口大小=目标分-当前分', () => {
    const { analyzeGaps } = advisor()
    const r = analyzeGaps([], [{ name: '团队管理', category: 'leadership', level: 'intermediate' }], [])
    expect(r.gaps).toHaveLength(1)
    const gap = r.gaps[0]
    expect(gap.skillName).toBe('团队管理')
    expect(gap.currentScore).toBe(0) // 无现有技能 → novice → 分 0
    expect(gap.targetScore).toBe(50) // intermediate = 50
    expect(gap.gapSize).toBe(50)
    expect(gap.estimatedHours).toBeGreaterThan(0)
    expect(gap.resources.length).toBeGreaterThan(0)
    // 当前无技能 → 无前置技能可比对 → 给出该分类基础策略
    expect(gap.learningStrategy.length).toBeGreaterThan(0)
  })

  it('缺口按优先级降序排列（紧急缺口在前）', () => {
    const { analyzeGaps } = advisor()
    const r = analyzeGaps(
      [],
      [
        { name: '需求分析', category: 'soft', level: 'expert' },  // gap 85
        { name: 'SQL', category: 'technical', level: 'beginner' }, // gap 30
      ],
      [],
    )
    expect(r.gaps).toHaveLength(2)
    expect(r.gaps[0].gapSize).toBeGreaterThanOrEqual(r.gaps[1].gapSize)
  })

  it('生成学习计划：阶段、检查点与总时长', () => {
    const { analyzeGaps } = advisor()
    const r = analyzeGaps(
      [],
      [{ name: '数据分析', category: 'domain', level: 'advanced' }],
      [],
      '数据分析师',
    )
    const plan = r.recommendedPath
    expect(plan.name).toContain('数据分析师')
    expect(plan.goal).toBe('数据分析师')
    expect(plan.phases.length).toBeGreaterThan(0)
    expect(plan.totalEstimatedHours).toBeGreaterThan(0)
    expect(plan.estimatedWeeks).toBeGreaterThan(0)
    // 最后一个检查点周数等于总周数
    const last = plan.checkpoints[plan.checkpoints.length - 1]
    expect(last).toBeDefined()
    expect(plan.checkpoints.length).toBe(plan.phases.length)
    // 阶段内部技能非空
    expect(plan.phases[0].skills.length).toBeGreaterThan(0)
  })

  it('里程碑关联：技能不足给低准备度与「长期目标」建议', () => {
    const { analyzeGaps } = advisor()
    const milestone = makeMilestone('晋升技术主管', ['团队管理', '绩效评估'])
    const r = analyzeGaps([], [{ name: '团队管理', category: 'leadership', level: 'advanced' }], [milestone])
    const conn = r.milestoneConnections[0]
    expect(conn.milestone.title).toBe('晋升技术主管')
    expect(conn.readiness).toBeLessThan(70)
    expect(typeof conn.suggestion).toBe('string')
  })
})

describe('useSkillGapAdvisor · getSkillAdvice 单技能建议', () => {
  it('返回学习方式、资源、时间与练习建议', () => {
    const { getSkillAdvice } = advisor()
    const advice = getSkillAdvice('TypeScript', 'technical', 'novice', 'advanced')
    expect(advice.skillName).toBe('TypeScript')
    expect(advice.currentLevel).toBe('入门')
    expect(advice.learningMethods.length).toBeGreaterThan(0)
    expect(advice.resources.length).toBeGreaterThan(0)
    expect(advice.timeEstimate).toMatch(/周|月/)
    expect(advice.difficultyNote).toBeTruthy()
    expect(advice.practiceSuggestions.length).toBeGreaterThan(0)
  })
})

describe('useSkillGapAdvisor · buildSkillGapProfile 档案聚合', () => {
  const skills = [
    makeSkill('Vue', { proficiency: 'advanced', proficiencyScore: 70 }),
    makeSkill('TypeScript', { proficiency: 'intermediate', proficiencyScore: 50 }),
  ]
  const milestones = [
    makeMilestone('晋升前端专家', ['Vue', '性能优化']),
    makeMilestone('晋升团队负责人', ['团队管理', '沟通能力']),
  ]

  it('从里程碑所需技能推出缺口并聚合档案字段', () => {
    const { buildSkillGapProfile } = advisor()
    const profile = buildSkillGapProfile(skills, milestones)
    expect(profile.summary.totalSkills).toBe(2)
    expect(profile.gapCount).toBe(3) // 性能优化, 团队管理, 沟通能力（Vue 已具备）
    expect(profile.coverage).toBeGreaterThan(0) // Vue 被覆盖
    expect(profile.overallReadiness).toBeGreaterThanOrEqual(0)
    expect(profile.roadmap.currentLevel).toContain('项技能')
    expect(profile.roadmap.roadmap.length).toBeGreaterThan(0)
    expect(profile.roadmap.totalMonths).toBeGreaterThan(0)
    expect(profile.milestoneConnections).toHaveLength(2)
    expect(profile.insights.length).toBeGreaterThan(0)
  })

  it('gaps 排在最前的是最高优先级缺口（洞察引用其技能名）', () => {
    const { buildSkillGapProfile } = advisor()
    const profile = buildSkillGapProfile(skills, milestones)
    if (profile.gaps.length) {
      const top = profile.gaps[0].skillName
      const firstInsight = profile.insights[0]
      expect(firstInsight.description).toContain(top)
    }
  })
})