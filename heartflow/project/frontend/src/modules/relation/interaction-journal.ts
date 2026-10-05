// ============================================================
// 羁绊之厅 · 关系互动日志
// 蓝图：互动记录 + 纪念日提醒 + 关系健康度 + 生日追踪
// ============================================================

import { ref } from 'vue'
import { getLocalMonthKey } from '../../utils/time'
import type { Person } from './types'
import { storage } from '@/engine/storage'

// ---- 类型定义 ----

/** 互动类型 */
export type InteractionKind =
  | 'meeting' | 'call' | 'message' | 'gift' | 'meal'
  | 'activity' | 'letter' | 'visit' | 'other'

/** 互动记录 */
export interface InteractionEntry {
  id: string
  personId: string
  kind: InteractionKind
  date: string
  duration?: number
  location?: string
  mood: 'positive' | 'neutral' | 'negative'
  summary: string
  tags: string[]
  createdAt: string
}

/** 纪念日 */
export interface Anniversary {
  id: string
  personId: string
  title: string
  date: string
  type: 'birthday' | 'meet' | 'wedding' | 'graduation' | 'farewell' | 'custom'
  recurring: boolean
  reminderDays: number
  note?: string
  createdAt: string
}

/** 关系健康度 */
export interface RelationshipHealth {
  personId: string
  personName: string
  score: number
  level: 'thriving' | 'healthy' | 'needs_attention' | 'drifting' | 'dormant'
  lastInteraction: string | null
  interactionCount: number
  interactionFrequency: number
  anniversaryCount: number
  upcomingAnniversaries: Anniversary[]
  suggestions: string[]
}

/** 互动统计 */
export interface InteractionStats {
  totalInteractions: number
  totalPersons: number
  byKind: Record<InteractionKind, number>
  byMood: Record<string, number>
  monthlyTrend: { month: string; count: number }[]
  mostActive: { personId: string; personName: string; count: number }[]
  neglected: { personId: string; personName: string; daysSinceLast: number }[]
}

// ---- 常量 ----

export const INTERACTION_KIND_META: Record<InteractionKind, { label: string; icon: string; color: string }> = {
  meeting: { label: '见面', icon: '🤝', color: '#6b9fc4' },
  call: { label: '通话', icon: '📞', color: '#8a9a7a' },
  message: { label: '消息', icon: '💬', color: '#f0c040' },
  gift: { label: '礼物', icon: '🎁', color: '#d98c7a' },
  meal: { label: '聚餐', icon: '🍽️', color: '#e0a96d' },
  activity: { label: '活动', icon: '🎯', color: '#b5707a' },
  letter: { label: '书信', icon: '✉️', color: '#6b9fc4' },
  visit: { label: '拜访', icon: '🏠', color: '#cf8b6b' },
  other: { label: '其他', icon: '📝', color: '#94a3b8' },
}

export const ANNIVERSARY_TYPE_META: Record<Anniversary['type'], { label: string; icon: string }> = {
  birthday: { label: '生日', icon: '🎂' },
  meet: { label: '相识', icon: '🌟' },
  wedding: { label: '结婚', icon: '💒' },
  graduation: { label: '毕业', icon: '🎓' },
  farewell: { label: '告别', icon: '🌅' },
  custom: { label: '自定义', icon: '📌' },
}

export const HEALTH_LEVEL_META: Record<RelationshipHealth['level'], { label: string; color: string; minScore: number }> = {
  thriving: { label: '蓬勃', color: '#34d399', minScore: 80 },
  healthy: { label: '健康', color: '#6b9fc4', minScore: 60 },
  needs_attention: { label: '需关注', color: '#f0c040', minScore: 40 },
  drifting: { label: '疏远中', color: '#f59e0b', minScore: 20 },
  dormant: { label: '休眠', color: '#94a3b8', minScore: 0 },
}

export const INTERACTION_STORAGE_KEYS = {
  INTERACTIONS: 'hf:relation_interactions',
  ANNIVERSARIES: 'hf:relation_anniversaries',
} as const

// ---- 互动日志 ----

