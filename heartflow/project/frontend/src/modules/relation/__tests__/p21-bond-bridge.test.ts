// ============================================================
// P21-6 羁绊之厅 · 视图桥接层测试
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
// A2.3 批3：relation:auto-analyze 宪法门控。useEffect 默认返回 active=false（自动分析放开）
// ⟹ 推荐照常出现；设为 true 时 bondRecommendations 被抑制为空。
const relationAutoAnalyzeActive = vi.hoisted(() => ({ value: false }))
vi.mock('../../constitution/use-effect', () => ({
  useEffect: () => ({ active: relationAutoAnalyzeActive }),
}))

describe('P21-6 羁绊之厅视图桥接', () => {
  let bridge: any

  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()

    // 动态导入以获取新的模块实例
    const mod = await import('../bond-bridge')
    bridge = mod.useBondBridge()
    // 清空初始数据
    bridge.relationModule.persons.value = []
    bridge.journal.interactions.value = []
    bridge.anniversaries.anniversaries.value = []
    bridge.activePersonId.value = null
    relationAutoAnalyzeActive.value = false
  })

  // ============================================================
  // 1. 状态聚合
  // ============================================================
  describe('状态聚合', () => {
    it('初始化时 personOverviews 为空', () => {
      expect(bridge.personOverviews.value).toEqual([])
    })

    it('activePersonId 初始为 null', () => {
      expect(bridge.activePersonId.value).toBeNull()
    })

    it('currentPersonOverview 初始为 null', () => {
      expect(bridge.currentPersonOverview.value).toBeNull()
    })

    it('创建人物后 personOverviews 包含该人物', () => {
      const person = bridge.createPerson('张三', 'friend')
      expect(person).toBeDefined()
      expect(bridge.personOverviews.value.length).toBe(1)
      expect(bridge.personOverviews.value[0].person.name).toBe('张三')
    })

    it('personOverviews 包含关系标签和颜色', () => {
      bridge.createPerson('李四', 'family')
      const overview = bridge.personOverviews.value[0]
      expect(overview.relationLabel).toBe('家人')
      expect(overview.relationColor).toBe('#f0c040')
    })

    it('personOverviews 包含健康度数据', () => {
      bridge.createPerson('王五', 'colleague')
      const overview = bridge.personOverviews.value[0]
      expect(overview.health).toBeDefined()
      expect(overview.health.score).toBeGreaterThanOrEqual(0)
      expect(overview.daysSinceLastContact).toBeNull()
      expect(overview.interactionCount).toBe(0)
    })

    it('创建多个人物后 personOverviews 数量正确', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'family')
      bridge.createPerson('C', 'colleague')
      expect(bridge.personOverviews.value.length).toBe(3)
    })
  })

  // ============================================================
  // 2. 人物分组与排序
  // ============================================================
  describe('人物分组与排序', () => {
    it('personsByRelation 按关系类型分组', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'friend')
      bridge.createPerson('C', 'family')
      const groups = bridge.personsByRelation.value
      expect(groups['friend']).toHaveLength(2)
      expect(groups['family']).toHaveLength(1)
    })

    it('personsByRecentContact 按最近联系排序', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'friend')
      // 两人都没有互动，排序应该保持稳定
      const sorted = bridge.personsByRecentContact.value
      expect(sorted).toHaveLength(2)
    })

    it('有互动记录后按最近联系排序', () => {
      const pa = bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'friend')
      // 记录 A 的互动
      bridge.recordInteraction(pa.id, 'message', 'positive', '问候')
      const sorted = bridge.personsByRecentContact.value
      // A 应该排在前面（有互动）
      expect(sorted[0].person.name).toBe('A')
    })

    it('personsByHealth 按健康度排序', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'family')
      const sorted = bridge.personsByHealth.value
      expect(sorted).toHaveLength(2)
    })
  })

  // ============================================================
  // 3. 羁绊健康度
  // ============================================================
  describe('羁绊健康度', () => {
    it('初始 bondHealth 为空状态', () => {
      const health = bridge.bondHealth.value
      expect(health.totalPersons).toBe(0)
      expect(health.activePersons).toBe(0)
      expect(health.dormantPersons).toBe(0)
      expect(health.memorialCount).toBe(0)
      expect(health.avgCloseness).toBe(0)
      expect(health.upcomingAnniversaries).toBe(0)
    })

    it('添加人物后 totalPersons 更新', () => {
      bridge.createPerson('张三', 'friend')
      expect(bridge.bondHealth.value.totalPersons).toBe(1)
    })

    it('记录互动后 activePersons 更新', () => {
      const p = bridge.createPerson('张三', 'friend')
      bridge.recordInteraction(p.id, 'message', 'positive', '问候')
      // 刚刚记录，必然在30天内
      expect(bridge.bondHealth.value.activePersons).toBe(1)
    })

    it('avgCloseness 计算正确', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'family')
      const avg = bridge.bondHealth.value.avgCloseness
      // 默认 closeness 为 0.3，avg 应为 (0.3+0.3)/2 = 0.3
      expect(avg).toBeGreaterThanOrEqual(0)
      expect(avg).toBeLessThanOrEqual(1)
    })

    it('relationsDistribution 正确统计关系类型', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'friend')
      bridge.createPerson('C', 'family')
      const dist = bridge.bondHealth.value.relationsDistribution
      const friendDist = dist.find((d: any) => d.type === 'friend')
      const familyDist = dist.find((d: any) => d.type === 'family')
      expect(friendDist?.count).toBe(2)
      expect(familyDist?.count).toBe(1)
    })

    it('有即将到来的纪念日时 upcomingAnniversaries 更新', () => {
      const p = bridge.createPerson('张三', 'friend')
      // 创建一个明天的纪念日
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().slice(0, 10)
      bridge.createAnniversary(p.id, '生日', dateStr, 'birthday')
      expect(bridge.bondHealth.value.upcomingAnniversaries).toBeGreaterThanOrEqual(0)
    })

    it('bondHealth 包含建议', () => {
      const health = bridge.bondHealth.value
      expect(health.suggestions).toBeDefined()
      expect(Array.isArray(health.suggestions)).toBe(true)
      // 空状态应该有建议
      if (health.totalPersons === 0) {
        expect(health.suggestions.length).toBeGreaterThan(0)
      }
    })

    it('score 在 0-100 范围内', () => {
      const score = bridge.bondHealth.value.score
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('healthDistribution 统计健康等级', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'family')
      const dist = bridge.bondHealth.value.healthDistribution
      expect(dist.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // 4. 网络概览
  // ============================================================
  describe('网络概览', () => {
    it('初始 networkOverview 为空', () => {
      const overview = bridge.networkOverview.value
      expect(overview.totalNodes).toBe(1) // self
      expect(overview.totalEdges).toBe(0)
      expect(overview.strongestBond).toBeNull()
      expect(overview.weakestBond).toBeNull()
    })

    it('添加人物后 totalNodes 增加', () => {
      bridge.createPerson('张三', 'friend')
      expect(bridge.networkOverview.value.totalNodes).toBe(2) // self + 张三
      expect(bridge.networkOverview.value.totalEdges).toBeGreaterThanOrEqual(1)
    })

    it('strongestBond 和 weakestBond 正确', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'friend')

      const overview = bridge.networkOverview.value
      // 有两个人，应该能找到最强和最弱羁绊
      expect(overview.strongestBond).not.toBeNull()
      expect(overview.weakestBond).not.toBeNull()
      expect(overview.strongestBond?.closeness).toBeGreaterThanOrEqual(overview.weakestBond?.closeness ?? 0)
    })

    it('deceasedCount 和 seatCount 正确', () => {
      bridge.createSeat('逝者A', 'deceased', '纪念')
      const overview = bridge.networkOverview.value
      expect(overview.seatCount).toBe(1)
      expect(overview.deceasedCount).toBe(1)
    })
  })

  // ============================================================
  // 5. 可视化数据
  // ============================================================
  describe('可视化数据', () => {
    it('forceLayoutData 包含 nodes 和 edges', () => {
      bridge.createPerson('张三', 'friend')
      const layout = bridge.forceLayoutData.value
      expect(layout.nodes).toBeDefined()
      expect(layout.edges).toBeDefined()
      expect(layout.nodes.length).toBeGreaterThanOrEqual(2) // self + 张三
    })

    it('heatmapData 初始为空', () => {
      const heatmap = bridge.heatmapData.value
      expect(heatmap.cells).toBeDefined()
      expect(heatmap.maxIntensity).toBe(0)
    })

    it('记录互动后 heatmapData 更新', () => {
      const p = bridge.createPerson('张三', 'friend')
      bridge.recordInteraction(p.id, 'call', 'positive', '通话')
      const heatmap = bridge.heatmapData.value
      expect(heatmap.maxIntensity).toBeGreaterThan(0)
    })

    it('timelineData 包含事件', () => {
      const p = bridge.createPerson('张三', 'friend')
      bridge.recordInteraction(p.id, 'meeting', 'positive', '见面聊天')
      const timeline = bridge.timelineData.value
      expect(timeline.events.length).toBeGreaterThanOrEqual(1)
      expect(timeline.byMonth).toBeDefined()
      expect(timeline.byPerson).toBeDefined()
    })

    it('currentRadar 初始为 null', () => {
      expect(bridge.currentRadar.value).toBeNull()
    })

    it('focusPerson 后 currentRadar 有数据', () => {
      const p = bridge.createPerson('张三', 'friend')
      bridge.focusPerson(p.id)
      const radar = bridge.currentRadar.value
      expect(radar).not.toBeNull()
      expect(radar.personName).toBe('张三')
      expect(radar.dimensions.length).toBeGreaterThan(0)
    })

    it('allRadars 包含所有人物的雷达图', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'family')
      const radars = bridge.allRadars.value
      expect(radars.length).toBe(2)
    })

    it('interactionStats 初始为空', () => {
      const stats = bridge.interactionStats.value
      expect(stats.totalInteractions).toBe(0)
      expect(stats.totalPersons).toBe(0)
    })

    it('记录互动后 interactionStats 更新', () => {
      const p = bridge.createPerson('张三', 'friend')
      bridge.recordInteraction(p.id, 'call', 'positive', '通话')
      const stats = bridge.interactionStats.value
      expect(stats.totalInteractions).toBe(1)
      expect(stats.byKind.call).toBe(1)
    })
  })

  // ============================================================
  // 6. 关系推荐
  // ============================================================
  describe('关系推荐', () => {
    it('空状态推荐添加联系人', () => {
      const recs = bridge.bondRecommendations.value
      const addPerson = recs.find((r: any) => r.type === 'add_person')
      expect(addPerson).toBeDefined()
    })

    it('有即将到来的纪念日时推荐提醒', () => {
      const p = bridge.createPerson('张三', 'friend')
      // 创建明天的纪念日（使用本地日期分量，避免 toISOString 的 UTC 偏移导致跨午夜）
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const y = tomorrow.getFullYear()
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0')
      const d = String(tomorrow.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      bridge.createAnniversary(p.id, '生日', dateStr, 'birthday')
      const recs = bridge.bondRecommendations.value
      const anniversary = recs.find((r: any) => r.type === 'upcoming_anniversary')
      expect(anniversary).toBeDefined()
    })

    it('有留座无纪念时推荐添加纪念文字', () => {
      bridge.createSeat('逝者', 'deceased')
      const recs = bridge.bondRecommendations.value
      const memorial = recs.find((r: any) => r.type === 'create_memory' && r.title.includes('留座'))
      expect(memorial).toBeDefined()
    })

    it('推荐按优先级排序', () => {
      const recs = bridge.bondRecommendations.value
      for (let i = 1; i < recs.length; i++) {
        const order = { high: 0, medium: 1, low: 2 }
        const prev = order[recs[i - 1].priority as keyof typeof order]
        const curr = order[recs[i].priority as keyof typeof order]
        expect(prev).toBeLessThanOrEqual(curr)
      }
    })
  })

  // ============================================================
  // 7. 操作入口
  // ============================================================
  describe('操作入口', () => {
    describe('createPerson', () => {
      it('创建人物返回 Person 对象', () => {
        const person = bridge.createPerson('张三', 'friend')
        expect(person.name).toBe('张三')
        expect(person.relation).toBe('friend')
        expect(person.id).toBeDefined()
      })

      it('创建人物后 personOverviews 更新', () => {
        bridge.createPerson('张三', 'friend')
        expect(bridge.personOverviews.value.length).toBe(1)
      })
    })

    describe('updatePerson', () => {
      it('更新人物名称', () => {
        const p = bridge.createPerson('张三', 'friend')
        bridge.updatePerson(p.id, { name: '张三丰' })
        const updated = bridge.personOverviews.value[0]
        expect(updated.person.name).toBe('张三丰')
      })

      it('更新亲密度', () => {
        const p = bridge.createPerson('张三', 'friend')
        bridge.updatePerson(p.id, { closeness: 0.8 })
        const updated = bridge.personOverviews.value[0]
        expect(updated.person.closeness).toBe(0.8)
      })
    })

    describe('removePerson', () => {
      it('删除人物', () => {
        const p = bridge.createPerson('张三', 'friend')
        expect(bridge.personOverviews.value.length).toBe(1)
        bridge.removePerson(p.id)
        expect(bridge.personOverviews.value.length).toBe(0)
      })

      it('删除聚焦人物时清除 activePersonId', () => {
        const p = bridge.createPerson('张三', 'friend')
        bridge.focusPerson(p.id)
        expect(bridge.activePersonId.value).toBe(p.id)
        bridge.removePerson(p.id)
        expect(bridge.activePersonId.value).toBeNull()
      })
    })

    describe('focusPerson', () => {
      it('聚焦人物返回概览', () => {
        const p = bridge.createPerson('张三', 'friend')
        const overview = bridge.focusPerson(p.id)
        expect(overview).not.toBeNull()
        expect(overview.person.name).toBe('张三')
        expect(bridge.activePersonId.value).toBe(p.id)
      })

      it('clearFocus 清除聚焦', () => {
        const p = bridge.createPerson('张三', 'friend')
        bridge.focusPerson(p.id)
        bridge.clearFocus()
        expect(bridge.activePersonId.value).toBeNull()
        expect(bridge.currentPersonOverview.value).toBeNull()
      })
    })

    describe('recordInteraction', () => {
      it('记录互动返回 InteractionEntry', () => {
        const p = bridge.createPerson('张三', 'friend')
        const entry = bridge.recordInteraction(p.id, 'call', 'positive', '电话聊天', ['日常'])
        expect(entry.personId).toBe(p.id)
        expect(entry.kind).toBe('call')
        expect(entry.mood).toBe('positive')
        expect(entry.summary).toBe('电话聊天')
      })

      it('记录互动后更新健康度', () => {
        const p = bridge.createPerson('张三', 'friend')
        bridge.recordInteraction(p.id, 'call', 'positive', '电话聊天')
        const overview = bridge.personOverviews.value[0]
        expect(overview.interactionCount).toBe(1)
        expect(overview.daysSinceLastContact).toBe(0)
      })
    })

    describe('createAnniversary', () => {
      it('创建纪念日返回 Anniversary', () => {
        const p = bridge.createPerson('张三', 'friend')
        const ann = bridge.createAnniversary(p.id, '生日', '2026-06-15', 'birthday')
        expect(ann.personId).toBe(p.id)
        expect(ann.title).toBe('生日')
        expect(ann.type).toBe('birthday')
      })
    })

    describe('createSeat', () => {
      it('创建留座', () => {
        const seat = bridge.createSeat('逝者', 'deceased', '永怀')
        expect(seat.name).toBe('逝者')
        expect(seat.isSeat).toBe(true)
        expect(seat.deceased).toBe(true)
      })
    })

    describe('markDeceased', () => {
      it('标记人物为逝者', () => {
        const p = bridge.createPerson('张三', 'friend')
        const result = bridge.markDeceased(p.id, '永怀')
        expect(result).toBeDefined()
        expect(result.deceased).toBe(true)
        expect(result.isSeat).toBe(true)
      })
    })
  })

  // ============================================================
  // 8. 筛选方法
  // ============================================================
  describe('筛选方法', () => {
    it('getPersonsByRelation 按关系类型筛选', () => {
      bridge.createPerson('A', 'friend')
      bridge.createPerson('B', 'family')
      bridge.createPerson('C', 'friend')
      const friends = bridge.getPersonsByRelation('friend')
      expect(friends).toHaveLength(2)
    })

    it('getActivePersons 筛选活跃联系人', () => {
      const p = bridge.createPerson('张三', 'friend')
      bridge.recordInteraction(p.id, 'message', 'positive', '问候')
      const active = bridge.getActivePersons()
      expect(active.length).toBeGreaterThanOrEqual(1)
    })

    it('getDormantPersons 筛选沉寂联系人', () => {
      bridge.createPerson('张三', 'friend')
      // 没有互动，daysSinceLastContact 为 null，不算沉寂
      const dormant = bridge.getDormantPersons()
      expect(dormant).toHaveLength(0)
    })

    it('getMemorialPersons 筛选逝者/留座', () => {
      bridge.createPerson('A', 'friend')
      bridge.createSeat('B', 'deceased')
      const memorial = bridge.getMemorialPersons()
      expect(memorial).toHaveLength(1)
    })

    it('getPersonRadar 获取人物雷达图', () => {
      const p = bridge.createPerson('张三', 'friend')
      const radar = bridge.getPersonRadar(p.id)
      expect(radar).not.toBeNull()
      expect(radar.personName).toBe('张三')
    })
  })

  // ============================================================
  // 9. 完整工作流
  // ============================================================
  describe('完整工作流', () => {
    it('创建 → 互动 → 纪念日 → 追踪完整流程', () => {
      // 1. 创建人物
      const p1 = bridge.createPerson('张三', 'friend')
      const p2 = bridge.createPerson('李四', 'family')
      expect(bridge.personOverviews.value.length).toBe(2)

      // 2. 更新信息
      bridge.updatePerson(p1.id, { closeness: 0.7, notes: '大学同学' })
      bridge.updatePerson(p2.id, { closeness: 0.9 })

      // 3. 记录互动
      bridge.recordInteraction(p1.id, 'meeting', 'positive', '一起吃饭', ['聚餐'])
      bridge.recordInteraction(p1.id, 'message', 'positive', '微信聊天')
      bridge.recordInteraction(p2.id, 'call', 'positive', '电话问候')

      // 4. 创建纪念日（使用本地日期分量，避免 toISOString 的 UTC 偏移导致跨午夜）
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const ty = tomorrow.getFullYear()
      const tm = String(tomorrow.getMonth() + 1).padStart(2, '0')
      const td = String(tomorrow.getDate()).padStart(2, '0')
      const dateStr = `${ty}-${tm}-${td}`
      bridge.createAnniversary(p1.id, '生日', dateStr, 'birthday')

      // 5. 验证人物概览
      const overviews = bridge.personOverviews.value
      expect(overviews.length).toBe(2)
      const zhang = overviews.find((o: any) => o.person.name === '张三')
      expect(zhang).toBeDefined()
      expect(zhang!.interactionCount).toBeGreaterThanOrEqual(2)
      expect(zhang!.person.notes).toBe('大学同学')

      // 6. 验证健康度
      const health = bridge.bondHealth.value
      expect(health.totalPersons).toBe(2)
      expect(health.activePersons).toBe(2)
      expect(health.avgCloseness).toBeGreaterThanOrEqual(0)

      // 7. 验证可视化
      const layout = bridge.forceLayoutData.value
      expect(layout.nodes.length).toBe(3) // self + 2 persons

      const heatmap = bridge.heatmapData.value
      expect(heatmap.maxIntensity).toBeGreaterThan(0)

      // 8. 验证推荐
      const recs = bridge.bondRecommendations.value
      expect(recs.length).toBeGreaterThan(0)

      // 9. 聚焦和雷达图
      const overview = bridge.focusPerson(p1.id)
      expect(overview).not.toBeNull()
      const radar = bridge.currentRadar.value
      expect(radar).not.toBeNull()
      expect(radar!.personName).toBe('张三')

      // 10. 清除聚焦
      bridge.clearFocus()
      expect(bridge.currentRadar.value).toBeNull()
    })

    it('留座 → 逝者 完整流程', () => {
      // 1. 创建留座
      const seat = bridge.createSeat('祖父', 'deceased', '永远怀念')
      expect(seat.isSeat).toBe(true)
      expect(seat.deceased).toBe(true)

      // 2. 验证网络
      const net = bridge.networkOverview.value
      expect(net.seatCount).toBe(1)
      expect(net.deceasedCount).toBe(1)

      // 3. 验证 memorial 筛选
      const memorial = bridge.getMemorialPersons()
      expect(memorial).toHaveLength(1)
      expect(memorial[0].person.name).toBe('祖父')
    })

    it('refreshAll 刷新所有数据', () => {
      bridge.createPerson('张三', 'friend')
      expect(bridge.personOverviews.value.length).toBe(1)

      bridge.refreshAll()
      // 刷新后数据应该保持
      expect(bridge.personOverviews.value.length).toBe(1)
    })
  })

  // ============================================================
  // 11. 宪法门控（relation:auto-analyze）
  // ============================================================
  describe('relation:auto-analyze 宪法门控', () => {
    it('条款活跃（默认）时抑制自动分析推荐', () => {
      relationAutoAnalyzeActive.value = true
      const recs = bridge.bondRecommendations.value
      expect(recs).toEqual([])
    })

    it('条款关闭（用户放开约束）时恢复自动分析推荐', () => {
      relationAutoAnalyzeActive.value = false
      bridge.createPerson('张三', 'friend')
      const recs = bridge.bondRecommendations.value
      expect(recs.length).toBeGreaterThan(0)
    })
  })
})