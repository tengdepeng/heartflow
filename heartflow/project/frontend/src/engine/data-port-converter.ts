// ============================================================
// 数据格式转换器注册表
// 插件可注册自定义格式转换器，扩展导入/导出能力
// 内置：JSON, Markdown, CSV, HTML, TXT
// ============================================================

import type { DataPortPayload } from './data-port-types'

/** 转换器接口 */
export interface DataConverter {
  id: string
  name: string
  description: string
  /** 支持的输入格式 */
  inputFormats: string[]
  /** 支持的输出格式 */
  outputFormats: string[]
  /** 将外部格式转换为标准 DataPortPayload */
  toPayload(data: string, format: string): DataPortPayload | null
  /** 将标准 DataPortPayload 转换为外部格式 */
  fromPayload(payload: DataPortPayload, format: string): string | null
}

/** 转换器注册表 */
const converters = new Map<string, DataConverter>()

/** 注册一个转换器 */
export function registerConverter(converter: DataConverter) {
  converters.set(converter.id, converter)
}

/** 注销一个转换器 */
export function unregisterConverter(id: string) {
  converters.delete(id)
}

/** 获取所有已注册的转换器 */
export function getConverters(): DataConverter[] {
  return [...converters.values()]
}

/** 查找支持指定输入格式的转换器 */
export function findConverterForInput(format: string): DataConverter[] {
  return [...converters.values()].filter(c => c.inputFormats.includes(format))
}

/** 查找支持指定输出格式的转换器 */
export function findConverterForOutput(format: string): DataConverter[] {
  return [...converters.values()].filter(c => c.outputFormats.includes(format))
}

// ---- 辅助函数 ----

/** 安全截断字符串，用于 CSV 字段 */
function csvEscape(val: string | number | boolean | null | undefined): string {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** 解析单行 CSV，支持引号转义 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

/** 将记录数组转为 CSV 字符串 */
function recordsToCSV<T extends Record<string, any>>(
  records: T[],
  fields: DataField<T>[],
): string {
  const header = fields.map(f => f.label).join(',')
  const rows = records.map(r =>
    fields.map(f => csvEscape(f.get(r))).join(','),
  )
  return [header, ...rows].join('\n')
}

/** 从 CSV 字符串解析为记录数组 */
function csvToRecords<T>(
  csv: string,
  fields: DataField<T>[],
  builder: (values: Record<string, string>) => T | null,
): T[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const results: T[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      const field = fields.find(f => f.label === headers[j])
      if (field) {
        record[field.key] = values[j] ?? ''
      }
    }
    const built = builder(record)
    if (built) results.push(built)
  }
  return results
}

interface DataField<T> {
  key: string
  label: string
  get: (r: T) => any
}

// ---- 内置转换器 ----

/** 通用 JSON 转换器 */
export const jsonConverter: DataConverter = {
  id: 'builtin-json',
  name: 'JSON 格式',
  description: '心流工坊标准 JSON 格式，支持完整数据导入导出，推荐用于数据备份',
  inputFormats: ['json', 'application/json'],
  outputFormats: ['json', 'application/json'],
  toPayload(data: string): DataPortPayload | null {
    try {
      const parsed = JSON.parse(data)
      if (parsed && typeof parsed === 'object') {
        return parsed as DataPortPayload
      }
      return null
    } catch {
      return null
    }
  },
  fromPayload(payload: DataPortPayload): string {
    return JSON.stringify(payload, null, 2)
  },
}

