// ============================================================
// 时间长廊 · 增强过滤与搜索
// 时间轴高级过滤 + 文本搜索 + 事件关联 + 热力图
// P18-1：高级搜索（模糊搜索、布尔运算、正则搜索、搜索历史、保存搜索）
// ============================================================

import type { RiverItem, RiverItemType, RiverSource, DailySummary } from './river'
import { createRiverItems } from './river'

/** 时间范围 */
export interface TimeRange {
  start: Date
  end: Date
}

/** 搜索选项 */
export interface TimelineSearchOptions {
  query: string
  /** 搜索范围：标题/内容/标签 */
  fields: ('title' | 'content' | 'tags')[]
  caseSensitive: boolean
}

/** 高级搜索选项 */
export interface AdvancedSearchOptions {
  /** 搜索词 */
  query: string
  /** 搜索范围 */
  fields: ('title' | 'content' | 'tags')[]
  /** 是否区分大小写 */
  caseSensitive: boolean
  /** 是否启用模糊搜索 */
  fuzzy: boolean
  /** 模糊搜索阈值（0-1，越高越严格） */
  fuzzyThreshold: number
  /** 是否启用正则搜索 */
  regex: boolean
  /** 布尔组合：AND/OR */
  booleanMode: 'and' | 'or'
  /** 多词搜索时拆分查询 */
  splitQuery: boolean
  /** 时间范围过滤 */
  timeRange?: TimeRange
  /** 类型过滤 */
  types?: RiverItemType[]
  /** 最小评分阈值 */
  minScore: number
}

/** 搜索命中结果 */
export interface SearchHit {
  item: RiverItem
  score: number
  matchedFields: string[]
  highlights: { field: string; snippet: string }[]
  /** 模糊匹配详情 */
  fuzzyDetails?: { field: string; similarity: number; matchedTerm: string }[]
}

/** 搜索历史条目 */
export interface SearchHistoryEntry {
  id: string
  query: string
  options: Partial<AdvancedSearchOptions>
  hitCount: number
  timestamp: string
}

/** 保存的搜索 */
export interface SavedSearch {
  id: string
  name: string
  query: string
  options: Partial<AdvancedSearchOptions>
  createdAt: string
  updatedAt: string
  lastHitCount: number
}

/** 事件关联 */
export interface EventCorrelation {
  sourceId: string
  targetId: string
  sourceType: RiverItemType
  targetType: RiverItemType
  strength: number
  reason: string
  sharedTags: string[]
  timeDistance: number // 分钟
}

/** 时间轴统计 */
export interface TimelineStats {
  totalItems: number
  dateRange: { start: string; end: string }
  typeDistribution: { type: RiverItemType; count: number; percentage: number }[]
  tagDistribution: { tag: string; count: number }[]
  dailyAverage: number
  mostActiveDay: { date: string; count: number }
  mostActiveHour: number
  /** 热力图数据：日期 -> 小时 -> 计数 */
  heatmap: { date: string; hours: number[] }[]
  /** 连续活跃天数 */
  streakDays: number
  /** 事件关联图谱 */
  correlations: EventCorrelation[]
}

/** 日期分组 */
export interface DateGroup {
  date: string
  label: string
  items: RiverItem[]
  summary: DailySummary
}

// ---- 内部工具函数 ----

function toDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function toHourStr(ts: number): number {
  return new Date(ts).getHours()
}

function extractText(item: RiverItem): { title: string; content: string; tags: string[] } {
  let title = ''
  let content = ''
  const tags: string[] = []

  if (item.note) {
    title = item.note.title || ''
    content = item.note.content || ''
    tags.push(...(item.note.tags || []))
  }
  if (item.session) {
    title = item.session.note || `专注 ${Math.round((item.session.elapsed || 0) / 60000)}分钟`
    content = item.session.note || ''
    tags.push(...(item.session.tags || []))
  }
  if (item.crystal) {
    title = item.crystal.insight || '时间结晶'
    content = item.crystal.insight || ''
    tags.push(...(item.crystal.tags || []))
  }
  if (item.emotion) {
    title = item.emotion.type || '情绪记录'
    content = item.emotion.note || ''
    tags.push(item.emotion.type || '')
  }
  if (item.anchor) {
    title = item.anchor.text || ''
    content = item.anchor.notes || ''
    tags.push(...(item.anchor.tags || []))
  }

  return { title, content, tags }
}

