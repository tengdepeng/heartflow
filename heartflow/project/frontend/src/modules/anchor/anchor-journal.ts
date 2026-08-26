// ============================================================
// 逐日心锚 · 手札系统
// 锚点关联的日记/复盘/光丝连接
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { Anchor } from './types'

// ---- 手札类型 ----

export interface AnchorJournal {
  id: string
  /** 关联锚点 ID */
  anchorId: string
  /** 手札标题 */
  title: string
  /** 手札内容 */
  content: string
  /** 手札类型 */
  type: 'diary' | 'review' | 'insight' | 'gratitude'
  /** 情绪标签 */
  mood?: string
  /** 关联的其他锚点 ID（光丝连接） */
  linkedAnchorIds: string[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

export type JournalType = AnchorJournal['type']

export const JOURNAL_TYPE_LABELS: Record<JournalType, string> = {
  diary: '日记',
  review: '复盘',
  insight: '洞见',
  gratitude: '感恩',
}

export const JOURNAL_TYPE_ICONS: Record<JournalType, string> = {
  diary: '📝',
  review: '🔍',
  insight: '💡',
  gratitude: '🙏',
}

// ---- 年尺度聚合 ----

export interface YearScaleSummary {
  /** 年份 */
  year: number
  /** 月份摘要 */
  months: MonthSummary[]
  /** 总锚点数 */
  totalAnchors: number
  /** 完成率 */
  completionRate: number
  /** 高频标签 */
  topTags: { tag: string; count: number }[]
  /** 高频分类 */
  topCategories: { category: string; count: number }[]
}

export interface MonthSummary {
  /** 月份 (1-12) */
  month: number
  /** 锚点总数 */
  anchorCount: number
  /** 完成数 */
  doneCount: number
  /** 手札数 */
  journalCount: number
  /** 代表情绪 */
  dominantMood?: string
}

// ---- 光丝连接 ----

export interface LightThread {
  /** 源锚点 ID */
  sourceId: string
  /** 目标锚点 ID */
  targetId: string
  /** 连接强度 (0-1) */
  strength: number
  /** 连接原因 */
  reason: string
}

// ---- 存储键 ----

const STORAGE_KEY = 'hf:anchor_journals'

// ---- 手札管理器 ----

function loadJournals(): AnchorJournal[] {
  return storage.getKV<AnchorJournal[]>(STORAGE_KEY, [])
}

function saveJournals(journals: AnchorJournal[]): void {
  storage.setKV(STORAGE_KEY, journals)
}

const journals = ref<AnchorJournal[]>(loadJournals())

export function useAnchorJournal() {
  function load(): void {
    journals.value = loadJournals()
  }

  /** 获取锚点的所有手札 */
  function getByAnchor(anchorId: string): AnchorJournal[] {
    return journals.value
      .filter(j => j.anchorId === anchorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** 获取所有手札 */
  function getAll(): AnchorJournal[] {
    return [...journals.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** 获取指定类型的手札 */
  function getByType(type: JournalType): AnchorJournal[] {
    return journals.value
      .filter(j => j.type === type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** 获取日期范围内的手札 */
  function getByDateRange(start: string, end: string): AnchorJournal[] {
    return journals.value
      .filter(j => j.createdAt >= start && j.createdAt <= end)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** 创建手札 */
  function create(params: {
    anchorId: string
    title: string
    content: string
    type?: JournalType
    mood?: string
    linkedAnchorIds?: string[]
  }): AnchorJournal {
    const now = new Date().toISOString()
    const journal: AnchorJournal = {
      id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      anchorId: params.anchorId,
      title: params.title.trim(),
      content: params.content.trim(),
      type: params.type || 'diary',
      mood: params.mood,
      linkedAnchorIds: params.linkedAnchorIds || [],
      createdAt: now,
      updatedAt: now,
    }
    journals.value.push(journal)
    saveJournals(journals.value)
    return journal
  }

  /** 更新手札 */
  function update(id: string, updates: Partial<Pick<AnchorJournal, 'title' | 'content' | 'type' | 'mood'>>): boolean {
    const j = journals.value.find(j => j.id === id)
    if (!j) return false
    Object.assign(j, updates, { updatedAt: new Date().toISOString() })
    saveJournals(journals.value)
    return true
  }

  /** 删除手札 */
  function remove(id: string): boolean {
    const idx = journals.value.findIndex(j => j.id === id)
    if (idx === -1) return false
    journals.value.splice(idx, 1)
    saveJournals(journals.value)
    return true
  }

  /** 添加光丝连接 */
  function addLink(journalId: string, anchorId: string): boolean {
    const j = journals.value.find(j => j.id === journalId)
    if (!j) return false
    if (j.linkedAnchorIds.includes(anchorId)) return true
    j.linkedAnchorIds.push(anchorId)
    j.updatedAt = new Date().toISOString()
    saveJournals(journals.value)
    return true
  }

  /** 移除光丝连接 */
  function removeLink(journalId: string, anchorId: string): boolean {
    const j = journals.value.find(j => j.id === journalId)
    if (!j) return false
    j.linkedAnchorIds = j.linkedAnchorIds.filter(id => id !== anchorId)
    j.updatedAt = new Date().toISOString()
    saveJournals(journals.value)
    return true
  }

  // ---- 光丝连接计算 ----

  /**
   * 计算锚点之间的光丝连接强度
   * 蓝图：基于共享标签、手札引用、时间接近度
   */
  function computeLightThreads(
    anchors: Anchor[],
    journals: AnchorJournal[],
  ): LightThread[] {
    const threads: LightThread[] = []
    const processed = new Set<string>()

    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        const a = anchors[i]
        const b = anchors[j]
        const pairKey = `${a.id}|${b.id}`
        if (processed.has(pairKey)) continue
        processed.add(pairKey)

        let strength = 0
        const reasons: string[] = []

        // 1. 共享标签强度
        const sharedTags = (a.tags || []).filter(t => (b.tags || []).includes(t))
        if (sharedTags.length > 0) {
          strength += sharedTags.length * 0.2
          reasons.push(`共享标签: ${sharedTags.join(', ')}`)
        }

        // 2. 共享分类
        if (a.category && b.category && a.category === b.category) {
          strength += 0.3
          reasons.push(`同分类: ${a.category}`)
        }

        // 3. 手札引用连接
        const aJournals = journals.filter(j => j.anchorId === a.id)
        const bJournals = journals.filter(j => j.anchorId === b.id)

        // A 的手札是否引用了 B
        const aRefsB = aJournals.some(j => j.linkedAnchorIds.includes(b.id))
        const bRefsA = bJournals.some(j => j.linkedAnchorIds.includes(a.id))
        if (aRefsB || bRefsA) {
          strength += 0.4
          reasons.push('手札互引')
        }

        // 4. 时间接近度（同一天）
        if (a.targetDate === b.targetDate) {
          strength += 0.2
          reasons.push('同日锚点')
        }

        strength = Math.min(strength, 1.0)

        if (strength > 0) {
          threads.push({
            sourceId: a.id,
            targetId: b.id,
            strength,
            reason: reasons.join('; '),
          })
        }
      }
    }

    return threads.sort((a, b) => b.strength - a.strength)
  }

  // ---- 年尺度聚合 ----

  /**
   * 生成年尺度摘要
   * 蓝图：按年聚合锚点数据，包含月度分布、标签趋势
   */
  function getYearScaleSummary(
    year: number,
    anchors: Anchor[],
    journals: AnchorJournal[],
  ): YearScaleSummary {
    const months: MonthSummary[] = []
    let totalAnchors = 0
    let doneCount = 0
    const tagCounts: Record<string, number> = {}
    const catCounts: Record<string, number> = {}

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`
      const monthAnchors = anchors.filter(a => a.targetDate.startsWith(monthStr))
      const monthJournals = journals.filter(j => j.createdAt.startsWith(monthStr))
      const monthDone = monthAnchors.filter(a => a.done).length

      // 统计该月手札的情绪
      const moodCounts: Record<string, number> = {}
      for (const j of monthJournals) {
        if (j.mood) {
          moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1
        }
      }
      const dominantMood = Object.entries(moodCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0]

      months.push({
        month: m,
        anchorCount: monthAnchors.length,
        doneCount: monthDone,
        journalCount: monthJournals.length,
        dominantMood,
      })

      totalAnchors += monthAnchors.length
      doneCount += monthDone

      // 聚合标签
      for (const a of monthAnchors) {
        if (a.tags) {
          for (const t of a.tags) {
            tagCounts[t] = (tagCounts[t] || 0) + 1
          }
        }
        if (a.category) {
          catCounts[a.category] = (catCounts[a.category] || 0) + 1
        }
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    const topCategories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    return {
      year,
      months,
      totalAnchors,
      completionRate: totalAnchors > 0 ? Math.round((doneCount / totalAnchors) * 100) : 0,
      topTags,
      topCategories,
    }
  }

  return {
    journals,
    load,
    getByAnchor,
    getAll,
    getByType,
    getByDateRange,
    create,
    update,
    remove,
    addLink,
    removeLink,
    computeLightThreads,
    getYearScaleSummary,
  }
}