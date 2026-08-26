// ============================================================
// 先祖遗志 · 核心逻辑
// 载体退休时自动生成遗志，新载体可继承
// ============================================================

import { ref, computed } from 'vue'
import type { Will, WillGrade } from './types'
import { WILL_GRADE_THRESHOLDS, STORAGE_KEY } from './types'
import type { JadeBeadCarrier } from '../../types'
import { storage } from '../../engine/storage'

export type { Will, WillGrade }
export { WILL_GRADES, WILL_GRADE_THRESHOLDS } from './types'
export { useTestament, TESTAMENT_TYPE_LABELS, TESTAMENT_TYPE_ICONS, TESTAMENT_STATUS_LABELS, TRIGGER_LABELS } from './testament'
export type { TestamentType, TestamentTrigger, TestamentStatus, Testament, TestamentClause, Beneficiary, ExecutionRitual, RitualLogEntry, TestamentStats } from './testament'

// ---- 数据加载 ----

function loadAll(): Will[] {
  return storage.getKV<Will[]>(STORAGE_KEY, [])
}

function saveAll(data: Will[]) {
  storage.setKV(STORAGE_KEY, data)
}

const wills = ref<Will[]>(loadAll())

export function useWill() {
  function load() {
    wills.value = loadAll()
  }

  /** 获取所有遗志 */
  const allWills = computed(() => wills.value)

  /** 获取未继承的遗志 */
  const uninheritedWills = computed(() =>
    wills.value.filter(w => !w.inheritedByCarrierId),
  )

  /** 获取已继承的遗志 */
  const inheritedWills = computed(() =>
    wills.value.filter(w => w.inheritedByCarrierId),
  )

  /** 根据载体 ID 获取遗志 */
  function getByCarrierId(carrierId: string): Will | undefined {
    return wills.value.find(w => w.sourceCarrierId === carrierId)
  }

  /** 根据遗志 ID 获取 */
  function getById(id: string): Will | undefined {
    return wills.value.find(w => w.id === id)
  }

  /** 获取传承链（从指定遗志追溯到最早的祖先） */
  function getInheritanceChain(willId: string): Will[] {
    const chain: Will[] = []
    let current = wills.value.find(w => w.id === willId)
    while (current) {
      chain.unshift(current)
      current = current.parentWillId
        ? wills.value.find(w => w.id === current!.parentWillId)
        : undefined
    }
    return chain
  }

  /**
   * 从退休载体生成遗志
   * 在载体退休时调用
   */
  function createFromCarrier(
    carrier: JadeBeadCarrier,
    insights: string[],
    goalSummary: string | null,
  ): Will {
    // 根据 usageCount 判定遗志等级
    const usageCount = carrier.usageCount ?? 0
    const grade: WillGrade = (() => {
      if (usageCount >= WILL_GRADE_THRESHOLDS.heritage) return 'heritage'
      if (usageCount >= WILL_GRADE_THRESHOLDS.essence) return 'essence'
      return 'common'
    })()

    // 查找是否有父遗志（该载体继承的遗志）
    const prevWill = wills.value.find(
      w => w.inheritedByCarrierId === carrier.id,
    )

    // 检查是否存在重复遗志
    const existing = wills.value.find(w => w.sourceCarrierId === carrier.id)
    if (existing) {
      // 已存在则更新
      const idx = wills.value.findIndex(w => w.id === existing.id)
      if (idx !== -1) {
        const updated = {
          ...existing,
          grade,
          description: carrier.name + '的传承',
          insights,
          goalSummary,
          carrierSnapshot: {
            name: carrier.name,
            maxBeads: carrier.maxBeads,
            finalBeadCount: carrier.beadCount,
            colors: { ...carrier.colors },
            usageCount,
          },
        }
        wills.value[idx] = updated
        saveAll(wills.value)
        return updated
      }
    }

    const will: Will = {
      id: `will_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${carrier.name}的遗志`,
      grade,
      description: carrier.name + '的传承',
      insights,
      goalSummary,
      carrierSnapshot: {
        name: carrier.name,
        maxBeads: carrier.maxBeads,
        finalBeadCount: carrier.beadCount,
        colors: { ...carrier.colors },
        usageCount,
      },
      sourceCarrierId: carrier.id,
      inheritedByCarrierId: null,
      createdAt: new Date().toISOString(),
      inheritedAt: null,
      parentWillId: prevWill?.id ?? null,
    }

    wills.value.push(will)
    saveAll(wills.value)
    return will
  }

  /**
   * 继承遗志
   * 新载体创建时调用
   */
  function inheritWill(willId: string, carrierId: string): Will | null {
    const will = wills.value.find(w => w.id === willId)
    if (!will || will.inheritedByCarrierId) return null

    will.inheritedByCarrierId = carrierId
    will.inheritedAt = new Date().toISOString()

    const idx = wills.value.findIndex(w => w.id === willId)
    if (idx !== -1) {
      wills.value[idx] = { ...will }
      saveAll(wills.value)
    }

    return will
  }

  /** 删除遗志 */
  function remove(id: string) {
    wills.value = wills.value.filter(w => w.id !== id)
    saveAll(wills.value)
  }

  /** 清空所有遗志 */
  function clear() {
    wills.value = []
    saveAll(wills.value)
  }

  return {
    load,
    allWills,
    uninheritedWills,
    inheritedWills,
    getByCarrierId,
    getById,
    getInheritanceChain,
    createFromCarrier,
    inheritWill,
    remove,
    clear,
  }
}