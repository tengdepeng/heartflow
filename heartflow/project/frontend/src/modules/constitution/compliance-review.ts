// ============================================================
// 宪法体系 · 合规审查流程
// P13增强：0% → 80%
// 蓝图定义：正式审查流程 + 合规清单 + 自动化评分 + 审查历史
// ============================================================

import { ref } from 'vue'
import type { ComplianceResult } from './types'
import { storage } from '../../engine/storage'
import { isOsNotificationBlocked } from '../../engine/compliance-gate'

// ---- 审查流程状态机 ----

export type ReviewStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'needs_revision'

export interface ReviewSession {
  id: string
  status: ReviewStatus
  /** 审查发起人 */
  initiator: string
  /** 审查标题 */
  title: string
  /** 审查描述 */
  description: string
  /** 合规检查结果 */
  complianceResult: ComplianceResult
  /** 审查清单进度 */
  checklistProgress: number
  /** 审查意见 */
  comments: ReviewComment[]
  /** 审查决策 */
  decision?: ReviewDecision
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ReviewComment {
  id: string
  author: string
  content: string
  /** 关联的合规清单项 */
  checklistItemId?: string
  /** 建议类型 */
  type: 'concern' | 'suggestion' | 'approval' | 'blocker'
  createdAt: string
}

export interface ReviewDecision {
  /** 最终决定 */
  verdict: 'approved' | 'rejected' | 'conditional'
  /** 条件（如果是有条件通过） */
  conditions?: string[]
  /** 决定理由 */
  reason: string
  /** 决定时间 */
  decidedAt: string
  /** 决定人 */
  decidedBy: string
}

// ---- 合规清单 ----

export interface ChecklistItem {
  id: string
  category: ChecklistCategory
  /** 检查项标题 */
  title: string
  /** 检查项描述 */
  description: string
  /** 关联的核心价值 */
  coreValue: string
  /** 权重 (1-5) */
  weight: number
  /** 检查方法 */
  checkMethod: 'auto' | 'manual'
  /** 自动检查规则（仅 checkMethod === 'auto' 时有意义） */
  autoRule?: string
  /** 手动项原因：当 checkMethod === 'manual' 时说明为何无法自动检测、必须由人工核验 */
  manualReason?: string
  /** 是否通过 */
  passed: boolean | null
  /** 备注 */
  notes?: string
  /** 检查时间 */
  checkedAt?: string
}

export type ChecklistCategory =
  | 'data-sovereignty'
  | 'user-autonomy'
  | 'flow-preservation'
  | 'neutrality'
  | 'privacy'
  | 'security'
  | 'accessibility'
  | 'interoperability'

export const CHECKLIST_CATEGORIES: Record<ChecklistCategory, { label: string; description: string; icon: string }> = {
  'data-sovereignty': { label: '数据主权', description: '用户对其数据拥有完全控制权', icon: '🗄️' },
  'user-autonomy': { label: '用户自主', description: '所有规则和界面可由用户自定义', icon: '🎛️' },
  'flow-preservation': { label: '心流保护', description: '功能设计以维护心流为首要目标', icon: '🌊' },
  'neutrality': { label: '中性呈现', description: '不预设人格、身份或立场', icon: '⚖️' },
  'privacy': { label: '隐私保护', description: '数据仅存储于本地，不上传云端', icon: '🔒' },
  'security': { label: '安全保障', description: '数据加密和访问控制', icon: '🛡️' },
  'accessibility': { label: '可访问性', description: '界面对所有用户可用', icon: '♿' },
  'interoperability': { label: '互操作性', description: '支持数据导入导出', icon: '🔗' },
}

// ---- 默认合规清单 ----

// 检查方法说明：
// - 'auto' 仅保留运行时可真实探测的项。目前唯一可真实读取的是宪法第5条
//   「无强制推送」硬开关（经 engine/compliance-gate 单一真源），其余项的"通过"
//   无法通过应用运行时穷举验证，盲目返回 true 会掩盖真实风险。
// - 其余项一律显式降级为 'manual' 并附 manualReason，说明为何必须由人工核验，
//   杜绝"占位式自动通过"的虚假合规结论。
export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // 数据主权
  {
    id: 'cl-data-01',
    category: 'data-sovereignty',
    title: '所有用户数据仅保存在本地',
    description: '确认没有任何数据被上传到远程服务器',
    coreValue: 'local-private',
    weight: 5,
    checkMethod: 'manual',
    manualReason: '需在 CI 静态审计中扫描 fetch/axios/WebSocket/云 endpoint，运行时无法穷举所有网络出口。',
    passed: null,
  },
  {
    id: 'cl-data-02',
    category: 'data-sovereignty',
    title: '用户可随时导出所有数据',
    description: '提供完整的数据导出功能（JSON/CSV格式）',
    coreValue: 'local-private',
    weight: 5,
    checkMethod: 'manual',
    manualReason: '导出入口与格式随版本变动，需在功能层面人工确认导出面板可用。',
    passed: null,
  },
  {
    id: 'cl-data-03',
    category: 'data-sovereignty',
    title: '用户可彻底删除数据',
    description: '提供数据删除功能，包括级联删除相关数据',
    coreValue: 'local-private',
    weight: 4,
    checkMethod: 'manual',
    manualReason: '删除/级联清除入口需人工确认交互可用且不残留。',
    passed: null,
  },
  // 用户自主
  {
    id: 'cl-auto-01',
    category: 'user-autonomy',
    title: '所有可修改条款均可由用户编辑',
    description: '宪法第3-52条可通过编辑器修改',
    coreValue: 'super-custom',
    weight: 5,
    checkMethod: 'manual',
    manualReason: '宪法编辑器可用性需人工确认条款可编辑并持久化保存。',
    passed: null,
  },
  {
    id: 'cl-auto-02',
    category: 'user-autonomy',
    title: '界面主题可完全自定义',
    description: '用户可自定义颜色、字体、布局等视觉元素',
    coreValue: 'super-custom',
    weight: 3,
    checkMethod: 'manual',
    manualReason: '主题/字体/布局可定制程度需人工核验界面。',
    passed: null,
  },
  {
    id: 'cl-auto-03',
    category: 'user-autonomy',
    title: '工作流可自定义',
    description: '用户可配置自动化规则和工作流',
    coreValue: 'super-custom',
    weight: 3,
    checkMethod: 'manual',
    manualReason: '工作流可配置性需人工核验配置面板可保存生效。',
    passed: null,
  },
  // 心流保护
  {
    id: 'cl-flow-01',
    category: 'flow-preservation',
    title: '无强制推送通知',
    description: '所有通知均为用户主动选择，无强制推送',
    coreValue: 'flow-first',
    weight: 4,
    checkMethod: 'auto',
    autoRule: 'no-push-notifications',
    passed: null,
  },
  {
    id: 'cl-flow-02',
    category: 'flow-preservation',
    title: '专注模式不被中断',
    description: '计时器运行期间不应有弹窗或打断',
    coreValue: 'flow-first',
    weight: 5,
    checkMethod: 'manual',
    manualReason: '专注模式期间是否有打断需端到端/集成测试确认无全局弹窗或 OS 通知。',
    passed: null,
  },
  {
    id: 'cl-flow-03',
    category: 'flow-preservation',
    title: '操作延迟最小化',
    description: '交互响应时间应在100ms以内',
    coreValue: 'flow-first',
    weight: 3,
    checkMethod: 'manual',
    manualReason: '交互响应延迟需在真机/性能基准下实测（100ms 阈值），无法静态判定。',
    passed: null,
  },
  // 中性呈现
  {
    id: 'cl-neu-01',
    category: 'neutrality',
    title: '不预设用户身份',
    description: '界面文案不使用性别化、职业化等预设称呼',
    coreValue: 'neutral',
    weight: 3,
    checkMethod: 'manual',
    manualReason: '文案语气是否中性需在界面层人工通读核验。',
    passed: null,
  },
  {
    id: 'cl-neu-02',
    category: 'neutrality',
    title: '不提供价值判断',
    description: '系统不给出"好/坏""正确/错误"等价值判断',
    coreValue: 'neutral',
    weight: 4,
    checkMethod: 'manual',
    manualReason: '是否存在隐性评判需在界面/报告层人工通读核验。',
    passed: null,
  },
  {
    id: 'cl-neu-03',
    category: 'neutrality',
    title: '数据分析提供原材料而非结论',
    description: '统计数据呈现事实，不附加解读和评判',
    coreValue: 'data-driven',
    weight: 4,
    checkMethod: 'manual',
    manualReason: '统计呈现是否仅给事实需人工核验界面文案与图表注释。',
    passed: null,
  },
  // 隐私保护
  {
    id: 'cl-priv-01',
    category: 'privacy',
    title: '无第三方追踪',
    description: '确认没有集成任何第三方分析或追踪SDK',
    coreValue: 'local-private',
    weight: 5,
    checkMethod: 'manual',
    manualReason: '需审计依赖树与打包产物确认无三方追踪/分析 SDK，运行时无法穷举。',
    passed: null,
  },
  {
    id: 'cl-priv-02',
    category: 'privacy',
    title: '数据加密存储',
    description: '敏感数据应使用加密存储',
    coreValue: 'local-private',
    weight: 4,
    checkMethod: 'manual',
    manualReason: '明文 JSON 文件存储引擎是否对敏感字段加密需核验存储层实现。',
    passed: null,
  },
  // 安全保障
  {
    id: 'cl-sec-01',
    category: 'security',
    title: '沙箱隔离机制运行正常',
    description: '插件和扩展在沙箱中运行，无法访问核心数据',
    coreValue: 'local-private',
    weight: 4,
    checkMethod: 'manual',
    manualReason: '插件/扩展沙箱隔离需在运行架构层人工确认边界。',
    passed: null,
  },
  {
    id: 'cl-sec-02',
    category: 'security',
    title: '无远程代码执行风险',
    description: '确认没有eval或动态代码执行',
    coreValue: 'local-private',
    weight: 5,
    checkMethod: 'manual',
    manualReason: '需静态审计源码确认无 eval/Function/动态代码执行，运行时无法穷举。',
    passed: null,
  },
  // 可访问性
  {
    id: 'cl-acc-01',
    category: 'accessibility',
    title: '键盘导航可用',
    description: '所有功能可通过键盘操作',
    coreValue: 'super-custom',
    weight: 2,
    checkMethod: 'manual',
    manualReason: '键盘可达性需人工/无障碍测试逐页确认。',
    passed: null,
  },
  {
    id: 'cl-acc-02',
    category: 'accessibility',
    title: '屏幕阅读器兼容',
    description: '关键界面元素有适当的ARIA标签',
    coreValue: 'super-custom',
    weight: 2,
    checkMethod: 'manual',
    manualReason: 'ARIA 标签完整性需借助屏幕阅读器人工核验。',
    passed: null,
  },
  // 互操作性
  {
    id: 'cl-int-01',
    category: 'interoperability',
    title: '数据导入功能可用',
    description: '支持从其他工具导入数据',
    coreValue: 'super-custom',
    weight: 3,
    checkMethod: 'manual',
    manualReason: '数据导入入口与格式支持需人工确认。',
    passed: null,
  },
  {
    id: 'cl-int-02',
    category: 'interoperability',
    title: '数据导出格式完整',
    description: '导出数据包含所有必要的元数据',
    coreValue: 'super-custom',
    weight: 3,
    checkMethod: 'manual',
    manualReason: '导出数据元数据完整性需人工核验。',
    passed: null,
  },
]

