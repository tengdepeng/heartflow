// ============================================================
// 时间长廊 · 搜索历史 / 保存的搜索 存储接线
//
// 背景：timeline-filters.ts 里的 createSearchHistoryManager /
// createSavedSearchManager 是「工厂函数」，不直接依赖 storage，
// 读写函数由调用方注入。本文件负责把项目的 storage.getKV/setKV
// 注入进去，让这两个能力真正落盘（此前全库零 UI 消费）。
//
// 存储键（由 factories 内部持有，本文件不重复定义）：
//   hf:timeline:search_history
//   hf:timeline:saved_searches
// ============================================================

import { storage } from '../../engine/storage'
import { createSearchHistoryManager, createSavedSearchManager } from './timeline-filters'

/**
 * 读出原始 JSON 串。
 * factories 内部走 JSON.parse，所以这里必须给字符串；
 * 若历史脏数据被存成了对象（非字符串），就地序列化救回，
 * 避免 JSON.parse("[object Object]") 抛错被静默吞成空列表。
 */
function readRaw(key: string): string | null {
  const v = storage.getKV<unknown>(key, null)
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? v : JSON.stringify(v)
}

function writeRaw(key: string, value: string): void {
  storage.setKV(key, value)
}

/** 搜索历史（上限 50，由工厂内部裁剪） */
export const searchHistoryManager = createSearchHistoryManager(readRaw, writeRaw)

/** 保存的搜索 */
export const savedSearchManager = createSavedSearchManager(readRaw, writeRaw)
