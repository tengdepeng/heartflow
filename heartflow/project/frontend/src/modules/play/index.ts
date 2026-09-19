// ============================================================
// 逸趣阁 · 业务逻辑模块
// ============================================================

import { ref, computed, reactive } from 'vue'
import { storage } from '../../engine/storage'
import type { Game, Toy, Model, Other, PlayData, MonthlyStat, DistBuckets, ModelGroup, RecentItem, PlatformDistItem } from './types'
import { PLAY_TABS, TOY_FILTERS, valueLabel, statusLabel, formatDate } from './data'

// ---- 时间种子（心情种子 / 生长系统，数据层下沉，P 重构） ----
export { usePlaySeeds } from './seeds'

// ---- 时间种子 ----
export {
  seedFromGame,
  seedFromToy,
  seedFromModel,
  seedFromOther,
  inheritSeed,
  canInherit,
  computeSeedStats,
  computeLODLevel,
  applyLOD,
  SEED_RARITY_LABELS,
  SEED_RARITY_COLORS,
} from './time-seed'
export type { TimeSeed, SeedSource, SeedRarity, SeedStats, LODLevel } from './time-seed'

// ---- 种子分享与遗传 ----
export {
  exportSeed,
  importSeed,
  stringifySeed,
  parseSeed,
  createInheritance,
  buildLineage,
  buildSeedGraph,
  computeGraphSummary,
  mergeSeedCollections,
  filterByRarity,
  searchSeeds,
} from './seed-share'
export type {
  SeedSharePayload,
  ExportedSeed,
  InheritanceRecord,
  InheritanceLineage,
  SeedGraphNode,
  SeedGraphEdge,
  SeedGraph,
  SeedGraphSummary,
} from './seed-share'

// ---- 时间种子传递治理层（第46/47/48条） ----
export {
  seedTransferType,
  defaultAuthorization,
  buildTransferPreview,
  buildInvestmentPreview,
  collectTimeInvestments,
  exportSeedGift,
  stringifySeedGift,
  parseSeedGift,
  recordTransfer,
  getTransferLogs,
  getTransferLog,
  revokeTransfer,
  isTransferViewable,
  TRANSFER_TYPE_LABELS,
  GRANULARITY_LABELS,
} from './seed-transfer'
export type {
  TransferType,
  TransferGranularity,
  TransferAuthorization,
  TransferPreview,
  TransferPreviewItem,
  TransferLog,
  RevokeResult,
  TimeInvestmentRecord,
  SeedGiftPayload,
  GiftItem,
} from './seed-transfer'

// ---- 接收端时间种子（第46条单向赠予落点 / 第48条反收回变暗） ----
export {
  addReceivedSeedsFromGift,
  importSeedGift,
  getReceivedSeeds,
  getReceivedSeed,
  plantSeed,
  admireSeed,
  rejectSeed,
  removeReceivedSeed,
  markRevokedByGift,
} from './received-seed'
export type {
  ReceivedSeed,
  ReceivedSeedState,
} from './received-seed'

/** 存储键名 */
const STORAGE_KEY = 'hf:play_v2'

// ---- 数据加载/保存 ----

function loadData(): PlayData {
  try {
    const d = storage.getKV<PlayData>(STORAGE_KEY, null as any)
    return d || { games: [], toys: [], models: [], others: [] }
  } catch {
    return { games: [], toys: [], models: [], others: [] }
  }
}

function saveData(data: PlayData): void {
  storage.setKV(STORAGE_KEY, data)
}

// ==================== 主 composable ====================

