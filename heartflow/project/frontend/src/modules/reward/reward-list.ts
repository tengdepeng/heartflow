// ============================================================
// 劳酬 · 视图数据层（收支记录列表）
// 为 Reward.vue 提供标准化的 'rewards' 列表存取接口，替代视图内
// 直接的 storage.getKV('rewards') / storage.setKV('rewards') 裸调用。
//
// 说明：
//   - 原视图以 `computed(() => storage.getKV('rewards', []))` 实现「读取即最新」，
//     此处保持同一 read-through 语义（records 为 computed），以完全保留既有行为
//     与既有视图测试（Reward.test.ts）的时序约定。
//   - 视图中 storage.getConfig().display 仍由视图自身保留，本数据层只负责 'rewards'。
// ============================================================

import { computed } from 'vue'
import { storage } from '../../engine/storage'

/** 收支记录（与原视图局部结构一致） */
export interface RewardRecord {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  at: string
}

// ---- 存储键（与原视图一致）----
const REWARDS_KEY = 'rewards'

/**
 * 劳酬收支记录数据层：读取（read-through）/ 整体写入。
 */
export function useReward() {
  /** 读取即最新：访问 records.value 时从存储读取 */
  const records = computed<RewardRecord[]>(() => storage.getKV<RewardRecord[]>(REWARDS_KEY, []))

  /** 兼容组合式约定：read-through 模式下无独立缓存，此处仅触发一次读取 */
  function load(): void {
    void storage.getKV<RewardRecord[]>(REWARDS_KEY, [])
  }

  /** 整体覆盖并持久化收支记录列表 */
  function save(list: RewardRecord[]): void {
    storage.setKV(REWARDS_KEY, list)
  }

  return { records, load, save }
}
