// ============================================================
// 笔记 · 状态管理
// 增强版：搜索 API、归档/恢复、最近笔记、软删除
// ============================================================

import { ref, computed } from 'vue'
import type { Note } from '../../types'
import type { StickyNote, NoteDisplayMode, NoteViewMode } from './types'
import { STICKY_COLORS } from './types'
import { storage } from '../../engine/storage'
import { notes, loadNotesState, persistNotesState } from '../../engine/storage/notes-state'
import { syncLinksForNote, removeLinksForNote } from '../study/note-links'
import {
  createKnowledgeRing,
  recordReview,
  recordReviewGrade,
  checkForget,
  isForgotten,
  needsReview,
  computeRingStats,
  type KnowledgeRing,
  type ReviewGrade,
  type RingStats,
} from './knowledge-ring'

export type { StickyNote, NoteDisplayMode, NoteViewMode, KnowledgeRing, RingStats }
export { STICKY_COLORS } from './types'

// ---- P16-8 全文搜索 + 笔记统计 + 知识图谱桥接 ----
export { useFulltextSearch } from './fulltext-search'
export type {
  InvertedIndexEntry,
  SearchResult,
  MatchDetail,
  TextHighlight,
  SearchStats,
  SearchSuggestion,
  SearchOptions,
} from './fulltext-search'

export { useNoteAnalytics } from './note-analytics'
export type {
  NoteHealthScore,
  WritingStats,
  LengthBucket,
  TimeTrendStats,
  DailyStats,
  WeeklyStats,
  MonthlyStats,
  TagAnalysis,
  TagFrequency,
  TagCooccurrence,
  TagCluster,
  LifecycleAnalysis,
  ContentQualityAnalysis,
  NoteAnalyticsReport,
  HealthSummary,
} from './note-analytics'

export { useKnowledgeBridge } from './knowledge-bridge'
export type {
  RelatedRecommendation,
  RecommendationReason,
  KnowledgeDiscovery,
  KnowledgePath,
  NoteGraphContext,
  BridgeStats,
} from './knowledge-bridge'

// ---- P19-5 笔记模板 + Markdown 导出 + 版本历史 ----
export { useNoteTemplates } from './note-templates'
export type {
  NoteTemplate,
  TemplateCategory,
  TemplateField,
  TemplatePreview,
} from './note-templates'
export { TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_ICONS } from './note-templates'

export { useMarkdownExport } from './markdown-export'
export type {
  MarkdownExportOptions,
  ExportResult,
  ExportFormat,
  BatchExportFilter,
} from './markdown-export'

export { useVersionHistory } from './version-history'
export type {
  NoteVersion,
  VersionDiff,
  VersionSnapshot,
  DiffType,
  VersionHistoryConfig,
  VersionStats,
} from './version-history'

// ---- P19-5 思维导图 ----
export { useMindMap, NODE_COLORS, MIND_MAP_STORAGE_KEYS } from './mind-map'
export type { MindNode, MindMap, NodeConnection, MindMapStats } from './mind-map'

// ---- 存储键 ----
const STICKY_KV_KEY = 'hf:note_sticky_state'
const RING_KV_KEY = 'hf:note_knowledge_rings'

// ---- 内部状态 ----
// 全局笔记单一状态源（与 study 模块共享，避免双写互相覆盖）
const stickyNotes = ref<StickyNote[]>(loadStickyState())
const knowledgeRings = ref<KnowledgeRing[]>(loadRings())

function loadStickyState(): StickyNote[] {
  try {
    return storage.getKV(STICKY_KV_KEY, [])
  } catch {
    return []
  }
}

function saveStickyState() {
  storage.setKV(STICKY_KV_KEY, stickyNotes.value)
}

function loadRings(): KnowledgeRing[] {
  try { return storage.getKV(RING_KV_KEY, []) } catch { return [] }
}

function saveRings() {
  storage.setKV(RING_KV_KEY, knowledgeRings.value)
}

