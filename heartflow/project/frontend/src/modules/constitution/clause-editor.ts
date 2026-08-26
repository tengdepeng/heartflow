// ============================================================
// 宪法体系补全 · 用户新增条款编辑器
// 蓝图：条款增删改、版本管理、修订工作流、冲突检测
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'

// ---- 条款类型 ----

export type ClauseType = 'core' | 'user' | 'system' | 'derived'
export type ClauseStatus = 'draft' | 'proposed' | 'review' | 'approved' | 'enacted' | 'repealed' | 'amended'
export type ClauseSeverity = 'constitutional' | 'statutory' | 'regulatory' | 'guideline'

export interface Clause {
  id: string
  /** 条款编号（如 3.1, A.2） */
  number: string
  /** 条款标题 */
  title: string
  /** 条款正文 */
  content: string
  /** 条款类型 */
  type: ClauseType
  /** 条款状态 */
  status: ClauseStatus
  /** 严重级别 */
  severity: ClauseSeverity
  /** 所属章节 */
  chapter: string
  /** 排序 */
  order: number
  /** 是否启用 */
  enabled: boolean
  /** 标签 */
  tags: string[]
  /** 版本历史 */
  versions: ClauseVersion[]
  /** 当前版本号 */
  currentVersion: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 生效时间 */
  effectiveAt?: string
  /** 废止时间 */
  repealedAt?: string
  /** 关联条款编号 */
  relatedClauses: string[]
  /** 作者 */
  author: string
}

export interface ClauseVersion {
  version: number
  content: string
  title: string
  changedAt: string
  changedBy: string
  changeDescription: string
  diff?: string
}

// ---- 修订工作流 ----

export interface Amendment {
  id: string
  /** 修订标题 */
  title: string
  /** 修订描述 */
  description: string
  /** 提议者 */
  proposer: string
  /** 涉及的条款编号列表 */
  targetClauseNumbers: string[]
  /** 提议的变更 */
  changes: AmendmentChange[]
  /** 修订状态 */
  status: 'draft' | 'proposed' | 'under_review' | 'approved' | 'rejected' | 'enacted'
  /** 评审意见 */
  reviews: AmendmentReview[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 批准时间 */
  approvedAt?: string
  /** 生效时间 */
  enactedAt?: string
}

export interface AmendmentChange {
  clauseNumber: string
  changeType: 'add' | 'modify' | 'repeal' | 'renumber'
  oldContent?: string
  newContent: string
  oldTitle?: string
  newTitle?: string
  rationale: string
}

export interface AmendmentReview {
  reviewer: string
  opinion: 'approve' | 'reject' | 'abstain' | 'request_changes'
  comment: string
  reviewedAt: string
}

// ---- 冲突检测 ----

export interface ClauseConflict {
  id: string
  clauseA: string // 条款编号
  clauseB: string // 条款编号
  type: 'contradiction' | 'overlap' | 'tension' | 'precedence'
  description: string
  severity: 'critical' | 'major' | 'minor'
  suggestion: string
  detectedAt: string
  resolved: boolean
  resolvedAt?: string
}

// ---- 存储键 ----

const CLAUSE_STORAGE_KEYS = {
  CLAUSES: 'hf:constitution:clauses',
  AMENDMENTS: 'hf:constitution:amendments',
  CONFLICTS: 'hf:constitution:conflicts',
} as const

// ---- 预设系统条款（不可删除） ----

const SYSTEM_CLAUSES: Omit<Clause, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    number: '1',
    title: '数据本地私有',
    content: '所有用户数据存储于本地设备，未经用户明确授权，不向任何外部服务器传输数据。',
    type: 'core',
    status: 'enacted',
    severity: 'constitutional',
    chapter: '第一章·基本原则',
    order: 1,
    enabled: true,
    tags: ['隐私', '安全', '核心价值'],
    versions: [],
    currentVersion: 1,
    relatedClauses: [],
    author: 'system',
  },
  {
    number: '2',
    title: '超级自定义',
    content: '用户有权对界面、功能、流程进行深度自定义，系统不得限制用户的可定制范围。',
    type: 'core',
    status: 'enacted',
    severity: 'constitutional',
    chapter: '第一章·基本原则',
    order: 2,
    enabled: true,
    tags: ['自定义', '自由', '核心价值'],
    versions: [],
    currentVersion: 1,
    relatedClauses: [],
    author: 'system',
  },
  {
    number: '3',
    title: '心流第一',
    content: '系统设计以保护用户心流体验为最高优先级，任何打断需经用户许可。',
    type: 'core',
    status: 'enacted',
    severity: 'constitutional',
    chapter: '第一章·基本原则',
    order: 3,
    enabled: true,
    tags: ['心流', '体验', '核心价值'],
    versions: [],
    currentVersion: 1,
    relatedClauses: [],
    author: 'system',
  },
  {
    number: '4',
    title: '数据驱动自我探索',
    content: '系统提供数据分析和洞察，但最终解释权和决策权归用户所有。',
    type: 'core',
    status: 'enacted',
    severity: 'constitutional',
    chapter: '第一章·基本原则',
    order: 4,
    enabled: true,
    tags: ['数据', '洞察', '核心价值'],
    versions: [],
    currentVersion: 1,
    relatedClauses: [],
    author: 'system',
  },
  {
    number: '5',
    title: '中性呈现',
    content: '系统以中性、客观的方式呈现信息和数据，避免引导性设计或算法偏见。',
    type: 'core',
    status: 'enacted',
    severity: 'constitutional',
    chapter: '第一章·基本原则',
    order: 5,
    enabled: true,
    tags: ['中性', '客观', '核心价值'],
    versions: [],
    currentVersion: 1,
    relatedClauses: [],
    author: 'system',
  },
]

