// ============================================================
// 业脉 · 学习路径 单元测试
// useLearningPath：路径创建 / 进度追踪 / 技能缺口分析 / 路径生成
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useLearningPath } from '../skill-path'
import type { SkillNode, SkillCategory, ProficiencyLevel } from '../skill-map'

const LEARNING_PATHS_KEY = 'hf:career_learning_paths'

function createTestSkill(
  id: string,
  name: string,
  category: SkillCategory,
  proficiency: ProficiencyLevel,
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
    yearsOfExperience: 3,
    relatedPositions: [],
    prerequisites: [],
    complements: [],
    isCore: false,
  }
}

describe('useLearningPath 学习路径', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((k: string, d: any) => (k in store ? store[k] : d))
  })

  it('loadAll 从空存储加载为空数组', () => {
    const lp = useLearningPath()
    lp.loadAll()
    expect(lp.learningPaths.value).toEqual([])
    expect(mockGetKV).toHaveBeenCalledWith(LEARNING_PATHS_KEY, [])
  })

  it('createLearningPath 创建路径并计算总时长与进度', () => {
    const lp = useLearningPath()
    lp.loadAll()
    const path = lp.createLearningPath(
      'linear',
      '通往 前端架构师 的学习路径',
      '前端架构师',
      '测试路径',
      [
        { skillId: 's1', skillName: '系统架构', level: 1, prerequisites: [], estimatedHours: 40, actualHours: 0, completed: false, resources: [], description: 'd1' },
        { skillId: 's2', skillName: '性能优化', level: 2, prerequisites: [], estimatedHours: 40, actualHours: 0, completed: true, resources: [], description: 'd2' },
      ],
    )

    expect(path.totalEstimatedHours).toBe(80)
    expect(path.totalActualHours).toBe(0)
    expect(path.progress).toBe(50)
    expect(path.nodes.length).toBe(2)
    expect(path.nodes[0].id).toMatch(/^learning-path-node-/)
    expect(mockSetKV).toHaveBeenCalledWith(LEARNING_PATHS_KEY, expect.any(Array))
  })

  it('completeNode 更新节点完成状态并重算进度', () => {
    const lp = useLearningPath()
    lp.loadAll()
    const path = lp.createLearningPath(
      'linear',
      '路径',
      '角色',
      '描述',
      [
        { skillId: 's1', skillName: '技能A', level: 1, prerequisites: [], estimatedHours: 40, actualHours: 0, completed: false, resources: [], description: 'd' },
        { skillId: 's2', skillName: '技能B', level: 2, prerequisites: [], estimatedHours: 40, actualHours: 0, completed: false, resources: [], description: 'd' },
      ],
    )

    const ok = lp.completeNode(path.id, path.nodes[0].id)
    expect(ok).toBe(true)
    const updated = lp.learningPaths.value.find(p => p.id === path.id)!
    expect(updated.nodes[0].completed).toBe(true)
    expect(updated.nodes[0].completedAt).toBeTruthy()
    expect(updated.progress).toBe(50)
  })

  it('completeNode 对不存在的路径或节点返回 false', () => {
    const lp = useLearningPath()
    lp.loadAll()
    expect(lp.completeNode('nope', 'nope')).toBe(false)

    const path = lp.createLearningPath('linear', '路径', '角色', '描述', [
      { skillId: 's1', skillName: '技能A', level: 1, prerequisites: [], estimatedHours: 40, actualHours: 0, completed: false, resources: [], description: 'd' },
    ])
    expect(lp.completeNode(path.id, 'nope')).toBe(false)
  })

  it('addResource 向节点追加学习资源', () => {
    const lp = useLearningPath()
    lp.loadAll()
    const path = lp.createLearningPath('linear', '路径', '角色', '描述', [
      { skillId: 's1', skillName: '技能A', level: 1, prerequisites: [], estimatedHours: 40, actualHours: 0, completed: false, resources: [], description: 'd' },
    ])

    const ok = lp.addResource(path.id, path.nodes[0].id, { type: 'book', title: '深入理解', completed: false })
    expect(ok).toBe(true)
    const updated = lp.learningPaths.value.find(p => p.id === path.id)!
    expect(updated.nodes[0].resources).toHaveLength(1)
    expect(updated.nodes[0].resources[0].title).toBe('深入理解')
  })

  it('analyzeSkillGaps 识别技能缺口并按缺口大小排序', () => {
    const lp = useLearningPath()
    const skills = [
      createTestSkill('s1', '系统架构', 'technical', 'intermediate'),
      createTestSkill('s2', '沟通能力', 'soft', 'expert'),
    ]

    const gaps = lp.analyzeSkillGaps(skills, '技术负责人', [
      { name: '系统架构', category: 'technical', targetProficiency: 'advanced' },
      { name: '团队管理', category: 'leadership', targetProficiency: 'advanced' },
      { name: '沟通能力', category: 'soft', targetProficiency: 'intermediate' },
    ])

    // 沟通能力已达标（expert > intermediate），不产生缺口
    expect(gaps).toHaveLength(2)
    expect(gaps[0].currentSkill.name).toBe('团队管理')
    expect(gaps[0].gapSize).toBe(4) // 缺失技能按 novice 之下计 → advanced
    expect(gaps[0].estimatedHours).toBe(160)
    expect(gaps[0].recommendedResources.length).toBeGreaterThan(0)
  })

  it('generatePathFromGaps 基于缺口生成学习路径', () => {
    const lp = useLearningPath()
    lp.loadAll()
    const skills = [createTestSkill('s1', '系统架构', 'technical', 'beginner')]

    const gaps = lp.analyzeSkillGaps(skills, '技术负责人', [
      { name: '系统架构', category: 'technical', targetProficiency: 'advanced' },
    ])

    const path = lp.generatePathFromGaps(gaps, '技术负责人', 'linear')
    expect(path.name).toContain('技术负责人')
    expect(path.nodes.length).toBe(1)
    expect(path.nodes[0].skillName).toBe('系统架构')
    expect(path.nodes[0].resources.length).toBeGreaterThan(0)
    expect(lp.learningPaths.value.length).toBe(1)
  })
})