// ---- 过滤函数 ----

/**
 * 按时间范围过滤
 */
export function filterByTimeRange(items: RiverItem[], range: TimeRange): RiverItem[] {
  const start = range.start.getTime()
  const end = range.end.getTime()
  return items.filter(i => i.ts >= start && i.ts <= end)
}

/**
 * 按类型过滤
 */
export function filterByTypes(items: RiverItem[], types: RiverItemType[]): RiverItem[] {
  if (types.length === 0) return items
  const typeSet = new Set(types)
  return items.filter(i => typeSet.has(i.type))
}

/**
 * 文本搜索
 * 支持标题、内容、标签字段搜索，返回带评分和摘录的命中结果
 */
export function searchTimeline(
  items: RiverItem[],
  options: TimelineSearchOptions,
): SearchHit[] {
  const { query, fields, caseSensitive } = options
  const q = caseSensitive ? query : query.toLowerCase()
  if (!q) return []

  const hits: SearchHit[] = []

  for (const item of items) {
    const { title, content, tags } = extractText(item)
    const searchTitle = caseSensitive ? title : title.toLowerCase()
    const searchContent = caseSensitive ? content : content.toLowerCase()
    const searchTags = caseSensitive ? tags : tags.map(t => t.toLowerCase())

    let score = 0
    const matchedFields: string[] = []
    const highlights: { field: string; snippet: string }[] = []

    if (fields.includes('title') && searchTitle.includes(q)) {
      const idx = searchTitle.indexOf(q)
      const start = Math.max(0, idx - 15)
      const end = Math.min(searchTitle.length, idx + q.length + 15)
      highlights.push({ field: 'title', snippet: title.slice(start, end) })
      matchedFields.push('title')
      score += 50
      // 标题开头匹配加分
      if (idx === 0) score += 20
    }

    if (fields.includes('content') && searchContent.includes(q)) {
      const idx = searchContent.indexOf(q)
      const start = Math.max(0, idx - 20)
      const end = Math.min(searchContent.length, idx + q.length + 20)
      highlights.push({ field: 'content', snippet: content.slice(start, end) })
      matchedFields.push('content')
      score += 30
    }

    if (fields.includes('tags')) {
      const matchedTags = searchTags.filter(t => t.includes(q))
      if (matchedTags.length > 0) {
        highlights.push({ field: 'tags', snippet: matchedTags.join(', ') })
        matchedFields.push('tags')
        score += matchedTags.length * 15
      }
    }

    if (score > 0) {
      hits.push({ item, score: Math.min(score, 100), matchedFields, highlights })
    }
  }

  return hits.sort((a, b) => b.score - a.score)
}

// ============================================================
// 高级搜索：模糊搜索 + 布尔运算 + 正则搜索
// ============================================================

/** 默认高级搜索选项 */
export const DEFAULT_ADVANCED_OPTIONS: AdvancedSearchOptions = {
  query: '',
  fields: ['title', 'content', 'tags'],
  caseSensitive: false,
  fuzzy: false,
  fuzzyThreshold: 0.6,
  regex: false,
  booleanMode: 'or',
  splitQuery: true,
  minScore: 0,
}

/**
 * 计算 Levenshtein 编辑距离
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  // 使用滚动数组优化空间
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,       // 删除
        curr[j - 1] + 1,   // 插入
        prev[j - 1] + cost, // 替换
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]
}

/**
 * 计算字符串相似度（0-1，基于 Levenshtein 距离）
 */
export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

/**
 * 模糊搜索：在文本中查找与查询最相似的子串
 * 返回所有匹配的子串及相似度
 */
