// ============================================================
// 羁绊之厅 · 视图桥接层 (P21-6)
// 蓝图定义：
//   统一状态聚合、羁绊健康度、网络可视化数据、
//   交互热力图、关系时间线、雷达图、操作入口
// ============================================================

import { ref, computed } from 'vue'
import type { Person } from './types'
import { useRelation } from './relation-store'
import { useInteractionJournal, useAnniversaries, useRelationshipHealth } from './interaction-journal'
import {
  computeForceLayout,
  buildInteractionHeatmap,
  buildRelationshipTimeline,
  computeRelationshipRadar,
  type ForceNode,
  type ForceEdge,
  type InteractionHeatmap,
  type RelationshipTimeline,
  type RelationshipRadar,
} from './relation-visualization'
import { RELATION_LABELS, RELATION_COLORS } from './types'
import type { InteractionKind, InteractionEntry, Anniversary, RelationshipHealth, InteractionStats } from './interaction-journal'
import { useEffect } from '../constitution/use-effect'

export type {
  ForceNode,
  ForceEdge,
  InteractionHeatmap,
  RelationshipTimeline,
  RelationshipRadar,
  InteractionKind,
  InteractionEntry,
  Anniversary,
  RelationshipHealth,
  InteractionStats,
}

// ---- 人物概览（含健康度） ----

export interface PersonOverview {
  person: Person
  relationLabel: string
  relationColor: string
  health: RelationshipHealth
  daysSinceLastContact: number | null
  interactionCount: number
  anniversaryCount: number
  hasUpcomingAnniversary: boolean
  isDeceased: boolean
  isSeat: boolean
}

// ---- 羁绊健康度 ----

export interface BondHealth {
  /** 综合评分 0-100 */
  score: number
  /** 总人数 */
  totalPersons: number
  /** 活跃人数（近30天有互动） */
  activePersons: number
  /** 沉寂人数（超过60天未互动） */
  dormantPersons: number
  /** 逝者/留座人数 */
  memorialCount: number
  /** 平均亲密度 */
  avgCloseness: number
  /** 平均互动频率 */
  avgInteractionFrequency: number
  /** 平均关系健康度 */
  avgHealthScore: number
  /** 即将到来的纪念日数量 */
  upcomingAnniversaries: number
  /** 各关系类型分布 */
  relationsDistribution: { type: string; label: string; count: number; color: string }[]
  /** 健康等级分布 */
  healthDistribution: { level: string; label: string; count: number; color: string }[]
  /** 改善建议 */
  suggestions: string[]
}

// ---- 网络概览 ----

export interface NetworkOverview {
  totalNodes: number
  totalEdges: number
  maxCloseness: number
  minCloseness: number
  avgCloseness: number
  deceasedCount: number
  seatCount: number
  strongestBond: { name: string; closeness: number } | null
  weakestBond: { name: string; closeness: number } | null
}

// ---- 关系推荐 ----

export interface BondRecommendation {
  type: 'reach_out' | 'upcoming_anniversary' | 'improve_health' | 'create_memory' | 'add_person'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  targetPersonId?: string
  targetPersonName?: string
  expectedBenefit: string
}

// ============================================================
// useBondBridge
// ============================================================

