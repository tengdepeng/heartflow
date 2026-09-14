// ============================================================
// SkillGapArchivePanel 技能缺口档案面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkillGapArchivePanel from '../SkillGapArchivePanel.vue'
import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone } from '../../modules/career/skill-map'

function mkSkill(
  name: string,
  category: SkillCategory = 'technical',
  proficiency: ProficiencyLevel = 'intermediate',
  score: number = 50,
  isCore = false,
): SkillNode {
  return {
    id: `s_${name}`,
    name,
    category,
    proficiency,
    proficiencyScore: score,
    yearsOfExperience: 2,
    relatedPositions: [],
    prerequisites: [],
    complements: [],
    isCore,
  }
}

function mkMilestone(id: string, title: string, relatedSkills: string[]): CareerMilestone {
  return {
    id,
    type: 'promotion',
    title,
    description: '',
    date: '2026-06-01',
    impact: 7,
    relatedSkills,
    relatedContacts: [],
  }
}

function mountPanel(skills: SkillNode[], milestones: CareerMilestone[]) {
  return mount(SkillGapArchivePanel, { props: { skills, milestones } })
}

describe('SkillGapArchivePanel 技能缺口档案', () => {
  it('空态：标题 + 技能未显影徽标 + 引导文案', () => {
    const wrapper = mountPanel([], [])
    expect(wrapper.text()).toContain('技能缺口档案')
    expect(wrapper.text()).toContain('技能未显影')
    expect(wrapper.text()).toContain('还没有技能与里程碑可供分析')
  })

  it('填充态：徽标为技能齐备（有技能且无缺口）', () => {
    const skills = [mkSkill('Vue', 'technical', 'advanced', 70, true)]
    const milestones = [mkMilestone('m1', '晋升技术主管', ['Vue'])]
    const wrapper = mountPanel(skills, milestones)
    const badge = wrapper.find('.sgp-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('技能齐备')
  })

  it('填充态：档案概览八格', () => {
    const skills = [
      mkSkill('Vue', 'technical', 'advanced', 70, true),
      mkSkill('TypeScript', 'technical', 'intermediate', 50, true),
      mkSkill('沟通能力', 'soft', 'beginner', 30),
    ]
    const milestones = [mkMilestone('m1', '晋升技术主管', ['Vue', '团队管理'])]
    const wrapper = mountPanel(skills, milestones)
    const overviewBlock = wrapper.findAll('.sgp-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.sgp-cell')
    expect(cells.length).toBe(8)
    expect(wrapper.text()).toContain('技能总数')
    expect(wrapper.text()).toContain('核心技能')
    expect(wrapper.text()).toContain('平均熟练度')
    expect(wrapper.text()).toContain('整体准备度')
  })

  it('填充态：技能缺口列表渲染优先级徽标', () => {
    const skills = [mkSkill('Vue', 'technical', 'advanced', 70)]
    const milestones = [
      mkMilestone('m1', '晋升技术主管', ['Vue', '团队管理']),
      mkMilestone('m2', '获得架构师认证', ['系统架构']),
    ]
    const wrapper = mountPanel(skills, milestones)
    const gapBlock = wrapper.findAll('.sgp-block').find((b) => b.text().includes('技能缺口'))!
    expect(gapBlock.exists()).toBe(true)
    expect(gapBlock.text()).toContain('团队管理')
    expect(gapBlock.text()).toContain('系统架构')
    expect(gapBlock.findAll('.sgp-priority').length).toBeGreaterThan(0)
  })

  it('填充态：学习路线图渲染阶段', () => {
    const skills = [mkSkill('Vue', 'technical', 'advanced', 70)]
    const milestones = [mkMilestone('m1', '晋升技术主管', ['团队管理'])]
    const wrapper = mountPanel(skills, milestones)
    const roadmapBlock = wrapper.findAll('.sgp-block').find((b) => b.text().includes('学习路线图'))!
    expect(roadmapBlock.exists()).toBe(true)
    expect(roadmapBlock.findAll('.sgp-stage').length).toBeGreaterThan(0)
  })

  it('填充态：里程碑关联渲染准备度与建议', () => {
    const skills = [mkSkill('Vue', 'technical', 'advanced', 70)]
    const milestones = [mkMilestone('m1', '晋升技术主管', ['Vue', '团队管理'])]
    const wrapper = mountPanel(skills, milestones)
    const msBlock = wrapper.findAll('.sgp-block').find((b) => b.text().includes('里程碑关联'))!
    expect(msBlock.exists()).toBe(true)
    expect(msBlock.text()).toContain('晋升技术主管')
    expect(msBlock.text()).toContain('%')
  })

  it('温和洞察列表非空（有技能与里程碑时生成洞察）', () => {
    const skills = [mkSkill('Vue', 'technical', 'advanced', 70)]
    const milestones = [mkMilestone('m1', '晋升技术主管', ['团队管理'])]
    const wrapper = mountPanel(skills, milestones)
    const insights = wrapper.findAll('.sgp-insight')
    expect(insights.length).toBeGreaterThan(0)
  })

  it('数据联动：props 更新后从空态进入填充态', async () => {
    const wrapper = mountPanel([], [])
    expect(wrapper.text()).toContain('技能未显影')
    await wrapper.setProps({
      skills: [mkSkill('Vue', 'technical', 'advanced', 70)],
      milestones: [mkMilestone('m1', '晋升技术主管', ['团队管理'])],
    })
    expect(wrapper.text()).not.toContain('技能未显影')
    expect(wrapper.text()).toContain('档案概览')
  })
})
