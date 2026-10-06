// ============================================================
// 殿堂触角 · 触达分析与优化
// 蓝图定义：
//   触达漏斗分析（发送→送达→打开→点击→转化）
//   渠道性能对比
//   时段效果分析
//   用户参与度评分
//   自适应优化建议
//   趋势预测与异常检测
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { PushChannelType } from './notification-strategy'
import type { PushRecord } from './push-channel'
import { getLocalDateKey } from '../../utils/time'

// ---- 类型定义 ----

/** 触达漏斗阶段 */
export interface FunnelStage {
  stage: 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted'
  label: string
  count: number
  rate: number
  dropOff: number
}

/** 触达漏斗 */
export interface DeliveryFunnel {
  total: number
  stages: FunnelStage[]
  conversionRate: number
}

/** 时段效果 */
export interface HourlyPerformance {
  hour: number
  label: string
  deliveries: number
  clicks: number
  clickRate: number
  avgResponseTime: number
}

/** 渠道效果 */
export interface ChannelPerformance {
  channel: PushChannelType
  label: string
  deliveries: number
  clicks: number
  openRate: number
  clickRate: number
  dismissRate: number
  avgResponseTime: number
  successRate: number
  score: number
}

/** 优化建议 */
export interface OptimizationSuggestion {
  id: string
  type: 'channel' | 'timing' | 'frequency' | 'content' | 'permission'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  action: string
  metric: string
  currentValue: number | string
  targetValue: number | string
  createdAt: string
}

/** 趋势分析 */
export interface TrendAnalysis {
  /** 趋势方向 */
  direction: 'up' | 'down' | 'stable'
  /** 变化率 */
  changeRate: number
  /** 预测值 */
  prediction: number
  /** 置信度 */
  confidence: number
  /** 数据点 */
  dataPoints: number[]
}

/** 触达综合报告 */
export interface DeliveryReport {
  /** 报告时间范围 */
  period: {
    start: string
    end: string
  }
  /** 整体指标 */
  overview: {
    totalDeliveries: number
    totalClicks: number
    clickRate: number
    avgResponseTime: number
    activeChannels: number
  }
  /** 漏斗 */
  funnel: DeliveryFunnel
  /** 渠道排行 */
  channelRanking: ChannelPerformance[]
  /** 时段热力图 */
  hourlyHeatmap: HourlyPerformance[]
  /** 趋势 */
  trends: {
    delivery: TrendAnalysis
    clickRate: TrendAnalysis
    responseTime: TrendAnalysis
  }
  /** 优化建议 */
  suggestions: OptimizationSuggestion[]
}

// ---- 存储键 ----

const STORAGE_KEYS = {
  analytics: 'hf:touchpoints:analytics_data',
  reports: 'hf:touchpoints:delivery_reports',
  suggestions: 'hf:touchpoints:optimization_suggestions',
}

/** 时段标签 */
const HOUR_LABELS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
]

// ============================================================
// 触达分析引擎
// ============================================================