export function fuzzyMatch(
  text: string,
  query: string,
  threshold: number,
): { matched: boolean; similarity: number; matchedTerm: string }[] {
  const results: { matched: boolean; similarity: number; matchedTerm: string }[] = []
  const qLen = query.length

  if (qLen === 0 || text.length === 0) return results

  // 滑动窗口：检查不同长度的子串
  const windowSizes = [qLen, qLen + 1, qLen - 1, qLen + 2, qLen - 2].filter(w => w > 0 && w <= text.length)

  for (const wSize of windowSizes) {
    for (let i = 0; i <= text.length - wSize; i++) {
      const sub = text.slice(i, i + wSize)
      const sim = stringSimilarity(sub, query)
      if (sim >= threshold) {
        results.push({ matched: true, similarity: sim, matchedTerm: sub })
      }
    }
  }

  // 去重并按相似度排序
  return results
    .filter((r, i, arr) => arr.findIndex(x => x.matchedTerm === r.matchedTerm) === i)
    .sort((a, b) => b.similarity - a.similarity)
}

/**
 * 高级搜索：支持模糊搜索、正则搜索、布尔运算、多条件过滤
 */
export function advancedSearch(
  items: RiverItem[],
  options: Partial<AdvancedSearchOptions> = {},
): SearchHit[] {
  const opts = { ...DEFAULT_ADVANCED_OPTIONS, ...options }
  const { query, fields, caseSensitive, fuzzy, fuzzyThreshold, regex, booleanMode, splitQuery, timeRange, types, minScore } = opts

  let filtered = items

  // 时间范围过滤
  if (timeRange) {
    filtered = filterByTimeRange(filtered, timeRange)
  }

  // 类型过滤
  if (types && types.length > 0) {
    filtered = filterByTypes(filtered, types)
  }

  // 空查询返回所有已过滤结果
  if (!query) {
    return filtered.map(item => ({
      item,
      score: 0,
      matchedFields: [],
      highlights: [],
    }))
  }

  const q = caseSensitive ? query : query.toLowerCase()

  // 正则搜索
  if (regex) {
    return regexSearch(filtered, q, fields, caseSensitive, minScore)
  }

  // 多词拆分
  if (splitQuery && q.includes(' ')) {
    const terms = q.split(/\s+/).filter(t => t.length > 0)
    if (terms.length > 1) {
      return multiTermSearch(filtered, terms, fields, caseSensitive, fuzzy, fuzzyThreshold, booleanMode, minScore)
    }
  }

  // 模糊搜索
  if (fuzzy) {
    return fuzzySearch(filtered, q, fields, caseSensitive, fuzzyThreshold, minScore)
  }

  // 降级为精确搜索
  return searchTimeline(filtered, { query: q, fields, caseSensitive })
    .filter(h => h.score >= minScore)
}

/**
 * 正则搜索
 */
function regexSearch(
  items: RiverItem[],
  pattern: string,
  fields: ('title' | 'content' | 'tags')[],
  caseSensitive: boolean,
  minScore: number,
): SearchHit[] {
  const hits: SearchHit[] = []

  try {
    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(pattern, flags)

    for (const item of items) {
      const { title, content, tags } = extractText(item)
      let score = 0
      const matchedFields: string[] = []
      const highlights: { field: string; snippet: string }[] = []

      if (fields.includes('title') && regex.test(title)) {
        regex.lastIndex = 0
        const match = title.match(regex)
        if (match) {
          highlights.push({ field: 'title', snippet: match[0] })
          matchedFields.push('title')
          score += 50
        }
      }

      if (fields.includes('content') && regex.test(content)) {
        regex.lastIndex = 0
        const match = content.match(regex)
        if (match) {
          highlights.push({ field: 'content', snippet: match[0] })
          matchedFields.push('content')
          score += 30
        }
      }

      if (fields.includes('tags')) {
        const matchedTags = tags.filter(t => regex.test(t))
        if (matchedTags.length > 0) {
          highlights.push({ field: 'tags', snippet: matchedTags.join(', ') })
          matchedFields.push('tags')
          score += matchedTags.length * 15
        }
      }

      if (score >= minScore) {
        hits.push({ item, score: Math.min(score, 100), matchedFields, highlights })
      }
    }
  } catch {
    // 无效正则表达式，返回空结果
    return []
  }

  return hits.sort((a, b) => b.score - a.score)
}

/**
 * 多词搜索（支持 AND/OR 布尔运算）
 */
