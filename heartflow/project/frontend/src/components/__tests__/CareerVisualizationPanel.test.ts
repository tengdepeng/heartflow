import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeSkill(overrides: Record<string, any> = {}) {
  return {
    id: `sk-${Math.random().toString(36).slice(2, 6)}`,
    name: 'TypeScript',
    category: 'technical',
    proficiency: 'advanced',
    proficiencyScore: 70,
    yearsOfExperience: 3,
    relatedPositions: [],
    prerequisites: [],
    complements: [],
    isCore: true,
    ...overrides,
  }
}

async function mountPanel(skills: any[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: { 'career:positions': [] } }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CareerVisualizationPanel.vue')
  return mount(mod.default, { props: { skills } })
}

describe('CareerVisualizationPanel 可视化数据', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无技能时显示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('可视化数据')
    expect(wrapper.text()).toContain('先在技能图谱中录入技能')
  })

  it('有技能时展示技能雷达', async () => {
    const wrapper = await mountPanel([
      makeSkill({ id: 'sk-1', name: 'TypeScript', category: 'technical', proficiency: 'advanced', proficiencyScore: 70 }),
      makeSkill({ id: 'sk-2', name: '沟通', category: 'soft', proficiency: 'intermediate', proficiencyScore: 50 }),
      makeSkill({ id: 'sk-3', name: '领域知识', category: 'domain', proficiency: 'beginner', proficiencyScore: 30 }),
    ])
    expect(wrapper.text()).toContain('技能雷达')
    expect(wrapper.text()).toContain('技术能力')
    expect(wrapper.text()).toContain('软技能')
    expect(wrapper.text()).toContain('领域知识')
  })

  it('展示当前与目标对比图例', async () => {
    const wrapper = await mountPanel([
      makeSkill({ id: 'sk-1', name: 'TypeScript', category: 'technical', proficiency: 'advanced', proficiencyScore: 70 }),
    ])
    expect(wrapper.text()).toContain('当前')
    expect(wrapper.text()).toContain('目标')
  })

  it('无职位时展示职业路径空状态', async () => {
    const wrapper = await mountPanel([
      makeSkill({ id: 'sk-1', name: 'TypeScript', category: 'technical', proficiency: 'advanced', proficiencyScore: 70 }),
    ])
    expect(wrapper.text()).toContain('职业路径')
    expect(wrapper.text()).toContain('暂无职位记录')
  })
})
