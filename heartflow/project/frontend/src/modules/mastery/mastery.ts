// ============================================================
// 知微阁 · 掌握度引擎（Khan Academy / Readable 启发）
// ------------------------------------------------------------
// 借鉴「知识掌握度追踪」：每个知识点维护掌握度 0-100，随自我测验
// 反馈滑动更新（难点增长更慢、饱和得更快），映射 待学/练习中/已通晓
// 三态。全部本地，守宪法第1条本地私有 / 拒绝 XP 排行积分。
// 纯函数核心（可单测）+ 轻量持久化，供 MasteryPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 掌握状态 */
export type MasteryState = 'new' | 'learning' | 'mastered'

/** 知识点 */
export interface MasteryItem {
  id: string
  topic: string
  /** 掌握度 0-100 */
  confidence: number
  /** 练习次数 */
  attempts: number
  lastScore?: number
  /** 难度系数（1 普通，>1 更难） */
  difficulty: number
  updatedAt: string
}

export interface MasteryStats {
  total: number
  mastered: number
  learning: number
  fresh: number
  average: number
}

export const MASTERY_THRESHOLDS = { mastered: 80, learning: 40 } as const

export const MASTERY_STATE_META: Record<MasteryState, { label: string; icon: string; color: string }> = {
  new: { label: '待学', icon: '🌱', color: '#9ca3af' },
  learning: { label: '练习中', icon: '🌿', color: '#f0c040' },
  mastered: { label: '已通晓', icon: '🌳', color: '#34d399' },
}

const STORAGE_KEY = 'hf:mastery_items'

// ============================================================
// 纯函数核心
// ============================================================

/** 掌握状态映射 */
export function masteryStateFor(confidence: number): MasteryState {
  if (confidence >= MASTERY_THRESHOLDS.mastered) return 'mastered'
  if (confidence >= MASTERY_THRESHOLDS.learning) return 'learning'
  return 'new'
}

/** 应用一次测验反馈（0-100）：难点增长慢、已通晓后增长更快饱和 */
export function applyFeedback(item: MasteryItem, score: number): MasteryItem {
  const s = Math.min(100, Math.max(0, score))
  const target = masteryStateFor(item.confidence)
  const increment = 0.28 * s / (1 + 0.5 * item.difficulty)
  let confidence = item.confidence
  if (target === 'mastered') confidence += increment * 0.6
  else confidence += increment
  confidence = Math.max(0, Math.min(100, confidence))
  // 得分过低会回落
  if (s < 40) confidence = Math.max(0, confidence - (40 - s) * 0.5)
  return {
    ...item,
    confidence: Math.round(confidence),
    attempts: item.attempts + 1,
    lastScore: s,
    updatedAt: new Date().toISOString(),
  }
}

/** 掌握度统计 */
export function computeMasteryStats(items: MasteryItem[]): MasteryStats {
  const mastered = items.filter((i) => masteryStateFor(i.confidence) === 'mastered').length
  const learning = items.filter((i) => masteryStateFor(i.confidence) === 'learning').length
  const fresh = items.filter((i) => masteryStateFor(i.confidence) === 'new').length
  const average = items.length ? Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length) : 0
  return { total: items.length, mastered, learning, fresh, average }
}

/** 按掌握度升序（待加强优先） */
export function sortByWeakness(items: MasteryItem[]): MasteryItem[] {
  return items.slice().sort((a, b) => a.confidence - b.confidence)
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadItems(): MasteryItem[] {
  try {
    return storage.getKV<MasteryItem[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

export function useMastery() {
  const items = ref<MasteryItem[]>(loadItems())

  function persist(): void {
    storage.setKV(STORAGE_KEY, items.value)
  }
  function addItem(topic: string, difficulty = 1): MasteryItem {
    const item: MasteryItem = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      topic: topic.trim(),
      confidence: 0,
      attempts: 0,
      difficulty,
      updatedAt: new Date().toISOString(),
    }
    items.value.push(item)
    persist()
    return item
  }
  function removeItem(id: string): void {
    items.value = items.value.filter((i) => i.id !== id)
    persist()
  }
  function recordScore(id: string, score: number): MasteryItem | undefined {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx < 0) return undefined
    items.value[idx] = applyFeedback(items.value[idx], score)
    persist()
    return items.value[idx]
  }

  const stats = computed<MasteryStats>(() => computeMasteryStats(items.value))

  return {
    items: computed(() => items.value),
    stats,
    sorted: computed(() => sortByWeakness(items.value)),
    addItem,
    removeItem,
    recordScore,
    stateFor: masteryStateFor,
    computeMasteryStats,
    sortByWeakness,
  }
}