/** 同步基础笔记与便签扩展状态：删除已移除的便签，同步基础数据 */
function syncStickyWithNotes() {
  const noteIds = new Set(notes.value.map(n => n.id))
  stickyNotes.value = stickyNotes.value.filter(s => noteIds.has(s.id))
  // 同步基础字段
  for (const s of stickyNotes.value) {
    const base = notes.value.find(n => n.id === s.id)
    if (base) {
      s.title = base.title
      s.content = base.content
      s.tags = base.tags
      s.updatedAt = base.updatedAt
    }
  }
  saveStickyState()
}

// ---- 暴露的 composable ----

export function useNote() {
  function load() {
    loadNotesState()
    stickyNotes.value = loadStickyState()
    knowledgeRings.value = loadRings()
    syncStickyWithNotes()
  }

  // ---- 基础 CRUD ----

  /** 所有笔记（不含软删除） */
  const allNotes = computed(() =>
    notes.value.filter(n => !n.deletedAt)
  )

  /** 活跃的浮动便签（不含软删除和 board 模式） */
  const allStickyNotes = computed(() =>
    stickyNotes.value
      .filter(s => {
        const base = notes.value.find(n => n.id === s.id)
        return s.displayMode !== 'board' && base && !base.deletedAt
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  )

  /** 面板模式笔记 */
  const boardNotes = computed(() =>
    stickyNotes.value
      .filter(s => {
        const base = notes.value.find(n => n.id === s.id)
        return s.displayMode === 'board' && base && !base.deletedAt
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  )

  /** 笔记总数（不含软删除） */
  const noteCount = computed(() => notes.value.filter(n => !n.deletedAt).length)

  /** 已归档笔记 */
  const archivedNotes = computed(() =>
    notes.value.filter(n => n.archived && !n.deletedAt)
  )

  /** 已删除笔记（回收站） */
  const deletedNotes = computed(() =>
    notes.value.filter(n => n.deletedAt)
  )

  function create(title: string, content: string, tags: string[] = []): StickyNote {
    const now = new Date().toISOString()
    const note: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      content: content.trim(),
      tags,
      createdAt: now,
      updatedAt: now,
    }

    // 随机位置
    const x = 10 + Math.random() * 60
    const y = 10 + Math.random() * 50
    const color = STICKY_COLORS[notes.value.length % STICKY_COLORS.length]

    const sticky: StickyNote = {
      ...note,
      stickyX: x,
      stickyY: y,
      displayMode: 'sticky',
      color,
      pinned: false,
    }

    notes.value.push(note)
    persistNotesState()
    // 与 study 语义一致：创建即解析 [[双链]]，保证双链面板/归档不断链
    syncLinksForNote(note.id, note.content, notes.value)
    // 创建即入复习：自动建立 Ebbinghaus 年轮（幂等），次日自然进入待复习队列
    initRing(note.id)

    stickyNotes.value.push(sticky)
    saveStickyState()

    return sticky
  }

  function update(id: string, data: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'archived'>>) {
    const note = notes.value.find(n => n.id === id)
    if (!note) return
    if (data.title !== undefined) note.title = data.title
    if (data.content !== undefined) note.content = data.content
    if (data.tags !== undefined) note.tags = data.tags
    if (data.archived !== undefined) note.archived = data.archived
    note.updatedAt = new Date().toISOString()
    persistNotesState()
    if (data.content !== undefined) syncLinksForNote(id, data.content, notes.value)
    syncStickyWithNotes()
  }

  /** 归档（仅隐藏，保留双链；与 study.archive 语义一致） */
  function archive(id: string) {
    update(id, { archived: true })
  }

  /** 取消归档 */
  function unarchive(id: string) {
    update(id, { archived: false })
  }

  /** 软删除（移入回收站） */
  function softRemove(id: string) {
    const note = notes.value.find(n => n.id === id)
    if (!note) return
    note.deletedAt = new Date().toISOString()
    note.updatedAt = note.deletedAt
    persistNotesState()
    // 与 study 路径行为一致：软删也清链（避免回收站里的笔记残留在反链面板）
    removeLinksForNote(id)
    // 移除便签显示状态
    stickyNotes.value = stickyNotes.value.filter(s => s.id !== id)
    saveStickyState()
  }

  /** 恢复软删除的笔记 */
  function restore(id: string) {
    const note = notes.value.find(n => n.id === id)
    if (!note) return
    delete note.deletedAt
    note.updatedAt = new Date().toISOString()
    persistNotesState()
    // 软删已清链，恢复时按正文重建，保持双链面板自洽
    syncLinksForNote(id, note.content, notes.value)
  }

  /** 永久删除 */
  function hardRemove(id: string) {
    notes.value = notes.value.filter(n => n.id !== id)
    stickyNotes.value = stickyNotes.value.filter(s => s.id !== id)
    persistNotesState()
    saveStickyState()
    // 真删才清链：归档只隐藏不断链，永久删除才清理其出入链
    removeLinksForNote(id)
  }

  /** 清空回收站 */
  function clearTrash() {
    const deletedIds = new Set(notes.value.filter(n => n.deletedAt).map(n => n.id))
    notes.value = notes.value.filter(n => !n.deletedAt)
    stickyNotes.value = stickyNotes.value.filter(s => !deletedIds.has(s.id))
    persistNotesState()
    saveStickyState()
  }

  // ---- 搜索 ----

  /** 搜索笔记（标题 + 内容 + 标签） */
  function searchNotes(query: string, limit = storage.getConfig().display.searchResultLimit): Note[] {
    if (!query.trim()) return allNotes.value.slice(0, limit)
    const q = query.toLowerCase()
    return notes.value
      .filter(n => {
        if (n.deletedAt) return false
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
        )
      })
      .slice(0, limit)
  }

  /** 最近更新的笔记 */
  function getRecentNotes(count = storage.getConfig().display.statsWindowDays): Note[] {
    return notes.value
      .filter(n => !n.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, count)
  }

  /** 按标签筛选笔记 */
  function getNotesByTag(tag: string): Note[] {
    return notes.value.filter(n => !n.deletedAt && n.tags.includes(tag))
  }

  // ---- 便签状态管理 ----

  function updateStickyPosition(id: string, x: number, y: number) {
    const s = stickyNotes.value.find(s => s.id === id)
    if (!s) return
    s.stickyX = Math.max(0, Math.min(100, x))
    s.stickyY = Math.max(0, Math.min(100, y))
    saveStickyState()
  }

  function updateStickyMode(id: string, mode: NoteDisplayMode) {
    const s = stickyNotes.value.find(s => s.id === id)
    if (!s) return
    s.displayMode = mode
    saveStickyState()
  }

  function togglePin(id: string) {
    const s = stickyNotes.value.find(s => s.id === id)
    if (!s) return
    s.pinned = !s.pinned
    saveStickyState()
  }

  function updateStickyColor(id: string, color: string) {
    const s = stickyNotes.value.find(s => s.id === id)
    if (!s) return
    s.color = color
    saveStickyState()
  }

  /** 把笔记移到便签模式（浮动显示） */
  function moveToSticky(id: string) {
    const s = stickyNotes.value.find(s => s.id === id)
    if (!s) return
    // 如果是新创建的笔记还没有便签状态，创建一个
    if (!s) {
      const note = notes.value.find(n => n.id === id)
      if (!note) return
      const x = 10 + Math.random() * 60
      const y = 10 + Math.random() * 50
      const color = STICKY_COLORS[notes.value.length % STICKY_COLORS.length]
      stickyNotes.value.push({
        ...note,
        stickyX: x,
        stickyY: y,
        displayMode: 'sticky',
        color,
        pinned: false,
      })
    } else {
      s.displayMode = 'sticky'
    }
    saveStickyState()
  }

  /** 把笔记移到面板模式 */
  function moveToBoard(id: string) {
    const s = stickyNotes.value.find(s => s.id === id)
    if (!s) return
    s.displayMode = 'board'
    saveStickyState()
  }

  /** 获取所有笔记（包括无便签状态的基础笔记） */
  function getNoteById(id: string): Note | undefined {
    return notes.value.find(n => n.id === id)
  }

  function getStickyById(id: string): StickyNote | undefined {
    return stickyNotes.value.find(s => s.id === id)
  }

  // ---- 知识年轮管理 ----

  /** 为笔记创建知识年轮 */
  function initRing(noteId: string): KnowledgeRing | undefined {
    const note = notes.value.find(n => n.id === noteId)
    if (!note) return undefined
    const existing = knowledgeRings.value.find(r => r.noteId === noteId)
    if (existing) return existing
    const ring = createKnowledgeRing(note)
    knowledgeRings.value.push(ring)
    saveRings()
    return ring
  }

  /** 记录一次回顾 */
  function reviewRing(noteId: string): KnowledgeRing | undefined {
    const ring = knowledgeRings.value.find(r => r.noteId === noteId)
    if (!ring) return undefined
    const updated = recordReview(ring)
    const idx = knowledgeRings.value.indexOf(ring)
    knowledgeRings.value[idx] = updated
    saveRings()
    return updated
  }

  /** 记录一次三选一回顾（认识 / 模糊 / 忘记） */
  function reviewRingGrade(noteId: string, grade: ReviewGrade): KnowledgeRing | undefined {
    const ring = knowledgeRings.value.find(r => r.noteId === noteId)
    if (!ring) return undefined
    const updated = recordReviewGrade(ring, grade)
    const idx = knowledgeRings.value.indexOf(ring)
    knowledgeRings.value[idx] = updated
    knowledgeRings.value = [...knowledgeRings.value]
    saveRings()
    return updated
  }

  /** 检查所有年轮遗忘状态 */
  function checkAllRings(): void {
    let changed = false
    for (let i = 0; i < knowledgeRings.value.length; i++) {
      if (isForgotten(knowledgeRings.value[i])) {
        knowledgeRings.value[i] = checkForget(knowledgeRings.value[i])
        changed = true
      }
    }
    if (changed) saveRings()
  }

  /** 获取需要回顾的年轮列表 */
  const dueRings = computed(() =>
    knowledgeRings.value.filter(r => needsReview(r))
  )

  /** 获取已遗忘的年轮列表 */
  const forgottenRings = computed(() =>
    knowledgeRings.value.filter(r => isForgotten(r))
  )

  /** 年轮统计 */
  const ringStats = computed(() => computeRingStats(knowledgeRings.value))

  /** 获取笔记的年轮 */
  function getRing(noteId: string): KnowledgeRing | undefined {
    return knowledgeRings.value.find(r => r.noteId === noteId)
  }

  /** 删除年轮 */
  function removeRing(noteId: string): void {
    knowledgeRings.value = knowledgeRings.value.filter(r => r.noteId !== noteId)
    saveRings()
  }

  return {
    // 状态
    allNotes,
    allStickyNotes,
    boardNotes,
    noteCount,
    archivedNotes,
    deletedNotes,

    // CRUD
    create,
    update,
    archive,
    unarchive,
    remove: softRemove,
    hardRemove,
    restore,
    clearTrash,

    // 搜索 / 查询
    searchNotes,
    getRecentNotes,
    getNotesByTag,

    // 便签管理
    updateStickyPosition,
    updateStickyMode,
    togglePin,
    updateStickyColor,
    moveToSticky,
    moveToBoard,

    // 查询
    getNoteById,
    getStickyById,

    // 知识年轮
    knowledgeRings,
    dueRings,
    forgottenRings,
    ringStats,
    initRing,
    reviewRing,
    reviewRingGrade,
    checkAllRings,
    getRing,
    removeRing,

    // 加载
    load,
  }
}

/** 单例模式（与 goal 模块一致） */
let _instance: ReturnType<typeof useNote> | null = null

export function getNoteStore() {
  if (!_instance) {
    _instance = useNote()
    _instance.load()
  }
  return _instance
}