// ============================================================
// useClauseEditor
// ============================================================

export function useClauseEditor() {
  const clauses = ref<Clause[]>([])
  const amendments = ref<Amendment[]>([])
  const conflicts = ref<ClauseConflict[]>([])

  // ---- 持久化 ----

  function loadAll(): void {
    const storedClauses = storage.getKV<Clause[]>(CLAUSE_STORAGE_KEYS.CLAUSES, [])
    if (storedClauses && storedClauses.length > 0) {
      clauses.value = storedClauses
    } else {
      // 初始化系统条款
      clauses.value = SYSTEM_CLAUSES.map((c) => ({
        ...c,
        id: `clause-${Date.now()}-${c.number}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        effectiveAt: new Date().toISOString(),
      }))
      saveClauses()
    }

    amendments.value = storage.getKV<Amendment[]>(CLAUSE_STORAGE_KEYS.AMENDMENTS, []) || []
    conflicts.value = storage.getKV<ClauseConflict[]>(CLAUSE_STORAGE_KEYS.CONFLICTS, []) || []
  }

  function saveClauses(): void {
    storage.setKV(CLAUSE_STORAGE_KEYS.CLAUSES, clauses.value)
  }

  function saveAmendments(): void {
    storage.setKV(CLAUSE_STORAGE_KEYS.AMENDMENTS, amendments.value)
  }

  function saveConflicts(): void {
    storage.setKV(CLAUSE_STORAGE_KEYS.CONFLICTS, conflicts.value)
  }

  // ---- 条款管理 ----

  function addClause(
    number: string,
    title: string,
    content: string,
    type: ClauseType = 'user',
    severity: ClauseSeverity = 'statutory',
    chapter: string = '用户条款',
    tags: string[] = [],
    author: string = 'user',
  ): Clause {
    const maxOrder = Math.max(...clauses.value.map((c) => c.order), 0)

    const clause: Clause = {
      id: `clause-${Date.now()}`,
      number,
      title,
      content,
      type,
      status: 'draft',
      severity,
      chapter,
      order: maxOrder + 1,
      enabled: true,
      tags,
      versions: [
        {
          version: 1,
          content,
          title,
          changedAt: new Date().toISOString(),
          changedBy: author,
          changeDescription: '初始版本',
        },
      ],
      currentVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedClauses: [],
      author,
    }

    clauses.value.push(clause)
    saveClauses()

    // 检测冲突
    detectConflictsForClause(clause)

    return clause
  }

  function updateClause(
    clauseId: string,
    updates: Partial<Pick<Clause, 'title' | 'content' | 'status' | 'severity' | 'chapter' | 'enabled' | 'tags' | 'relatedClauses'>>,
    changedBy: string = 'user',
    changeDescription: string = '更新条款',
  ): Clause | undefined {
    const idx = clauses.value.findIndex((c) => c.id === clauseId)
    if (idx === -1) return undefined

    const clause = clauses.value[idx]

    // 不允许修改系统核心条款（编号 1-5）
    if (clause.type === 'core' && clause.severity === 'constitutional') {
      return undefined
    }

    const newVersion = clause.currentVersion + 1

    // 创建版本记录
    const version: ClauseVersion = {
      version: newVersion,
      content: updates.content || clause.content,
      title: updates.title || clause.title,
      changedAt: new Date().toISOString(),
      changedBy,
      changeDescription,
    }

    clause.versions.push(version)
    clause.currentVersion = newVersion
    clause.title = updates.title || clause.title
    clause.content = updates.content || clause.content
    if (updates.status) clause.status = updates.status
    if (updates.severity) clause.severity = updates.severity
    if (updates.chapter) clause.chapter = updates.chapter
    if (updates.enabled !== undefined) clause.enabled = updates.enabled
    if (updates.tags) clause.tags = updates.tags
    if (updates.relatedClauses) clause.relatedClauses = updates.relatedClauses
    clause.updatedAt = new Date().toISOString()

    saveClauses()

    // 重新检测冲突
    removeResolvedConflictsForClause(clause.number)
    detectConflictsForClause(clause)

    return clause
  }

  function repealClause(clauseId: string, reason: string = '用户主动废止'): Clause | undefined {
    const idx = clauses.value.findIndex((c) => c.id === clauseId)
    if (idx === -1) return undefined

    const clause = clauses.value[idx]

    // 不允许废止核心条款
    if (clause.type === 'core' && clause.severity === 'constitutional') {
      return undefined
    }

    clause.status = 'repealed'
    clause.enabled = false
    clause.repealedAt = new Date().toISOString()
    clause.updatedAt = new Date().toISOString()

    // 记录版本
    clause.versions.push({
      version: clause.currentVersion + 1,
      content: clause.content,
      title: clause.title,
      changedAt: new Date().toISOString(),
      changedBy: 'user',
      changeDescription: `废止：${reason}`,
    })
    clause.currentVersion++

    saveClauses()
    return clause
  }

  function removeClause(clauseId: string): boolean {
    const clause = clauses.value.find((c) => c.id === clauseId)
    if (!clause) return false

    // 不允许删除核心条款
    if (clause.type === 'core' && clause.severity === 'constitutional') {
      return false
    }

    clauses.value = clauses.value.filter((c) => c.id !== clauseId)
    saveClauses()
    return true
  }

  function getClause(clauseId: string): Clause | undefined {
    return clauses.value.find((c) => c.id === clauseId)
  }

  function getClauseByNumber(number: string): Clause | undefined {
    return clauses.value.find((c) => c.number === number)
  }

  function getClausesByChapter(chapter: string): Clause[] {
    return clauses.value
      .filter((c) => c.chapter === chapter)
      .sort((a, b) => a.order - b.order)
  }

  function getEnabledClauses(): Clause[] {
    return clauses.value.filter((c) => c.enabled)
  }

  function getUserClauses(): Clause[] {
    return clauses.value.filter((c) => c.type === 'user')
  }

  // ---- 修订工作流 ----

  function createAmendment(
    title: string,
    description: string,
    proposer: string,
    changes: AmendmentChange[],
  ): Amendment {
    const amendment: Amendment = {
      id: `amd-${Date.now()}`,
      title,
      description,
      proposer,
      targetClauseNumbers: changes.map((c) => c.clauseNumber),
      changes,
      status: 'draft',
      reviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    amendments.value.push(amendment)
    saveAmendments()
    return amendment
  }

  function submitAmendment(amendmentId: string): Amendment | undefined {
    const amendment = amendments.value.find((a) => a.id === amendmentId)
    if (!amendment || amendment.status !== 'draft') return undefined

    amendment.status = 'proposed'
    amendment.updatedAt = new Date().toISOString()
    saveAmendments()
    return amendment
  }

  function reviewAmendment(
    amendmentId: string,
    reviewer: string,
    opinion: AmendmentReview['opinion'],
    comment: string,
  ): Amendment | undefined {
    const amendment = amendments.value.find((a) => a.id === amendmentId)
    if (!amendment || (amendment.status !== 'proposed' && amendment.status !== 'under_review')) return undefined

    amendment.reviews.push({
      reviewer,
      opinion,
      comment,
      reviewedAt: new Date().toISOString(),
    })

    amendment.status = 'under_review'
    amendment.updatedAt = new Date().toISOString()
    saveAmendments()
    return amendment
  }

  function approveAmendment(amendmentId: string): Amendment | undefined {
    const amendment = amendments.value.find((a) => a.id === amendmentId)
    if (!amendment || amendment.status !== 'under_review') return undefined

    amendment.status = 'approved'
    amendment.approvedAt = new Date().toISOString()
    amendment.updatedAt = new Date().toISOString()
    saveAmendments()
    return amendment
  }

  function rejectAmendment(amendmentId: string): Amendment | undefined {
    const amendment = amendments.value.find((a) => a.id === amendmentId)
    if (!amendment || amendment.status !== 'under_review') return undefined

    amendment.status = 'rejected'
    amendment.updatedAt = new Date().toISOString()
    saveAmendments()
    return amendment
  }

  function enactAmendment(amendmentId: string): Amendment | undefined {
    const amendment = amendments.value.find((a) => a.id === amendmentId)
    if (!amendment || amendment.status !== 'approved') return undefined

    // 应用变更
    amendment.changes.forEach((change) => {
      const clause = getClauseByNumber(change.clauseNumber)

      switch (change.changeType) {
        case 'add':
          addClause(
            change.clauseNumber,
            change.newTitle || '新条款',
            change.newContent,
            'user',
            'statutory',
            '修订条款',
            [],
            amendment.proposer,
          )
          break
        case 'modify':
          if (clause) {
            updateClause(
              clause.id,
              {
                title: change.newTitle,
                content: change.newContent,
              },
              amendment.proposer,
              `修订案 ${amendment.title}: ${change.rationale}`,
            )
          }
          break
        case 'repeal':
          if (clause) {
            repealClause(clause.id, `修订案 ${amendment.title}: ${change.rationale}`)
          }
          break
        case 'renumber':
          if (clause) {
            updateClause(
              clause.id,
              { title: change.newTitle || clause.title },
              amendment.proposer,
              `重新编号: ${change.rationale}`,
            )
          }
          break
      }
    })

    amendment.status = 'enacted'
    amendment.enactedAt = new Date().toISOString()
    amendment.updatedAt = new Date().toISOString()
    saveAmendments()
    return amendment
  }

  function getAmendment(amendmentId: string): Amendment | undefined {
    return amendments.value.find((a) => a.id === amendmentId)
  }

  function getAmendmentsByStatus(status: Amendment['status']): Amendment[] {
    return amendments.value.filter((a) => a.status === status)
  }

  // ---- 冲突检测 ----

  function detectConflictsForClause(clause: Clause): ClauseConflict[] {
    const newConflicts: ClauseConflict[] = []

    const allEnabled = clauses.value.filter((c) => c.enabled && c.id !== clause.id)

    allEnabled.forEach((other) => {
      // 检测矛盾：关键词冲突
      const contradictions = detectContradictions(clause, other)
      if (contradictions) {
        newConflicts.push(contradictions)
      }

      // 检测重叠：内容相似度
      const overlap = detectOverlap(clause, other)
      if (overlap) {
        newConflicts.push(overlap)
      }

      // 检测张力：相关条款间的潜在冲突
      const tension = detectTension(clause, other)
      if (tension) {
        newConflicts.push(tension)
      }
    })

    conflicts.value.push(...newConflicts)
    if (newConflicts.length > 0) saveConflicts()

    return newConflicts
  }

  function detectContradictions(clauseA: Clause, clauseB: Clause): ClauseConflict | null {
    const contradictionPairs = [
      ['必须', '不应'],
      ['禁止', '允许'],
      ['强制', '可选'],
      ['自动', '手动'],
      ['公开', '保密'],
      ['在线', '离线'],
      ['同步', '异步'],
      ['实时', '延迟'],
      ['集中', '分散'],
      ['统一', '独立'],
    ]

    const contentA = clauseA.content
    const contentB = clauseB.content

    for (const [wordA, wordB] of contradictionPairs) {
      if (contentA.includes(wordA) && contentB.includes(wordB)) {
        return {
          id: `conflict-${Date.now()}`,
          clauseA: clauseA.number,
          clauseB: clauseB.number,
          type: 'contradiction',
          description: `条款 ${clauseA.number} 包含"${wordA}"，条款 ${clauseB.number} 包含"${wordB}"，可能存在矛盾`,
          severity: 'critical',
          suggestion: `建议明确两者的适用范围或修改其中一条以避免矛盾`,
          detectedAt: new Date().toISOString(),
          resolved: false,
        }
      }
      if (contentB.includes(wordA) && contentA.includes(wordB)) {
        return {
          id: `conflict-${Date.now()}`,
          clauseA: clauseA.number,
          clauseB: clauseB.number,
          type: 'contradiction',
          description: `条款 ${clauseB.number} 包含"${wordA}"，条款 ${clauseA.number} 包含"${wordB}"，可能存在矛盾`,
          severity: 'critical',
          suggestion: `建议明确两者的适用范围或修改其中一条以避免矛盾`,
          detectedAt: new Date().toISOString(),
          resolved: false,
        }
      }
    }

    return null
  }

  function detectOverlap(clauseA: Clause, clauseB: Clause): ClauseConflict | null {
    // 计算内容相似度（简单 Jaccard 相似度）
    const wordsA = new Set(clauseA.content.split(/[\s，。、；：""''！？\n]+/).filter((w) => w.length > 1))
    const wordsB = new Set(clauseB.content.split(/[\s，。、；：""''！？\n]+/).filter((w) => w.length > 1))

    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
    const union = new Set([...wordsA, ...wordsB])

    const similarity = intersection.size / union.size

    if (similarity > 0.6) {
      return {
        id: `conflict-${Date.now()}`,
        clauseA: clauseA.number,
        clauseB: clauseB.number,
        type: 'overlap',
        description: `条款 ${clauseA.number} 与条款 ${clauseB.number} 内容相似度 ${Math.round(similarity * 100)}%，可能存在重叠`,
        severity: similarity > 0.8 ? 'major' : 'minor',
        suggestion: '建议合并或明确各自适用范围',
        detectedAt: new Date().toISOString(),
        resolved: false,
      }
    }

    return null
  }

  function detectTension(clauseA: Clause, clauseB: Clause): ClauseConflict | null {
    // 检测相关条款间的潜在张力（共享标签但内容不同）
    const sharedTags = clauseA.tags.filter((t) => clauseB.tags.includes(t))

    if (sharedTags.length > 0 && clauseA.severity !== clauseB.severity) {
      return {
        id: `conflict-${Date.now()}`,
        clauseA: clauseA.number,
        clauseB: clauseB.number,
        type: 'tension',
        description: `条款 ${clauseA.number} 和 ${clauseB.number} 共享标签 [${sharedTags.join(', ')}] 但严重级别不同`,
        severity: 'minor',
        suggestion: '建议统一标签相关条款的严重级别',
        detectedAt: new Date().toISOString(),
        resolved: false,
      }
    }

    return null
  }

  function resolveConflict(conflictId: string): ClauseConflict | undefined {
    const conflict = conflicts.value.find((c) => c.id === conflictId)
    if (!conflict) return undefined

    conflict.resolved = true
    conflict.resolvedAt = new Date().toISOString()
    saveConflicts()
    return conflict
  }

  function removeResolvedConflictsForClause(clauseNumber: string): void {
    conflicts.value = conflicts.value.filter(
      (c) => !(c.clauseA === clauseNumber || c.clauseB === clauseNumber) || !c.resolved,
    )
    saveConflicts()
  }

  function getUnresolvedConflicts(): ClauseConflict[] {
    return conflicts.value.filter((c) => !c.resolved)
  }

  function getConflictsForClause(clauseNumber: string): ClauseConflict[] {
    return conflicts.value.filter(
      (c) => (c.clauseA === clauseNumber || c.clauseB === clauseNumber) && !c.resolved,
    )
  }

  // ---- 统计与报告 ----

  function getClauseStats(): {
    total: number
    enabled: number
    byType: Record<ClauseType, number>
    byStatus: Record<ClauseStatus, number>
    bySeverity: Record<ClauseSeverity, number>
    totalAmendments: number
    pendingAmendments: number
    unresolvedConflicts: number
  } {
    const byType: Record<ClauseType, number> = { core: 0, user: 0, system: 0, derived: 0 }
    const byStatus: Record<ClauseStatus, number> = {
      draft: 0, proposed: 0, review: 0, approved: 0, enacted: 0, repealed: 0, amended: 0,
    }
    const bySeverity: Record<ClauseSeverity, number> = {
      constitutional: 0, statutory: 0, regulatory: 0, guideline: 0,
    }

    clauses.value.forEach((c) => {
      byType[c.type] = (byType[c.type] || 0) + 1
      byStatus[c.status] = (byStatus[c.status] || 0) + 1
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1
    })

    return {
      total: clauses.value.length,
      enabled: clauses.value.filter((c) => c.enabled).length,
      byType,
      byStatus,
      bySeverity,
      totalAmendments: amendments.value.length,
      pendingAmendments: amendments.value.filter((a) => a.status === 'proposed' || a.status === 'under_review').length,
      unresolvedConflicts: conflicts.value.filter((c) => !c.resolved).length,
    }
  }

  function generateClauseReport(): {
    generatedAt: string
    totalClauses: number
    chapters: string[]
    amendments: { total: number; enacted: number; pending: number }
    conflicts: { total: number; unresolved: number }
    health: 'healthy' | 'caution' | 'warning' | 'critical'
  } {
    const chapters = [...new Set(clauses.value.map((c) => c.chapter))]
    const unresolvedConflicts = conflicts.value.filter((c) => !c.resolved).length

    let health: 'healthy' | 'caution' | 'warning' | 'critical' = 'healthy'
    if (unresolvedConflicts > 5) health = 'critical'
    else if (unresolvedConflicts > 2) health = 'warning'
    else if (unresolvedConflicts > 0) health = 'caution'

    return {
      generatedAt: new Date().toISOString(),
      totalClauses: clauses.value.length,
      chapters,
      amendments: {
        total: amendments.value.length,
        enacted: amendments.value.filter((a) => a.status === 'enacted').length,
        pending: amendments.value.filter((a) => a.status === 'proposed' || a.status === 'under_review').length,
      },
      conflicts: {
        total: conflicts.value.length,
        unresolved: unresolvedConflicts,
      },
      health,
    }
  }

  // ---- 初始化 ----

  loadAll()

  return {
    clauses,
    amendments,
    conflicts,
    // 条款管理
    addClause,
    updateClause,
    repealClause,
    removeClause,
    getClause,
    getClauseByNumber,
    getClausesByChapter,
    getEnabledClauses,
    getUserClauses,
    // 修订工作流
    createAmendment,
    submitAmendment,
    reviewAmendment,
    approveAmendment,
    rejectAmendment,
    enactAmendment,
    getAmendment,
    getAmendmentsByStatus,
    // 冲突检测
    detectConflictsForClause,
    resolveConflict,
    getUnresolvedConflicts,
    getConflictsForClause,
    // 统计
    getClauseStats,
    generateClauseReport,
    loadAll,
  }
}