// ============================================================
// 知微阁 · 对话历史数据层
// 将 WisdomPavilion 视图中裸 storage 的「对话历史」下沉为组合式函数。
// 存储键与历史实现保持一致（hf:wisdom_history），确保既有记录不丢失。
// 注意：本文件独立于已有的 useWisdom（知微记录 CRUD），避免回归。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const WISDOM_HISTORY_KEY = 'hf:wisdom_history'

export interface HistoryItem {
  id: string
  q: string
  a: string
  at: string
}

// 模块级单例：跨组件实例共享同一份对话历史
const history = ref<HistoryItem[]>([])

export function useWisdomHistory() {
  function load() {
    history.value = storage.getKV<HistoryItem[]>(WISDOM_HISTORY_KEY, [])
  }

  function save() {
    storage.setKV(WISDOM_HISTORY_KEY, history.value)
  }

  return {
    items: history,
    load,
    save,
  }
}
