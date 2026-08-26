// ============================================================
// 数据导入/导出引擎 · 宪法第1条「本地私有」
// 支持完整数据可移植性——所有数据域全覆盖
// ============================================================

import { storage } from './storage'
import { useDataOutflow } from './data-outflow'
import type { LedgerRecord } from '../types'
import { findConverterForOutput, findConverterForInput, initBuiltinConverters } from './data-port-converter'

// 初始化内置转换器
initBuiltinConverters()

type ImportableRecord = { id: string }

import type { DataPortPayload } from './data-port-types'
export type { DataPortPayload } from './data-port-types'

export interface ImportCounts {
  sessions: number; crystals: number; notes: number; emotions: number; anchors: number
  goals: number; relations: number; ledger: number; carriers: number; constitution: number
}

/** ImportCounts 各字段的中文显示标签 */
export const IMPORT_COUNT_LABELS: Record<keyof ImportCounts, string> = {
  sessions: '专注记录', crystals: '时间结晶', notes: '笔记', emotions: '情绪标记',
  anchors: '逐日心锚', goals: '留光目标', relations: '羁绊人物', ledger: '账本条目',
  carriers: '玉珠载体', constitution: '宪法配置',
}

/** 返回 ImportCounts 中非零字段的 { key, label, count } 列表 */
export function getImportCountEntries(counts: ImportCounts): { key: string; label: string; count: number }[] {
  return (Object.keys(IMPORT_COUNT_LABELS) as (keyof ImportCounts)[])
    .filter(k => counts[k] > 0)
    .map(k => ({ key: k, label: IMPORT_COUNT_LABELS[k], count: counts[k] }))
}

function mergeById<T extends ImportableRecord>(existing: T[], incoming: unknown): { records: T[]; added: number } {
  if (!Array.isArray(incoming)) return { records: existing, added: 0 }
  const records = [...existing]
  const ids = new Set(existing.map(r => r.id))
  let added = 0
  for (const record of incoming as T[]) {
    if (!record?.id || ids.has(record.id)) continue
    records.push(record)
    ids.add(record.id)
    added++
  }
  return { records, added }
}

function mergeList<T extends ImportableRecord>(existing: T[], incoming: unknown): { records: T[]; added: number } {
  return mergeById(existing, incoming)
}

/** 导出所有数据为 JSON（全覆盖） */
export function exportAllJSON(): string {
  const data: DataPortPayload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    sessions: storage.getSessions(),
    crystals: storage.getCrystals(),
    notes: storage.getNotes(),
    emotions: storage.getEmotions(),
    anchors: storage.getAnchors(),
    goals: storage.getGoals(),
    relations: storage.getRelations(),
    ledger: storage.getLedger(),
    carriers: storage.getCarriers(),
    constitution: storage.getConstitution(),
  }
  return JSON.stringify(data, null, 2)
}

