// ============================================================
// 思绪书房 · 信笺（模块九 图纸 C区）
// 蓝图：聊天信笺——letter_bundle_id/correspondent/message_count/
//       date_range/messages/emotional_imprint，按人分束展示。
// 本模块为纯函数 + 轻量持久化，只做"陈列与分束"，不评判内容。
// 遵循宪法：本地私有、默认关闭；导入聊天记录在本地解析，绝不上传。
// ============================================================

import { ref } from 'vue'
import { getKV, setKV } from '../../engine/storage/kv'

/** 单条消息 */
export interface LetterMessage {
  ts: string
  /** 发送者标识（对应分束人） */
  from: string
  text: string
}

/** 一束聊天信笺（按信对应人分束） */
export interface LetterBundle {
  /** 束 id */
  id: string
  /** 信的对象（correspondent） */
  correspondent: string
  importedAt: string
  /** 消息集合（按时间升序） */
  messages: LetterMessage[]
}

const LETTERS_KEY = 'hf:study_letters'
export const letters = ref<LetterBundle[]>(loadFromStorage())

function loadFromStorage(): LetterBundle[] {
  try {
    return getKV<LetterBundle[]>(LETTERS_KEY, [])
  } catch {
    return []
  }
}

function persist() {
  setKV(LETTERS_KEY, letters.value)
}

/** 测试隔离用：清空内存引用 */
export function resetLettersState() {
  letters.value = []
}

// ---- 纯函数：分束与统计 ----

export interface LetterBundleStat {
  total: number
  messageCount: number
  dateRangeStart: string | null
  dateRangeEnd: string | null
}

/** 单束消息数 */
export function bundleMessageCount(b: LetterBundle): number {
  return b.messages.length
}

/** 单束时间跨度（首尾） */
export function bundleDateRange(b: LetterBundle): { start: string; end: string } | null {
  if (b.messages.length === 0) return null
  const times = b.messages.map(m => m.ts).sort()
  return { start: times[0], end: times[times.length - 1] }
}

/** 全部信笺统计 */
export function lettersStat(bundles: LetterBundle[]): LetterBundleStat {
  let total = 0
  let start: string | null = null
  let end: string | null = null
  for (const b of bundles) {
    total += b.messages.length
    for (const m of b.messages) {
      if (start === null || m.ts < start) start = m.ts
      if (end === null || m.ts > end) end = m.ts
    }
  }
  return { total, messageCount: bundles.length, dateRangeStart: start, dateRangeEnd: end }
}

/** 按信对象名分组（同级去重） */
export function distinctCorrespondents(bundles: LetterBundle[]): string[] {
  return [...new Set(bundles.map(b => b.correspondent))].sort((a, b) => a.localeCompare(b, 'zh'))
}

/** 检索：按信对象或消息文本关键词 */
export function searchLetterBundles(bundles: LetterBundle[], query: string): LetterBundle[] {
  const q = query.trim().toLowerCase()
  if (!q) return bundles
  return bundles.filter(
    b =>
      b.correspondent.toLowerCase().includes(q) ||
      b.messages.some(m => m.text.toLowerCase().includes(q)),
  )
}

// ---- 状态方法（本地持久化） ----

export function useLetters() {
  function importBundle(
    correspondent: string,
    messages: LetterMessage[],
  ): LetterBundle | null {
    const name = correspondent.trim()
    const list = messages
      .filter(m => m.text.trim())
      .sort((a, b) => a.ts.localeCompare(b.ts))
    if (!name || list.length === 0) return null
    const bundle: LetterBundle = {
      id: `letter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      correspondent: name,
      importedAt: new Date().toISOString(),
      messages: list,
    }
    // 同一对象的新导入：覆盖旧束（按人分束，最新一次为准）
    const idx = letters.value.findIndex(b => b.correspondent === name)
    if (idx !== -1) letters.value[idx] = bundle
    else letters.value.push(bundle)
    persist()
    return bundle
  }

  function removeBundle(id: string) {
    letters.value = letters.value.filter(b => b.id !== id)
    persist()
  }

  return { letters, importBundle, removeBundle }
}

// 模块初始化时加载一次
letters.value = loadFromStorage()