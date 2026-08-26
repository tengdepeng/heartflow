// ============================================================
// 殿堂触角 · 自适应渠道优化器（P20-6）
// 蓝图定义：
//   渠道优先级自动调优
//   时段策略优化
//   频率自适应调节
//   渠道组合推荐
//   成本效益分析
//   优化效果追踪
//   智能降级策略优化
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { PushChannelType } from './notification-strategy'
import type { ChannelConfig, PushRecord } from './push-channel'
import type { ChannelPerformance, HourlyPerformance } from './touch-analytics'

// ---- 类型定义 ----

/** 优化动作 */
export type OptimizationAction =
  | 'increase_priority'
  | 'decrease_priority'
  | 'enable_channel'
  | 'disable_channel'
  | 'adjust_max_daily'
  | 'adjust_preferred_hours'
  | 'swap_channel_order'
  | 'add_fallback'
  | 'remove_fallback'

/** 优化建议 */
export interface ChannelOptimizationSuggestion {
  id: string
  /** 目标渠道 */
  targetChannel: PushChannelType
  /** 优化动作 */
  action: OptimizationAction
  /** 建议标题 */
  title: string
  /** 建议描述 */
  description: string
  /** 当前值 */
  currentValue: string
  /** 建议值 */
  suggestedValue: string
  /** 预期提升 */
  expectedImprovement: string
  /** 置信度 */
  confidence: number
  /** 严重程度 */
  severity: 'critical' | 'warning' | 'info' | 'positive'
  /** 是否可以自动应用 */
  autoApplicable: boolean
  /** 创建时间 */
  createdAt: string
}

/** 渠道评分 */
export interface ChannelScore {
  channel: PushChannelType
  label: string
  /** 综合评分 0-100 */
  overallScore: number
  /** 触达率评分 */
  deliveryScore: number
  /** 交互评分 */
  engagementScore: number
  /** 成本评分 */
  costScore: number
  /** 可靠性评分 */
  reliabilityScore: number
  /** 趋势 */
  trend: 'improving' | 'stable' | 'declining'
  /** 评分详情 */
  breakdown: {
    clickRate: number
    openRate: number
    successRate: number
    dismissRate: number
    avgResponseTime: number
  }
}

/** 渠道组合推荐 */
export interface ChannelComboRecommendation {
  id: string
  /** 推荐名称 */
  name: string
  /** 描述 */
  description: string
  /** 渠道组合 */
  channels: PushChannelType[]
  /** 各渠道优先级 */
  channelPriorities: Record<PushChannelType, number>
  /** 预期综合评分 */
  expectedScore: number
  /** 适用场景 */
  scenarios: string[]
  /** 优势 */
  advantages: string[]
  /** 劣势 */
  disadvantages: string[]
  /** 置信度 */
  confidence: number
}

/** 时段优化配置 */
export interface TimeSlotOptimization {
  /** 最佳时段 */
  bestHours: { hour: number; label: string; score: number }[]
  /** 最差时段 */
  worstHours: { hour: number; label: string; score: number }[]
  /** 建议推送窗口 */
  recommendedWindows: { start: number; end: number; label: string }[]
  /** 避开窗口 */
  avoidWindows: { start: number; end: number; label: string }[]
}

/** 优化历史记录 */
export interface OptimizationRecord {
  id: string
  /** 应用的建议 */
  suggestionId: string
  /** 优化动作 */
  action: OptimizationAction
  /** 目标渠道 */
  channel: PushChannelType
  /** 优化前值 */
  beforeValue: string
  /** 优化后值 */
  afterValue: string
  /** 实际效果 */
  effect: 'improved' | 'no_change' | 'degraded'
  /** 效果指标变化 */
  metricChange: number
  /** 应用时间 */
  appliedAt: string
}

/** 优化器状态 */
export interface OptimizerState {
  /** 是否启用自动优化 */
  autoOptimizeEnabled: boolean
  /** 上次优化时间 */
  lastOptimizedAt: string | null
  /** 优化间隔（小时） */
  optimizeIntervalHours: number
  /** 历史记录 */
  history: OptimizationRecord[]
  /** 累计优化次数 */
  totalOptimizations: number
  /** 累计提升 */
  cumulativeImprovement: number
}

// ---- 常量 ----

const STORAGE_KEYS = {
  optimizerState: 'hf:touchpoints:optimizer_state',
  suggestions: 'hf:touchpoints:channel_suggestions',
  recommendations: 'hf:touchpoints:channel_recommendations',
  timeSlots: 'hf:touchpoints:time_slots',
}

