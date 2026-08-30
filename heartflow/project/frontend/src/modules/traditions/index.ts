// ============================================================
// 文明根系 · 技艺/仪式/民俗记录（M4 · 文明/汇聚层 · 本地部分）
// 提供民俗条目管理、文明镜像、统计与搜索
//
// 宪法边界守卫（第1条·本地私有）—— M4 收敛层的关键红线：
// 1. 本模块全部数据经 storage.getKV/setKV 落本地，零网络出口；
//    全仓 grep fetch/axios/http/websocket/cloud(网络)/remote 命中为 0。
// 2. CivilizationMirror.public 仅是【本地元数据标记】，表示"这条镜像
//    是否打算贡献到公共文明长河"，本模块【不实现任何上传/贡献通道】。
// 3. 蓝图18 第十一部分（line 1915）明确定位：公共镜像 = 独立的公共资源，
//    不是心流工坊本体、不是服务器、不是官方平台。该公共镜像由外部独立
//    资源承载，本地 app 按设计【不构建】汇聚宇宙/公共镜像服务端。
// 4. 若将来实现"贡献到公共镜像"，必须同时满足：① 用户显式主动触发；
//    ② 仅文明类数据（技艺/仪式/民俗/歌谣）开放；③ 绝不触碰私有基底
//    （专注/情绪/身体/工作/收入/亲密关系/对话/家庭隐私）；④ 默认关闭。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type {
  FolkloreEntry,
  CivilizationMirror,
  FolkloreStats,
  CraftCategory,
  RitualType,
} from './types'
import { CRAFT_CATEGORY_LABELS, RITUAL_TYPE_LABELS } from './types'

export type {
  FolkloreEntry,
  CivilizationMirror,
  FolkloreStats,
  CraftCategory,
  RitualType,
} from './types'
export { CRAFT_CATEGORY_LABELS, RITUAL_TYPE_LABELS } from './types'

// ---- 文明档案分析（INCR-16）----
export {
  CRAFT_META,
  RITUAL_META,
  SOURCE_META,
  traditionsOverview,
  traditionsCraftRows,
  traditionsRitualRows,
  traditionsSourceRows,
  traditionsRegionRows,
  practiceBuckets,
  traditionsRhythm,
  traditionsHealth,
  traditionsInsights,
  traditionsTopTags,
} from './traditions-analytics'
export type {
  TraditionsOverview,
  TraditionsRow,
  PracticeBuckets,
  TraditionsRhythm,
  TraditionsArchiveHealth,
  TraditionsTag,
} from './traditions-analytics'

// ---- 存储键 ----

const ENTRIES_KEY = 'hf:folklore_entries'
const MIRRORS_KEY = 'hf:civilization_mirrors'

// ---- 持久化 ----

function loadEntries(): FolkloreEntry[] {
  try { return storage.getKV<FolkloreEntry[]>(ENTRIES_KEY, []) } catch { return [] }
}

function persistEntries(entries: FolkloreEntry[]) {
  storage.setKV(ENTRIES_KEY, entries)
}

function loadMirrors(): CivilizationMirror[] {
  try { return storage.getKV<CivilizationMirror[]>(MIRRORS_KEY, []) } catch { return [] }
}

function persistMirrors(mirrors: CivilizationMirror[]) {
  storage.setKV(MIRRORS_KEY, mirrors)
}

// ---- 状态 ----

const entries = ref<FolkloreEntry[]>(loadEntries())
const mirrors = ref<CivilizationMirror[]>(loadMirrors())

