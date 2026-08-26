// ============================================================
// 知微阁 · 背诵档案分析引擎（recite-analytics）
// 从背诵卡（遮盖档位/准确率/出错字词）读出「背书匠」的痕迹：
// 背诵概览、进度分布、薄弱字词、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// 顺着蓝图第 3 类「背书匠」：只呈现记忆的成长，不评判、不施压。
// ============================================================

import type { ReciteCard } from './recite'
import { RECITE_STEPS } from './recite'

// ---- 背诵概览 ----

export interface ReciteOverview {
  total: number
  /** 已达到最高遮盖档（100%）的卡片数 */
  mastered: number
  /** 至少练过一遍的卡片数 */
  practiced: number
  /** 从未练习的卡片数 */
  untouched: number
  /** 总练习次数 */
  totalAttempts: number
  /** 平均最佳准确率（%） */
  avgBestAccuracy: number
  /** 平均遮盖档位（0-4） */
  avgStepIndex: number
  /** 总体掌握率 0-100 */
  masteryRate: number
  /** 总正确次数 */
  totalCorrect: number
  /** 总错误次数 */
  totalWrong: number
}

export function reciteOverview(cards: ReciteCard[]): ReciteOverview {
  const total = cards.length
  let mastered = 0
  let practiced = 0
  let untouched = 0
  let totalAttempts = 0
  let totalCorrect = 0
  let totalWrong = 0
  let bestSum = 0

  for (const c of cards) {
    if (c.attempts === 0) untouched++
    else practiced++
    if (c.stepIndex >= RECITE_STEPS.length - 1) mastered++
    totalAttempts += c.attempts
    totalCorrect += c.correctCount || 0
    totalWrong += c.wrongCount || 0
    bestSum += c.bestAccuracy || 0
  }

  const avgBestAccuracy = practiced ? Math.round(bestSum / practiced) : 0
  const stepSum = cards.reduce((s, c) => s + (c.stepIndex || 0), 0)
  const avgStepIndex = total ? Math.round((stepSum / total) * 10) / 10 : 0
  const masteryRate = total ? Math.round((mastered / total) * 100) : 0
  const allHigh = practiced > 0 && practiced === total

  return {
    total,
    mastered,
    practiced,
    untouched,
    totalAttempts,
    avgBestAccuracy,
    avgStepIndex,
    masteryRate: allHigh && mastered === total ? 100 : masteryRate,
    totalCorrect,
    totalWrong,
  }
}

// ---- 进度分布 ----

export interface ReciteStepRow {
  /** 遮盖档索引 */
  stepIndex: number
  label: string
  /** 遮盖比例（%） */
  ratio: number
  count: number
}

export function reciteStepDistribution(cards: ReciteCard[]): ReciteStepRow[] {
  return RECITE_STEPS.map((ratio, i) => ({
    stepIndex: i,
    label: `${Math.round(ratio * 100)}%`,
    ratio: Math.round(ratio * 100),
    count: cards.filter((c) => c.stepIndex === i).length,
  }))
}

// ---- 背诵节奏 ----

export interface ReciteRhythm {
  /** 练习过的卡片数 */
  practicedCards: number
  /** 平均练习次数/卡 */
  avgAttemptsPerCard: number
  /** 通过率（即练习中达标次数占比）0-100 */
  passRate: number
  /** 错误集中的字词（出错≥2 次的，按次数降序） */
  weakTokens: { token: string; count: number }[]
}

export function reciteRhythm(cards: ReciteCard[]): ReciteRhythm {
  const practicedCards = cards.filter((c) => c.attempts > 0).length
  const totalAttempts = cards.reduce((s, c) => s + c.attempts, 0)
  const avgAttemptsPerCard = practicedCards
    ? Math.round((totalAttempts / practicedCards) * 10) / 10
    : 0

  const totalCorrect = cards.reduce((s, c) => s + (c.correctCount || 0), 0)
  const passRate = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const errMap = new Map<string, number>()
  for (const c of cards) {
    for (const [t, n] of Object.entries(c.errorTokens || {})) {
      errMap.set(t, (errMap.get(t) || 0) + n)
    }
  }
  const weakTokens = [...errMap.entries()]
    .map(([token, count]) => ({ token, count }))
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count)

  return { practicedCards, avgAttemptsPerCard, passRate, weakTokens }
}

// ---- 温和洞察 ----

export function reciteInsights(cards: ReciteCard[], limit = 4): string[] {
  if (cards.length === 0) {
    return ['知微阁还没有背诵卡片。录入一段课文、诗或演讲稿，从这里开始磨。']
  }

  const out: string[] = []
  const ov = reciteOverview(cards)
  const rhythm = reciteRhythm(cards)

  if (ov.untouched === ov.total) {
    out.push(`收录了 ${ov.total} 张卡片，都还没开始背——第一遍只求开口，不必求全。`)
  }

  if (ov.practiced > 0) {
    out.push(`已有 ${ov.practiced} 张卡练过，累计 ${ov.totalAttempts} 遍，平均最佳准确率 ${ov.avgBestAccuracy}%。`)
  }

  if (ov.mastered > 0) {
    out.push(`其中 ${ov.mastered} 张已能整篇出入，达到了最高遮盖档。`)
  } else if (ov.practiced > 0) {
    out.push(`还没有卡片顶到 100% 遮盖，别急，熟练是叠上去的。`)
  }

  if (rhythm.passRate > 0 && rhythm.passRate < 100) {
    out.push(`背诵达标率约 ${rhythm.passRate}%，多在卡住的地方多停留一会儿就好。`)
  }

  if (rhythm.weakTokens.length > 0) {
    const t = rhythm.weakTokens.slice(0, 3).map((e) => `「${e.token}」`)
    out.push(`反复出错集中在 ${t.join('、')}，这几处值得单独过两遍。`)
  }

  if (ov.avgStepIndex >= 2 && ov.avgStepIndex < 4) {
    out.push('大部分卡已盖过半，是时候较量「全遮盖一气呵成」了。')
  }

  return out.slice(0, limit)
}