function multiTermSearch(
  items: RiverItem[],
  terms: string[],
  fields: ('title' | 'content' | 'tags')[],
  caseSensitive: boolean,
  fuzzy: boolean,
  fuzzyThreshold: number,
  booleanMode: 'and' | 'or',
  minScore: number,
): SearchHit[] {
  const hits: SearchHit[] = []

  for (const item of items) {
    const { title, content, tags } = extractText(item)
    const searchTitle = caseSensitive ? title : title.toLowerCase()
    const searchContent = caseSensitive ? content : content.toLowerCase()
    const searchTags = caseSensitive ? tags : tags.map(t => t.toLowerCase())

    let score = 0
    const matchedFields: string[] = []
    const highlights: { field: string; snippet: string }[] = []
    const fuzzyDetails: { field: string; similarity: number; matchedTerm: string }[] = []
    const termMatches: boolean[] = []

    for (const term of terms) {
      let termMatched = false

      if (fuzzy) {
        // 模糊匹配每个词
        if (fields.includes('title')) {
          const titleMatches = fuzzyMatch(searchTitle, term, fuzzyThreshold)
          if (titleMatches.length > 0) {
            termMatched = true
            if (!matchedFields.includes('title')) matchedFields.push('title')
            highlights.push({ field: 'title', snippet: titleMatches[0].matchedTerm })
            fuzzyDetails.push({ field: 'title', similarity: titleMatches[0].similarity, matchedTerm: titleMatches[0].matchedTerm })
            score += 40 * titleMatches[0].similarity
          }
        }

        if (fields.includes('content')) {
          const contentMatches = fuzzyMatch(searchContent, term, fuzzyThreshold)
          if (contentMatches.length > 0) {
            termMatched = true
            if (!matchedFields.includes('content')) matchedFields.push('content')
            highlights.push({ field: 'content', snippet: contentMatches[0].matchedTerm })
            fuzzyDetails.push({ field: 'content', similarity: contentMatches[0].similarity, matchedTerm: contentMatches[0].matchedTerm })
            score += 25 * contentMatches[0].similarity
          }
        }

        if (fields.includes('tags')) {
          const tagMatches = searchTags
            .map(t => ({ tag: t, sim: stringSimilarity(t, term) }))
            .filter(t => t.sim >= fuzzyThreshold)
          if (tagMatches.length > 0) {
            termMatched = true
            if (!matchedFields.includes('tags')) matchedFields.push('tags')
            highlights.push({ field: 'tags', snippet: tagMatches[0].tag })
            fuzzyDetails.push({ field: 'tags', similarity: tagMatches[0].sim, matchedTerm: tagMatches[0].tag })
            score += tagMatches.length * 12
          }
        }
      } else {
        // 精确匹配每个词
        if (fields.includes('title') && searchTitle.includes(term)) {
          termMatched = true
          if (!matchedFields.includes('title')) matchedFields.push('title')
          const idx = searchTitle.indexOf(term)
          highlights.push({ field: 'title', snippet: title.slice(Math.max(0, idx - 10), idx + term.length + 10) })
          score += 40
        }
        if (fields.includes('content') && searchContent.includes(term)) {
          termMatched = true
          if (!matchedFields.includes('content')) matchedFields.push('content')
          const idx = searchContent.indexOf(term)
          highlights.push({ field: 'content', snippet: content.slice(Math.max(0, idx - 10), idx + term.length + 10) })
          score += 25
        }
        if (fields.includes('tags')) {
          const matchedTags = searchTags.filter(t => t.includes(term))
          if (matchedTags.length > 0) {
            termMatched = true
            if (!matchedFields.includes('tags')) matchedFields.push('tags')
            highlights.push({ field: 'tags', snippet: matchedTags.join(', ') })
            score += matchedTags.length * 12
          }
        }
      }

      termMatches.push(termMatched)
    }

    // 布尔模式判断
    const matchesAll = termMatches.length > 0 && termMatches.every(Boolean)
    const matchesAny = termMatches.some(Boolean)

    const shouldInclude = booleanMode === 'and' ? matchesAll : matchesAny

    if (shouldInclude && score >= minScore) {
      hits.push({
        item,
        score: Math.min(Math.round(score), 100),
        matchedFields: [...new Set(matchedFields)],
        highlights,
        fuzzyDetails: fuzzyDetails.length > 0 ? fuzzyDetails : undefined,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score)
}

/**
 * 模糊搜索
 */
function fuzzySearch(
  items: RiverItem[],
  query: string,
  fields: ('title' | 'content' | 'tags')[],
  caseSensitive: boolean,
  fuzzyThreshold: number,
  minScore: number,
): SearchHit[] {
  const hits: SearchHit[] = []

  for (const item of items) {
    const { title, content, tags } = extractText(item)
    const searchTitle = caseSensitive ? title : title.toLowerCase()
    const searchContent = caseSensitive ? content : content.toLowerCase()
    const searchTags = caseSensitive ? tags : tags.map(t => t.toLowerCase())

    let score = 0
    const matchedFields: string[] = []
    const highlights: { field: string; snippet: string }[] = []
    const fuzzyDetails: { field: string; similarity: number; matchedTerm: string }[] = []

    if (fields.includes('title')) {
      const titleMatches = fuzzyMatch(searchTitle, query, fuzzyThreshold)
      if (titleMatches.length > 0) {
        matchedFields.push('title')
        highlights.push({ field: 'title', snippet: titleMatches[0].matchedTerm })
        fuzzyDetails.push({ field: 'title', similarity: titleMatches[0].similarity, matchedTerm: titleMatches[0].matchedTerm })
        score += 50 * titleMatches[0].similarity
        // 标题开头匹配加分
        if (searchTitle.startsWith(query)) score += 20
      }
    }

    if (fields.includes('content')) {
      const contentMatches = fuzzyMatch(searchContent, query, fuzzyThreshold)
      if (contentMatches.length > 0) {
        matchedFields.push('content')
        highlights.push({ field: 'content', snippet: contentMatches[0].matchedTerm })
        fuzzyDetails.push({ field: 'content', similarity: contentMatches[0].similarity, matchedTerm: contentMatches[0].matchedTerm })
        score += 30 * contentMatches[0].similarity
      }
    }

    if (fields.includes('tags')) {
      const tagMatches = searchTags
        .map(t => ({ tag: t, sim: stringSimilarity(t, query) }))
        .filter(t => t.sim >= fuzzyThreshold)
      if (tagMatches.length > 0) {
        matchedFields.push('tags')
        highlights.push({ field: 'tags', snippet: tagMatches[0].tag })
        fuzzyDetails.push({ field: 'tags', similarity: tagMatches[0].sim, matchedTerm: tagMatches[0].tag })
        score += tagMatches.length * 15 * tagMatches[0].sim
      }
    }

    if (score >= minScore) {
      hits.push({
        item,
        score: Math.min(Math.round(score), 100),
        matchedFields,
        highlights,
        fuzzyDetails: fuzzyDetails.length > 0 ? fuzzyDetails : undefined,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score)
}

// ============================================================
// 搜索历史管理
// ============================================================

/** 搜索历史存储键 */
const SEARCH_HISTORY_KEY = 'hf:timeline:search_history'
const SAVED_SEARCHES_KEY = 'hf:timeline:saved_searches'
const MAX_HISTORY_SIZE = 50

/**
 * 搜索历史管理器
 */
export function createSearchHistoryManager(storageGetter: (key: string) => string | null, storageSetter: (key: string, value: string) => void) {
  function load(): SearchHistoryEntry[] {
    try {
      const raw = storageGetter(SEARCH_HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function save(entries: SearchHistoryEntry[]): void {
    storageSetter(SEARCH_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_SIZE)))
  }

  function addEntry(entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>): SearchHistoryEntry {
    const history = load()
    const newEntry: SearchHistoryEntry = {
      ...entry,
      id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    }

    // 去重：相同查询更新
    const existingIdx = history.findIndex(h => h.query === entry.query)
    if (existingIdx >= 0) {
      history[existingIdx] = { ...history[existingIdx], ...newEntry, id: history[existingIdx].id }
    } else {
      history.unshift(newEntry)
    }

    save(history)
    return newEntry
  }

  function getRecent(limit: number = 10): SearchHistoryEntry[] {
    return load().slice(0, limit)
  }

  function clear(): void {
    save([])
  }

  function remove(id: string): void {
    const history = load().filter(h => h.id !== id)
    save(history)
  }

  return { load, addEntry, getRecent, clear, remove }
}

/**
 * 保存的搜索管理器
 */
export function createSavedSearchManager(storageGetter: (key: string) => string | null, storageSetter: (key: string, value: string) => void) {
  function load(): SavedSearch[] {
    try {
      const raw = storageGetter(SAVED_SEARCHES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function save(searches: SavedSearch[]): void {
    storageSetter(SAVED_SEARCHES_KEY, JSON.stringify(searches))
  }

  function add(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt' | 'lastHitCount'>): SavedSearch {
    const searches = load()
    const newSearch: SavedSearch = {
      ...search,
      id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastHitCount: 0,
    }
    searches.push(newSearch)
    save(searches)
    return newSearch
  }

  function update(id: string, updates: Partial<Pick<SavedSearch, 'name' | 'query' | 'options' | 'lastHitCount'>>): SavedSearch | null {
    const searches = load()
    const idx = searches.findIndex(s => s.id === id)
    if (idx < 0) return null
    searches[idx] = { ...searches[idx], ...updates, updatedAt: new Date().toISOString() }
    save(searches)
    return searches[idx]
  }

  function remove(id: string): void {
    save(load().filter(s => s.id !== id))
  }

  function getAll(): SavedSearch[] {
    return load().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  function getById(id: string): SavedSearch | undefined {
    return load().find(s => s.id === id)
  }

  return { load, add, update, remove, getAll, getById }
}

// ---- 事件关联 ----

/**
 * 发现时间轴上的事件关联
 * 基于共享标签、时间接近度、类型互补性
 */
export function findEventCorrelations(items: RiverItem[]): EventCorrelation[] {
  const correlations: EventCorrelation[] = []
  const sorted = [...items].sort((a, b) => a.ts - b.ts)

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]
      const b = sorted[j]

      // 时间距离（分钟）
      const timeDistance = Math.abs(b.ts - a.ts) / 60000

      // 跳过时间距离太远的事件（超过 24 小时）
      if (timeDistance > 24 * 60) continue

      let strength = 0
      const reasons: string[] = []

      // 共享标签加分
      const aTags = extractText(a).tags
      const bTags = extractText(b).tags
      const sharedTags = aTags.filter(t => bTags.includes(t))
      if (sharedTags.length > 0) {
        strength += sharedTags.length * 20
        reasons.push(`共享标签: ${sharedTags.join(', ')}`)
      }

      // 时间接近度加分（越近分越高）
      if (timeDistance < 5) {
        strength += 30
        reasons.push('几乎同时发生')
      } else if (timeDistance < 30) {
        strength += 20
        reasons.push('半小时内发生')
      } else if (timeDistance < 120) {
        strength += 10
        reasons.push('两小时内发生')
      }

      // 类型互补加分
      if (a.type === 'session' && b.type === 'crystal') {
        strength += 15
        reasons.push('专注→结晶')
      }
      if (a.type === 'emotion' && b.type === 'note') {
        strength += 10
        reasons.push('情绪→笔记')
      }
      if (a.type === 'anchor' && b.type === 'session') {
        strength += 10
        reasons.push('心锚→专注')
      }

      if (strength >= 20) {
        correlations.push({
          sourceId: a.id,
          targetId: b.id,
          sourceType: a.type,
          targetType: b.type,
          strength: Math.min(strength, 100),
          reason: reasons.join('；'),
          sharedTags,
          timeDistance: Math.round(timeDistance),
        })
      }
    }
  }

  return correlations.sort((a, b) => b.strength - a.strength)
}

// ---- 统计 ----

/**
 * 计算时间轴综合统计
 */
export function computeTimelineStats(
  source: RiverSource,
  activeFilters: RiverItemType[],
): TimelineStats {
  const items = createRiverItems(source, activeFilters)
  if (items.length === 0) {
    return {
      totalItems: 0,
      dateRange: { start: '', end: '' },
      typeDistribution: [],
      tagDistribution: [],
      dailyAverage: 0,
      mostActiveDay: { date: '', count: 0 },
      mostActiveHour: 0,
      heatmap: [],
      streakDays: 0,
      correlations: [],
    }
  }

  const sorted = [...items].sort((a, b) => a.ts - b.ts)

  // 日期范围
  const dateRange = {
    start: toDateStr(sorted[0].ts),
    end: toDateStr(sorted[sorted.length - 1].ts),
  }

  // 类型分布
  const typeCounts: Record<string, number> = {}
  for (const item of items) {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1
  }
  const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
    type: type as RiverItemType,
    count,
    percentage: Math.round((count / items.length) * 100),
  }))

  // 标签分布
  const tagDist: Record<string, number> = {}
  for (const item of items) {
    const tags = extractText(item).tags
    for (const t of tags) {
      tagDist[t] = (tagDist[t] || 0) + 1
    }
  }
  const tagDistribution = Object.entries(tagDist)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // 每日平均
  const daySet = new Set(items.map(i => toDateStr(i.ts)))
  const dailyAverage = Math.round(items.length / Math.max(daySet.size, 1))

  // 最高产日
  const dayCounts: Record<string, number> = {}
  for (const item of items) {
    const d = toDateStr(item.ts)
    dayCounts[d] = (dayCounts[d] || 0) + 1
  }
  let mostActiveDay = { date: '', count: 0 }
  for (const [date, count] of Object.entries(dayCounts)) {
    if (count > mostActiveDay.count) {
      mostActiveDay = { date, count }
    }
  }

  // 最高产小时
  const hourCounts: Record<number, number> = {}
  for (const item of items) {
    const h = toHourStr(item.ts)
    hourCounts[h] = (hourCounts[h] || 0) + 1
  }
  let mostActiveHour = 9
  let maxHour = 0
  for (const [h, count] of Object.entries(hourCounts)) {
    if (count > maxHour) {
      maxHour = count
      mostActiveHour = parseInt(h)
    }
  }

  // 热力图（最近 14 天 × 24 小时）
  const now = new Date()
  const heatmap: { date: string; hours: number[] }[] = []
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
    const dateStr = toDateStr(date.getTime())
    const hours = new Array(24).fill(0)
    for (const item of items) {
      if (toDateStr(item.ts) === dateStr) {
        hours[toHourStr(item.ts)]++
      }
    }
    heatmap.push({ date: dateStr, hours })
  }

  // 连续活跃天数
  let streakDays = 0
  let checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)
  while (dayCounts[toDateStr(checkDate.getTime())]) {
    streakDays++
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
  }

  // 事件关联
  const correlations = findEventCorrelations(items)

  return {
    totalItems: items.length,
    dateRange,
    typeDistribution,
    tagDistribution,
    dailyAverage,
    mostActiveDay,
    mostActiveHour,
    heatmap,
    streakDays,
    correlations,
  }
}

/**
 * 按日期分组
 */
export function groupByDate(
  items: RiverItem[],
  todayStr: string,
  yesterdayStr: string,
): DateGroup[] {
  const groups = new Map<string, RiverItem[]>()
  for (const item of items) {
    const d = toDateStr(item.ts)
    if (!groups.has(d)) groups.set(d, [])
    groups.get(d)!.push(item)
  }

  const result: DateGroup[] = []
  for (const [date, dayItems] of groups) {
    const label = date === todayStr
      ? '今天'
      : date === yesterdayStr
        ? '昨天'
        : `${new Date(date).getMonth() + 1}月${new Date(date).getDate()}日`

    result.push({
      date,
      label,
      items: dayItems.sort((a, b) => b.ts - a.ts),
      summary: {
        date,
        label,
        crystalCount: 0,
        noteCount: 0,
        emotionCount: 0,
        sessionCount: 0,
        anchorCount: 0,
        bodyCount: 0,
        habitCount: 0,
        movementCount: 0,
        restCount: 0,
        dialogueCount: 0,
        totalFocusMinutes: 0,
        completedAnchors: 0,
        uniqueTags: [],
      },
    })
  }

  return result.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * 获取两个日期之间的时间轴项
 */
export function getItemsBetween(
  items: RiverItem[],
  start: Date,
  end: Date,
): RiverItem[] {
  const s = start.getTime()
  const e = end.getTime()
  return items.filter(i => i.ts >= s && i.ts <= e)
}

/**
 * 获取指定日期的时间轴项
 */
export function getItemsOnDate(items: RiverItem[], date: Date): RiverItem[] {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const start = d.getTime()
  const end = start + 24 * 60 * 60 * 1000
  return items.filter(i => i.ts >= start && i.ts < end)
}