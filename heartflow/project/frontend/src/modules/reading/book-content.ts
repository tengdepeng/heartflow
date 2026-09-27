// ============================================================
// 阅览殿 · 按书正文存储
// 取代「全局单字符串 hf:reading_text」的范式：
// 每本书的正文独立存于 hf:reading:content:<bookId>，
// 与 Book 元数据（hf:reading:books）解耦，支持多书 + 续读。
//
// 存储约束（见 storage/core.ts）：
//   Web 端 localStorage 隐性 ~5MB 上限且每次全量重写，
//   故大正文应走 Tauri 明文文件后端或后续 SQLite 分域后端；
//   此处仅负责本域 key 的读写，承载中等长度文本（txt / epub 提取文本）。
// ============================================================

import { storage } from '../../engine/storage'

/** 按书正文 key 前缀（与 hf:reading:* 命名一致） */
export const BOOK_CONTENT_PREFIX = 'hf:reading:content:'

function contentKey(bookId: string): string {
  return `${BOOK_CONTENT_PREFIX}${bookId}`
}

/** 保存某本书的正文（覆盖写） */
export function saveBookContent(bookId: string, text: string): void {
  if (!bookId) return
  storage.setKV(contentKey(bookId), text)
}

/** 读取某本书的正文，无则返回空串 */
export function getBookContent(bookId: string): string {
  if (!bookId) return ''
  return storage.getKV<string>(contentKey(bookId), '')
}

/** 删除某本书的正文（书被移除时调用，避免孤儿数据） */
export function removeBookContent(bookId: string): void {
  if (!bookId) return
  storage.removeKV?.(contentKey(bookId))
  // removeKV 可能未实现（旧引擎），用覆盖式清空兜底
  try { storage.setKV(contentKey(bookId), '') } catch { /* noop */ }
}

/** 是否存在某本书的正文 */
export function hasBookContent(bookId: string): boolean {
  return getBookContent(bookId).length > 0
}
