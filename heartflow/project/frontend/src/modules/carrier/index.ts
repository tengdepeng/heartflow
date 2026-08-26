// ============================================================
// 念珠载体 · 状态管理
// ============================================================

import { ref, computed } from 'vue'
import type { JadeBeadCarrier, LifecycleStage } from './types'
import { createDefaultCarrier, type CarrierState, type BeadCountMode } from './types'
import { storage } from '../../engine/storage'
import { useWill } from '../will'
import { recordDecorationHistory } from '../decoration-history'

export type { JadeBeadCarrier, CarrierState, BeadCountMode, LifecycleStage }
export { createDefaultCarrier, BEAD_PRESETS, DEFAULT_CARRIER_COLORS, LIFECYCLE_STAGES } from './types'

function loadAll(): JadeBeadCarrier[] {
  return storage.getCarriers()
}

function saveAll(data: JadeBeadCarrier[]) {
  storage.setCarriers(data)
}

const carriers = ref<JadeBeadCarrier[]>(loadAll())

export function useCarrier() {
  function load() {
    carriers.value = loadAll()
  }

  /** 当前活跃载体 */
  const activeCarrier = computed(() =>
    carriers.value.find(c => c.active) ?? null,
  )

  /** 创建载体 */
  function create(
    name: string,
    maxBeads?: number,
  ): JadeBeadCarrier {
    const preset = (maxBeads !== undefined)
      ? { beadCount: 0, maxBeads, segments: Math.max(1, Math.floor(maxBeads / 27)) }
      : undefined

    const carrier = createDefaultCarrier(name, preset as any)
    carriers.value.push(carrier)
    saveAll(carriers.value)
    recordDecorationHistory('💎', '创建载体', `创建了载体「${name}」`)
    return carrier
  }

  /** 更新载体 */
  function update(id: string, data: Partial<JadeBeadCarrier>) {
    const c = carriers.value.find(c => c.id === id)
    if (!c) return
    Object.assign(c, data)
    saveAll(carriers.value)
    recordDecorationHistory('💎', '更新载体', `更新了载体「${c.name}」`)
  }

  /** 删除载体 */
  function remove(id: string) {
    const removed = carriers.value.find(c => c.id === id)
    carriers.value = carriers.value.filter(c => c.id !== id)
    saveAll(carriers.value)
    if (removed) {
      recordDecorationHistory('🗑', '删除载体', `删除了载体「${removed.name}」`)
    }
  }

  /** 切换活跃载体 */
  function setActive(id: string) {
    for (const c of carriers.value) {
      c.active = c.id === id
    }
    saveAll(carriers.value)
  }

  /** 拨珠（forward/backward），同时更新使用记录和生命周期 */
  function advanceBead(id: string, mode: BeadCountMode = 'forward'): CarrierState | null {
    const c = carriers.value.find(c => c.id === id)
    if (!c) return null

    const beadsPerSegment = Math.floor(c.maxBeads / storage.getConfig().lifecycle.segments) || 1
    const totalSegments = storage.getConfig().lifecycle.segments
    let currentBead: number
    let currentSegment: number

    if (mode === 'forward') {
      c.beadCount = Math.min(c.beadCount + 1, c.maxBeads)
      currentBead = c.beadCount
    } else {
      c.beadCount = Math.max(c.beadCount - 1, 0)
      currentBead = c.beadCount
    }

    currentSegment = Math.min(Math.floor(currentBead / beadsPerSegment) + 1, totalSegments)
    c.segment = currentSegment

    // 更新使用记录
    c.lastUsedAt = new Date().toISOString()
    c.usageCount = (c.usageCount || 0) + 1

    // 自动演进生命周期
    autoLifecycleCheck(c)

    saveAll(carriers.value)

    return {
      currentBead,
      currentSegment,
      totalSegments,
      beadsPerSegment,
      mode,
    }
  }

  /** 重置载体计数 */
  function resetBeads(id: string) {
    const c = carriers.value.find(c => c.id === id)
    if (!c) return
    c.beadCount = 0
    c.segment = 1
    c.lifecycleStage = 'newborn'
    c.lastUsedAt = new Date().toISOString()
    saveAll(carriers.value)
  }

  /** 获取载体状态快照 */
  function getState(id: string): CarrierState | null {
    const c = carriers.value.find(c => c.id === id)
    if (!c) return null
    const beadsPerSegment = Math.floor(c.maxBeads / storage.getConfig().lifecycle.segments) || 1
    return {
      currentBead: c.beadCount,
      currentSegment: c.segment,
      totalSegments: storage.getConfig().lifecycle.segments,
      beadsPerSegment,
      mode: 'forward',
    }
  }

  // ============================================================
  // 生命周期管理
  // ============================================================

  /**
   * 根据珠数和使用频率自动演进生命周期
   */
  function autoLifecycleCheck(c: JadeBeadCarrier): void {
    if (!c.lifecycleStage || c.lifecycleStage === 'retired') return

    const lcConfig = storage.getConfig().lifecycle
    if (!lcConfig.autoProgression) return // 用户关闭自动演进

    const ratio = c.maxBeads > 0 ? c.beadCount / c.maxBeads : 0

    // 珠数演进：newborn → growing → mature
    if (c.lifecycleStage === 'newborn' && ratio >= lcConfig.growingThreshold) {
      c.lifecycleStage = 'growing'
    } else if (c.lifecycleStage === 'growing' && ratio >= lcConfig.matureThreshold) {
      c.lifecycleStage = 'mature'
    }

    // 衰老检查：长期未使用且非退休
    if (c.lifecycleStage !== 'aging' && c.lastUsedAt) {
      const daysSinceLastUse = (Date.now() - new Date(c.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLastUse >= lcConfig.agingDays) {
        c.lifecycleStage = 'aging'
      }
    }

    // 如果再次使用，从 aging 恢复
    if (c.lifecycleStage === 'aging' && c.lastUsedAt) {
      const daysSinceLastUse = (Date.now() - new Date(c.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLastUse < lcConfig.agingDays && ratio >= lcConfig.matureThreshold) {
        c.lifecycleStage = 'mature'
      } else if (daysSinceLastUse < lcConfig.agingDays && ratio >= lcConfig.growingThreshold) {
        c.lifecycleStage = 'growing'
      }
    }
  }

  /** 手动推进载体生命周期（用户主动操作） */
  function advanceLifecycle(id: string): LifecycleStage | null {
    const c = carriers.value.find(c => c.id === id)
    if (!c || c.lifecycleStage === 'retired') return null

    const stageOrder: LifecycleStage[] = ['newborn', 'growing', 'mature', 'aging']
    const currentIdx = stageOrder.indexOf(c.lifecycleStage!)
    if (currentIdx >= stageOrder.length - 1) return c.lifecycleStage!

    c.lifecycleStage = stageOrder[currentIdx + 1]!
    saveAll(carriers.value)
    return c.lifecycleStage
  }

  /** 退休载体（自动生成遗志） */
  function retireCarrier(id: string, insights?: string[], goalSummary?: string | null): boolean {
    const c = carriers.value.find(c => c.id === id)
    if (!c || c.lifecycleStage === 'retired') return false
    c.lifecycleStage = 'retired'
    c.active = false
    saveAll(carriers.value)

    // 自动生成遗志
    try {
      const will = useWill()
      will.createFromCarrier(c, insights ?? [], goalSummary ?? null)
    } catch {
      // 遗志生成失败不阻断载体退休
    }

    return true
  }

  /** 传承：将源载体的珠数精华传承给目标载体（自动关联遗志） */
  function inheritCarrier(sourceId: string, targetId: string, willId?: string): boolean {
    const source = carriers.value.find(c => c.id === sourceId)
    const target = carriers.value.find(c => c.id === targetId)
    if (!source || !target) return false
    if (source.lifecycleStage === 'retired') return false

    // 传承逻辑：源载体部分珠数转移到目标载体（比例由用户配置）
    const lcConfig = storage.getConfig().lifecycle
    const beadsToTransfer = Math.floor(source.beadCount * lcConfig.inheritRatio)
    target.beadCount = Math.min(target.beadCount + beadsToTransfer, target.maxBeads)

    // 更新传承关系
    source.inheritedTo = targetId
    target.inheritedFrom = sourceId

    // 源载体退休
    source.lifecycleStage = 'retired'
    source.active = false

    // 目标载体进化为 growing（如果处于 newborn）
    if (target.lifecycleStage === 'newborn') {
      const ratio = target.maxBeads > 0 ? target.beadCount / target.maxBeads : 0
      if (ratio >= lcConfig.growingThreshold) {
        target.lifecycleStage = 'growing'
      }
    }

    // 自动关联遗志继承
    try {
      const will = useWill()
      // 如果指定了遗志 ID，直接继承；否则查找源载体的遗志
      const targetWillId = willId ?? will.getByCarrierId(sourceId)?.id
      if (targetWillId) {
        will.inheritWill(targetWillId, targetId)
      }
    } catch {
      // 遗志继承失败不阻断传承
    }

    // 更新段数
    const segments = storage.getConfig().lifecycle.segments
    const beadsPerSegment = Math.floor(target.maxBeads / segments) || 1
    target.segment = Math.min(Math.floor(target.beadCount / beadsPerSegment) + 1, segments)

    saveAll(carriers.value)
    return true
  }

  /** 获取所有载体（包括已退休的） */
  function getAll(): JadeBeadCarrier[] {
    return [...carriers.value]
  }

  /** 获取活跃的载体（排除退休的） */
  function getActiveCarriers(): JadeBeadCarrier[] {
    return carriers.value.filter(c => c.lifecycleStage !== 'retired')
  }

  return {
    carriers,
    activeCarrier,
    load,
    create,
    update,
    remove,
    setActive,
    advanceBead,
    resetBeads,
    getState,
    // 生命周期方法
    advanceLifecycle,
    retireCarrier,
    inheritCarrier,
    getAll,
    getActiveCarriers,
  }
}
