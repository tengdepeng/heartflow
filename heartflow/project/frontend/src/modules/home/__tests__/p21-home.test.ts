// ============================================================
// 家 · P21-4 单元测试
// 视图桥接 + 房间聚合 + 可视化数据 + 健康度评分 + 房间推荐
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { HOME_ROOMS } from '../rooms'
import { useHomeBridge } from '../home-bridge'
import { storage } from '../../../engine/storage'
import { getLocalDateKey } from '../../../utils/time'


// ---- 存储清理 ----

const STORAGE_KEYS = [
  'hf:home:custom_states',
  'hf:home:interactions',
  'hf:home:scene_editor',
  'hf:home:atmosphere',
  'hf:home:transitions',
  'hf:home:dashboard',
  'hf:home:activities',
  'hf:home:mood_snapshots',
  'hf:home:interaction_chains',
]

function clearStorage() {
  for (const key of STORAGE_KEYS) {
    storage.setKV(key, key.includes('atmosphere') ? '' : '[]')
  }
}

// ============================================================
// 1. useHomeBridge — 视图桥接
// ============================================================

describe('P21-4 家空间视图桥接', () => {
  let bridge: ReturnType<typeof useHomeBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useHomeBridge()
  })

  describe('房间概览聚合', () => {
    it('roomOverviews 返回11个房间', () => {
      expect(bridge.roomOverviews.value.length).toBe(11)
    })

    it('所有房间都有 roomId 和 roomName', () => {
      for (const overview of bridge.roomOverviews.value) {
        expect(overview.roomId).toBeTruthy()
        expect(overview.roomName).toBeTruthy()
      }
    })

    it('初始状态 visitCount 为 0', () => {
      for (const overview of bridge.roomOverviews.value) {
        expect(overview.visitCount).toBe(0)
      }
    })

    it('初始状态 decorationCount 为 0', () => {
      for (const overview of bridge.roomOverviews.value) {
        expect(overview.decorationCount).toBe(0)
      }
    })

    it('初始状态 healthScore 较低（仅氛围默认分）', () => {
      for (const overview of bridge.roomOverviews.value) {
        expect(overview.healthScore).toBeGreaterThanOrEqual(0)
        expect(overview.healthScore).toBeLessThanOrEqual(20)
      }
    })

    it('初始状态无活跃交互链', () => {
      for (const overview of bridge.roomOverviews.value) {
        expect(overview.activeChain).toBeNull()
      }
    })

    it('初始状态无情绪快照', () => {
      for (const overview of bridge.roomOverviews.value) {
        expect(overview.moodSnapshot).toBeNull()
      }
    })

    it('自定义名称后 roomName 更新', () => {
      bridge.roomInteraction.setRoomCustomName('study', '我的书房')
      const overview = bridge.getRoomDetail('study')
      expect(overview?.roomName).toBe('我的书房')
    })
  })

  describe('房间排序', () => {
    it('roomsByVisits 初始按访问次数均为0排序', () => {
      const sorted = bridge.roomsByVisits.value
      expect(sorted.length).toBe(11)
      // 所有 visitCount 都是 0
      for (const r of sorted) {
        expect(r.visitCount).toBe(0)
      }
    })

    it('进入房间后 roomsByVisits 排序变化', () => {
      bridge.enterRoom('study')
      bridge.enterRoom('kitchen')
      bridge.enterRoom('kitchen')
      bridge.enterRoom('study')
      bridge.enterRoom('study')

      const sorted = bridge.roomsByVisits.value
      // study 访问了3次，应该排前面
      expect(sorted[0].roomId).toBe('study')
      expect(sorted[0].visitCount).toBeGreaterThanOrEqual(2)
    })

    it('roomsByHealth 按健康度排序', () => {
      bridge.enterRoom('study')
      bridge.enterRoom('kitchen')

      const sorted = bridge.roomsByHealth.value
      // 有访问的房间健康度更高
      const visitedHealth = sorted.filter(r => r.visitCount > 0)
      const unvisitedHealth = sorted.filter(r => r.visitCount === 0)
      if (visitedHealth.length > 0 && unvisitedHealth.length > 0) {
        expect(visitedHealth[0].healthScore).toBeGreaterThanOrEqual(unvisitedHealth[0].healthScore)
      }
    })

    it('recentlyVisited 最多返回5个最近访问房间', () => {
      bridge.enterRoom('study')
      bridge.enterRoom('kitchen')
      bridge.enterRoom('bedroom')
      expect(bridge.recentlyVisited.value.length).toBeLessThanOrEqual(5)
      expect(bridge.recentlyVisited.value.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('当前房间概览', () => {
    it('初始无活跃房间时 currentRoomOverview 为 null', () => {
      expect(bridge.currentRoomOverview.value).toBeNull()
    })

    it('进入房间后 currentRoomOverview 更新', () => {
      bridge.enterRoom('study')
      const overview = bridge.currentRoomOverview.value
      expect(overview).not.toBeNull()
      expect(overview!.roomId).toBe('study')
    })

    it('离开房间后 currentRoomOverview 为 null', () => {
      bridge.enterRoom('study')
      bridge.leaveRoom()
      expect(bridge.currentRoomOverview.value).toBeNull()
    })
  })

  describe('家空间健康度', () => {
    it('初始健康度各项指标', () => {
      const health = bridge.homeHealth.value
      expect(health.roomCoverage).toBe(0)
      expect(health.decorationRate).toBe(0)
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(100)
      expect(health.suggestions).toBeDefined()
    })

    it('访问房间后 roomCoverage 提升', () => {
      const before = bridge.homeHealth.value.roomCoverage
      bridge.enterRoom('study')
      bridge.enterRoom('kitchen')
      bridge.enterRoom('bedroom')
      const after = bridge.homeHealth.value.roomCoverage
      expect(after).toBeGreaterThan(before)
    })

    it('添加装饰后 decorationRate 提升', () => {
      const before = bridge.homeHealth.value.decorationRate
      bridge.enterRoom('study')
      bridge.placeDecoration('study', 'dec-sofa')
      const after = bridge.homeHealth.value.decorationRate
      expect(after).toBeGreaterThanOrEqual(before)
    })

    it('初始状态下有建议提示', () => {
      const health = bridge.homeHealth.value
      // 初始状态 roomCoverage 为 0，应有建议
      expect(health.suggestions.length).toBeGreaterThan(0)
    })

    it('评分范围 0-100', () => {
      const health = bridge.homeHealth.value
      expect(health.score).toBeGreaterThanOrEqual(0)
      expect(health.score).toBeLessThanOrEqual(100)
    })
  })

  describe('仪表盘', () => {
    it('dashboard 包含基本字段', () => {
      const dash = bridge.dashboard.value
      expect(dash).toBeDefined()
      expect(dash.totalVisits).toBeGreaterThanOrEqual(0)
      expect(dash.roomSummaries).toBeDefined()
      expect(dash.recentActivities).toBeDefined()
      expect(dash.generatedAt).toBeTruthy()
    })

    it('dashboard 包含11个房间摘要', () => {
      const dash = bridge.dashboard.value
      expect(dash.roomSummaries.length).toBe(11)
    })

    it('refreshDashboard 返回新仪表盘', () => {
      const dash = bridge.refreshDashboard()
      expect(dash).toBeDefined()
      expect(dash.generatedAt).toBeTruthy()
    })
  })

  describe('活动建议', () => {
    it('suggestions 返回所有房间建议', () => {
      const suggestions = bridge.suggestions.value
      expect(suggestions.length).toBeGreaterThanOrEqual(0)
    })

    it('highPrioritySuggestions 过滤高优先级', () => {
      const high = bridge.highPrioritySuggestions.value
      // 所有高优先级建议都有 priority === 'high'
      for (const s of high) {
        expect(s.priority).toBe('high')
      }
    })

    it('未访问房间有高优先级建议', () => {
      // 初始状态所有房间未访问，应该有高优先级建议
      const suggestions = bridge.suggestions.value
      const highCount = suggestions.filter(s => s.priority === 'high').length
      expect(highCount).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// 2. 可视化数据
// ============================================================

describe('P21-4 可视化数据', () => {
  let bridge: ReturnType<typeof useHomeBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useHomeBridge()
  })

  describe('房间热力图', () => {
    it('roomHeatmap 返回11个条目', () => {
      expect(bridge.roomHeatmap.value.length).toBe(11)
    })

    it('每个条目包含必要字段', () => {
      for (const entry of bridge.roomHeatmap.value) {
        expect(entry.roomId).toBeTruthy()
        expect(entry.roomName).toBeTruthy()
        expect(entry.color).toBeTruthy()
        expect(entry.visitCount).toBeGreaterThanOrEqual(0)
        expect(entry.activityScore).toBeGreaterThanOrEqual(0)
        expect(entry.activityScore).toBeLessThanOrEqual(100)
      }
    })

    it('访问后 visitCount 和 activityScore 更新', () => {
      const before = bridge.roomHeatmap.value.find(e => e.roomId === 'study')
      bridge.enterRoom('study')
      const after = bridge.roomHeatmap.value.find(e => e.roomId === 'study')
      expect(after!.visitCount).toBeGreaterThan(before!.visitCount)
      expect(after!.activityScore).toBeGreaterThan(before!.activityScore)
    })
  })

  describe('活动时间线', () => {
    it('activityTimeline 返回14天数据', () => {
      expect(bridge.activityTimeline.value.length).toBe(14)
    })

    it('每天包含必要字段', () => {
      for (const entry of bridge.activityTimeline.value) {
        expect(entry.date).toBeTruthy()
        expect(entry.count).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(entry.rooms)).toBe(true)
        expect(Array.isArray(entry.types)).toBe(true)
      }
    })

    it('有活动后 count 增加', () => {
      bridge.enterRoom('study')
      bridge.recordActivity('study', 'interact', '阅读', '在书房阅读', 30, 8)

      // 今天的 count 应该大于 0
      const today = getLocalDateKey()
      const todayEntry = bridge.activityTimeline.value.find(e => e.date === today)
      expect(todayEntry).toBeDefined()
      expect(todayEntry!.count).toBeGreaterThan(0)
    })
  })

  describe('房间活动分布', () => {
    it('roomActivityDistribution 包含所有房间', () => {
      const dist = bridge.roomActivityDistribution.value
      for (const room of HOME_ROOMS) {
        expect(dist[room.id]).toBeDefined()
      }
    })

    it('活动后分布更新', () => {
      bridge.recordActivity('study', 'interact', '阅读', '深度阅读', 30, 8)
      const dist = bridge.roomActivityDistribution.value
      expect(dist['study']['interact']).toBe(1)
    })
  })

  describe('装饰物使用排行', () => {
    it('初始无装饰物时排行为空', () => {
      expect(bridge.decorationUsageRanking.value.length).toBe(0)
    })

    it('放置装饰后排行更新', () => {
      bridge.enterRoom('study')
      bridge.placeDecoration('study', 'dec-sofa')
      bridge.placeDecoration('study', 'dec-bookshelf')

      const ranking = bridge.decorationUsageRanking.value
      expect(ranking.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================
// 3. 房间推荐
// ============================================================

describe('P21-4 房间推荐', () => {
  let bridge: ReturnType<typeof useHomeBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useHomeBridge()
  })

  describe('roomRecommendations', () => {
    it('返回11个房间推荐', () => {
      expect(bridge.roomRecommendations.value.length).toBe(11)
    })

    it('未访问房间推荐优先级为 high', () => {
      const recs = bridge.roomRecommendations.value
      const highRecs = recs.filter(r => r.priority === 'high')
      // 初始状态所有房间未访问，应该有高优先级推荐
      expect(highRecs.length).toBeGreaterThan(0)
    })

    it('每个推荐包含必要字段', () => {
      for (const rec of bridge.roomRecommendations.value) {
        expect(rec.roomId).toBeTruthy()
        expect(rec.roomName).toBeTruthy()
        expect(rec.roomIcon).toBeTruthy()
        expect(rec.reason).toBeTruthy()
        expect(rec.priority).toBeDefined()
        expect(rec.suggestedActivity).toBeTruthy()
        expect(rec.estimatedDuration).toBeGreaterThan(0)
      }
    })

    it('推荐按优先级排序', () => {
      const recs = bridge.roomRecommendations.value
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < recs.length; i++) {
        expect(priorityOrder[recs[i].priority]).toBeGreaterThanOrEqual(priorityOrder[recs[i - 1].priority])
      }
    })
  })
})

// ============================================================
// 4. 操作入口
// ============================================================

describe('P21-4 操作入口', () => {
  let bridge: ReturnType<typeof useHomeBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useHomeBridge()
  })

  describe('enterRoom', () => {
    it('进入存在的房间返回 RoomOverview', () => {
      const result = bridge.enterRoom('study')
      expect(result).not.toBeNull()
      expect(result!.roomId).toBe('study')
    })

    it('进入不存在的房间返回 null', () => {
      const result = bridge.enterRoom('non-existent')
      expect(result).toBeNull()
    })

    it('进入后 activeRoomId 更新', () => {
      bridge.enterRoom('kitchen')
      expect(bridge.activeRoomId.value).toBe('kitchen')
    })

    it('进入后 visitCount 增加', () => {
      const before = bridge.getRoomDetail('study')?.visitCount ?? 0
      bridge.enterRoom('study')
      const after = bridge.getRoomDetail('study')?.visitCount ?? 0
      expect(after).toBeGreaterThan(before)
    })
  })

  describe('leaveRoom', () => {
    it('离开后 activeRoomId 为 null', () => {
      bridge.enterRoom('study')
      bridge.leaveRoom()
      expect(bridge.activeRoomId.value).toBeNull()
    })
  })

  describe('recordActivity', () => {
    it('记录活动返回 RoomActivity', () => {
      const activity = bridge.recordActivity('study', 'interact', '阅读', '深度阅读《心流》', 30, 8, '获得了新的洞察')
      expect(activity).toBeDefined()
      expect(activity.roomId).toBe('study')
      expect(activity.type).toBe('interact')
      expect(activity.moodScore).toBe(8)
      expect(activity.insight).toBe('获得了新的洞察')
    })

    it('记录后活动数增加', () => {
      const before = bridge.interactionEngine.activities.value.length
      bridge.recordActivity('study', 'interact', '阅读', '描述', 15)
      expect(bridge.interactionEngine.activities.value.length).toBeGreaterThan(before)
    })

    it('记录后情绪快照更新', () => {
      bridge.recordActivity('study', 'interact', '阅读', '描述', 30, 8)
      const snapshot = bridge.interactionEngine.moodSnapshots.value.find(s => s.roomId === 'study')
      expect(snapshot).toBeDefined()
      expect(snapshot!.visitCount).toBe(1)
    })
  })

  describe('装饰物管理', () => {
    it('placeDecoration 放置装饰物', () => {
      bridge.enterRoom('study')
      const result = bridge.placeDecoration('study', 'dec-sofa')
      expect(result).toBe(true)
    })

    it('放置后 decorationCount 更新', () => {
      bridge.enterRoom('study')
      bridge.placeDecoration('study', 'dec-sofa')
      const overview = bridge.getRoomDetail('study')
      expect(overview!.decorationCount).toBeGreaterThanOrEqual(1)
    })

    it('重复放置返回 false', () => {
      bridge.enterRoom('study')
      bridge.placeDecoration('study', 'dec-sofa')
      const result = bridge.placeDecoration('study', 'dec-sofa')
      expect(result).toBe(false)
    })

    it('removeDecoration 移除装饰物', () => {
      bridge.enterRoom('study')
      bridge.placeDecoration('study', 'dec-sofa')
      const result = bridge.removeDecoration('study', 'dec-sofa')
      expect(result).toBe(true)
    })

    it('移除不存在的装饰物返回 false', () => {
      const result = bridge.removeDecoration('study', 'non-existent')
      expect(result).toBe(false)
    })
  })

  describe('交互链', () => {
    it('startInteraction 开始交互链', () => {
      const chain = bridge.startInteraction('study', '深度阅读')
      expect(chain).not.toBeNull()
      expect(chain!.roomId).toBe('study')
      expect(chain!.name).toBe('深度阅读')
    })

    it('开始不存在的交互链返回 null', () => {
      const chain = bridge.startInteraction('study', '不存在的仪式')
      expect(chain).toBeNull()
    })

    it('completeStep 完成步骤', () => {
      const chain = bridge.startInteraction('study', '深度阅读')
      const result = bridge.completeStep(chain!.id)
      expect(result).toBe(true)
    })

    it('cancelInteraction 取消交互链', () => {
      const chain = bridge.startInteraction('study', '深度阅读')
      bridge.cancelInteraction(chain!.id)
      // 取消后活跃链不包含该链
      const active = bridge.interactionEngine.activeChains.value
      expect(active.some(c => c.id === chain!.id)).toBe(false)
    })
  })

  describe('氛围预设', () => {
    it('activatePreset 激活预设', () => {
      bridge.activatePreset('preset_0')
      expect(bridge.atmosphereEngine.activePresetId.value).toBe('preset_0')
    })
  })

  describe('getRoomDetail', () => {
    it('获取存在的房间详情', () => {
      const detail = bridge.getRoomDetail('study')
      expect(detail).not.toBeNull()
      expect(detail!.roomId).toBe('study')
    })

    it('不存在的房间返回 null', () => {
      const detail = bridge.getRoomDetail('non-existent')
      expect(detail).toBeNull()
    })
  })

  describe('getDecorationLibrary', () => {
    it('返回装饰物库', () => {
      const lib = bridge.getDecorationLibrary()
      expect(lib.length).toBeGreaterThan(0)
    })
  })

  describe('getDecorationTypeMeta', () => {
    it('返回6种装饰物类型', () => {
      const meta = bridge.getDecorationTypeMeta()
      expect(Object.keys(meta).length).toBe(6)
    })
  })

  describe('getAtmospherePresets', () => {
    it('返回6个氛围预设', () => {
      const presets = bridge.getAtmospherePresets()
      expect(presets.length).toBe(6)
    })
  })

  describe('getTransitionPresets', () => {
    it('返回6个转场预设', () => {
      const presets = bridge.getTransitionPresets()
      expect(presets.length).toBe(6)
    })
  })
})

// ============================================================
// 5. 完整工作流
// ============================================================

describe('P21-4 完整工作流', () => {
  let bridge: ReturnType<typeof useHomeBridge>

  beforeEach(() => {
    clearStorage()
    bridge = useHomeBridge()
  })

  it('进入 → 装饰 → 交互 → 记录 → 离开完整流程', () => {
    // 1. 进入书房
    const enterResult = bridge.enterRoom('study')
    expect(enterResult).not.toBeNull()
    expect(bridge.activeRoomId.value).toBe('study')

    // 2. 放置装饰物
    const decorated = bridge.placeDecoration('study', 'dec-sofa')
    expect(decorated).toBe(true)
    bridge.placeDecoration('study', 'dec-bookshelf')

    // 3. 开始交互链
    const chain = bridge.startInteraction('study', '深度阅读')
    expect(chain).not.toBeNull()

    // 4. 完成交互步骤
    const step1 = bridge.completeStep(chain!.id)
    expect(step1).toBe(true)
    const step2 = bridge.completeStep(chain!.id)
    expect(step2).toBe(true)

    // 5. 记录活动
    const activity = bridge.recordActivity('study', 'insight', '阅读感悟', '读完一章后有了新的理解', 45, 9, '专注是通往心流的大门')
    expect(activity).toBeDefined()

    // 6. 离开
    bridge.leaveRoom()
    expect(bridge.activeRoomId.value).toBeNull()

    // 7. 验证状态
    const overview = bridge.getRoomDetail('study')
    expect(overview!.visitCount).toBeGreaterThanOrEqual(1)
    expect(overview!.decorationCount).toBeGreaterThanOrEqual(2)
    expect(overview!.healthScore).toBeGreaterThan(0)
  })

  it('多房间访问后健康度全面更新', () => {
    // 访问多个房间
    bridge.enterRoom('study')
    bridge.recordActivity('study', 'interact', '阅读', '深度阅读', 30, 8)
    bridge.leaveRoom()

    bridge.enterRoom('kitchen')
    bridge.placeDecoration('kitchen', 'dec-table')
    bridge.recordActivity('kitchen', 'ritual', '烹饪', '做了晚餐', 60, 9)
    bridge.leaveRoom()

    bridge.enterRoom('bedroom')
    bridge.recordActivity('bedroom', 'rest', '休息', '午休', 30, 7)
    bridge.leaveRoom()

    // 验证健康度
    const health = bridge.homeHealth.value
    expect(health.roomCoverage).toBeGreaterThan(0)
    expect(health.interactionActivity).toBeGreaterThan(0)
    expect(health.score).toBeGreaterThan(0)

    // 验证房间排序
    const byVisits = bridge.roomsByVisits.value
    expect(byVisits[0].visitCount).toBeGreaterThanOrEqual(1)

    // 验证热力图
    const heatmap = bridge.roomHeatmap.value
    const visitedEntries = heatmap.filter(e => e.visitCount > 0)
    expect(visitedEntries.length).toBeGreaterThanOrEqual(3)

    // 验证时间线
    const today = getLocalDateKey()
    const todayEntry = bridge.activityTimeline.value.find(e => e.date === today)
    expect(todayEntry).toBeDefined()
    expect(todayEntry!.count).toBeGreaterThan(0)
  })

  it('装饰物管理完整流程', () => {
    bridge.enterRoom('study')

    // 放置多个装饰物
    expect(bridge.placeDecoration('study', 'dec-sofa')).toBe(true)
    expect(bridge.placeDecoration('study', 'dec-bookshelf')).toBe(true)
    expect(bridge.placeDecoration('study', 'dec-desk')).toBe(true)
    expect(bridge.placeDecoration('study', 'dec-bonsai')).toBe(true)

    // 验证装饰物数量
    let overview = bridge.getRoomDetail('study')
    expect(overview!.decorationCount).toBeGreaterThanOrEqual(4)

    // 移除装饰物
    expect(bridge.removeDecoration('study', 'dec-sofa')).toBe(true)
    overview = bridge.getRoomDetail('study')
    expect(overview!.decorationCount).toBeGreaterThanOrEqual(3)

    // 验证装饰物使用排行
    const ranking = bridge.decorationUsageRanking.value
    expect(ranking.length).toBeGreaterThan(0)
  })

  it('交互链完整生命周期', () => {
    // 开始交互链
    const chain = bridge.startInteraction('kitchen', '烹饪仪式')
    expect(chain).not.toBeNull()
    expect(chain!.currentStepIndex).toBe(0)

    // 完成所有步骤
    const totalSteps = chain!.steps.length
    for (let i = 0; i < totalSteps; i++) {
      const result = bridge.completeStep(chain!.id)
      expect(result).toBe(true)
    }

    // 验证所有步骤完成
    const activeChain = bridge.interactionEngine.getActiveChainForRoom('kitchen')
    // 所有步骤完成后，currentStepIndex 等于 steps.length
    expect(activeChain).toBeNull()
  })
})