export function useTraditions() {
  // ---- 民俗条目 CRUD ----

  /** 创建民俗条目 */
  function createEntry(entry: Omit<FolkloreEntry, 'id' | 'recordedAt' | 'practiceCount'>): FolkloreEntry {
    const newEntry: FolkloreEntry = {
      id: `folklore_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...entry,
      recordedAt: new Date().toISOString(),
      practiceCount: 0,
    }
    entries.value = [...entries.value, newEntry]
    persistEntries(entries.value)
    return newEntry
  }

  /** 更新民俗条目 */
  function updateEntry(id: string, partial: Partial<Omit<FolkloreEntry, 'id' | 'recordedAt'>>): boolean {
    const idx = entries.value.findIndex(e => e.id === id)
    if (idx === -1) return false
    entries.value[idx] = { ...entries.value[idx], ...partial }
    persistEntries(entries.value)
    return true
  }

  /** 删除民俗条目 */
  function removeEntry(id: string): boolean {
    const idx = entries.value.findIndex(e => e.id === id)
    if (idx === -1) return false
    entries.value = entries.value.filter(e => e.id !== id)
    persistEntries(entries.value)
    return true
  }

  /** 记录实践 */
  function practiceEntry(id: string): boolean {
    const entry = entries.value.find(e => e.id === id)
    if (!entry) return false
    entry.practiceCount++
    entry.lastPracticedAt = new Date().toISOString()
    persistEntries(entries.value)
    return true
  }

  /** 标记濒危 */
  function markEndangered(id: string, endangered: boolean): boolean {
    const entry = entries.value.find(e => e.id === id)
    if (!entry) return false
    entry.endangered = endangered
    persistEntries(entries.value)
    return true
  }

  // ---- 查询 ----

  /** 按类别筛选 */
  const byCategory = computed(() => {
    const map = new Map<string, FolkloreEntry[]>()
    for (const e of entries.value) {
      const key = e.category
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  })

  /** 按地区筛选 */
  const byRegion = computed(() => {
    const map = new Map<string, FolkloreEntry[]>()
    for (const e of entries.value) {
      const key = e.region
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  })

  /** 按来源筛选 */
  const bySource = computed(() => {
    const map = new Map<string, FolkloreEntry[]>()
    for (const e of entries.value) {
      const key = e.source
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  })

  /** 濒危条目 */
  const endangeredEntries = computed(() => entries.value.filter(e => e.endangered))

  /** 搜索条目 */
  function searchEntries(query: string): FolkloreEntry[] {
    if (!query.trim()) return entries.value
    const lower = query.toLowerCase()
    return entries.value.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      e.description.toLowerCase().includes(lower) ||
      e.tags.some(t => t.toLowerCase().includes(lower)) ||
      e.region.toLowerCase().includes(lower),
    )
  }

  // ---- 统计 ----

  const folkloreStats = computed<FolkloreStats>(() => {
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 86400000

    const byCat: FolkloreStats['byCategory'] = []
    const catCounts = new Map<string, number>()
    for (const e of entries.value) {
      const label = CRAFT_CATEGORY_LABELS[e.category as CraftCategory] || RITUAL_TYPE_LABELS[e.category as RitualType] || e.category
      catCounts.set(label, (catCounts.get(label) || 0) + 1)
    }
    for (const [category, count] of catCounts) {
      byCat.push({ category, label: category, count })
    }

    const byReg: FolkloreStats['byRegion'] = []
    const regCounts = new Map<string, number>()
    for (const e of entries.value) {
      regCounts.set(e.region, (regCounts.get(e.region) || 0) + 1)
    }
    for (const [region, count] of regCounts) {
      byReg.push({ region, count })
    }

    return {
      totalEntries: entries.value.length,
      byCategory: byCat.sort((a, b) => b.count - a.count),
      byRegion: byReg.sort((a, b) => b.count - a.count),
      endangered: entries.value.filter(e => e.endangered).length,
      totalPracticeCount: entries.value.reduce((s, e) => s + e.practiceCount, 0),
      recentlyRecorded: entries.value.filter(e => new Date(e.recordedAt).getTime() >= thirtyDaysAgo).length,
      recentlyPracticed: entries.value.filter(e => e.lastPracticedAt && new Date(e.lastPracticedAt).getTime() >= thirtyDaysAgo).length,
    }
  })

  // ---- 文明镜像 ----

  /** 创建文明镜像 */
  function createMirror(
    name: string,
    region: string,
    period: string,
    description: string,
    tags: string[] = [],
    isPublic: boolean = true,
  ): CivilizationMirror {
    const mirror: CivilizationMirror = {
      id: `mirror_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      region,
      period,
      entryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contributors: 1,
      public: isPublic,
      description,
      tags,
    }
    mirrors.value = [...mirrors.value, mirror]
    persistMirrors(mirrors.value)
    return mirror
  }

  /** 更新文明镜像 */
  function updateMirror(id: string, partial: Partial<Omit<CivilizationMirror, 'id' | 'createdAt'>>): boolean {
    const idx = mirrors.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    mirrors.value[idx] = { ...mirrors.value[idx], ...partial, updatedAt: new Date().toISOString() }
    persistMirrors(mirrors.value)
    return true
  }

  /** 删除文明镜像 */
  function removeMirror(id: string): boolean {
    const idx = mirrors.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    mirrors.value = mirrors.value.filter(m => m.id !== id)
    persistMirrors(mirrors.value)
    return true
  }

  /** 公开镜像 */
  const publicMirrors = computed(() => mirrors.value.filter(m => m.public))

  /** 从本地存储重新载入（视图挂载/回归测试时刷新单例 ref） */
  function reload(): void {
    entries.value = loadEntries()
    mirrors.value = loadMirrors()
  }

  return {
    // 条目
    entries,
    byCategory,
    byRegion,
    bySource,
    endangeredEntries,
    folkloreStats,
    createEntry,
    updateEntry,
    removeEntry,
    practiceEntry,
    markEndangered,
    searchEntries,
    // 镜像
    mirrors,
    publicMirrors,
    createMirror,
    updateMirror,
    removeMirror,
    reload,
  }
}