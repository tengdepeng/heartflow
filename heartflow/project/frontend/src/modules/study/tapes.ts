// ============================================================
// 思绪书房 · 通话磁带（模块九 图纸 D区）
// 蓝图：通话磁带——tape_id/title/duration_seconds/participants/
//       transcript/file_path，老式磁带盒式排列。
// 本模块为纯函数 + 轻量持久化，只陈列不评判，接受 now 保证时间可测。
// 遵循宪法：本地私有、默认关闭；导入音频在本地处理，绝不上传。
// ============================================================

import { ref } from 'vue'
import { getKV, setKV } from '../../engine/storage/kv'

/** 一盘通话磁带 */
export interface Tape {
  id: string
  title: string
  participants: string[]
  durationSeconds: number
  importDate: string
  /** 转录文本（本地） */
  transcript: string
  /** 本地音频文件路径（可能有） */
  filePath?: string
}

const TAPES_KEY = 'hf:study_tapes'
export const tapes = ref<Tape[]>(loadFromStorage())

function loadFromStorage(): Tape[] {
  try {
    return getKV<Tape[]>(TAPES_KEY, [])
  } catch {
    return []
  }
}

function persist() {
  setKV(TAPES_KEY, tapes.value)
}

// ---- 纯函数 ----

/** 格式化时长 sec → mm:ss */
export function formatTapeDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}′${String(r).padStart(2, '0')}″`
}

/** 全部磁带总时长（秒） */
export function totalTapeDuration(list: Tape[]): number {
  return list.reduce((s, t) => s + (t.durationSeconds || 0), 0)
}

export interface TapeOverview {
  count: number
  totalSeconds: number
  totalLabel: string
  participatedPeople: string[]
  /** 转录文本总字数 */
  transcriptWords: number
}

/** 磁带整体陈列统计 */
export function tapeOverview(list: Tape[]): TapeOverview {
  const people = new Set<string>()
  let words = 0
  for (const t of list) {
    for (const p of t.participants) people.add(p)
    words += t.transcript ? t.transcript.replace(/\s/g, '').length : 0
  }
  return {
    count: list.length,
    totalSeconds: totalTapeDuration(list),
    totalLabel: formatTapeDuration(totalTapeDuration(list)),
    participatedPeople: [...people].sort((a, b) => a.localeCompare(b, 'zh')),
    transcriptWords: words,
  }
}

/** 检索：按标题 / 参与者 / 转录文本关键词 */
export function searchTapes(list: Tape[], query: string): Tape[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      t.participants.some(p => p.toLowerCase().includes(q)) ||
      (t.transcript || '').toLowerCase().includes(q),
  )
}

/** 近 30 天导入的磁带数（本地回顾节奏） */
export function recentTapes(list: Tape[], now: number = Date.now()): number {
  const cut = now - 30 * 86400000
  return list.filter(t => new Date(t.importDate).getTime() >= cut).length
}

// ---- 状态方法 ----

export function useTapes() {
  function importTape(
    title: string,
    participants: string[],
    durationSeconds: number,
    transcript = '',
    filePath?: string,
  ): Tape | null {
    const t = title.trim()
    if (!t) return null
    const tape: Tape = {
      id: `tape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: t,
      participants: [...new Set(participants.filter(Boolean))],
      durationSeconds: Math.max(0, durationSeconds),
      importDate: new Date().toISOString(),
      transcript: transcript.trim(),
      filePath,
    }
    tapes.value.unshift(tape)
    persist()
    return tape
  }

  function removeTape(id: string) {
    tapes.value = tapes.value.filter(t => t.id !== id)
    persist()
  }

  return { tapes, importTape, removeTape }
}

// 模块初始化时加载一次
tapes.value = loadFromStorage()