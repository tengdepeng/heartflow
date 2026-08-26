// ============================================================
// 留光阁 · 视图数据层（财富目标 + 专项规划）
// 为 LightPavilion.vue 提供标准化的存取接口，替代视图内直接的
// storage.getKV('hf:wealth_target' / 'hf:special_plans') /
// storage.setKV(...) 裸调用。
//
// 注意：
//   - 'hf:wealth_target' 以「字符串」形态存储，读取时转回数值，
//     写入时转回字符串 —— 与原视图保持一致。
//   - SpecialPlan 复用 ../goal/types 的既有类型定义。
//   - 本文件与 light/pavilion.ts 的 useLightPavilion（冥想/释怀）
//     互不冲突，二者管理不同的存储键。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { SpecialPlan } from '../goal/types'

// ---- 存储键（与原视图一致）----
const WEALTH_TARGET_KEY = 'hf:wealth_target'
const SPECIAL_PLANS_KEY = 'hf:special_plans'

// ---- 模块级单例 ----
const wealthTarget = ref<number>(0)
const specialPlans = ref<SpecialPlan[]>([])

/**
 * 留光阁视图数据层：财富目标（数值⇄字符串）与专项规划。
 */
export function useLightPavilionData() {
  /** 从存储载入财富目标与专项规划 */
  function load(): void {
    wealthTarget.value = Number(storage.getKV(WEALTH_TARGET_KEY, 0))
    specialPlans.value = storage.getKV<SpecialPlan[]>(SPECIAL_PLANS_KEY, [])
  }

  /** 设置并持久化财富目标（以字符串形态存储） */
  function saveWealthTarget(value: number): void {
    wealthTarget.value = value
    storage.setKV(WEALTH_TARGET_KEY, String(value))
  }

  /** 整体覆盖并持久化专项规划列表 */
  function saveSpecialPlans(list: SpecialPlan[]): void {
    specialPlans.value = list
    storage.setKV(SPECIAL_PLANS_KEY, list)
  }

  return { wealthTarget, specialPlans, load, saveWealthTarget, saveSpecialPlans }
}
