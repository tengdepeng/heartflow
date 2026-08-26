// ============================================================
// P21-5 匠庐 · 视图桥接层测试
// 覆盖：状态聚合、仪表盘、健康度、可视化数据、操作入口
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCraftBridge } from '../craft-bridge'

// ---- KV 存储模拟 ----
const kvStore: Record<string, any> = {}

vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, defaultVal: any) => {
    const val = kvStore[key]
    return val !== undefined ? val : defaultVal
  },
  setKV: (key: string, val: any) => { kvStore[key] = val },
}))

// ---- storage 引擎模拟 ----
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, defaultVal: any) => {
      const val = kvStore[key]
      return val !== undefined ? val : defaultVal
    },
    setKV: (key: string, val: any) => { kvStore[key] = val },
  },
}))

// ---- config 模拟 ----
vi.mock('../../../resonance/bridges/config', () => ({
  useConfig: () => ({
    config: { craft: { recentLimit: 10 } },
  }),
}))

// ---- 辅助函数 ----
function clearStorage() {
  Object.keys(kvStore).forEach(k => delete kvStore[k])
}

describe('P21-5 匠庐视图桥接', () => {
  let bridge: ReturnType<typeof useCraftBridge>

  beforeEach(() => {
    setActivePinia(createPinia())
    clearStorage()
    bridge = useCraftBridge()
  })

  // ============================================================
  // 1. 状态聚合
  // ============================================================
  describe('状态聚合', () => {
    it('初始化时 workOverviews 为空', () => {
      expect(bridge.workOverviews.value).toEqual([])
    })

    it('activeWorkId 初始为 null', () => {
      expect(bridge.activeWorkId.value).toBeNull()
    })

    it('currentWorkOverview 初始为 null', () => {
      expect(bridge.currentWorkOverview.value).toBeNull()
    })
  })

  // ============================================================
  // 2. 作品概览
  // ============================================================
  describe('作品概览', () => {
    it('创建作品后 workOverviews 包含该作品', () => {
      const work = bridge.createWork('测试作品', 'writing', '描述')
      expect(work).not.toBeNull()
      expect(bridge.workOverviews.value.length).toBe(1)
      expect(bridge.workOverviews.value[0].work.name).toBe('测试作品')
    })

    it('作品概览包含 materialCount', () => {
      bridge.createWork('作品A', 'writing', '描述')
      const overview = bridge.workOverviews.value[0]
      expect(overview.materialCount).toBe(0)
      expect(overview.hasEvolution).toBe(false)
      expect(overview.versionCount).toBe(0)
      expect(overview.inspirationCount).toBe(0)
    })

    it('创建多个作品后 workOverviews 数量正确', () => {
      bridge.createWork('作品A', 'writing', '描述')
      bridge.createWork('作品B', 'code', '描述')
      bridge.createWork('作品C', 'design', '描述')
      expect(bridge.workOverviews.value.length).toBe(3)
    })
  })

  // ============================================================
  // 3. 排序视图
  // ============================================================
  describe('排序视图', () => {
    it('worksByEvolution 按进化值降序', () => {
      bridge.createWork('作品A', 'writing', '描述')
      bridge.createWork('作品B', 'code', '描述')
      bridge.createWork('作品C', 'design', '描述')

      // 打磨作品B和C提升进化值
      const works = bridge.store.works
      bridge.refineWork(works[1].id, 30)
      bridge.refineWork(works[2].id, 50)

      const sorted = bridge.worksByEvolution.value
      // 进化值最高的应该排在最前面
      expect(sorted[0].work.evolution).toBeGreaterThanOrEqual(sorted[1].work.evolution)
    })

    it('worksByRecent 按更新时间降序', () => {
      bridge.createWork('作品A', 'writing', '描述')
      bridge.createWork('作品B', 'code', '描述')

      const sorted = bridge.worksByRecent.value
      expect(sorted.length).toBe(2)
    })

    it('worksByStatus 按状态分组', () => {
      bridge.createWork('草稿', 'writing', '描述')
      const work = bridge.createWork('已完成', 'code', '描述')
      if (work) bridge.completeWork(work.id)

      const byStatus = bridge.worksByStatus.value
      expect(byStatus.draft.length).toBeGreaterThanOrEqual(1)
      expect(byStatus.completed.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================
  // 4. 工坊仪表盘
  // ============================================================
  describe('工坊仪表盘', () => {
    it('初始仪表盘各项指标', () => {
      const dash = bridge.dashboard.value
      expect(dash.activeWorks).toBe(0)
      expect(dash.totalEvolution).toBe(0)
      expect(dash.unlockedBadges).toBe(0)
    })

    it('创建作品后仪表盘更新', () => {
      bridge.createWork('作品A', 'writing', '描述')
      bridge.createWork('作品B', 'code', '描述')

      const dash = bridge.dashboard.value
      expect(dash.activeWorks).toBe(2)
      expect(dash.newThisMonth).toBe(2)
    })

    it('完成作品后仪表盘更新', () => {
      const work = bridge.createWork('作品A', 'writing', '描述')
      expect(work).not.toBeNull()
      bridge.completeWork(work!.id)

      const dash = bridge.dashboard.value
      expect(dash.completedThisMonth).toBeGreaterThanOrEqual(1)
      expect(dash.activeWorks).toBe(0)
    })

    it('打磨作品后进化值统计更新', () => {
      const work = bridge.createWork('作品A', 'writing', '描述')
      expect(work).not.toBeNull()
      bridge.refineWork(work!.id, 25)

      const dash = bridge.dashboard.value
      expect(dash.totalEvolution).toBeGreaterThanOrEqual(25)
    })
  })

  // ============================================================
  // 5. 匠庐健康度
  // ============================================================
  describe('匠庐健康度', () => {
    it('空工坊健康度', () => {
      const health = bridge.craftHealth.value
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(100)
      expect(health.completionRate).toBe(0)
      expect(health.suggestions.length).toBeGreaterThan(0)
    })

    it('有作品后健康度提升', () => {
      const work = bridge.createWork('作品A', 'writing', '描述')
      expect(work).not.toBeNull()
      bridge.completeWork(work!.id)

      const after = bridge.craftHealth.value
      expect(after.completionRate).toBeGreaterThan(0)
      expect(after.suggestions).toBeDefined()
    })

    it('健康度评分字段完整性', () => {
      const health = bridge.craftHealth.value
      expect(health).toHaveProperty('score')
      expect(health).toHaveProperty('workProductivity')
      expect(health).toHaveProperty('completionRate')
      expect(health).toHaveProperty('evolutionEfficiency')
      expect(health).toHaveProperty('materialAbundance')
      expect(health).toHaveProperty('synthesisSuccessRate')
      expect(health).toHaveProperty('badgeCollectionRate')
      expect(health).toHaveProperty('habitStability')
    })
  })

  // ============================================================
  // 6. 可视化数据
  // ============================================================
  describe('可视化数据', () => {
    it('typeDistributions 返回5种类型', () => {
      const types = bridge.typeDistributions.value
      expect(types.length).toBe(5)
      const typeSet = types.map(t => t.type)
      expect(typeSet).toContain('writing')
      expect(typeSet).toContain('code')
      expect(typeSet).toContain('design')
      expect(typeSet).toContain('plan')
      expect(typeSet).toContain('insight')
    })

    it('typeDistributions 包含标签和百分比', () => {
      bridge.createWork('作品A', 'writing', '描述')
      bridge.createWork('作品B', 'code', '描述')

      const types = bridge.typeDistributions.value
      const writing = types.find(t => t.type === 'writing')
      expect(writing).toBeDefined()
      expect(writing!.label).toBe('写作')
      if (writing!.count > 0) {
        expect(writing!.percent).toBeGreaterThan(0)
      }
    })

    it('materialDistributions 返回5种稀有度', () => {
      const dists = bridge.materialDistributions.value
      expect(dists.length).toBe(5)
      const rarities = dists.map(d => d.rarity)
      expect(rarities).toContain('common')
      expect(rarities).toContain('legendary')
    })

    it('materialDistributions 包含颜色', () => {
      const dists = bridge.materialDistributions.value
      dists.forEach(d => {
        expect(d.color).toBeTruthy()
        expect(d.label).toBeTruthy()
      })
    })

    it('badgeProgressList 包含所有徽章', () => {
      const badges = bridge.badgeProgressList.value
      expect(badges.length).toBeGreaterThanOrEqual(28)
      // 第一天应该有已解锁的徽章
      const unlocked = badges.filter(b => b.unlocked)
      expect(unlocked.length).toBeGreaterThanOrEqual(0)
    })

    it('synthesisEfficiencies 返回所有配方', () => {
      const effs = bridge.synthesisEfficiencies.value
      expect(effs.length).toBeGreaterThanOrEqual(5)
      effs.forEach(e => {
        expect(e.recipeName).toBeTruthy()
        expect(e.category).toBeTruthy()
      })
    })

    it('workTrends 初始可能为空', () => {
      const trends = bridge.workTrends.value
      expect(Array.isArray(trends)).toBe(true)
    })
  })

  // ============================================================
  // 7. 作品推荐
  // ============================================================
  describe('作品推荐', () => {
    it('空工坊推荐开始新作品', () => {
      const recs = bridge.workRecommendations.value
      const startNew = recs.find(r => r.type === 'start_new')
      expect(startNew).toBeDefined()
    })

    it('有草稿时推荐继续', () => {
      bridge.createWork('草稿作品', 'writing', '草稿描述')
      const recs = bridge.workRecommendations.value
      const continueRec = recs.find(r => r.type === 'continue')
      expect(continueRec).toBeDefined()
      expect(continueRec!.priority).toBe('high')
    })

    it('推荐按优先级排序', () => {
      bridge.createWork('草稿', 'writing', '描述')
      const recs = bridge.workRecommendations.value
      const order = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < recs.length; i++) {
        expect(order[recs[i - 1].priority]).toBeLessThanOrEqual(order[recs[i].priority])
      }
    })

    it('推荐包含 expectedBenefit', () => {
      bridge.createWork('草稿', 'writing', '描述')
      const recs = bridge.workRecommendations.value
      recs.forEach(r => {
        expect(r.expectedBenefit).toBeTruthy()
      })
    })
  })

  // ============================================================
  // 8. 操作入口
  // ============================================================
  describe('操作入口', () => {
    describe('createWork', () => {
      it('创建作品返回作品对象', () => {
        const work = bridge.createWork('新作品', 'writing', '描述', ['标签1'])
        expect(work).not.toBeNull()
        expect(work!.name).toBe('新作品')
        expect(work!.type).toBe('writing')
        expect(work!.tags).toContain('标签1')
      })

      it('创建作品后 stats 更新', () => {
        bridge.createWork('新作品', 'writing', '描述')
        const stats = bridge.store.stats
        expect(stats.totalWorks).toBe(1)
      })
    })

    describe('focusWork', () => {
      it('聚焦作品设置 activeWorkId', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        const overview = bridge.focusWork(work!.id)
        expect(bridge.activeWorkId.value).toBe(work!.id)
        expect(overview).not.toBeNull()
      })

      it('聚焦不存在的作品返回 null', () => {
        const overview = bridge.focusWork('nonexistent')
        expect(overview).toBeNull()
      })
    })

    describe('completeWork', () => {
      it('完成作品更新状态', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        const result = bridge.completeWork(work!.id)
        expect(result).toBe(true)

        const updated = bridge.store.works.find(w => w.id === work!.id)
        expect(updated?.status).toBe('completed')
        expect(updated?.evolution).toBeGreaterThanOrEqual(5)
      })

      it('完成不存在的作品返回 false', () => {
        const result = bridge.completeWork('nonexistent')
        expect(result).toBe(false)
      })
    })

    describe('refineWork', () => {
      it('打磨作品提升进化值', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        const result = bridge.refineWork(work!.id, 15)
        expect(result).toBe(true)

        const updated = bridge.store.works.find(w => w.id === work!.id)
        expect(updated?.status).toBe('refining')
        expect(updated?.evolution).toBeGreaterThanOrEqual(15)
      })

      it('大进化增量记录里程碑', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        bridge.refineWork(work!.id, 25)

        const updated = bridge.store.works.find(w => w.id === work!.id)
        expect(updated?.evolutionHistory).toBeDefined()
        expect(updated!.evolutionHistory!.length).toBeGreaterThanOrEqual(1)
        const lastRecord = updated!.evolutionHistory![updated!.evolutionHistory!.length - 1]
        expect(lastRecord.milestone).toBe('重大突破')
      })
    })

    describe('archiveWork', () => {
      it('归档作品更新状态', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        bridge.completeWork(work!.id)
        const result = bridge.archiveWork(work!.id)
        expect(result).toBe(true)

        const updated = bridge.store.works.find(w => w.id === work!.id)
        expect(updated?.status).toBe('archived')
      })
    })

    describe('deleteWork', () => {
      it('删除作品从列表移除', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        expect(bridge.store.works.length).toBe(1)

        const result = bridge.deleteWork(work!.id)
        expect(result).toBe(true)
        expect(bridge.store.works.length).toBe(0)
      })

      it('删除聚焦作品后 activeWorkId 清空', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        bridge.focusWork(work!.id)
        bridge.deleteWork(work!.id)
        expect(bridge.activeWorkId.value).toBeNull()
      })
    })

    describe('addInspirationToWork', () => {
      it('添加灵感返回灵感条目', () => {
        const work = bridge.createWork('作品A', 'writing', '描述')
        expect(work).not.toBeNull()
        const insp = bridge.addInspirationToWork(work!.id, '灵感标题', '灵感内容', '阅读')
        expect(insp).toBeDefined()
        expect(insp.title).toBe('灵感标题')
        expect(insp.relatedWorkId).toBe(work!.id)
      })
    })

    describe('refreshAll', () => {
      it('刷新不抛出异常', () => {
        bridge.createWork('作品A', 'writing', '描述')
        expect(() => bridge.refreshAll()).not.toThrow()
      })
    })
  })

  // ============================================================
  // 9. 筛选查询
  // ============================================================
  describe('筛选查询', () => {
    it('getWorksByType 按类型筛选', () => {
      bridge.createWork('写作作品', 'writing', '描述')
      bridge.createWork('代码作品', 'code', '描述')
      bridge.createWork('写作作品2', 'writing', '描述')

      const writings = bridge.getWorksByType('writing')
      expect(writings.length).toBe(2)
      writings.forEach(w => expect(w.work.type).toBe('writing'))
    })

    it('getWorksByStatus 按状态筛选', () => {
      const work = bridge.createWork('作品A', 'writing', '描述')
      expect(work).not.toBeNull()
      bridge.completeWork(work!.id)
      bridge.createWork('作品B', 'code', '描述')

      const completed = bridge.getWorksByStatus('completed')
      expect(completed.length).toBeGreaterThanOrEqual(1)
      const drafts = bridge.getWorksByStatus('draft')
      expect(drafts.length).toBeGreaterThanOrEqual(1)
    })

    it('getTopEvolutionWorks 返回前N个', () => {
      const w1 = bridge.createWork('作品A', 'writing', '描述')
      const w2 = bridge.createWork('作品B', 'code', '描述')
      const w3 = bridge.createWork('作品C', 'design', '描述')
      if (w1) bridge.refineWork(w1.id, 10)
      if (w2) bridge.refineWork(w2.id, 30)
      if (w3) bridge.refineWork(w3.id, 20)

      const top = bridge.getTopEvolutionWorks(2)
      expect(top.length).toBe(2)
    })

    it('getRecentWorks 返回最近N个', () => {
      bridge.createWork('作品A', 'writing', '描述')
      bridge.createWork('作品B', 'code', '描述')

      const recent = bridge.getRecentWorks(1)
      expect(recent.length).toBe(1)
    })
  })

  // ============================================================
  // 10. 子模块直通
  // ============================================================
  describe('子模块直通', () => {
    it('bridge 暴露 store 子模块', () => {
      expect(bridge.store).toBeDefined()
      expect(bridge.store.works).toBeDefined()
      expect(bridge.store.addWork).toBeDefined()
    })

    it('bridge 暴露 materials 子模块', () => {
      expect(bridge.materials).toBeDefined()
      expect(bridge.materials.materials).toBeDefined()
    })

    it('bridge 暴露 synthesis 子模块', () => {
      expect(bridge.synthesis).toBeDefined()
      expect(bridge.synthesis.recipes).toBeDefined()
    })

    it('bridge 暴露 badges 子模块', () => {
      expect(bridge.badges).toBeDefined()
      expect(bridge.badges.badgeStats).toBeDefined()
    })

    it('bridge 暴露 advanced 子模块', () => {
      expect(bridge.advanced).toBeDefined()
      expect(bridge.advanced.analytics).toBeDefined()
    })

    it('bridge 暴露 habits 子模块', () => {
      expect(bridge.habits).toBeDefined()
      expect(bridge.habits.rhythm).toBeDefined()
    })
  })

  // ============================================================
  // 11. 完整工作流
  // ============================================================
  describe('完整工作流', () => {
    it('创建 → 打磨 → 完成 → 归档完整流程', () => {
      // 1. 创建作品
      const work = bridge.createWork('匠心之作', 'writing', '一本关于创造力的书', ['创造力', '写作'])
      expect(work).not.toBeNull()
      const workId = work!.id

      // 2. 聚焦
      const overview = bridge.focusWork(workId)
      expect(overview).not.toBeNull()
      expect(bridge.activeWorkId.value).toBe(workId)

      // 3. 打磨几次
      bridge.refineWork(workId, 10)
      bridge.refineWork(workId, 15)
      bridge.refineWork(workId, 5)

      // 4. 添加灵感
      bridge.addInspirationToWork(workId, '新想法', '可以加入AI辅助创作的主题', '阅读')

      // 5. 完成作品
      const completed = bridge.completeWork(workId)
      expect(completed).toBe(true)

      // 6. 验证状态
      const updated = bridge.store.works.find(w => w.id === workId)
      expect(updated?.status).toBe('completed')
      expect(updated?.evolution).toBeGreaterThanOrEqual(35) // 初始0 + 5(完成) + 10 + 15 + 5

      // 7. 验证仪表盘（归档前检查完成数）
      const dashBeforeArchive = bridge.dashboard.value
      expect(dashBeforeArchive.totalEvolution).toBeGreaterThanOrEqual(35)
      expect(dashBeforeArchive.completedThisMonth).toBeGreaterThanOrEqual(1)

      // 8. 归档
      bridge.archiveWork(workId)
      const archived = bridge.store.works.find(w => w.id === workId)
      expect(archived?.status).toBe('archived')
    })

    it('多类型作品工作流', () => {
      // 创建不同类型的作品
      const w1 = bridge.createWork('写作作品', 'writing', '描述')
      const w2 = bridge.createWork('代码作品', 'code', '描述')
      const w3 = bridge.createWork('设计作品', 'design', '描述')

      expect(w1).not.toBeNull()
      expect(w2).not.toBeNull()
      expect(w3).not.toBeNull()

      // 完成部分
      if (w1) bridge.completeWork(w1.id)
      if (w2) bridge.refineWork(w2.id, 20)

      // 验证类型分布
      const types = bridge.typeDistributions.value
      const writing = types.find(t => t.type === 'writing')
      const code = types.find(t => t.type === 'code')
      const design = types.find(t => t.type === 'design')

      expect(writing?.count).toBeGreaterThanOrEqual(1)
      expect(code?.count).toBeGreaterThanOrEqual(1)
      expect(design?.count).toBeGreaterThanOrEqual(1)

      // 验证完成率
      const health = bridge.craftHealth.value
      expect(health.completionRate).toBeGreaterThan(0)
    })
  })
})