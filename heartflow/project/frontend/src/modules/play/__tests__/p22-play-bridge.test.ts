// ============================================================
// P22-5 逸趣阁 · 视图桥接层测试
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('P22-5 逸趣阁视图桥接', () => {
  let bridge: any

  beforeEach(async () => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()

    // 动态导入以获取新的模块实例
    const mod = await import('../play-bridge')
    bridge = mod.usePlayBridge()
  })

  // ============================================================
  // 1. 初始化验证
  // ============================================================
  describe('初始化验证', () => {
    it('games 初始为数组', () => {
      expect(Array.isArray(bridge.games.value)).toBe(true)
    })

    it('toys 初始为数组', () => {
      expect(Array.isArray(bridge.toys.value)).toBe(true)
    })

    it('models 初始为数组', () => {
      expect(Array.isArray(bridge.models.value)).toBe(true)
    })

    it('others 初始为数组', () => {
      expect(Array.isArray(bridge.others.value)).toBe(true)
    })

    it('playSummary 初始有值', () => {
      const summary = bridge.playSummary.value
      expect(summary).toBeDefined()
      expect(summary.totalGames).toBe(0)
      expect(summary.totalHours).toBe(0)
      expect(summary.totalToys).toBe(0)
      expect(summary.totalModels).toBe(0)
      expect(summary.totalOthers).toBe(0)
      expect(summary.totalItems).toBe(0)
    })

    it('allSeeds 初始为空数组', () => {
      expect(Array.isArray(bridge.allSeeds.value)).toBe(true)
      expect(bridge.allSeeds.value.length).toBe(0)
    })
  })

  // ============================================================
  // 2. 游玩摘要
  // ============================================================
  describe('游玩摘要', () => {
    it('添加游戏后 playSummary 的 totalGames 更新', () => {
      bridge.gameForm.name = '测试游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 50
      bridge.addGame()
      expect(bridge.playSummary.value.totalGames).toBe(1)
      expect(bridge.playSummary.value.totalHours).toBe(50)
    })

    it('avgHoursPerGame 计算正确', () => {
      bridge.gameForm.name = '游戏A'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 30
      bridge.addGame()
      bridge.gameForm.name = '游戏B'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 70
      bridge.addGame()
      expect(bridge.playSummary.value.avgHoursPerGame).toBe(50)
    })

    it('topPlatform 返回时长最多的平台', () => {
      bridge.gameForm.name = '游戏A'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 100
      bridge.addGame()
      bridge.gameForm.name = '游戏B'
      bridge.gameForm.platform = 'Switch'
      bridge.gameForm.hours = 30
      bridge.addGame()
      expect(bridge.playSummary.value.topPlatform).toBe('PC')
    })

    it('topGame 返回时长最多的游戏', () => {
      bridge.gameForm.name = '塞尔达'
      bridge.gameForm.platform = 'Switch'
      bridge.gameForm.hours = 200
      bridge.addGame()
      bridge.gameForm.name = '星露谷'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 50
      bridge.addGame()
      expect(bridge.playSummary.value.topGame).toBe('塞尔达')
    })

    it('添加玩具和模型后 totalItems 正确', () => {
      bridge.gameForm.name = '游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 10
      bridge.addGame()
      bridge.toyForm.name = '玩具'
      bridge.toyForm.value = 'mint'
      bridge.addToy()
      bridge.modelForm.name = '模型'
      bridge.modelForm.series = '高达'
      bridge.modelForm.status = 'display'
      bridge.addModel()
      expect(bridge.playSummary.value.totalItems).toBe(3)
      expect(bridge.playSummary.value.totalToys).toBe(1)
      expect(bridge.playSummary.value.totalModels).toBe(1)
    })
  })

  // ============================================================
  // 3. 画廊统计
  // ============================================================
  describe('画廊统计', () => {
    it('galleryStats 包含 monthlyStats', () => {
      expect(bridge.galleryStats.value.monthlyStats).toBeDefined()
      expect(Array.isArray(bridge.galleryStats.value.monthlyStats)).toBe(true)
    })

    it('galleryStats 包含 distBuckets', () => {
      expect(bridge.galleryStats.value.distBuckets).toBeDefined()
      expect(bridge.galleryStats.value.distBuckets.lt10).toBe(0)
    })

    it('galleryStats 包含 recentItems', () => {
      expect(bridge.galleryStats.value.recentItems).toBeDefined()
      expect(Array.isArray(bridge.galleryStats.value.recentItems)).toBe(true)
    })

    it('galleryStats.isEmpty 初始为 true', () => {
      expect(bridge.galleryStats.value.isEmpty).toBe(true)
    })

    it('添加游戏后 isEmpty 变为 false', () => {
      bridge.gameForm.name = '测试游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 10
      bridge.addGame()
      expect(bridge.galleryStats.value.isEmpty).toBe(false)
    })

    it('添加游戏后 distBuckets 更新', () => {
      bridge.gameForm.name = '小游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 5
      bridge.addGame()
      expect(bridge.galleryStats.value.distBuckets.lt10).toBe(1)
    })
  })

  // ============================================================
  // 4. 里程碑
  // ============================================================
  describe('里程碑', () => {
    it('milestones 返回数组', () => {
      expect(Array.isArray(bridge.milestones.value)).toBe(true)
      expect(bridge.milestones.value.length).toBeGreaterThan(0)
    })

    it('里程碑包含已解锁和未解锁状态', () => {
      const ms = bridge.milestones.value
      const unlocked = ms.filter((m: any) => m.unlocked)
      const locked = ms.filter((m: any) => m.unlocked === false)
      expect(unlocked.length + locked.length).toBe(ms.length)
    })

    it('每个里程碑包含必要字段', () => {
      const ms = bridge.milestones.value
      for (const m of ms) {
        expect(m.id).toBeDefined()
        expect(m.category).toBeDefined()
        expect(m.title).toBeDefined()
        expect(m.description).toBeDefined()
        expect(m.threshold).toBeGreaterThan(0)
        expect(m.current).toBeGreaterThanOrEqual(0)
        expect(typeof m.unlocked).toBe('boolean')
        expect(m.rarity).toBeDefined()
      }
    })

    it('大量游戏时长后解锁对应里程碑', () => {
      bridge.gameForm.name = '超长游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 200
      bridge.addGame()
      const unlocked = bridge.milestones.value.filter((m: any) => m.unlocked)
      expect(unlocked.length).toBeGreaterThan(0)
      const hoursMilestone = unlocked.find((m: any) => m.category === 'hours')
      expect(hoursMilestone).toBeDefined()
    })
  })

  // ============================================================
  // 5. 游玩趋势
  // ============================================================
  describe('游玩趋势', () => {
    it('playTrend 包含 monthlyHours', () => {
      expect(bridge.playTrend.value.monthlyHours).toBeDefined()
      expect(Array.isArray(bridge.playTrend.value.monthlyHours)).toBe(true)
    })

    it('playTrend 包含 monthlyAdditions', () => {
      expect(bridge.playTrend.value.monthlyAdditions).toBeDefined()
      expect(Array.isArray(bridge.playTrend.value.monthlyAdditions)).toBe(true)
    })

    it('playTrend 包含 platformTrend', () => {
      expect(bridge.playTrend.value.platformTrend).toBeDefined()
      expect(Array.isArray(bridge.playTrend.value.platformTrend)).toBe(true)
    })

    it('playTrend 包含 categoryTrend', () => {
      expect(bridge.playTrend.value.categoryTrend).toBeDefined()
      expect(Array.isArray(bridge.playTrend.value.categoryTrend)).toBe(true)
    })

    it('添加游戏后 monthlyHours 有当月数据', () => {
      bridge.gameForm.name = '当月游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 30
      bridge.addGame()
      const monthlyHours = bridge.playTrend.value.monthlyHours
      const currentMonth = monthlyHours.find((m: any) => m.hours > 0)
      expect(currentMonth).toBeDefined()
    })
  })

  // ============================================================
  // 6. 时间投资回报
  // ============================================================
  describe('时间投资回报', () => {
    it('timeROI 包含 hoursDistribution', () => {
      expect(bridge.timeROI.value.hoursDistribution).toBeDefined()
      expect(Array.isArray(bridge.timeROI.value.hoursDistribution)).toBe(true)
    })

    it('timeROI 包含 platformEfficiency', () => {
      expect(bridge.timeROI.value.platformEfficiency).toBeDefined()
      expect(Array.isArray(bridge.timeROI.value.platformEfficiency)).toBe(true)
    })

    it('timeROI 包含 mostEngaging', () => {
      expect(bridge.timeROI.value.mostEngaging).toBeDefined()
      expect(Array.isArray(bridge.timeROI.value.mostEngaging)).toBe(true)
    })

    it('timeROI 包含 suggestions 建议', () => {
      expect(bridge.timeROI.value.suggestions).toBeDefined()
      expect(Array.isArray(bridge.timeROI.value.suggestions)).toBe(true)
    })

    it('空状态时有小时数较少的建议', () => {
      const suggestions = bridge.timeROI.value.suggestions
      const hasTip = suggestions.some((s: string) => s.includes('游戏时间较少'))
      expect(hasTip).toBe(true)
    })
  })

  // ============================================================
  // 7. 收藏热度
  // ============================================================
  describe('收藏热度', () => {
    it('collectionHeatmap 包含 byYear', () => {
      expect(bridge.collectionHeatmap.value.byYear).toBeDefined()
      expect(Array.isArray(bridge.collectionHeatmap.value.byYear)).toBe(true)
    })

    it('collectionHeatmap 包含 byQuarter', () => {
      expect(bridge.collectionHeatmap.value.byQuarter).toBeDefined()
      expect(Array.isArray(bridge.collectionHeatmap.value.byQuarter)).toBe(true)
    })

    it('collectionHeatmap 包含 peakPeriod', () => {
      expect(bridge.collectionHeatmap.value.peakPeriod).toBeDefined()
      expect(bridge.collectionHeatmap.value.peakPeriod.period).toBeDefined()
    })

    it('collectionHeatmap 包含 trend 趋势', () => {
      expect(bridge.collectionHeatmap.value.trend).toBeDefined()
      expect(['growing', 'stable', 'declining']).toContain(bridge.collectionHeatmap.value.trend)
    })
  })

  // ============================================================
  // 8. 偏好画像
  // ============================================================
  describe('偏好画像', () => {
    it('preferenceProfile 包含 platformPreference', () => {
      expect(bridge.preferenceProfile.value.platformPreference).toBeDefined()
      expect(Array.isArray(bridge.preferenceProfile.value.platformPreference)).toBe(true)
    })

    it('preferenceProfile 包含 collectionType', () => {
      expect(bridge.preferenceProfile.value.collectionType).toBeDefined()
      expect(Array.isArray(bridge.preferenceProfile.value.collectionType)).toBe(true)
    })

    it('preferenceProfile 包含 playerType', () => {
      expect(bridge.preferenceProfile.value.playerType).toBeDefined()
      expect(Array.isArray(bridge.preferenceProfile.value.playerType)).toBe(true)
    })

    it('preferenceProfile 包含 recommendations 推荐', () => {
      expect(bridge.preferenceProfile.value.recommendations).toBeDefined()
      expect(Array.isArray(bridge.preferenceProfile.value.recommendations)).toBe(true)
    })

    it('添加游戏后 playerType 更新', () => {
      bridge.gameForm.name = '测试游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 30
      bridge.addGame()
      expect(bridge.preferenceProfile.value.playerType.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // 9. 种子概览
  // ============================================================
  describe('种子概览', () => {
    it('seedOverview 包含 total', () => {
      expect(bridge.seedOverview.value.total).toBeDefined()
      expect(bridge.seedOverview.value.total).toBe(0)
    })

    it('seedOverview 包含 byRarity', () => {
      expect(bridge.seedOverview.value.byRarity).toBeDefined()
      expect(Array.isArray(bridge.seedOverview.value.byRarity)).toBe(true)
    })

    it('seedOverview 包含 lodLevel', () => {
      expect(bridge.seedOverview.value.lodLevel).toBeDefined()
      expect(['high', 'medium', 'low']).toContain(bridge.seedOverview.value.lodLevel)
    })

    it('添加游戏后 seedOverview.total 增加', () => {
      bridge.gameForm.name = '种子游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 50
      bridge.addGame()
      expect(bridge.seedOverview.value.total).toBeGreaterThan(0)
    })

    it('byRarity 中稀有度计数正确', () => {
      bridge.gameForm.name = '普通游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 5
      bridge.addGame()
      bridge.gameForm.name = '史诗游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 80
      bridge.addGame()
      const byRarity = bridge.seedOverview.value.byRarity
      const common = byRarity.find((r: any) => r.rarity === 'common')
      const epic = byRarity.find((r: any) => r.rarity === 'epic')
      expect(common).toBeDefined()
      expect(epic).toBeDefined()
      expect(common.count).toBeGreaterThanOrEqual(1)
      expect(epic.count).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================
  // 10. 推荐汇总
  // ============================================================
  describe('推荐汇总', () => {
    it('recommendations 返回数组', () => {
      expect(Array.isArray(bridge.recommendations.value)).toBe(true)
    })

    it('每条推荐包含 category', () => {
      for (const rec of bridge.recommendations.value) {
        expect(rec.category).toBeDefined()
      }
    })

    it('每条推荐包含 suggestion', () => {
      for (const rec of bridge.recommendations.value) {
        expect(rec.suggestion).toBeDefined()
        expect(typeof rec.suggestion).toBe('string')
      }
    })

    it('每条推荐包含 priority', () => {
      for (const rec of bridge.recommendations.value) {
        expect(rec.priority).toBeDefined()
        expect(['high', 'medium', 'low']).toContain(rec.priority)
      }
    })

    it('推荐按优先级排序（high 在前）', () => {
      const recs = bridge.recommendations.value
      const order = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < recs.length; i++) {
        const prev = order[recs[i - 1].priority as keyof typeof order]
        const curr = order[recs[i].priority as keyof typeof order]
        expect(prev).toBeLessThanOrEqual(curr)
      }
    })
  })

  // ============================================================
  // 11. 聚合概览
  // ============================================================
  describe('聚合概览', () => {
    it('overview 聚合所有衍生属性', () => {
      const overview = bridge.overview.value
      expect(overview.playSummary).toBeDefined()
      expect(overview.galleryStats).toBeDefined()
      expect(overview.milestones).toBeDefined()
      expect(overview.playTrend).toBeDefined()
      expect(overview.timeROI).toBeDefined()
      expect(overview.collectionHeatmap).toBeDefined()
      expect(overview.preferenceProfile).toBeDefined()
      expect(overview.seedOverview).toBeDefined()
      expect(overview.recommendations).toBeDefined()
    })

    it('overview.playSummary 与 playSummary 一致', () => {
      expect(bridge.overview.value.playSummary).toBe(bridge.playSummary.value)
    })

    it('overview.galleryStats 与 galleryStats 一致', () => {
      expect(bridge.overview.value.galleryStats).toBe(bridge.galleryStats.value)
    })

    it('overview.milestones 与 milestones 一致', () => {
      expect(bridge.overview.value.milestones).toBe(bridge.milestones.value)
    })
  })

  // ============================================================
  // 12. 添加游戏
  // ============================================================
  describe('添加游戏', () => {
    it('addGame 添加游戏到 games', () => {
      bridge.gameForm.name = '塞尔达传说'
      bridge.gameForm.platform = 'Switch'
      bridge.gameForm.hours = 120
      bridge.addGame()
      expect(bridge.games.value.length).toBe(1)
      expect(bridge.games.value[0].name).toBe('塞尔达传说')
      expect(bridge.games.value[0].platform).toBe('Switch')
      expect(bridge.games.value[0].hours).toBe(120)
    })

    it('addGame 后游戏有 id 和时间戳', () => {
      bridge.gameForm.name = '测试'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 10
      bridge.addGame()
      expect(bridge.games.value[0].id).toBeDefined()
      expect(bridge.games.value[0].at).toBeDefined()
    })

    it('addGame 多款游戏后数量正确', () => {
      for (let i = 1; i <= 5; i++) {
        bridge.gameForm.name = `游戏${i}`
        bridge.gameForm.platform = 'PC'
        bridge.gameForm.hours = i * 10
        bridge.addGame()
      }
      expect(bridge.games.value.length).toBe(5)
    })

    it('name 或 hours 为空时不添加', () => {
      bridge.gameForm.name = ''
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 0
      bridge.addGame()
      expect(bridge.games.value.length).toBe(0)
    })
  })

  // ============================================================
  // 13. 添加玩具
  // ============================================================
  describe('添加玩具', () => {
    it('addToy 添加玩具到 toys', () => {
      bridge.toyForm.name = '限量手办'
      bridge.toyForm.note = '收藏版'
      bridge.toyForm.value = 'mint'
      bridge.addToy()
      expect(bridge.toys.value.length).toBe(1)
      expect(bridge.toys.value[0].name).toBe('限量手办')
      expect(bridge.toys.value[0].value).toBe('mint')
    })

    it('addToy 后玩具有 id 和时间戳', () => {
      bridge.toyForm.name = '玩具'
      bridge.addToy()
      expect(bridge.toys.value[0].id).toBeDefined()
      expect(bridge.toys.value[0].at).toBeDefined()
    })

    it('name 为空时不添加玩具', () => {
      bridge.toyForm.name = ''
      bridge.addToy()
      expect(bridge.toys.value.length).toBe(0)
    })
  })

  // ============================================================
  // 14. 添加模型
  // ============================================================
  describe('添加模型', () => {
    it('addModel 添加模型到 models', () => {
      bridge.modelForm.name = '高达RX-78'
      bridge.modelForm.series = '高达'
      bridge.modelForm.status = 'sealed'
      bridge.addModel()
      expect(bridge.models.value.length).toBe(1)
      expect(bridge.models.value[0].name).toBe('高达RX-78')
      expect(bridge.models.value[0].series).toBe('高达')
      expect(bridge.models.value[0].status).toBe('sealed')
    })

    it('addModel 后模型有 id 和时间戳', () => {
      bridge.modelForm.name = '模型'
      bridge.addModel()
      expect(bridge.models.value[0].id).toBeDefined()
      expect(bridge.models.value[0].at).toBeDefined()
    })

    it('name 为空时不添加模型', () => {
      bridge.modelForm.name = ''
      bridge.addModel()
      expect(bridge.models.value.length).toBe(0)
    })
  })

  // ============================================================
  // 15. 添加其他收藏
  // ============================================================
  describe('添加其他收藏', () => {
    it('addOther 添加其他收藏到 others', () => {
      bridge.otherForm.name = '古董唱片'
      bridge.otherForm.cat = '音乐'
      bridge.addOther()
      expect(bridge.others.value.length).toBe(1)
      expect(bridge.others.value[0].name).toBe('古董唱片')
      expect(bridge.others.value[0].cat).toBe('音乐')
    })

    it('addOther 后其他收藏有 id 和时间戳', () => {
      bridge.otherForm.name = '其他'
      bridge.addOther()
      expect(bridge.others.value[0].id).toBeDefined()
      expect(bridge.others.value[0].at).toBeDefined()
    })

    it('name 为空时不添加其他收藏', () => {
      bridge.otherForm.name = ''
      bridge.addOther()
      expect(bridge.others.value.length).toBe(0)
    })
  })

  // ============================================================
  // 16. 移除物品
  // ============================================================
  describe('移除物品', () => {
    it('removeItem 按类型和 id 移除游戏', () => {
      bridge.gameForm.name = '可移除游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 10
      bridge.addGame()
      const id = bridge.games.value[0].id
      expect(bridge.games.value.length).toBe(1)
      bridge.removeItem('game', id)
      expect(bridge.games.value.length).toBe(0)
    })

    it('removeItem 按类型和 id 移除玩具', () => {
      bridge.toyForm.name = '可移除玩具'
      bridge.addToy()
      const id = bridge.toys.value[0].id
      expect(bridge.toys.value.length).toBe(1)
      bridge.removeItem('toy', id)
      expect(bridge.toys.value.length).toBe(0)
    })

    it('removeItem 按类型和 id 移除模型', () => {
      bridge.modelForm.name = '可移除模型'
      bridge.addModel()
      const id = bridge.models.value[0].id
      expect(bridge.models.value.length).toBe(1)
      bridge.removeItem('model', id)
      expect(bridge.models.value.length).toBe(0)
    })

    it('removeItem 按类型和 id 移除其他收藏', () => {
      bridge.otherForm.name = '可移除其他'
      bridge.addOther()
      const id = bridge.others.value[0].id
      expect(bridge.others.value.length).toBe(1)
      bridge.removeItem('other', id)
      expect(bridge.others.value.length).toBe(0)
    })
  })

  // ============================================================
  // 17. 导出种子
  // ============================================================
  describe('导出种子', () => {
    it('exportSeed 导出游戏种子', () => {
      bridge.gameForm.name = '导出游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 60
      bridge.addGame()
      const id = bridge.games.value[0].id
      const payload = bridge.exportSeed('game', id)
      expect(payload).not.toBeNull()
      expect(payload.version).toBe('1.0')
      expect(payload.seed).toBeDefined()
      expect(payload.seed.name).toBe('导出游戏')
      expect(payload.signature).toBeDefined()
      expect(payload.exportedAt).toBeDefined()
    })

    it('exportSeed 导出玩具种子', () => {
      bridge.toyForm.name = '导出玩具'
      bridge.toyForm.value = 'mint'
      bridge.addToy()
      const id = bridge.toys.value[0].id
      const payload = bridge.exportSeed('toy', id)
      expect(payload).not.toBeNull()
      expect(payload.seed.name).toBe('导出玩具')
      expect(payload.seed.rarity).toBe('legendary')
    })

    it('exportSeed 不存在的 id 返回 null', () => {
      const payload = bridge.exportSeed('game', 'nonexistent-id')
      expect(payload).toBeNull()
    })
  })

  // ============================================================
  // 18. 检查里程碑
  // ============================================================
  describe('检查里程碑', () => {
    it('checkMilestones 返回里程碑结果', () => {
      const result = bridge.checkMilestones()
      expect(result).toBeDefined()
      expect(result.milestones).toBeDefined()
      expect(Array.isArray(result.milestones)).toBe(true)
      expect(result.newlyUnlocked).toBeDefined()
      expect(Array.isArray(result.newlyUnlocked)).toBe(true)
    })

    it('checkMilestones 返回全部里程碑定义', () => {
      const result = bridge.checkMilestones()
      expect(result.milestones.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // 19. 获取遗传谱系
  // ============================================================
  describe('获取遗传谱系', () => {
    it('getLineage 对存在的种子返回谱系', () => {
      bridge.gameForm.name = '谱系游戏'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 100
      bridge.addGame()
      const seedId = bridge.allSeeds.value[0].id
      const lineage = bridge.getLineage(seedId)
      expect(lineage).not.toBeNull()
      expect(lineage.root).toBeDefined()
      expect(lineage.root.id).toBe(seedId)
      expect(lineage.records).toBeDefined()
      expect(Array.isArray(lineage.records)).toBe(true)
      expect(lineage.descendants).toBeDefined()
      expect(Array.isArray(lineage.descendants)).toBe(true)
      expect(lineage.depth).toBeGreaterThanOrEqual(0)
    })

    it('getLineage 对不存在的种子返回 null', () => {
      const lineage = bridge.getLineage('nonexistent-seed-id')
      expect(lineage).toBeNull()
    })
  })

  // ============================================================
  // 20. 获取种子图谱
  // ============================================================
  describe('获取种子图谱', () => {
    it('getSeedGraph 返回图谱结构', () => {
      const graph = bridge.getSeedGraph()
      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
      expect(Array.isArray(graph.nodes)).toBe(true)
      expect(graph.edges).toBeDefined()
      expect(Array.isArray(graph.edges)).toBe(true)
    })

    it('添加多个游戏后图谱包含节点', () => {
      bridge.gameForm.name = '游戏A'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 50
      bridge.addGame()
      bridge.gameForm.name = '游戏B'
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = 30
      bridge.addGame()
      const graph = bridge.getSeedGraph()
      expect(graph.nodes.length).toBe(2)
    })
  })

  // ============================================================
  // 21. 按 LOD 获取种子
  // ============================================================
  describe('按 LOD 获取种子', () => {
    function addGameWithHours(name: string, hours: number) {
      bridge.gameForm.name = name
      bridge.gameForm.platform = 'PC'
      bridge.gameForm.hours = hours
      bridge.addGame()
    }

    it('high LOD 返回全部种子', () => {
      addGameWithHours('普通游戏', 5)
      addGameWithHours('稀有游戏', 30)
      const seeds = bridge.getSeedsByLOD('high')
      expect(seeds.length).toBe(2)
    })

    it('medium LOD 过滤掉 common 种子', () => {
      addGameWithHours('普通游戏', 5)
      addGameWithHours('稀有游戏', 30)
      const seeds = bridge.getSeedsByLOD('medium')
      const hasCommon = seeds.some((s: any) => s.rarity === 'common')
      expect(hasCommon).toBe(false)
    })

    it('low LOD 仅保留 epic 和 legendary', () => {
      addGameWithHours('普通游戏', 5)
      addGameWithHours('史诗游戏', 80)
      const seeds = bridge.getSeedsByLOD('low')
      const allHighRarity = seeds.every(
        (s: any) => s.rarity === 'epic' || s.rarity === 'legendary'
      )
      expect(allHighRarity).toBe(true)
    })

    it('不传 level 时使用当前 lodLevel', () => {
      addGameWithHours('游戏', 5)
      const seeds = bridge.getSeedsByLOD()
      expect(Array.isArray(seeds)).toBe(true)
    })
  })

  // ============================================================
  // 22. UI 状态
  // ============================================================
  describe('UI 状态', () => {
    it('tab 可访问且默认值为 game', () => {
      expect(bridge.tab.value).toBe('game')
    })

    it('tabs 包含所有标签页', () => {
      expect(bridge.tabs).toBeDefined()
      expect(Array.isArray(bridge.tabs)).toBe(true)
      const keys = bridge.tabs.map((t: any) => t.key)
      expect(keys).toContain('game')
      expect(keys).toContain('toy')
      expect(keys).toContain('model')
      expect(keys).toContain('other')
    })

    it('fmt 是函数', () => {
      expect(typeof bridge.fmt).toBe('function')
    })

    it('searchQuery 可读写', () => {
      expect(bridge.searchQuery.value).toBe('')
      bridge.searchQuery.value = '测试搜索'
      expect(bridge.searchQuery.value).toBe('测试搜索')
    })

    it('otherSearch 可读写', () => {
      expect(bridge.otherSearch.value).toBe('')
      bridge.otherSearch.value = '其他搜索'
      expect(bridge.otherSearch.value).toBe('其他搜索')
    })
  })

  // ============================================================
  // 23. 玩具筛选
  // ============================================================
  describe('玩具筛选', () => {
    it('toyFilter 可访问且默认值为 all', () => {
      expect(bridge.toyFilter.value).toBe('all')
    })

    it('toyFilters 包含所有筛选选项', () => {
      expect(bridge.toyFilters).toBeDefined()
      expect(Array.isArray(bridge.toyFilters)).toBe(true)
      const keys = bridge.toyFilters.map((f: any) => f.key)
      expect(keys).toContain('all')
      expect(keys).toContain('mint')
      expect(keys).toContain('light')
      expect(keys).toContain('used')
      expect(keys).toContain('display')
    })
  })

  // ============================================================
  // 24. 排序
  // ============================================================
  describe('排序', () => {
    it('sortField 可访问且默认值为 hours', () => {
      expect(bridge.sortField.value).toBe('hours')
    })

    it('sortOrder 可访问且默认值为 desc', () => {
      expect(bridge.sortOrder.value).toBe('desc')
    })

    it('sortField 和 sortOrder 可修改', () => {
      bridge.sortField.value = 'name'
      bridge.sortOrder.value = 'asc'
      expect(bridge.sortField.value).toBe('name')
      expect(bridge.sortOrder.value).toBe('asc')
    })
  })

  // ============================================================
  // 25. 表单状态
  // ============================================================
  describe('表单状态', () => {
    it('gameForm 可访问', () => {
      expect(bridge.gameForm).toBeDefined()
      expect(bridge.gameForm.name).toBe('')
      expect(bridge.gameForm.hours).toBe(0)
    })

    it('toyForm 可访问', () => {
      expect(bridge.toyForm).toBeDefined()
      expect(bridge.toyForm.value).toBe('mint')
    })

    it('modelForm 可访问', () => {
      expect(bridge.modelForm).toBeDefined()
      expect(bridge.modelForm.status).toBe('sealed')
    })

    it('otherForm 可访问', () => {
      expect(bridge.otherForm).toBeDefined()
      expect(bridge.otherForm.name).toBe('')
    })
  })
})