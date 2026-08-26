// ============================================================
// 时光胶囊 · 时间胶囊系统（蓝图17 P2 · 平行世界·梦境区）
// 把笔记/结晶封存为未来开启的「胶囊」：未到开启日隐藏内容，
// 到达开启日可开启并回看当年封存的心流碎片。
// 本地优先：与笔记同源存储，可重建。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

/** 胶囊内引用的条目类型 */
export type CapsuleItemType = 'note' | 'crystal'

/** 胶囊内引用的条目（轻量指针，避免重复存储正文） */
export interface CapsuleItemRef {
  type: CapsuleItemType
  id: string
  title: string
}

/** 时光胶囊 */
export interface TimeCapsule {
  id: string
  title: string
  note?: string
  items: CapsuleItemRef[]
  createdAt: string
  /** 开启日（YYYY-MM-DD），到达当日即可开启 */
  openDate: string
  /** 已开启时间；null 表示仍未开启 */
  openedAt: string | null
}

const CAPSULE_KEY = 'hf:time_capsules'

function loadCapsules(): TimeCapsule[] {
  try {
    return JSON.parse(storage.getKV<string>(CAPSULE_KEY, '[]')) as TimeCapsule[]
  } catch {
    return []
  }
}

function saveCapsules(data: TimeCapsule[]) {
  storage.setKV(CAPSULE_KEY, JSON.stringify(data))
}

const capsules = ref<TimeCapsule[]>(loadCapsules())

function generateId(): string {
  return `capsule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

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
  ): TimeCapsule {
    const capsule: TimeCapsule = {
      id: generateId(),
      title: title.trim() || '未命名胶囊',
      note: note.trim() || undefined,
      items,
      createdAt: new Date().toISOString(),
      openDate,
      openedAt: null,
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
    capsules.value = [...capsules.value]
    saveCapsules(capsules.value)
    return true
  }

  /** 重新封存（关闭）已开启的胶囊 */
  function resealCapsule(id: string) {
    const capsule = getCapsule(id)
    if (!capsule) return
    capsule.openedAt = null
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
