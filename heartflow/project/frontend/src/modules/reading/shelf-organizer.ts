// ============================================================
// 阅览殿 · 书架整理面（INCR-522）
// 封面网格视图偏好 · 置顶 · 私密藏书 · 排序 · 进度环数据
// 纯本地：偏好/集合存明文 JSON，不触云
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { Book } from './types'

export type ShelfView = 'list' | 'grid'
export type ShelfSort = 'manual' | 'recent' | 'title' | 'progress'

export interface ShelfPrefs {
  /** 视图：列表 / 封面网格 */
  view: ShelfView
  /** 排序：默认 / 最近 / 书名 / 进度 */
  sort: ShelfSort
  /** 是否显示私密藏书（默认隐藏） */
  showPrivate: boolean
}

export const SHELF_ORGANIZER_KEYS = {
  prefs: 'hf:reading:shelf_prefs',
  pins: 'hf:reading:shelf_pins',
  private: 'hf:reading:shelf_private',
} as const

export const DEFAULT_SHELF_PREFS: ShelfPrefs = {
  view: 'list',
  sort: 'manual',
  showPrivate: false,
}

export const SHELF_SORT_META: Record<ShelfSort, string> = {
  manual: '默认',
  recent: '最近',
  title: '书名',
  progress: '进度',
}

const SHELF_VIEWS: ShelfView[] = ['list', 'grid']
const SHELF_SORTS: ShelfSort[] = ['manual', 'recent', 'title', 'progress']

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getKV<string>(key, '')
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 归一化视图偏好：非法值回落默认，字段缺失补齐 */
export function normalizeShelfPrefs(raw: unknown): ShelfPrefs {
  const o = raw && typeof raw === 'object' ? (raw as Partial<ShelfPrefs>) : {}
  return {
    view: SHELF_VIEWS.includes(o.view as ShelfView) ? (o.view as ShelfView) : DEFAULT_SHELF_PREFS.view,
    sort: SHELF_SORTS.includes(o.sort as ShelfSort) ? (o.sort as ShelfSort) : DEFAULT_SHELF_PREFS.sort,
    showPrivate: o.showPrivate === true,
  }
}

/** 归一化 id 列表：仅保留非空字符串并去重（保持首次出现顺序） */
export function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    if (typeof v === 'string' && v && !out.includes(v)) out.push(v)
  }
  return out
}

/** 阅读进度 0~1：已读恒为 1，其余按 当前页/总页 夹取 */
export function readingProgress(book: Book): number {
  if (book.status === 'finished') return 1
  const total = book.totalPages || 0
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, (book.currentPage || 0) / total))
}

/** 进度百分比（整数 0~100，供进度环与文案） */
export function progressPercent(book: Book): number {
  return Math.round(readingProgress(book) * 100)
}

/**
 * 排序：先按 sort 排（稳定），再把置顶书按置顶顺序提到最前。
 * 默认 sort='manual' 时保持传入顺序（仅置顶前移）。
 */