export function useBondBridge() {
  // ---- 子模块 ----
  const relationModule = useRelation()
  const journal = useInteractionJournal()
  const anniversariesModule = useAnniversaries()
  const healthModule = useRelationshipHealth(journal, anniversariesModule)

  // 初始化
  journal.loadInteractions()
  anniversariesModule.loadAnniversaries()

  // ---- 活跃状态 ----
  const activePersonId = ref<string | null>(null)

  // ---- 人物概览 ----
  const personOverviews = computed<PersonOverview[]>(() => {
    return relationModule.persons.value.map((person) => {
      const personHealth = healthModule.computeHealth(person)
      const daysSince = journal.daysSinceLastInteraction(person.id)
      const upcoming = anniversariesModule.getPersonAnniversaries(person.id).filter((a) => {
        const nextDate = getNextDate(a)
        const now = new Date()
        const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000)
        return diffDays >= 0 && diffDays <= 30
      })

      return {
        person,
        relationLabel: RELATION_LABELS[person.relation],
        relationColor: RELATION_COLORS[person.relation],
        health: personHealth,
        daysSinceLastContact: daysSince,
        interactionCount: personHealth.interactionCount,
        anniversaryCount: personHealth.anniversaryCount,
        hasUpcomingAnniversary: upcoming.length > 0,
        isDeceased: person.deceased ?? false,
        isSeat: person.isSeat ?? false,
      }
    })
  })

  /** 当前聚焦的人物概览 */
  const currentPersonOverview = computed(() => {
    if (!activePersonId.value) return null
    return personOverviews.value.find((p) => p.person.id === activePersonId.value) ?? null
  })

  /** 按关系类型分组 */
  const personsByRelation = computed(() => {
    const groups: Record<string, PersonOverview[]> = {}
    for (const overview of personOverviews.value) {
      const key = overview.person.relation
      if (!groups[key]) groups[key] = []
      groups[key].push(overview)
    }
    return groups
  })

  /** 按互动天数排序（最近优先） */
  const personsByRecentContact = computed(() => {
    return [...personOverviews.value].sort((a, b) => {
      const aDays = a.daysSinceLastContact ?? Infinity
      const bDays = b.daysSinceLastContact ?? Infinity
      return aDays - bDays
    })
  })

  /** 按健康度排序（最高优先） */
  const personsByHealth = computed(() => {
    return [...personOverviews.value].sort((a, b) => b.health.score - a.health.score)
  })

  // ---- 羁绊健康度 ----

  const bondHealth = computed<BondHealth>(() => {
    const persons = relationModule.persons.value
    const allHealth = healthModule.computeAllHealth(persons)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    // 活跃人数
    const activePersons = persons.filter((p) => {
      const last = journal.getLastInteraction(p.id)
      return last && last.date >= thirtyDaysAgo
    }).length

    // 沉寂人数
    const dormantPersons = persons.filter((p) => {
      const days = journal.daysSinceLastInteraction(p.id)
      return days !== null && days > 60
    }).length

    // 逝者/留座
    const memorialCount = persons.filter((p) => p.deceased || p.isSeat).length

    // 平均亲密度
    const avgCloseness = persons.length > 0
      ? Math.round((persons.reduce((s, p) => s + (p.closeness ?? 0.3), 0) / persons.length) * 100) / 100
      : 0

    // 平均互动频率
    const avgInteractionFrequency = persons.length > 0
      ? Math.round((persons.reduce((s, p) => s + journal.computeInteractionFrequency(p.id), 0) / persons.length) * 10) / 10
      : 0

    // 平均健康度
    const avgHealthScore = allHealth.length > 0
      ? Math.round(allHealth.reduce((s, h) => s + h.score, 0) / allHealth.length)
      : 0

    // 即将到来的纪念日
    const upcomingAnniversaries = anniversariesModule.getUpcomingAnniversaries(30).length

    // 关系类型分布
    const relationsDist = new Map<string, number>()
    persons.forEach((p) => {
      relationsDist.set(p.relation, (relationsDist.get(p.relation) || 0) + 1)
    })
    const relationsDistribution = Array.from(relationsDist.entries()).map(([type, count]) => ({
      type,
      label: RELATION_LABELS[type as Person['relation']] || type,
      count,
      color: RELATION_COLORS[type as Person['relation']] || '#555',
    }))

    // 健康等级分布
    const healthLevels = new Map<string, number>()
    allHealth.forEach((h) => {
      healthLevels.set(h.level, (healthLevels.get(h.level) || 0) + 1)
    })
    const healthDistribution = Array.from(healthLevels.entries()).map(([level, count]) => {
      const meta = {
        thriving: { label: '蓬勃', color: '#34d399' },
        healthy: { label: '健康', color: '#6b9fc4' },
        needs_attention: { label: '需关注', color: '#f0c040' },
        drifting: { label: '疏远中', color: '#f59e0b' },
        dormant: { label: '休眠', color: '#94a3b8' },
      }
      return { level, label: meta[level as keyof typeof meta]?.label || level, count, color: meta[level as keyof typeof meta]?.color || '#555' }
    })

    // 综合评分
    const score = Math.round(
      (activePersons > 0 ? 30 : 0) +
      (dormantPersons === 0 ? 20 : Math.max(0, 20 - dormantPersons * 5)) +
      (avgInteractionFrequency * 10) +
      (avgHealthScore * 0.3) +
      (upcomingAnniversaries > 0 ? 10 : 0),
    )

    // 建议
    const suggestions: string[] = []
    if (persons.length === 0) suggestions.push('开始添加你生命中重要的人，建立羁绊之厅')
    if (dormantPersons > 0) suggestions.push(`有 ${dormantPersons} 位联系人超过60天未互动，考虑主动联系`)
    if (avgCloseness < 0.5) suggestions.push('整体亲密度偏低，尝试通过更多互动增进关系')
    if (avgInteractionFrequency < 1) suggestions.push('互动频率较低，建议建立定期联系的习惯')
    if (upcomingAnniversaries > 0) suggestions.push(`有 ${upcomingAnniversaries} 个纪念日即将到来，提前准备`)
    if (memorialCount > 0 && persons.length <= memorialCount + 1) suggestions.push('羁绊之厅中只有留座和逝者，添加一些仍在身边的联系人')

    return {
      score: Math.min(100, Math.max(0, score)),
      totalPersons: persons.length,
      activePersons,
      dormantPersons,
      memorialCount,
      avgCloseness,
      avgInteractionFrequency,
      avgHealthScore,
      upcomingAnniversaries,
      relationsDistribution,
      healthDistribution,
      suggestions,
    }
  })

  // ---- 网络概览 ----

  const networkOverview = computed<NetworkOverview>(() => {
    const persons = relationModule.persons.value
    const stats = relationModule.networkStats.value

    let strongestBond: { name: string; closeness: number } | null = null
    let weakestBond: { name: string; closeness: number } | null = null

    for (const p of persons) {
      const c = p.closeness ?? 0.3
      if (!strongestBond || c > strongestBond.closeness) {
        strongestBond = { name: p.name, closeness: c }
      }
      if (!weakestBond || c < weakestBond.closeness) {
        weakestBond = { name: p.name, closeness: c }
      }
    }

    return {
      totalNodes: persons.length + 1, // +1 for self
      totalEdges: stats.total + (persons.filter((p) => p.tags?.length).length > 1 ? 1 : 0),
      maxCloseness: strongestBond?.closeness ?? 0,
      minCloseness: weakestBond?.closeness ?? 0,
      avgCloseness: stats.avgCloseness,
      deceasedCount: stats.deceased,
      seatCount: stats.seats,
      strongestBond,
      weakestBond,
    }
  })

  // ---- 可视化数据 ----

  /** 力导向布局数据 */
  const forceLayoutData = computed(() => {
    return computeForceLayout(relationModule.persons.value)
  })

  /** 交互热力图 */
  const heatmapData = computed(() => {
    return buildInteractionHeatmap(journal.interactions.value)
  })

  /** 关系时间线 */
  const timelineData = computed(() => {
    return buildRelationshipTimeline(
      relationModule.persons.value,
      journal.interactions.value,
    )
  })

  /** 当前人物的雷达图 */
  const currentRadar = computed(() => {
    if (!activePersonId.value) return null
    const person = relationModule.persons.value.find((p) => p.id === activePersonId.value)
    if (!person) return null
    return computeRelationshipRadar(person, journal.interactions.value)
  })

  /** 所有人物的雷达图 */
  const allRadars = computed(() => {
    return relationModule.persons.value.map((person) =>
      computeRelationshipRadar(person, journal.interactions.value),
    )
  })

  /** 互动统计 */
  const interactionStats = computed(() => {
    return healthModule.computeInteractionStats(relationModule.persons.value)
  })

  // A2.3 批3：关系自动分析受宪法「关系自动分析」条款门控
  // （relation:auto-analyze 为 disable 型：宪法活跃⟺自动分析被禁止⟹默认抑制推荐）。
  const relationAutoAnalyzeGate = useEffect('relation:auto-analyze')

  // ---- 关系推荐 ----

  const bondRecommendations = computed<BondRecommendation[]>(() => {
    // 宪法门控：relation:auto-analyze 活跃（默认）⟹ 不自动分析关系 ⟹ 返回空推荐。
    if (relationAutoAnalyzeGate.active.value) return []
    const recommendations: BondRecommendation[] = []
    const persons = relationModule.persons.value

    // 1. 联系疏远的人
    const neglected = persons.filter((p) => {
      const days = journal.daysSinceLastInteraction(p.id)
      return days !== null && days > 30 && !p.deceased && !p.isSeat
    })
    if (neglected.length > 0) {
      const mostNeglected = neglected.sort(
        (a, b) => (journal.daysSinceLastInteraction(b.id) ?? 0) - (journal.daysSinceLastInteraction(a.id) ?? 0),
      )[0]
      const days = journal.daysSinceLastInteraction(mostNeglected.id)
      recommendations.push({
        type: 'reach_out',
        priority: 'high',
        title: '联系疏远的人',
        description: `「${mostNeglected.name}」已经 ${days} 天没有联系了，发一条消息吧`,
        targetPersonId: mostNeglected.id,
        targetPersonName: mostNeglected.name,
        expectedBenefit: '恢复联系，改善关系健康度',
      })
    }

    // 2. 即将到来的纪念日
    const upcoming = anniversariesModule.getUpcomingAnniversaries(14)
    if (upcoming.length > 0) {
      const nearest = upcoming[0]
      const person = persons.find((p) => p.id === nearest.personId)
      recommendations.push({
        type: 'upcoming_anniversary',
        priority: 'high',
        title: '纪念日提醒',
        description: `「${person?.name ?? '未知'}」的「${nearest.title}」即将到来`,
        targetPersonId: nearest.personId,
        targetPersonName: person?.name,
        expectedBenefit: '在特殊日子表达关心，加深情感连接',
      })
    }

    // 3. 改善健康度低的关系
    const allHealth = healthModule.computeAllHealth(persons)
    const lowHealth = allHealth.filter((h) => h.score < 40)
    if (lowHealth.length > 0) {
      recommendations.push({
        type: 'improve_health',
        priority: 'medium',
        title: '关注关系健康度',
        description: `「${lowHealth[0].personName}」的关系健康度偏低，需要更多关注`,
        targetPersonId: lowHealth[0].personId,
        targetPersonName: lowHealth[0].personName,
        expectedBenefit: '针对性改善关系，提升整体羁绊质量',
      })
    }

    // 4. 创造共同记忆
    const personsWithFewAnniversaries = persons.filter(
      (p) => (p.importantDates?.length ?? 0) < 2 && !p.deceased,
    )
    if (personsWithFewAnniversaries.length > 0 && persons.length >= 3) {
      recommendations.push({
        type: 'create_memory',
        priority: 'medium',
        title: '创造共同记忆',
        description: `有 ${personsWithFewAnniversaries.length} 位联系人的重要日期较少，添加更多纪念日`,
        expectedBenefit: '丰富关系的时间维度，增加共同回忆',
      })
    }

    // 5. 添加新联系人
    if (persons.length < 3) {
      recommendations.push({
        type: 'add_person',
        priority: 'low',
        title: '拓展羁绊之厅',
        description: '羁绊之厅中的人还不多，添加更多生命中重要的人',
        expectedBenefit: '丰富社交网络，建立更完整的羁绊地图',
      })
    }

    // 6. 为逝者/留座添加纪念
    const seatsWithoutMemorial = persons.filter(
      (p) => (p.deceased || p.isSeat) && !p.memorial,
    )
    if (seatsWithoutMemorial.length > 0) {
      recommendations.push({
        type: 'create_memory',
        priority: 'medium',
        title: '为留座添加纪念文字',
        description: `「${seatsWithoutMemorial[0].name}」的留座还没有纪念文字，写下你想说的话`,
        targetPersonId: seatsWithoutMemorial[0].id,
        targetPersonName: seatsWithoutMemorial[0].name,
        expectedBenefit: '完成情感表达，让留座更有意义',
      })
    }

    return recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ---- 操作入口 ----

  /** 创建人物 */
  function createPerson(name: string, relation: Person['relation']): Person {
    return relationModule.create(name, relation)
  }

  /** 更新人物 */
  function updatePerson(
    id: string,
    data: Partial<Pick<Person, 'name' | 'relation' | 'tags' | 'notes' | 'closeness' | 'lastContact'>>,
  ): void {
    relationModule.update(id, data)
  }

  /** 删除人物 */
  function removePerson(id: string): void {
    if (activePersonId.value === id) {
      activePersonId.value = null
    }
    relationModule.remove(id)
  }

  /** 聚焦人物 */
  function focusPerson(id: string): PersonOverview | null {
    activePersonId.value = id
    return currentPersonOverview.value
  }

  /** 清除聚焦 */
  function clearFocus(): void {
    activePersonId.value = null
  }

  /** 记录互动 */
  function recordInteraction(
    personId: string,
    kind: InteractionKind,
    mood: InteractionEntry['mood'],
    summary: string,
    tags: string[] = [],
    duration?: number,
    location?: string,
  ): InteractionEntry {
    return journal.recordInteraction(personId, kind, mood, summary, tags, duration, location)
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
    return anniversariesModule.createAnniversary(personId, title, date, type, recurring, reminderDays, note)
  }

  /** 创建留座 */
  function createSeat(name: string, reason: 'deceased' | 'lost_contact' | 'distance' | 'other', memorial?: string) {
    return relationModule.addSeat(name, reason, memorial)
  }

  /** 标记人物为逝者 */
  function markDeceased(id: string, memorial?: string) {
    return relationModule.setDeceased(id, memorial)
  }

  /** 刷新所有数据 */
  function refreshAll(): void {
    relationModule.load()
    journal.loadInteractions()
    anniversariesModule.loadAnniversaries()
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    activePersonId,
    personOverviews,
    currentPersonOverview,
    personsByRelation,
    personsByRecentContact,
    personsByHealth,

    // 健康度
    bondHealth,
    networkOverview,

    // 子模块直通
    relationModule,
    journal,
    anniversaries: anniversariesModule,
    health: healthModule,

    // 可视化数据
    forceLayoutData,
    heatmapData,
    timelineData,
    currentRadar,
    allRadars,
    interactionStats,

    // 推荐
    bondRecommendations,

    // 操作入口
    createPerson,
    updatePerson,
    removePerson,
    focusPerson,
    clearFocus,
    recordInteraction,
    createAnniversary,
    createSeat,
    markDeceased,
    refreshAll,

    // 筛选
    getPersonsByRelation: (relation: Person['relation']) =>
      personOverviews.value.filter((p) => p.person.relation === relation),
    getActivePersons: () =>
      personOverviews.value.filter((p) => (p.daysSinceLastContact ?? Infinity) <= 30),
    getDormantPersons: () =>
      personOverviews.value.filter((p) => (p.daysSinceLastContact ?? 0) > 60),
    getMemorialPersons: () =>
      personOverviews.value.filter((p) => p.isDeceased || p.isSeat),
    getUpcomingAnniversaries: (days = 30) =>
      anniversariesModule.getUpcomingAnniversaries(days),
    getPersonRadar: (personId: string) => {
      const person = relationModule.persons.value.find((p) => p.id === personId)
      if (!person) return null
      return computeRelationshipRadar(person, journal.interactions.value)
    },
  }
}

// ---- 辅助函数 ----

function getNextDate(anniversary: Anniversary): Date {
  const parts = anniversary.date.split('-')
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  const now = new Date()
  const thisYear = new Date(now.getFullYear(), month - 1, day)

  if (thisYear >= now || !anniversary.recurring) {
    return thisYear
  }

  return new Date(now.getFullYear() + 1, month - 1, day)
}