/** Markdown 转换器（双向） */
export const markdownConverter: DataConverter = {
  id: 'builtin-markdown',
  name: 'Markdown 格式',
  description: '导出为 Markdown 时间线文档，支持从 Markdown 导入恢复',
  inputFormats: ['md', 'markdown', 'text/markdown'],
  outputFormats: ['md', 'markdown', 'text/markdown'],
  toPayload(data: string): DataPortPayload | null {
    try {
      // 尝试解析 Markdown 中的 JSON 代码块（标准导出格式）
      const jsonBlockMatch = data.match(/```json\n?([\s\S]*?)\n?```/)
      if (jsonBlockMatch) {
        const parsed = JSON.parse(jsonBlockMatch[1])
        if (parsed && typeof parsed === 'object') {
          return parsed as DataPortPayload
        }
      }
      return null
    } catch {
      return null
    }
  },
  fromPayload(payload: DataPortPayload): string {
    const lines: string[] = ['# 心流工坊 · 数据导出', '', `导出时间：${new Date().toLocaleString('zh-CN')}`, '']
    if (payload.sessions?.length) {
      lines.push('## 专注记录', '')
      for (const s of payload.sessions) {
        const elapsed = Math.floor(s.elapsed / 1000)
        const min = Math.floor(elapsed / 60)
        lines.push(`- **${s.completedAt?.slice(0, 10) || '未知日期'}** · ${min}分钟 · 标签: ${s.tags?.join(', ') || '无'}`)
      }
      lines.push('')
    }
    if (payload.notes?.length) {
      lines.push('## 笔记', '')
      for (const n of payload.notes) {
        const preview = n.content?.slice(0, 60).replace(/\n/g, ' ') || ''
        lines.push(`- **${n.title || '无标题'}** · ${preview}${n.content?.length > 60 ? '...' : ''}`)
      }
      lines.push('')
    }
    if (payload.emotions?.length) {
      lines.push('## 情绪记录', '')
      for (const e of payload.emotions) {
        lines.push(`- ${e.type} · ${e.createdAt?.slice(0, 10) || ''}`)
      }
      lines.push('')
    }
    if (payload.crystals?.length) {
      lines.push('## 时间结晶', '')
      for (const c of payload.crystals) {
        lines.push(`- 结晶 · ${c.createdAt?.slice(0, 10) || ''}`)
      }
      lines.push('')
    }
    if (payload.anchors?.length) {
      lines.push('## 逐日心锚', '')
      for (const a of payload.anchors) {
        const text = (a as any).title || (a as any).text || ''
        lines.push(`- ${String(text).slice(0, 40)} · ${(a as any).at?.slice(0, 10) || ''}`)
      }
      lines.push('')
    }
    if (payload.goals?.length) {
      lines.push('## 留光目标', '')
      for (const g of payload.goals) {
        lines.push(`- ${(g as any).title || ''}`)
      }
      lines.push('')
    }
    // 嵌入 JSON 数据块用于完整恢复
    lines.push('---', '', '> 以下 JSON 数据块用于完整数据恢复，导入时自动解析。', '')
    lines.push('```json')
    lines.push(JSON.stringify(payload, null, 2))
    lines.push('```', '')
    return lines.join('\n')
  },
}