export function useInteractionJournal() {
  const interactions = ref<InteractionEntry[]>([])

  function loadInteractions(): InteractionEntry[] {
    const stored = storage.getKV<InteractionEntry[]>(INTERACTION_STORAGE_KEYS.INTERACTIONS, [])
    if (stored) interactions.value = stored
    return interactions.value
  }

  /** 记录一次互动 */
  function recordInteraction(
    personId: string,
    kind: InteractionKind,
    mood: InteractionEntry['mood'],
    summary: string,
    tags: string[] = [],
    duration?: number,
    location?: string,
  ): InteractionEntry {
    const entry: InteractionEntry = {
      id: `int-${Date.now()}`,
      personId,
      kind,
      date: new Date().toISOString(),
      duration,
      location,
      mood,
      summary,
      tags,
      createdAt: new Date().toISOString(),
    }
    interactions.value.push(entry)
    saveInteractions()
    return entry
  }

  /** 获取某人的互动记录 */
  function getPersonInteractions(personId: string, limit = 20): InteractionEntry[] {
    return interactions.value
      .filter(i => i.personId === personId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  /** 获取最近一次互动 */
  function getLastInteraction(personId: string): InteractionEntry | undefined {
    return interactions.value
      .filter(i => i.personId === personId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  }

  /** 计算距离上次互动天数 */
  function daysSinceLastInteraction(personId: string): number | null {
    const last = getLastInteraction(personId)
    if (!last) return null
    const diff = new Date().getTime() - new Date(last.date).getTime()
    return Math.floor(diff / 86400000)
  }

  /** 计算互动频率（次/月） */
  function computeInteractionFrequency(personId: string): number {
    const personInteractions = interactions.value
      .filter(i => i.personId === personId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (personInteractions.length < 2) return personInteractions.length

    const first = new Date(personInteractions[0].date)
    const last = new Date(personInteractions[personInteractions.length - 1].date)
    const monthsDiff = (last.getTime() - first.getTime()) / (30 * 86400000)

    return monthsDiff > 0
      ? Math.round((personInteractions.length / monthsDiff) * 10) / 10
      : personInteractions.length
  }

  /** 删除互动记录 */
  function removeInteraction(interactionId: string): boolean {
    const idx = interactions.value.findIndex(i => i.id === interactionId)
    if (idx === -1) return false
    interactions.value.splice(idx, 1)
    saveInteractions()
    return true
  }

  function saveInteractions(): void {
    storage.setKV(INTERACTION_STORAGE_KEYS.INTERACTIONS, interactions.value)
  }

  return {
    interactions,
    loadInteractions,
    recordInteraction,
    getPersonInteractions,
    getLastInteraction,
    daysSinceLastInteraction,
    computeInteractionFrequency,
    removeInteraction,
  }
}

// ---- 纪念日管理 ----

export function useAnniversaries() {
  const anniversaries = ref<Anniversary[]>([])

  function loadAnniversaries(): Anniversary[] {
    const stored = storage.getKV<Anniversary[]>(INTERACTION_STORAGE_KEYS.ANNIVERSARIES, [])
    if (stored) anniversaries.value = stored
    return anniversaries.value
  }

  /** 创建纪念日 */
  function createAnniversary(
    personId: string,
    title: string,
    date: string,
    type: Anniversary['type'],
    recurring = true,
    reminderDays = 3,
    note?: string,
  ): Anniversary {
    const anniversary: Anniversary = {
      id: `ann-${Date.now()}`,
      personId,
      title,
      date,
      type,
      recurring,
      reminderDays,
      note,
      createdAt: new Date().toISOString(),
    }
    anniversaries.value.push(anniversary)
    saveAnniversaries()
    return anniversary
  }

  /** 获取某人的纪念日 */
  function getPersonAnniversaries(personId: string): Anniversary[] {
    return anniversaries.value
      .filter(a => a.personId === personId)
      .sort((a, b) => {
        const aDate = getNextDate(a)
        const bDate = getNextDate(b)
        return aDate.getTime() - bDate.getTime()
      })
  }

  /** 获取即将到来的纪念日 */
  function getUpcomingAnniversaries(days = 30): Anniversary[] {
    const now = new Date()
    const future = new Date(now.getTime() + days * 86400000)

    return anniversaries.value
      .filter(a => {
        const nextDate = getNextDate(a)
        return nextDate >= now && nextDate <= future
      })
      .sort((a, b) => getNextDate(a).getTime() - getNextDate(b).getTime())
  }

  /** 获取需要提醒的纪念日 */
  function getReminderAnniversaries(): Anniversary[] {
    const now = new Date()

    return anniversaries.value.filter(a => {
      const nextDate = getNextDate(a)
      const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000)
      return diffDays >= 0 && diffDays <= a.reminderDays
    })
  }

  /** 计算距离纪念日天数 */
  function daysUntilAnniversary(anniversaryId: string): number | null {
    const anniversary = anniversaries.value.find(a => a.id === anniversaryId)
    if (!anniversary) return null

    const nextDate = getNextDate(anniversary)
    const now = new Date()
    return Math.ceil((nextDate.getTime() - now.getTime()) / 86400000)
  }

  /** 删除纪念日 */
  function removeAnniversary(anniversaryId: string): boolean {
    const idx = anniversaries.value.findIndex(a => a.id === anniversaryId)
    if (idx === -1) return false
    anniversaries.value.splice(idx, 1)
    saveAnniversaries()
    return true
  }

  function saveAnniversaries(): void {
    storage.setKV(INTERACTION_STORAGE_KEYS.ANNIVERSARIES, anniversaries.value)
  }

  return {
    anniversaries,
    loadAnniversaries,
    createAnniversary,
    getPersonAnniversaries,
    getUpcomingAnniversaries,
    getReminderAnniversaries,
    daysUntilAnniversary,
    removeAnniversary,
  }
}

// ---- 关系健康度 ----

export function useRelationshipHealth(
  sharedJournal?: ReturnType<typeof useInteractionJournal>,
  sharedAnniversaries?: ReturnType<typeof useAnniversaries>,
) {
  const journalInstance = sharedJournal || useInteractionJournal()
  const anniversariesInstance = sharedAnniversaries || useAnniversaries()
  const { interactions, getLastInteraction, daysSinceLastInteraction, computeInteractionFrequency } = journalInstance
  const { getUpcomingAnniversaries, getPersonAnniversaries } = anniversariesInstance

  function computeHealth(person: Person): RelationshipHealth {
    const lastInteraction = getLastInteraction(person.id)
    const daysSince = daysSinceLastInteraction(person.id)
    const frequency = computeInteractionFrequency(person.id)
    const personAnniversaries = getPersonAnniversaries(person.id)
    const upcoming = getUpcomingAnniversaries().filter(a => a.personId === person.id)

    // 健康度评分：频率(40%) + 最近互动(30%) + 纪念日(20%) + 亲密度(10%)
    let score = 0

    // 频率得分
    score += Math.min(frequency * 10, 40)

    // 最近互动得分
    if (daysSince === null) {
      score += 10
    } else if (daysSince <= 7) {
      score += 30
    } else if (daysSince <= 30) {
      score += 20
    } else if (daysSince <= 90) {
      score += 10
    }

    // 纪念日得分
    score += Math.min(personAnniversaries.length * 5, 20)

    // 亲密度得分
    score += Math.min(person.closeness * 10, 10)

    // 确定等级
    const level = getHealthLevel(score)

    // 生成建议
    const suggestions: string[] = []
    if (daysSince !== null && daysSince > 30) {
      suggestions.push(`已 ${daysSince} 天未联系，建议近期联系一下`)
    }
    if (frequency < 0.5) {
      suggestions.push('互动频率较低，可以尝试增加联系')
    }
    if (upcoming.length > 0) {
      suggestions.push(`有 ${upcoming.length} 个纪念日即将到来，可以提前准备`)
    }
    if (person.closeness < 0.5) {
      suggestions.push('亲密度较低，可以通过更多互动来增进关系')
    }
    if (daysSince === null) {
      suggestions.push('还没有互动记录，可以从一次简单的问候开始')
    }

    return {
      personId: person.id,
      personName: person.name,
      score: Math.round(score),
      level,
      lastInteraction: lastInteraction?.date || null,
      interactionCount: interactions.value.filter(i => i.personId === person.id).length,
      interactionFrequency: frequency,
      anniversaryCount: personAnniversaries.length,
      upcomingAnniversaries: upcoming,
      suggestions,
    }
  }

  function computeAllHealth(persons: Person[]): RelationshipHealth[] {
    return persons.map(p => computeHealth(p)).sort((a, b) => b.score - a.score)
  }

  function computeInteractionStats(persons: Person[]): InteractionStats {
    const byKind: Record<InteractionKind, number> = {
      meeting: 0, call: 0, message: 0, gift: 0, meal: 0,
      activity: 0, letter: 0, visit: 0, other: 0,
    }
    const byMood: Record<string, number> = { positive: 0, neutral: 0, negative: 0 }

    interactions.value.forEach(i => {
      byKind[i.kind]++
      byMood[i.mood]++
    })

    // 月度趋势
    const monthlyMap = new Map<string, number>()
    interactions.value.forEach(i => {
      const month = getLocalMonthKey(i.date)
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1)
    })
    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }))

    // 最活跃联系人
    const personCounts = new Map<string, { personId: string; personName: string; count: number }>()
    interactions.value.forEach(i => {
      const person = persons.find(p => p.id === i.personId)
      if (!person) return
      const existing = personCounts.get(i.personId)
      if (existing) {
        existing.count++
      } else {
        personCounts.set(i.personId, { personId: i.personId, personName: person.name, count: 1 })
      }
    })
    const mostActive = Array.from(personCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 被忽视的联系人
    const neglected = persons
      .filter(p => {
        const days = daysSinceLastInteraction(p.id)
        return days !== null && days > 60
      })
      .map(p => ({
        personId: p.id,
        personName: p.name,
        daysSinceLast: daysSinceLastInteraction(p.id)!,
      }))
      .sort((a, b) => b.daysSinceLast - a.daysSinceLast)
      .slice(0, 10)

    return {
      totalInteractions: interactions.value.length,
      totalPersons: persons.length,
      byKind,
      byMood,
      monthlyTrend,
      mostActive,
      neglected,
    }
  }

  return {
    computeHealth,
    computeAllHealth,
    computeInteractionStats,
  }
}

// ---- 辅助函数 ----

function getNextDate(anniversary: Anniversary): Date {
  const parts = anniversary.date.split('-')
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  const now = new Date()
  // 使用 today（当天 00:00:00）进行比较，避免时间部分导致当天纪念日被误判为已过期
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisYear = new Date(now.getFullYear(), month - 1, day)

  if (thisYear >= today || !anniversary.recurring) {
    return thisYear
  }

  return new Date(now.getFullYear() + 1, month - 1, day)
}

function getHealthLevel(score: number): RelationshipHealth['level'] {
  if (score >= 80) return 'thriving'
  if (score >= 60) return 'healthy'
  if (score >= 40) return 'needs_attention'
  if (score >= 20) return 'drifting'
  return 'dormant'
}