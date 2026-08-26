// ============================================================
// 身体温室 · 健康报告生成器（P19-4）
// 日报/周报/月报生成、趋势分析、异常汇总、健康建议、报告导出
// ============================================================

import { ref } from 'vue'
import type { BodyMetric, BodyMetricType, SleepRecord } from './types'
import { BODY_METRIC_META } from './types'
import { storage } from '../../engine/storage'
import type { AnomalyReport } from './health-anomaly'
import { detectHealthAnomalies } from './health-anomaly'
import type { HealthGoal } from './health-dashboard'

// ============================================================
// 类型定义
// ============================================================

/** 报告周期 */
export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

/** 报告章节 */
export interface ReportSection {
  /** 章节 ID */
  id: string
  /** 章节标题 */
  title: string
  /** 章节类型 */
  type: 'summary' | 'metrics' | 'trends' | 'anomalies' | 'recommendations' | 'goals' | 'sleep' | 'exercise' | 'nutrition' | 'custom'
  /** 章节内容（Markdown） */
  content: string
  /** 章节数据 */
  data?: Record<string, unknown>
  /** 章节排序 */
  order: number
  /** 是否包含图表 */
  hasChart: boolean
  /** 图表配置 */
  chartConfig?: {
    type: 'line' | 'bar' | 'radar' | 'pie' | 'gauge'
    title: string
    labels: string[]
    datasets: { label: string; data: number[]; color?: string }[]
  }
}

/** 健康摘要 */
export interface HealthSummary {
  /** 综合健康评分 */
  overallScore: number
  /** 评分等级 */
  grade: 'excellent' | 'good' | 'fair' | 'poor'
  /** 评分变化 */
  scoreChange: number
  /** 关键发现 */
  keyFindings: string[]
  /** 亮点 */
  highlights: string[]
  /** 需关注点 */
  concerns: string[]
  /** 连读记录天数 */
  trackingDays: number
  /** 数据完整度 */
  dataCompleteness: number
}

/** 健康建议 */
export interface HealthRecommendation {
  /** 建议 ID */
  id: string
  /** 分类 */
  category: 'sleep' | 'exercise' | 'nutrition' | 'hydration' | 'mood' | 'general'
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 可执行步骤 */
  actionableSteps: string[]
  /** 预期效果 */
  expectedOutcome: string
  /** 参考资源 */
  references?: string[]
}

/** 报告模板 */
export interface ReportTemplate {
  /** 模板 ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 适用周期 */
  period: ReportPeriod
  /** 包含的章节类型 */
  sections: ReportSection['type'][]
  /** 是否默认模板 */
  isDefault: boolean
  /** 创建时间 */
  createdAt: string
  /** 自定义配置 */
  config?: Record<string, unknown>
}

/** 健康报告 */
export interface HealthReport {
  /** 报告 ID */
  id: string
  /** 报告标题 */
  title: string
  /** 报告周期 */
  period: ReportPeriod
  /** 报告日期范围 */
  dateRange: { start: string; end: string }
  /** 生成时间 */
  generatedAt: string
  /** 健康摘要 */
  summary: HealthSummary
  /** 报告章节 */
  sections: ReportSection[]
  /** 异常检测报告 */
  anomalyReport: AnomalyReport | null
  /** 健康建议 */
  recommendations: HealthRecommendation[]
  /** 使用的模板 */
  templateId: string
  /** 是否已读 */
  read: boolean
  /** 是否已收藏 */
  bookmarked: boolean
  /** 导出格式 */
  exportFormat?: 'json' | 'markdown' | 'html'
}

// ============================================================
// 常量
// ============================================================

const REPORT_STORAGE_KEY = 'hf:body:reports'
const REPORT_TEMPLATES_KEY = 'hf:body:report:templates'