/** 增强 CSV 转换器（双向，全字段） */
export const csvConverter: DataConverter = {
  id: 'builtin-csv',
  name: 'CSV 格式',
  description: '全数据域 CSV 导入导出，每个数据域用 === 标题分隔，可用 Excel 打开编辑',
  inputFormats: ['csv', 'text/csv'],
  outputFormats: ['csv', 'text/csv'],
  toPayload(data: string): DataPortPayload | null {
    try {
      const payload: DataPortPayload = {}
      // 按 === 标题分隔为多个 CSV 节
      const sections = data.split(/^={3,}\s*(\S+)\s*={3,}\s*$/m).filter(Boolean)
      // 如果没找到 === 标题，尝试整体解析
      if (sections.length === 0) {
        return null
      }
      for (let i = 0; i < sections.length - 1; i += 2) {
        const sectionName = sections[i].trim()
        const csvContent = sections[i + 1].trim()
        if (!csvContent) continue

        switch (sectionName) {
          case 'sessions': {
            const sessionFields: DataField<any>[] = [
              { key: 'id', label: 'id', get: (r: any) => r.id },
              { key: 'startedAt', label: 'startedAt', get: (r: any) => r.startedAt || '' },
              { key: 'completedAt', label: 'completedAt', get: (r: any) => r.completedAt || '' },
              { key: 'elapsed', label: 'elapsed', get: (r: any) => r.elapsed || 0 },
              { key: 'plannedDuration', label: 'plannedDuration', get: (r: any) => r.plannedDuration || 0 },
              { key: 'pausedDuration', label: 'pausedDuration', get: (r: any) => r.pausedDuration || 0 },
              { key: 'mode', label: 'mode', get: (r: any) => r.mode || '' },
              { key: 'status', label: 'status', get: (r: any) => r.status || '' },
              { key: 'tags', label: 'tags', get: (r: any) => (r.tags || []).join(';') },
              { key: 'note', label: 'note', get: (r: any) => r.note || '' },
            ]
            payload.sessions = csvToRecords(csvContent, sessionFields, (v) => {
              if (!v.id) return null
              return {
                id: v.id,
                elapsed: Number(v.elapsed) || 0,
                plannedDuration: Number(v.plannedDuration) || Number(v.elapsed) || 1500000,
                pausedDuration: Number(v.pausedDuration) || 0,
                pausedAt: null,
                startedAt: v.startedAt || null,
                completedAt: v.completedAt || null,
                mode: (v.mode || 'focus') as any,
                status: (v.status || 'completed') as any,
                tags: v.tags ? v.tags.split(';').filter(Boolean) : [],
                note: v.note || '',
                carrierId: '',
              } as any
            })
            break
          }
          case 'notes': {
            const noteFields: DataField<any>[] = [
              { key: 'id', label: 'id', get: (r: any) => r.id },
              { key: 'title', label: 'title', get: (r: any) => r.title || '' },
              { key: 'content', label: 'content', get: (r: any) => (r.content || '').replace(/\n/g, '\\n') },
              { key: 'createdAt', label: 'createdAt', get: (r: any) => r.createdAt || '' },
            ]
            payload.notes = csvToRecords(csvContent, noteFields, (v) => {
              if (!v.id) return null
              return {
                id: v.id,
                title: v.title || '',
                content: (v.content || '').replace(/\\n/g, '\n'),
                createdAt: v.createdAt || new Date().toISOString(),
              } as any
            })
            break
          }
          case 'emotions': {
            payload.emotions = csvToRecords(csvContent, [
              { key: 'id', label: 'id', get: (r: any) => r.id },
              { key: 'type', label: 'type', get: (r: any) => r.type },
              { key: 'createdAt', label: 'createdAt', get: (r: any) => r.createdAt || '' },
              { key: 'note', label: 'note', get: (r: any) => r.note || '' },
            ], (v) => {
              if (!v.id || !v.type) return null
              return { id: v.id, type: v.type, createdAt: v.createdAt || new Date().toISOString(), note: v.note || '' } as any
            })
            break
          }
          case 'crystals': {
            payload.crystals = csvToRecords(csvContent, [
              { key: 'id', label: 'id', get: (r: any) => r.id },
              { key: 'sessionId', label: 'sessionId', get: (r: any) => r.sessionId || '' },
              { key: 'createdAt', label: 'createdAt', get: (r: any) => r.createdAt || '' },
            ], (v) => {
              if (!v.id) return null
              return { id: v.id, sessionId: v.sessionId || '', createdAt: v.createdAt, color: '#a07c8c', intensity: 0.5, shape: 'round' } as any
            })
            break
          }
          case 'anchors': {
            payload.anchors = csvToRecords(csvContent, [
              { key: 'id', label: 'id', get: (r: any) => r.id },
              { key: 'text', label: 'text', get: (r: any) => r.text || '' },
              { key: 'at', label: 'at', get: (r: any) => r.at || '' },
            ], (v) => {
              if (!v.id) return null
              return { id: v.id, text: v.text || '', at: v.at } as any
            })
            break
          }
          case 'goals': {
            payload.goals = csvToRecords(csvContent, [
              { key: 'id', label: 'id', get: (r: any) => r.id },
              { key: 'title', label: 'title', get: (r: any) => r.title || '' },
            ], (v) => {
              if (!v.id) return null
              return { id: v.id, title: v.title || '' } as any
            })
            break
          }
        }
      }
      return Object.keys(payload).length > 0 ? payload : null
    } catch {
      return null
    }
  },
  fromPayload(payload: DataPortPayload): string {
    const parts: string[] = []

    // Sessions
    if (payload.sessions?.length) {
      parts.push('=== sessions ===')
      parts.push(recordsToCSV(payload.sessions, [
        { key: 'id', label: 'id', get: (r: any) => r.id },
        { key: 'startedAt', label: 'startedAt', get: (r: any) => r.startedAt || '' },
        { key: 'completedAt', label: 'completedAt', get: (r: any) => r.completedAt || '' },
        { key: 'elapsed', label: 'elapsed(ms)', get: (r: any) => r.elapsed },
        { key: 'mode', label: 'mode', get: (r: any) => r.mode || '' },
        { key: 'status', label: 'status', get: (r: any) => r.status || '' },
        { key: 'tags', label: 'tags', get: (r: any) => (r.tags || []).join(';') },
      ]))
      parts.push('')
    }

    // Notes
    if (payload.notes?.length) {
      parts.push('=== notes ===')
      parts.push(recordsToCSV(payload.notes, [
        { key: 'id', label: 'id', get: (r: any) => r.id },
        { key: 'title', label: 'title', get: (r: any) => r.title || '' },
        { key: 'content', label: 'content', get: (r: any) => (r.content || '').replace(/\n/g, '\\n') },
        { key: 'createdAt', label: 'createdAt', get: (r: any) => r.createdAt || '' },
      ]))
      parts.push('')
    }

    // Emotions
    if (payload.emotions?.length) {
      parts.push('=== emotions ===')
      parts.push(recordsToCSV(payload.emotions, [
        { key: 'id', label: 'id', get: (r: any) => r.id },
        { key: 'type', label: 'type', get: (r: any) => r.type },
        { key: 'createdAt', label: 'createdAt', get: (r: any) => r.createdAt || '' },
        { key: 'note', label: 'note', get: (r: any) => r.note || '' },
      ]))
      parts.push('')
    }

    // Crystals
    if (payload.crystals?.length) {
      parts.push('=== crystals ===')
      parts.push(recordsToCSV(payload.crystals, [
        { key: 'id', label: 'id', get: (r: any) => r.id },
        { key: 'sessionId', label: 'sessionId', get: (r: any) => r.sessionId || '' },
        { key: 'completedAt', label: 'completedAt', get: (r: any) => r.completedAt || '' },
      ]))
      parts.push('')
    }

    // Anchors
    if (payload.anchors?.length) {
      parts.push('=== anchors ===')
      parts.push(recordsToCSV(payload.anchors, [
        { key: 'id', label: 'id', get: (r: any) => r.id },
        { key: 'text', label: 'text', get: (r: any) => (r as any).text || (r as any).title || '' },
        { key: 'at', label: 'at', get: (r: any) => (r as any).at || '' },
      ]))
      parts.push('')
    }

    // Goals
    if (payload.goals?.length) {
      parts.push('=== goals ===')
      parts.push(recordsToCSV(payload.goals, [
        { key: 'id', label: 'id', get: (r: any) => r.id },
        { key: 'title', label: 'title', get: (r: any) => (r as any).title || '' },
      ]))
      parts.push('')
    }

    return parts.join('\n').trim()
  },
}

