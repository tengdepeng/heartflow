// ============================================================
// 时光胶囊 · 时间胶囊系统（蓝图17 P2 · 平行世界·梦境区）
// 把笔记/结晶封存为未来开启的「胶囊」：未到开启日隐藏内容，
// 到达开启日可开启并回看当年封存的心流碎片。
// 本地优先：与笔记同源存储，可重建。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

/** 胶囊内引用的条目类型 */
export type CapsuleItemType = 'note' | 'crystal' | 'photo'

/** 照片引用：指向照片日记某日某张图（与 PhotoEntry.images/thumbs 下标一致） */
export interface PhotoRef {
  /** 照片日记归属日期（YYYY-MM-DD），与 PhotoEntry.date 同口径 */
  date: string
  /** 该日照片日记中的图序（0 起） */
  index: number
}

/** 胶囊内引用的条目（轻量指针，避免重复存储正文） */
export interface CapsuleItemRef {
  type: CapsuleItemType
  id: string
  title: string
  /** 关联的照片日记引用（照片进胶囊）；仅 type==='photo' 时存在 */
  photoRef?: PhotoRef
}

/** 胶囊范围：年度时间胶囊 / 自由胶囊 */
export type CapsuleScope = 'year' | 'free'

/** 时光胶囊（唯一真源：平行世界·时间胶囊与时光胶囊视图共用此结构）
 *  - openedAt / opened 同步维护；at = createdAt；message 由 note ?? title 派生
 *  - 旧并行世界格式（message + opened(boolean)）在 load 时归一化迁移为本结构，杜绝双写损坏
 */
export interface TimeCapsule {
  id: string
  title: string
  note?: string
  /** 兼容并行世界视图：给未来的自己写的话，由 note ?? title 派生 */
  message?: string
  items: CapsuleItemRef[]
  createdAt: string
  /** 兼容并行世界视图的封存时间，等于 createdAt */
  at: string
  /** 开启日（YYYY-MM-DD），到达当日即可开启 */
  openDate: string
  /** 已开启时间；null 表示仍未开启 */
  openedAt: string | null
  /** 兼容并行世界视图的布尔标记，等于 openedAt !== null */
  opened: boolean
  /** 范围（年度/自由），默认自由 */
  scope?: CapsuleScope
}

const CAPSULE_KEY = 'hf:time_capsules'