/** 默认报告模板 */
const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'template-daily-default',
    name: '标准日报',
    description: '每日健康概览，包含关键指标、异常提醒和今日建议',
    period: 'daily',
    sections: ['summary', 'metrics', 'anomalies', 'recommendations'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-weekly-default',
    name: '标准周报',
    description: '每周健康趋势分析，包含指标变化、异常汇总和改善建议',
    period: 'weekly',
    sections: ['summary', 'metrics', 'trends', 'anomalies', 'sleep', 'exercise', 'recommendations'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-monthly-default',
    name: '标准月报',
    description: '月度健康综合分析，包含趋势预测、目标达成和长期建议',
    period: 'monthly',
    sections: ['summary', 'metrics', 'trends', 'anomalies', 'sleep', 'exercise', 'nutrition', 'goals', 'recommendations'],
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-weekly-fitness',
    name: '运动健身周报',
    description: '专注运动与体能分析，包含运动量、卡路里、运动类型分布',
    period: 'weekly',
    sections: ['summary', 'exercise', 'trends', 'goals', 'recommendations'],
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template-monthly-sleep',
    name: '睡眠健康月报',
    description: '深度睡眠分析，包含睡眠质量、生物钟、改善建议',
    period: 'monthly',
    sections: ['summary', 'sleep', 'trends', 'anomalies', 'recommendations'],
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
]

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadReports(): HealthReport[] {
  try { return JSON.parse(storage.getKV<string>(REPORT_STORAGE_KEY, '[]')) } catch { return [] }
}
function saveReports(data: HealthReport[]) {
  storage.setKV(REPORT_STORAGE_KEY, JSON.stringify(data))
}

function loadTemplates(): ReportTemplate[] {
  try {
    const saved = JSON.parse(storage.getKV<string>(REPORT_TEMPLATES_KEY, '[]'))
    return saved.length > 0 ? saved : DEFAULT_TEMPLATES
  } catch {
    return DEFAULT_TEMPLATES
  }
}
function saveTemplates(data: ReportTemplate[]) {
  storage.setKV(REPORT_TEMPLATES_KEY, JSON.stringify(data))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ============================================================
// useHealthReport Composable
// ============================================================

export function useHealthReport() {
  // ---- 状态 ----
  const reports = ref<HealthReport[]>(loadReports())
  const templates = ref<ReportTemplate[]>(loadTemplates())

  // ============================================================
  // 报告生成
  // ============================================================

  /**
   * 生成健康报告
   */
  function generateReport(
    period: ReportPeriod,
    options: {
      metrics?: BodyMetric[]
      sleepRecords?: SleepRecord[]
      healthGoals?: HealthGoal[]
      templateId?: string
      customTitle?: string
    } = {},
  ): HealthReport {
    const metrics = options.metrics ?? []
    const sleepRecords = options.sleepRecords ?? []
    const healthGoals = options.healthGoals ?? []

    // 确定日期范围
    const { dateRange, title } = getDateRangeAndTitle(period, options.customTitle)

    // 按日期范围过滤数据
    const filteredMetrics = metrics.filter(
      m => m.date >= dateRange.start && m.date <= dateRange.end,
    )
    const filteredSleep = sleepRecords.filter(
      s => s.date >= dateRange.start && s.date <= dateRange.end,
    )

    // 获取模板
    const templateId = options.templateId ?? getDefaultTemplateId(period)
    const template = templates.value.find(t => t.id === templateId)
      ?? getDefaultTemplate(period)

    // 异常检测
    const anomalyReport = filteredMetrics.length >= 3
      ? detectHealthAnomalies(filteredMetrics, filteredSleep)
      : null

    // 生成摘要
    const summary = generateSummary(filteredMetrics, filteredSleep, healthGoals, period)

    // 生成章节
    const sections = generateSections(
      template.sections,
      filteredMetrics,
      filteredSleep,
      healthGoals,
      anomalyReport,
      summary,
      dateRange,
      period,
    )

    // 生成建议
    const recommendations = generateRecommendations(
      filteredMetrics,
      filteredSleep,
      anomalyReport,
      summary,
      period,
    )

    const report: HealthReport = {
      id: generateId(),
      title,
      period,
      dateRange,
      generatedAt: new Date().toISOString(),
      summary,
      sections,
      anomalyReport,
      recommendations,
      templateId: template.id,
      read: false,
      bookmarked: false,
    }

    reports.value = [report, ...reports.value]
    saveReports(reports.value)

    return report
  }

  // ============================================================
  // 报告模板
  // ============================================================

  /**
   * 获取报告模板列表
   */
  function getReportTemplates(period?: ReportPeriod): ReportTemplate[] {
    if (period) {
      return templates.value.filter(t => t.period === period)
    }
    return templates.value
  }

  /**
   * 创建自定义模板
   */
  function customizeReport(params: {
    name: string
    description: string
    period: ReportPeriod
    sections: ReportSection['type'][]
    config?: Record<string, unknown>
  }): ReportTemplate {
    const template: ReportTemplate = {
      id: `template-custom-${Date.now()}`,
      name: params.name,
      description: params.description,
      period: params.period,
      sections: params.sections,
      isDefault: false,
      createdAt: new Date().toISOString(),
      config: params.config,
    }

    templates.value = [...templates.value, template]
    saveTemplates(templates.value)
    return template
  }

  /**
   * 删除自定义模板
   */
  function deleteTemplate(templateId: string): boolean {
    const template = templates.value.find(t => t.id === templateId)
    if (!template || template.isDefault) return false
    templates.value = templates.value.filter(t => t.id !== templateId)
    saveTemplates(templates.value)
    return true
  }

  // ============================================================
  // 报告导出
  // ============================================================

  /**
   * 导出报告
   */
  function exportReport(
    reportId: string,
    format: 'json' | 'markdown' | 'html' = 'json',
  ): string {
    const report = reports.value.find(r => r.id === reportId)
    if (!report) return ''

    report.exportFormat = format
    saveReports(reports.value)

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2)
      case 'markdown':
        return exportToMarkdown(report)
      case 'html':
        return exportToHtml(report)
      default:
        return JSON.stringify(report, null, 2)
    }
  }

  /**
   * 导出为 Markdown
   */
  function exportToMarkdown(report: HealthReport): string {
    const lines: string[] = []

    lines.push(`# ${report.title}`)
    lines.push(`> 生成时间：${new Date(report.generatedAt).toLocaleString('zh-CN')}`)
    lines.push(`> 周期：${formatDate(report.dateRange.start)} 至 ${formatDate(report.dateRange.end)}`)
    lines.push('')
    lines.push(`## 健康摘要`)
    lines.push(`- **综合评分**：${report.summary.overallScore}/100 (${getGradeLabel(report.summary.grade)})`)
    lines.push(`- **评分变化**：${report.summary.scoreChange >= 0 ? '+' : ''}${report.summary.scoreChange}`)
    lines.push(`- **追踪天数**：${report.summary.trackingDays} 天`)
    lines.push(`- **数据完整度**：${Math.round(report.summary.dataCompleteness * 100)}%`)
    lines.push('')

    if (report.summary.keyFindings.length > 0) {
      lines.push('### 关键发现')
      for (const f of report.summary.keyFindings) {
        lines.push(`- ${f}`)
      }
      lines.push('')
    }

    if (report.summary.highlights.length > 0) {
      lines.push('### 亮点')
      for (const h of report.summary.highlights) {
        lines.push(`- ${h}`)
      }
      lines.push('')
    }

    if (report.summary.concerns.length > 0) {
      lines.push('### 需关注')
      for (const c of report.summary.concerns) {
        lines.push(`- ${c}`)
      }
      lines.push('')
    }

    // 章节内容
    for (const section of report.sections) {
      lines.push(`## ${section.title}`)
      lines.push(section.content)
      lines.push('')
    }

    // 异常
    if (report.anomalyReport && report.anomalyReport.anomalies.length > 0) {
      lines.push('## 异常检测')
      lines.push(`共检测到 ${report.anomalyReport.totalAnomalies} 项异常，风险评分 ${report.anomalyReport.riskScore}/100`)
      lines.push('')
      for (const a of report.anomalyReport.anomalies) {
        lines.push(`- **[${a.severity}]** ${a.title}：${a.description}`)
      }
      lines.push('')
    }

    // 建议
    if (report.recommendations.length > 0) {
      lines.push('## 健康建议')
      for (const r of report.recommendations) {
        lines.push(`### ${r.title}`)
        lines.push(`- 优先级：${r.priority}`)
        lines.push(`- ${r.description}`)
        lines.push(`- 预期效果：${r.expectedOutcome}`)
        if (r.actionableSteps.length > 0) {
          lines.push('- 执行步骤：')
          for (const step of r.actionableSteps) {
            lines.push(`  1. ${step}`)
          }
        }
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  /**
   * 导出为 HTML
   */
  function exportToHtml(report: HealthReport): string {
    const gradeColor = {
      excellent: '#5ab8a0',
      good: '#6b9fc4',
      fair: '#f0c040',
      poor: '#ef4444',
    }[report.summary.grade]

    const severityColor = {
      critical: '#ef4444',
      warning: '#f59e6c',
      info: '#6b9fc4',
    } as Record<string, string>

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; color: ${gradeColor}; }
    .grade { font-size: 18px; color: ${gradeColor}; margin-top: 5px; }
    .meta { color: #888; font-size: 14px; margin-top: 10px; }
    .section { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 12px; }
    .section h2 { margin-top: 0; color: #1a1a2e; }
    .finding { padding: 8px 0; border-bottom: 1px solid #eee; }
    .anomaly { padding: 10px; margin: 8px 0; border-radius: 8px; border-left: 4px solid; }
    .recommendation { padding: 15px; margin: 10px 0; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .steps { margin-top: 10px; padding-left: 20px; }
    .highlight { color: #10b981; }
    .concern { color: #f59e6c; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${report.title}</h1>
    <div class="score">${report.summary.overallScore}</div>
    <div class="grade">${getGradeLabel(report.summary.grade)}</div>
    <div class="meta">${formatDate(report.dateRange.start)} - ${formatDate(report.dateRange.end)} | 生成于 ${new Date(report.generatedAt).toLocaleString('zh-CN')}</div>
  </div>
  ${report.sections.map(s => `
  <div class="section">
    <h2>${s.title}</h2>
    <div>${s.content.replace(/\n/g, '<br>')}</div>
  </div>`).join('')}
  ${report.anomalyReport?.anomalies.length ? `
  <div class="section">
    <h2>异常检测</h2>
    ${report.anomalyReport.anomalies.map(a => `
    <div class="anomaly" style="border-left-color: ${severityColor[a.severity] || '#888'}">
      <strong>[${a.severity}]</strong> ${a.title}<br>
      <small>${a.description}</small>
    </div>`).join('')}
  </div>` : ''}
  ${report.recommendations.map(r => `
  <div class="recommendation">
    <h3>${r.title}</h3>
    <p>${r.description}</p>
    <p><strong>预期效果：</strong>${r.expectedOutcome}</p>
    ${r.actionableSteps.length ? `<ol class="steps">${r.actionableSteps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
  </div>`).join('')}
</body>
</html>`
  }

  // ============================================================
  // 历史报告
  // ============================================================

  /**
   * 获取历史报告
   */
  function getHistoricalReports(
    period?: ReportPeriod,
    limit: number = 20,
  ): HealthReport[] {
    let filtered = reports.value
    if (period) {
      filtered = filtered.filter(r => r.period === period)
    }
    return filtered.slice(0, limit)
  }

  /**
   * 获取最近一份报告
   */
  function getLatestReport(period?: ReportPeriod): HealthReport | null {
    if (period) {
      return reports.value.find(r => r.period === period) ?? null
    }
    return reports.value[0] ?? null
  }

  /**
   * 标记报告为已读
   */
  function markAsRead(reportId: string): void {
    const report = reports.value.find(r => r.id === reportId)
    if (report) {
      report.read = true
      saveReports(reports.value)
    }
  }

  /**
   * 切换收藏
   */
  function toggleBookmark(reportId: string): void {
    const report = reports.value.find(r => r.id === reportId)
    if (report) {
      report.bookmarked = !report.bookmarked
      saveReports(reports.value)
    }
  }

  /**
   * 删除报告
   */
  function deleteReport(reportId: string): boolean {
    const idx = reports.value.findIndex(r => r.id === reportId)
    if (idx === -1) return false
    reports.value = reports.value.filter(r => r.id !== reportId)
    saveReports(reports.value)
    return true
  }

  // ============================================================
  // 章节生成
  // ============================================================

  function generateSections(
    sectionTypes: ReportSection['type'][],
    metrics: BodyMetric[],
    sleepRecords: SleepRecord[],
    healthGoals: HealthGoal[],
    anomalyReport: AnomalyReport | null,
    summary: HealthSummary,
    dateRange: { start: string; end: string },
    period: ReportPeriod,
  ): ReportSection[] {
    const sections: ReportSection[] = []
    let order = 0

    for (const type of sectionTypes) {
      const section = createSection(type, order++, metrics, sleepRecords, healthGoals, anomalyReport, summary, dateRange, period)
      if (section) sections.push(section)
    }

    return sections
  }

  function createSection(
    type: ReportSection['type'],
    order: number,
    metrics: BodyMetric[],
    sleepRecords: SleepRecord[],
    healthGoals: HealthGoal[],
    anomalyReport: AnomalyReport | null,
    summary: HealthSummary,
    _dateRange: { start: string; end: string },
    period: ReportPeriod,
  ): ReportSection | null {
    switch (type) {
      case 'summary':
        return createSummarySection(order, summary, period)
      case 'metrics':
        return createMetricsSection(order, metrics, period)
      case 'trends':
        return createTrendsSection(order, metrics, period)
      case 'anomalies':
        return createAnomaliesSection(order, anomalyReport)
      case 'recommendations':
        return null // 建议在顶层处理
      case 'goals':
        return createGoalsSection(order, healthGoals)
      case 'sleep':
        return createSleepSection(order, sleepRecords, period)
      case 'exercise':
        return createExerciseSection(order, metrics, period)
      case 'nutrition':
        return createNutritionSection(order, metrics, period)
      default:
        return null
    }
  }

  function createSummarySection(
    order: number,
    summary: HealthSummary,
    _period: ReportPeriod,
  ): ReportSection {
    let content = `**综合评分**：${summary.overallScore}/100（${getGradeLabel(summary.grade)}）\n\n`

    if (summary.scoreChange !== 0) {
      const arrow = summary.scoreChange > 0 ? '↑' : '↓'
      content += `**评分变化**：${arrow} ${Math.abs(summary.scoreChange)} 分\n\n`
    }

    content += `**追踪天数**：${summary.trackingDays} 天 | **数据完整度**：${Math.round(summary.dataCompleteness * 100)}%\n\n`

    if (summary.keyFindings.length > 0) {
      content += '### 关键发现\n'
      summary.keyFindings.forEach(f => { content += `- ${f}\n` })
      content += '\n'
    }

    if (summary.highlights.length > 0) {
      content += '### 亮点\n'
      summary.highlights.forEach(h => { content += `- ${h}\n` })
      content += '\n'
    }

    if (summary.concerns.length > 0) {
      content += '### 需关注\n'
      summary.concerns.forEach(c => { content += `- ${c}\n` })
      content += '\n'
    }

    return {
      id: 'section-summary',
      title: '健康概览',
      type: 'summary',
      content,
      order,
      hasChart: true,
      chartConfig: {
        type: 'gauge',
        title: '综合健康评分',
        labels: ['评分'],
        datasets: [{ label: '综合评分', data: [summary.overallScore], color: '#6b9fc4' }],
      },
    }
  }

  function createMetricsSection(
    order: number,
    metrics: BodyMetric[],
    _period: ReportPeriod,
  ): ReportSection {
    const metricTypes = ['sleep', 'exercise', 'water', 'mood', 'energy', 'nutrition'] as BodyMetricType[]
    let content = ''

    for (const type of metricTypes) {
      const typeMetrics = metrics.filter(m => m.type === type)
      if (typeMetrics.length === 0) continue

      const recent = typeMetrics.slice(-7)
      const avgValue = recent.reduce((s, m) => s + m.value, 0) / recent.length
      const meta = BODY_METRIC_META[type]
      const target = meta.target

      const status = avgValue >= target ? '达标' : '未达标'
      const statusIcon = avgValue >= target ? '✅' : '⚠️'

      content += `**${meta.label}**：${statusIcon} ${avgValue.toFixed(1)} ${meta.unit}（目标 ${target} ${meta.unit}）${status}\n\n`
    }

    if (content === '') {
      content = '暂无足够的指标数据'
    }

    return {
      id: 'section-metrics',
      title: '关键指标',
      type: 'metrics',
      content,
      order,
      hasChart: true,
      chartConfig: {
        type: 'bar',
        title: '关键指标概览',
        labels: metricTypes.filter(t => metrics.some(m => m.type === t)).map(t => BODY_METRIC_META[t].label),
        datasets: [{
          label: '当前值',
          data: metricTypes
            .filter(t => metrics.some(m => m.type === t))
            .map(t => {
              const recent = metrics.filter(m => m.type === t).slice(-7)
              return recent.reduce((s, m) => s + m.value, 0) / recent.length
            }),
          color: '#6b9fc4',
        }],
      },
    }
  }

  function createTrendsSection(
    order: number,
    metrics: BodyMetric[],
    period: ReportPeriod,
  ): ReportSection {
    const metricTypes = ['sleep', 'exercise', 'water', 'mood', 'energy'] as BodyMetricType[]
    let content = ''

    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30

    for (const type of metricTypes) {
      const typeMetrics = metrics.filter(m => m.type === type).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      if (typeMetrics.length < 3) continue

      const recent = typeMetrics.slice(-days)
      const avgValue = recent.reduce((s, m) => s + m.value, 0) / recent.length

      const previous = typeMetrics.slice(-days * 2, -days)
      const prevAvg = previous.length > 0
        ? previous.reduce((s, m) => s + m.value, 0) / previous.length
        : avgValue

      const change = prevAvg > 0 ? ((avgValue - prevAvg) / prevAvg) * 100 : 0
      const direction = change > 5 ? '↑ 上升' : change < -5 ? '↓ 下降' : '→ 稳定'
      const meta = BODY_METRIC_META[type]

      content += `**${meta.label}**：${avgValue.toFixed(1)} ${meta.unit} ${direction}（${change > 0 ? '+' : ''}${change.toFixed(0)}%）\n\n`
    }

    if (content === '') {
      content = '暂无足够的趋势数据'
    }

    return {
      id: 'section-trends',
      title: '指标趋势',
      type: 'trends',
      content,
      order,
      hasChart: true,
      chartConfig: {
        type: 'line',
        title: '指标趋势图',
        labels: [],
        datasets: [],
      },
    }
  }

  function createAnomaliesSection(
    order: number,
    anomalyReport: AnomalyReport | null,
  ): ReportSection {
    let content = ''

    if (!anomalyReport || anomalyReport.anomalies.length === 0) {
      content = '✅ 未检测到异常，各项指标正常。'
    } else {
      content = `**异常总数**：${anomalyReport.totalAnomalies} | **风险评分**：${anomalyReport.riskScore}/100\n\n`
      content += `**整体评估**：${anomalyReport.overallAssessment}\n\n`

      const critical = anomalyReport.anomalies.filter(a => a.severity === 'critical')
      const warning = anomalyReport.anomalies.filter(a => a.severity === 'warning')
      const info = anomalyReport.anomalies.filter(a => a.severity === 'info')

      if (critical.length > 0) {
        content += '### 严重异常\n'
        critical.forEach(a => {
          content += `- 🔴 **${a.title}**：${a.description}\n`
        })
        content += '\n'
      }

      if (warning.length > 0) {
        content += '### 警告\n'
        warning.slice(0, 5).forEach(a => {
          content += `- 🟡 **${a.title}**：${a.description}\n`
        })
        content += '\n'
      }

      if (info.length > 0 && info.length <= 5) {
        content += '### 提示\n'
        info.forEach(a => {
          content += `- 🔵 **${a.title}**：${a.description}\n`
        })
        content += '\n'
      }
    }

    return {
      id: 'section-anomalies',
      title: '异常检测',
      type: 'anomalies',
      content,
      order,
      hasChart: false,
    }
  }

  function createGoalsSection(
    order: number,
    healthGoals: HealthGoal[],
  ): ReportSection {
    let content = ''

    const activeGoals = healthGoals.filter(g => g.status === 'active')
    const achievedGoals = healthGoals.filter(g => g.status === 'achieved')

    if (activeGoals.length === 0 && achievedGoals.length === 0) {
      content = '暂无健康目标，设置目标可以更好地追踪健康进展。'
    } else {
      if (activeGoals.length > 0) {
        content += `**进行中**（${activeGoals.length} 项）：\n\n`
        activeGoals.forEach(g => {
          const progressPercent = Math.round(g.progress * 100)
          const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10))
          content += `- ${g.name}：${g.currentValue}/${g.targetValue} ${g.unit} [${progressBar}] ${progressPercent}%\n`
        })
        content += '\n'
      }

      if (achievedGoals.length > 0) {
        content += `**已达成**（${achievedGoals.length} 项）：\n\n`
        achievedGoals.forEach(g => {
          content += `- ✅ ${g.name}：${g.currentValue}/${g.targetValue} ${g.unit}\n`
        })
        content += '\n'
      }
    }

    return {
      id: 'section-goals',
      title: '目标追踪',
      type: 'goals',
      content,
      order,
      hasChart: false,
    }
  }

  function createSleepSection(
    order: number,
    sleepRecords: SleepRecord[],
    period: ReportPeriod,
  ): ReportSection {
    let content = ''

    if (sleepRecords.length === 0) {
      content = '暂无睡眠数据。记录睡眠数据以获得睡眠分析。'
    } else {
      const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
      const recent = sleepRecords.slice(0, days)

      const avgDuration = recent.reduce((s, r) => s + r.duration, 0) / recent.length
      const avgQuality = recent.reduce((s, r) => s + r.quality, 0) / recent.length
      const avgHours = Math.round(avgDuration / 60 * 10) / 10

      content += `**平均睡眠时长**：${avgHours} 小时\n\n`
      content += `**平均睡眠质量**：${avgQuality.toFixed(1)}/5\n\n`

      const idealHours = 7.5
      const hoursDiff = avgHours - idealHours
      if (hoursDiff < -1) {
        content += `⚠️ 睡眠时长不足，比理想时长（${idealHours}小时）少 ${Math.abs(hoursDiff).toFixed(1)} 小时\n\n`
      } else if (hoursDiff > 1) {
        content += `💡 睡眠时长偏多，比理想时长多 ${hoursDiff.toFixed(1)} 小时\n\n`
      } else {
        content += `✅ 睡眠时长在理想范围内\n\n`
      }

      if (avgQuality < 3) {
        content += '⚠️ 睡眠质量评分偏低（< 3 分）；睡眠环境与睡前习惯是常见关联因素，是否调整由你判断\n\n'
      }

      // 睡眠规律性
      if (sleepRecords.length >= 5) {
        const bedtimes = sleepRecords.map(r => {
          const b = new Date(r.sleepAt)
          return b.getHours() * 60 + b.getMinutes()
        })
        const avgBedtime = bedtimes.reduce((s, t) => s + t, 0) / bedtimes.length
        const variance = bedtimes.reduce((s, t) => s + (t - avgBedtime) ** 2, 0) / bedtimes.length
        const regularity = Math.max(0, Math.round((1 - Math.sqrt(variance) / 120) * 100))

        content += `**睡眠规律性**：${regularity}%\n\n`
        if (regularity < 70) {
          content += `⚠️ 入睡时间规律性 ${regularity}%（< 70）；固定就寝时间常有助于提升规律性，是否采用由你决定\n\n`
        }
      }
    }

    return {
      id: 'section-sleep',
      title: '睡眠分析',
      type: 'sleep',
      content,
      order,
      hasChart: true,
      chartConfig: {
        type: 'bar',
        title: '睡眠时长',
        labels: [],
        datasets: [],
      },
    }
  }

  function createExerciseSection(
    order: number,
    metrics: BodyMetric[],
    period: ReportPeriod,
  ): ReportSection {
    let content = ''

    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
    if (exerciseMetrics.length === 0) {
      content = '暂无运动数据。常见参考为每周 3 次、每次 30 分钟以上（是否执行由你决定）。'
    } else {
      const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
      const recent = exerciseMetrics.slice(-days)

      const totalDuration = recent.reduce((s, m) => s + m.value, 0)
      const avgDuration = recent.length > 0 ? totalDuration / recent.length : 0
      const activeDays = new Set(recent.map(m => m.date)).size

      content += `**运动总时长**：${totalDuration} 分钟\n\n`
      content += `**平均运动时长**：${avgDuration.toFixed(0)} 分钟/天\n\n`
      content += `**活跃天数**：${activeDays} 天\n\n`

      const weeklyTarget = period === 'weekly' ? 150 : period === 'monthly' ? 600 : 30
      if (totalDuration >= weeklyTarget) {
        content += `✅ 运动量达标！已达到推荐运动量\n\n`
      } else {
        content += `⚠️ 运动量不足，还差 ${weeklyTarget - totalDuration} 分钟达到推荐量\n\n`
      }
    }

    return {
      id: 'section-exercise',
      title: '运动分析',
      type: 'exercise',
      content,
      order,
      hasChart: true,
      chartConfig: {
        type: 'bar',
        title: '运动时长',
        labels: [],
        datasets: [],
      },
    }
  }

  function createNutritionSection(
    order: number,
    metrics: BodyMetric[],
    period: ReportPeriod,
  ): ReportSection {
    let content = ''

    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
    const nutritionMetrics = metrics.filter(m => m.type === 'nutrition').slice(-days)
    const waterMetrics = metrics.filter(m => m.type === 'water').slice(-days)

    if (nutritionMetrics.length > 0) {
      const avgNutrition = nutritionMetrics.reduce((s, m) => s + m.value, 0) / nutritionMetrics.length
      content += `**营养评分**：${avgNutrition.toFixed(0)}/100\n\n`
    }

    if (waterMetrics.length > 0) {
      const avgWater = waterMetrics.reduce((s, m) => s + m.value, 0) / waterMetrics.length
      const waterTarget = 2000
      content += `**平均饮水**：${avgWater.toFixed(0)} ml/天（目标 ${waterTarget} ml）\n\n`

      if (avgWater < waterTarget * 0.7) {
        content += '⚠️ 饮水量不足，建议增加水分摄入\n\n'
      } else {
        content += '✅ 饮水量良好\n\n'
      }
    }

    if (nutritionMetrics.length === 0 && waterMetrics.length === 0) {
      content = '暂无营养数据。记录饮食数据以获得营养分析。'
    }

    return {
      id: 'section-nutrition',
      title: '营养与饮水',
      type: 'nutrition',
      content,
      order,
      hasChart: false,
    }
  }

  // ============================================================
  // 摘要生成
  // ============================================================

  function generateSummary(
    metrics: BodyMetric[],
    sleepRecords: SleepRecord[],
    healthGoals: HealthGoal[],
    period: ReportPeriod,
  ): HealthSummary {
    // 综合评分
    const overallScore = computeOverallScore(metrics, sleepRecords)

    // 评分等级
    let grade: HealthSummary['grade']
    if (overallScore >= 85) grade = 'excellent'
    else if (overallScore >= 70) grade = 'good'
    else if (overallScore >= 50) grade = 'fair'
    else grade = 'poor'

    // 评分变化（与上一周期对比）
    const scoreChange = computeScoreChange(metrics, sleepRecords, period)

    // 关键发现
    const keyFindings: string[] = []
    const highlights: string[] = []
    const concerns: string[] = []

    // 睡眠
    if (sleepRecords.length > 0) {
      const recent = sleepRecords.slice(0, 7)
      const avgDuration = recent.reduce((s, r) => s + r.duration, 0) / recent.length
      const avgHours = Math.round(avgDuration / 60 * 10) / 10

      if (avgHours >= 7 && avgHours <= 9) {
        highlights.push(`睡眠时长良好，平均 ${avgHours} 小时/天`)
      } else if (avgHours < 6) {
        concerns.push(`睡眠时长不足，平均仅 ${avgHours} 小时/天`)
        keyFindings.push(`睡眠不足可能影响白天的精力和认知功能`)
      }

      const avgQuality = recent.reduce((s, r) => s + r.quality, 0) / recent.length
      if (avgQuality >= 4) {
        highlights.push(`睡眠质量优秀，平均 ${avgQuality.toFixed(1)}/5`)
      } else if (avgQuality < 3) {
        concerns.push(`睡眠质量偏低，平均 ${avgQuality.toFixed(1)}/5`)
      }
    }

    // 运动
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
    if (exerciseMetrics.length > 0) {
      const weeklyExercise = exerciseMetrics.slice(-7)
      const weeklyDuration = weeklyExercise.reduce((s, m) => s + m.value, 0)
      if (weeklyDuration >= 150) {
        highlights.push(`运动量达标，本周 ${weeklyDuration} 分钟`)
      } else if (weeklyDuration > 0) {
        concerns.push(`运动量不足，本周仅 ${weeklyDuration} 分钟（推荐 150 分钟）`)
      }
    }

    // 饮水
    const waterMetrics = metrics.filter(m => m.type === 'water')
    if (waterMetrics.length > 0) {
      const recentWater = waterMetrics.slice(-7)
      const avgWater = recentWater.reduce((s, m) => s + m.value, 0) / recentWater.length
      if (avgWater >= 2000) {
        highlights.push(`饮水充足，日均 ${avgWater.toFixed(0)} ml`)
      } else if (avgWater < 1000) {
        concerns.push(`饮水严重不足，日均仅 ${avgWater.toFixed(0)} ml`)
      }
    }

    // 目标
    const activeGoals = healthGoals.filter(g => g.status === 'active')
    const achievedGoals = healthGoals.filter(g => g.status === 'achieved')
    if (achievedGoals.length > 0) {
      highlights.push(`${achievedGoals.length} 项目标已达成`)
    }
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length
      if (avgProgress > 0.7) {
        highlights.push(`${activeGoals.length} 项目标进展良好`)
      }
    }

    // 追踪天数
    const allDates = new Set(metrics.map(m => m.date))
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
    const trackingDays = allDates.size

    // 数据完整度
    const expectedTypes = 5 // sleep, exercise, water, mood, energy
    const actualTypes = new Set(metrics.map(m => m.type)).size
    const dataCompleteness = Math.min(1, actualTypes / expectedTypes * (trackingDays / days))

    if (keyFindings.length === 0) {
      keyFindings.push('整体健康状况良好，各项指标正常')
    }

    return {
      overallScore,
      grade,
      scoreChange,
      keyFindings: keyFindings.slice(0, 5),
      highlights: highlights.slice(0, 5),
      concerns: concerns.slice(0, 5),
      trackingDays,
      dataCompleteness,
    }
  }

  function computeOverallScore(metrics: BodyMetric[], sleepRecords: SleepRecord[]): number {
    if (metrics.length === 0 && sleepRecords.length === 0) return 0

    let score = 0
    let weight = 0

    // 睡眠评分 (30%)
    if (sleepRecords.length > 0) {
      const recent = sleepRecords.slice(0, 7)
      const avgDuration = recent.reduce((s, r) => s + r.duration, 0) / recent.length
      const avgQuality = recent.reduce((s, r) => s + r.quality, 0) / recent.length
      const sleepScore = Math.min(100, (avgDuration / 480) * 60 + avgQuality * 8)
      score += sleepScore * 0.30
      weight += 0.30
    }

    // 运动评分 (25%)
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
    if (exerciseMetrics.length > 0) {
      const recent = exerciseMetrics.slice(-7)
      const avgDuration = recent.reduce((s, m) => s + m.value, 0) / recent.length
      const exerciseScore = Math.min(100, avgDuration * 2 + 20)
      score += exerciseScore * 0.25
      weight += 0.25
    }

    // 饮水评分 (20%)
    const waterMetrics = metrics.filter(m => m.type === 'water')
    if (waterMetrics.length > 0) {
      const recent = waterMetrics.slice(-7)
      const avgWater = recent.reduce((s, m) => s + m.value, 0) / recent.length
      const waterScore = Math.min(100, (avgWater / 2000) * 100)
      score += waterScore * 0.20
      weight += 0.20
    }

    // 情绪评分 (15%)
    const moodMetrics = metrics.filter(m => m.type === 'mood')
    if (moodMetrics.length > 0) {
      const recent = moodMetrics.slice(-7)
      const avgMood = recent.reduce((s, m) => s + m.value, 0) / recent.length
      const moodScore = Math.min(100, avgMood * 10)
      score += moodScore * 0.15
      weight += 0.15
    }

    // 精力评分 (10%)
    const energyMetrics = metrics.filter(m => m.type === 'energy')
    if (energyMetrics.length > 0) {
      const recent = energyMetrics.slice(-7)
      const avgEnergy = recent.reduce((s, m) => s + m.value, 0) / recent.length
      const energyScore = Math.min(100, avgEnergy * 20)
      score += energyScore * 0.10
      weight += 0.10
    }

    if (weight === 0) return 50
    return Math.round(score / weight)
  }

  function computeScoreChange(
    metrics: BodyMetric[],
    sleepRecords: SleepRecord[],
    period: ReportPeriod,
  ): number {
    // 简化：对比当前周期与上一周期
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30

    const currentMetrics = metrics.filter(m => {
      const d = new Date(m.date)
      const now = new Date()
      const cutoff = new Date(now.getTime() - days * 86400000)
      return d >= cutoff
    })
    const currentSleep = sleepRecords.filter(s => {
      const d = new Date(s.date)
      const now = new Date()
      const cutoff = new Date(now.getTime() - days * 86400000)
      return d >= cutoff
    })

    const previousMetrics = metrics.filter(m => {
      const d = new Date(m.date)
      const now = new Date()
      const start = new Date(now.getTime() - days * 2 * 86400000)
      const end = new Date(now.getTime() - days * 86400000)
      return d >= start && d < end
    })
    const previousSleep = sleepRecords.filter(s => {
      const d = new Date(s.date)
      const now = new Date()
      const start = new Date(now.getTime() - days * 2 * 86400000)
      const end = new Date(now.getTime() - days * 86400000)
      return d >= start && d < end
    })

    const currentScore = computeOverallScore(currentMetrics, currentSleep)
    const previousScore = computeOverallScore(previousMetrics, previousSleep)

    return currentScore - previousScore
  }

  // ============================================================
  // 建议生成
  // ============================================================

  function generateRecommendations(
    metrics: BodyMetric[],
    sleepRecords: SleepRecord[],
    anomalyReport: AnomalyReport | null,
    summary: HealthSummary,
    _period: ReportPeriod,
  ): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    let idCounter = 0

    // 基于评分的观察
    if (summary.overallScore < 50) {
      recommendations.push({
        id: `rec-${idCounter++}`,
        category: 'general',
        title: '健康综合评分',
        description: '当前健康综合评分偏低（< 50）；睡眠、运动、饮水是基础维度，从哪入手由你判断',
        priority: 'high',
        actionableSteps: [
          '每天固定时间入睡和起床，保证 7-8 小时睡眠',
          '每天快走 20-30 分钟，从低强度运动开始',
          '设置饮水提醒，每天喝足 1500-2000ml 水',
        ],
        expectedOutcome: '部分人在类似调整后 2-4 周观察到评分变化（仅供参考，效果因人而异）',
      })
    }

    // 基于睡眠的观察
    if (sleepRecords.length >= 3) {
      const recent = sleepRecords.slice(0, 7)
      const avgDuration = recent.reduce((s, r) => s + r.duration, 0) / recent.length
      const avgHours = avgDuration / 60

      if (avgHours < 6.5) {
        recommendations.push({
          id: `rec-${idCounter++}`,
          category: 'sleep',
          title: '睡眠时长',
          description: `当前平均睡眠 ${avgHours.toFixed(1)} 小时，参考区间为 7-9 小时`,
          priority: 'high',
          actionableSteps: [
            '每天提前 15 分钟上床',
            '睡前 1 小时避免使用电子设备',
            '保持卧室凉爽、黑暗和安静',
          ],
          expectedOutcome: '部分人增加 30-60 分钟睡眠后 2 周内精力改善（仅供参考）',
        })
      }

      const avgQuality = recent.reduce((s, r) => s + r.quality, 0) / recent.length
      if (avgQuality < 3) {
        recommendations.push({
          id: `rec-${idCounter++}`,
          category: 'sleep',
          title: '睡眠质量',
          description: '当前睡眠质量评分偏低；睡眠环境与习惯是常见关联因素，是否调整由你判断',
          priority: 'high',
          actionableSteps: [
            '睡前进行 5-10 分钟冥想或深呼吸',
            '避免睡前摄入咖啡因和酒精',
            '保持卧室温度在 18-22°C',
          ],
          expectedOutcome: '部分人调整 1-2 周后评分有变化（仅供参考，效果因人而异）',
        })
      }
    }

    // 基于运动的观察
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
    if (exerciseMetrics.length > 0) {
      const recent = exerciseMetrics.slice(-7)
      const weeklyDuration = recent.reduce((s, m) => s + m.value, 0)
      if (weeklyDuration < 100) {
        recommendations.push({
          id: `rec-${idCounter++}`,
          category: 'exercise',
          title: '运动量',
          description: `本周运动总时长 ${weeklyDuration} 分钟，参考最低为 150 分钟`,
          priority: 'medium',
          actionableSteps: [
            '每天安排 30 分钟快走或慢跑',
            '利用碎片时间做拉伸和深蹲',
            '周末安排一次较长时间的运动（如骑行、游泳）',
          ],
          expectedOutcome: '部分人达到每周 150 分钟后 4 周体能有改善（仅供参考）',
        })
      }
    } else if (sleepRecords.length > 0) {
      recommendations.push({
        id: `rec-${idCounter++}`,
        category: 'exercise',
        title: '运动记录',
        description: '还没有运动数据；规律运动与健康相关，是否开始记录由你决定',
        priority: 'medium',
        actionableSteps: [
          '从每天 15 分钟快走开始',
          '下载运动 APP 记录运动数据',
          '找一个运动伙伴互相督促',
        ],
        expectedOutcome: '部分人开始规律运动 2 周后精力与情绪有改善（仅供参考）',
      })
    }

    // 基于饮水的观察
    const waterMetrics = metrics.filter(m => m.type === 'water')
    if (waterMetrics.length > 0) {
      const recent = waterMetrics.slice(-7)
      const avgWater = recent.reduce((s, m) => s + m.value, 0) / recent.length
      if (avgWater < 1500) {
        recommendations.push({
          id: `rec-${idCounter++}`,
          category: 'hydration',
          title: '水分摄入',
          description: `日均饮水 ${avgWater.toFixed(0)} ml，参考最少为 1500 ml`,
          priority: 'medium',
          actionableSteps: [
            '早晨起床后先喝一杯温水（300ml）',
            '每餐前 30 分钟喝一杯水',
            '随身携带水瓶，每小时喝几口',
          ],
          expectedOutcome: '部分人提升饮水后数日观察到状态变化（仅供参考）',
        })
      }
    }

    // 基于异常的观察
    if (anomalyReport && anomalyReport.anomalies.length > 0) {
      const criticalAnomalies = anomalyReport.anomalies.filter(a => a.severity === 'critical')
      if (criticalAnomalies.length > 0) {
        recommendations.push({
          id: `rec-${idCounter++}`,
          category: 'general',
          title: '严重异常指标',
          description: `检测到 ${criticalAnomalies.length} 项严重异常；是否及如何处理由你决定，必要时可咨询专业意见`,
          priority: 'high',
          actionableSteps: criticalAnomalies.slice(0, 3).map(a => a.suggestedAction),
          expectedOutcome: '及时处理异常可避免健康风险升级',
        })
      }
    }

    return recommendations
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  function getDateRangeAndTitle(
    period: ReportPeriod,
    customTitle?: string,
  ): { dateRange: { start: string; end: string }; title: string } {
    const now = new Date()
    let start: Date
    let end = new Date(now)
    const endStr = end.toISOString().split('T')[0]

    switch (period) {
      case 'daily':
        start = new Date(now)
        break
      case 'weekly': {
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        start = new Date(now.getFullYear(), now.getMonth(), diff)
        break
      }
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        start = new Date(now)
    }

    const startStr = start.toISOString().split('T')[0]

    const title = customTitle ?? (() => {
      switch (period) {
        case 'daily': return `${formatDate(startStr)} 健康日报`
        case 'weekly': return `${formatDateShort(startStr)}-${formatDateShort(endStr)} 健康周报`
        case 'monthly': return `${start.getFullYear()}年${start.getMonth() + 1}月 健康月报`
      }
    })()

    return { dateRange: { start: startStr, end: endStr }, title }
  }

  function getDefaultTemplateId(period: ReportPeriod): string {
    switch (period) {
      case 'daily': return 'template-daily-default'
      case 'weekly': return 'template-weekly-default'
      case 'monthly': return 'template-monthly-default'
    }
  }

  function getDefaultTemplate(period: ReportPeriod): ReportTemplate {
    return DEFAULT_TEMPLATES.find(t => t.period === period && t.isDefault) ?? DEFAULT_TEMPLATES[0]
  }

  function getGradeLabel(grade: HealthSummary['grade']): string {
    const labels: Record<HealthSummary['grade'], string> = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '需改善',
    }
    return labels[grade]
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    reports,
    templates,

    // 报告生成
    generateReport,

    // 模板管理
    getReportTemplates,
    customizeReport,
    deleteTemplate,

    // 报告导出
    exportReport,

    // 历史报告
    getHistoricalReports,
    getLatestReport,
    markAsRead,
    toggleBookmark,
    deleteReport,

    // 常量
    DEFAULT_TEMPLATES,
  }
}