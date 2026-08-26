// ============================================================
// 时间长廊 · 导出增强（P18-1）
// 多格式导出、批量导出、日程导出、导出模板、导出历史
// ============================================================

import type { RiverItem } from './river'
import type { NarrativeReport } from './narrative-generator'
import type { AnnualReview } from './annual-review'
import type { EmotionCurve } from './emotion-curve'
import type { TimelineRadarReport } from './timeline-radar'

// ============================================================
// 类型定义
// ============================================================

/** 导出格式 */
export type ExportFormat = 'markdown' | 'json' | 'csv' | 'html' | 'pdf'

/** 导出目标 */
export type ExportTarget = 'narrative' | 'annual_review' | 'emotion_curve' | 'radar' | 'raw_data' | 'custom'

/** 导出项 */
export interface ExportItem {
  id: string
  target: ExportTarget
  format: ExportFormat
  /** 数据源 */
  data: unknown
  /** 导出配置 */
  config: ExportConfig
  /** 导出状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed'
  /** 导出结果 */
  result?: ExportResult
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
}

/** 导出配置 */
export interface ExportConfig {
  /** 是否包含元数据 */
  includeMetadata: boolean
  /** 是否包含统计 */
  includeStats: boolean
  /** 是否包含图表 */
  includeCharts: boolean
  /** 日期范围 */
  dateRange?: { start: string; end: string }
  /** 模板名称 */
  template?: string
  /** 自定义标题 */
  title?: string
  /** 自定义描述 */
  description?: string
  /** 是否压缩 */
  compress: boolean
  /** 是否加密 */
  encrypt: boolean
  /** 加密密码 */
  password?: string
}

/** 导出结果 */
export interface ExportResult {
  /** 导出内容 */
  content: string
  /** 文件大小（字节） */
  fileSize: number
  /** 导出格式 */
  format: ExportFormat
  /** MIME 类型 */
  mimeType: string
  /** 文件名 */
  filename: string
  /** 导出时间 */
  exportedAt: string
  /** 数据行数 */
  rowCount?: number
  /** 包含章节数 */
  sectionCount?: number
}

/** 导出模板 */
export interface ExportTemplate {
  id: string
  name: string
  description: string
  /** 适用目标 */
  targets: ExportTarget[]
  /** 适用格式 */
  formats: ExportFormat[]
  /** 模板配置 */
  config: Partial<ExportConfig>
  /** 自定义样式 */
  styles?: string
  /** 页眉 */
  header?: string
  /** 页脚 */
  footer?: string
  /** 是否内置 */
  builtin: boolean
}

/** 导出历史 */
export interface ExportHistory {
  items: ExportHistoryItem[]
  totalExports: number
  totalSize: number
  lastExportAt?: string
}

/** 导出历史项 */
export interface ExportHistoryItem {
  id: string
  target: ExportTarget
  format: ExportFormat
  filename: string
  fileSize: number
  exportedAt: string
  dataSummary: string
}

/** 批量导出任务 */
export interface BatchExportTask {
  id: string
  /** 导出项 */
  items: ExportItem[]
  /** 状态 */
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  /** 进度 */
  progress: number
  /** 完成数 */
  completed: number
  /** 失败数 */
  failed: number
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
}

/** 导出引擎配置 */
export interface ExportEngineConfig {
  /** 默认导出格式 */
  defaultFormat: ExportFormat
  /** 默认导出路径 */
  defaultPath: string
  /** 最大文件大小（MB） */
  maxFileSize: number
  /** 是否自动导出 */
  autoExport: boolean
  /** 自动导出间隔（天） */
  autoExportInterval: number
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: ExportEngineConfig = {
  defaultFormat: 'markdown',
  defaultPath: '',
  maxFileSize: 50,
  autoExport: false,
  autoExportInterval: 7,
}

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeMetadata: true,
  includeStats: true,
  includeCharts: false,
  compress: false,
  encrypt: false,
}

