// ============================================================
// 幕僚体系 · 幕僚间互动引擎
// 管理幕僚间的关系、协作、互学与共处
// ============================================================

import { ref, computed } from 'vue'
import type { AdvisorRelation, InteractionRecord, InteractionType } from './types'
import { ADVISOR_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

function generateId(): string {
  return `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadRelations(): AdvisorRelation[] {
  try {
    const raw = storage.getKV<string>(ADVISOR_STORAGE_KEYS.relations, '[]')
    return JSON.parse(raw)
  } catch { return [] }
}

function saveRelations(relations: AdvisorRelation[]): void {
  storage.setKV(ADVISOR_STORAGE_KEYS.relations, JSON.stringify(relations))
}

const relations = ref<AdvisorRelation[]>(loadRelations())

/** 获取两位幕僚之间的关系 */
function findRelation(aId: string, bId: string): AdvisorRelation | undefined {
  return relations.value.find(
    r => (r.advisorAId === aId && r.advisorBId === bId) ||
         (r.advisorAId === bId && r.advisorBId === aId),
  )
}

export function useAdvisorInteraction() {
  /** 所有关系 */
  const allRelations = computed(() => relations.value)

  /** 获取幕僚的所有关系 */
  function getAdvisorRelations(advisorId: string): AdvisorRelation[] {
    return relations.value.filter(
      r => r.advisorAId === advisorId || r.advisorBId === advisorId,
    )
  }

  /** 初始化两个幕僚之间的关系 */
  function initRelation(aId: string, bId: string): AdvisorRelation {
    const existing = findRelation(aId, bId)
    if (existing) return existing
    const relation: AdvisorRelation = {
      id: generateId(),
      advisorAId: aId,
      advisorBId: bId,
      relationType: 'stranger',
      closeness: 0,
      interactionCount: 0,
      sharedTopics: [],
      lastInteractionAt: new Date().toISOString(),
      interactionHistory: [],
    }
    relations.value = [...relations.value, relation]
    saveRelations(relations.value)
    return relation
  }

  /** 记录一次互动 */
  function recordInteraction(
    aId: string,
    bId: string,
    type: InteractionType,
    topic: string,
    summary: string,
    outcome: 'positive' | 'neutral' | 'negative' = 'neutral',
  ): InteractionRecord {
    const relation = initRelation(aId, bId)

    const closenessDelta = outcome === 'positive' ? 3 : outcome === 'negative' ? -1 : 1
    const record: InteractionRecord = {
      id: `int_${Date.now()}`,
      type,
      initiatorId: aId,
      recipientId: bId,
      topic,
      summary,
      outcome,
      closenessDelta,
      timestamp: new Date().toISOString(),
    }

    relation.interactionHistory = [...relation.interactionHistory, record]
    relation.interactionCount++
    relation.closeness = Math.max(0, Math.min(100, relation.closeness + closenessDelta))
    relation.lastInteractionAt = record.timestamp

    // 更新关系类型
    if (relation.closeness >= 80) relation.relationType = 'companion'
    else if (relation.closeness >= 60) relation.relationType = 'peer'
    else if (relation.closeness >= 30) relation.relationType = 'mentor'
    else if (relation.closeness >= 10) relation.relationType = 'rival'
    else relation.relationType = 'stranger'

    // 添加共同话题
    if (!relation.sharedTopics.includes(topic)) {
      relation.sharedTopics = [...relation.sharedTopics, topic]
    }

    relations.value = [...relations.value]
    saveRelations(relations.value)
    return record
  }

  /** 获取幕僚间共同的互动话题 */
  function suggestTopics(advisorA: { personality?: string; role?: string }, advisorB: { personality?: string; role?: string }): string[] {
    const topics: string[] = []
    // 根据角色推荐话题
    const roleTopics: Record<string, string[]> = {
      guardian: ['守护', '安全感', '日常仪式'],
      scholar: ['知识', '哲学', '思考方法'],
      craftsman: ['创造', '技艺', '专注'],
      hermit: ['内省', '自然', '简朴'],
    }
    const aRoleTopics = roleTopics[advisorA.role ?? ''] ?? []
    const bRoleTopics = roleTopics[advisorB.role ?? ''] ?? []
    // 共同话题
    for (const t of aRoleTopics) {
      if (bRoleTopics.includes(t)) topics.push(t)
    }
    // 互补话题
    const allTopics = [...new Set([...aRoleTopics, ...bRoleTopics])]
    topics.push(...allTopics.filter(t => !topics.includes(t)).slice(0, 3))
    return topics
  }

  /** 计算幕僚关系网络统计 */
  function getNetworkStats(): {
    totalRelations: number
    totalInteractions: number
    averageCloseness: number
    mostConnectedAdvisor: string
    strongestBond: { a: string; b: string; closeness: number }
  } {
    const rels = relations.value
    const advisorConnections = new Map<string, number>()
    for (const r of rels) {
      advisorConnections.set(r.advisorAId, (advisorConnections.get(r.advisorAId) ?? 0) + 1)
      advisorConnections.set(r.advisorBId, (advisorConnections.get(r.advisorBId) ?? 0) + 1)
    }
    let mostConnected = ''
    let maxConn = 0
    for (const [id, count] of advisorConnections) {
      if (count > maxConn) { maxConn = count; mostConnected = id }
    }

    let strongestA = '', strongestB = '', strongestC = 0
    for (const r of rels) {
      if (r.closeness > strongestC) {
        strongestC = r.closeness
        strongestA = r.advisorAId
        strongestB = r.advisorBId
      }
    }

    return {
      totalRelations: rels.length,
      totalInteractions: rels.reduce((s, r) => s + r.interactionCount, 0),
      averageCloseness: rels.length > 0 ? Math.round(rels.reduce((s, r) => s + r.closeness, 0) / rels.length) : 0,
      mostConnectedAdvisor: mostConnected,
      strongestBond: { a: strongestA, b: strongestB, closeness: strongestC },
    }
  }

  /** 移除关系 */
  function removeRelation(id: string): boolean {
    const idx = relations.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    relations.value = relations.value.filter(r => r.id !== id)
    saveRelations(relations.value)
    return true
  }

  return {
    allRelations,
    getAdvisorRelations,
    initRelation,
    recordInteraction,
    suggestTopics,
    getNetworkStats,
    removeRelation,
  }
}