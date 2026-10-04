// ============================================================
// 逐日心锚 · 状态管理
// ============================================================

import { ref, computed } from 'vue'
import type { Anchor } from './types'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import {
  isAnchorInScale,
  computeScaleDistribution,
} from './anchor-time-scale'
import type { AnchorScale, ScaleSummary, ScaleDistribution, ScaleNavigation } from './anchor-time-scale'
import {
  computeAnchorThreads,
  computeAnchorGoalLinks,
  dumpAnchorPool,
  THREAD_COLORS,
} from './anchor-threads'
import type { AnchorThread, AnchorGoalLink, PoolDumpResult } from './anchor-threads'

export type { Anchor }
export type { AnchorScale, ScaleSummary, ScaleDistribution, ScaleNavigation }
export type { AnchorThread, AnchorGoalLink, PoolDumpResult }
export { THREAD_COLORS }
export {
  getScaleRange,
  isAnchorInScale,
  groupByHour,
  groupByDay,
  groupByWeek,
  groupByMonth,
  computeScaleSummary,
  computeScaleDistribution,
  createScaleNavigation,
} from './anchor-time-scale'
export {
  computeAnchorThreads,
  computeAnchorGoalLinks,
  dumpAnchorPool,
} from './anchor-threads'

// ---- 锚点聚类（P18-4） ----
export {
  useAnchorClustering,
} from './anchor-cluster'
export type {
  AnchorCluster,
  ClusterConfig,
  ClusterDimension,
  ClusterOverview,
} from './anchor-cluster'

// ---- 锚点回顾（P18-4） ----
export {
  useAnchorReview,
  REVIEW_PERIOD_META,
} from './anchor-review'
export type {
  AnchorReview,
  ReviewPeriod,
  ReviewConfig,
  ReviewTemplate,
  DailyReviewTrend,
  PeriodComparison,
  PeriodSnapshot,
  StreakStats,
} from './anchor-review'

// ---- 批量锚点管理（P18-4） ----
export {
  useAnchorBatch,
  BATCH_OPERATION_LABELS,
  BATCH_OPERATION_ICONS,
} from './anchor-batch'
export type {
  BatchOperation,
  BatchOperationType,
  BatchOperationParams,
  BatchOperationResult,
  BatchPreview,
  SelectionState,
  SelectionMode,
  SelectionFilter,
} from './anchor-batch'

// ---- 手札日记数据层（裸 storage 下沉） ----
// 注意：仅导出组合式函数，不导出 AnchorJournal 类型，以避开
//       anchor-journal.ts 中同名但结构不同的 AnchorJournal 接口。
export { useAnchorJournals } from './anchor-journals'

// ---- 手札回溯查询（INCR-378 补孤儿引擎导出：纯函数零消费） ----
export {
  journalDateKey,
  filterJournals,
  journalsOnThisDay,
  journalMoodStats,
} from './anchor-journals'
export {
  JOURNAL_TEMPLATES,
  journalTemplateById,
  journalTemplateName,
} from './anchor-journal-templates'
export type { JournalFilter } from './anchor-journals'
export type { JournalTemplate, JournalTemplateId } from './anchor-journal-templates'

// ---- 图片日记 · 日历/连续/热力分析（INCR 照片日记日历视图：纯函数零消费） ----
export {
  computePhotoStreak,
  buildPhotoMonthGrid,
  buildPhotoHeatmap,
  heatmapMonthLabels,
  findPhotosOnThisDay,
} from './photo-diary-analytics'
export type {
  PhotoStreakStats,
  PhotoDayCell,
  PhotoMonthGrid,
  PhotoHeatmapCell,
  PhotoHeatmapWeek,
  PhotoHeatmapMonthLabel,
  PhotoOnThisDayItem,
} from './photo-diary-analytics'

