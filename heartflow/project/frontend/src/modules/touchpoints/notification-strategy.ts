// ============================================================
// 殿堂触角 · 通知触达策略引擎
// 蓝图定义：
//   智能触达时机调度（基于用户行为模式）
//   频率上限与节流控制
//   优先级调度队列
//   用户分群定向触达
//   A/B 测试支持
//   免打扰时间管理
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

// ---- 类型定义 ----

/** 通知优先级 */
export type DeliveryPriority = 'critical' | 'high' | 'normal' | 'low'

/** 触达策略 */
export interface DeliveryStrategy {
  id: string
  name: string
  description: string
  /** 优先级 */
  priority: DeliveryPriority
  /** 每日最大触达次数 */
  maxDailyDeliveries: number
  /** 最小间隔（分钟） */
  minIntervalMinutes: number
  /** 首选时段（小时，0-23） */
  preferredHours: [number, number]
  /** 避开时段（小时，0-23） */
  avoidHours: [number, number][]
  /** 是否启用 */
  enabled: boolean
  /** 是否需要用户活跃 */
  requireUserActive: boolean
  /** 冷却时间（分钟） */
  cooldownMinutes: number
  /** 触达渠道偏好 */
  channelPreference: PushChannelType[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 推送渠道 */
export type PushChannelType = 'browser' | 'desktop' | 'email' | 'in-app' | 'widget'

/** 触达队列项 */
export interface DeliveryQueueItem {
  id: string
  /** 关联策略 */
  strategyId: string
  /** 通知类型 */
  type: string
  /** 标题 */
  title: string
  /** 消息体 */
  message: string
  /** 优先级 */
  priority: DeliveryPriority
  /** 计划触达时间 */
  scheduledAt: string
  /** 过期时间 */
  expiresAt: string
  /** 状态 */
  status: 'pending' | 'delivering' | 'delivered' | 'cancelled' | 'expired'
  /** 目标渠道 */
  channel: PushChannelType
  /** 创建时间 */
  createdAt: string
}

/** 用户行为模式 */
export interface UserBehaviorProfile {
  /** 活跃时段分布（24小时） */
  activeHours: number[]
  /** 平均会话时长（分钟） */
  avgSessionMinutes: number
  /** 日常活跃天数 */
  activeDays: number
  /** 最近活跃时间 */
  lastActiveAt: string
  /** 首选通知渠道 */
  preferredChannels: PushChannelType[]
  /** 通知交互率（0-1） */
  interactionRate: number
  /** 免打扰偏好 */
  doNotDisturb: {
    enabled: boolean
    startHour: number
    endHour: number
  }
}

/** 触达统计 */
export interface DeliveryStats {
  todayDelivered: number
  todayOpened: number
  todayClicked: number
  todayDismissed: number
  hourlyDeliveries: number[]
  channelBreakdown: Record<PushChannelType, number>
  priorityBreakdown: Record<DeliveryPriority, number>
  avgResponseTimeMinutes: number
}

/** A/B 测试变体 */
export interface ABTestVariant {
  id: string
  name: string
  /** 触达时间偏移（分钟） */
  timeOffsetMinutes: number
  /** 渠道组合 */
  channels: PushChannelType[]
  /** 消息模板 */
  messageTemplate: string
  /** 权重 */
  weight: number
}

/** A/B 测试 */
export interface ABTest {
  id: string
  name: string
  description: string
  variants: ABTestVariant[]
  /** 是否启用 */
  enabled: boolean
  /** 开始时间 */
  startedAt: string
  /** 结束时间 */
  endedAt: string | null
  /** 各变体指标 */
  variantMetrics: Record<string, {
    deliveries: number
    opens: number
    clicks: number
    dismissals: number
    avgResponseTime: number
  }>
  createdAt: string
}

// ---- 预置策略 ----

export const PRESET_STRATEGIES: DeliveryStrategy[] = [
  {
    id: 'strategy_daily_anchor',
    name: '每日心锚提醒',
    description: '每天早上提醒用户设定今日心锚',
    priority: 'high',
    maxDailyDeliveries: 1,
    minIntervalMinutes: 1440,
    preferredHours: [7, 10],
    avoidHours: [[0, 6], [22, 24]],
    enabled: false,
    requireUserActive: false,
    cooldownMinutes: 1440,
    channelPreference: ['browser', 'desktop'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strategy_focus_reminder',
    name: '专注提醒',
    description: '在用户习惯的专注时段前提醒',
    priority: 'normal',
    maxDailyDeliveries: 3,
    minIntervalMinutes: 120,
    preferredHours: [9, 20],
    avoidHours: [[0, 7], [22, 24]],
    enabled: false,
    requireUserActive: true,
    cooldownMinutes: 60,
    channelPreference: ['browser', 'in-app'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strategy_achievement',
    name: '成就触达',
    description: '用户达成里程碑时推送',
    priority: 'critical',
    maxDailyDeliveries: 5,
    minIntervalMinutes: 30,
    preferredHours: [8, 22],
    avoidHours: [[0, 7]],
    enabled: false,
    requireUserActive: false,
    cooldownMinutes: 15,
    channelPreference: ['browser', 'desktop', 'email'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strategy_insight_digest',
    name: '洞察摘要',
    description: '每周总结用户的情绪与成长洞察',
    priority: 'normal',
    maxDailyDeliveries: 1,
    minIntervalMinutes: 10080,
    preferredHours: [18, 21],
    avoidHours: [[0, 9], [22, 24]],
    enabled: false,
    requireUserActive: false,
    cooldownMinutes: 10080,
    channelPreference: ['email', 'desktop'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strategy_greeting',
    name: '幕僚问候',
    description: '登录时或定时推送幕僚问候',
    priority: 'low',
    maxDailyDeliveries: 4,
    minIntervalMinutes: 180,
    preferredHours: [7, 22],
    avoidHours: [[0, 6]],
    enabled: false,
    requireUserActive: true,
    cooldownMinutes: 120,
    channelPreference: ['in-app', 'widget'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'strategy_system_alert',
    name: '系统通知',
    description: '系统更新、维护等通知',
    priority: 'high',
    maxDailyDeliveries: 2,
    minIntervalMinutes: 60,
    preferredHours: [9, 17],
    avoidHours: [[0, 8], [22, 24]],
    enabled: false,
    requireUserActive: false,
    cooldownMinutes: 30,
    channelPreference: ['browser', 'desktop', 'email'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

/** 默认用户行为画像 */
export const DEFAULT_BEHAVIOR_PROFILE: UserBehaviorProfile = {
  activeHours: [9, 10, 11, 14, 15, 16, 20, 21],
  avgSessionMinutes: 45,
  activeDays: 5,
  lastActiveAt: new Date().toISOString(),
  preferredChannels: ['browser'],
  interactionRate: 0.6,
  doNotDisturb: {
    enabled: true,
    startHour: 22,
    endHour: 7,
  },
}

// ---- 存储键 ----

const STORAGE_KEYS = {
  strategies: 'hf:touchpoints:delivery_strategies',
  queue: 'hf:touchpoints:delivery_queue',
  behaviorProfile: 'hf:touchpoints:behavior_profile',
  abTests: 'hf:touchpoints:ab_tests',
  deliveryLog: 'hf:touchpoints:delivery_log',
}

// ---- 优先级权重 ----

const PRIORITY_WEIGHT: Record<DeliveryPriority, number> = {
  critical: 100,
  high: 70,
  normal: 40,
  low: 10,
}

// ============================================================
// 触达策略引擎
// ============================================================

export function useDeliveryStrategy() {
  const strategies = ref<DeliveryStrategy[]>(
    storage.getKV<DeliveryStrategy[]>(STORAGE_KEYS.strategies, [...PRESET_STRATEGIES]),
  )
  const queue = ref<DeliveryQueueItem[]>(
    storage.getKV<DeliveryQueueItem[]>(STORAGE_KEYS.queue, []),
  )
  const behaviorProfile = ref<UserBehaviorProfile>(
    storage.getKV<UserBehaviorProfile>(STORAGE_KEYS.behaviorProfile, { ...DEFAULT_BEHAVIOR_PROFILE }),
  )
  const abTests = ref<ABTest[]>(
    storage.getKV<ABTest[]>(STORAGE_KEYS.abTests, []),
  )

  function persist() {
    storage.setKV(STORAGE_KEYS.strategies, strategies.value)
    storage.setKV(STORAGE_KEYS.queue, queue.value)
    storage.setKV(STORAGE_KEYS.behaviorProfile, behaviorProfile.value)
    storage.setKV(STORAGE_KEYS.abTests, abTests.value)
  }

  // ---- 策略管理 ----

  /** 获取策略 */
  function getStrategy(id: string): DeliveryStrategy | undefined {
    return strategies.value.find(s => s.id === id)
  }

  /** 更新策略 */
  function updateStrategy(id: string, updates: Partial<DeliveryStrategy>) {
    const s = strategies.value.find(s => s.id === id)
    if (!s) return
    Object.assign(s, updates, { updatedAt: new Date().toISOString() })
    persist()
  }

  /** 启用/禁用策略 */
  function toggleStrategy(id: string) {
    const s = strategies.value.find(s => s.id === id)
    if (!s) return
    s.enabled = !s.enabled
    persist()
  }

  /** 重置策略 */
  function resetStrategies() {
    strategies.value = [...PRESET_STRATEGIES]
    persist()
  }

  // ---- 智能调度 ----

  /** 判断当前是否在首选时段内 */
  function isInPreferredHours(strategy: DeliveryStrategy): boolean {
    const hour = new Date().getHours()
    return hour >= strategy.preferredHours[0] && hour <= strategy.preferredHours[1]
  }

  /** 判断当前是否在免打扰时段 */
  function isInAvoidHours(strategy: DeliveryStrategy): boolean {
    const hour = new Date().getHours()
    return strategy.avoidHours.some(([start, end]) => hour >= start && hour <= end)
  }

  /** 判断是否在全局免打扰 */
  function isInDoNotDisturb(): boolean {
    const { doNotDisturb } = behaviorProfile.value
    if (!doNotDisturb.enabled) return false
    const hour = new Date().getHours()
    return hour >= doNotDisturb.startHour || hour < doNotDisturb.endHour
  }

  /** 计算策略的触达评分 */
  function scoreDelivery(strategy: DeliveryStrategy, context?: {
    userRecentlyActive?: boolean
    interactionRate?: number
    timeOfDay?: number
  }): number {
    let score = PRIORITY_WEIGHT[strategy.priority]

    // 首选时段加分
    if (isInPreferredHours(strategy)) {
      score += 30
    }

    // 避开时段减分
    if (isInAvoidHours(strategy)) {
      score -= 50
    }

    // 免打扰时段大幅减分
    if (isInDoNotDisturb()) {
      score -= 80
    }

    // 用户活跃加分
    if (context?.userRecentlyActive) {
      score += 20
    }

    // 交互率调整
    if (context?.interactionRate !== undefined) {
      score += Math.round(context.interactionRate * 30)
    }

    // 时段偏好
    const hour = context?.timeOfDay ?? new Date().getHours()
    const profileHours = behaviorProfile.value.activeHours
    if (profileHours.includes(hour)) {
      score += 15
    }

    return Math.max(0, Math.min(150, score))
  }

  /** 检查是否超过每日上限 */
  function isDailyLimitReached(strategyId: string): boolean {
    // ⚠️ 「今天」按本地日历日；createdAt 是 UTC ISO 串，两侧都不可用 slice(0,10) 取 UTC 日。
    const today = getLocalDateKey()
    const todayCount = queue.value.filter(
      q => q.strategyId === strategyId &&
        q.status === 'delivered' &&
        q.createdAt && getLocalDateKey(new Date(q.createdAt)) === today,
    ).length
    const strategy = getStrategy(strategyId)
    return strategy ? todayCount >= strategy.maxDailyDeliveries : false
  }

  /** 检查冷却时间 */
  function isInCooldown(strategyId: string): boolean {
    const strategy = getStrategy(strategyId)
    if (!strategy) return false

    const lastDelivery = queue.value
      .filter(q => q.strategyId === strategyId && q.status === 'delivered')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

    if (!lastDelivery) return false

    const elapsed = (Date.now() - new Date(lastDelivery.createdAt).getTime()) / 60000
    return elapsed < strategy.minIntervalMinutes
  }

  /** 综合判断是否可以触达 */
  function canDeliver(strategyId: string, context?: {
    userRecentlyActive?: boolean
    interactionRate?: number
  }): { allowed: boolean; reason: string; score: number } {
    const strategy = getStrategy(strategyId)
    if (!strategy) return { allowed: false, reason: '策略不存在', score: 0 }

    if (!strategy.enabled) return { allowed: false, reason: '策略已禁用', score: 0 }

    if (isDailyLimitReached(strategyId)) {
      return { allowed: false, reason: '已达每日上限', score: 0 }
    }

    if (isInCooldown(strategyId)) {
      return { allowed: false, reason: '冷却中', score: 0 }
    }

    if (strategy.requireUserActive && !context?.userRecentlyActive) {
      return { allowed: false, reason: '用户未活跃', score: 0 }
    }

    const score = scoreDelivery(strategy, context)
    return { allowed: score >= 20, reason: score >= 20 ? '可触达' : '评分不足', score }
  }

  /** 调度最佳触达时间 */
  function scheduleBestTime(strategyId: string): Date | null {
    const strategy = getStrategy(strategyId)
    if (!strategy) return null

    const now = new Date()
    const currentHour = now.getHours()

    // 如果在首选时段内，直接返回当前时间
    if (isInPreferredHours(strategy)) {
      return new Date(now.getTime() + strategy.cooldownMinutes * 60000)
    }

    // 如果当前时间在首选时段之前，调度到首选时段开始
    if (currentHour < strategy.preferredHours[0]) {
      const scheduled = new Date(now)
      scheduled.setHours(strategy.preferredHours[0], 0, 0, 0)
      return scheduled
    }

    // 如果在首选时段之后，调度到明天
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(strategy.preferredHours[0], 0, 0, 0)
    return tomorrow
  }

  // ---- 队列管理 ----

  /** 加入触达队列 */
  function enqueue(
    strategyId: string,
    type: string,
    title: string,
    message: string,
    channel?: PushChannelType,
  ): DeliveryQueueItem | null {
    const strategy = getStrategy(strategyId)
    if (!strategy) return null

    const scheduledTime = scheduleBestTime(strategyId)
    if (!scheduledTime) return null

    const item: DeliveryQueueItem = {
      id: `dq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      strategyId,
      type,
      title,
      message,
      priority: strategy.priority,
      scheduledAt: scheduledTime.toISOString(),
      expiresAt: new Date(scheduledTime.getTime() + 3600000).toISOString(),
      status: 'pending',
      channel: channel ?? strategy.channelPreference[0],
      createdAt: new Date().toISOString(),
    }

    queue.value.push(item)
    persist()
    return item
  }

  /** 取出待触达项 */
  function dequeuePending(): DeliveryQueueItem[] {
    const now = new Date().toISOString()
    return queue.value.filter(
      q => q.status === 'pending' && q.scheduledAt <= now && q.expiresAt > now,
    )
  }

  /** 标记触达状态 */
  function markStatus(
    id: string,
    status: 'delivering' | 'delivered' | 'cancelled' | 'expired',
  ) {
    const item = queue.value.find(q => q.id === id)
    if (!item) return
    item.status = status
    persist()
  }

  /** 清理过期队列 */
  function cleanupExpired() {
    const now = new Date().toISOString()
    queue.value = queue.value.filter(q => {
      if (q.expiresAt < now && q.status === 'pending') {
        q.status = 'expired'
        return false
      }
      return true
    })
    // 保留最近 200 条
    if (queue.value.length > 200) {
      queue.value = queue.value.slice(-200)
    }
    persist()
  }

  /** 获取队列统计 */
  function getQueueStats() {
    const pending = queue.value.filter(q => q.status === 'pending').length
    const delivering = queue.value.filter(q => q.status === 'delivering').length
    const delivered = queue.value.filter(q => q.status === 'delivered').length
    const cancelled = queue.value.filter(q => q.status === 'cancelled').length
    return { pending, delivering, delivered, cancelled, total: queue.value.length }
  }

  // ---- 行为画像 ----

  /** 更新行为画像 */
  function updateBehaviorProfile(updates: Partial<UserBehaviorProfile>) {
    Object.assign(behaviorProfile.value, updates)
    persist()
  }

  /** 记录活跃时间 */
  function recordActivity() {
    const hour = new Date().getHours()
    if (!behaviorProfile.value.activeHours.includes(hour)) {
      behaviorProfile.value.activeHours.push(hour)
      behaviorProfile.value.activeHours.sort((a, b) => a - b)
    }
    behaviorProfile.value.lastActiveAt = new Date().toISOString()
    persist()
  }

  /** 更新交互率 */
  function updateInteractionRate(interacted: boolean) {
    const rate = behaviorProfile.value.interactionRate
    // 指数移动平均
    const alpha = 0.1
    behaviorProfile.value.interactionRate = rate * (1 - alpha) + (interacted ? 1 : 0) * alpha
    persist()
  }

  // ---- A/B 测试 ----

  /** 创建 A/B 测试 */
  function createABTest(name: string, description: string, variants: ABTestVariant[]): ABTest {
    const test: ABTest = {
      id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description,
      variants,
      enabled: false,
      startedAt: new Date().toISOString(),
      endedAt: null,
      variantMetrics: {},
      createdAt: new Date().toISOString(),
    }

    for (const v of variants) {
      test.variantMetrics[v.id] = {
        deliveries: 0,
        opens: 0,
        clicks: 0,
        dismissals: 0,
        avgResponseTime: 0,
      }
    }

    abTests.value.push(test)
    persist()
    return test
  }

  /** 选择 A/B 变体 */
  function selectABVariant(testId: string): ABTestVariant | null {
    const test = abTests.value.find(t => t.id === testId)
    if (!test || !test.enabled) return null

    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0)
    let random = Math.random() * totalWeight
    for (const v of test.variants) {
      random -= v.weight
      if (random <= 0) return v
    }
    return test.variants[0]
  }

  /** 记录 A/B 指标 */
  function recordABMetric(
    testId: string,
    variantId: string,
    action: 'delivery' | 'open' | 'click' | 'dismiss',
    responseTime?: number,
  ) {
    const test = abTests.value.find(t => t.id === testId)
    if (!test) return

    const metrics = test.variantMetrics[variantId]
    if (!metrics) return

    switch (action) {
      case 'delivery': metrics.deliveries++; break
      case 'open': metrics.opens++; break
      case 'click': metrics.clicks++; break
      case 'dismiss': metrics.dismissals++; break
    }

    if (responseTime !== undefined) {
      const total = metrics.deliveries + metrics.opens + metrics.clicks
      metrics.avgResponseTime = (metrics.avgResponseTime * (total - 1) + responseTime) / total
    }

    persist()
  }

  /** 停止 A/B 测试 */
  function stopABTest(testId: string) {
    const test = abTests.value.find(t => t.id === testId)
    if (!test) return
    test.enabled = false
    test.endedAt = new Date().toISOString()
    persist()
  }

  // ---- 计算属性 ----

  const enabledStrategies = computed(() => strategies.value.filter(s => s.enabled))

  const pendingQueue = computed(() => queue.value.filter(q => q.status === 'pending'))

  const activeABTests = computed(() => abTests.value.filter(t => t.enabled))

  const deliveryScoreBreakdown = computed(() => {
    const breakdown: Record<string, { name: string; score: number; status: string }> = {}
    for (const s of strategies.value) {
      const result = canDeliver(s.id)
      breakdown[s.id] = { name: s.name, score: result.score, status: result.reason }
    }
    return breakdown
  })

  return {
    strategies,
    queue,
    behaviorProfile,
    abTests,
    enabledStrategies,
    pendingQueue,
    activeABTests,
    deliveryScoreBreakdown,
    getStrategy,
    updateStrategy,
    toggleStrategy,
    resetStrategies,
    canDeliver,
    scheduleBestTime,
    enqueue,
    dequeuePending,
    markStatus,
    cleanupExpired,
    getQueueStats,
    updateBehaviorProfile,
    recordActivity,
    updateInteractionRate,
    createABTest,
    selectABVariant,
    recordABMetric,
    stopABTest,
    persist,
  }
}