function generateId(): string {
  return `capsule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** 旧并行世界胶囊形状（仅用于归一化迁移，运行时不依赖） */
interface LegacyCapsule {
  id?: string
  title?: string
  message?: string
  note?: string
  items?: unknown
  createdAt?: string
  at?: string
  openDate?: string
  openedAt?: string | null
  opened?: boolean
  scope?: string
}

/** 把任意存储里的胶囊归一化为统一 TimeCapsule（兼容旧并行世界格式：message + opened(boolean) 双写遗留数据） */
function normalizeCapsule(raw: unknown): TimeCapsule {
  const r = (raw ?? {}) as LegacyCapsule
  // 旧格式以 opened(boolean) 标记开启；新格式以 openedAt 标记
  const willOpen = r.openedAt !== undefined ? r.openedAt !== null : !!r.opened
  const openedAt: string | null = willOpen ? (r.openedAt ?? r.at ?? new Date().toISOString()) : null
  const title = (r.title ?? r.message ?? '').toString().trim() || '未命名胶囊'
  const note =
    r.note != null ? r.note.toString() : r.message != null ? r.message.toString() : undefined
  const items: CapsuleItemRef[] = Array.isArray(r.items)
    ? (r.items.filter(
        (i): i is CapsuleItemRef =>
          !!i && typeof i === 'object' && 'id' in (i as object) && 'type' in (i as object),
      ) as CapsuleItemRef[])
    : []
  return {
    id: r.id ?? generateId(),
    title,
    note,
    message: note ?? title,
    items,
    createdAt: r.createdAt ?? r.at ?? new Date().toISOString(),
    at: r.createdAt ?? r.at ?? new Date().toISOString(),
    openDate: r.openDate ?? '',
    openedAt,
    opened: openedAt !== null,
    scope: (r.scope as CapsuleScope) ?? undefined,
  }
}

const capsules = ref<TimeCapsule[]>([])

function loadCapsules(): TimeCapsule[] {
  try {
    const raw = JSON.parse(storage.getKV<string>(CAPSULE_KEY, '[]'))
    return Array.isArray(raw) ? raw.map(normalizeCapsule) : []
  } catch {
    return []
  }
}

/** 从存储重新载入（数据重置/外部变更后调用） */
export function reloadCapsules() {
  capsules.value = loadCapsules()
}

function saveCapsules(data: TimeCapsule[]) {
  storage.setKV(CAPSULE_KEY, JSON.stringify(data))
}

capsules.value = loadCapsules()

/** 距开启日的天数（正数=未到；0=今日可开启；负数=已过） */
export function daysUntilOpen(openDate: string, now: Date = new Date()): number {
  const target = new Date(`${openDate}T00:00:00`)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((target.getTime() - startOfToday.getTime()) / 86400000)
}

export function useTimeCapsule() {
  // 每次访问都从存储重新同步，保证与持久化状态一致，
  // 并让模块在全局缓存失效（如数据重置）后重新加载。
  capsules.value = loadCapsules()

  /** 创建一个胶囊（默认未开启） */
  function createCapsule(
    title: string,
    openDate: string,
    items: CapsuleItemRef[] = [],
    note = '',
    scope?: CapsuleScope,
  ): TimeCapsule {
    const createdAt = new Date().toISOString()
    const capsule: TimeCapsule = {
      id: generateId(),
      title: title.trim() || '未命名胶囊',
      note: note.trim() || undefined,
      message: note.trim() || title.trim() || undefined,
      items,
      createdAt,
      at: createdAt,
      openDate,
      openedAt: null,
      opened: false,
      scope,
    }
    capsules.value = [...capsules.value, capsule]
    saveCapsules(capsules.value)
    return capsule
  }

  function getCapsule(id: string): TimeCapsule | undefined {
    return capsules.value.find(c => c.id === id)
  }

  function removeCapsule(id: string) {
    capsules.value = capsules.value.filter(c => c.id !== id)
    saveCapsules(capsules.value)
  }

  /** 开启胶囊（仅当到达开启日）；返回是否成功开启 */
  function openCapsule(id: string): boolean {
    const capsule = getCapsule(id)
    if (!capsule) return false
    if (capsule.openedAt) return true
    if (daysUntilOpen(capsule.openDate) > 0) return false
    capsule.openedAt = new Date().toISOString()
    capsule.opened = true
    capsules.value = [...capsules.value]
    saveCapsules(capsules.value)
    return true
  }

  /** 重新封存（关闭）已开启的胶囊 */
  function resealCapsule(id: string) {
    const capsule = getCapsule(id)
    if (!capsule) return
    capsule.openedAt = null
    capsule.opened = false
    capsules.value = [...capsules.value]
    saveCapsules(capsules.value)
  }

  function addItem(id: string, item: CapsuleItemRef) {
    const capsule = getCapsule(id)
    if (!capsule) return
    if (capsule.items.some(i => i.type === item.type && i.id === item.id)) return
    capsule.items = [...capsule.items, item]
    capsules.value = [...capsules.value]
    saveCapsules(capsules.value)
  }

  function removeItem(id: string, type: CapsuleItemType, itemId: string) {
    const capsule = getCapsule(id)
    if (!capsule) return
    capsule.items = capsule.items.filter(i => !(i.type === type && i.id === itemId))
    capsules.value = [...capsules.value]
    saveCapsules(capsules.value)
  }

  /** 未开启的胶囊 */
  const sealed = computed(() => capsules.value.filter(c => !c.openedAt))
  /** 已开启的胶囊 */
  const opened = computed(() => capsules.value.filter(c => c.openedAt))

  /** 是否到达开启日（可开启） */
  function isOpenable(capsule: TimeCapsule): boolean {
    return !capsule.openedAt && daysUntilOpen(capsule.openDate) <= 0
  }

  return {
    capsules,
    createCapsule,
    getCapsule,
    removeCapsule,
    openCapsule,
    resealCapsule,
    addItem,
    removeItem,
    sealed,
    opened,
    isOpenable,
    daysUntilOpen,
  }
}
