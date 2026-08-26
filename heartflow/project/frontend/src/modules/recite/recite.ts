// ============================================================
// 知微阁 · 渐进式背诵引擎（背书匠启发）
// ------------------------------------------------------------
// 借鉴「背书匠」：把文本分段（CJK 按字、拉丁按词），按遮盖比例
// 20%→100% 渐进背诵；每轮记录准确率与错误位置，反复出错处集中
// 强化。全部本地，守宪法第1条本地私有 / 拒 GPU 云端。
// 纯函数核心（可单测）+ 轻量持久化，供 RecitePanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 文本语种 */
export type TextLang = 'cjk' | 'latin'

/** 背诵卡 */
export interface ReciteCard {
  id: string
  title: string
  text: string
  lang: TextLang
  createdAt: string
  /** 当前遮盖比例（索引） */
  stepIndex: number
  /** 最佳准确率（%） */
  bestAccuracy: number
  /** 总练习次数 */
  attempts: number
  /** 上次练习是否通过 */
  passed?: boolean
  /** 累积正确次数 */
  correctCount: number
  /** 累积错误次数 */
  wrongCount: number
  /** 出错字词累积（背书匠：反复出错处集中强化） */
  errorTokens: Record<string, number>
}

/** 分段 tokens */
export interface TextTokens {
  /** 各 token 原文 */
  tokens: string[]
  /** 各 token 是否为需要背诵的实词（非标点/空白） */
  content: boolean[]
}

/** 遮盖结果 */
export interface MaskedResult {
  tokens: string[]
  content: boolean[]
  /** 展示用遮盖下标（字符 '▁'） */
  maskedIndices: number[]
  totalContent: number
  coveredCount: number
}

/** 一轮背诵结果 */
export interface ReciteResult {
  accuracy: number
  correct: boolean
  /** 错误 token 下标 */
  wrongIndices: number[]
  wrongTokens: string[]
  /** 建议下一步遮盖比例索引 */
  nextStepIndex: number
  /** 是否已达最终遮盖（100%） */
  finished: boolean
}

/** 遮盖进度档 20%→40%→60%→80%→100% */
export const RECITE_STEPS = [0.2, 0.4, 0.6, 0.8, 1.0] as const

export const PASS_THRESHOLD = 90 // 准确率 >=90% 视为通过

const STORAGE_KEY = 'hf:recite_cards'

// ============================================================
// 纯函数核心
// ============================================================

/** 文本分段：CJK 按字，拉丁按词与标点 */
export function segmentText(text: string, lang: TextLang): TextTokens {
  const tokens: string[] = []
  const content: boolean[] = []

  if (lang === 'cjk') {
    for (const ch of text) {
      const meaningful = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch)
      if (meaningful || /\S/.test(ch)) {
        tokens.push(ch)
        content.push(meaningful)
      }
    }
    return { tokens, content }
  }

  const parts = text.match(/[A-Za-z0-9']+|[^A-Za-z0-9\s]+|\s+/g) ?? []
  for (const p of parts) {
    const meaningful = /[A-Za-z0-9']+/.test(p)
    if (p.trim()) {
      tokens.push(p.trim())
      content.push(meaningful)
    }
  }
  return { tokens, content }
}

/** 遮盖：保留 (1-ratio) 的实际词，其余实词以 ▁ 遮盖；标点与空白始终可见 */
export function maskText(tokens: string[], content: boolean[], ratio: number): MaskedResult {
  const contentIndices = tokens.map((_, i) => i).filter((i) => content[i])
  const totalContent = contentIndices.length
  const covered = Math.round(contentIndices.length * Math.min(1, Math.max(0, ratio)))

  const out = tokens.slice()
  for (let k = 0; k < covered; k++) {
    out[contentIndices[k]] = '▁'
  }
  return { tokens: out, content, maskedIndices: contentIndices.slice(0, covered), totalContent, coveredCount: covered }
}

/** 规范化文本用于比对（去空白与标点、统一大小写） */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u3000]/g, '')
    .replace(/[\p{P}\p{S}]/gu, '')
}

/** 评估一轮背诵：准确率、是否正确、错误位置 */
export function evaluateAccuracy(attempt: string, target: string): { accuracy: number; wrongIndices: number[]; wrongTokens: string[] } {
  const a = normalize(attempt)
  const t = normalize(target)
  if (!t) return { accuracy: 0, wrongIndices: [], wrongTokens: [] }

  const maxLen = Math.max(a.length, t.length)
  let hits = 0
  const wrongIndices: number[] = []
  for (let i = 0; i < maxLen; i++) {
    if (a[i] === t[i]) hits++
    else wrongIndices.push(i)
  }
  const accuracy = maxLen === 0 ? 0 : Math.round((hits / maxLen) * 100)
  const wrongTokens = wrongIndices.map((i) => t[i]).filter(Boolean)
  return { accuracy, wrongIndices, wrongTokens }
}

/** 推进遮盖档：通过则升档，否则维持（可略降） */
export function nextCoverStep(stepIndex: number, accuracy: number): number {
  if (stepIndex >= RECITE_STEPS.length - 1) return stepIndex
  if (accuracy >= PASS_THRESHOLD) return stepIndex + 1
  if (accuracy >= 60) return stepIndex
  return Math.max(0, stepIndex - 1)
}

/** 计算遮罩展示文本 */
export function reciteDisplay(card: ReciteCard): MaskedResult {
  const { tokens, content } = segmentText(card.text, card.lang)
  return maskText(tokens, content, RECITE_STEPS[card.stepIndex])
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadCards(): ReciteCard[] {
  try {
    return storage.getKV<ReciteCard[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

export function useRecite() {
  const cards = ref<ReciteCard[]>(loadCards())

  function persist(): void {
    storage.setKV(STORAGE_KEY, cards.value)
  }
  function addCard(title: string, text: string, lang: TextLang): ReciteCard {
    const card: ReciteCard = {
      id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      text,
      lang,
      createdAt: new Date().toISOString(),
      stepIndex: 0,
      bestAccuracy: 0,
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      errorTokens: {},
    }
    cards.value.push(card)
    persist()
    return card
  }
  function removeCard(id: string): void {
    cards.value = cards.value.filter((c) => c.id !== id)
    persist()
  }

  /** 提交一轮背诵并推进状态 */
  function submitAttempt(id: string, attempt: string): ReciteResult {
    const card = cards.value.find((c) => c.id === id)
    if (!card) throw new Error('recite card not found')
    const { accuracy, wrongIndices, wrongTokens } = evaluateAccuracy(attempt, card.text)
    card.attempts += 1
    card.bestAccuracy = Math.max(card.bestAccuracy, accuracy)
    if (accuracy >= PASS_THRESHOLD) card.correctCount += 1
    else card.wrongCount += 1
    for (const t of wrongTokens) card.errorTokens[t] = (card.errorTokens[t] || 0) + 1
    const next = nextCoverStep(card.stepIndex, accuracy)
    card.passed = accuracy >= PASS_THRESHOLD
    card.stepIndex = next
    persist()
    return {
      accuracy,
      correct: card.passed,
      wrongIndices,
      wrongTokens,
      nextStepIndex: next,
      finished: next >= RECITE_STEPS.length - 1 && card.passed,
    }
  }

  return {
    cards: computed(() => cards.value),
    steps: RECITE_STEPS,
    addCard,
    removeCard,
    submitAttempt,
    segmentText,
    maskText,
    evaluateAccuracy,
    nextCoverStep,
    reciteDisplay,
  }
}