// ============================================================
// 输出管理 · 高级功能：搜索过滤 + 批量操作 + 统计分析 + 导出
// P12增强：70% → 80%
// ============================================================

import { ref } from 'vue'
import type { OutputRecord, OutputRecordType, OutputRecordStatus } from './types'
import { governanceCheckExport } from './governance-gate'

// ---- 搜索过滤 ----

export interface SearchFilter {
  keyword: string
  types: OutputRecordType[]
  statuses: OutputRecordStatus[]
  roomSources: string[]
  dateRange: { start: string; end: string } | null
  emotionCategory: string | null
  intensityRange: { min: number; max: number } | null
  hasAttachments: boolean | null
  tags: string[]
}

export interface FilterPreset {
  id: string
  name: string
  filter: SearchFilter
  createdAt: string
}

export function useSearchFilter(_records: () => OutputRecord[]) {
  const filter = ref<SearchFilter>({
    keyword: '',
    types: [],
    statuses: [],
    roomSources: [],
    dateRange: null,
    emotionCategory: null,
    intensityRange: null,
    hasAttachments: null,
    tags: [],
  })

  const presets = ref<FilterPreset[]>([])
  const sortField = ref<'createdAt' | 'updatedAt' | 'type'>('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  /** 应用过滤条件 */
  function applyFilter(all: OutputRecord[]): OutputRecord[] {
    let result = [...all]

    const f = filter.value

    // 关键词搜索（内容、触发事件）
    if (f.keyword.trim()) {
      const kw = f.keyword.toLowerCase()
      result = result.filter(r =>
        r.content.toLowerCase().includes(kw) ||
        r.triggerEvent?.toLowerCase().includes(kw) ||
        r.emotionCategory?.toLowerCase().includes(kw),
      )
    }

    // 类型过滤
    if (f.types.length > 0) {
      result = result.filter(r => f.types.includes(r.type))
    }

    // 状态过滤
    if (f.statuses.length > 0) {
      result = result.filter(r => f.statuses.includes(r.status))
    }

    // 房间来源
    if (f.roomSources.length > 0) {
      result = result.filter(r => f.roomSources.includes(r.roomSource))
    }

    // 日期范围
    if (f.dateRange) {
      const start = new Date(f.dateRange.start).getTime()
      const end = new Date(f.dateRange.end).getTime() + 86400000
      result = result.filter(r => {
        const t = new Date(r.createdAt).getTime()
        return t >= start && t < end
      })
    }

    // 情绪分类
    if (f.emotionCategory) {
      result = result.filter(r => r.emotionCategory === f.emotionCategory)
    }

    // 强度范围
    if (f.intensityRange) {
      result = result.filter(r =>
        r.intensity !== undefined &&
        r.intensity >= f.intensityRange!.min &&
        r.intensity <= f.intensityRange!.max,
      )
    }

    // 附件
    if (f.hasAttachments === true) {
      result = result.filter(r => r.attachments && r.attachments.length > 0)
    } else if (f.hasAttachments === false) {
      result = result.filter(r => !r.attachments || r.attachments.length === 0)
    }

    // 排序
    result.sort((a, b) => {
      const field = sortField.value
      const aVal = field === 'type' ? a[field] : new Date(a[field]).getTime()
      const bVal = field === 'type' ? b[field] : new Date(b[field]).getTime()
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder.value === 'asc' ? cmp : -cmp
    })

    return result
  }

  /** 保存过滤预设 */
  function savePreset(name: string): FilterPreset {
    const preset: FilterPreset = {
      id: `filter-preset-${Date.now()}`,
      name,
      filter: { ...filter.value },
      createdAt: new Date().toISOString(),
    }
    presets.value.push(preset)
    return preset
  }

  /** 应用预设 */
  function applyPreset(presetId: string): boolean {
    const preset = presets.value.find(p => p.id === presetId)
    if (!preset) return false
    filter.value = { ...preset.filter }
    return true
  }

  /** 删除预设 */
  function deletePreset(presetId: string): boolean {
    const idx = presets.value.findIndex(p => p.id === presetId)
    if (idx < 0) return false
    presets.value.splice(idx, 1)
    return true
  }

  /** 重置过滤 */
  function resetFilter(): void {
    filter.value = {
      keyword: '',
      types: [],
      statuses: [],
      roomSources: [],
      dateRange: null,
      emotionCategory: null,
      intensityRange: null,
      hasAttachments: null,
      tags: [],
    }
  }

  return {
    filter,
    presets,
    sortField,
    sortOrder,
    applyFilter,
    savePreset,
    applyPreset,
    deletePreset,
    resetFilter,
  }
}

// ---- 批量操作 ----

export interface BatchOperation {
  id: string
  type: 'archive' | 'delete' | 'status-change' | 'tag-add' | 'tag-remove'
  targetIds: string[]
  params: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed'
  successCount: number
  failCount: number
  errors: string[]
  startedAt: string
  completedAt?: string
}

export function useBatchOperations(
  getRecords: () => OutputRecord[],
  updateRecord: (id: string, updates: Partial<OutputRecord>) => boolean,
  deleteRecord: (id: string) => boolean,
) {
  const operations = ref<BatchOperation[]>([])
  const selectedIds = ref<Set<string>>(new Set())

  /** 全选/取消全选 */
  function toggleSelectAll(filtered: OutputRecord[]): void {
    if (selectedIds.value.size === filtered.length && filtered.length > 0) {
      selectedIds.value = new Set()
    } else {
      selectedIds.value = new Set(filtered.map(r => r.id))
    }
  }

  /** 切换单个选择 */
  function toggleSelect(id: string): void {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds.value = next
  }

  /** 批量归档 */
  function batchArchive(ids: string[]): BatchOperation {
    const op = createOperation('archive', ids)
    const targets = ids.length > 0 ? ids : [...selectedIds.value]

    const records = getRecords()
    let success = 0
    let fail = 0
    const errors: string[] = []

    targets.forEach(id => {
      const record = records.find(r => r.id === id)
      if (record && record.status !== 'archived') {
        if (updateRecord(id, { status: 'archived' as OutputRecordStatus })) {
          success++
        } else {
          fail++
          errors.push(`归档失败: ${id}`)
        }
      } else {
        fail++
        errors.push(`无法归档: ${id}`)
      }
    })

    finalizeOperation(op, success, fail, errors)
    selectedIds.value = new Set()
    return op
  }

  /** 批量删除 */
  function batchDelete(ids: string[]): BatchOperation {
    const op = createOperation('delete', ids)
    const targets = ids.length > 0 ? ids : [...selectedIds.value]

    let success = 0
    let fail = 0
    const errors: string[] = []

    targets.forEach(id => {
      if (deleteRecord(id)) {
        success++
      } else {
        fail++
        errors.push(`删除失败: ${id}`)
      }
    })

    finalizeOperation(op, success, fail, errors)
    selectedIds.value = new Set()
    return op
  }

  /** 批量修改状态 */
  function batchChangeStatus(ids: string[], newStatus: OutputRecordStatus): BatchOperation {
    const op = createOperation('status-change', ids, { status: newStatus })
    const targets = ids.length > 0 ? ids : [...selectedIds.value]

    let success = 0
    let fail = 0
    const errors: string[] = []

    targets.forEach(id => {
      if (updateRecord(id, { status: newStatus })) {
        success++
      } else {
        fail++
        errors.push(`状态修改失败: ${id}`)
      }
    })

    finalizeOperation(op, success, fail, errors)
    selectedIds.value = new Set()
    return op
  }

  /** 获取批量操作历史 */
  function getOperationHistory(): BatchOperation[] {
    return [...operations.value].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
  }

  return {
    operations,
    selectedIds,
    toggleSelectAll,
    toggleSelect,
    batchArchive,
    batchDelete,
    batchChangeStatus,
    getOperationHistory,
  }
}

function createOperation(
  type: BatchOperation['type'],
  targetIds: string[],
  params: Record<string, unknown> = {},
): BatchOperation {
  return {
    id: `batch-op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    targetIds,
    params,
    status: 'running',
    successCount: 0,
    failCount: 0,
    errors: [],
    startedAt: new Date().toISOString(),
  }
}

function finalizeOperation(
  op: BatchOperation,
  success: number,
  fail: number,
  errors: string[],
): void {
  op.successCount = success
  op.failCount = fail
  op.errors = errors
  op.status = fail > 0 && success === 0 ? 'failed' : 'completed'
  op.completedAt = new Date().toISOString()
}

// ---- 统计分析 ----

export interface OutputStats {
  totalRecords: number
  byType: Record<OutputRecordType, number>
  byStatus: Record<OutputRecordStatus, number>
  byRoom: Record<string, number>
  byEmotion: Record<string, number>
  dailyTrend: { date: string; count: number }[]
  weeklyTrend: { week: string; count: number }[]
  monthlyTrend: { month: string; count: number }[]
  averageIntensity: number
  topRooms: { room: string; count: number }[]
  mostActiveHour: number
  hourDistribution: Record<number, number>
}

export function useOutputStats() {
  const stats = ref<OutputStats | null>(null)

  /** 计算综合统计 */
  function computeStats(records: OutputRecord[]): OutputStats {
    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const byRoom: Record<string, number> = {}
    const byEmotion: Record<string, number> = {}
    const hourDist: Record<number, number> = {}
    let totalIntensity = 0
    let intensityCount = 0

    // 日趋势
    const dailyMap = new Map<string, number>()
    // 周趋势
    const weeklyMap = new Map<string, number>()
    // 月趋势
    const monthlyMap = new Map<string, number>()

    records.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1
      byStatus[r.status] = (byStatus[r.status] || 0) + 1
      byRoom[r.roomSource] = (byRoom[r.roomSource] || 0) + 1

      if (r.emotionCategory) {
        byEmotion[r.emotionCategory] = (byEmotion[r.emotionCategory] || 0) + 1
      }

      if (r.intensity !== undefined) {
        totalIntensity += r.intensity
        intensityCount++
      }

      const date = new Date(r.createdAt)
      const dateKey = r.createdAt.split('T')[0]
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1)

      const weekKey = getWeekKey(date)
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)

      const monthKey = dateKey.slice(0, 7)
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1)

      const hour = date.getHours()
      hourDist[hour] = (hourDist[hour] || 0) + 1
    })

    // 计算最活跃时段
    let mostActiveHour = 0
    let maxHourCount = 0
    for (let h = 0; h < 24; h++) {
      if ((hourDist[h] || 0) > maxHourCount) {
        maxHourCount = hourDist[h] || 0
        mostActiveHour = h
      }
    }

    // 前5房间
    const topRooms = Object.entries(byRoom)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([room, count]) => ({ room, count }))

    const result: OutputStats = {
      totalRecords: records.length,
      byType: byType as Record<OutputRecordType, number>,
      byStatus: byStatus as Record<OutputRecordStatus, number>,
      byRoom,
      byEmotion,
      dailyTrend: [...dailyMap.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      weeklyTrend: [...weeklyMap.entries()].map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week)),
      monthlyTrend: [...monthlyMap.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
      averageIntensity: intensityCount > 0 ? Math.round((totalIntensity / intensityCount) * 100) / 100 : 0,
      topRooms,
      mostActiveHour,
      hourDistribution: hourDist,
    }

    stats.value = result
    return result
  }

  return { stats, computeStats }
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear()
  const start = new Date(year, 0, 1)
  const days = Math.floor((date.getTime() - start.getTime()) / 86400000)
  const week = Math.ceil((days + start.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// ---- 导出功能 ----

export type ExportFormat = 'json' | 'csv' | 'markdown'

export interface ExportResult {
  id: string
  format: ExportFormat
  content: string
  filename: string
  recordCount: number
  exportedAt: string
  size: number
}

export function useExport() {
  const exportHistory = ref<ExportResult[]>([])

  /** 导出记录 */
  function exportRecords(
    records: OutputRecord[],
    format: ExportFormat = 'json',
  ): ExportResult {
    // #85 输出治理闸：本地文件导出不拦截（数据未离开设备），
    // 仅对合并内容进行"观测 + 上报守护室审计"，命中不影响导出。
    governanceCheckExport(records.map(r => r.content).join('\n'))

    let content = ''
    let filename = ''

    switch (format) {
      case 'json':
        content = JSON.stringify(records, null, 2)
        filename = `heartflow-output-${new Date().toISOString().split('T')[0]}.json`
        break
      case 'csv':
        content = recordsToCSV(records)
        filename = `heartflow-output-${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'markdown':
        content = recordsToMarkdown(records)
        filename = `heartflow-output-${new Date().toISOString().split('T')[0]}.md`
        break
    }

    const result: ExportResult = {
      id: `export-${Date.now()}`,
      format,
      content,
      filename,
      recordCount: records.length,
      exportedAt: new Date().toISOString(),
      size: new Blob([content]).size,
    }

    exportHistory.value.push(result)
    return result
  }

  /** 获取导出历史 */
  function getExportHistory(): ExportResult[] {
    return [...exportHistory.value].sort(
      (a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime(),
    )
  }

  return { exportHistory, exportRecords, getExportHistory }
}

function recordsToCSV(records: OutputRecord[]): string {
  const headers = ['id', 'type', 'content', 'status', 'roomSource', 'createdAt', 'emotionCategory', 'intensity', 'triggerEvent']
  const escape = (v: unknown): string => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const rows = records.map(r =>
    headers.map(h => escape((r as unknown as Record<string, unknown>)[h])).join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}

function recordsToMarkdown(records: OutputRecord[]): string {
  let md = '# 心流工坊 · 输出记录导出\n\n'
  md += `> 导出时间：${new Date().toISOString()}\n`
  md += `> 记录数量：${records.length}\n\n`

  md += '| 类型 | 内容 | 房间 | 情绪 | 时间 |\n'
  md += '|------|------|------|------|------|\n'

  records.forEach(r => {
    const content = r.content.length > 50 ? r.content.slice(0, 50) + '...' : r.content
    const emotion = r.emotionCategory || '-'
    const date = r.createdAt.split('T')[0]
    md += `| ${r.type} | ${content} | ${r.roomSource} | ${emotion} | ${date} |\n`
  })

  return md
}