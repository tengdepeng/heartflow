// ============================================================
// 更漏 · 导出增强引擎（P19-1）
// 多格式导出（Markdown/JSON/CSV/HTML）、报告生成、剪贴板支持
// ============================================================

import type { LogEntry, LogEntryType, MoodTone, WorklogDailySummary, WeeklySummary } from './types'
import { LOG_TYPE_META, MOOD_TONE_META } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 导出格式 */
export type ExportFormat = 'markdown' | 'json' | 'csv' | 'html' | 'txt'

/** 导出配置 */
export interface ExportConfig {
  format: ExportFormat
  /** 是否包含标题 */
  includeTitle: boolean
  /** 是否包含情绪 */
  includeMood: boolean
  /** 是否包含标签 */
  includeTags: boolean
  /** 是否包含关联会话 */
  includeSessions: boolean
  /** 是否包含关联房间 */
  includeRoom: boolean
  /** 日期范围过滤（YYYY-MM-DD） */
  dateRange?: { start: string; end: string }
  /** 类型过滤 */
  typeFilter?: LogEntryType[]
  /** 标签过滤 */
  tagFilter?: string[]
  /** 是否美化输出 */
  pretty: boolean
}

/** 导出结果 */
export interface ExportResult {
  /** 导出内容 */
  content: string
  /** 文件名 */
  filename: string
  /** MIME 类型 */
  mimeType: string
  /** 文件扩展名 */
  extension: string
  /** 导出的条目数 */
  entryCount: number
}

/** 报告模板 */
export interface ReportTemplate {
  id: string
  label: string
  icon: string
  description: string
  /** 日报/周报/月报/年报 */
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
}

/** 报告生成选项 */
export interface ReportOptions {
  template: 'daily' | 'weekly' | 'monthly' | 'yearly'
  format: ExportFormat
  /** 报告日期/周/月/年 */
  period: string
  /** 是否包含习惯分析 */
  includeHabits: boolean
  /** 是否包含生产力预测 */
  includePrediction: boolean
  /** 是否包含情绪分析 */
  includeMood: boolean
}

// ============================================================
// 常量
// ============================================================

/** 导出格式元数据 */
export const EXPORT_FORMAT_META: Record<ExportFormat, { label: string; icon: string; mimeType: string; extension: string }> = {
  markdown: { label: 'Markdown', icon: '📝', mimeType: 'text/markdown', extension: '.md' },
  json: { label: 'JSON', icon: '📦', mimeType: 'application/json', extension: '.json' },
  csv: { label: 'CSV', icon: '📊', mimeType: 'text/csv', extension: '.csv' },
  html: { label: 'HTML', icon: '🌐', mimeType: 'text/html', extension: '.html' },
  txt: { label: '纯文本', icon: '📄', mimeType: 'text/plain', extension: '.txt' },
}

/** 报告模板元数据 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'daily', label: '日报', icon: '📅', description: '每日工作回顾与总结', type: 'daily' },
  { id: 'weekly', label: '周报', icon: '📊', description: '每周工作汇总与趋势', type: 'weekly' },
  { id: 'monthly', label: '月报', icon: '🌙', description: '月度生产力分析与洞察', type: 'monthly' },
  { id: 'yearly', label: '年报', icon: '🎯', description: '年度回顾与成长轨迹', type: 'yearly' },
]

/** 默认导出配置 */
const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'markdown',
  includeTitle: true,
  includeMood: true,
  includeTags: true,
  includeSessions: false,
  includeRoom: false,
  pretty: true,
}

// ============================================================
// 工具函数
// ============================================================

/** 转义 CSV 字段 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** 转义 HTML */
function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 格式化日期时间为可读形式 */
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 生成文件名 */
function generateFilename(prefix: string, format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10)
  const meta = EXPORT_FORMAT_META[format]
  return `${prefix}_${date}${meta.extension}`
}

