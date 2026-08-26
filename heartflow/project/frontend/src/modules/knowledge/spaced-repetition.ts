// ============================================================
// 经略阁 · SM-2 间隔重复引擎 + 闪卡复习
// 对应借鉴：氢刻 / Anki / Quizlet 的记忆调度，但以本地 SM-2 算法实现。
// 宪法第1条「本地私有」：全部调度计算在本地完成，无云端同步。
// ============================================================

import { storage } from '../../engine/storage'

/** 复习反馈质量（SM-2 的 q 值，0-5） */
export type Sm2Quality = 0 | 1 | 2 | 3 | 4 | 5

/** 闪卡 */
export interface Flashcard {
  id: string
  /** 正面（问题/提示） */
  front: string
  /** 背面（答案/要点） */
  back: string
  /** 所属牌组 */
  deck: string
  /** 标签 */
  tags: string[]
  createdAt: string
  /** SM-2 状态 */
  sm2: Sm2State
}

/** SM-2 调度状态 */
export interface Sm2State {
  /** 重复次数 */
  repetitions: number
  /** 易度因子（EF，初始 2.5） */
  easiness: number
  /** 当前间隔（天） */
  interval: number
  /** 上次复习时间（ISO） */
  lastReviewedAt: string | null
  /** 下次复习时间（ISO） */
  nextReviewAt: string | null
}

/** 复习结果 */
export interface ReviewResult {
  cardId: string
  quality: Sm2Quality
  nextReviewAt: string
  intervalDays: number
  easiness: number
  repetitions: number
}

const STORAGE_KEY = 'hf:knowledge_flashcards'

export function createFlashcard(
  front: string,
  back: string,
  deck = '默认',
  tags: string[] = [],
): Flashcard {
  const now = new Date().toISOString()
  return {
    id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    front,
    back,
    deck,
    tags,
    createdAt: now,
    sm2: {
      repetitions: 0,
      easiness: 2.5,
      interval: 0,
      lastReviewedAt: null,
      nextReviewAt: now,
    },
  }
}

/**
 * SM-2 核心调度：
 * - q >= 3：复习成功，按 EF 增长间隔
 * - q < 3：复习失败，重置 repetitions，间隔回到 1 天
 * - EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))，下限 1.3
 */
export function sm2Schedule(state: Sm2State, quality: Sm2Quality, now = new Date()): Sm2State {
  const q = Math.max(0, Math.min(5, quality)) as Sm2Quality
  let { repetitions, easiness, interval } = state

  if (q >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easiness)
    repetitions += 1
  } else {
    repetitions = 0
    interval = 1
  }

  easiness = Math.max(
    1.3,
    easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  )

  const lastReviewedAt = now.toISOString()
  const nextReviewAt = new Date(now.getTime() + interval * 86400000).toISOString()
  return { repetitions, easiness, interval, lastReviewedAt, nextReviewAt }
}

export function useFlashcards() {
  function load(): Flashcard[] {
    return storage.getKV<Flashcard[]>(STORAGE_KEY, []) || []
  }

  function save(cards: Flashcard[]) {
    storage.setKV(STORAGE_KEY, cards)
  }

  function add(front: string, back: string, deck = '默认', tags: string[] = []): Flashcard {
    const card = createFlashcard(front, back, deck, tags)
    const cards = load()
    cards.push(card)
    save(cards)
    return card
  }

  function remove(id: string) {
    save(load().filter(c => c.id !== id))
  }

  /** 到期待复习卡片（按下次复习时间升序） */
  function dueCards(now = new Date()): Flashcard[] {
    return load()
      .filter(c => !c.sm2.nextReviewAt || new Date(c.sm2.nextReviewAt).getTime() <= now.getTime())
      .sort((a, b) => {
        const ta = a.sm2.nextReviewAt ? new Date(a.sm2.nextReviewAt).getTime() : 0
        const tb = b.sm2.nextReviewAt ? new Date(b.sm2.nextReviewAt).getTime() : 0
        return ta - tb
      })
  }

  /** 记录一次复习，返回更新后的调度结果 */
  function review(cardId: string, quality: Sm2Quality, now = new Date()): ReviewResult | null {
    const cards = load()
    const idx = cards.findIndex(c => c.id === cardId)
    if (idx === -1) return null
    const next = sm2Schedule(cards[idx].sm2, quality, now)
    cards[idx].sm2 = next
    save(cards)
    return {
      cardId,
      quality,
      nextReviewAt: next.nextReviewAt!,
      intervalDays: next.interval,
      easiness: next.easiness,
      repetitions: next.repetitions,
    }
  }

  /** 全部牌组 */
  function decks(): string[] {
    return [...new Set(load().map(c => c.deck))].sort()
  }

  /** 统计概览 */
  function stats(now = new Date()) {
    const cards = load()
    const due = dueCards(now)
    return {
      total: cards.length,
      due: due.length,
      newCards: cards.filter(c => c.sm2.repetitions === 0).length,
      avgEasiness: cards.length
        ? cards.reduce((s, c) => s + c.sm2.easiness, 0) / cards.length
        : 0,
    }
  }

  return { load, add, remove, dueCards, review, decks, stats }
}
