// ============================================================
// 未完成花园 · 数据层
// 为 UnfinishedGarden.vue 提供标准化的存取接口，
// 替代视图内直接的 storage.getKV('hf:unfinished_v2') /
// storage.getKV('hf:seeds') / storage.setKV(...) 裸调用。
//
// 同时管理两类数据：
//   - 未完成事项 items（键 hf:unfinished_v2）
//   - 种子 seeds（键 hf:seeds）
// 二者相互独立，使用各自的 ref 与存储键。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 未完成事项 */
export interface UItem {
  id: string
  type: 'seed' | 'book' | 'draft'
  text: string
  progress?: string
  status?: 'active' | 'paused' | 'abandoned'
  sprouted?: boolean
  at: string
  updatedAt?: string
  completed?: boolean
  completedAt?: string
  dormantSince?: string
}

const UNFINISHED_KEY = 'hf:unfinished_v2'
const SEEDS_KEY = 'hf:seeds'

// 模块级单例：所有消费方共享同一份未完成花园数据
const items = ref<UItem[]>([])
const seeds = ref<any[]>([])

/**
 * 未完成花园数据层：事项 + 种子的读取 / 写入
 */
export function useUnfinished() {
  /** 从存储载入未完成事项 */
  function load(): void {
    items.value = storage.getKV<UItem[]>(UNFINISHED_KEY, [])
  }

  /** 整体持久化未完成事项 */
  function save(): void {
    storage.setKV(UNFINISHED_KEY, items.value)
  }

  /** 从存储载入种子 */
  function loadSeeds(): void {
    seeds.value = storage.getKV(SEEDS_KEY, [])
  }

  /** 持久化种子 */
  function saveSeeds(): void {
    storage.setKV(SEEDS_KEY, seeds.value)
  }

  return { items, seeds, load, save, loadSeeds, saveSeeds }
}
