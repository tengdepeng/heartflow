// ============================================================
// 家 · P21-4 视图桥接层
// 统一聚合房间交互、深度交互链、氛围引擎
// 提供可视化数据、健康度评分、房间推荐
// ============================================================

import { ref, computed } from 'vue'
import { HOME_ROOMS, getHomeRoom } from './rooms'
import { useHomeRoomInteraction, DECORATION_LIBRARY, DECORATION_TYPE_META } from './home-room-interaction'
import type { RoomCustomState } from './home-room-interaction'
import { useHomeInteractionEngine } from './home-interaction-engine'
import type {
  RoomActivityType,
  RoomActivity,
  RoomMoodSnapshot,
  InteractionChain,
  ActivitySuggestion,
} from './home-interaction-engine'
import { useHomeAtmosphereEngine, ATMOSPHERE_PRESETS, TRANSITION_PRESETS } from './home-atmosphere-engine'
import type {
  AtmospherePreset,
  HomeDashboard,
} from './home-atmosphere-engine'

// ============================================================
// 桥接层类型
// ============================================================

/** 房间概览（聚合视图） */
export interface RoomOverview {
  roomId: string
  roomName: string
  roomIcon: string
  roomColor: string
  description: string
  /** 自定义状态 */
  customState: RoomCustomState
  /** 情绪快照 */
  moodSnapshot: RoomMoodSnapshot | null
  /** 氛围预设 */
  activePreset: AtmospherePreset | null
  /** 活跃交互链 */
  activeChain: InteractionChain | null
  /** 装饰物数量 */
  decorationCount: number
  /** 访问次数 */
  visitCount: number
  /** 最后访问时间 */
  lastVisitedAt: string | null
  /** 综合健康度评分 0-100 */
  healthScore: number
}

/** 家空间健康度 */
export interface HomeHealth {
  /** 总分 0-100 */
  score: number
  /** 房间覆盖度（已访问房间比例） */
  roomCoverage: number
  /** 装饰完成度（已装饰房间比例） */
  decorationRate: number
  /** 交互活跃度 */
  interactionActivity: number
  /** 氛围多样性 */
  atmosphereDiversity: number
  /** 情绪健康度 */
  moodHealth: number
  /** 建议 */
  suggestions: string[]
}

/** 房间热力图数据 */
export interface RoomHeatmapEntry {
  roomId: string
  roomName: string
  visitCount: number
  activityScore: number
  moodScore: number
  color: string
}

/** 活动时间线 */
export interface ActivityTimelineEntry {
  date: string
  count: number
  rooms: string[]
  types: string[]
}

/** 房间推荐 */
export interface RoomRecommendation {
  roomId: string
  roomName: string
  roomIcon: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  suggestedActivity: string
  estimatedDuration: number
}

/** 桥接层完整状态 */
export interface HomeBridgeState {
  /** 当前活跃房间 */
  activeRoomId: string | null
  /** 房间概览 */
  roomOverviews: RoomOverview[]
  /** 家健康度 */
  health: HomeHealth
  /** 仪表盘 */
  dashboard: HomeDashboard | null
  /** 活动建议 */
  suggestions: ActivitySuggestion[]
  /** 房间推荐 */
  recommendations: RoomRecommendation[]
}

// ============================================================
// 视图桥接
// ============================================================

