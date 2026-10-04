// ============================================================
// 阅览殿 · 阅读内容数据层
// 为 ReadingHall.vue 提供标准化的存取接口，
// 替代视图内直接的 storage.getKV('hf:reading_excerpts') /
// storage.getKV('hf:reading_text') / storage.setKV(...) 裸调用。
//
// 同时管理两类内容：
//   - 正文 readingText（键 hf:reading_text）
//   - 摘录 excerpts（键 hf:reading_excerpts）
// 二者相互独立，使用各自的 ref 与存储键。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 摘录 */
export interface Excerpt {
  id: string
  source: string
  text: string
  note: string
  createdAt: string
  /** 多色标记色（INCR-477；未设时按默认琥珀渲染） */
  color?: string
}

const STORAGE_KEY_TEXT = 'hf:reading_text'
const STORAGE_KEY_EXCERPTS = 'hf:reading_excerpts'

// 模块级单例：所有消费方共享同一份阅读内容
const readingText = ref<string>('')
const excerpts = ref<Excerpt[]>([])

/**
 * 阅读内容数据层：正文 + 摘录的读取 / 写入
 */
export function useReading() {
  /** 从存储载入正文与摘录 */
  function load(): void {
    readingText.value = storage.getKV<string>(STORAGE_KEY_TEXT, '')
    excerpts.value = storage.getKV<Excerpt[]>(STORAGE_KEY_EXCERPTS, [])
  }

  /** 整体持久化正文与摘录 */
  function save(): void {
    storage.setKV(STORAGE_KEY_TEXT, readingText.value)
    storage.setKV(STORAGE_KEY_EXCERPTS, excerpts.value)
  }

  /** 仅持久化正文 */
  function saveText(): void {
    storage.setKV(STORAGE_KEY_TEXT, readingText.value)
  }

  /** 仅持久化摘录 */
  function saveExcerpts(): void {
    storage.setKV(STORAGE_KEY_EXCERPTS, excerpts.value)
  }

  return { readingText, excerpts, load, save, saveText, saveExcerpts }
}