/** HTML 报告转换器（仅输出） */
export const htmlConverter: DataConverter = {
  id: 'builtin-html',
  name: 'HTML 报告',
  description: '导出为可视化 HTML 数据报告，含时间线、统计图表，可直接在浏览器中打开',
  inputFormats: [],
  outputFormats: ['html', 'text/html'],
  toPayload(): DataPortPayload | null {
    return null
  },
  fromPayload(payload: DataPortPayload): string {
    const totalSessions = payload.sessions?.length || 0
    const totalMinutes = Math.floor((payload.sessions?.reduce((s, x) => s + x.elapsed, 0) || 0) / 60000)
    const totalNotes = payload.notes?.length || 0
    const totalEmotions = payload.emotions?.length || 0
    const totalCrystals = payload.crystals?.length || 0
    const totalAnchors = payload.anchors?.length || 0
    const totalGoals = payload.goals?.length || 0

    // 生成情绪分布数据
    const emotionCounts: Record<string, number> = {}
    if (payload.emotions) {
      for (const e of payload.emotions) {
        emotionCounts[e.type] = (emotionCounts[e.type] || 0) + 1
      }
    }
    const emotionColors: Record<string, string> = {
      joy: '#f0c040', calm: '#5ab8a0', sadness: '#6c7cf0',
      anxiety: '#e86040', anger: '#e04040', neutral: '#888',
    }
    const emotionEntries = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])

    // 生成每日专注时长数据（最近30天）
    const dayMap: Record<string, number> = {}
    if (payload.sessions) {
      for (const s of payload.sessions) {
        const day = s.completedAt?.slice(0, 10) || s.startedAt?.slice(0, 10)
        if (day) dayMap[day] = (dayMap[day] || 0) + s.elapsed
      }
    }

    // 构建 HTML 各部分（避免嵌套模板字面量）
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const now = new Date().toLocaleString('zh-CN')

    let chartHtml = ''
    const dayEntries = Object.entries(dayMap).sort().slice(-30)
    if (dayEntries.length > 0) {
      const max = Math.max(...dayEntries.map(([, ms]) => Math.floor(ms / 60000)), 1)
      const bars = dayEntries.map(([d, ms]) => {
        const min = Math.floor(ms / 60000)
        const h = (min / max) * 100
        return '<div class="bar" style="height:' + h + '%"><span class="bar-label">' + d.slice(5) + '</span></div>'
      }).join('')
      chartHtml = '<h2>\uD83D\uDCC8 每日专注趋势（近30天）</h2><div class="bar-chart">' + bars + '</div>'
    }

    let emotionHtml = ''
    if (emotionEntries.length > 0) {
      const tags = emotionEntries.map(([type, count]) => {
        const color = emotionColors[type] || '#888'
        return '<span class="emotion-tag" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44">' + esc(type) + ' \u00B7 ' + count + '</span>'
      }).join('')
      emotionHtml = '<h2>\uD83C\uDFAD 情绪分布</h2><div class="emotion-list">' + tags + '</div>'
    }

    let sessionHtml = ''
    if (payload.sessions?.length) {
      const items = payload.sessions.slice(-20).reverse().map(s => {
        const min = Math.floor(s.elapsed / 60000)
        const date = s.completedAt?.slice(0, 10) || s.startedAt?.slice(0, 10) || ''
        return '<div class="session-item"><span class="session-date">' + date + '</span><span class="session-duration">' + min + ' 分钟</span></div>'
      }).join('')
      sessionHtml = '<h2>\u23F1 最近专注记录</h2><div class="session-list">' + items + '</div>'
    }

    return '<!DOCTYPE html>\n' +
      '<html lang="zh-CN">\n' +
      '<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>心流工坊 · 数据报告</title>\n' +
      '<style>\n' +
      '  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      '  body {\n' +
      '    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;\n' +
      '    background: #0e0e1a; color: #d0d0e0; line-height: 1.6; padding: 40px 24px;\n' +
      '  }\n' +
      '  .container { max-width: 800px; margin: 0 auto; }\n' +
      '  h1 { font-size: 24px; font-weight: 500; letter-spacing: 1px; color: #e8e0f0; margin-bottom: 6px; }\n' +
      '  .subtitle { font-size: 13px; color: #888; margin-bottom: 32px; }\n' +
      '  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }\n' +
      '  .stat-card {\n' +
      '    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);\n' +
      '    border-radius: 12px; padding: 18px 16px; text-align: center;\n' +
      '  }\n' +
      '  .stat-num { font-size: 28px; font-weight: 600; color: #c8b8e8; }\n' +
      '  .stat-label { font-size: 11px; color: #888; margin-top: 4px; }\n' +
      '  h2 { font-size: 16px; font-weight: 500; color: #d0c8e0; margin: 28px 0 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }\n' +
      '  .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; margin-bottom: 24px; }\n' +
      '  .bar { flex: 1; min-width: 12px; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #a07c8c, #4a3fa0); position: relative; transition: opacity 0.3s; }\n' +
      '  .bar:hover { opacity: 0.8; }\n' +
      '  .bar-label { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); font-size: 9px; color: #666; white-space: nowrap; }\n' +
      '  .emotion-list { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }\n' +
      '  .emotion-tag { padding: 6px 14px; border-radius: 20px; font-size: 13px; }\n' +
      '  .session-list { max-height: 300px; overflow-y: auto; }\n' +
      '  .session-item { display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.02); margin-bottom: 4px; font-size: 13px; }\n' +
      '  .session-item:hover { background: rgba(255,255,255,0.04); }\n' +
      '  .session-date { color: #888; }\n' +
      '  .session-duration { color: #c8b8e8; }\n' +
      '  footer { text-align: center; margin-top: 48px; font-size: 11px; color: #555; }\n' +
      '</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="container">\n' +
      '  <h1>心流工坊 · 数据报告</h1>\n' +
      '  <p class="subtitle">导出时间：' + now + '</p>\n' +
      '\n' +
      '  <div class="stats-grid">\n' +
      '    <div class="stat-card"><div class="stat-num">' + totalSessions + '</div><div class="stat-label">专注记录</div></div>\n' +
      '    <div class="stat-card"><div class="stat-num">' + totalMinutes + '</div><div class="stat-label">总专注时长 (分钟)</div></div>\n' +
      '    <div class="stat-card"><div class="stat-num">' + totalCrystals + '</div><div class="stat-label">时间结晶</div></div>\n' +
      '    <div class="stat-card"><div class="stat-num">' + totalNotes + '</div><div class="stat-label">笔记</div></div>\n' +
      '    <div class="stat-card"><div class="stat-num">' + totalEmotions + '</div><div class="stat-label">情绪记录</div></div>\n' +
      '    <div class="stat-card"><div class="stat-num">' + (totalAnchors + totalGoals) + '</div><div class="stat-label">心锚 + 目标</div></div>\n' +
      '  </div>\n' +
      '\n' +
      '  ' + chartHtml + '\n' +
      '  ' + emotionHtml + '\n' +
      '  ' + sessionHtml + '\n' +
      '\n' +
      '  <footer>由 心流工坊 (Heartflow) 生成 · 数据完全本地私有</footer>\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>'
  },
}