/** 导出某段时间的数据为 Markdown 时间线 */
export function exportTimelineMarkdown(sinceDays: number = 30): string {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - sinceDays)
  const cutoffStr = cutoff.toISOString()

  const sessions = storage.getSessions().filter(s => (s.completedAt || s.startedAt || '') >= cutoffStr)
  const notes = storage.getNotes().filter(n => n.updatedAt >= cutoffStr)
  const emotions = storage.getEmotions().filter(e => e.createdAt >= cutoffStr)
  const anchors = storage.getAnchors().filter(a => a.createdAt >= cutoffStr)

  let md = `# 心流工坊 · 时间之书\n\n导出时间：${new Date().toLocaleDateString('zh-CN')}\n时间范围：最近 ${sinceDays} 天\n\n---\n\n`

  const groups = new Map<string, string[]>()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  for (const s of sessions) {
    const date = (s.completedAt || s.startedAt || '').slice(0, 10)
    if (!date) continue
    const label = date === today ? '今天' : date === yesterday ? '昨天' : date
    const entry = `- ⏱️ **${s.mode === 'focus' ? '专注' : s.mode === 'nap' ? '小憩' : '自由'}** · ${Math.floor(s.elapsed / 60000)}分钟`
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  for (const a of anchors) {
    const date = a.createdAt.slice(0, 10)
    const label = date === today ? '今天' : date === yesterday ? '昨天' : date
    const entry = `- ⚓ ${a.done ? '✓' : '○'} ${a.text}`
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  for (const n of notes) {
    const date = n.updatedAt.slice(0, 10)
    const label = date === today ? '今天' : date === yesterday ? '昨天' : date
    const entry = `- 📝 **${n.title || '未命名笔记'}**${n.content ? ': ' + n.content.slice(0, 100) : ''}`
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  for (const e of emotions) {
    const date = e.createdAt.slice(0, 10)
    const label = date === today ? '今天' : date === yesterday ? '昨天' : date
    const map: Record<string, string> = { happy: '😊 开心', calm: '🌙 平静', sad: '🌧 低落', anxious: '🌪 焦虑', angry: '⚡ 愤怒' }
    const entry = `- ${map[e.type] ?? e.type}${e.note ? ': ' + e.note : ''}`
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }

  const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  for (const [label, entries] of sorted) { md += `## ${label}\n\n` + entries.join('\n') + '\n\n' }
  return md
}

export function download(content: string, filename: string, type: string = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON() {
  const json = exportAllJSON()
  const filename = `heartflow-full-${new Date().toISOString().slice(0, 10)}.json`
  download(json, filename)
  // 守护室·数据流出日志：完整数据备份离设备
  useDataOutflow().recordOutflow('backup', '本地文件', filename, '导出完整数据备份')
}

export function downloadMarkdown(sinceDays: number = 30) {
  const md = exportTimelineMarkdown(sinceDays)
  const filename = `heartflow-timeline-${new Date().toISOString().slice(0, 10)}.md`
  download(md, filename, 'text/markdown')
  // 守护室·数据流出日志：时间线导出离设备
  useDataOutflow().recordOutflow('export', '本地文件', filename, '导出时间线（Markdown）')
}

/** 基于转换器导出指定格式的数据 */
export function exportData(format: string): string {
  const data: DataPortPayload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    sessions: storage.getSessions(),
    crystals: storage.getCrystals(),
    notes: storage.getNotes(),
    emotions: storage.getEmotions(),
    anchors: storage.getAnchors(),
    goals: storage.getGoals(),
    relations: storage.getRelations(),
    ledger: storage.getLedger(),
    carriers: storage.getCarriers(),
    constitution: storage.getConstitution(),
  }
  const converters = findConverterForOutput(format)
  if (converters.length > 0) {
    const result = converters[0].fromPayload(data, format)
    if (result !== null) return result
  }
  // 兜底：返回 JSON
  return JSON.stringify(data, null, 2)
}

/** 基于转换器下载指定格式的数据 */
export function downloadData(format: string) {
  const content = exportData(format)
  const extMap: Record<string, string> = {
    json: 'json', md: 'md', markdown: 'md',
    csv: 'csv', html: 'html', txt: 'txt',
  }
  const mimeMap: Record<string, string> = {
    json: 'application/json', md: 'text/markdown', markdown: 'text/markdown',
    csv: 'text/csv', html: 'text/html', txt: 'text/plain',
  }
  const ext = extMap[format] || 'txt'
  const mime = mimeMap[format] || 'text/plain'
  const filename = `heartflow-export-${new Date().toISOString().slice(0, 10)}.${ext}`
  download(content, filename, mime)
  // 守护室·数据流出日志：按格式导出用户数据离设备
  useDataOutflow().recordOutflow('export', '本地文件', filename, `导出数据（${format}）`)
}

/** 导入指定格式的数据，通过转换器解析后合并到现有数据 */
export function importData(data: string, format: string): ImportCounts {
  // 尝试通过转换器解析
  const converters = findConverterForInput(format)
  for (const c of converters) {
    const payload = c.toPayload(data, format)
    if (payload) {
      return importPayload(payload)
    }
  }
  // 兜底：尝试当作 JSON 解析
  try {
    return importJSON(data)
  } catch {
    throw new Error(`不支持从 ${format} 格式导入`)
  }
}

/** 将解析后的 payload 合并到现有存储 */
function importPayload(payload: DataPortPayload): ImportCounts {
  const counts: ImportCounts = { sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0, goals: 0, relations: 0, ledger: 0, carriers: 0, constitution: 0 }

  const sessions = mergeById(storage.getSessions(), payload.sessions)
  const crystals = mergeById(storage.getCrystals(), payload.crystals)
  const notes = mergeById(storage.getNotes(), payload.notes)
  const emotions = mergeById(storage.getEmotions(), payload.emotions)
  const anchors = mergeById(storage.getAnchors(), payload.anchors)
  const goals = mergeList(storage.getGoals(), payload.goals)
  const relations = mergeList(storage.getRelations(), payload.relations)

  if (sessions.added) { storage.setSessions(sessions.records); counts.sessions = sessions.added }
  if (crystals.added) { storage.setCrystals(crystals.records); counts.crystals = crystals.added }
  if (notes.added) { storage.setNotes(notes.records); counts.notes = notes.added }
  if (emotions.added) { storage.setEmotions(emotions.records); counts.emotions = emotions.added }
  if (anchors.added) { storage.setAnchors(anchors.records); counts.anchors = anchors.added }
  if (goals.added) { storage.setGoals(goals.records); counts.goals = goals.added }
  if (relations.added) { storage.setRelations(relations.records); counts.relations = relations.added }

  if (Array.isArray(payload.ledger)) {
    const existing = storage.getLedger()
    const ids = new Set(existing.map((r: LedgerRecord) => r.id))
    for (const r of payload.ledger) {
      const record = r as any
      if (record?.id && !ids.has(record.id)) {
        if (!record.category) record.category = (record.type === 'income' ? 'salary' : 'other') as any
        storage.addLedgerRecord(record as LedgerRecord)
        ids.add(record.id)
        counts.ledger++
      }
    }
  }

  if (Array.isArray(payload.carriers)) {
    const existing = storage.getCarriers()
    const ids = new Set(existing.map((c: any) => c.id))
    for (const c of payload.carriers) {
      if (c?.id && !ids.has(c.id)) { existing.push(c); ids.add(c.id); counts.carriers++ }
    }
    if (counts.carriers > 0) storage.setCarriers(existing)
  }

  if (payload.constitution && !storage.getConstitution()) {
    storage.setConstitution(payload.constitution)
    counts.constitution = 1
  }

  return counts
}

/** 导入 JSON 数据，合并到现有数据（不覆盖） */
export function importJSON(jsonStr: string): ImportCounts {
  const data = JSON.parse(jsonStr) as DataPortPayload
  const counts: ImportCounts = { sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0, goals: 0, relations: 0, ledger: 0, carriers: 0, constitution: 0 }

  const sessions = mergeById(storage.getSessions(), data.sessions)
  const crystals = mergeById(storage.getCrystals(), data.crystals)
  const notes = mergeById(storage.getNotes(), data.notes)
  const emotions = mergeById(storage.getEmotions(), data.emotions)
  const anchors = mergeById(storage.getAnchors(), data.anchors)
  const goals = mergeList(storage.getGoals(), data.goals)
  const relations = mergeList(storage.getRelations(), data.relations)

  if (sessions.added) { storage.setSessions(sessions.records); counts.sessions = sessions.added }
  if (crystals.added) { storage.setCrystals(crystals.records); counts.crystals = crystals.added }
  if (notes.added) { storage.setNotes(notes.records); counts.notes = notes.added }
  if (emotions.added) { storage.setEmotions(emotions.records); counts.emotions = emotions.added }
  if (anchors.added) { storage.setAnchors(anchors.records); counts.anchors = anchors.added }
  if (goals.added) { storage.setGoals(goals.records); counts.goals = goals.added }
  if (relations.added) { storage.setRelations(relations.records); counts.relations = relations.added }

  // Ledger: append one by one to avoid duplicates, default category if missing
  if (Array.isArray(data.ledger)) {
    const existing = storage.getLedger()
    const ids = new Set(existing.map((r: LedgerRecord) => r.id))
    for (const r of data.ledger) {
      const record = r as any
      if (record?.id && !ids.has(record.id)) {
        if (!record.category) record.category = (record.type === 'income' ? 'salary' : 'other') as any
        storage.addLedgerRecord(record as LedgerRecord)
        ids.add(record.id)
        counts.ledger++
      }
    }
  }

  // Carriers: merge
  if (Array.isArray(data.carriers)) {
    const existing = storage.getCarriers()
    const ids = new Set(existing.map((c: any) => c.id))
    for (const c of data.carriers) {
      if (c?.id && !ids.has(c.id)) { existing.push(c); ids.add(c.id); counts.carriers++ }
    }
    if (counts.carriers > 0) storage.setCarriers(existing)
  }

  // Constitution: only import if none exists
  if (data.constitution && !storage.getConstitution()) {
    storage.setConstitution(data.constitution)
    counts.constitution = 1
  }

  return counts
}

// ============================================================
// 增量导出
// ============================================================

/** 持久化存储的上次导出时间 key */
const LAST_EXPORT_TIME_KEY = 'lastExportTime'

/** 设置上次导出时间 */
export function setLastExportTime(time: string): void {
  storage.setKV(LAST_EXPORT_TIME_KEY, time)
}

/** 获取上次导出时间 */
export function getLastExportTime(): string | null {
  return storage.getKV<string | null>(LAST_EXPORT_TIME_KEY, null)
}

/** 增量导出 JSON：只返回 since 之后变更的数据 */
export function exportIncrementalJSON(since?: string): string {
  const sinceTime = since ?? getLastExportTime()
  const data: DataPortPayload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    sessions: storage.getSessions().filter(s => (s.completedAt || s.startedAt || '') >= (sinceTime ?? '')),
    crystals: storage.getCrystals().filter(c => c.createdAt >= (sinceTime ?? '')),
    notes: storage.getNotes().filter(n => n.updatedAt >= (sinceTime ?? '')),
    emotions: storage.getEmotions().filter(e => e.createdAt >= (sinceTime ?? '')),
    anchors: storage.getAnchors().filter(a => a.createdAt >= (sinceTime ?? '')),
    goals: storage.getGoals().filter(g => (g as any).updatedAt >= (sinceTime ?? '')),
    relations: storage.getRelations().filter(r => (r as any).updatedAt >= (sinceTime ?? '')),
    ledger: storage.getLedger().filter(l => l.at >= (sinceTime ?? '')),
    carriers: storage.getCarriers().filter(c => (c as any).createdAt >= (sinceTime ?? '')),
  }
  return JSON.stringify(data, null, 2)
}

/** 增量导出并支持格式转换 */
export function exportIncrementalData(since: string, format: string): string {
  const json = exportIncrementalJSON(since)
  if (format === 'json' || !format) return json
  const converters = findConverterForOutput(format)
  if (converters.length > 0) {
    const payload = JSON.parse(json) as DataPortPayload
    const result = converters[0].fromPayload(payload, format)
    if (result !== null) return result
  }
  return json
}

// ============================================================
// 社区分享格式
// ============================================================

export interface CommunityShareMeta {
  author: string
  title: string
  description: string
  tags: string[]
  version: string
}

export interface CommunityShareResult {
  formatVersion: number
  meta: CommunityShareMeta
  payload: DataPortPayload
  counts: ImportCounts
}

/** 导出社区分享包 */
export function exportCommunityShare(meta: CommunityShareMeta, domains?: string[]): string {
  const fullPayload: DataPortPayload = {
    sessions: storage.getSessions(),
    crystals: storage.getCrystals(),
    notes: storage.getNotes(),
    emotions: storage.getEmotions(),
    anchors: storage.getAnchors(),
    goals: storage.getGoals(),
    relations: storage.getRelations(),
    ledger: storage.getLedger(),
    carriers: storage.getCarriers(),
    constitution: storage.getConstitution(),
  }

  // 如果有 domains 限制，只保留指定域
  const payload: DataPortPayload = {}
  if (!domains) {
    Object.assign(payload, fullPayload)
  } else {
    for (const domain of domains) {
      if (domain in fullPayload) {
        (payload as any)[domain] = (fullPayload as any)[domain]
      }
    }
  }

  return JSON.stringify({
    formatVersion: 2,
    meta,
    payload,
  }, null, 2)
}

/** 导入社区分享包 */
export function importCommunityShare(json: string): CommunityShareResult | null {
  let parsed: any
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }

  if (!parsed || parsed.formatVersion !== 2 || !parsed.meta || !parsed.payload) {
    return null
  }

  const counts = importPayload(parsed.payload as DataPortPayload)
  return {
    formatVersion: parsed.formatVersion,
    meta: parsed.meta as CommunityShareMeta,
    payload: parsed.payload as DataPortPayload,
    counts,
  }
}
