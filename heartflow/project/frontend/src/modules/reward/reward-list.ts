// ============================================================
// 劳酬 · 视图数据层（收支记录列表）
// 为 Reward.vue 提供标准化的 'rewards' 列表存取接口，替代视图内
// 直接的 storage.getKV('rewards') / storage.setKV('rewards') 裸调用。
//
// 说明：
//   - records 曾用 `computed(() => storage.getKV('rewards', []))` 实现
//     read-through，但 getKV 是无响应的普通读取，computed 无法把它作为
//     依赖追踪，导致 save 后 records 不再重算、界面不能即时刷新
//     （本地浏览器实测：保存历史账后时间线/周期面板需手动刷新才出现）。
//     故改为响应式 ref 缓存：save() 同步更新 value，load() 提供手动重载。
//   - 视图中 storage.getConfig().display 仍由视图自身保留，本数据层只负责 'rewards'。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 收支记录（与原视图局部结构一致；记账 v2 新增可选字段） */
export interface RewardRecord {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  at: string
  /** 归属账户 id，缺省 'cash' */
  account?: string
  /** 导入/账本配对的业务单号，用于去重 */
  bizId?: string
  /** 标签列表，用于多维度筛选 */
  tags?: string[]
  /** 已归档（默认在明细面板隐藏但计入聚合） */
  archived?: boolean
}

// ---- 存储键（与原视图一致）----
const REWARDS_KEY = 'rewards'

/**
 * 劳酬收支记录数据层：响应式缓存 + 整体写入。
 */
export function useReward() {
  /** 保存于内存的响应式缓存；save() 同步更新，load() 可重读外部变更 */
  const records = ref<RewardRecord[]>(storage.getKV<RewardRecord[]>(REWARDS_KEY, []))

  /** 从存储重新读取（可用于反映其它模块写入，如 milestones） */
  function load(): void {
    records.value = storage.getKV<RewardRecord[]>(REWARDS_KEY, [])
  }

  /** 整体覆盖并持久化收支记录列表，同时即时刷新内存视图 */
  function save(list: RewardRecord[]): void {
    storage.setKV(REWARDS_KEY, list)
    records.value = list
  }

  return { records, load, save }
}
