// ============================================================
// 匠庐 · 高级工坊引擎
// 作品进化谱系、创作分析、灵感追踪、版本对比
// ============================================================

import { ref, computed } from 'vue'
import { getLocalMonthKey } from '../../utils/time'
import { storage } from '../../engine/storage'
import type { CraftWork, WorkType, CraftStats } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 创作分析 */
export interface CraftAnalytics {
  /** 总作品数 */
  totalWorks: number
  /** 已完成作品数 */
  completedWorks: number
  /** 创作中作品数 */
  activeWorks: number
  /** 总进化值 */
  totalEvolution: number
  /** 平均进化值 */
  avgEvolution: number
  /** 本月创作数 */
  monthlyCreations: number
  /** 作品类型分布 */
  typeDistribution: { type: WorkType; count: number; totalEvolution: number }[]
  /** 月度创作趋势 */
  monthlyTrend: { month: string; created: number; completed: number; evolution: number }[]
  /** 创作节奏（天） */
  avgCreationDays: number
  /** 最活跃创作日 */
  mostProductiveDay: string
  /** 最高进化作品 */
  topEvolutionWork: { name: string; evolution: number; type: WorkType }
}

/** 进化谱系节点 */
export interface EvolutionNode {
  id: string
  workId: string
  date: string
  evolution: number
  milestone?: string
  /** 进化增量 */
  evolutionDelta: number
}

/** 灵感条目 */
export interface InspirationEntry {
  id: string
  title: string
  content: string
  /** 来源 */
  source: string
  /** 关联作品 */
  relatedWorkId?: string
  /** 状态 */
  status: 'raw' | 'developing' | 'applied' | 'archived'
  createdAt: string
}

/** 创作版本 */
export interface WorkVersion {
  id: string
  workId: string
  version: number
  description: string
  /** 快照数据 */
  snapshot: Record<string, unknown>
  createdAt: string
}

/** 存储键 */
const CRAFT_ANALYTICS_KEY = 'hf:craft:analytics'
const INSPIRATIONS_KEY = 'hf:craft:inspirations'
const WORK_VERSIONS_KEY = 'hf:craft:versions'

// ============================================================
// 高级工坊引擎
// ============================================================