export function useTouchAnalytics() {
  const reports = ref<DeliveryReport[]>(
    storage.getKV<DeliveryReport[]>(STORAGE_KEYS.reports, []),
  )
  const suggestions = ref<OptimizationSuggestion[]>(
    storage.getKV<OptimizationSuggestion[]>(STORAGE_KEYS.suggestions, []),
  )

  function persist() {
    storage.setKV(STORAGE_KEYS.reports, reports.value)
    storage.setKV(STORAGE_KEYS.suggestions, suggestions.value)
  }

  // ---- 漏斗分析 ----

  /** 计算触达漏斗 */
  function computeFunnel(records: PushRecord[]): DeliveryFunnel {
    const total = records.length
    if (total === 0) {
      return { total: 0, stages: [], conversionRate: 0 }
    }

    const delivered = records.filter(r => r.success).length
    const opened = records.filter(r => r.openedAt).length
    const clicked = records.filter(r => r.clickedAt).length
    const converted = clicked // 点击视为转化

    const stages: FunnelStage[] = [
      { stage: 'sent', label: '发送', count: total, rate: 1, dropOff: 0 },
      {
        stage: 'delivered',
        label: '送达',
        count: delivered,
        rate: total > 0 ? delivered / total : 0,
        dropOff: total - delivered,
      },
      {
        stage: 'opened',
        label: '打开',
        count: opened,
        rate: delivered > 0 ? opened / delivered : 0,
        dropOff: delivered - opened,
      },
      {
        stage: 'clicked',
        label: '点击',
        count: clicked,
        rate: opened > 0 ? clicked / opened : 0,
        dropOff: opened - clicked,
      },
      {
        stage: 'converted',
        label: '转化',
        count: converted,
        rate: clicked > 0 ? converted / clicked : 0,
        dropOff: clicked - converted,
      },
    ]

    return { total, stages, conversionRate: total > 0 ? converted / total : 0 }
  }

  // ---- 时段分析 ----

  /** 计算时段效果 */
  function computeHourlyPerformance(records: PushRecord[]): HourlyPerformance[] {
    const hourlyData: Record<number, { deliveries: number; clicks: number; responseTimes: number[] }> = {}

    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { deliveries: 0, clicks: 0, responseTimes: [] }
    }

    for (const r of records) {
      const hour = new Date(r.pushedAt).getHours()
      hourlyData[hour].deliveries++
      if (r.clickedAt) {
        hourlyData[hour].clicks++
      }
      if (r.responseTimeMs !== null) {
        hourlyData[hour].responseTimes.push(r.responseTimeMs)
      }
    }

    return Array.from({ length: 24 }, (_, h) => {
      const d = hourlyData[h]
      const avgResponseTime = d.responseTimes.length > 0
        ? d.responseTimes.reduce((a, b) => a + b, 0) / d.responseTimes.length
        : 0
      return {
        hour: h,
        label: HOUR_LABELS[h],
        deliveries: d.deliveries,
        clicks: d.clicks,
        clickRate: d.deliveries > 0 ? d.clicks / d.deliveries : 0,
        avgResponseTime: Math.round(avgResponseTime),
      }
    })
  }

  /** 找到最佳触达时段 */
  function findBestHours(records: PushRecord[], topN: number = 3): HourlyPerformance[] {
    const hourly = computeHourlyPerformance(records)
    return hourly
      .filter(h => h.deliveries > 0)
      .sort((a, b) => b.clickRate - a.clickRate)
      .slice(0, topN)
  }

  /** 找到最差触达时段 */
  function findWorstHours(records: PushRecord[], topN: number = 3): HourlyPerformance[] {
    const hourly = computeHourlyPerformance(records)
    return hourly
      .filter(h => h.deliveries > 0)
      .sort((a, b) => a.clickRate - b.clickRate)
      .slice(0, topN)
  }

  // ---- 渠道分析 ----

  /** 计算渠道效果 */
  function computeChannelPerformance(records: PushRecord[]): ChannelPerformance[] {
    const channelMap: Record<string, {
      deliveries: number
      success: number
      opens: number
      clicks: number
      dismissals: number
      responseTimes: number[]
    }> = {}

    for (const r of records) {
      if (!channelMap[r.channel]) {
        channelMap[r.channel] = { deliveries: 0, success: 0, opens: 0, clicks: 0, dismissals: 0, responseTimes: [] }
      }
      const d = channelMap[r.channel]
      d.deliveries++
      if (r.success) d.success++
      if (r.openedAt) d.opens++
      if (r.clickedAt) d.clicks++
      if (r.dismissedAt) d.dismissals++
      if (r.responseTimeMs !== null) d.responseTimes.push(r.responseTimeMs)
    }

    const CHANNEL_LABELS: Record<string, string> = {
      browser: '浏览器通知',
      desktop: '桌面通知',
      email: '邮件通知',
      'in-app': '应用内通知',
      widget: '桌面小组件',
    }

    return Object.entries(channelMap).map(([channel, d]) => {
      const openRate = d.deliveries > 0 ? d.opens / d.deliveries : 0
      const clickRate = d.deliveries > 0 ? d.clicks / d.deliveries : 0
      const dismissRate = d.deliveries > 0 ? d.dismissals / d.deliveries : 0
      const successRate = d.deliveries > 0 ? d.success / d.deliveries : 0
      const avgResponseTime = d.responseTimes.length > 0
        ? d.responseTimes.reduce((a, b) => a + b, 0) / d.responseTimes.length
        : 0

      const score = (clickRate * 40) + (openRate * 30) + (successRate * 20) + ((1 - dismissRate) * 10)

      return {
        channel: channel as PushChannelType,
        label: CHANNEL_LABELS[channel] ?? channel,
        deliveries: d.deliveries,
        clicks: d.clicks,
        openRate,
        clickRate,
        dismissRate,
        avgResponseTime: Math.round(avgResponseTime),
        successRate,
        score: Math.round(score * 100) / 100,
      }
    }).sort((a, b) => b.score - a.score)
  }

  // ---- 趋势分析 ----

  /** 计算趋势 */
  function computeTrend(dataPoints: number[]): TrendAnalysis {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        prediction: dataPoints[0] ?? 0,
        confidence: 0,
        dataPoints,
      }
    }

    const n = dataPoints.length
    const mean = dataPoints.reduce((a, b) => a + b, 0) / n

    // 简单线性回归
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += dataPoints[i]
      sumXY += i * dataPoints[i]
      sumX2 += i * i
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const changeRate = mean > 0 ? (slope * n) / mean : 0

    const direction: 'up' | 'down' | 'stable' =
      Math.abs(changeRate) < 0.05 ? 'stable' :
      changeRate > 0 ? 'up' : 'down'

    // 预测下一个值
    const prediction = Math.max(0, mean + slope * n)

    // 置信度（基于 R²）
    let ssRes = 0, ssTot = 0
    for (let i = 0; i < n; i++) {
      const predicted = mean + slope * (i - n / 2)
      ssRes += (dataPoints[i] - predicted) ** 2
      ssTot += (dataPoints[i] - mean) ** 2
    }
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0
    const confidence = Math.max(0, Math.min(1, rSquared))

    return { direction, changeRate, prediction, confidence, dataPoints }
  }

  /** 按天聚合数据 */
  function aggregateByDay(records: PushRecord[], days: number = 7): { deliveries: number[]; clicks: number[]; responseTimes: number[] } {
    const deliveries: number[] = []
    const clicks: number[] = []
    const responseTimes: number[] = []

    for (let d = days - 1; d >= 0; d--) {
      const date = new Date()
      date.setDate(date.getDate() - d)
      // ⚠️ 分桶键按本地日历日；pushedAt 是 UTC ISO 串，两侧都不可 slice(0,10) 取 UTC 日。
      const dateStr = getLocalDateKey(date)

      const dayRecords = records.filter(
        r => r.pushedAt && getLocalDateKey(new Date(r.pushedAt)) === dateStr,
      )
      deliveries.push(dayRecords.length)
      clicks.push(dayRecords.filter(r => r.clickedAt).length)

      const dayResponseTimes = dayRecords
        .filter(r => r.responseTimeMs !== null)
        .map(r => r.responseTimeMs!)
      const avgResponseTime = dayResponseTimes.length > 0
        ? dayResponseTimes.reduce((a, b) => a + b, 0) / dayResponseTimes.length
        : 0
      responseTimes.push(Math.round(avgResponseTime))
    }

    return { deliveries, clicks, responseTimes }
  }

  // ---- 优化建议 ----

  /** 生成优化建议 */
  function generateSuggestions(records: PushRecord[]): OptimizationSuggestion[] {
    const results: OptimizationSuggestion[] = []
    const channelPerf = computeChannelPerformance(records)
    const { deliveries, clicks, responseTimes: _responseTimes } = aggregateByDay(records)

    // 渠道建议
    const lowPerformingChannel = channelPerf.find(c => c.score < 30 && c.deliveries >= 5)
    if (lowPerformingChannel) {
      results.push({
        id: `sug_channel_${Date.now()}`,
        type: 'channel',
        severity: 'warning',
        title: `${lowPerformingChannel.label}渠道效果不佳`,
        description: `${lowPerformingChannel.label}的点击率仅 ${(lowPerformingChannel.clickRate * 100).toFixed(1)}%，建议减少该渠道的推送频率或调整消息内容`,
        action: '考虑降低该渠道优先级或暂停使用',
        metric: '点击率',
        currentValue: `${(lowPerformingChannel.clickRate * 100).toFixed(1)}%`,
        targetValue: '> 5%',
        createdAt: new Date().toISOString(),
      })
    }

    const highPerformingChannel = channelPerf.find(c => c.score > 70 && c.deliveries >= 10)
    if (highPerformingChannel) {
      results.push({
        id: `sug_channel_good_${Date.now()}`,
        type: 'channel',
        severity: 'info',
        title: `${highPerformingChannel.label}渠道表现优异`,
        description: `${highPerformingChannel.label}的点击率达到 ${(highPerformingChannel.clickRate * 100).toFixed(1)}%，建议增加该渠道的使用`,
        action: '提高该渠道优先级并增加推送量',
        metric: '点击率',
        currentValue: `${(highPerformingChannel.clickRate * 100).toFixed(1)}%`,
        targetValue: '维持 > 10%',
        createdAt: new Date().toISOString(),
      })
    }

    // 时段建议
    const bestHours = findBestHours(records, 2)
    const worstHours = findWorstHours(records, 2)
    if (bestHours.length > 0 && worstHours.length > 0) {
      results.push({
        id: `sug_timing_${Date.now()}`,
        type: 'timing',
        severity: 'info',
        title: '触达时段优化建议',
        description: `最佳触达时段: ${bestHours.map(h => h.label).join(', ')}（点击率 ${(bestHours[0].clickRate * 100).toFixed(1)}%） vs 最差时段: ${worstHours.map(h => h.label).join(', ')}（点击率 ${(worstHours[0].clickRate * 100).toFixed(1)}%）`,
        action: '调整触达策略的首选时段设置',
        metric: '时段点击率',
        currentValue: `最差 ${(worstHours[0].clickRate * 100).toFixed(1)}%`,
        targetValue: `> ${(bestHours[0].clickRate * 100).toFixed(1)}%`,
        createdAt: new Date().toISOString(),
      })
    }

    // 频率建议
    const totalDeliveries = deliveries.reduce((a, b) => a + b, 0)
    const totalClicks = clicks.reduce((a, b) => a + b, 0)
    const overallClickRate = totalDeliveries > 0 ? totalClicks / totalDeliveries : 0

    if (totalDeliveries > 20 && overallClickRate < 0.05) {
      results.push({
        id: `sug_frequency_${Date.now()}`,
        type: 'frequency',
        severity: 'warning',
        title: '通知频率过高',
        description: `总点击率仅 ${(overallClickRate * 100).toFixed(1)}%，可能因推送频率过高导致用户疲劳`,
        action: '考虑降低每日推送上限或增加最小间隔时间',
        metric: '总点击率',
        currentValue: `${(overallClickRate * 100).toFixed(1)}%`,
        targetValue: '> 8%',
        createdAt: new Date().toISOString(),
      })
    }

    // 趋势建议
    const clickRateTrend = computeTrend(
      deliveries.map((d, i) => (d > 0 ? clicks[i] / d : 0)),
    )

    if (clickRateTrend.direction === 'down' && clickRateTrend.confidence > 0.5) {
      results.push({
        id: `sug_trend_${Date.now()}`,
        type: 'content',
        severity: 'critical',
        title: '点击率持续下降',
        description: `点击率呈下降趋势（${(clickRateTrend.changeRate * 100).toFixed(1)}%），建议优化消息内容`,
        action: '尝试 A/B 测试不同消息模板以提升用户参与度',
        metric: '点击率趋势',
        currentValue: `下降 ${(Math.abs(clickRateTrend.changeRate) * 100).toFixed(1)}%`,
        targetValue: '稳定或上升',
        createdAt: new Date().toISOString(),
      })
    }

    // 权限建议
    if (records.some(r => r.channel === 'browser' && !r.success)) {
      results.push({
        id: `sug_permission_${Date.now()}`,
        type: 'permission',
        severity: 'warning',
        title: '部分浏览器通知失败',
        description: '浏览器通知权限未授予，可能影响触达率',
        action: '引导用户开启浏览器通知权限',
        metric: '浏览器通知成功率',
        currentValue: `${(records.filter(r => r.channel === 'browser' && r.success).length / Math.max(1, records.filter(r => r.channel === 'browser').length) * 100).toFixed(1)}%`,
        targetValue: '100%',
        createdAt: new Date().toISOString(),
      })
    }

    return results
  }

  // ---- 综合报告 ----

  /** 生成触达综合报告 */
  function generateReport(records: PushRecord[], days: number = 7): DeliveryReport {
    const now = new Date()
    const end = now.toISOString()
    const start = new Date(now.getTime() - days * 86400000).toISOString()

    const periodRecords = records.filter(r => r.pushedAt >= start && r.pushedAt <= end)

    const funnel = computeFunnel(periodRecords)
    const channelRanking = computeChannelPerformance(periodRecords)
    const hourlyHeatmap = computeHourlyPerformance(periodRecords)
    const { deliveries, clicks, responseTimes } = aggregateByDay(periodRecords, days)

    const clickRates = deliveries.map((d, i) => (d > 0 ? clicks[i] / d : 0))

    const overview = {
      totalDeliveries: periodRecords.length,
      totalClicks: periodRecords.filter(r => r.clickedAt).length,
      clickRate: periodRecords.length > 0
        ? periodRecords.filter(r => r.clickedAt).length / periodRecords.length
        : 0,
      avgResponseTime: periodRecords
        .filter(r => r.responseTimeMs !== null)
        .reduce((acc, r) => acc + (r.responseTimeMs ?? 0), 0) / Math.max(1, periodRecords.filter(r => r.responseTimeMs !== null).length),
      activeChannels: new Set(periodRecords.map(r => r.channel)).size,
    }

    const report: DeliveryReport = {
      period: { start, end },
      overview,
      funnel,
      channelRanking,
      hourlyHeatmap,
      trends: {
        delivery: computeTrend(deliveries),
        clickRate: computeTrend(clickRates),
        responseTime: computeTrend(responseTimes),
      },
      suggestions: generateSuggestions(periodRecords),
    }

    reports.value.push(report)
    if (reports.value.length > 10) {
      reports.value = reports.value.slice(-10)
    }

    suggestions.value = report.suggestions
    persist()

    return report
  }

  // ---- 趋势预测 ----

  /** 预测未来触达量 */
  function predictDeliveries(records: PushRecord[], futureDays: number = 3): number[] {
    const { deliveries } = aggregateByDay(records, 7)
    const trend = computeTrend(deliveries)
    const predictions: number[] = []

    for (let i = 0; i < futureDays; i++) {
      predictions.push(Math.round(trend.prediction * (1 + trend.changeRate * i)))
    }

    return predictions
  }

  /** 异常检测 */
  function detectAnomalies(records: PushRecord[]): {
    type: 'spike' | 'drop' | 'none'
    date: string
    value: number
    threshold: number
    description: string
  }[] {
    const { deliveries, clicks: _clicksForAnomaly } = aggregateByDay(records, 14)
    const anomalies: any[] = []

    const deliveryMean = deliveries.reduce((a, b) => a + b, 0) / (deliveries.length || 1)
    const deliveryStd = Math.sqrt(
      deliveries.reduce((a, b) => a + (b - deliveryMean) ** 2, 0) / (deliveries.length || 1),
    )

    const threshold = deliveryMean + 2 * deliveryStd

    for (let i = 0; i < deliveries.length; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (deliveries.length - 1 - i))
      // 与 aggregateByDay 的分桶键同基（本地日历日），否则异常会标到错误的日期上
      const dateStr = getLocalDateKey(date)

      if (deliveries[i] > threshold) {
        anomalies.push({
          type: 'spike' as const,
          date: dateStr,
          value: deliveries[i],
          threshold: Math.round(threshold),
          description: `推送量异常飙升: ${deliveries[i]} (均值 ${Math.round(deliveryMean)}, 阈值 ${Math.round(threshold)})`,
        })
      } else if (deliveries[i] < deliveryMean - deliveryStd * 1.5 && deliveries[i] > 0) {
        anomalies.push({
          type: 'drop' as const,
          date: dateStr,
          value: deliveries[i],
          threshold: Math.round(deliveryMean - deliveryStd * 1.5),
          description: `推送量异常下降: ${deliveries[i]} (均值 ${Math.round(deliveryMean)})`,
        })
      }
    }

    return anomalies
  }

  // ---- 计算属性 ----

  const latestReport = computed(() => reports.value[reports.value.length - 1] ?? null)

  const activeSuggestions = computed(() =>
    suggestions.value.filter(s => {
      const age = Date.now() - new Date(s.createdAt).getTime()
      return age < 7 * 86400000 // 7天内的建议
    }),
  )

  return {
    reports,
    suggestions,
    latestReport,
    activeSuggestions,
    computeFunnel,
    computeHourlyPerformance,
    findBestHours,
    findWorstHours,
    computeChannelPerformance,
    computeTrend,
    aggregateByDay,
    generateSuggestions,
    generateReport,
    predictDeliveries,
    detectAnomalies,
    persist,
  }
}