/** 纯文本转换器（双向） */
export const txtConverter: DataConverter = {
  id: 'builtin-txt',
  name: '纯文本格式',
  description: '简单文本格式，适合快速查看和编辑，支持从文本文件导入恢复',
  inputFormats: ['txt', 'text/plain'],
  outputFormats: ['txt', 'text/plain'],
  toPayload(data: string): DataPortPayload | null {
    try {
      // 尝试解析文本中的 JSON 数据块
      const jsonMatch = data.match(/---\s*DATA\s*---\n([\s\S]*?)\n---\s*END\s*---/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed && typeof parsed === 'object') {
          return parsed as DataPortPayload
        }
      }
      return null
    } catch {
      return null
    }
  },
  fromPayload(payload: DataPortPayload): string {
    const lines: string[] = ['= 心流工坊 · 数据导出 =', '', `导出时间：${new Date().toLocaleString('zh-CN')}`, '']

    if (payload.sessions?.length) {
      lines.push(`[专注记录] ${payload.sessions.length} 条`)
      for (const s of payload.sessions) {
        const min = Math.floor(s.elapsed / 60000)
        const date = s.completedAt?.slice(0, 10) || s.startedAt?.slice(0, 10) || '未知'
        lines.push(`  ${date}  ${min}分钟  ${(s.tags || []).join(', ')}`)
      }
      lines.push('')
    }

    if (payload.notes?.length) {
      lines.push(`[笔记] ${payload.notes.length} 条`)
      for (const n of payload.notes) {
        lines.push(`  ${n.title || '无标题'}  ${n.createdAt?.slice(0, 10) || ''}`)
      }
      lines.push('')
    }

    if (payload.emotions?.length) {
      lines.push(`[情绪记录] ${payload.emotions.length} 条`)
      for (const e of payload.emotions) {
        lines.push(`  ${e.type}  ${e.createdAt?.slice(0, 10) || ''}`)
      }
      lines.push('')
    }

    if (payload.crystals?.length) {
      lines.push(`[时间结晶] ${payload.crystals.length} 个`)
      lines.push('')
    }

    if (payload.anchors?.length) {
      lines.push(`[逐日心锚] ${payload.anchors.length} 条`)
      lines.push('')
    }

    if (payload.goals?.length) {
      lines.push(`[留光目标] ${payload.goals.length} 个`)
      lines.push('')
    }

    // 嵌入 JSON 数据块用于恢复
    lines.push('--- DATA ---')
    lines.push(JSON.stringify(payload, null, 2))
    lines.push('--- END ---')

    return lines.join('\n')
  },
}

/** 初始化内置转换器 */
export function initBuiltinConverters() {
  registerConverter(jsonConverter)
  registerConverter(markdownConverter)
  registerConverter(csvConverter)
  registerConverter(htmlConverter)
  registerConverter(txtConverter)
}