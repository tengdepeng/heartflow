// ============================================================
// 逸趣阁 · 时间种子数据层
// 将 PlayGallery.vue 中裸 storage 的「时间种子」(seeds)
// 下沉为组合式函数，统一读取 / 写入。
// 注意：本文件的 TimeSeed 与 ./time-seed 的 TimeSeed 是两套不同
// 结构（此处为「心情种子」生长系统），故不在 parallel-world 桶中
// 以同名导出，避免与 ./time-seed 的 TimeSeed 冲突。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 时间种子（心情种子 / 生长阶段系统） */
export interface TimeSeed {
  id: string
  content: string
  mood: 'happy' | 'calm' | 'sad' | 'excited' | 'tired'
  createdAt: string
  waterCount?: number
  lastWateredAt?: string
}

const SEEDS_KEY = 'hf:play_seeds'

// 模块级单例：跨组件实例共享同一份种子列表
const seeds = ref<TimeSeed[]>([])

export function usePlaySeeds() {
  /** 从存储载入时间种子 */
  function load() {
    try {
      seeds.value = storage.getKV<TimeSeed[]>(SEEDS_KEY, [])
    } catch {
      seeds.value = []
    }
  }

  /** 覆盖并持久化时间种子列表 */
  function save(list: TimeSeed[]) {
    seeds.value = list
    storage.setKV(SEEDS_KEY, list)
  }

  return { seeds, load, save }
}
