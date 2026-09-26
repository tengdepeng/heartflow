// ============================================================
// P22-2 行囊视图桥接层测试
// 覆盖：技能概览、行囊健康度、雷达数据、成长趋势、
//       熟练度预测、学习路径、技能推荐、操作入口
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed } from 'vue'

// ============================================================
// 辅助函数
// ============================================================

/** 创建 7 个空分类 */
function makeEmptyCategories() {
  return [
    { id: 'e1', name: '', icon: '', color: '', proficiency: 0, categoryType: 'tool' as const, items: [] },
    { id: 'e2', name: '', icon: '', color: '', proficiency: 0, categoryType: 'language' as const, items: [] },
    { id: 'e3', name: '', icon: '', color: '', proficiency: 0, categoryType: 'framework' as const, items: [] },
    { id: 'e4', name: '', icon: '', color: '', proficiency: 0, categoryType: 'design' as const, items: [] },
    { id: 'e5', name: '', icon: '', color: '', proficiency: 0, categoryType: 'softskill' as const, items: [] },
    { id: 'e6', name: '', icon: '', color: '', proficiency: 0, categoryType: 'domain' as const, items: [] },
    { id: 'e7', name: '', icon: '', color: '', proficiency: 0, categoryType: 'certification' as const, items: [] },
  ]
}

/** 创建带数据的测试分类 */
function makeTestCategories() {
  return [
    {
      id: 'tools',
      name: '工具',
      icon: '🛠',
      color: '#c48a6a',
      proficiency: 65,
      categoryType: 'tool' as const,
      items: [
        { name: 'VS Code', proficiency: 80 },
        { name: 'Git', proficiency: 80 },
        { name: 'Docker', proficiency: 40 },
      ],
    },
    {
      id: 'knowledge',
      name: '知识',
      icon: '📚',
      color: '#8a9ab8',
      proficiency: 85,
      categoryType: 'framework' as const,
      items: [
        { name: 'Vue 3', proficiency: 90 },
        { name: 'TypeScript', proficiency: 85 },
        { name: 'Node.js', proficiency: 60 },
        { name: 'Python', proficiency: 70 },
        { name: 'CSS', proficiency: 80 },
      ],
    },
    {
      id: 'skills',
      name: '技能',
      icon: '⚡',
      color: '#e8c060',
      proficiency: 25,
      categoryType: 'softskill' as const,
      items: [
        { name: '沟通协作', proficiency: 40 },
        { name: '问题分析', proficiency: 30 },
      ],
    },
    {
      id: 'materials',
      name: '素材',
      icon: '📦',
      color: '#7a9a8a',
      proficiency: 45,
      categoryType: 'domain' as const,
      items: [
        { name: '组件库', proficiency: 30 },
        { name: '设计稿', proficiency: 20 },
      ],
    },
    {
      id: 'keepsakes',
      name: '珍藏',
      icon: '💎',
      color: '#c4a0b8',
      proficiency: 38,
      categoryType: 'certification' as const,
      items: [
        { name: '优秀项目', proficiency: 30 },
        { name: '推荐读物', proficiency: 20 },
      ],
    },
    {
      id: 'references',
      name: '参考',
      icon: '📎',
      color: '#8a8a7a',
      proficiency: 55,
      categoryType: 'design' as const,
      items: [
        { name: 'API 文档', proficiency: 30 },
        { name: '教程链接', proficiency: 30 },
      ],
    },
    {
      id: 'inspirations',
      name: '灵感',
      icon: '✨',
      color: '#a08ac4',
      proficiency: 42,
      categoryType: 'design' as const,
      items: [
        { name: '创意笔记', proficiency: 30 },
      ],
    },
  ]
}

// ============================================================
// 测试数据工厂
// ============================================================