const CHANNEL_LABELS: Record<string, string> = {
  browser: '浏览器通知',
  desktop: '桌面通知',
  email: '邮件通知',
  'in-app': '应用内通知',
  widget: '桌面小组件',
}

/** 渠道成本权重（越低越好） */
const CHANNEL_COST: Record<PushChannelType, number> = {
  browser: 0.1,
  desktop: 0.15,
  email: 0.3,
  'in-app': 0.05,
  widget: 0.08,
}

/** 渠道可靠性权重 */
const CHANNEL_RELIABILITY: Record<PushChannelType, number> = {
  browser: 0.85,
  desktop: 0.9,
  email: 0.95,
  'in-app': 0.98,
  widget: 0.7,
}

// ============================================================
// 自适应渠道优化器
// ============================================================

export function useChannelOptimizer() {
  const optimizerState = ref<OptimizerState>(
    storage.getKV<OptimizerState>(STORAGE_KEYS.optimizerState, {
      autoOptimizeEnabled: false,
      lastOptimizedAt: null,
      optimizeIntervalHours: 24,
      history: [],
      totalOptimizations: 0,
      cumulativeImprovement: 0,
    }),
  )
  const suggestions = ref<ChannelOptimizationSuggestion[]>(
    storage.getKV<ChannelOptimizationSuggestion[]>(STORAGE_KEYS.suggestions, []),
  )
  const recommendations = ref<ChannelComboRecommendation[]>(
    storage.getKV<ChannelComboRecommendation[]>(STORAGE_KEYS.recommendations, []),
  )
  const timeSlots = ref<TimeSlotOptimization | null>(
    storage.getKV<TimeSlotOptimization | null>(STORAGE_KEYS.timeSlots, null),
  )

  function persist() {
    storage.setKV(STORAGE_KEYS.optimizerState, optimizerState.value)
    storage.setKV(STORAGE_KEYS.suggestions, suggestions.value)
    storage.setKV(STORAGE_KEYS.recommendations, recommendations.value)
    storage.setKV(STORAGE_KEYS.timeSlots, timeSlots.value)
  }

  // ---- 渠道评分 ----

  /** 计算渠道综合评分 */
  function scoreChannel(perf: ChannelPerformance): ChannelScore {
    const deliveryScore = perf.successRate * 100
    const engagementScore = perf.clickRate * 40 + perf.openRate * 30 + (1 - perf.dismissRate) * 30
    const costScore = (1 - CHANNEL_COST[perf.channel]) * 100
    const reliabilityScore = CHANNEL_RELIABILITY[perf.channel] * 100

    const overallScore = Math.round(
      deliveryScore * 0.2 + engagementScore * 0.4 + costScore * 0.15 + reliabilityScore * 0.25,
    )

    // 趋势判断
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (perf.score > 60) trend = 'improving'
    else if (perf.score < 30) trend = 'declining'

    return {
      channel: perf.channel,
      label: CHANNEL_LABELS[perf.channel] ?? perf.channel,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      deliveryScore: Math.round(deliveryScore),
      engagementScore: Math.round(engagementScore),
      costScore: Math.round(costScore),
      reliabilityScore: Math.round(reliabilityScore),
      trend,
      breakdown: {
        clickRate: perf.clickRate,
        openRate: perf.openRate,
        successRate: perf.successRate,
        dismissRate: perf.dismissRate,
        avgResponseTime: perf.avgResponseTime,
      },
    }
  }

  /** 批量评分渠道 */
  function scoreAllChannels(performances: ChannelPerformance[]): ChannelScore[] {
    return performances.map(scoreChannel).sort((a, b) => b.overallScore - a.overallScore)
  }

  // ---- 优化建议生成 ----

  /** 生成渠道优化建议 */
  function generateOptimizationSuggestions(
    performances: ChannelPerformance[],
    channels: ChannelConfig[],
    _records: PushRecord[],
    hourlyPerformance: HourlyPerformance[],
  ): ChannelOptimizationSuggestion[] {
    const results: ChannelOptimizationSuggestion[] = []
    const scores = scoreAllChannels(performances)

    // 1. 渠道优先级调整
    const topChannel = scores[0]
    const bottomChannel = scores[scores.length - 1]
    if (topChannel && bottomChannel && topChannel.overallScore - bottomChannel.overallScore > 30) {
      const bottomConfig = channels.find(c => c.type === bottomChannel.channel)
      if (bottomConfig && bottomConfig.enabled && bottomConfig.priority > 1) {
        results.push({
          id: `opt_priority_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          targetChannel: bottomChannel.channel,
          action: 'decrease_priority',
          title: `降低 ${bottomChannel.label} 优先级`,
          description: `${bottomChannel.label} 综合评分（${bottomChannel.overallScore}）远低于 ${topChannel.label}（${topChannel.overallScore}），建议降低其优先级`,
          currentValue: `优先级 ${bottomConfig.priority}`,
          suggestedValue: `优先级 ${Math.max(1, bottomConfig.priority - 2)}`,
          expectedImprovement: '预计提升整体触达效率 5-10%',
          confidence: 0.75,
          severity: 'warning',
          autoApplicable: true,
          createdAt: new Date().toISOString(),
        })
      }

      const topConfig = channels.find(c => c.type === topChannel.channel)
      if (topConfig && topConfig.priority < 5) {
        results.push({
          id: `opt_priority_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          targetChannel: topChannel.channel,
          action: 'increase_priority',
          title: `提升 ${topChannel.label} 优先级`,
          description: `${topChannel.label} 综合评分最高（${topChannel.overallScore}），建议提升其优先级`,
          currentValue: `优先级 ${topConfig.priority}`,
          suggestedValue: `优先级 ${Math.min(5, topConfig.priority + 1)}`,
          expectedImprovement: '预计提升触达响应率 3-8%',
          confidence: 0.8,
          severity: 'positive',
          autoApplicable: true,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 2. 渠道启用/禁用建议
    for (const perf of performances) {
      const config = channels.find(c => c.type === perf.channel)
      if (!config) continue

      if (config.enabled && perf.score < 20 && perf.deliveries >= 10) {
        results.push({
          id: `opt_disable_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          targetChannel: perf.channel,
          action: 'disable_channel',
          title: `建议禁用 ${perf.label}`,
          description: `${perf.label} 评分仅 ${perf.score.toFixed(1)}，且已推送 ${perf.deliveries} 次，效果不佳`,
          currentValue: '已启用',
          suggestedValue: '建议禁用',
          expectedImprovement: '减少无效推送，节省资源',
          confidence: 0.7,
          severity: 'critical',
          autoApplicable: false,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 3. 每日上限调整
    for (const perf of performances) {
      const config = channels.find(c => c.type === perf.channel)
      if (!config || !config.enabled) continue

      if (perf.dismissRate > 0.4 && config.maxDailyPush > 10) {
        results.push({
          id: `opt_max_daily_reduce_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          targetChannel: perf.channel,
          action: 'adjust_max_daily',
          title: `减少 ${perf.label} 每日推送上限`,
          description: `${perf.label} 关闭率 ${(perf.dismissRate * 100).toFixed(1)}% 过高，建议减少推送频率`,
          currentValue: `每日 ${config.maxDailyPush} 次`,
          suggestedValue: `每日 ${Math.max(5, config.maxDailyPush - 10)} 次`,
          expectedImprovement: '预计降低用户疲劳度 20-30%',
          confidence: 0.75,
          severity: 'warning',
          autoApplicable: true,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 4. 时段优化建议
    if (hourlyPerformance.length > 0) {
      const bestHours = hourlyPerformance
        .filter(h => h.deliveries >= 3)
        .sort((a, b) => b.clickRate - a.clickRate)
        .slice(0, 3)

      const worstHours = hourlyPerformance
        .filter(h => h.deliveries >= 3)
        .sort((a, b) => a.clickRate - b.clickRate)
        .slice(0, 3)

      if (bestHours.length > 0 && worstHours.length > 0) {
        results.push({
          id: `opt_hours_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          targetChannel: 'browser',
          action: 'adjust_preferred_hours',
          title: '调整推送时段策略',
          description: `最佳时段: ${bestHours.map(h => h.label).join(', ')}；最差时段: ${worstHours.map(h => h.label).join(', ')}`,
          currentValue: `当前首选时段分布不均`,
          suggestedValue: `集中在 ${bestHours.map(h => h.label).join(', ')}`,
          expectedImprovement: '预计提升点击率 10-20%',
          confidence: 0.8,
          severity: 'info',
          autoApplicable: false,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 5. 降级链优化
    const lowReliability = scores.filter(s => s.reliabilityScore < 60)
    if (lowReliability.length > 0) {
      const reliableChannels = scores
        .filter(s => s.reliabilityScore >= 80)
        .map(s => s.channel)

      for (const lr of lowReliability) {
        if (reliableChannels.length > 0) {
          results.push({
            id: `opt_fallback_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            targetChannel: lr.channel,
            action: 'add_fallback',
            title: `为 ${lr.label} 添加降级渠道`,
            description: `${lr.label} 可靠性较低（${lr.reliabilityScore}），建议添加可靠降级渠道`,
            currentValue: '无降级策略',
            suggestedValue: `降级到 ${CHANNEL_LABELS[reliableChannels[0]]}`,
            expectedImprovement: '提升推送成功率 5-15%',
            confidence: 0.85,
            severity: 'warning',
            autoApplicable: true,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    return results
  }

  /** 刷新优化建议 */
  function refreshSuggestions(
    performances: ChannelPerformance[],
    channels: ChannelConfig[],
    records: PushRecord[],
    hourlyPerformance: HourlyPerformance[],
  ) {
    suggestions.value = generateOptimizationSuggestions(
      performances, channels, records, hourlyPerformance,
    )
    persist()
  }

  /** 应用建议 */
  function applySuggestion(suggestionId: string, channels: ChannelConfig[]): boolean {
    const suggestion = suggestions.value.find(s => s.id === suggestionId)
    if (!suggestion) return false

    const channel = channels.find(c => c.type === suggestion.targetChannel)
    if (!channel) return false

    const beforeValue = getChannelSnapshot(channel)

    switch (suggestion.action) {
      case 'increase_priority':
        channel.priority = Math.min(5, channel.priority + 1)
        break
      case 'decrease_priority':
        channel.priority = Math.max(1, channel.priority - 1)
        break
      case 'enable_channel':
        channel.enabled = true
        break
      case 'disable_channel':
        channel.enabled = false
        break
      case 'adjust_max_daily':
        const newMax = suggestion.suggestedValue.match(/\d+/)
        if (newMax) {
          channel.maxDailyPush = parseInt(newMax[0])
        }
        break
      case 'add_fallback':
        // 降级策略由推送引擎处理
        break
      default:
        break
    }

    const afterValue = getChannelSnapshot(channel)

    // 记录优化历史
    const record: OptimizationRecord = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      suggestionId,
      action: suggestion.action,
      channel: suggestion.targetChannel,
      beforeValue,
      afterValue,
      effect: 'no_change', // 实际效果需要后续评估
      metricChange: 0,
      appliedAt: new Date().toISOString(),
    }

    optimizerState.value.history.push(record)
    if (optimizerState.value.history.length > 50) {
      optimizerState.value.history = optimizerState.value.history.slice(-50)
    }
    optimizerState.value.totalOptimizations++
    optimizerState.value.lastOptimizedAt = new Date().toISOString()

    // 移除已应用的建议
    suggestions.value = suggestions.value.filter(s => s.id !== suggestionId)
    persist()
    return true
  }

  /** 获取渠道快照 */
  function getChannelSnapshot(channel: ChannelConfig): string {
    return JSON.stringify({
      enabled: channel.enabled,
      priority: channel.priority,
      maxDailyPush: channel.maxDailyPush,
    })
  }

  // ---- 渠道组合推荐 ----

  /** 生成渠道组合推荐 */
  function generateChannelCombos(scores: ChannelScore[]): ChannelComboRecommendation[] {
    const results: ChannelComboRecommendation[] = []

    // 高触达组合
    const highEngagement = scores
      .filter(s => s.engagementScore >= 30)
      .map(s => s.channel)
    if (highEngagement.length >= 2) {
      results.push({
        id: `combo_high_${Date.now()}`,
        name: '高交互组合',
        description: '优先使用交互率高的渠道，适合重要通知和成就触达',
        channels: highEngagement.slice(0, 3),
        channelPriorities: Object.fromEntries(
          highEngagement.slice(0, 3).map((c, i) => [c, 5 - i]),
        ) as Record<PushChannelType, number>,
        expectedScore: 85,
        scenarios: ['成就通知', '重要提醒', '里程碑触达'],
        advantages: ['交互率高', '用户响应快', '适合关键消息'],
        disadvantages: ['可能打扰用户', '不适合高频推送'],
        confidence: 0.85,
      })
    }

    // 低成本组合
    const lowCost = scores
      .filter(s => s.costScore >= 80)
      .sort((a, b) => b.costScore - a.costScore)
      .map(s => s.channel)
    if (lowCost.length >= 2) {
      results.push({
        id: `combo_low_cost_${Date.now()}`,
        name: '低成本组合',
        description: '优先使用低成本的渠道，适合日常推送和批量通知',
        channels: lowCost.slice(0, 3),
        channelPriorities: Object.fromEntries(
          lowCost.slice(0, 3).map((c, i) => [c, 5 - i]),
        ) as Record<PushChannelType, number>,
        expectedScore: 75,
        scenarios: ['日常问候', '批量通知', '系统更新'],
        advantages: ['成本低', '可持续推送', '适合高频场景'],
        disadvantages: ['交互率可能较低', '部分渠道功能受限'],
        confidence: 0.8,
      })
    }

    // 高可靠组合
    const highReliability = scores
      .filter(s => s.reliabilityScore >= 80)
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
      .map(s => s.channel)
    if (highReliability.length >= 2) {
      results.push({
        id: `combo_reliable_${Date.now()}`,
        name: '高可靠组合',
        description: '优先使用可靠性高的渠道，确保消息必达',
        channels: highReliability.slice(0, 3),
        channelPriorities: Object.fromEntries(
          highReliability.slice(0, 3).map((c, i) => [c, 5 - i]),
        ) as Record<PushChannelType, number>,
        expectedScore: 80,
        scenarios: ['系统告警', '安全通知', '付费提醒'],
        advantages: ['送达率高', '稳定性好', '适合关键消息'],
        disadvantages: ['可能成本较高', '需要用户授权'],
        confidence: 0.9,
      })
    }

    // 均衡组合
    const balanced = scores
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 3)
      .map(s => s.channel)
    if (balanced.length >= 2) {
      results.push({
        id: `combo_balanced_${Date.now()}`,
        name: '均衡组合',
        description: '在交互率、成本和可靠性之间取得平衡',
        channels: balanced,
        channelPriorities: Object.fromEntries(
          balanced.map((c, i) => [c, 5 - i]),
        ) as Record<PushChannelType, number>,
        expectedScore: 78,
        scenarios: ['日常推送', '混合场景', '默认策略'],
        advantages: ['综合表现好', '适应性强', '风险分散'],
        disadvantages: ['无明显优势', '可能不够极致'],
        confidence: 0.75,
      })
    }

    return results
  }

  /** 刷新渠道组合推荐 */
  function refreshRecommendations(performances: ChannelPerformance[]) {
    const scores = scoreAllChannels(performances)
    recommendations.value = generateChannelCombos(scores)
    persist()
  }

  // ---- 时段优化 ----

  /** 分析最佳时段 */
  function analyzeTimeSlots(hourlyPerformance: HourlyPerformance[]): TimeSlotOptimization {
    const scored = hourlyPerformance
      .filter(h => h.deliveries >= 2)
      .map(h => ({
        hour: h.hour,
        label: h.label,
        score: h.clickRate * 100 + (h.deliveries > 0 ? Math.min(20, h.deliveries / 5) : 0),
      }))
      .sort((a, b) => b.score - a.score)

    const bestHours = scored.slice(0, 4)
    const worstHours = scored.slice(-4).reverse()

    // 推荐推送窗口
    const recommendedWindows: { start: number; end: number; label: string }[] = []
    const avoidWindows: { start: number; end: number; label: string }[] = []

    const highScoreHours = new Set(bestHours.map(h => h.hour))
    const lowScoreHours = new Set(worstHours.map(h => h.hour))

    // 构建连续窗口
    let windowStart = -1
    for (let h = 0; h < 24; h++) {
      if (highScoreHours.has(h)) {
        if (windowStart === -1) windowStart = h
      } else {
        if (windowStart !== -1 && h - windowStart >= 1) {
          recommendedWindows.push({
            start: windowStart,
            end: h,
            label: `${String(windowStart).padStart(2, '0')}:00-${String(h).padStart(2, '0')}:00`,
          })
        }
        windowStart = -1
      }
    }
    if (windowStart !== -1) {
      recommendedWindows.push({
        start: windowStart,
        end: 24,
        label: `${String(windowStart).padStart(2, '0')}:00-24:00`,
      })
    }

    windowStart = -1
    for (let h = 0; h < 24; h++) {
      if (lowScoreHours.has(h) && !highScoreHours.has(h)) {
        if (windowStart === -1) windowStart = h
      } else {
        if (windowStart !== -1 && h - windowStart >= 1) {
          avoidWindows.push({
            start: windowStart,
            end: h,
            label: `${String(windowStart).padStart(2, '0')}:00-${String(h).padStart(2, '0')}:00`,
          })
        }
        windowStart = -1
      }
    }
    if (windowStart !== -1) {
      avoidWindows.push({
        start: windowStart,
        end: 24,
        label: `${String(windowStart).padStart(2, '0')}:00-24:00`,
      })
    }

    const optimization: TimeSlotOptimization = {
      bestHours,
      worstHours,
      recommendedWindows,
      avoidWindows,
    }

    timeSlots.value = optimization
    persist()
    return optimization
  }

  // ---- 效果追踪 ----

  /** 评估优化效果 */
  function evaluateOptimization(
    recordId: string,
    newPerformances: ChannelPerformance[],
  ) {
    const record = optimizerState.value.history.find(r => r.id === recordId)
    if (!record) return

    const newPerf = newPerformances.find(p => p.channel === record.channel)
    if (!newPerf) return

    const oldScore = parseInt(record.beforeValue.match(/\d+/)?.[0] ?? '0')
    const newScore = newPerf.score

    const metricChange = newScore - oldScore

    let effect: 'improved' | 'no_change' | 'degraded'
    if (metricChange > 5) effect = 'improved'
    else if (metricChange < -5) effect = 'degraded'
    else effect = 'no_change'

    record.effect = effect
    record.metricChange = metricChange

    if (effect === 'improved') {
      optimizerState.value.cumulativeImprovement += metricChange
    }

    persist()
  }

  /** 回滚优化 */
  function rollbackOptimization(recordId: string, channels: ChannelConfig[]): boolean {
    const record = optimizerState.value.history.find(r => r.id === recordId)
    if (!record) return false

    const channel = channels.find(c => c.type === record.channel)
    if (!channel) return false

    try {
      const before = JSON.parse(record.beforeValue)
      channel.enabled = before.enabled ?? channel.enabled
      channel.priority = before.priority ?? channel.priority
      channel.maxDailyPush = before.maxDailyPush ?? channel.maxDailyPush

      record.effect = 'degraded'
      record.metricChange = -record.metricChange
      persist()
      return true
    } catch {
      return false
    }
  }

  // ---- 自动优化 ----

  /** 启用自动优化 */
  function enableAutoOptimize(intervalHours: number = 24) {
    optimizerState.value.autoOptimizeEnabled = true
    optimizerState.value.optimizeIntervalHours = intervalHours
    persist()
  }

  /** 禁用自动优化 */
  function disableAutoOptimize() {
    optimizerState.value.autoOptimizeEnabled = false
    persist()
  }

  /** 执行自动优化 */
  function autoOptimize(
    performances: ChannelPerformance[],
    channels: ChannelConfig[],
    records: PushRecord[],
    hourlyPerformance: HourlyPerformance[],
  ): ChannelOptimizationSuggestion[] {
    if (!optimizerState.value.autoOptimizeEnabled) return []

    refreshSuggestions(performances, channels, records, hourlyPerformance)

    // 自动应用高置信度且可自动应用的建议
    const autoApplied: ChannelOptimizationSuggestion[] = []
    for (const suggestion of suggestions.value) {
      if (suggestion.autoApplicable && suggestion.confidence >= 0.7) {
        if (applySuggestion(suggestion.id, channels)) {
          autoApplied.push(suggestion)
        }
      }
    }

    return autoApplied
  }

  // ---- 计算属性 ----

  const activeSuggestions = computed(() =>
    suggestions.value.filter(s => {
      const age = Date.now() - new Date(s.createdAt).getTime()
      return age < 7 * 86400000
    }),
  )

  const recentHistory = computed(() =>
    optimizerState.value.history.slice(-10).reverse(),
  )

  const needsOptimization = computed(() =>
    activeSuggestions.value.some(s => s.severity === 'critical' || s.severity === 'warning'),
  )

  return {
    optimizerState,
    suggestions,
    recommendations,
    timeSlots,
    activeSuggestions,
    recentHistory,
    needsOptimization,
    scoreChannel,
    scoreAllChannels,
    generateOptimizationSuggestions,
    refreshSuggestions,
    applySuggestion,
    generateChannelCombos,
    refreshRecommendations,
    analyzeTimeSlots,
    evaluateOptimization,
    rollbackOptimization,
    enableAutoOptimize,
    disableAutoOptimize,
    autoOptimize,
    persist,
  }
}