export function orderBooks(books: Book[], pinnedIds: string[], sort: ShelfSort): Book[] {
  const pinRank = (id: string): number => {
    const i = pinnedIds.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  const sorted = [...books]
  if (sort === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh'))
  } else if (sort === 'progress') {
    sorted.sort((a, b) => readingProgress(b) - readingProgress(a))
  } else if (sort === 'recent') {
    const recency = (b: Book): string => b.finishDate || b.startDate || ''
    sorted.sort((a, b) => recency(b).localeCompare(recency(a)))
  }
  const pinSet = new Set(pinnedIds)
  return sorted.sort((a, b) => {
    const pa = pinSet.has(a.id)
    const pb = pinSet.has(b.id)
    if (pa !== pb) return pa ? -1 : 1
    if (pa && pb) return pinRank(a.id) - pinRank(b.id)
    return 0
  })
}

export interface ShelfSections {
  /** 置顶区（按置顶顺序） */
  pinned: Book[]
  /** 其余（按排序） */
  normal: Book[]
  /** 因「显示私密」关闭而被隐藏的私密藏书数量 */
  hiddenPrivate: number
}

/** 分区：私密过滤 + 置顶前移，供网格与列表共用 */
export function shelfSections(
  books: Book[],
  opts: { pinnedIds: string[]; privateIds: string[]; showPrivate: boolean; sort: ShelfSort },
): ShelfSections {
  const privSet = new Set(opts.privateIds)
  const visible = opts.showPrivate ? books : books.filter((b) => !privSet.has(b.id))
  const hiddenPrivate = opts.showPrivate ? 0 : books.filter((b) => privSet.has(b.id)).length
  const ordered = orderBooks(visible, opts.pinnedIds, opts.sort)
  const pinSet = new Set(opts.pinnedIds)
  return {
    pinned: ordered.filter((b) => pinSet.has(b.id)),
    normal: ordered.filter((b) => !pinSet.has(b.id)),
    hiddenPrivate,
  }
}

export interface ShelfStats {
  total: number
  pinned: number
  privateCount: number
  finished: number
  reading: number
}

export function shelfStats(books: Book[], pinnedIds: string[], privateIds: string[]): ShelfStats {
  const pinSet = new Set(pinnedIds)
  const privSet = new Set(privateIds)
  return {
    total: books.length,
    pinned: books.filter((b) => pinSet.has(b.id)).length,
    privateCount: books.filter((b) => privSet.has(b.id)).length,
    finished: books.filter((b) => b.status === 'finished').length,
    reading: books.filter((b) => b.status === 'reading').length,
  }
}

// ---- 模块级单例（偏好 / 置顶 / 私密集合） ----

const prefs = ref<ShelfPrefs>(normalizeShelfPrefs(loadJSON(SHELF_ORGANIZER_KEYS.prefs, null)))
const pinned = ref<string[]>(normalizeIdList(loadJSON(SHELF_ORGANIZER_KEYS.pins, [])))
const privateIds = ref<string[]>(normalizeIdList(loadJSON(SHELF_ORGANIZER_KEYS.private, [])))

function persistPrefs(): void {
  storage.setKV(SHELF_ORGANIZER_KEYS.prefs, JSON.stringify(prefs.value))
}
function persistPins(): void {
  storage.setKV(SHELF_ORGANIZER_KEYS.pins, JSON.stringify(pinned.value))
}
function persistPrivate(): void {
  storage.setKV(SHELF_ORGANIZER_KEYS.private, JSON.stringify(privateIds.value))
}

/** 从存储重载（供跨会话/多窗口同步或测试隔离） */
export function reloadShelfOrganizer(): void {
  prefs.value = normalizeShelfPrefs(loadJSON(SHELF_ORGANIZER_KEYS.prefs, null))
  pinned.value = normalizeIdList(loadJSON(SHELF_ORGANIZER_KEYS.pins, []))
  privateIds.value = normalizeIdList(loadJSON(SHELF_ORGANIZER_KEYS.private, []))
}

export function useShelfOrganizer() {
  function setPref<K extends keyof ShelfPrefs>(key: K, value: ShelfPrefs[K]): void {
    prefs.value = { ...prefs.value, [key]: value }
    persistPrefs()
  }

  const isPinned = (id: string): boolean => pinned.value.includes(id)
  const isPrivate = (id: string): boolean => privateIds.value.includes(id)

  function togglePin(id: string): void {
    pinned.value = isPinned(id) ? pinned.value.filter((x) => x !== id) : [...pinned.value, id]
    persistPins()
  }

  function togglePrivate(id: string): void {
    privateIds.value = isPrivate(id) ? privateIds.value.filter((x) => x !== id) : [...privateIds.value, id]
    persistPrivate()
  }

  function reset(): void {
    prefs.value = { ...DEFAULT_SHELF_PREFS }
    pinned.value = []
    privateIds.value = []
    persistPrefs()
    persistPins()
    persistPrivate()
  }

  return { prefs, pinned, privateIds, setPref, isPinned, isPrivate, togglePin, togglePrivate, reset }
}