// MIME 类型映射
const MIME_TYPES: Record<ExportFormat, string> = {
  markdown: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  html: 'text/html',
  pdf: 'application/pdf',
}

// 文件扩展名映射
const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  markdown: '.md',
  json: '.json',
  csv: '.csv',
  html: '.html',
  pdf: '.pdf',
}

// ============================================================
// 内置导出模板
// ============================================================

const BUILTIN_TEMPLATES: ExportTemplate[] = [
  {
    id: 'template_minimal',
    name: '简洁版',
    description: '仅包含核心数据，适合快速查看',
    targets: ['narrative', 'annual_review', 'raw_data'],
    formats: ['markdown', 'json'],
    config: { includeMetadata: false, includeStats: false, includeCharts: false },
    builtin: true,
  },
  {
    id: 'template_standard',
    name: '标准版',
    description: '包含完整数据和统计信息',
    targets: ['narrative', 'annual_review', 'emotion_curve', 'radar'],
    formats: ['markdown', 'html', 'json'],
    config: { includeMetadata: true, includeStats: true, includeCharts: true },
    builtin: true,
  },
  {
    id: 'template_detailed',
    name: '详细版',
    description: '包含所有数据、图表和分析',
    targets: ['annual_review', 'narrative'],
    formats: ['html', 'markdown'],
    config: { includeMetadata: true, includeStats: true, includeCharts: true },
    builtin: true,
  },
  {
    id: 'template_data',
    name: '数据版',
    description: '纯数据导出，适合进一步分析',
    targets: ['raw_data'],
    formats: ['csv', 'json'],
    config: { includeMetadata: false, includeStats: false, includeCharts: false },
    builtin: true,
  },
  {
    id: 'template_share',
    name: '分享版',
    description: '适合分享给他人的精简版本',
    targets: ['narrative', 'annual_review'],
    formats: ['html', 'markdown'],
    config: { includeMetadata: true, includeStats: true, includeCharts: true },
    builtin: true,
  },
]

// ============================================================
// useExportEngine
// ============================================================

