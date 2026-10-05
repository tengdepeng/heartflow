// ============================================================
// 逐日心锚 · 手札日记数据层
// ------------------------------------------------------------
// 将裸的 storage.getKV/setKV('anchor_journals') 调用下沉为
// 模块级单例 ref + useAnchorJournals 组合式函数，视图不再直接触碰存储键。
// 原存储键 'anchor_journals' 必须保持不变。
// 注意：本文件名刻意用复数 anchor-journals，以避开已存在的
//       anchor-journal.ts（useAnchorJournal，接口含 type 字段，定义不同）。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

export const ANCHOR_JOURNALS_KEY = 'anchor_journals'

/** 照片手札引用：指向照片日记某日某张图（与 PhotoEntry.images/thumbs 下标一致） */
export interface PhotoRef {
  /** 照片日记归属日期（YYYY-MM-DD），与 PhotoEntry.date 同口径 */
  date: string
  /** 该日照片日记中的图序（0 起） */
  index: number
}

export interface AnchorJournal {
  anchorId: string
  content: string
  createdAt: string
  updatedAt: string
  /** 标题（可选） */
  title?: string
  /** 情绪标记（可选） */
  mood?: string
  /** 关联的照片日记引用（照片进手札）；可挂多张 */
  photoRef?: PhotoRef[]
}

// ---- 模块级单例 ref ----
const journals = ref<AnchorJournal[]>([])

function load() {
  journals.value = storage.getKV<AnchorJournal[]>(ANCHOR_JOURNALS_KEY, [])
}

function save() {
  storage.setKV(ANCHOR_JOURNALS_KEY, journals.value)
}

export function useAnchorJournals() {
  return {
    items: journals,
    load,
    save,
  }
}

// ---- 手札日记查询（纯函数） ----

/** 取 ISO 时间戳的本地日历日键（YYYY-MM-DD） */
export function journalDateKey(iso: string): string {
  return getLocalDateKey(new Date(iso))
}

export interface JournalFilter {
  mood?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
}

/** 组合搜索：情绪/关键词（标题或内容，大小写不敏感）/日期范围，条件为「且」 */
export function filterJournals(items: AnchorJournal[], filter: JournalFilter): AnchorJournal[] {
  return items.filter((j) => {
    if (filter.mood && j.mood !== filter.mood) return false
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase()
      const hay = `${j.title ?? ''} ${j.content}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    if (filter.dateFrom && journalDateKey(j.createdAt) < filter.dateFrom) return false
    if (filter.dateTo && journalDateKey(j.createdAt) > filter.dateTo) return false
    return true
  })
}

/** 那年今日：匹配往年同月同日，排除今年，按时间倒序 */
export function journalsOnThisDay(items: AnchorJournal[], now: Date): AnchorJournal[] {
  const m = now.getMonth()
  const d = now.getDate()
  const year = now.getFullYear()
  return items
    .filter((j) => {
      const t = new Date(j.createdAt)
      if (Number.isNaN(t.getTime())) return false
      return t.getFullYear() !== year && t.getMonth() === m && t.getDate() === d
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 情绪聚合：统计各情绪出现次数（无情绪不计） */
export function journalMoodStats(items: AnchorJournal[]): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const j of items) {
    if (!j.mood) continue
    stats[j.mood] = (stats[j.mood] ?? 0) + 1
  }
  return stats
}
