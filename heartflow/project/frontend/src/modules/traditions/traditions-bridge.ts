// ============================================================
// Traditions 桥接层
// 简化透传：直接暴露 useTraditions 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import { useTraditions } from './index'
import type { FolkloreEntry, CivilizationMirror, FolkloreStats } from './index'

export interface TraditionsSummary {
  totalEntries: number
  totalMirrors: number
  endangeredCount: number
  totalPracticeCount: number
  recentlyRecorded: number
  recentlyPracticed: number
}

export interface TraditionsSearchResult {
  entries: FolkloreEntry[]
  query: string
  total: number
}

export function useTraditionsBridge() {
  const traditions = useTraditions()
  const isLoading = ref(false)
  const searchResults = ref<FolkloreEntry[]>([])

  // ---- 聚合状态 ----

  const summary = computed<TraditionsSummary>(() => {
    const stats: FolkloreStats = traditions.folkloreStats.value
    return {
      totalEntries: stats.totalEntries,
      totalMirrors: traditions.mirrors.value.length,
      endangeredCount: stats.endangered,
      totalPracticeCount: stats.totalPracticeCount,
      recentlyRecorded: stats.recentlyRecorded,
      recentlyPracticed: stats.recentlyPracticed,
    }
  })

  const endangeredEntries = computed(() => traditions.endangeredEntries.value)

  const categoryBreakdown = computed(() => {
    const map = new Map<string, number>()
    for (const [cat, entries] of traditions.byCategory.value) {
      map.set(cat, entries.length)
    }
    return map
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      traditions.reload()
    } finally {
      isLoading.value = false
    }
  }

  function createEntry(
    entry: Omit<FolkloreEntry, 'id' | 'recordedAt' | 'practiceCount'>,
  ): FolkloreEntry {
    return traditions.createEntry(entry)
  }

  function updateEntry(
    id: string,
    partial: Partial<Omit<FolkloreEntry, 'id' | 'recordedAt'>>,
  ): boolean {
    return traditions.updateEntry(id, partial)
  }

  function removeEntry(id: string): boolean {
    return traditions.removeEntry(id)
  }

  function practiceEntry(id: string): boolean {
    return traditions.practiceEntry(id)
  }

  function toggleEndangered(id: string, endangered: boolean): boolean {
    return traditions.markEndangered(id, endangered)
  }

  function search(query: string): FolkloreEntry[] {
    const results = traditions.searchEntries(query)
    searchResults.value = results
    return results
  }

  function createMirror(
    name: string,
    region: string,
    period: string,
    description: string,
    tags: string[] = [],
    isPublic: boolean = true,
  ): CivilizationMirror {
    return traditions.createMirror(name, region, period, description, tags, isPublic)
  }

  function updateMirror(
    id: string,
    partial: Partial<Omit<CivilizationMirror, 'id' | 'createdAt'>>,
  ): boolean {
    return traditions.updateMirror(id, partial)
  }

  function removeMirror(id: string): boolean {
    return traditions.removeMirror(id)
  }

  return {
    // 状态
    entries: traditions.entries,
    mirrors: traditions.mirrors,
    isLoading,
    summary,
    endangeredEntries,
    categoryBreakdown,
    searchResults,
    folkloreStats: traditions.folkloreStats,
    // 计算属性
    byCategory: traditions.byCategory,
    byRegion: traditions.byRegion,
    bySource: traditions.bySource,
    publicMirrors: traditions.publicMirrors,
    // 操作
    initialize,
    createEntry,
    updateEntry,
    removeEntry,
    practiceEntry,
    toggleEndangered,
    search,
    createMirror,
    updateMirror,
    removeMirror,
    // 子模块直通
    traditions,
  }
}