export function usePlayGallery() {
  const raw = loadData()
  const games = ref<Game[]>(raw.games)
  const toys = ref<Toy[]>(raw.toys)
  const models = ref<Model[]>(raw.models)
  const others = ref<Other[]>(raw.others)

  function persist() {
    saveData({ games: games.value, toys: toys.value, models: models.value, others: others.value })
  }

  // ---- UI 状态 ----
  const tab = ref('game')
  const tabs = PLAY_TABS
  const fmt = formatDate

  // ========== 游戏 ==========

  const gameForm = reactive({ name: '', platform: '', hours: 0 })

  function addGame() {
    if (!gameForm.name || !gameForm.hours) return
    games.value.unshift({
      id: `gm${Date.now()}`,
      name: gameForm.name,
      platform: gameForm.platform || '其他',
      hours: gameForm.hours,
      at: new Date().toISOString(),
    })
    persist()
    gameForm.name = ''
    gameForm.platform = ''
    gameForm.hours = 0
  }

  function removeGame(id: string) {
    games.value = games.value.filter(g => g.id !== id)
    persist()
  }

  const totalGameHours = computed(() => games.value.reduce((s, g) => s + g.hours, 0))

  const topGame = computed(() => {
    const m = games.value.reduce((max, g) => (g.hours > max.hours ? g : max), { hours: 0 } as Game)
    return m.name || '-'
  })

  const topPlatform = computed(() => {
    const map: Record<string, number> = {}
    games.value.forEach(g => { map[g.platform] = (map[g.platform] || 0) + g.hours })
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
  })

  function gameBarWidth(h: number): number {
    const max = Math.max(...games.value.map(g => g.hours), 1)
    return Math.min((h / max) * 100, 100)
  }

  /** 月度统计 */
  const monthlyStats = computed<MonthlyStat[]>(() => {
    const map: Record<string, number> = {}
    games.value.forEach(g => {
      const m = g.at.slice(0, 7)
      map[m] = (map[m] || 0) + g.hours
    })
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, hours]) => ({ month, hours }))
  })

  const maxMonthlyHours = computed(() => Math.max(...monthlyStats.value.map(m => m.hours), 1))

  /** 时长分布 */
  const distBuckets = computed<DistBuckets>(() => {
    let lt10 = 0, mid = 0, high = 0, extreme = 0
    games.value.forEach(g => {
      if (g.hours < 10) lt10++
      else if (g.hours < 50) mid++
      else if (g.hours < 100) high++
      else extreme++
    })
    return { lt10, mid, high, extreme }
  })

  // ========== 游戏排序 ==========

  const sortField = ref<'hours' | 'name' | 'date'>('hours')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  function setSort(field: 'hours' | 'name' | 'date') {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortOrder.value = 'desc'
    }
  }

  const sortedGames = computed(() => {
    const sorted = [...games.value]
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortField.value === 'hours') {
        cmp = a.hours - b.hours
      } else if (sortField.value === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField.value === 'date') {
        cmp = a.at.localeCompare(b.at)
      }
      return sortOrder.value === 'desc' ? -cmp : cmp
    })
    return sorted
  })

  // ========== 全局搜索 ==========

  const searchQuery = ref('')

  const filteredGames = computed(() => {
    if (!searchQuery.value.trim()) return sortedGames.value
    const q = searchQuery.value.toLowerCase()
    return sortedGames.value.filter(
      g => g.name.toLowerCase().includes(q) || g.platform.toLowerCase().includes(q)
    )
  })

  // ========== 平台分布 ==========

  const platformDistribution = computed<PlatformDistItem[]>(() => {
    const map: Record<string, { count: number; hours: number }> = {}
    games.value.forEach(g => {
      if (!map[g.platform]) map[g.platform] = { count: 0, hours: 0 }
      map[g.platform].count++
      map[g.platform].hours += g.hours
    })
    return Object.entries(map)
      .map(([platform, data]) => ({ platform, count: data.count, hours: data.hours }))
      .sort((a, b) => b.hours - a.hours)
  })

  // ========== 玩具 ==========

  const toyForm = reactive({ name: '', note: '', value: 'mint' as Toy['value'] })
  const toyFilter = ref('all')
  const toyFilters = TOY_FILTERS

  function addToy() {
    if (!toyForm.name.trim()) return
    toys.value.unshift({
      id: `ty${Date.now()}`,
      name: toyForm.name,
      note: toyForm.note,
      value: toyForm.value,
      at: new Date().toISOString(),
    })
    persist()
    toyForm.name = ''
    toyForm.note = ''
    toyForm.value = 'mint'
  }

  function removeToy(id: string) {
    toys.value = toys.value.filter(t => t.id !== id)
    persist()
  }

  const filteredToys = computed(() => {
    if (toyFilter.value === 'all') return toys.value
    return toys.value.filter(t => t.value === toyFilter.value)
  })

  // ========== 模型/手办 ==========

  const modelForm = reactive({ name: '', series: '', status: 'sealed' as Model['status'] })

  function addModel() {
    if (!modelForm.name.trim()) return
    models.value.unshift({
      id: `md${Date.now()}`,
      name: modelForm.name,
      series: modelForm.series,
      status: modelForm.status,
      at: new Date().toISOString(),
    })
    persist()
    modelForm.name = ''
    modelForm.series = ''
    modelForm.status = 'sealed'
  }

  function removeModel(id: string) {
    models.value = models.value.filter(m => m.id !== id)
    persist()
  }

  const modelGroups = computed<ModelGroup[]>(() => {
    const map: Record<string, Model[]> = {}
    models.value.forEach(m => {
      const key = m.series || '__unsorted__'
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return Object.entries(map)
      .sort((a, b) => (a[0] === '__unsorted__' ? 1 : b[0].localeCompare(a[0])))
      .map(([series, items]) => ({
        series: series === '__unsorted__' ? '' : series,
        items,
      }))
  })

  // ========== 其他收藏 ==========

  const otherForm = reactive({ name: '', cat: '' })
  const otherSearch = ref('')

  function addOther() {
    if (!otherForm.name.trim()) return
    others.value.unshift({
      id: `ot${Date.now()}`,
      name: otherForm.name,
      cat: otherForm.cat,
      at: new Date().toISOString(),
    })
    persist()
    otherForm.name = ''
    otherForm.cat = ''
  }

  function removeOther(id: string) {
    others.value = others.value.filter(o => o.id !== id)
    persist()
  }

  const filteredOthers = computed(() => {
    if (!otherSearch.value.trim()) return others.value
    const q = otherSearch.value.toLowerCase()
    return others.value.filter(
      o => o.name.toLowerCase().includes(q) || o.cat.toLowerCase().includes(q)
    )
  })

  // ========== 整体统计 ==========

  const totalItems = computed(() =>
    games.value.length + toys.value.length + models.value.length + others.value.length
  )

  const recentItems = computed<RecentItem[]>(() => {
    const all: RecentItem[] = [
      ...games.value.map(g => ({ id: g.id, name: g.name, icon: '🎮', sub: g.platform + ' ' + g.hours + 'h', at: g.at })),
      ...toys.value.map(t => ({ id: t.id, name: t.name, icon: '🧸', sub: valueLabel(t.value), at: t.at })),
      ...models.value.map(m => ({ id: m.id, name: m.name, icon: '🗿', sub: statusLabel(m.status), at: m.at })),
      ...others.value.map(o => ({ id: o.id, name: o.name, icon: '📦', sub: o.cat, at: o.at })),
    ]
    return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  })

  const isEmpty = computed(() => totalItems.value === 0)

  return {
    // 数据
    games, toys, models, others,
    // UI 状态
    tab, tabs, fmt, toyFilter, toyFilters, otherSearch,
    // 表单
    gameForm, toyForm, modelForm, otherForm,
    // 游戏
    addGame, removeGame, totalGameHours, topGame, topPlatform,
    gameBarWidth, monthlyStats, maxMonthlyHours, distBuckets,
    // 游戏排序
    sortField, sortOrder, setSort, sortedGames,
    // 全局搜索
    searchQuery, filteredGames,
    // 平台分布
    platformDistribution,
    // 玩具
    addToy, removeToy, filteredToys, valueLabel,
    // 模型
    addModel, removeModel, modelGroups, statusLabel,
    // 其他
    addOther, removeOther, filteredOthers,
    // 整体
    totalItems, recentItems, isEmpty,
  }
}

// ==================== 导出数据常量 ====================

export { PLAY_TABS, TOY_FILTERS, valueLabel, statusLabel, formatDate }
export type { Game, Toy, Model, Other, PlayData, MonthlyStat, DistBuckets, ModelGroup, RecentItem, PlayTab, FilterOption, PlatformDistItem } from './types'

// ---- 高级统计与趋势 ----
export {
  checkMilestones,
  computePlaySummary,
  buildPlayTrend,
  computeTimeInvestmentROI,
  computeCollectionHeatmap,
  computePreferenceProfile,
  MILESTONE_DEFS,
} from './play-advanced'

// ---- 逸趣档案（逸趣阁·档案陈列，与 play-advanced 的趋势/偏好互补）----
export {
  seedEffectiveAge,
  moodSeedStage,
  playArchiveOverview,
  collectionTypeRows,
  moodSeedOverview,
  collectionRhythm,
  collectionHealth,
  playInsights,
  MOOD_SEED_STAGE_LABELS,
  MOOD_SEED_STAGE_COLORS,
} from './play-analytics'
export type {
  MoodSeedStage,
  PlayArchiveOverview,
  CollectionTypeRow,
  MoodSeedRow,
  MoodDistribution,
  MoodSeedOverview,
  CollectionRhythm,
  CollectionHealth,
  PlayInsight,
} from './play-analytics'
export type {
  PlayMilestone,
  MilestoneCategory,
  PlayTrend,
  PlaySummary,
  TimeInvestmentROI,
  CollectionHeatmap,
  PreferenceProfile,
} from './play-advanced'

// ---- 逸趣桥（视图桥接层，INCR-375）----
export { usePlayBridge } from './play-bridge'
export type {
  PlayOverview,
  GalleryStats,
  SeedOverview,
  PlayRecommendation,
} from './play-bridge'