// ============================================================
// 岁时阁 · 季节日志 · 持久化存储层
// 蓝图定义：季节反思日志（情绪追踪、节气、年度回顾数据源）。
//
// 此前日志仅在 seasonal-bridge 中以本地 ref 暂存，刷新即丢失。
// 本模块提供跨会话持久化的单一数据源。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import {
  createJournalEntry as createJournalEntryFn,
  updateJournalEntry as updateJournalEntryFn,
} from './seasonal-journal'
import type {
  SeasonalJournalEntry,
  SeasonalMood,
} from './seasonal-journal'
import type { Season } from './types'

const JOURNAL_KEY = 'hf:seasonal_journals'

function loadEntries(): SeasonalJournalEntry[] {
  try {
    return storage.getKV<SeasonalJournalEntry[]>(JOURNAL_KEY, [])
  } catch {
    return []
  }
}

function saveEntries(list: SeasonalJournalEntry[]): void {
  storage.setKV(JOURNAL_KEY, list)
}

// 模块级单一数据源（与 cocoon-store 同一模式）
const entries = ref<SeasonalJournalEntry[]>(loadEntries())

export function useJournalStore() {
  /** 创建季节日志并持久化 */
  function createJournalEntry(
    title: string,
    content: string,
    mood: SeasonalJournalEntry['mood'],
    season?: Season,
  ): SeasonalJournalEntry {
    const entry = createJournalEntryFn(title, content, mood, season)
    entries.value.unshift(entry)
    saveEntries(entries.value)
    return entry
  }

  /** 更新日志字段并持久化 */
  function updateJournalEntry(
    entryId: string,
    updates: Partial<Pick<SeasonalJournalEntry, 'title' | 'content' | 'mood' | 'weather' | 'imageUrl'>>,
  ): SeasonalJournalEntry | null {
    const idx = entries.value.findIndex(e => e.id === entryId)
    if (idx === -1) return null
    const updated = updateJournalEntryFn(entries.value[idx], updates)
    entries.value[idx] = updated
    saveEntries(entries.value)
    return updated
  }

  /** 删除日志 */
  function removeJournalEntry(entryId: string): void {
    entries.value = entries.value.filter(e => e.id !== entryId)
    saveEntries(entries.value)
  }

  /** 清除某年某季节的所有日志 */
  function clearSeason(year: number, season: Season): void {
    entries.value = entries.value.filter(e => !(e.year === year && e.season === season))
    saveEntries(entries.value)
  }

  return {
    entries,
    createJournalEntry,
    updateJournalEntry,
    removeJournalEntry,
    clearSeason,
  }
}

export type { SeasonalJournalEntry, SeasonalMood }