function createMockStore(categories: any[]) {
  return {
    categories,
    savedCategories: categories,
    categoryDistribution: computed(() => []),
    overview: computed(() => ({ totalItems: categories.reduce((s: number, c: any) => s + c.items.length, 0), avgProficiency: 0, masteredItems: 0 })),
    filteredCategories: computed(() => categories),
    searchQuery: ref(''),
    editingCategory: ref(null),
    editFormItems: ref([]),
    showAddEvolution: ref(false),
    newEvoForm: ref({}),
    evolution: [],
    setSearchQuery: vi.fn(),
    openEditModal: vi.fn(),
    closeModal: vi.fn(),
    addItemToEdit: vi.fn(),
    removeItemFromEdit: vi.fn(),
    saveCategoryItems: vi.fn(),
    handleProficiencyClick: vi.fn(),
    syncLevelClass: vi.fn(),
    resetEvoForm: vi.fn(),
    addEvolution: vi.fn(),
  }
}

function createMockAnalytics() {
  const growthTrend = ref<any[]>([])
  const learningPaths = ref<any[]>([])
  const activePaths = computed(() => learningPaths.value.filter((p: any) => !p.completed))

  return {
    growthTrend,
    learningPaths,
    activePaths,
    skillRadarSummary: computed(() => ({ avgProficiency: 0, strongest: null, weakest: null, radar: [] })),
    calculateSkillRadar: vi.fn((cats: any[]) => cats.map((c: any) => ({
      category: c.categoryType,
      label: c.name,
      proficiency: c.proficiency,
      itemCount: c.items.length,
      change: 0,
    }))),
    recordGrowthPoint: vi.fn((cats: any[]) => {
      const totalProficiency = cats.reduce((s: number, c: any) => s + c.proficiency, 0)
      const avgProficiency = cats.length > 0 ? Math.round(totalProficiency / cats.length) : 0
      growthTrend.value.push({
        date: new Date().toISOString().slice(0, 10),
        totalProficiency,
        avgProficiency,
        newItems: cats.reduce((s: number, c: any) => s + c.items.length, 0),
        masteredItems: cats.filter((c: any) => c.proficiency >= 80).length,
      })
    }),
    getGrowthTrend: vi.fn((_days: number) => [...growthTrend.value]),
    createLearningPath: vi.fn((name: string, description: string, targetCategory: string) => {
      const path = {
        id: `lp_${Date.now()}`,
        name,
        description,
        targetCategory,
        steps: [],
        currentStep: 0,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      learningPaths.value.push(path)
      return path
    }),
    addLearningStep: vi.fn(),
    completeStep: vi.fn(),
    predictProficiency: vi.fn((cats: any[]) => cats.map((c: any) => ({
      category: c.categoryType,
      label: c.name,
      currentProficiency: c.proficiency,
      predicted30Days: Math.min(100, c.proficiency + 5),
      predicted90Days: Math.min(100, c.proficiency + 15),
      daysTo80: c.proficiency >= 80 ? null : Math.ceil((80 - c.proficiency) / 0.3),
      dailyGrowthRate: 0.3,
    }))),
    calculateSkillHealth: vi.fn((cats: any[]) => {
      const totalItems = cats.reduce((s: number, c: any) => s + c.items.length, 0)
      const avgProficiency = cats.length > 0
        ? Math.round(cats.reduce((s: number, c: any) => s + c.proficiency, 0) / cats.length)
        : 0
      const masteredItems = cats.filter((c: any) => c.proficiency >= 80).length
      const weakItems = cats.filter((c: any) => c.proficiency < 30).length
      return {
        totalItems,
        avgProficiency,
        masteredItems,
        weakItems,
        coveredCategories: cats.length,
        diversity: 0.7,
        healthScore: avgProficiency,
      }
    }),
  }
}

// ============================================================
// Mock 模块
// ============================================================

const mockStoreModule = vi.hoisted(() => {
  let storeInstance: ReturnType<typeof createMockStore> | null = null
  let analyticsInstance: ReturnType<typeof createMockAnalytics> | null = null

  return {
    getStoreInstance: () => storeInstance,
    setStoreInstance: (s: ReturnType<typeof createMockStore>) => { storeInstance = s },
    getAnalyticsInstance: () => analyticsInstance,
    setAnalyticsInstance: (a: ReturnType<typeof createMockAnalytics>) => { analyticsInstance = a },
  }
})

// ⚠️ mock 目标必须是 **真实定义文件**：bag-bridge.ts 已改为从 './bag-store' 取 useBagStore
//    （从 barrel 取会构成 index ↔ bridge 循环依赖），mock '../index' 不再命中。
vi.mock('../bag-store', () => ({
  useBagStore: () => mockStoreModule.getStoreInstance(),
}))

vi.mock('../bag-analytics', () => ({
  useBagAnalytics: () => mockStoreModule.getAnalyticsInstance(),
}))

// 也需要 mock storage 模块（bag-bridge.ts 内部使用 storage.setKV）
const { mockGetKV, mockSetKV } = vi.hoisted(() => {
  const kvStore: Record<string, any> = {}
  const mockGetKV = vi.fn((key: string, def: any) => kvStore[key] ?? def)
  const mockSetKV = vi.fn((key: string, val: any) => { kvStore[key] = val })
  return { mockGetKV, mockSetKV }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockGetKV(key, def),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

// ============================================================
// P22-2 行囊视图桥接
// ============================================================

describe('P22-2 行囊视图桥接', () => {
  let bridge: any

  // ---- 空状态 ----
  describe('空状态', () => {
    beforeEach(async () => {
      vi.resetModules()
      vi.clearAllMocks()
      setActivePinia(createPinia())

      const store = createMockStore(makeEmptyCategories())
      const analytics = createMockAnalytics()
      mockStoreModule.setStoreInstance(store)
      mockStoreModule.setAnalyticsInstance(analytics)

      const mod = await import('../bag-bridge')
      bridge = mod.useBagBridge()
    })

    describe('初始化与空状态', () => {
      it('初始化时 skillOverviews 为数组（空分类状态下含 7 个空分类条目）', () => {
        expect(Array.isArray(bridge.skillOverviews.value)).toBe(true)
        expect(bridge.skillOverviews.value.length).toBe(7)
      })

      it('初始化时 skillOverviews 中每个条目 itemCount 为 0', () => {
        bridge.skillOverviews.value.forEach((overview: any) => {
          expect(overview.itemCount).toBe(0)
        })
      })

      it('初始化时 bagHealth 显示空状态 totalItems 为 0', () => {
        expect(bridge.bagHealth.value.totalItems).toBe(0)
      })

      it('初始化时 bagHealth 平均熟练度为 0', () => {
        expect(bridge.bagHealth.value.avgProficiency).toBe(0)
      })

      it('初始化时 bagHealth 包含空状态建议', () => {
        const suggestions = bridge.bagHealth.value.suggestions
        expect(Array.isArray(suggestions)).toBe(true)
        expect(suggestions.length).toBeGreaterThan(0)
      })

      it('初始化时 radarData 为数组', () => {
        expect(Array.isArray(bridge.radarData.value)).toBe(true)
      })

      it('初始化时 growthTrendData 为空数组', () => {
        expect(Array.isArray(bridge.growthTrendData.value)).toBe(true)
        expect(bridge.growthTrendData.value.length).toBe(0)
      })

      it('初始化时 predictions 为数组', () => {
        expect(Array.isArray(bridge.predictions.value)).toBe(true)
      })

      it('初始化时 activePaths 为空数组', () => {
        expect(Array.isArray(bridge.activePaths.value)).toBe(true)
        expect(bridge.activePaths.value.length).toBe(0)
      })

      it('初始化时 recommendations 为数组', () => {
        expect(Array.isArray(bridge.recommendations.value)).toBe(true)
      })
    })
  })

  // ---- 正常数据状态 ----
  describe('正常数据状态', () => {
    beforeEach(async () => {
      vi.resetModules()
      vi.clearAllMocks()
      setActivePinia(createPinia())

      const store = createMockStore(makeTestCategories())
      const analytics = createMockAnalytics()
      mockStoreModule.setStoreInstance(store)
      mockStoreModule.setAnalyticsInstance(analytics)

      const mod = await import('../bag-bridge')
      bridge = mod.useBagBridge()
    })

    // ============================================================
    // 2. 技能概览
    // ============================================================
    describe('技能概览', () => {
      it('skillOverviews 反映 store 分类数据，数量为 7', () => {
        expect(bridge.skillOverviews.value.length).toBe(7)
      })

      it('skillOverviews 包含正确的 name 和 icon', () => {
        const names = bridge.skillOverviews.value.map((s: any) => s.name)
        expect(names).toContain('工具')
        expect(names).toContain('知识')
        const icons = bridge.skillOverviews.value.map((s: any) => s.icon)
        expect(icons).toContain('🛠')
        expect(icons).toContain('📚')
      })

      it('skillOverviews 包含正确的 proficiency', () => {
        const tool = bridge.skillOverviews.value.find((s: any) => s.name === '工具')
        expect(tool.proficiency).toBe(65)
        const knowledge = bridge.skillOverviews.value.find((s: any) => s.name === '知识')
        expect(knowledge.proficiency).toBe(85)
      })

      it('skillOverviews 包含正确的 itemCount', () => {
        const tool = bridge.skillOverviews.value.find((s: any) => s.name === '工具')
        expect(tool.itemCount).toBe(3)
        const knowledge = bridge.skillOverviews.value.find((s: any) => s.name === '知识')
        expect(knowledge.itemCount).toBe(5)
      })

      it('skillOverviews 包含 masteredCount（熟练度 >=80 的物品数）', () => {
        const tool = bridge.skillOverviews.value.find((s: any) => s.name === '工具')
        expect(tool.masteredCount).toBe(2)
        const knowledge = bridge.skillOverviews.value.find((s: any) => s.name === '知识')
        expect(knowledge.masteredCount).toBe(3)
      })

      it('skillOverviews 包含 categoryType', () => {
        bridge.skillOverviews.value.forEach((overview: any) => {
          expect(overview.categoryType).toBeDefined()
          expect(typeof overview.categoryType).toBe('string')
        })
      })

      it('skillOverviews 包含 growthDirection', () => {
        bridge.skillOverviews.value.forEach((overview: any) => {
          expect(overview.growthDirection).toBeDefined()
          expect(['up', 'down', 'stable']).toContain(overview.growthDirection)
        })
      })

      it('skillOverviews 包含 color', () => {
        bridge.skillOverviews.value.forEach((overview: any) => {
          expect(overview.color).toBeDefined()
          expect(typeof overview.color).toBe('string')
        })
      })
    })

    // ============================================================
    // 3. 行囊健康度
    // ============================================================
    describe('行囊健康度', () => {
      it('bagHealth 计算 totalItems 正确', () => {
        expect(bridge.bagHealth.value.totalItems).toBe(17)
      })

      it('bagHealth 计算 avgProficiency 在有效范围', () => {
        const avg = bridge.bagHealth.value.avgProficiency
        expect(avg).toBeGreaterThan(0)
        expect(avg).toBeLessThanOrEqual(100)
      })

      it('bagHealth 计算 masteredCount 正确', () => {
        expect(bridge.bagHealth.value.masteredCount).toBe(1)
      })

      it('bagHealth 计算 weakCount 正确', () => {
        expect(bridge.bagHealth.value.weakCount).toBe(1)
      })

      it('bagHealth 计算 diversity 在 0-1 之间', () => {
        const diversity = bridge.bagHealth.value.diversity
        expect(diversity).toBeGreaterThanOrEqual(0)
        expect(diversity).toBeLessThanOrEqual(1)
      })

      it('bagHealth score 在 0-100 之间', () => {
        const score = bridge.bagHealth.value.score
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      })

      it('bagHealth healthScore 在 0-100 之间', () => {
        const healthScore = bridge.bagHealth.value.healthScore
        expect(healthScore).toBeGreaterThanOrEqual(0)
        expect(healthScore).toBeLessThanOrEqual(100)
      })

      it('bagHealth 包含 topSkill', () => {
        const topSkill = bridge.bagHealth.value.topSkill
        expect(topSkill).not.toBeNull()
        expect(topSkill.name).toBe('知识')
        expect(topSkill.proficiency).toBe(85)
      })

      it('bagHealth 包含 weakestSkill', () => {
        const weakestSkill = bridge.bagHealth.value.weakestSkill
        expect(weakestSkill).not.toBeNull()
        expect(weakestSkill.name).toBe('技能')
        expect(weakestSkill.proficiency).toBe(25)
      })

      it('bagHealth 包含改善建议', () => {
        const suggestions = bridge.bagHealth.value.suggestions
        expect(Array.isArray(suggestions)).toBe(true)
        expect(suggestions.length).toBeGreaterThan(0)
      })
    })

    // ============================================================
    // 4. 雷达数据
    // ============================================================
    describe('雷达数据', () => {
      it('radarData 返回 SkillRadarData 数组', () => {
        expect(Array.isArray(bridge.radarData.value)).toBe(true)
        expect(bridge.radarData.value.length).toBe(7)
      })

      it('radarData 每个条目包含 category 和 proficiency', () => {
        bridge.radarData.value.forEach((radar: any) => {
          expect(radar.category).toBeDefined()
          expect(typeof radar.category).toBe('string')
          expect(typeof radar.proficiency).toBe('number')
        })
      })

      it('radarData 每个条目包含 label 和 itemCount', () => {
        bridge.radarData.value.forEach((radar: any) => {
          expect(radar.label).toBeDefined()
          expect(typeof radar.label).toBe('string')
          expect(typeof radar.itemCount).toBe('number')
        })
      })

      it('radarData 每个条目包含 change 字段', () => {
        bridge.radarData.value.forEach((radar: any) => {
          expect(radar.change).toBeDefined()
          expect(typeof radar.change).toBe('number')
        })
      })
    })

    // ============================================================
    // 5. 成长趋势
    // ============================================================
    describe('成长趋势', () => {
      it('growthTrendData 返回数组', () => {
        expect(Array.isArray(bridge.growthTrendData.value)).toBe(true)
      })
    })

    // ============================================================
    // 6. 熟练度预测
    // ============================================================
    describe('熟练度预测', () => {
      it('predictions 返回 ProficiencyPrediction 数组', () => {
        expect(Array.isArray(bridge.predictions.value)).toBe(true)
        expect(bridge.predictions.value.length).toBe(7)
      })

      it('predictions 每个条目包含 currentProficiency', () => {
        bridge.predictions.value.forEach((p: any) => {
          expect(p.currentProficiency).toBeDefined()
          expect(typeof p.currentProficiency).toBe('number')
        })
      })

      it('predictions 每个条目包含 predicted30Days 和 predicted90Days', () => {
        bridge.predictions.value.forEach((p: any) => {
          expect(p.predicted30Days).toBeDefined()
          expect(p.predicted90Days).toBeDefined()
        })
      })

      it('predictions 每个条目包含 dailyGrowthRate', () => {
        bridge.predictions.value.forEach((p: any) => {
          expect(p.dailyGrowthRate).toBeDefined()
          expect(typeof p.dailyGrowthRate).toBe('number')
        })
      })

      it('predictions 每个条目包含 daysTo80', () => {
        bridge.predictions.value.forEach((p: any) => {
          expect(p.daysTo80).toBeDefined()
        })
      })
    })

    // ============================================================
    // 7. 技能推荐
    // ============================================================
    describe('技能推荐', () => {
      it('recommendations 返回 BagRecommendation 数组', () => {
        const recs = bridge.recommendations.value
        expect(Array.isArray(recs)).toBe(true)
      })

      it('recommendations 包含关注薄弱技能推荐（高优先级）', () => {
        const recs = bridge.recommendations.value
        const hasWeaknessFocus = recs.some((r: any) => r.type === 'focus_weakness' && r.priority === 'high')
        expect(hasWeaknessFocus).toBe(true)
      })

      it('recommendations 按优先级排序（high > medium > low）', () => {
        const recs = bridge.recommendations.value
        const order = { high: 0, medium: 1, low: 2 }
        for (let i = 1; i < recs.length; i++) {
          expect(order[recs[i - 1].priority as keyof typeof order]).toBeLessThanOrEqual(order[recs[i].priority as keyof typeof order])
        }
      })

      it('recommendations 每个条目包含 expectedBenefit', () => {
        bridge.recommendations.value.forEach((r: any) => {
          expect(r.expectedBenefit).toBeDefined()
          expect(typeof r.expectedBenefit).toBe('string')
        })
      })

      it('recommendations 每个条目包含 type 和 priority', () => {
        bridge.recommendations.value.forEach((r: any) => {
          expect(r.type).toBeDefined()
          expect(r.priority).toBeDefined()
          expect(['high', 'medium', 'low']).toContain(r.priority)
        })
      })
    })

    // ============================================================
    // 8. 操作入口 - addItem
    // ============================================================
    describe('操作入口 - addItem', () => {
      it('addItem 向已有分类添加物品返回 true', () => {
        const result = bridge.addItem('tools', 'Figma', 50, '设计工具')
        expect(result).toBe(true)
      })

      it('addItem 向不存在的分类添加物品返回 false', () => {
        const result = bridge.addItem('nonexistent', 'Test', 50)
        expect(result).toBe(false)
      })

      it('addItem 添加物品后分类物品数增加', () => {
        bridge.addItem('tools', 'Figma', 50)
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool).toBeDefined()
        expect(tool.items.some((i: any) => i.name === 'Figma')).toBe(true)
      })

      it('addItem 熟练度会被 clamp 到 1-100 范围', () => {
        bridge.addItem('tools', 'LowItem', 0, 'note')
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        const lowItem = tool.items.find((i: any) => i.name === 'LowItem')
        expect(lowItem.proficiency).toBe(1)
      })
    })

    // ============================================================
    // 9. 操作入口 - updateProficiency
    // ============================================================
    describe('操作入口 - updateProficiency', () => {
      it('updateProficiency 更新分类熟练度返回 true', () => {
        const result = bridge.updateProficiency('tools', 72)
        expect(result).toBe(true)
      })

      it('updateProficiency 以 5 为步长四舍五入（72 -> 70）', () => {
        bridge.updateProficiency('tools', 72)
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(70)
      })

      it('updateProficiency 步长向上取整（73 -> 75）', () => {
        bridge.updateProficiency('tools', 73)
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(75)
      })

      it('updateProficiency 边界值 0', () => {
        bridge.updateProficiency('tools', -10)
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(0)
      })

      it('updateProficiency 边界值 100', () => {
        bridge.updateProficiency('tools', 150)
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(100)
      })

      it('updateProficiency 不存在的分类返回 false', () => {
        const result = bridge.updateProficiency('nonexistent', 50)
        expect(result).toBe(false)
      })
    })

    // ============================================================
    // 10. 操作入口 - recordGrowthPoint
    // ============================================================
    describe('操作入口 - recordGrowthPoint', () => {
      it('recordGrowthPoint 记录成长趋势不抛出异常', () => {
        expect(() => bridge.recordGrowthPoint()).not.toThrow()
      })

      it('recordGrowthPoint 记录后 analytics 内部状态更新', () => {
        bridge.recordGrowthPoint()
        expect(bridge.analytics.growthTrend.value.length).toBeGreaterThanOrEqual(1)
      })
    })

    // ============================================================
    // 11. 操作入口 - createLearningPath
    // ============================================================
    describe('操作入口 - createLearningPath', () => {
      it('createLearningPath 创建学习路径返回 LearningPath 对象', () => {
        const path = bridge.createLearningPath('学习 Vue3', '掌握 Vue3 组合式 API', 'framework')
        expect(path).toBeDefined()
        expect(path.name).toBe('学习 Vue3')
        expect(path.description).toBe('掌握 Vue3 组合式 API')
        expect(path.targetCategory).toBe('framework')
      })

      it('createLearningPath 创建的路径包含 id', () => {
        const path = bridge.createLearningPath('测试路径', '描述', 'tool')
        expect(path.id).toBeDefined()
        expect(typeof path.id).toBe('string')
        expect(path.id.startsWith('lp_')).toBe(true)
      })

      it('创建学习路径后 activePaths 包含该路径', () => {
        bridge.createLearningPath('测试路径', '描述', 'tool')
        expect(bridge.analytics.activePaths.value.length).toBeGreaterThanOrEqual(1)
      })

      it('创建的路径默认为未完成', () => {
        const path = bridge.createLearningPath('测试路径', '描述', 'tool')
        expect(path.completed).toBe(false)
        expect(path.currentStep).toBe(0)
      })
    })

    // ============================================================
    // 12. 子模块直通
    // ============================================================
    describe('子模块直通', () => {
      it('bridge 暴露 store 子模块', () => {
        expect(bridge.store).toBeDefined()
        expect(bridge.store.categories).toBeDefined()
      })

      it('bridge 暴露 analytics 子模块', () => {
        expect(bridge.analytics).toBeDefined()
        expect(bridge.analytics.calculateSkillRadar).toBeDefined()
        expect(bridge.analytics.calculateSkillHealth).toBeDefined()
        expect(bridge.analytics.predictProficiency).toBeDefined()
      })

      it('bridge 暴露的操作函数是函数类型', () => {
        expect(typeof bridge.addItem).toBe('function')
        expect(typeof bridge.updateProficiency).toBe('function')
        expect(typeof bridge.recordGrowthPoint).toBe('function')
        expect(typeof bridge.createLearningPath).toBe('function')
      })
    })

    // ============================================================
    // 13. 完整工作流
    // ============================================================
    describe('完整工作流', () => {
      it('添加物品 → 更新熟练度 → 记录成长 → 创建路径完整流程', () => {
        const added = bridge.addItem('tools', 'WebStorm', 55, 'IDE 工具')
        expect(added).toBe(true)

        const updated = bridge.updateProficiency('tools', 80)
        expect(updated).toBe(true)
        const tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(80)

        expect(() => bridge.recordGrowthPoint()).not.toThrow()
        expect(bridge.analytics.growthTrend.value.length).toBeGreaterThanOrEqual(1)

        const path = bridge.createLearningPath('TypeScript 进阶', '掌握高级类型', 'framework')
        expect(path).toBeDefined()
        expect(path.name).toBe('TypeScript 进阶')

        expect(bridge.analytics.activePaths.value.length).toBeGreaterThanOrEqual(1)
      })

      it('多次更新熟练度验证步长舍入', () => {
        bridge.updateProficiency('tools', 72)
        let tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(70)

        bridge.updateProficiency('tools', 73)
        tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(75)

        bridge.updateProficiency('tools', 100)
        tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(100)

        bridge.updateProficiency('tools', 0)
        tool = bridge.store.savedCategories.find((c: any) => c.id === 'tools')
        expect(tool.proficiency).toBe(0)
      })
    })
  })
})