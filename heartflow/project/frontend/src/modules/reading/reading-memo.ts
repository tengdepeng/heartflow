// ============================================================
// 阅览殿 · 读书便签（轻量随手记）
// 与 challenges.ts 的 useReadingNotes（书评/批注，键 hf:reading:notes）区分：
// 便签是阅读时随手记的短 memo，可关联到当前打开的书目，但不走书评结构。
// 本地私有：存于 hf:reading:memos，不触云。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 一条读书便签 */
export interface ReadingMemo {
  id: string
  /** 关联书目 id（来自书架）；随手记可不关联 */
  bookId?: string | null
  /** 关联书目标题（冗余存储，便于无书时也显示来源） */
  bookTitle?: string
  text: string
  createdAt: string
  updatedAt: string
}

const MEMO_KEY = 'hf:reading:memos'

function generateId(): string {
  return `memo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function loadMemos(): ReadingMemo[] {
  try {
    const raw = JSON.parse(storage.getKV<string>(MEMO_KEY, '[]'))
    return Array.isArray(raw)
      ? raw.filter((m): m is ReadingMemo => !!m && typeof m === 'object' && typeof m.id === 'string')
      : []
  } catch {
    return []
  }
}

const memos = ref<ReadingMemo[]>([])

export function useReadingMemos() {
  // 每次访问都从存储重新同步，保证与持久化状态一致
  memos.value = loadMemos()

  function save() {
    storage.setKV(MEMO_KEY, JSON.stringify(memos.value))
  }

  /** 新增一条便签；text 为空直接忽略 */
  function addMemo(text: string, bookId?: string | null, bookTitle?: string): ReadingMemo | null {
    const trimmed = text.trim()
    if (!trimmed) return null
    const now = new Date().toISOString()
    const memo: ReadingMemo = {
      id: generateId(),
      bookId: bookId || null,
      bookTitle: bookTitle || undefined,
      text: trimmed,
      createdAt: now,
      updatedAt: now,
    }
    memos.value = [memo, ...memos.value]
    save()
    return memo
  }

  function updateMemo(id: string, text: string) {
    const m = memos.value.find(x => x.id === id)
    if (!m) return
    m.text = text.trim()
    m.updatedAt = new Date().toISOString()
    memos.value = [...memos.value]
    save()
  }

  function removeMemo(id: string) {
    memos.value = memos.value.filter(x => x.id !== id)
    save()
  }

  /** 某书的全部便签（bookId 空时返回 []） */
  function memosForBook(bookId?: string | null): ReadingMemo[] {
    if (!bookId) return []
    return memos.value.filter(m => m.bookId === bookId)
  }

  return { memos, addMemo, updateMemo, removeMemo, memosForBook }
}
