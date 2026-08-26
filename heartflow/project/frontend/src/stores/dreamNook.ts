// ============================================================
// 梦乡小筑 · Pinia Store
// 模块三十八：梦境记录、情绪标记、搜索过滤
// 数据模型见蓝图15·第七部分·补二·模块三十八
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'

// ---- 类型定义 ----

export interface Dream {
  id: string
  title: string
  content: string
  mood: 'neutral' | 'happy' | 'fear' | 'sad' | 'curious' | 'confused'
  tags: string[]
  at: string
  dreamDate?: string | null
  relatedParallelWorldId?: string | null
  archived?: boolean
}

export const MOOD_OPTIONS = [
  { value: 'neutral' as const, label: '☁️ 平常' },
  { value: 'happy' as const, label: '😊 愉快' },
  { value: 'fear' as const, label: '😨 恐惧' },
  { value: 'sad' as const, label: '😢 悲伤' },
  { value: 'curious' as const, label: '🤔 好奇' },
  { value: 'confused' as const, label: '🌀 困惑' },
]

export const MOOD_LABEL_MAP: Record<string, string> = {
  happy: '😊',
  fear: '😨',
  sad: '😢',
  curious: '🤔',
  confused: '🌀',
  neutral: '☁️',
}

// ---- 存储键 ----

const K = 'hf:dreams'
const MAX_ACTIVE_DREAMS = 100

/**
 * 平行世界中的「梦境区」标识。
 * 梦境通过 relatedParallelWorldId === DREAM_REALM_ID 映照到平行世界·梦境区，
 * 实现 梦境 ↔ 平行世界 的本地双向联动（无网络、无外部依赖）。
 */
export const DREAM_REALM_ID = 'dream-realm'

// ---- 加载辅助 ----

function loadDreams(): Dream[] {
  try { return storage.getKV<Dream[]>(K, []) } catch { return [] }
}

function saveDreams(dreams: Dream[]) {
  storage.setKV(K, dreams)
}

export const useDreamNookStore = defineStore('dreamNook', () => {
  // ---- 状态 ----
  const dreams = ref<Dream[]>(loadDreams())

  // ---- 计算属性 ----

  const activeDreams = computed(() =>
    dreams.value.filter(d => !d.archived)
  )

  const archivedDreams = computed(() =>
    dreams.value.filter(d => d.archived)
  )

  const totalCount = computed(() => dreams.value.length)

  const thisMonthCount = computed(() => {
    const m = new Date().getMonth()
    const y = new Date().getFullYear()
    return dreams.value.filter(d => {
      const date = new Date(d.at)
      return date.getMonth() === m && date.getFullYear() === y
    }).length
  })

  const allTags = computed(() => {
    const set = new Set<string>()
    dreams.value.forEach(d => d.tags.forEach(t => set.add(t)))
    return [...set].sort()
  })

  function tagCount(tag: string): number {
    return dreams.value.filter(d => d.tags.includes(tag)).length
  }

  const tagRank = computed(() => {
    const map = new Map<string, number>()
    dreams.value.forEach(d => d.tags.forEach(t => map.set(t, (map.get(t) || 0) + 1)))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  })

  const topTag = computed(() => {
    const rank = tagRank.value
    return rank.length > 0 ? rank[0] : null
  })

  /** 已映照到平行世界·梦境区 的梦境（本地双向联动的数据源） */
  const parallelWorldDreams = computed(() =>
    dreams.value.filter(d => d.relatedParallelWorldId === DREAM_REALM_ID)
  )

  // ---- 操作方法 ----

  function persist() {
    saveDreams(dreams.value)
  }

  function recordDream(
    content: string,
    title: string = '',
    mood: Dream['mood'] = 'neutral',
    tags: string[] = [],
    dreamDate?: string,
  ): Dream {
    const dream: Dream = {
      id: `dr${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      title: title.trim(),
      content: content.trim(),
      mood,
      tags,
      at: new Date().toISOString(),
      dreamDate: dreamDate || null,
      archived: false,
    }
    dreams.value.unshift(dream)

    // 超过上限时自动归档最早的活跃梦境
    if (activeDreams.value.length > MAX_ACTIVE_DREAMS) {
      const oldest = activeDreams.value[activeDreams.value.length - 1]
      if (oldest) {
        oldest.archived = true
      }
    }

    persist()
    return dream
  }

  function deleteDream(id: string) {
    dreams.value = dreams.value.filter(d => d.id !== id)
    persist()
  }

  function getDream(id: string): Dream | undefined {
    return dreams.value.find(d => d.id === id)
  }

  function archiveDream(id: string) {
    const d = dreams.value.find(d => d.id === id)
    if (d) { d.archived = true; persist() }
  }

  function unarchiveDream(id: string) {
    const d = dreams.value.find(d => d.id === id)
    if (d) { d.archived = false; persist() }
  }

  function filterDreams(search?: string, mood?: string, tag?: string): Dream[] {
    return dreams.value.filter(d => {
      if (search && !d.title.includes(search) && !d.content.includes(search)) return false
      if (mood && d.mood !== mood) return false
      if (tag && !d.tags.includes(tag)) return false
      return true
    })
  }

  function moodLabel(mood: string): string {
    return MOOD_LABEL_MAP[mood] || '☁️'
  }

  function linkParallelWorld(dreamId: string, worldId: string | null) {
    const d = dreams.value.find(d => d.id === dreamId)
    if (d) { d.relatedParallelWorldId = worldId; persist() }
  }

  function exportDreams(): string {
    return JSON.stringify(dreams.value, null, 2)
  }

  function importDreams(json: string): { added: number; skipped: number } {
    const imported = JSON.parse(json) as Dream[]
    if (!Array.isArray(imported)) throw new Error('格式不正确')
    const existing = new Set(dreams.value.map(x => x.id))
    let added = 0
    for (const item of imported) {
      if (item.id && !existing.has(item.id)) {
        dreams.value.push(item)
        existing.add(item.id)
        added++
      }
    }
    persist()
    return { added, skipped: imported.length - added }
  }

  return {
    // 状态
    dreams,
    // 计算属性
    activeDreams,
    archivedDreams,
    totalCount,
    thisMonthCount,
    allTags,
    tagCount,
    tagRank,
    topTag,
    parallelWorldDreams,
    // 操作
    recordDream,
    deleteDream,
    getDream,
    archiveDream,
    unarchiveDream,
    filterDreams,
    moodLabel,
    linkParallelWorld,
    exportDreams,
    importDreams,
    persist,
  }
})