export function useCraftAdvanced() {
  const analytics = ref<CraftAnalytics>(loadAnalytics())
  const inspirations = ref<InspirationEntry[]>(loadInspirations())
  const versions = ref<WorkVersion[]>(loadVersions())

  // ---- 持久化 ----

  function loadAnalytics(): CraftAnalytics {
    try {
      const raw = storage.getKV<string>(CRAFT_ANALYTICS_KEY, '')
      if (!raw) return createDefaultAnalytics()
      return JSON.parse(raw)
    } catch { return createDefaultAnalytics() }
  }

  function saveAnalytics() {
    storage.setKV(CRAFT_ANALYTICS_KEY, JSON.stringify(analytics.value))
  }

  function loadInspirations(): InspirationEntry[] {
    try {
      const raw = storage.getKV<string>(INSPIRATIONS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveInspirations() {
    storage.setKV(INSPIRATIONS_KEY, JSON.stringify(inspirations.value))
  }

  function loadVersions(): WorkVersion[] {
    try {
      const raw = storage.getKV<string>(WORK_VERSIONS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveVersions() {
    storage.setKV(WORK_VERSIONS_KEY, JSON.stringify(versions.value))
  }

  function createDefaultAnalytics(): CraftAnalytics {
    return {
      totalWorks: 0, completedWorks: 0, activeWorks: 0, totalEvolution: 0, avgEvolution: 0,
      monthlyCreations: 0, typeDistribution: [], monthlyTrend: [],
      avgCreationDays: 0, mostProductiveDay: '',
      topEvolutionWork: { name: '', evolution: 0, type: 'insight' },
    }
  }

  // ---- 创作分析 ----

  /** 更新创作分析 */
  function updateAnalytics(works: CraftWork[], stats: CraftStats) {
    const a = analytics.value
    a.totalWorks = works.length
    a.completedWorks = stats.totalCompleted
    a.activeWorks = works.filter(w => w.status === 'draft' || w.status === 'refining').length
    a.totalEvolution = works.reduce((sum, w) => sum + w.evolution, 0)
    a.avgEvolution = a.totalWorks > 0 ? Math.round(a.totalEvolution / a.totalWorks) : 0

    // 本月
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    a.monthlyCreations = works.filter(w => w.createdAt >= monthStart).length

    // 类型分布
    const typeMap = new Map<string, { count: number; totalEvolution: number }>()
    for (const w of works) {
      const entry = typeMap.get(w.type) || { count: 0, totalEvolution: 0 }
      entry.count++
      entry.totalEvolution += w.evolution
      typeMap.set(w.type, entry)
    }
    a.typeDistribution = [...typeMap.entries()]
      .map(([type, data]) => ({ type: type as WorkType, ...data }))
      .sort((x, y) => y.count - x.count)

    // 月度趋势
    const monthlyMap = new Map<string, { created: number; completed: number; evolution: number }>()
    for (const w of works) {
      const month = getLocalMonthKey(w.createdAt)
      const entry = monthlyMap.get(month) || { created: 0, completed: 0, evolution: 0 }
      entry.created++
      if (w.status === 'completed') entry.completed++
      entry.evolution += w.evolution
      monthlyMap.set(month, entry)
    }
    a.monthlyTrend = [...monthlyMap.entries()]
      .map(([month, data]) => ({ month, ...data }))
      .sort((x, y) => x.month.localeCompare(y.month))
      .slice(-12)

    // 平均创作天数
    const completed = works.filter(w => w.status === 'completed' && w.createdAt)
    a.avgCreationDays = completed.length > 0
      ? Math.round(completed.reduce((sum, w) => {
          return sum + (new Date(w.updatedAt).getTime() - new Date(w.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        }, 0) / completed.length)
      : 0

    // 最高进化作品
    if (works.length > 0) {
      const top = works.reduce((max, w) => w.evolution > max.evolution ? w : max)
      a.topEvolutionWork = { name: top.name, evolution: top.evolution, type: top.type }
    }

    saveAnalytics()
  }

  // ---- 进化谱系 ----

  /** 获取作品进化谱系 */
  function getEvolutionTree(work: CraftWork): EvolutionNode[] {
    if (!work.evolutionHistory || work.evolutionHistory.length === 0) return []
    return work.evolutionHistory.map((record, idx) => ({
      id: `evo_${work.id}_${idx}`,
      workId: work.id,
      date: record.date,
      evolution: record.evolution,
      milestone: record.milestone,
      evolutionDelta: idx > 0
        ? record.evolution - (work.evolutionHistory![idx - 1]?.evolution ?? 0)
        : record.evolution,
    }))
  }

  /** 获取所有作品的进化总分 */
  const totalEvolutionAcrossWorks = computed(() => {
    return analytics.value.totalEvolution
  })

  // ---- 灵感管理 ----

  /** 添加灵感 */
  function addInspiration(title: string, content: string, source: string, relatedWorkId?: string): InspirationEntry {
    const entry: InspirationEntry = {
      id: `insp_${Date.now()}`,
      title,
      content,
      source,
      relatedWorkId,
      status: 'raw',
      createdAt: new Date().toISOString(),
    }
    inspirations.value.push(entry)
    saveInspirations()
    return entry
  }

  /** 更新灵感状态 */
  function updateInspirationStatus(id: string, status: InspirationEntry['status']): boolean {
    const insp = inspirations.value.find(i => i.id === id)
    if (!insp) return false
    insp.status = status
    saveInspirations()
    return true
  }

  /** 获取未应用的灵感 */
  const pendingInspirations = computed(() => {
    return inspirations.value.filter(i => i.status === 'raw' || i.status === 'developing')
  })

  // ---- 版本管理 ----

  /** 保存作品版本 */
  function saveVersion(workId: string, description: string, snapshot: Record<string, unknown>): WorkVersion {
    const workVersions = versions.value.filter(v => v.workId === workId)
    const version: WorkVersion = {
      id: `ver_${Date.now()}`,
      workId,
      version: workVersions.length + 1,
      description,
      snapshot,
      createdAt: new Date().toISOString(),
    }
    versions.value.push(version)
    saveVersions()
    return version
  }

  /** 获取作品版本历史 */
  function getWorkVersions(workId: string): WorkVersion[] {
    return versions.value
      .filter(v => v.workId === workId)
      .sort((a, b) => b.version - a.version)
  }

  return {
    analytics,
    inspirations,
    versions,
    totalEvolutionAcrossWorks,
    pendingInspirations,
    updateAnalytics,
    getEvolutionTree,
    addInspiration,
    updateInspirationStatus,
    saveVersion,
    getWorkVersions,
  }
}