export function useExportEngine() {
  let config = { ...DEFAULT_CONFIG }
  const templates: ExportTemplate[] = [...BUILTIN_TEMPLATES]
  const history: ExportHistory = { items: [], totalExports: 0, totalSize: 0 }

  function setConfig(partial: Partial<ExportEngineConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 单次导出 ----

  /**
   * 导出叙事报告
   */
  function exportNarrativeReport(
    report: NarrativeReport,
    format: ExportFormat = config.defaultFormat,
    exportConfig: Partial<ExportConfig> = {},
  ): ExportResult {
    const mergedConfig = { ...DEFAULT_EXPORT_CONFIG, ...exportConfig }
    let content = ''

    switch (format) {
      case 'markdown':
        content = generateMarkdownNarrative(report, mergedConfig)
        break
      case 'json':
        content = JSON.stringify(report, null, 2)
        break
      case 'html':
        content = generateHtmlNarrative(report, mergedConfig)
        break
      case 'csv':
        content = generateCsvNarrative(report, mergedConfig)
        break
      default:
        content = generateMarkdownNarrative(report, mergedConfig)
    }

    const filename = generateFilename('narrative', report.dateRange.start, format, report.title)
    return createResult(content, format, filename)
  }

  /**
   * 导出年度回顾
   */
  function exportAnnualReview(
    review: AnnualReview,
    format: ExportFormat = config.defaultFormat,
    exportConfig: Partial<ExportConfig> = {},
  ): ExportResult {
    const mergedConfig = { ...DEFAULT_EXPORT_CONFIG, ...exportConfig }
    let content = ''

    switch (format) {
      case 'markdown':
        content = generateMarkdownAnnualReview(review, mergedConfig)
        break
      case 'json':
        content = JSON.stringify(review, null, 2)
        break
      case 'html':
        content = generateHtmlAnnualReview(review, mergedConfig)
        break
      default:
        content = generateMarkdownAnnualReview(review, mergedConfig)
    }

    const filename = generateFilename('annual_review', `${review.year}-01-01`, format, review.title)
    return createResult(content, format, filename)
  }

  /**
   * 导出情感曲线
   */
  function exportEmotionCurve(
    curve: EmotionCurve,
    format: ExportFormat = 'json',
    exportConfig: Partial<ExportConfig> = {},
  ): ExportResult {
    const mergedConfig = { ...DEFAULT_EXPORT_CONFIG, ...exportConfig }
    let content = ''

    switch (format) {
      case 'json':
        content = JSON.stringify(curve, null, 2)
        break
      case 'csv':
        content = generateCsvEmotionCurve(curve)
        break
      case 'markdown':
        content = generateMarkdownEmotionCurve(curve, mergedConfig)
        break
      default:
        content = JSON.stringify(curve, null, 2)
    }

    const filename = generateFilename('emotion_curve', curve.dataPoints[0]?.date || '', format, curve.name)
    return createResult(content, format, filename)
  }

  /**
   * 导出时间线雷达
   */
  function exportRadar(
    radar: TimelineRadarReport,
    format: ExportFormat = 'json',
    exportConfig: Partial<ExportConfig> = {},
  ): ExportResult {
    const mergedConfig = { ...DEFAULT_EXPORT_CONFIG, ...exportConfig }
    let content = ''

    switch (format) {
      case 'json':
        content = JSON.stringify(radar, null, 2)
        break
      case 'markdown':
        content = generateMarkdownRadar(radar, mergedConfig)
        break
      default:
        content = JSON.stringify(radar, null, 2)
    }

    const filename = generateFilename('radar', new Date().toISOString().split('T')[0], format, '时间线雷达')
    return createResult(content, format, filename)
  }

  /**
   * 导出原始数据
   */
  function exportRawData(
    items: RiverItem[],
    format: ExportFormat = 'csv',
    _exportConfig: Partial<ExportConfig> = {},
  ): ExportResult {
    let content = ''

    switch (format) {
      case 'csv':
        content = generateCsvRawData(items)
        break
      case 'json':
        content = JSON.stringify(items, null, 2)
        break
      default:
        content = generateCsvRawData(items)
    }

    const filename = generateFilename('raw_data', new Date().toISOString().split('T')[0], format, '原始数据')
    return createResult(content, format, filename, items.length)
  }

  // ---- 批量导出 ----

  /**
   * 创建批量导出任务
   */
  function createBatchTask(
    items: { target: ExportTarget; data: unknown; format?: ExportFormat; config?: Partial<ExportConfig> }[],
  ): BatchExportTask {
    const exportItems: ExportItem[] = items.map(item => ({
      id: `export_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      target: item.target,
      format: item.format || config.defaultFormat,
      data: item.data,
      config: { ...DEFAULT_EXPORT_CONFIG, ...item.config },
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }))

    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      items: exportItems,
      status: 'pending',
      progress: 0,
      completed: 0,
      failed: 0,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * 执行批量导出
   */
  function executeBatchTask(task: BatchExportTask): BatchExportTask {
    task.status = 'processing'

    for (const item of task.items) {
      try {
        item.status = 'processing'
        let result: ExportResult

        switch (item.target) {
          case 'narrative':
            result = exportNarrativeReport(item.data as NarrativeReport, item.format, item.config)
            break
          case 'annual_review':
            result = exportAnnualReview(item.data as AnnualReview, item.format, item.config)
            break
          case 'emotion_curve':
            result = exportEmotionCurve(item.data as EmotionCurve, item.format, item.config)
            break
          case 'radar':
            result = exportRadar(item.data as TimelineRadarReport, item.format, item.config)
            break
          case 'raw_data':
            result = exportRawData(item.data as RiverItem[], item.format, item.config)
            break
          default:
            throw new Error(`Unknown export target: ${item.target}`)
        }

        item.result = result
        item.status = 'completed'
        item.completedAt = new Date().toISOString()
        task.completed++

        // 记录历史
        addToHistory(item.target, item.format, result.filename, result.fileSize, result.exportedAt)
      } catch {
        item.status = 'failed'
        item.completedAt = new Date().toISOString()
        task.failed++
      }

      task.progress = Math.round(((task.completed + task.failed) / task.items.length) * 100)
    }

    if (task.failed === 0) {
      task.status = 'completed'
    } else if (task.completed === 0) {
      task.status = 'failed'
    } else {
      task.status = 'partial'
    }

    task.completedAt = new Date().toISOString()
    return task
  }

  // ---- 模板管理 ----

  /**
   * 获取所有模板
   */
  function getTemplates(): ExportTemplate[] {
    return [...templates]
  }

  /**
   * 获取指定目标和格式的模板
   */
  function getTemplatesFor(target: ExportTarget, format: ExportFormat): ExportTemplate[] {
    return templates.filter(t => t.targets.includes(target) && t.formats.includes(format))
  }

  /**
   * 添加自定义模板
   */
  function addTemplate(template: Omit<ExportTemplate, 'id' | 'builtin'>): ExportTemplate {
    const t: ExportTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      builtin: false,
    }
    templates.push(t)
    return t
  }

  /**
   * 删除自定义模板
   */
  function removeTemplate(templateId: string): boolean {
    const idx = templates.findIndex(t => t.id === templateId && !t.builtin)
    if (idx < 0) return false
    templates.splice(idx, 1)
    return true
  }

  // ---- 历史记录 ----

  function addToHistory(
    target: ExportTarget,
    format: ExportFormat,
    filename: string,
    fileSize: number,
    exportedAt: string,
  ): void {
    const item: ExportHistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      target,
      format,
      filename,
      fileSize,
      exportedAt,
      dataSummary: `${target} - ${format}`,
    }
    history.items.unshift(item)
    history.totalExports++
    history.totalSize += fileSize
    history.lastExportAt = exportedAt

    // 仅保留最近 100 条
    if (history.items.length > 100) {
      history.items = history.items.slice(0, 100)
    }
  }

  /**
   * 获取导出历史
   */
  function getHistory(): ExportHistory {
    return {
      items: [...history.items],
      totalExports: history.totalExports,
      totalSize: history.totalSize,
      lastExportAt: history.lastExportAt,
    }
  }

  /**
   * 清除导出历史
   */
  function clearHistory(): void {
    history.items = []
    history.totalExports = 0
    history.totalSize = 0
    history.lastExportAt = undefined
  }

  // ---- 工具函数 ----

  function generateFilename(
    type: string,
    date: string,
    format: ExportFormat,
    title?: string,
  ): string {
    const safeTitle = title
      ? `_${title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 50)}`
      : ''
    const dateStr = date ? `_${date.slice(0, 10)}` : ''
    return `${type}${dateStr}${safeTitle}${FILE_EXTENSIONS[format]}`
  }

  function createResult(
    content: string,
    format: ExportFormat,
    filename: string,
    rowCount?: number,
  ): ExportResult {
    const fileSize = new Blob([content]).size
    return {
      content,
      fileSize,
      format,
      mimeType: MIME_TYPES[format],
      filename,
      exportedAt: new Date().toISOString(),
      rowCount,
      sectionCount: undefined,
    }
  }

  // ============================================================
  // Markdown 生成器
  // ============================================================

  function generateMarkdownNarrative(
    report: NarrativeReport,
    config: ExportConfig,
  ): string {
    const lines: string[] = []

    lines.push(`# ${config.title || report.title}`)
    if (config.includeMetadata && config.description) {
      lines.push(`> ${config.description}`)
    }
    lines.push('')
    lines.push(`**日期范围**: ${report.dateRange.start} ~ ${report.dateRange.end}`)
    lines.push(`**类型**: ${report.type}`)
    if (config.includeStats) {
      lines.push('')
      lines.push('## 统计概览')
      lines.push('')
      lines.push(`| 指标 | 数值 |`)
      lines.push(`|------|------|`)
      lines.push(`| 专注总时长 | ${report.stats.totalFocusMinutes} 分钟 |`)
      lines.push(`| 总结晶数 | ${report.stats.totalCrystals} |`)
      lines.push(`| 总笔记数 | ${report.stats.totalNotes} |`)
      lines.push(`| 总情绪记录 | ${report.stats.totalEmotions} |`)
      lines.push(`| 心锚完成率 | ${report.stats.anchorCompletionRate}% |`)
      lines.push(`| 日均专注 | ${report.stats.averageDailyFocus} 分钟 |`)
      lines.push(`| 主导情绪 | ${report.stats.dominantEmotion} |`)
    }
    lines.push('')
    lines.push('## 摘要')
    lines.push(report.summary)

    if (report.segments.length > 0) {
      lines.push('')
      lines.push('## 每日叙事')
      for (const seg of report.segments) {
        lines.push(`### ${seg.label}`)
        lines.push(`- **亮点**: ${seg.highlight}`)
        lines.push(`- **情绪**: ${seg.emotion}`)
        lines.push(`- **洞察**: ${seg.insight}`)
        lines.push('')
      }
    }

    if (report.milestones && report.milestones.length > 0) {
      lines.push('## 里程碑')
      for (const m of report.milestones) {
        lines.push(`- [${m.icon}] **${m.title}**: ${m.description} (${m.date})`)
      }
    }

    if (report.suggestions && report.suggestions.length > 0) {
      lines.push('')
      lines.push('## 个性化建议')
      for (const s of report.suggestions) {
        lines.push(`- **[${s.priority}] ${s.title}**: ${s.description}`)
      }
    }

    return lines.join('\n')
  }

  function generateMarkdownAnnualReview(
    review: AnnualReview,
    config: ExportConfig,
  ): string {
    const lines: string[] = []

    lines.push(`# ${review.title}`)
    lines.push('')
    lines.push(review.summary)
    lines.push('')

    if (config.includeStats) {
      lines.push('## 年度统计')
      lines.push('')
      lines.push(`| 指标 | 数值 |`)
      lines.push(`|------|------|`)
      lines.push(`| 专注总时长 | ${review.stats.totalFocusMinutes} 分钟 |`)
      lines.push(`| 专注天数 | ${review.stats.focusDays} 天 |`)
      lines.push(`| 日均专注 | ${review.stats.avgDailyFocus} 分钟 |`)
      lines.push(`| 最长连续 | ${review.stats.longestStreak} 天 |`)
      lines.push(`| 总结晶 | ${review.stats.totalCrystals} 个 |`)
      lines.push(`| 总笔记 | ${review.stats.totalNotes} 篇 |`)
      lines.push(`| 情绪健康指数 | ${review.stats.emotionalHealthScore}% |`)
      lines.push(`| 年度等级 | ${review.stats.annualLevel} |`)
      lines.push('')
    }

    // 月度统计
    lines.push('## 月度统计')
    lines.push('')
    lines.push('| 月份 | 专注(分) | 结晶 | 笔记 | 情绪 | 评分 | 亮点 |')
    lines.push('|------|----------|------|------|------|------|------|')
    for (const m of review.monthlyStats) {
      lines.push(`| ${m.label} | ${m.focusMinutes} | ${m.crystals} | ${m.notes} | ${m.emotions} | ${m.score} | ${m.highlight} |`)
    }
    lines.push('')

    // 里程碑
    if (review.milestones.length > 0) {
      lines.push('## 里程碑')
      for (const m of review.milestones) {
        lines.push(`- [${m.icon}] **${m.title}**: ${m.description}`)
      }
      lines.push('')
    }

    // 洞察
    if (review.insights.length > 0) {
      lines.push('## 年度洞察')
      for (const i of review.insights) {
        lines.push(`### ${i.title}`)
        lines.push(i.description)
        if (i.suggestion) lines.push(`> 💡 ${i.suggestion}`)
        lines.push('')
      }
    }

    // 展望
    lines.push('## 新年展望')
    lines.push(review.outlook.message)
    lines.push('')
    if (review.outlook.goals.length > 0) {
      lines.push('### 年度目标')
      for (const g of review.outlook.goals) {
        lines.push(`- **[${g.area}]** ${g.target} (${g.difficulty})`)
      }
    }

    return lines.join('\n')
  }

  function generateMarkdownEmotionCurve(
    curve: EmotionCurve,
    config: ExportConfig,
  ): string {
    const lines: string[] = []

    lines.push(`# ${curve.name} - 情感曲线`)
    lines.push('')
    lines.push(`**粒度**: ${curve.granularity}`)
    lines.push(`**趋势**: ${curve.trend.description}`)
    lines.push('')

    if (config.includeStats) {
      lines.push('## 统计')
      lines.push(`- 平均强度: ${curve.stats.avgIntensity}`)
      lines.push(`- 波动率: ${curve.stats.volatility}`)
      lines.push(`- 正向占比: ${Math.round(curve.stats.positiveRatio * 100)}%`)
      lines.push(`- 主导情绪: ${curve.stats.dominantEmotion}`)
      lines.push(`- 最佳日: ${curve.stats.bestDay.label} (${curve.stats.bestDay.dominant})`)
      lines.push(`- 最差日: ${curve.stats.worstDay.label} (${curve.stats.worstDay.dominant})`)
      lines.push('')
    }

    if (curve.turningPoints.length > 0) {
      lines.push('## 转折点')
      for (const tp of curve.turningPoints) {
        lines.push(`- **${tp.label}**: ${tp.type === 'peak' ? '高峰' : tp.type === 'valley' ? '低谷' : '转折'} (${tp.before} → ${tp.after})`)
      }
    }

    return lines.join('\n')
  }

  function generateMarkdownRadar(
    radar: TimelineRadarReport,
    _config: ExportConfig,
  ): string {
    const lines: string[] = []

    lines.push('# 时间线雷达报告')
    lines.push('')
    lines.push(`**生成时间**: ${radar.generatedAt}`)
    lines.push('')
    lines.push(`**数据范围**: ${radar.generatedAt}`)
    lines.push('')

    if (radar.radar) {
      lines.push('## 综合雷达')
      lines.push('')
      for (const d of radar.radar.points) {
        lines.push(`- ${d.label}: ${Math.round(d.value * 100)}%`)
      }
      lines.push('')
    }

    if (radar.heatmap) {
      lines.push('## 活跃热力图')
      lines.push(`总热度: ${radar.heatmap.maxFocusMinutes}`)
      lines.push(`最大热度: ${radar.heatmap.maxFocusMinutes}`)
    }

    return lines.join('\n')
  }

  // ============================================================
  // HTML 生成器
  // ============================================================

  function generateHtmlNarrative(
    report: NarrativeReport,
    config: ExportConfig,
  ): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: 'Noto Sans CJK SC', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    .highlight { background: #fff3cd; padding: 2px 6px; border-radius: 3px; }
    .milestone { background: #e8f5e9; padding: 10px; border-radius: 6px; margin: 5px 0; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p>${report.dateRange.start} ~ ${report.dateRange.end} | ${report.type}</p>
  ${config.includeStats ? `
  <h2>统计</h2>
  <table>
    <tr><th>指标</th><th>数值</th></tr>
    <tr><td>专注总时长</td><td>${report.stats.totalFocusMinutes} 分钟</td></tr>
    <tr><td>总结晶</td><td>${report.stats.totalCrystals}</td></tr>
    <tr><td>总笔记</td><td>${report.stats.totalNotes}</td></tr>
  </table>` : ''}
  <h2>摘要</h2>
  <p>${report.summary}</p>
  ${report.segments.map(s => `
  <div class="milestone">
    <strong>${s.label}</strong>
    <p>${s.highlight}</p>
    <p>${s.insight}</p>
  </div>`).join('')}
</body>
</html>`
  }

  function generateHtmlAnnualReview(
    review: AnnualReview,
    config: ExportConfig,
  ): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${review.title}</title>
  <style>
    body { font-family: 'Noto Sans CJK SC', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #1a1a2e; text-align: center; font-size: 2em; }
    h2 { color: #16213e; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-top: 30px; }
    .summary { background: #f0f4f8; padding: 20px; border-radius: 10px; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    .insight { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .outlook { background: #f3e5f5; padding: 20px; border-radius: 10px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${review.title}</h1>
  <div class="summary">${review.summary}</div>
  ${config.includeStats ? `
  <h2>年度统计</h2>
  <table>
    <tr><th>指标</th><th>数值</th></tr>
    <tr><td>专注总时长</td><td>${review.stats.totalFocusMinutes} 分钟</td></tr>
    <tr><td>专注天数</td><td>${review.stats.focusDays} 天</td></tr>
    <tr><td>日均专注</td><td>${review.stats.avgDailyFocus} 分钟</td></tr>
    <tr><td>情绪健康指数</td><td>${review.stats.emotionalHealthScore}%</td></tr>
  </table>` : ''}
  ${review.insights.map(i => `
  <div class="insight">
    <strong>${i.title}</strong>
    <p>${i.description}</p>
    ${i.suggestion ? `<p>💡 ${i.suggestion}</p>` : ''}
  </div>`).join('')}
  <div class="outlook">
    <h2>新年展望</h2>
    <p>${review.outlook.message}</p>
  </div>
</body>
</html>`
  }

  // ============================================================
  // CSV 生成器
  // ============================================================

  function generateCsvNarrative(
    report: NarrativeReport,
    _config: ExportConfig,
  ): string {
    const lines: string[] = []
    lines.push('日期,标签,亮点,情绪,洞察')
    for (const seg of report.segments) {
      lines.push(`${seg.date},${seg.label},${escapeCsv(seg.highlight)},${seg.emotion},${escapeCsv(seg.insight)}`)
    }
    return lines.join('\n')
  }

  function generateCsvEmotionCurve(curve: EmotionCurve): string {
    const lines: string[] = []
    const emotions = new Set<string>()
    for (const p of curve.dataPoints) {
      for (const e of Object.keys(p.values)) emotions.add(e)
    }
    const emotionList = [...emotions]

    lines.push(`日期,标签,主导情感,强度,${emotionList.join(',')}`)
    for (const p of curve.dataPoints) {
      const vals = emotionList.map(e => p.values[e] || 0).join(',')
      lines.push(`${p.date},${p.label},${p.dominant},${p.intensity},${vals}`)
    }
    return lines.join('\n')
  }

  function generateCsvRawData(items: RiverItem[]): string {
    const lines: string[] = []
    lines.push('类型,ID,时间戳,标题,标签,时长(分),详情')

    for (const item of items) {
      const ts = new Date(item.ts).toISOString()
      const tags = (item.crystal?.tags || item.session?.tags || item.note?.tags || item.anchor?.tags || []).join(';')
      const duration = item.session?.elapsed ? Math.round(item.session.elapsed / 60000) : ''
      const title = item.note?.title || item.crystal?.insight || item.anchor?.text || ''
      const detail = item.note?.content || item.crystal?.insight || item.emotion?.type || item.anchor?.text || ''

      lines.push(`${item.type},${item.id},${ts},${escapeCsv(title)},${tags},${duration},${escapeCsv(detail)}`)
    }
    return lines.join('\n')
  }

  function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  return {
    config,
    setConfig,
    // 单次导出
    exportNarrativeReport,
    exportAnnualReview,
    exportEmotionCurve,
    exportRadar,
    exportRawData,
    // 批量导出
    createBatchTask,
    executeBatchTask,
    // 模板
    getTemplates,
    getTemplatesFor,
    addTemplate,
    removeTemplate,
    BUILTIN_TEMPLATES,
    // 历史
    getHistory,
    clearHistory,
    // 常量
    MIME_TYPES,
    FILE_EXTENSIONS,
    DEFAULT_EXPORT_CONFIG,
  }
}