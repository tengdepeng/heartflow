// ============================================================
// 装修历史记录 · 通用工具
// 各编辑器（场景/环境/载体/交互等）保存时调用 record()，
// 供 DecorationWorkshop 展示最近装修记录。
// ============================================================

import { ref } from 'vue'
import { storage } from '../engine/storage'

const HISTORY_KEY = 'hf:decoration_history'

export interface DecorationHistoryItem {
  id: string
  icon: string
  action: string
  detail: string
  time: string
}

const MAX_HISTORY = 50

// 模块级响应式历史列表，所有消费方共享
const historyItems = ref<DecorationHistoryItem[]>([])

/** 加载历史记录（由 DecorationWorkshop 在 onMounted 调用） */
export function loadDecorationHistory(): void {
  try {
    historyItems.value = storage.getKV<DecorationHistoryItem[]>(HISTORY_KEY, [])
  } catch {
    historyItems.value = []
  }
}

export function recordDecorationHistory(icon: string, action: string, detail: string): void {
  try {
    const item: DecorationHistoryItem = {
      id: `dh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      icon,
      action,
      detail,
      time: new Date().toISOString(),
    }
    const history = storage.getKV<DecorationHistoryItem[]>(HISTORY_KEY, [])
    history.unshift(item)
    if (history.length > MAX_HISTORY) {
      history.length = MAX_HISTORY
    }
    storage.setKV(HISTORY_KEY, history)
    // 同步更新模块级响应式 ref
    historyItems.value = [...history]
  } catch {
    // 历史记录失败不阻断主流程
  }
}

/** 响应式历史列表（供 DecorationWorkshop 直接使用） */
export function useDecorationHistory() {
  return { historyItems, load: loadDecorationHistory }
}