// ============================================================
// TransitionRecommendPanel 转业·转型推荐面板测试（INCR-126）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- Storage Mock（pathStore.load 需读 positions） ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import TransitionRecommendPanel from '../TransitionRecommendPanel.vue'
import type { SkillNode, SkillCategory, ProficiencyLevel, CareerMilestone } from '../../modules/career/skill-map'
import type { CareerContact, CareerConnection } from '../../modules/career/career'

function mkSkill(
  name: string,
  category: SkillCategory = 'technical',
  proficiency: ProficiencyLevel = 'intermediate',
  score: number = 60,
  isCore = false,
): SkillNode {
  return {
    id: `s_${name}`,
    name,
    category,
    proficiency,
    proficiencyScore: score,
    yearsOfExperience: 3,
    relatedPositions: [],
    prerequisites: [],
    complements: [],
    isCore,
  }
}

function mkMilestone(id: string, title: string): CareerMilestone {
  return {
    id,
    type: 'promotion',
    title,
    description: '',
    date: '2026-06-01',
    impact: 8,
    relatedSkills: [],
    relatedContacts: [],
  }
}

function mkContact(id: string, name: string, role: string): CareerContact {
  return {
    id,
    name,
    role,
    tier: 'core',
    nodeType: 'colleague',
    affinity: 8,
    tags: [],
  }
}

// 与内置「高级前端工程师」高度吻合的技能集，保证有高匹配推荐
function frontendSkills(): SkillNode[] {
  return [
    mkSkill('TypeScript', 'technical', 'advanced', 80, true),
    mkSkill('React/Vue', 'technical', 'expert', 90, true),
    mkSkill('前端架构', 'technical', 'advanced', 80, true),
    mkSkill('Node.js', 'technical', 'intermediate', 60),
  ]
}

function mountPanel(opts: {
  skills?: SkillNode[]
  contacts?: CareerContact[]
  connections?: CareerConnection[]
  milestones?: CareerMilestone[]
} = {}) {
  return mount(TransitionRecommendPanel, {
    props: {
      skills: opts.skills ?? [],
      contacts: opts.contacts ?? [],
      connections: opts.connections ?? [],
      milestones: opts.milestones ?? [],
    },
  })
}

describe('TransitionRecommendPanel 转业·转型推荐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('空态：无技能无人脉 → 引导文案 + 按钮禁用', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    expect(wrapper.text()).toContain('转业 · 转型推荐')
    expect(wrapper.text()).toContain('先补充技能图谱与人脉')
    expect(wrapper.find('.trp-run').attributes('disabled')).toBeDefined()
  })

  it('数据不足时点击生成不产出推荐', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()
    expect(wrapper.findAll('.trp-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('先补充技能图谱与人脉')
  })

  it('填充态 + 输入角色 → 点击生成 → 渲染总结与排行卡', async () => {
    const wrapper = await mountPanel({
      skills: frontendSkills(),
      contacts: [mkContact('c1', '李工', '前端工程师')],
      milestones: [mkMilestone('m1', '晋升技术负责人')],
    })
    await nextTick()

    await wrapper.find('.trp-role').setValue('前端工程师')
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()

    expect(wrapper.find('.trp-summary').exists()).toBe(true)
    expect(wrapper.text()).toContain('综合分析')
    const cards = wrapper.findAll('.trp-card')
    expect(cards.length).toBeGreaterThan(0)

    // 排行 + 角色 + 行业 + 匹配度
    const firstCard = cards[0]
    expect(firstCard.find('.trp-rank').text()).toMatch(/^#\d+$/)
    expect(firstCard.find('.trp-match').text()).toContain('%')
    expect(firstCard.find('.trp-role-box .trp-role').text().length).toBeGreaterThan(0)
    expect(firstCard.find('.trp-industry').text().length).toBeGreaterThan(0)
  })

  it('四维匹配条：技能 / 人脉 / 里程碑 / 市场', async () => {
    const wrapper = await mountPanel({
      skills: frontendSkills(),
      contacts: [mkContact('c1', '李工', '前端工程师')],
      milestones: [mkMilestone('m1', '晋升技术负责人')],
    })
    await nextTick()
    await wrapper.find('.trp-role').setValue('前端工程师')
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()

    const firstCard = wrapper.findAll('.trp-card')[0]
    const barLabels = firstCard.findAll('.trp-bar .trp-bar-label').map(b => b.text())
    expect(barLabels).toContain('技能')
    expect(barLabels).toContain('人脉')
    expect(barLabels).toContain('里程碑')
    expect(barLabels).toContain('市场')
    expect(firstCard.findAll('.trp-bar').length).toBeGreaterThanOrEqual(4)
  })

  it('策略 · 时长 · 难度 chips 渲染', async () => {
    const wrapper = await mountPanel({
      skills: frontendSkills(),
      contacts: [mkContact('c1', '李工', '前端工程师')],
      milestones: [mkMilestone('m1', '晋升技术负责人')],
    })
    await nextTick()
    await wrapper.find('.trp-role').setValue('前端工程师')
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()

    const firstCard = wrapper.findAll('.trp-card')[0]
    const chipText = firstCard.findAll('.trp-chip').map(c => c.text()).join(' ')
    expect(chipText).toMatch(/个月/)
    expect(chipText).toMatch(/难度 \d\/5/)
    // 策略文案为内置四类之一
    expect(chipText).toMatch(/直接转型|渐进转型|桥接转型|探索转型/)
  })

  it('理由与风险列表渲染', async () => {
    const wrapper = await mountPanel({
      skills: frontendSkills(),
      contacts: [],
      milestones: [],
    })
    await nextTick()
    await wrapper.find('.trp-role').setValue('前端工程师')
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()

    const cards = wrapper.findAll('.trp-card')
    expect(cards.length).toBeGreaterThan(0)
    // 至少一张卡有理由
    expect(wrapper.findAll('.trp-reasons li').length).toBeGreaterThan(0)
    // 存在技能缺口且覆盖不全时会产出风险
    expect(wrapper.findAll('.trp-risks li').length).toBeGreaterThan(0)
  })

  it('技能缺口 chip 渲染（存在 skillGap 的角色）', async () => {
    // 仅极少数技能 → 其他目标角色必然有技能缺口
    const wrapper = await mountPanel({
      skills: [mkSkill('Vue', 'technical', 'intermediate', 50, true)],
      contacts: [mkContact('c1', '王工', '产品经理')],
      milestones: [],
    })
    await nextTick()
    await wrapper.find('.trp-role').setValue('前端工程师')
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()

    const cards = wrapper.findAll('.trp-card')
    expect(cards.length).toBeGreaterThan(0)
    const gapEls = wrapper.findAll('.trp-gap')
    expect(gapEls.length).toBeGreaterThan(0)
    expect(gapEls[0].text()).toContain('h')
  })

  it('数据联动：props 由空 → 填充后按钮可用且可生成', async () => {
    const wrapper = await mountPanel()
    await nextTick()
    expect(wrapper.find('.trp-run').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ skills: frontendSkills(), contacts: [mkContact('c1', '李工', '前端工程师')] })
    await nextTick()
    expect(wrapper.find('.trp-run').attributes('disabled')).toBeUndefined()

    await wrapper.find('.trp-role').setValue('前端工程师')
    await wrapper.find('.trp-run').trigger('click')
    await nextTick()
    expect(wrapper.findAll('.trp-card').length).toBeGreaterThan(0)
  })
})