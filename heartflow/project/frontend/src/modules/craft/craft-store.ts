// ============================================================
// 匠庐 · 作品 Pinia Store（叶子模块）
// 从 index.ts 抽取，消除 index ↔ craft-bridge 的 barrel 循环依赖。
// index.ts 仍再导出本 store，公共 API 不变。
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CraftWork, WorkStatus, WorkType } from './types'
import { getKV, setKV } from '../../engine/storage/kv'
import { useConfig } from '../../resonance/bridges/config'

const STORAGE_KEY = 'hf:craft:works'

export const useCraftStore = defineStore('craft', () => {
  // ---- 依赖 ----
  const { config: configRef } = useConfig()

  // ---- 状态 ----
  const works = ref<CraftWork[]>([])
  const searchQuery = ref('')
  const filterStatus = ref<WorkStatus | ''>('')
  const filterType = ref<WorkType | ''>('')

  // ---- 持久化 ----
  function loadWorks() {
    const saved = getKV<CraftWork[]>(STORAGE_KEY, [])
    works.value = saved
  }

  function persistWorks() {
    setKV(STORAGE_KEY, works.value)
  }

  // ---- 计算属性 ----
  const filteredWorks = computed(() => {
    return works.value.filter(w => {
      if (filterStatus.value && w.status !== filterStatus.value) return false
      if (filterType.value && w.type !== filterType.value) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        return (
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.tags.some(t => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  })

  const stats = computed(() => {
    const totalWorks = works.value.length
    const byStatus: Record<WorkStatus, number> = {
      draft: 0,
      refining: 0,
      completed: 0,
      archived: 0,
    }
    const byType: Record<WorkType, number> = {
      writing: 0,
      code: 0,
      design: 0,
      plan: 0,
      insight: 0,
    }
    let totalEvolution = 0
    for (const w of works.value) {
      byStatus[w.status]++
      byType[w.type]++
      totalEvolution += w.evolution
    }
    return {
      totalWorks,
      byStatus,
      byType,
      averageEvolution: totalWorks > 0 ? Math.round(totalEvolution / totalWorks) : 0,
      totalCompleted: byStatus.completed,
    }
  })

  const statusCounts = computed(() => stats.value.byStatus)
  const typeCounts = computed(() => stats.value.byType)

  const recentWorks = computed(() => {
    return [...works.value]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, configRef.craft.recentLimit)
  })

  // ---- 操作 ----

  function addWork(work: CraftWork): boolean {
    if (works.value.some(w => w.id === work.id)) return false
    works.value.push(work)
    persistWorks()
    return true
  }

  function updateWork(id: string, updates: Partial<CraftWork>): boolean {
    const work = works.value.find(w => w.id === id)
    if (!work) return false
    Object.assign(work, updates, { updatedAt: new Date().toISOString() })
    persistWorks()
    return true
  }

  function removeWork(id: string): boolean {
    const idx = works.value.findIndex(w => w.id === id)
    if (idx === -1) return false
    works.value.splice(idx, 1)
    persistWorks()
    return true
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setFilterStatus(status: WorkStatus | '') {
    filterStatus.value = status
  }

  function setFilterType(type: WorkType | '') {
    filterType.value = type
  }

  // ---- 初始化 ----
  loadWorks()

  return {
    // state
    works,
    searchQuery,
    filterStatus,
    filterType,
    // getters
    filteredWorks,
    stats,
    statusCounts,
    typeCounts,
    recentWorks,
    // actions
    addWork,
    updateWork,
    removeWork,
    loadWorks,
    persistWorks,
    setSearchQuery,
    setFilterStatus,
    setFilterType,
  }
})
