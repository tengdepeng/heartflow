// ============================================================
// 地图室 · 足迹志（全球街景 / 地图帝 / 元地球 Earth 启发）
// ------------------------------------------------------------
// 借鉴「去过哪、标记在哪」：记录去过的地点（地区、日期、类型、
// 心情、同行人、坐标），生成足迹统计（去重地区、类别分布、
// 月度时间线）。全部本地存储，守宪法第1条本地私有 / 拒绝云端位置。
// 纯函数核心（可单测）+ 轻量持久化，供 FootprintPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 足迹类型 */
export type VisitType =
  | 'sight'    // 名胜古迹
  | 'nature'   // 山川湖海
  | 'city'     // 城市漫游
  | 'food'     // 美食驻留
  | 'custom'   // 自定义

/** 单条足迹 */
export interface FootprintRecord {
  id: string
  /** 地点名称 */
  name: string
  /** 地区（省 / 城市 / 国家） */
  region: string
  /** 游历日期 YYYY-MM-DD */
  date: string
  type: VisitType
  mood?: string
  companion?: string
  note?: string
  latitude?: number
  longitude?: number
}

/** 足迹统计 */
export interface FootprintStats {
  /** 总足迹数 */
  total: number
  /** 去重的地区数 */
  uniqueRegions: number
  regions: { region: string; count: number }[]
  byType: { type: VisitType; count: number }[]
  /** 最早游历年份 */
  sinceYear: number | null
  /** 足迹覆盖的月度段 */
  months: { month: string; count: number }[]
}

export const VISIT_TYPE_META: Record<VisitType, { label: string; icon: string; color: string }> = {
  sight: { label: '名胜', icon: '🏛️', color: '#f59e0b' },
  nature: { label: '山川', icon: '🏔️', color: '#8a9a7a' },
  city: { label: '城市', icon: '🏙️', color: '#6b9fc4' },
  food: { label: '美食', icon: '🍜', color: '#c46a5a' },
  custom: { label: '自定义', icon: '📍', color: '#a07c8c' },
}

const STORAGE_KEY = 'hf:footprint_records'

// ============================================================
// 纯函数核心
// ============================================================

function monthKey(d: string): string {
  return d.slice(0, 7)
}

/** 足迹统计 */
export function computeFootprintStats(records: FootprintRecord[]): FootprintStats {
  const regions: Record<string, number> = {}
  const byType: Record<VisitType, number> = { sight: 0, nature: 0, city: 0, food: 0, custom: 0 }
  const months: Record<string, number> = {}

  let minYear: number | null = null
  for (const r of records) {
    const y = Number(r.date.slice(0, 4))
    if (Number.isFinite(y)) minYear = minYear === null ? y : Math.min(minYear, y)
    regions[r.region] = (regions[r.region] ?? 0) + 1
    byType[r.type] = (byType[r.type] ?? 0) + 1
    const mk = monthKey(r.date)
    months[mk] = (months[mk] ?? 0) + 1
  }

  return {
    total: records.length,
    uniqueRegions: Object.keys(regions).length,
    regions: Object.entries(regions)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
    byType: (Object.keys(byType) as VisitType[])
      .map((type) => ({ type, count: byType[type] }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count),
    sinceYear: minYear,
    months: Object.entries(months)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  }
}

/** 按类型筛选 */
export function byType(records: FootprintRecord[], type: VisitType | 'all'): FootprintRecord[] {
  return type === 'all' ? records : records.filter((r) => r.type === type)
}

/** 按关键字搜索（名称 / 地区 / 心情 / 同行） */
export function searchFootprints(records: FootprintRecord[], keyword: string): FootprintRecord[] {
  const k = keyword.trim().toLowerCase()
  if (!k) return records
  return records.filter(
    (r) =>
      r.name.toLowerCase().includes(k) ||
      r.region.toLowerCase().includes(k) ||
      (r.mood ?? '').toLowerCase().includes(k) ||
      (r.companion ?? '').toLowerCase().includes(k),
  )
}

/** 按日期倒序排列 */
export function sortByDate(records: FootprintRecord[]): FootprintRecord[] {
  return records.slice().sort((a, b) => b.date.localeCompare(a.date))
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadRecords(): FootprintRecord[] {
  try {
    return storage.getKV<FootprintRecord[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

export function useFootprint() {
  const records = ref<FootprintRecord[]>(loadRecords())

  function persist(): void {
    storage.setKV(STORAGE_KEY, records.value)
  }
  function add(input: Omit<FootprintRecord, 'id'>): FootprintRecord {
    const rec: FootprintRecord = {
      ...input,
      id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    }
    records.value.push(rec)
    persist()
    return rec
  }
  function remove(id: string): void {
    records.value = records.value.filter((r) => r.id !== id)
    persist()
  }

  const stats = computed<FootprintStats>(() => computeFootprintStats(records.value))

  return {
    records: computed(() => records.value),
    stats,
    add,
    remove,
    sortByDate,
    byType,
    searchFootprints,
  }
}