// ---- 手札上下文 · 建议卡 + 元数据条（P2 市面对标 Apple Journal / Day One） ----
export {
  useJournalContext,
  collectDaySignals,
  buildMetadataBar,
  generateSuggestionCards,
  formatMinutes,
  emptyDaySignals,
  SUGGESTION_LIMIT,
} from './journal-context'
export type {
  DaySignals,
  DaySignalsInput,
  MetadataChip,
  MetadataTone,
  SuggestionCard,
  SuggestionPriority,
} from './journal-context'

// ---- 照片地图 · 照片按日期匹配地图室地点落点（P2 市面对标 Day One 照片地图） ----
export {
  usePhotoMap,
  buildPhotoMapPins,
  photoMapStats,
  placeVisitDate,
  expandEntry,
  pinsCentroid,
} from './photo-map'
export type { PhotoMapPhoto, PhotoMapPin, PhotoMapStats } from './photo-map'

function loadAll(): Anchor[] {
  return storage.getAnchors()
}

function saveAll(anchors: Anchor[]) {
  storage.setAnchors(anchors)
}

const today = () => getLocalDateKey()

function sortAnchorsForDisplay(items: Anchor[]): Anchor[] {
  return [...items].sort((a, b) => {
    if (a.targetDate !== b.targetDate) return a.targetDate.localeCompare(b.targetDate)
    return b.createdAt.localeCompare(a.createdAt)
  })
}

const anchors = ref<Anchor[]>(loadAll())

// ---- NLP 解析 ----

interface ParsedAnchor {
  text: string
  priority: Anchor['priority']
  tags: string[]
  dueTime?: string
  category?: string
}

/** 从自然语言输入解析锚点信息 */
function nlpParse(input: string): ParsedAnchor {
  let text = input.trim()
  let priority: Anchor['priority'] = 'can'
  const tags: string[] = []
  let dueTime: string | undefined
  let category: string | undefined

  // 提取优先级标记: p=high / p=must / p=can / p=float / p=low
  const priorityMatch = text.match(/\bp=(high|must|can|float|low)\b/i)
  if (priorityMatch) {
    const map: Record<string, Anchor['priority']> = { high: 'must', must: 'must', can: 'can', float: 'float', low: 'float' }
    priority = map[priorityMatch[1].toLowerCase()] || 'can'
    text = text.replace(priorityMatch[0], '').trim()
  }

  // 提取 #标签
  const tagRegex = /#([\w\u4e00-\u9fa5\-]+)/g
  let tagMatch
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1])
  }
  text = text.replace(/#[\w\u4e00-\u9fa5\-]+/g, '').trim()

  // 提取到期时间 HH:mm
  const timeRegex = /\b(\d{1,2}:\d{2})\b/
  const timeMatch = text.match(timeRegex)
  if (timeMatch) {
    dueTime = timeMatch[1]
    text = text.replace(timeRegex, '').trim()
  }

  // 提取分类: @分类
  const catRegex = /@([\w\u4e00-\u9fa5]+)/
  const catMatch = text.match(catRegex)
  if (catMatch) {
    category = catMatch[1]
    text = text.replace(catRegex, '').trim()
  }

  return { text, priority, tags, dueTime, category }
}

// ---- 标签聚合 ----

/** 获取所有已使用的标签（去重排序） */
function getAllTags(): string[] {
  const tagSet = new Set<string>()
  for (const a of anchors.value) {
    if (a.tags) a.tags.forEach(t => tagSet.add(t))
  }
  return Array.from(tagSet).sort()
}

