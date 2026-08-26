// ============================================================
// 岁时阁 · 蜕变光茧 · 持久化存储层
// 蓝图定义：光茧记录个人成长阶段（孕育→破茧→化蝶→飞翔）。
// 颜色代表驱动力类型，大小代表蜕变深度，纹理代表蜕变类型。
//
// 此前光茧仅在 seasonal-bridge 中以本地 ref 暂存，刷新即丢失。
// 本模块提供跨会话持久化的单一数据源，供岁时阁与蜕变画廊共享。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import {
  createCocoon as createCocoonFn,
  advanceCocoon as advanceCocoonFn,
  regressCocoon as regressCocoonFn,
  computeCocoonStats,
  COCOON_STAGE_LABELS,
  COCOON_STAGE_COLORS,
  COCOON_STAGE_ICONS,
} from './cocoon'
import type { Cocoon, CocoonStage, DrivingForce, CocoonTexture } from './cocoon'
import type { Season } from './types'

const COCOON_KEY = 'hf:seasonal_cocoons'

function loadCocoons(): Cocoon[] {
  try {
    return storage.getKV<Cocoon[]>(COCOON_KEY, [])
  } catch {
    return []
  }
}

function saveCocoons(list: Cocoon[]): void {
  storage.setKV(COCOON_KEY, list)
}

// 模块级单一数据源（与 useGoal 同一模式）
const cocoons = ref<Cocoon[]>(loadCocoons())

export type { Cocoon, CocoonStage, Season, DrivingForce, CocoonTexture }
export {
  COCOON_STAGE_LABELS,
  COCOON_STAGE_COLORS,
  COCOON_STAGE_ICONS,
  computeCocoonStats,
}

export function useCocoonStore() {
  /** 创建光茧并持久化 */
  function createCocoon(
    name: string,
    season?: Season,
    lifeRitualId?: string,
    lifeRitualName?: string,
    relatedGoalId?: string,
    drivingForce?: DrivingForce,
    extra?: Partial<Cocoon>,
  ): Cocoon {
    const cocoon = createCocoonFn(
      name,
      season || getCurrentSeasonFallback(),
      lifeRitualId,
      lifeRitualName,
      relatedGoalId,
      drivingForce,
      extra,
    )
    cocoons.value.unshift(cocoon)
    saveCocoons(cocoons.value)
    return cocoon
  }

  /** 推进光茧阶段并持久化 */
  function advanceCocoon(cocoonId: string, to: CocoonStage, reason?: string): Cocoon | null {
    const idx = cocoons.value.findIndex(c => c.id === cocoonId)
    if (idx === -1) return null
    const updated = advanceCocoonFn(cocoons.value[idx], to, reason)
    cocoons.value[idx] = updated
    saveCocoons(cocoons.value)
    return updated
  }

  /** 回退光茧阶段并持久化 */
  function regressCocoon(cocoonId: string, reason?: string): Cocoon | null {
    const idx = cocoons.value.findIndex(c => c.id === cocoonId)
    if (idx === -1) return null
    const updated = regressCocoonFn(cocoons.value[idx], reason)
    cocoons.value[idx] = updated
    saveCocoons(cocoons.value)
    return updated
  }

  /** 更新光茧字段（颜色/纹理/深度/前后状态/中断等） */
  function updateCocoon(cocoonId: string, fields: Partial<Pick<Cocoon,
    'name' | 'note' | 'drivingForce' | 'drivingForceDescription' | 'size' | 'texture' | 'beforeState' | 'afterState' | 'interrupted' | 'interruptionDescription' | 'tags'>>): void {
    const idx = cocoons.value.findIndex(c => c.id === cocoonId)
    if (idx === -1) return
    cocoons.value[idx] = { ...cocoons.value[idx], ...fields, updatedAt: new Date().toISOString() }
    saveCocoons(cocoons.value)
  }

  /** 删除光茧 */
  function removeCocoon(cocoonId: string): void {
    cocoons.value = cocoons.value.filter(c => c.id !== cocoonId)
    saveCocoons(cocoons.value)
  }

  /** 根据关联目标 ID 查找光茧 */
  function findByGoalId(goalId: string): Cocoon[] {
    return cocoons.value.filter(c => c.relatedGoalId === goalId)
  }

  /** 持久化统计 */
  const stats = computed(() => computeCocoonStats(cocoons.value))

  return {
    cocoons,
    createCocoon,
    advanceCocoon,
    regressCocoon,
    updateCocoon,
    removeCocoon,
    findByGoalId,
    stats,
  }
}

// 与 seasonal-bridge 保持一致的当前季节回退
function getCurrentSeasonFallback(): Season {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}
