// ============================================================
// 平行世界 · 可能性自我 & 抉择分叉 数据层
// 将 ParallelWorld.vue 中裸 storage 的「可能性自我」(altSelves)
// 与「抉择分叉」(forks) 下沉为组合式函数，统一读取 / 写入 / 增删。
// 只读关联的梦境数据 (hf:dreams) 由视图层自行处理，不在本组合式内。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 抉择分叉 */
export interface Fork {
  id: string
  description: string
  chosen: string
  alternative: string
  date: string
  at: string
}

/** 可能性自我 */
export interface AltSelf {
  id: string
  title: string
  desc: string
  icon: string
  color: string
  expanded: boolean
  originForkId: string | null
}

const K_FORKS = 'hf:decision_forks'
const K_ALTS = 'hf:parallel_alts'

// 模块级单例：跨组件实例共享同一份数据
const forks = ref<Fork[]>([])
const alts = ref<AltSelf[]>([])

export function useParallelSelves() {
  /** 从存储载入抉择分叉 */
  function loadForks() {
    try {
      forks.value = storage.getKV<Fork[]>(K_FORKS, [])
    } catch {
      forks.value = []
    }
  }

  /** 持久化抉择分叉 */
  function saveForks() {
    storage.setKV(K_FORKS, forks.value)
  }

  /** 从存储载入可能性自我 */
  function loadAlts() {
    try {
      alts.value = storage.getKV<AltSelf[]>(K_ALTS, [])
    } catch {
      alts.value = []
    }
  }

  /** 持久化可能性自我 */
  function saveAlts() {
    storage.setKV(K_ALTS, alts.value)
  }

  /** 载入全部（forks + alts），供视图 onMounted 调用 */
  function load() {
    loadForks()
    loadAlts()
  }

  return {
    forks,
    alts,
    load,
    loadForks,
    loadAlts,
    saveForks,
    saveAlts,
  }
}
