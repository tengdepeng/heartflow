// ============================================================
// 镜我 · 对话分身档案分析引擎 (模块七)
// 聚合单个分身(幕僚)的对话上下文/好感度/见证/在位时长，
// 生成对话分身档案概览 + 温和洞察。本地离线纯函数。
// 数据背书：AdvisorProfile（conversationContext/totalInteractions/
//          affinity/createdAt/lastActiveAt/witnessLog）
// ============================================================

import type { AdvisorProfile } from '../../types'
import { AFFINITY_TIERS } from '../../types'

/** 单个分身的对话档案概览 */
export interface DialogueArchiveOverview {
  /** 对话轮次 */
  turnCount: number
  /** 总互动次数 */
  totalInteractions: number
  /** 见证次数 */
  witnessCount: number
  /** 在位天数 */
  tenureDays: number
  /** 好感度 0-100 */
  affinity: number
  /** 好感度等级 */
  level: number
  /** 好感度档位名 */
  tier: string
  /** 距最近对话天数（null=从未对话） */
  lastActiveDays: number | null
  /** 是否已退休 */
  isRetired: boolean
  /** 温和洞察文案 */
  insights: string[]
}

function diffDays(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000))
}

function affinityTierOf(affinity: number, interactions: number): string {
  for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
    const t = AFFINITY_TIERS[i]
    if (affinity >= t.threshold && interactions >= t.minInteractions) return t.title
  }
  return AFFINITY_TIERS[0]?.title ?? '初识'
}

export function dialogueArchiveOverview(
  profile: Pick<AdvisorProfile, 'name' | 'affinity' | 'level' | 'totalInteractions' | 'createdAt' | 'lastActiveAt' | 'retired' | 'conversationContext' | 'witnessLog'>,
  now: Date,
): DialogueArchiveOverview {
  const turnCount = profile.conversationContext?.turnCount ?? 0
  const witnessCount = profile.witnessLog?.length ?? 0
  const tenureDays = profile.createdAt
    ? diffDays(new Date(profile.createdAt), now)
    : 0
  const lastActiveDays = profile.lastActiveAt
    ? diffDays(new Date(profile.lastActiveAt), now)
    : null

  const overview: DialogueArchiveOverview = {
    turnCount,
    totalInteractions: profile.totalInteractions ?? 0,
    witnessCount,
    tenureDays,
    affinity: Math.round(profile.affinity ?? 0),
    level: profile.level ?? 1,
    tier: affinityTierOf(profile.affinity ?? 0, profile.totalInteractions ?? 0),
    lastActiveDays,
    isRetired: !!profile.retired,
    insights: [],
  }

  const name = profile.name
  if (overview.isRetired) {
    overview.insights.push(`${name} 已荣休，仍可在档案室回望。`)
  } else if (turnCount > 0) {
    overview.insights.push(`已与 ${name} 对话 ${turnCount} 轮，默契在生长。`)
  } else if (overview.tenureDays > 0) {
    overview.insights.push(`${name} 已在位 ${overview.tenureDays} 天，静候一次对话。`)
  }

  if (overview.tenureDays > 0) {
    overview.insights.push(`相伴 ${overview.tenureDays} 天，关系来到了「${overview.tier}」。`)
  }

  if (overview.witnessCount > 0) {
    overview.insights.push(`${name} 见证了你的 ${overview.witnessCount} 次成长。`)
  }

  if (lastActiveDays !== null) {
    if (lastActiveDays === 0) overview.insights.push('今天还聊过，常来坐坐。')
    else if (lastActiveDays <= 3) overview.insights.push(`最近一次对话在 ${lastActiveDays} 天前。`)
    else overview.insights.push(`已 ${lastActiveDays} 天没有深谈，或许该续上。`)
  }

  return overview
}