/** 过滤条目 */
function filterEntries(entries: LogEntry[], config: ExportConfig): LogEntry[] {
  let result = [...entries]

  if (config.dateRange) {
    const start = config.dateRange.start
    const end = config.dateRange.end
    result = result.filter(e => {
      const date = e.createdAt.slice(0, 10)
      return date >= start && date <= end
    })
  }

  if (config.typeFilter && config.typeFilter.length > 0) {
    result = result.filter(e => config.typeFilter!.includes(e.type))
  }

  if (config.tagFilter && config.tagFilter.length > 0) {
    result = result.filter(e => e.tags.some(t => config.tagFilter!.includes(t)))
  }

  return result
}

// ============================================================
// 格式导出器
// ============================================================

/** 导出为 Markdown */
function exportMarkdown(entries: LogEntry[], config: ExportConfig): string {
  const lines: string[] = []

  if (config.includeTitle) {
    lines.push('# 更漏 · 工作日志导出')
    lines.push('')
    lines.push(`> 导出时间：${formatDateTime(new Date().toISOString())}`)
    lines.push(`> 条目数量：${entries.length}`)
    if (config.dateRange) {
      lines.push(`> 日期范围：${config.dateRange.start} ~ ${config.dateRange.end}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // 按日期分组
  const grouped = new Map<string, LogEntry[]>()
  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10)
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date)!.push(entry)
  }

  const sortedDates = [...grouped.keys()].sort().reverse()

  for (const date of sortedDates) {
    const dayEntries = grouped.get(date)!
    lines.push(`## ${date}（${dayEntries.length} 条）`)
    lines.push('')

    for (const entry of dayEntries) {
      const typeMeta = LOG_TYPE_META[entry.type]
      lines.push(`### ${typeMeta.icon} ${entry.title}`)
      lines.push('')
      lines.push(`- **类型**：${typeMeta.label}`)
      if (config.includeMood && entry.mood) {
        const moodMeta = MOOD_TONE_META[entry.mood]
        lines.push(`- **情绪**：${moodMeta.icon} ${moodMeta.label}`)
      }
      if (config.includeTags && entry.tags.length > 0) {
        lines.push(`- **标签**：${entry.tags.map(t => `\`${t}\``).join(' ')}`)
      }
      if (config.includeSessions && entry.sessionIds.length > 0) {
        lines.push(`- **关联会话**：${entry.sessionIds.length} 个`)
      }
      if (config.includeRoom && entry.roomId) {
        lines.push(`- **关联房间**：${entry.roomId}`)
      }
      lines.push(`- **时间**：${formatDateTime(entry.createdAt)}`)
      if (entry.updatedAt !== entry.createdAt) {
        lines.push(`- **更新**：${formatDateTime(entry.updatedAt)}`)
      }
      lines.push('')
      lines.push(entry.content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}

/** 导出为 JSON */
function exportJSON(entries: LogEntry[], config: ExportConfig): string {
  const exportData = {
    exportMeta: {
      exportedAt: new Date().toISOString(),
      entryCount: entries.length,
      dateRange: config.dateRange || null,
      typeFilter: config.typeFilter || null,
      tagFilter: config.tagFilter || null,
    },
    entries: entries.map(e => {
      const result: any = {
        id: e.id,
        type: e.type,
        title: e.title,
        content: e.content,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }
      if (config.includeMood && e.mood) result.mood = e.mood
      if (config.includeTags) result.tags = e.tags
      if (config.includeSessions) result.sessionIds = e.sessionIds
      if (config.includeRoom && e.roomId) result.roomId = e.roomId
      return result
    }),
  }

  return config.pretty
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData)
}

/** 导出为 CSV */
function exportCSV(entries: LogEntry[], config: ExportConfig): string {
  const headers: string[] = ['id', 'type', 'title', 'content', 'createdAt', 'updatedAt']
  if (config.includeMood) headers.push('mood')
  if (config.includeTags) headers.push('tags')
  if (config.includeSessions) headers.push('sessionIds')
  if (config.includeRoom) headers.push('roomId')

  const rows: string[] = [headers.join(',')]

  for (const entry of entries) {
    const row: string[] = [
      escapeCSV(entry.id),
      escapeCSV(entry.type),
      escapeCSV(entry.title),
      escapeCSV(entry.content),
      escapeCSV(entry.createdAt),
      escapeCSV(entry.updatedAt),
    ]
    if (config.includeMood) row.push(escapeCSV(entry.mood || ''))
    if (config.includeTags) row.push(escapeCSV(entry.tags.join(';')))
    if (config.includeSessions) row.push(escapeCSV(entry.sessionIds.join(';')))
    if (config.includeRoom) row.push(escapeCSV(entry.roomId || ''))
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/** 导出为 HTML */
function exportHTML(entries: LogEntry[], config: ExportConfig): string {
  const lines: string[] = [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>更漏 · 工作日志导出</title>',
    '  <style>',
    '    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #1a1a2e; color: #e0e0e0; }',
    '    h1 { color: #f0c040; border-bottom: 2px solid #f0c040; padding-bottom: 0.5rem; }',
    '    h2 { color: #6b9fc4; margin-top: 2rem; }',
    '    h3 { color: #b5707a; }',
    '    .entry { background: #16213e; border-radius: 8px; padding: 1.2rem; margin: 1rem 0; border-left: 3px solid #f0c040; }',
    '    .entry.reflection { border-left-color: #6b9fc4; }',
    '    .entry.plan { border-left-color: #8a9a7a; }',
    '    .entry.insight { border-left-color: #d98c7a; }',
    '    .entry.review { border-left-color: #cf8b6b; }',
    '    .entry.milestone { border-left-color: #b5707a; }',
    '    .meta { font-size: 0.85rem; color: #7a7f8c; margin-bottom: 0.5rem; }',
    '    .meta span { margin-right: 1rem; }',
    '    .tag { display: inline-block; background: rgba(240,192,64,0.15); color: #f0c040; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.3rem; }',
    '    .content { white-space: pre-wrap; line-height: 1.6; }',
    '    hr { border: none; border-top: 1px solid #2a2a4a; margin: 1.5rem 0; }',
    '    .header-info { color: #7a7f8c; font-size: 0.9rem; margin-bottom: 1rem; }',
    '  </style>',
    '</head>',
    '<body>',
  ]

  if (config.includeTitle) {
    lines.push(`  <h1>更漏 · 工作日志导出</h1>`)
    lines.push(`  <div class="header-info">`)
    lines.push(`    导出时间：${formatDateTime(new Date().toISOString())} · 条目：${entries.length}`)
    if (config.dateRange) {
      lines.push(` · 日期：${config.dateRange.start} ~ ${config.dateRange.end}`)
    }
    lines.push(`  </div>`)
  }

  const grouped = new Map<string, LogEntry[]>()
  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10)
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date)!.push(entry)
  }

  const sortedDates = [...grouped.keys()].sort().reverse()

  for (const date of sortedDates) {
    const dayEntries = grouped.get(date)!
    lines.push(`  <h2>${date}（${dayEntries.length} 条）</h2>`)

    for (const entry of dayEntries) {
      const typeMeta = LOG_TYPE_META[entry.type]
      lines.push(`  <div class="entry ${entry.type}">`)
      lines.push(`    <h3>${typeMeta.icon} ${escapeHTML(entry.title)}</h3>`)
      lines.push(`    <div class="meta">`)
      lines.push(`      <span>类型：${typeMeta.label}</span>`)
      if (config.includeMood && entry.mood) {
        const moodMeta = MOOD_TONE_META[entry.mood]
        lines.push(`      <span>情绪：${moodMeta.icon} ${moodMeta.label}</span>`)
      }
      lines.push(`      <span>时间：${formatDateTime(entry.createdAt)}</span>`)
      if (config.includeSessions && entry.sessionIds.length > 0) {
        lines.push(`      <span>关联会话：${entry.sessionIds.length} 个</span>`)
      }
      lines.push(`    </div>`)
      if (config.includeTags && entry.tags.length > 0) {
        lines.push(`    <div>${entry.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ')}</div>`)
      }
      lines.push(`    <div class="content">${escapeHTML(entry.content)}</div>`)
      lines.push(`  </div>`)
    }
    lines.push('  <hr>')
  }

  lines.push('</body>')
  lines.push('</html>')

  return lines.join('\n')
}

/** 导出为纯文本 */
function exportTXT(entries: LogEntry[], config: ExportConfig): string {
  const lines: string[] = []

  if (config.includeTitle) {
    lines.push('='.repeat(40))
    lines.push('更漏 · 工作日志导出')
    lines.push(`导出时间：${formatDateTime(new Date().toISOString())}`)
    lines.push(`条目数量：${entries.length}`)
    if (config.dateRange) {
      lines.push(`日期范围：${config.dateRange.start} ~ ${config.dateRange.end}`)
    }
    lines.push('='.repeat(40))
    lines.push('')
  }

  const grouped = new Map<string, LogEntry[]>()
  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10)
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date)!.push(entry)
  }

  const sortedDates = [...grouped.keys()].sort().reverse()

  for (const date of sortedDates) {
    const dayEntries = grouped.get(date)!
    lines.push(`── ${date} ──`)
    lines.push('')

    for (const entry of dayEntries) {
      const typeMeta = LOG_TYPE_META[entry.type]
      lines.push(`  ${typeMeta.icon} ${entry.title}`)
      lines.push(`  ${typeMeta.label} | ${formatDateTime(entry.createdAt)}`)
      if (config.includeMood && entry.mood) {
        lines.push(`  情绪：${MOOD_TONE_META[entry.mood].label}`)
      }
      if (config.includeTags && entry.tags.length > 0) {
        lines.push(`  标签：${entry.tags.join(', ')}`)
      }
      lines.push('')
      lines.push(entry.content)
      lines.push('')
      lines.push('-'.repeat(30))
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ============================================================
// 报告生成器
// ============================================================

/** 生成日报 */
function generateDailyReport(
  entries: LogEntry[],
  summaries: WorklogDailySummary[],
  config: ReportOptions
): string {
  const date = config.period || new Date().toISOString().slice(0, 10)
  const summary = summaries.find(s => s.date === date)
  const dayEntries = entries.filter(e => e.createdAt.slice(0, 10) === date)

  const lines: string[] = [
    `# 📅 更漏 · 日报（${date}）`,
    '',
    '## 📊 概览',
    '',
    `- 今日日志：${dayEntries.length} 条`,
    `- 总专注时长：${summary?.totalFocusMinutes || 0} 分钟`,
    `- 主导情绪：${summary?.dominantMood ? MOOD_TONE_META[summary.dominantMood].label : '无'}`,
  ]

  if (summary?.keyTags && summary.keyTags.length > 0) {
    lines.push(`- 关键词：${summary.keyTags.join('、')}`)
  }

  lines.push('')

  // 按类型分组
  const typeGroups = new Map<LogEntryType, LogEntry[]>()
  for (const entry of dayEntries) {
    if (!typeGroups.has(entry.type)) typeGroups.set(entry.type, [])
    typeGroups.get(entry.type)!.push(entry)
  }

  if (typeGroups.size > 0) {
    lines.push('## 📝 今日记录')
    lines.push('')

    for (const [type, typeEntries] of typeGroups) {
      const meta = LOG_TYPE_META[type]
      lines.push(`### ${meta.icon} ${meta.label}（${typeEntries.length}）`)
      lines.push('')
      for (const entry of typeEntries) {
        lines.push(`- **${entry.title}**`)
        if (entry.content.length <= 100) {
          lines.push(`  ${entry.content}`)
        } else {
          lines.push(`  ${entry.content.slice(0, 100)}...`)
        }
        if (config.includeMood && entry.mood) {
          lines.push(`  ${MOOD_TONE_META[entry.mood].icon} ${MOOD_TONE_META[entry.mood].label}`)
        }
      }
      lines.push('')
    }
  }

  if (summary?.highlightEntry) {
    lines.push('## 💡 今日亮点')
    lines.push('')
    const highlight = dayEntries.find(e => e.id === summary.highlightEntry)
    if (highlight) {
      lines.push(`**${highlight.title}**`)
      lines.push('')
      lines.push(highlight.content)
    }
    lines.push('')
  }

  lines.push('## 🎯 明日计划')
  lines.push('')
  lines.push('（待填写）')
  lines.push('')

  return lines.join('\n')
}

/** 生成周报 */
function generateWeeklyReport(
  _entries: LogEntry[],
  summaries: WorklogDailySummary[],
  weeklySummary: WeeklySummary | null,
  config: ReportOptions
): string {
  const lines: string[] = [
    `# 📊 更漏 · 周报`,
    '',
    `## 📊 本周概览`,
    '',
  ]

  if (weeklySummary) {
    lines.push(`- 周范围：${weeklySummary.weekStart} ~ ${weeklySummary.weekEnd}`)
    lines.push(`- 总日志数：${weeklySummary.entryCount} 条`)
    lines.push(`- 总专注时长：${weeklySummary.totalFocusMinutes} 分钟`)
    lines.push(`- 日均日志：${(weeklySummary.entryCount / 7).toFixed(1)} 条`)
    lines.push('')

    if (config.includeMood && weeklySummary.moodDistribution && Object.keys(weeklySummary.moodDistribution).length > 0) {
      lines.push('## 😊 情绪分布')
      lines.push('')
      for (const [mood, count] of Object.entries(weeklySummary.moodDistribution)) {
        const meta = MOOD_TONE_META[mood as MoodTone]
        const bar = '█'.repeat(Math.round(count / Math.max(...Object.values(weeklySummary.moodDistribution)) * 20))
        lines.push(`- ${meta.icon} ${meta.label}：${bar} ${count}`)
      }
      lines.push('')
    }

    if (weeklySummary.topTags && weeklySummary.topTags.length > 0) {
      lines.push('## 🏷️ 热门标签')
      lines.push('')
      lines.push(weeklySummary.topTags.map(t => `\`${t}\``).join(' · '))
      lines.push('')
    }

    if (weeklySummary.achievements && weeklySummary.achievements.length > 0) {
      lines.push('## 🏆 本周成就')
      lines.push('')
      for (const achievement of weeklySummary.achievements) {
        lines.push(`- ✅ ${achievement}`)
      }
      lines.push('')
    }

    if (weeklySummary.reflection) {
      lines.push('## 💭 本周反思')
      lines.push('')
      lines.push(weeklySummary.reflection)
      lines.push('')
    }
  }

  // 每日详情
  lines.push('## 📅 每日详情')
  lines.push('')

  for (const summary of summaries) {
    lines.push(`### ${summary.date}`)
    lines.push(`- 日志：${summary.entryCount} 条 · 专注：${summary.totalFocusMinutes} 分钟`)
    if (summary.dominantMood) {
      lines.push(`- 情绪：${MOOD_TONE_META[summary.dominantMood].label}`)
    }
    if (summary.keyTags.length > 0) {
      lines.push(`- 标签：${summary.keyTags.join('、')}`)
    }
    lines.push('')
  }

  lines.push('## 🎯 下周计划')
  lines.push('')
  lines.push('（待填写）')
  lines.push('')

  return lines.join('\n')
}

/** 生成月报 */
function generateMonthlyReport(
  entries: LogEntry[],
  summaries: WorklogDailySummary[],
  config: ReportOptions
): string {
  const month = config.period || new Date().toISOString().slice(0, 7)
  const monthEntries = entries.filter(e => e.createdAt.startsWith(month))

  const totalFocus = summaries.reduce((sum, s) => sum + s.totalFocusMinutes, 0)
  const allMoods = new Map<string, number>()
  for (const s of summaries) {
    if (s.dominantMood) {
      allMoods.set(s.dominantMood, (allMoods.get(s.dominantMood) || 0) + 1)
    }
  }

  const lines: string[] = [
    `# 🌙 更漏 · 月报（${month}）`,
    '',
    '## 📊 月度概览',
    '',
    `- 总日志数：${monthEntries.length} 条`,
    `- 总专注时长：${totalFocus} 分钟（${(totalFocus / 60).toFixed(1)} 小时）`,
    `- 日均日志：${(monthEntries.length / summaries.length || 1).toFixed(1)} 条`,
    `- 活跃天数：${summaries.length} 天`,
    '',
  ]

  // 类型分布
  const typeDist: Record<string, number> = {}
  for (const entry of monthEntries) {
    typeDist[entry.type] = (typeDist[entry.type] || 0) + 1
  }

  if (Object.keys(typeDist).length > 0) {
    lines.push('## 📝 类型分布')
    lines.push('')
    for (const [type, count] of Object.entries(typeDist).sort((a, b) => b[1] - a[1])) {
      const meta = LOG_TYPE_META[type as LogEntryType]
      const pct = ((count / monthEntries.length) * 100).toFixed(1)
      lines.push(`- ${meta.icon} ${meta.label}：${count} (${pct}%)`)
    }
    lines.push('')
  }

  // 标签分析
  const tagCounts = new Map<string, number>()
  for (const entry of monthEntries) {
    for (const tag of entry.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  if (topTags.length > 0) {
    lines.push('## 🏷️ 热门标签 TOP 10')
    lines.push('')
    for (const [tag, count] of topTags) {
      lines.push(`- \`${tag}\`：${count} 次`)
    }
    lines.push('')
  }

  if (config.includeMood && allMoods.size > 0) {
    lines.push('## 😊 月度情绪趋势')
    lines.push('')
    for (const [mood, count] of [...allMoods.entries()].sort((a, b) => b[1] - a[1])) {
      const meta = MOOD_TONE_META[mood as MoodTone]
      lines.push(`- ${meta.icon} ${meta.label}：${count} 天`)
    }
    lines.push('')
  }

  lines.push('## 💡 月度洞察')
  lines.push('')
  lines.push('（综合分析可结合工作习惯与生产力预测模块）')
  lines.push('')

  lines.push('## 🎯 下月目标')
  lines.push('')
  lines.push('（待填写）')
  lines.push('')

  return lines.join('\n')
}

/** 生成年报 */
function generateYearlyReport(
  entries: LogEntry[],
  summaries: WorklogDailySummary[],
  config: ReportOptions
): string {
  const year = config.period || new Date().getFullYear().toString()
  const yearEntries = entries.filter(e => e.createdAt.startsWith(year))

  const totalFocus = summaries.reduce((sum, s) => sum + s.totalFocusMinutes, 0)
  const streakDays = computeStreakDays(summaries)

  const lines: string[] = [
    `# 🎯 更漏 · 年报（${year}）`,
    '',
    '## 📊 年度概览',
    '',
    `- 总日志数：${yearEntries.length} 条`,
    `- 总专注时长：${totalFocus} 分钟（${(totalFocus / 60).toFixed(1)} 小时）`,
    `- 最长连续记录：${streakDays} 天`,
    `- 活跃天数：${summaries.length} 天`,
    '',
  ]

  // 月度分布
  const monthlyCounts: Record<string, number> = {}
  for (const entry of yearEntries) {
    const m = entry.createdAt.slice(0, 7)
    monthlyCounts[m] = (monthlyCounts[m] || 0) + 1
  }

  lines.push('## 📅 月度分布')
  lines.push('')
  const maxCount = Math.max(...Object.values(monthlyCounts), 1)
  for (const [month, count] of Object.entries(monthlyCounts).sort()) {
    const bar = '█'.repeat(Math.round(count / maxCount * 30))
    lines.push(`- ${month}：${bar} ${count}`)
  }
  lines.push('')

  // 类型分布
  const typeDist: Record<string, number> = {}
  for (const entry of yearEntries) {
    typeDist[entry.type] = (typeDist[entry.type] || 0) + 1
  }

  lines.push('## 📝 年度类型分布')
  lines.push('')
  for (const [type, count] of Object.entries(typeDist).sort((a, b) => b[1] - a[1])) {
    const meta = LOG_TYPE_META[type as LogEntryType]
    const pct = ((count / yearEntries.length) * 100).toFixed(1)
    lines.push(`- ${meta.icon} ${meta.label}：${count} (${pct}%)`)
  }
  lines.push('')

  // 标签分析
  const tagCounts = new Map<string, number>()
  for (const entry of yearEntries) {
    for (const tag of entry.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)

  if (topTags.length > 0) {
    lines.push('## 🏷️ 年度标签 TOP 15')
    lines.push('')
    for (const [tag, count] of topTags) {
      lines.push(`- \`${tag}\`：${count} 次`)
    }
    lines.push('')
  }

  lines.push('## 🎯 年度回顾')
  lines.push('')
  lines.push('（回顾这一年，哪些关键词定义了你的成长？）')
  lines.push('')

  lines.push('## 🚀 新年展望')
  lines.push('')
  lines.push('（待填写）')
  lines.push('')

  return lines.join('\n')
}

/** 计算最长连续天数 */
function computeStreakDays(summaries: WorklogDailySummary[]): number {
  if (summaries.length === 0) return 0

  const dates = summaries.map(s => s.date).sort()
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

// ============================================================
// 导出引擎组合函数
// ============================================================

/**
 * 更漏导出引擎
 */
export function useWorklogExport() {
  // ============================================================
  // 条目导出
  // ============================================================

  /**
   * 导出日志条目
   */
  function exportEntries(
    entries: LogEntry[],
    config: Partial<ExportConfig> = {}
  ): ExportResult {
    const mergedConfig = { ...DEFAULT_EXPORT_CONFIG, ...config }
    const filtered = filterEntries(entries, mergedConfig)
    const fmt = mergedConfig.format

    let content: string
    switch (fmt) {
      case 'markdown':
        content = exportMarkdown(filtered, mergedConfig)
        break
      case 'json':
        content = exportJSON(filtered, mergedConfig)
        break
      case 'csv':
        content = exportCSV(filtered, mergedConfig)
        break
      case 'html':
        content = exportHTML(filtered, mergedConfig)
        break
      case 'txt':
        content = exportTXT(filtered, mergedConfig)
        break
      default:
        content = exportMarkdown(filtered, mergedConfig)
    }

    const meta = EXPORT_FORMAT_META[fmt]
    return {
      content,
      filename: generateFilename('worklog', fmt),
      mimeType: meta.mimeType,
      extension: meta.extension,
      entryCount: filtered.length,
    }
  }

  /**
   * 导出到剪贴板
   */
  async function copyToClipboard(result: ExportResult): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(result.content)
      return true
    } catch {
      // 回退方案：使用 textarea
      try {
        const textarea = document.createElement('textarea')
        textarea.value = result.content
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * 触发文件下载
   */
  function download(result: ExportResult): void {
    const blob = new Blob([result.content], { type: result.mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ============================================================
  // 报告生成
  // ============================================================

  /**
   * 生成报告
   */
  function generateReport(
    entries: LogEntry[],
    summaries: WorklogDailySummary[],
    weeklySummary: WeeklySummary | null,
    options: ReportOptions
  ): ExportResult {
    let content: string

    switch (options.template) {
      case 'daily':
        content = generateDailyReport(entries, summaries, options)
        break
      case 'weekly':
        content = generateWeeklyReport(entries, summaries, weeklySummary, options)
        break
      case 'monthly':
        content = generateMonthlyReport(entries, summaries, options)
        break
      case 'yearly':
        content = generateYearlyReport(entries, summaries, options)
        break
      default:
        content = generateDailyReport(entries, summaries, options)
    }

    const fmt = options.format
    const meta = EXPORT_FORMAT_META[fmt]
    return {
      content,
      filename: generateFilename(`worklog_${options.template}`, fmt),
      mimeType: meta.mimeType,
      extension: meta.extension,
      entryCount: entries.length,
    }
  }

  return {
    exportEntries,
    generateReport,
    copyToClipboard,
    download,
  }
}