// ---- 审查历史 ----

export interface ReviewHistoryEntry {
  sessionId: string
  title: string
  status: ReviewStatus
  score: number
  checklistCompletion: number
  reviewer: string
  startedAt: string
  completedAt?: string
  verdict?: string
}

// ---- 合规审查 Composable ----

export function useComplianceReview() {
  const sessions = ref<ReviewSession[]>([])
  const checklist = ref<ChecklistItem[]>([])
  const history = ref<ReviewHistoryEntry[]>([])
  const isLoading = ref(false)

  /**
   * 初始化合规清单。
   * 以 DEFAULT_CHECKLIST 为方法/规则的单一事实源，纠正旧版"假自动通过"残留：
   * 当 DEFAULT 已将某项由 auto 降级为 manual 时，同步方法 + 理由，并清除不可信的历史
   * passed（旧值来自硬编码 true 的模拟检测），强制重新人工核验。
   */
  function initChecklist(): ChecklistItem[] {
    const saved = storage.getKV<ChecklistItem[]>('hf:constitution:checklist', [])
    const base = DEFAULT_CHECKLIST.map(item => ({ ...item }))
    if (saved && saved.length > 0) {
      const baseById = new Map(base.map(b => [b.id, b]))
      const normalized: ChecklistItem[] = saved.map(s => {
        const def = baseById.get(s.id)
        if (def && def.checkMethod === 'manual' && s.checkMethod === 'auto') {
          return { ...s, checkMethod: 'manual', autoRule: undefined, manualReason: def.manualReason, passed: null }
        }
        return s
      })
      checklist.value = normalized
      return normalized
    }
    checklist.value = base
    return base
  }

  /**
   * 自动检查清单项。
   * 仅处理运行时可真实探测的规则（checkMethod === 'auto'）；其余项一律为 manual，
   * 必须在 runChecklist 之外由人工通过 markChecklistItem 标记，杜绝虚假自动通过。
   *
   * 当前唯一可真实探测的自动项：
   * - no-push-notifications：读取宪法第5条硬门控（compliance-gate 单一真源）。
   *   门控启用（notificationBlocked=true）即"无强制推送"成立 → 通过。
   */
  function autoCheckItem(item: ChecklistItem): boolean {
    if (item.checkMethod !== 'auto' || !item.autoRule) return false

    switch (item.autoRule) {
      case 'no-push-notifications': {
        // 若宪法第5条门控处于"禁止主动推送"状态，则该合规项通过。
        // 读取失败时 fail-open 返回 false（未检测到即不通过，保守判定）。
        try {
          return !!isOsNotificationBlocked()
        } catch {
          return false
        }
      }
      default:
        return false
    }
  }

  /** 运行合规清单检查 */
  function runChecklist(reviewId?: string): ChecklistItem[] {
    const items = checklist.value.length > 0 ? checklist.value : initChecklist()

    const updatedItems = items.map(item => {
      if (item.checkMethod === 'auto') {
        return {
          ...item,
          passed: autoCheckItem(item),
          checkedAt: new Date().toISOString(),
        }
      }
      return item
    })

    checklist.value = updatedItems
    saveChecklist()

    // 如果有审查会话，更新进度
    if (reviewId) {
      updateReviewProgress(reviewId, updatedItems)
    }

    return updatedItems
  }

  /** 手动标记清单项 */
  function markChecklistItem(itemId: string, passed: boolean, notes?: string): void {
    const idx = checklist.value.findIndex(i => i.id === itemId)
    if (idx < 0) return

    checklist.value[idx] = {
      ...checklist.value[idx],
      passed,
      notes,
      checkedAt: new Date().toISOString(),
    }
    saveChecklist()
  }

  /** 获取清单进度 */
  function getChecklistProgress(): {
    total: number
    checked: number
    passed: number
    failed: number
    percentage: number
    byCategory: Record<string, { total: number; passed: number; percentage: number }>
  } {
    const items = checklist.value
    const total = items.length
    const checked = items.filter(i => i.passed !== null).length
    const passed = items.filter(i => i.passed === true).length
    const failed = items.filter(i => i.passed === false).length

    const byCategory: Record<string, { total: number; passed: number; percentage: number }> = {}
    for (const cat of Object.keys(CHECKLIST_CATEGORIES)) {
      const catItems = items.filter(i => i.category === cat)
      const catPassed = catItems.filter(i => i.passed === true).length
      byCategory[cat] = {
        total: catItems.length,
        passed: catPassed,
        percentage: catItems.length > 0 ? Math.round(catPassed / catItems.length * 100) : 0,
      }
    }

    return {
      total,
      checked,
      passed,
      failed,
      percentage: total > 0 ? Math.round(checked / total * 100) : 0,
      byCategory,
    }
  }

  /** 创建审查会话 */
  function createReview(
    title: string,
    description: string,
    complianceResult: ComplianceResult,
  ): ReviewSession {
    const session: ReviewSession = {
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'draft',
      initiator: 'system',
      title,
      description,
      complianceResult,
      checklistProgress: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    sessions.value.push(session)
    saveSessions()

    // 自动运行清单检查
    runChecklist(session.id)

    return session
  }

  /** 提交审查 */
  function submitReview(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.status !== 'draft') return false

    session.status = 'submitted'
    session.updatedAt = new Date().toISOString()
    saveSessions()
    addToHistory(session)
    return true
  }

  /** 开始审查 */
  function startReview(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.status !== 'submitted') return false

    session.status = 'in_review'
    session.updatedAt = new Date().toISOString()
    saveSessions()
    return true
  }

  /** 添加审查意见 */
  function addComment(
    sessionId: string,
    author: string,
    content: string,
    type: ReviewComment['type'],
    checklistItemId?: string,
  ): ReviewComment | null {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return null

    const comment: ReviewComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      author,
      content,
      checklistItemId,
      type,
      createdAt: new Date().toISOString(),
    }

    session.comments.push(comment)
    session.updatedAt = new Date().toISOString()
    saveSessions()
    return comment
  }

  /** 做出审查决定 */
  function makeDecision(
    sessionId: string,
    verdict: ReviewDecision['verdict'],
    reason: string,
    decidedBy: string,
    conditions?: string[],
  ): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.status !== 'in_review') return false

    const decision: ReviewDecision = {
      verdict,
      conditions,
      reason,
      decidedAt: new Date().toISOString(),
      decidedBy,
    }

    session.decision = decision
    session.status = verdict === 'rejected' ? 'rejected' : verdict === 'conditional' ? 'needs_revision' : 'approved'
    session.completedAt = new Date().toISOString()
    session.updatedAt = new Date().toISOString()
    saveSessions()
    updateHistoryEntry(session)
    return true
  }

  /** 计算合规自动化评分 */
  function computeAutoScore(complianceResult: ComplianceResult): {
    score: number
    breakdown: { category: string; score: number; maxScore: number; weight: number }[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    summary: string
  } {
    const items = checklist.value.length > 0 ? checklist.value : DEFAULT_CHECKLIST

    const breakdown: { category: string; score: number; maxScore: number; weight: number }[] = []
    let totalWeightedScore = 0
    let totalWeight = 0

    for (const cat of Object.keys(CHECKLIST_CATEGORIES)) {
      const catItems = items.filter(i => i.category === cat)
      if (catItems.length === 0) continue

      const catWeight = catItems.reduce((s, i) => s + i.weight, 0)
      const catPassed = catItems.filter(i => i.passed === true).length
      const catScore = catItems.length > 0 ? Math.round(catPassed / catItems.length * 100) : 0

      breakdown.push({
        category: CHECKLIST_CATEGORIES[cat as ChecklistCategory].label,
        score: catScore,
        maxScore: 100,
        weight: catWeight,
      })

      totalWeightedScore += catScore * catWeight
      totalWeight += catWeight
    }

    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0

    // 合规结果也影响评分
    const adjustedScore = Math.round(overallScore * 0.6 + complianceResult.score * 0.4)

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (adjustedScore < 40) riskLevel = 'critical'
    else if (adjustedScore < 60) riskLevel = 'high'
    else if (adjustedScore < 80) riskLevel = 'medium'

    const summary = adjustedScore >= 80
      ? '合规状态良好，核心价值得到充分保障'
      : adjustedScore >= 60
        ? '基本合规，但部分领域存在改进空间'
        : adjustedScore >= 40
          ? '合规风险较高，多项核心价值未得到充分保障'
          : '合规状态严重不足，需要立即整改'

    return {
      score: adjustedScore,
      breakdown,
      riskLevel,
      summary,
    }
  }

  /** 获取审查历史 */
  function getReviewHistory(): ReviewHistoryEntry[] {
    return history.value.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
  }

  // ---- 内部辅助方法 ----

  function updateReviewProgress(sessionId: string, items: ChecklistItem[]): void {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return

    const checked = items.filter(i => i.passed !== null).length
    session.checklistProgress = items.length > 0 ? Math.round(checked / items.length * 100) : 0
    session.updatedAt = new Date().toISOString()
    saveSessions()
  }

  function addToHistory(session: ReviewSession): void {
    history.value.push({
      sessionId: session.id,
      title: session.title,
      status: session.status,
      score: session.complianceResult.score,
      checklistCompletion: session.checklistProgress,
      reviewer: 'pending',
      startedAt: session.createdAt,
    })
    saveHistory()
  }

  function updateHistoryEntry(session: ReviewSession): void {
    const idx = history.value.findIndex(h => h.sessionId === session.id)
    if (idx < 0) return

    history.value[idx] = {
      ...history.value[idx],
      status: session.status,
      completedAt: session.completedAt,
      verdict: session.decision?.verdict,
    }
    saveHistory()
  }

  function saveChecklist(): void {
    storage.setKV('hf:constitution:checklist', checklist.value)
  }

  function saveSessions(): void {
    storage.setKV('hf:constitution:review_sessions', sessions.value)
  }

  function saveHistory(): void {
    storage.setKV('hf:constitution:review_history', history.value)
  }

  /** 加载持久化数据 */
  function load(): void {
    isLoading.value = true
    try {
      const savedSessions = storage.getKV<ReviewSession[]>('hf:constitution:review_sessions', [])
      if (savedSessions && savedSessions.length > 0) {
        sessions.value = savedSessions
      }

      const savedHistory = storage.getKV<ReviewHistoryEntry[]>('hf:constitution:review_history', [])
      if (savedHistory && savedHistory.length > 0) {
        history.value = savedHistory
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    sessions,
    checklist,
    history,
    isLoading,
    initChecklist,
    runChecklist,
    markChecklistItem,
    getChecklistProgress,
    createReview,
    submitReview,
    startReview,
    addComment,
    makeDecision,
    computeAutoScore,
    getReviewHistory,
    load,
  }
}

// ---- 审查状态标签 ----

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  in_review: '审查中',
  approved: '已通过',
  rejected: '已驳回',
  needs_revision: '需修订',
}