export function useHomeBridge() {
  // ---- 子模块 ----
  const roomInteraction = useHomeRoomInteraction()
  const interactionEngine = useHomeInteractionEngine()
  const atmosphereEngine = useHomeAtmosphereEngine()

  // ---- 活跃房间 ----
  const activeRoomId = ref<string | null>(null)

  // ---- 房间概览 ----
  const roomOverviews = computed<RoomOverview[]>(() => {
    return HOME_ROOMS.map(room => {
      const customState = roomInteraction.getRoomState(room.id)
      const moodSnapshot = interactionEngine.moodSnapshots.value.find(s => s.roomId === room.id) ?? null
      const atmospherePresets = atmosphereEngine.getPresetsForRoom(room.id)
      const activePreset = atmospherePresets.length > 0 ? atmospherePresets[0] : null
      const activeChain = interactionEngine.getActiveChainForRoom(room.id)

      // 综合健康度评分
      const healthScore = calculateRoomHealthScore(
        customState,
        moodSnapshot,
        activeChain,
      )

      return {
        roomId: room.id,
        roomName: customState.customName || room.name,
        roomIcon: room.icon,
        roomColor: room.color,
        description: room.description,
        customState,
        moodSnapshot,
        activePreset,
        activeChain,
        decorationCount: customState.decorations.length,
        visitCount: customState.visitCount,
        lastVisitedAt: customState.lastVisitedAt ?? null,
        healthScore,
      }
    })
  })

  // ---- 当前房间概览 ----
  const currentRoomOverview = computed(() => {
    if (!activeRoomId.value) return null
    return roomOverviews.value.find(r => r.roomId === activeRoomId.value) ?? null
  })

  // ---- 房间列表（按访问次数排序） ----
  const roomsByVisits = computed(() => {
    return [...roomOverviews.value].sort((a, b) => b.visitCount - a.visitCount)
  })

  // ---- 房间列表（按健康度排序） ----
  const roomsByHealth = computed(() => {
    return [...roomOverviews.value].sort((a, b) => b.healthScore - a.healthScore)
  })

  // ---- 最近访问的房间 ----
  const recentlyVisited = computed(() => {
    return roomOverviews.value
      .filter(r => r.lastVisitedAt)
      .sort((a, b) => new Date(b.lastVisitedAt!).getTime() - new Date(a.lastVisitedAt!).getTime())
      .slice(0, 5)
  })

  // ---- 家空间健康度 ----
  const homeHealth = computed<HomeHealth>(() => {
    const totalRooms = HOME_ROOMS.length
    const visitedRooms = roomOverviews.value.filter(r => r.visitCount > 0).length
    const decoratedRooms = roomOverviews.value.filter(r => r.decorationCount > 0).length

    const roomCoverage = Math.round((visitedRooms / totalRooms) * 100)
    const decorationRate = Math.round((decoratedRooms / totalRooms) * 100)

    // 交互活跃度
    const totalActivities = interactionEngine.activities.value.length
    const interactionActivity = Math.min(100, totalActivities * 2)

    // 氛围多样性（已激活预设数 / 总预设数）
    const atmosphereDiversity = Math.min(100,
      Math.round((atmosphereEngine.presets.value.length / ATMOSPHERE_PRESETS.length) * 100)
    )

    // 情绪健康度
    const moodSnapshots = interactionEngine.moodSnapshots.value
    const moodHealth = moodSnapshots.length > 0
      ? Math.round(
          moodSnapshots.reduce((sum, s) => {
            const trendScore = s.moodTrend === 'improving' ? 3 : s.moodTrend === 'stable' ? 2 : 1
            return sum + Math.min(100, s.avgMoodScore * 10) * 0.7 + trendScore * 10
          }, 0) / moodSnapshots.length
        )
      : 0

    // 总分加权
    const score = Math.round(
      roomCoverage * 0.25 +
      decorationRate * 0.15 +
      interactionActivity * 0.25 +
      atmosphereDiversity * 0.15 +
      moodHealth * 0.20
    )

    const suggestions: string[] = []
    if (roomCoverage < 50) suggestions.push('还有很多房间等待探索，去玄关开始你的旅程吧')
    if (decorationRate < 30) suggestions.push('试试为房间添加装饰物，让空间更有你的风格')
    if (interactionActivity < 20) suggestions.push('在房间里多停留一会儿，记录你的感受')
    if (atmosphereDiversity < 30) suggestions.push('尝试切换不同的氛围预设，发现你喜欢的空间氛围')
    if (moodHealth < 30) suggestions.push('有些房间的情绪需要关注，去那里做一些让你放松的事')

    return {
      score,
      roomCoverage,
      decorationRate,
      interactionActivity,
      atmosphereDiversity,
      moodHealth,
      suggestions,
    }
  })

  // ---- 仪表盘 ----
  const dashboard = computed<HomeDashboard>(() => {
    return atmosphereEngine.generateDashboard(HOME_ROOMS)
  })

  // ---- 活动建议 ----
  const suggestions = computed<ActivitySuggestion[]>(() => {
    return interactionEngine.generateSuggestions()
  })

  // ---- 高优先级建议 ----
  const highPrioritySuggestions = computed(() => {
    return suggestions.value.filter(s => s.priority === 'high')
  })

  // ============================================================
  // 可视化数据
  // ============================================================

  /** 房间热力图数据 */
  const roomHeatmap = computed<RoomHeatmapEntry[]>(() => {
    return roomOverviews.value.map(r => ({
      roomId: r.roomId,
      roomName: r.roomName,
      visitCount: r.visitCount,
      activityScore: r.healthScore,
      moodScore: r.moodSnapshot?.avgMoodScore ?? 0,
      color: r.roomColor,
    }))
  })

  /** 活动时间线（最近 14 天） */
  const activityTimeline = computed<ActivityTimelineEntry[]>(() => {
    const entries: Map<string, { count: number; rooms: Set<string>; types: Set<string> }> = new Map()
    const now = new Date()

    // 初始化最近 14 天
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      entries.set(dateStr, { count: 0, rooms: new Set(), types: new Set() })
    }

    // 填充活动数据
    for (const activity of interactionEngine.activities.value) {
      const dateStr = activity.createdAt.slice(0, 10)
      const entry = entries.get(dateStr)
      if (entry) {
        entry.count++
        entry.rooms.add(activity.roomId)
        entry.types.add(activity.type)
      }
    }

    return Array.from(entries.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      rooms: Array.from(data.rooms),
      types: Array.from(data.types),
    }))
  })

  /** 房间类型分布（按活动类型） */
  const roomActivityDistribution = computed(() => {
    const distribution: Record<string, Record<string, number>> = {}
    for (const room of HOME_ROOMS) {
      distribution[room.id] = { _roomName: 0 } as unknown as Record<string, number>
    }
    for (const activity of interactionEngine.activities.value) {
      if (distribution[activity.roomId]) {
        distribution[activity.roomId][activity.type] =
          ((distribution[activity.roomId][activity.type] as number) || 0) + 1
      }
    }
    return distribution
  })

  /** 装饰物使用排行 */
  const decorationUsageRanking = computed(() => {
    const usage: Record<string, { name: string; icon: string; type: string; count: number }> = {}
    for (const state of roomInteraction.customStates.value) {
      for (const dec of state.decorations) {
        if (!usage[dec.id]) {
          usage[dec.id] = { name: dec.name, icon: dec.icon, type: dec.type, count: 0 }
        }
        usage[dec.id].count++
      }
    }
    return Object.values(usage).sort((a, b) => b.count - a.count)
  })

  // ============================================================
  // 房间推荐
  // ============================================================

  /** 生成房间推荐 */
  const roomRecommendations = computed<RoomRecommendation[]>(() => {
    const recommendations: RoomRecommendation[] = []

    for (const room of HOME_ROOMS) {
      const overview = roomOverviews.value.find(r => r.roomId === room.id)
      if (!overview) continue

      let priority: 'high' | 'medium' | 'low' = 'medium'
      let reason = ''
      let suggestedActivity = ''

      if (overview.visitCount === 0) {
        priority = 'high'
        reason = '还未探索过这个空间，去发现它的秘密吧'
        suggestedActivity = '进入房间，感受它的氛围'
      } else if (overview.moodSnapshot?.moodTrend === 'declining') {
        priority = 'high'
        reason = '最近在这里的情绪在下降，需要重新连接'
        suggestedActivity = '进行一次简短的停留或仪式'
      } else if (overview.moodSnapshot?.moodTrend === 'improving') {
        priority = 'medium'
        reason = '这里让你感到越来越好，继续保持'
        suggestedActivity = '深入体验，记录你的感受'
      } else if (overview.lastVisitedAt) {
        const daysSince = Math.floor(
          (Date.now() - new Date(overview.lastVisitedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSince > 7) {
          priority = 'high'
          reason = `已有 ${daysSince} 天没有来到这里了`
          suggestedActivity = '回来看看，重新连接这个空间'
        } else if (daysSince > 3) {
          priority = 'medium'
          reason = `上次访问是 ${daysSince} 天前`
          suggestedActivity = '花几分钟在这里停留'
        } else {
          priority = 'low'
          reason = '最近来过，偶尔回来看看就好'
          suggestedActivity = '快速浏览，确认一切安好'
        }
      }

      if (overview.decorationCount === 0 && overview.visitCount > 0) {
        reason += '，试试添加装饰物'
        priority = priority === 'low' ? 'medium' : priority
      }

      recommendations.push({
        roomId: room.id,
        roomName: overview.roomName,
        roomIcon: room.icon,
        reason,
        priority,
        suggestedActivity,
        estimatedDuration: priority === 'high' ? 15 : priority === 'medium' ? 10 : 5,
      })
    }

    return recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ============================================================
  // 操作入口
  // ============================================================

  /** 进入房间 */
  function enterRoom(roomId: string): RoomOverview | null {
    const room = getHomeRoom(roomId)
    if (!room) return null

    activeRoomId.value = roomId
    roomInteraction.recordVisit(roomId)
    atmosphereEngine.recordActivity(roomId, 'visit', `进入${room.name}`)
    interactionEngine.recordActivity(roomId, 'enter', '进入房间', `进入了${room.name}`, 0)
    // 感知层联动：设置当前房间类型，触发氛围自动匹配
    atmosphereEngine.setCurrentRoomType(room.id)

    return roomOverviews.value.find(r => r.roomId === roomId) ?? null
  }

  /** 离开房间 */
  function leaveRoom() {
    activeRoomId.value = null
    atmosphereEngine.setCurrentRoomType(null)
  }

  /** 记录房间活动 */
  function recordActivity(
    roomId: string,
    type: RoomActivityType,
    label: string,
    description: string,
    duration: number,
    moodScore?: number,
    insight?: string,
  ): RoomActivity {
    // 同时记录到两个引擎
    atmosphereEngine.recordActivity(roomId, type === 'decorate' ? 'decorate' : type === 'rest' ? 'rest' : type === 'ritual' ? 'ritual' : type === 'insight' ? 'insight' : 'interact', label, duration)
    return interactionEngine.recordActivity(roomId, type, label, description, duration, moodScore, insight)
  }

  /** 放置装饰物 */
  function placeDecoration(roomId: string, decorationId: string): boolean {
    return roomInteraction.placeDecoration(roomId, decorationId)
  }

  /** 移除装饰物 */
  function removeDecoration(roomId: string, decorationId: string): boolean {
    return roomInteraction.removeDecoration(roomId, decorationId)
  }

  /** 开始交互链 */
  function startInteraction(roomId: string, chainName: string): InteractionChain | null {
    const chain = interactionEngine.startInteractionChain(roomId, chainName)
    if (chain) {
      atmosphereEngine.recordActivity(roomId, 'interact', chainName)
    }
    return chain
  }

  /** 完成当前交互步骤 */
  function completeStep(chainId: string, choiceValue?: string): boolean {
    return interactionEngine.completeCurrentStep(chainId, choiceValue)
  }

  /** 取消交互链 */
  function cancelInteraction(chainId: string) {
    interactionEngine.cancelInteractionChain(chainId)
  }

  /** 激活氛围预设 */
  function activatePreset(presetId: string) {
    atmosphereEngine.activatePreset(presetId)
  }

  /** 生成仪表盘 */
  function refreshDashboard(): HomeDashboard {
    return atmosphereEngine.generateDashboard(HOME_ROOMS)
  }

  /** 获取房间详情 */
  function getRoomDetail(roomId: string): RoomOverview | null {
    return roomOverviews.value.find(r => r.roomId === roomId) ?? null
  }

  /** 获取装饰物库 */
  function getDecorationLibrary() {
    return DECORATION_LIBRARY
  }

  /** 获取装饰物类型元数据 */
  function getDecorationTypeMeta() {
    return DECORATION_TYPE_META
  }

  /** 获取氛围预设 */
  function getAtmospherePresets() {
    return ATMOSPHERE_PRESETS
  }

  /** 获取转场预设 */
  function getTransitionPresets() {
    return TRANSITION_PRESETS
  }

  return {
    // ---- 状态 ----
    activeRoomId,
    roomOverviews,
    currentRoomOverview,
    roomsByVisits,
    roomsByHealth,
    recentlyVisited,
    homeHealth,
    dashboard,
    suggestions,
    highPrioritySuggestions,

    // ---- 子模块直通 ----
    roomInteraction,
    interactionEngine,
    atmosphereEngine,

    // ---- 可视化数据 ----
    roomHeatmap,
    activityTimeline,
    roomActivityDistribution,
    decorationUsageRanking,

    // ---- 房间推荐 ----
    roomRecommendations,

    // ---- 操作入口 ----
    enterRoom,
    leaveRoom,
    recordActivity,
    placeDecoration,
    removeDecoration,
    startInteraction,
    completeStep,
    cancelInteraction,
    activatePreset,
    refreshDashboard,
    getRoomDetail,
    getDecorationLibrary,
    getDecorationTypeMeta,
    getAtmospherePresets,
    getTransitionPresets,
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 计算单个房间健康度评分 */
function calculateRoomHealthScore(
  customState: RoomCustomState,
  moodSnapshot: RoomMoodSnapshot | null,
  activeChain: InteractionChain | null,
): number {
  let score = 0

  // 访问基础分 (0-30)
  score += Math.min(30, customState.visitCount * 3)

  // 装饰分 (0-20)
  score += Math.min(20, customState.decorations.length * 5)

  // 情绪分 (0-30)
  if (moodSnapshot) {
    score += Math.min(30, moodSnapshot.avgMoodScore * 3)
  }

  // 活跃交互链加分 (0-10)
  if (activeChain && !activeChain.cancelled) {
    score += 10
  }

  // 氛围设置加分 (0-10)
  if (customState.atmosphereIntensity > 50) {
    score += 5
  }
  if (customState.ambientSoundEnabled) {
    score += 5
  }

  return Math.min(100, score)
}