/** 获取标签使用频率趋势（近7天各标签出现次数） */
function getTagTrend(): { tag: string; count: number }[] {
  const counts: Record<string, number> = {}
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = getLocalDateKey(weekAgo)

  for (const a of anchors.value) {
    if (a.targetDate >= weekAgoStr && a.tags) {
      for (const t of a.tags) {
        counts[t] = (counts[t] || 0) + 1
      }
    }
  }

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/** 获取分类列表 */
function getCategories(): string[] {
  const catSet = new Set<string>()
  for (const a of anchors.value) {
    if (a.category) catSet.add(a.category)
  }
  return Array.from(catSet).sort()
}

export function useAnchor() {
  function load() {
    anchors.value = loadAll()
  }

  /** 今日锚点 */
  const todayAnchors = computed(() =>
    sortAnchorsForDisplay(anchors.value.filter(a => a.targetDate === today() && (a.stage ?? 'active') === 'active'))
  )

  function getAnchorsByScale(scale: AnchorScale): Anchor[] {
    return sortAnchorsForDisplay(anchors.value.filter(anchor => isAnchorInScale(anchor, scale)))
  }

  /** 锚点池 */
  const poolAnchors = computed(() =>
    anchors.value.filter(a => (a.stage ?? 'active') === 'pool')
  )

  /** 今日未完成 */
  const pending = computed(() =>
    todayAnchors.value.filter(a => !a.done)
  )

  /** 今日已完成 */
  const done = computed(() =>
    todayAnchors.value.filter(a => a.done)
  )

  /** 所有锚点（按创建时间倒序） */
  const allAnchors = computed(() =>
    [...anchors.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  /** 锚点间光丝串联 */
  const anchorThreads = computed(() => computeAnchorThreads(anchors.value))

  /** 当前尺度分布（热力图数据） */
  const scaleDistribution = computed(() => computeScaleDistribution(anchors.value))

  /** 添加锚点（支持 NLP 解析） */
  function add(text: string, priority?: Anchor['priority']): Anchor {
    const parsed = nlpParse(text)
    const finalPriority = priority || parsed.priority

    const anchor: Anchor = {
      id: `anchor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: parsed.text,
      done: false,
      targetDate: today(),
      createdAt: new Date().toISOString(),
      priority: finalPriority,
      stage: 'active',
      driftCount: 0,
      tags: parsed.tags.length > 0 ? parsed.tags : undefined,
      category: parsed.category || undefined,
      dueTime: parsed.dueTime || undefined,
    }
    anchors.value.unshift(anchor)
    saveAll(anchors.value)
    return anchor
  }

  /** 快速添加（直接文本，不解析） */
  function addRaw(text: string, priority: Anchor['priority'] = 'can', extra?: Partial<Anchor>): Anchor {
    const anchor: Anchor = {
      id: `anchor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      done: false,
      targetDate: today(),
      createdAt: new Date().toISOString(),
      priority,
      stage: 'active',
      driftCount: 0,
      ...extra,
    }
    anchors.value.unshift(anchor)
    saveAll(anchors.value)
    return anchor
  }

  /** 更新锚点（全字段更新） */
  function update(id: string, updates: Partial<Anchor>) {
    const a = anchors.value.find(a => a.id === id)
    if (a) {
      Object.assign(a, updates)
      saveAll(anchors.value)
    }
  }

  /** 编辑单个字段 */
  function editField(id: string, field: keyof Anchor, value: unknown) {
    const a = anchors.value.find(a => a.id === id)
    if (a) {
      (a as any)[field] = value
      saveAll(anchors.value)
    }
  }

  /** 标记完成 */
  function markDone(id: string) {
    const a = anchors.value.find(a => a.id === id)
    if (a && (a.stage ?? 'active') === 'active') {
      a.done = true
      a.doneAt = new Date().toISOString()
      saveAll(anchors.value)
    }
  }

  /** 取消完成 */
  function markUndone(id: string) {
    const a = anchors.value.find(a => a.id === id)
    if (a && (a.stage ?? 'active') === 'active') {
      a.done = false
      a.doneAt = undefined
      saveAll(anchors.value)
    }
  }

  /** 切换完成状态 */
  function toggleDone(id: string) {
    const a = anchors.value.find(a => a.id === id)
    if (a) {
      if (a.done) {
        a.done = false
        a.doneAt = undefined
      } else {
        a.done = true
        a.doneAt = new Date().toISOString()
      }
      saveAll(anchors.value)
    }
  }

  /** 删除锚点 */
  function remove(id: string) {
    anchors.value = anchors.value.filter(a => a.id !== id)
    saveAll(anchors.value)
  }

  /** 设置优先级 */
  function setPriority(id: string, priority: Anchor['priority']) {
    const a = anchors.value.find(a => a.id === id)
    if (a) {
      a.priority = priority
      saveAll(anchors.value)
    }
  }

  /** 添加标签 */
  function addTag(id: string, tag: string) {
    const a = anchors.value.find(a => a.id === id)
    if (a) {
      if (!a.tags) a.tags = []
      if (!a.tags.includes(tag)) {
        a.tags.push(tag)
        saveAll(anchors.value)
      }
    }
  }

  /** 移除标签 */
  function removeTag(id: string, tag: string) {
    const a = anchors.value.find(a => a.id === id)
    if (a && a.tags) {
      a.tags = a.tags.filter(t => t !== tag)
      if (a.tags.length === 0) a.tags = undefined
      saveAll(anchors.value)
    }
  }

  /** 未完成的漂移到今天（跨天自动调用） */
  function driftPending() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = getLocalDateKey(yesterday)

    for (const a of anchors.value) {
      if ((a.stage ?? 'active') === 'active' && !a.done && a.targetDate === yesterdayStr) {
        a.targetDate = today()
        a.driftCount++
      }
    }
    saveAll(anchors.value)
  }

  function addToPool(text: string): Anchor | null {
    const trimmed = text.trim()
    if (!trimmed) return null

    const parsed = nlpParse(trimmed)
    const anchor: Anchor = {
      id: `anchor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: parsed.text,
      done: false,
      targetDate: '',
      createdAt: new Date().toISOString(),
      priority: parsed.priority,
      stage: 'pool',
      driftCount: 0,
      tags: parsed.tags.length > 0 ? parsed.tags : undefined,
      category: parsed.category || undefined,
      dueTime: parsed.dueTime || undefined,
    }
    anchors.value.unshift(anchor)
    saveAll(anchors.value)
    return anchor
  }

  function placeFromPool(id: string, priority?: Anchor['priority']) {
    const a = anchors.value.find(a => a.id === id)
    if (!a || (a.stage ?? 'active') !== 'pool') return

    a.stage = 'active'
    a.targetDate = today()
    a.done = false
    a.doneAt = undefined
    a.priority = priority ?? a.priority
    saveAll(anchors.value)
  }

  function placeAllFromPool(priority?: Anchor['priority']) {
    let changed = false
    for (const a of anchors.value) {
      if ((a.stage ?? 'active') !== 'pool') continue
      a.stage = 'active'
      a.targetDate = today()
      a.done = false
      a.doneAt = undefined
      a.priority = priority ?? a.priority
      changed = true
    }
    if (changed) saveAll(anchors.value)
  }

  function returnToPool(id: string) {
    const a = anchors.value.find(a => a.id === id)
    if (!a) return

    a.stage = 'pool'
    a.targetDate = ''
    a.done = false
    a.doneAt = undefined
    saveAll(anchors.value)
  }

  function postponeToTomorrow(id: string) {
    const a = anchors.value.find(a => a.id === id)
    if (!a || (a.stage ?? 'active') !== 'active') return

    const next = new Date()
    next.setDate(next.getDate() + 1)
    a.targetDate = getLocalDateKey(next)
    a.done = false
    a.doneAt = undefined
    saveAll(anchors.value)
  }

  return {
    anchors,
    todayAnchors,
    getAnchorsByScale,
    poolAnchors,
    pending,
    done,
    allAnchors,
    anchorThreads,
    scaleDistribution,
    load,
    add,
    addRaw,
    update,
    editField,
    markDone,
    markUndone,
    toggleDone,
    remove,
    setPriority,
    addTag,
    removeTag,
    driftPending,
    addToPool,
    placeFromPool,
    placeAllFromPool,
    returnToPool,
    postponeToTomorrow,
    nlpParse,
    getAllTags,
    getTagTrend,
    getCategories,
    // 光丝串联
    getAnchorGoalLinks: (goals: import('../goal/types').Goal[]) => computeAnchorGoalLinks(anchors.value, goals),
    dumpAllFromPool: (goals: import('../goal/types').Goal[]) => dumpAnchorPool(poolAnchors.value, goals, today()),
  }
}
