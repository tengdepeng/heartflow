// ============================================================
// 字镜阁 · 文字分析历史 & 词汇库 数据层
// 将 WordMirror.vue 中裸 storage 的「分析历史」(history, hf:word_history)
// 与「词汇库」(words, hf:word_mirror) 下沉为组合式函数，统一读取 / 写入。
// 文字分析本身的派生状态（analysis）属于 UI 状态，仍留在视图层。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 文字分析历史项 */
export interface HItem {
  id: string
  text: string
  topWords: string[]
  mood: string
  at: string
}

/** 词汇库条目 */
export interface WordItem {
  id: string
  word: string
  definition: string
  proficiency: number // 1-5
  favorite: boolean
  createdAt: string
  /** 最后复习时间（点击星级 = 一次复习）。可选：旧数据可能缺失（F8 回退到 createdAt） */
  lastReviewedAt?: string
}

const HK = 'hf:word_history'
const WK = 'hf:word_mirror'

// 模块级单例：跨组件实例共享
const history = ref<HItem[]>([])
const words = ref<WordItem[]>([])

export function useWordMirror() {
  /** 从存储载入分析历史 */
  function loadHistory() {
    try {
      history.value = storage.getKV<HItem[]>(HK, [])
    } catch {
      history.value = []
    }
  }

  /** 持久化分析历史 */
  function saveHistory() {
    storage.setKV(HK, history.value)
  }

  /** 从存储载入词汇库 */
  function loadWords() {
    try {
      words.value = storage.getKV<WordItem[]>(WK, [])
    } catch {
      words.value = []
    }
  }

  /** 持久化词汇库 */
  function saveWords() {
    storage.setKV(WK, words.value)
  }

  /** 载入全部（history + words），供视图 onMounted 调用 */
  function load() {
    loadHistory()
    loadWords()
  }

  return {
    history,
    words,
    load,
    loadHistory,
    loadWords,
    saveHistory,
    saveWords,
  }
}
