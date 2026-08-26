// ============================================================
// 先祖遗志 · 殿堂遗嘱
// 蓝图定义：
//   将遗志系统升级为完整的殿堂遗嘱体系
//   支持遗嘱类型（物质/数字/精神）、受益人指定、条件触发
//   遗嘱执行仪式 + 遗嘱链 + 遗嘱历史
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { Will } from './types'

// ---- 遗嘱类型 ----

export type TestamentType = 'material' | 'digital' | 'spiritual' | 'knowledge' | 'ritual'

export const TESTAMENT_TYPE_LABELS: Record<TestamentType, string> = {
  material: '物质遗产',
  digital: '数字遗产',
  spiritual: '精神遗产',
  knowledge: '知识遗产',
  ritual: '仪式遗产',
}

export const TESTAMENT_TYPE_ICONS: Record<TestamentType, string> = {
  material: '💎',
  digital: '💾',
  spiritual: '🕯️',
  knowledge: '📚',
  ritual: '🎭',
}

/** 遗嘱触发条件类型 */
export type TestamentTrigger = 'immediate' | 'timed' | 'event' | 'guardian'

/** 遗嘱状态 */
export type TestamentStatus = 'draft' | 'sealed' | 'active' | 'executed' | 'revoked' | 'expired'

/** 受益人 */
export interface Beneficiary {
  id: string
  name: string
  relationship: string
  /** 接收遗嘱的优先级 */
  priority: number
  /** 是否已接收 */
  received: boolean
  /** 接收时间 */
  receivedAt: string | null
  /** 自定义接收条件 */
  conditions: string[]
}

/** 遗嘱条款 */
export interface TestamentClause {
  id: string
  title: string
  content: string
  type: TestamentType
  /** 关联的遗志 ID */
  linkedWillId?: string
  /** 受益人 IDs */
  beneficiaryIds: string[]
  /** 是否为核心条款 */
  isCore: boolean
  /** 执行顺序 */
  order: number
}

/** 遗嘱 */
export interface Testament {
  id: string
  /** 遗嘱名称 */
  name: string
  /** 立遗嘱人 */
  testator: string
  /** 遗嘱类型 */
  type: TestamentType
  /** 遗嘱状态 */
  status: TestamentStatus
  /** 触发条件 */
  trigger: TestamentTrigger
  /** 触发时间（timed 类型） */
  triggerAt: number | null
  /** 触发事件（event 类型） */
  triggerEvent: string | null
  /** 条款列表 */
  clauses: TestamentClause[]
  /** 受益人列表 */
  beneficiaries: Beneficiary[]
  /** 关联遗志 */
  linkedWills: string[]
  /** 遗嘱摘要 */
  summary: string
  /** 是否公开 */
  isPublic: boolean
  /** 是否已加密 */
  encrypted: boolean
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 执行时间 */
  executedAt: string | null
  /** 监护人 */
  guardian?: string
  /** 执行仪式 ID */
  executionRitualId?: string
}

/** 遗嘱执行仪式 */
export interface ExecutionRitual {
  id: string
  testamentId: string
  status: 'preparing' | 'reading' | 'distributing' | 'confirming' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  /** 执行的条款数 */
  clausesExecuted: number
  /** 已通知的受益人数 */
  beneficiariesNotified: number
  /** 仪式日志 */
  log: RitualLogEntry[]
}

/** 仪式日志条目 */
export interface RitualLogEntry {
  timestamp: string
  phase: string
  message: string
  details?: Record<string, any>
}

/** 遗嘱统计 */
export interface TestamentStats {
  total: number
  byType: { type: TestamentType; label: string; count: number }[]
  byStatus: { status: TestamentStatus; label: string; count: number }[]
  draft: number
  active: number
  executed: number
  totalBeneficiaries: number
  totalClauses: number
  linkedWills: number
}

// ---- 存储键 ----
const TESTAMENTS_KEY = 'hf:testaments'
const RITUALS_KEY = 'hf:execution_rituals'

// ---- 遗嘱状态标签 ----

export const TESTAMENT_STATUS_LABELS: Record<TestamentStatus, string> = {
  draft: '草稿',
  sealed: '已封印',
  active: '生效中',
  executed: '已执行',
  revoked: '已撤销',
  expired: '已过期',
}

export const TRIGGER_LABELS: Record<TestamentTrigger, string> = {
  immediate: '立即生效',
  timed: '定时触发',
  event: '事件触发',
  guardian: '监护人确认',
}

// ============================================================
// 主 composable
// ============================================================

export function useTestament() {
  // ---- 数据加载 ----

  function loadTestaments(): Testament[] {
    try {
      return storage.getKV<Testament[]>(TESTAMENTS_KEY, [])
    } catch {
      return []
    }
  }

  function saveTestaments(data: Testament[]) {
    storage.setKV(TESTAMENTS_KEY, data)
  }

  function loadRituals(): ExecutionRitual[] {
    try {
      return storage.getKV<ExecutionRitual[]>(RITUALS_KEY, [])
    } catch {
      return []
    }
  }

  function saveRituals(data: ExecutionRitual[]) {
    storage.setKV(RITUALS_KEY, data)
  }

  // ---- 状态 ----

  const testaments = ref<Testament[]>(loadTestaments())
  const rituals = ref<ExecutionRitual[]>(loadRituals())

  // ---- 计算属性 ----

  /** 所有遗嘱 */
  const allTestaments = computed(() => testaments.value)

  /** 草稿遗嘱 */
  const draftTestaments = computed(() => testaments.value.filter(t => t.status === 'draft'))

  /** 生效中的遗嘱 */
  const activeTestaments = computed(() => testaments.value.filter(t => t.status === 'active'))

  /** 已执行的遗嘱 */
  const executedTestaments = computed(() => testaments.value.filter(t => t.status === 'executed'))

  /** 遗嘱统计 */
  const stats = computed<TestamentStats>(() => {
    const byType: { type: TestamentType; label: string; count: number }[] = []
    const byStatus: { status: TestamentStatus; label: string; count: number }[] = []

    const typeMap = new Map<TestamentType, number>()
    const statusMap = new Map<TestamentStatus, number>()

    for (const t of testaments.value) {
      typeMap.set(t.type, (typeMap.get(t.type) || 0) + 1)
      statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1)
    }

    for (const type of Object.keys(TESTAMENT_TYPE_LABELS) as TestamentType[]) {
      byType.push({ type, label: TESTAMENT_TYPE_LABELS[type], count: typeMap.get(type) || 0 })
    }

    for (const status of Object.keys(TESTAMENT_STATUS_LABELS) as TestamentStatus[]) {
      byStatus.push({ status, label: TESTAMENT_STATUS_LABELS[status], count: statusMap.get(status) || 0 })
    }

    let totalBeneficiaries = 0
    let totalClauses = 0
    let linkedWills = 0
    for (const t of testaments.value) {
      totalBeneficiaries += t.beneficiaries.length
      totalClauses += t.clauses.length
      linkedWills += t.linkedWills.length
    }

    return {
      total: testaments.value.length,
      byType,
      byStatus,
      draft: draftTestaments.value.length,
      active: activeTestaments.value.length,
      executed: executedTestaments.value.length,
      totalBeneficiaries,
      totalClauses,
      linkedWills,
    }
  })

  // ---- 方法 ----

  /**
   * 创建遗嘱
   */
  function createTestament(params: {
    name: string
    testator: string
    type: TestamentType
    trigger: TestamentTrigger
    triggerAt?: number
    triggerEvent?: string
    summary?: string
    isPublic?: boolean
    guardian?: string
  }): Testament {
    const now = new Date().toISOString()
    const testament: Testament = {
      id: `testament_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: params.name,
      testator: params.testator,
      type: params.type,
      status: 'draft',
      trigger: params.trigger,
      triggerAt: params.triggerAt || null,
      triggerEvent: params.triggerEvent || null,
      clauses: [],
      beneficiaries: [],
      linkedWills: [],
      summary: params.summary || '',
      isPublic: params.isPublic || false,
      encrypted: false,
      createdAt: now,
      updatedAt: now,
      executedAt: null,
      guardian: params.guardian,
    }

    testaments.value.unshift(testament)
    saveTestaments(testaments.value)
    return testament
  }

  /**
   * 更新遗嘱
   */
  function updateTestament(id: string, updates: Partial<Testament>): Testament | null {
    const idx = testaments.value.findIndex(t => t.id === id)
    if (idx === -1) return null

    testaments.value[idx] = {
      ...testaments.value[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveTestaments(testaments.value)
    return testaments.value[idx]
  }

  /**
   * 删除遗嘱
   */
  function removeTestament(id: string): boolean {
    const idx = testaments.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    testaments.value.splice(idx, 1)
    saveTestaments(testaments.value)
    return true
  }

  /**
   * 添加条款
   */
  function addClause(
    testamentId: string,
    params: {
      title: string
      content: string
      type: TestamentType
      beneficiaryIds: string[]
      linkedWillId?: string
      isCore?: boolean
    }
  ): TestamentClause | null {
    const testament = testaments.value.find(t => t.id === testamentId)
    if (!testament) return null

    const clause: TestamentClause = {
      id: `clause_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      title: params.title,
      content: params.content,
      type: params.type,
      beneficiaryIds: params.beneficiaryIds,
      linkedWillId: params.linkedWillId,
      isCore: params.isCore || false,
      order: testament.clauses.length + 1,
    }

    testament.clauses.push(clause)
    testament.updatedAt = new Date().toISOString()
    if (params.linkedWillId && !testament.linkedWills.includes(params.linkedWillId)) {
      testament.linkedWills.push(params.linkedWillId)
    }
    saveTestaments(testaments.value)
    return clause
  }

  /**
   * 移除条款
   */
  function removeClause(testamentId: string, clauseId: string): boolean {
    const testament = testaments.value.find(t => t.id === testamentId)
    if (!testament) return false

    const idx = testament.clauses.findIndex(c => c.id === clauseId)
    if (idx === -1) return false

    testament.clauses.splice(idx, 1)
    // 重新排序
    testament.clauses.forEach((c, i) => { c.order = i + 1 })
    testament.updatedAt = new Date().toISOString()
    saveTestaments(testaments.value)
    return true
  }

  /**
   * 添加受益人
   */
  function addBeneficiary(
    testamentId: string,
    params: {
      name: string
      relationship: string
      priority?: number
      conditions?: string[]
    }
  ): Beneficiary | null {
    const testament = testaments.value.find(t => t.id === testamentId)
    if (!testament) return null

    const beneficiary: Beneficiary = {
      id: `ben_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: params.name,
      relationship: params.relationship,
      priority: params.priority || testament.beneficiaries.length + 1,
      received: false,
      receivedAt: null,
      conditions: params.conditions || [],
    }

    testament.beneficiaries.push(beneficiary)
    testament.updatedAt = new Date().toISOString()
    saveTestaments(testaments.value)
    return beneficiary
  }

  /**
   * 移除受益人
   */
  function removeBeneficiary(testamentId: string, beneficiaryId: string): boolean {
    const testament = testaments.value.find(t => t.id === testamentId)
    if (!testament) return false

    const idx = testament.beneficiaries.findIndex(b => b.id === beneficiaryId)
    if (idx === -1) return false

    testament.beneficiaries.splice(idx, 1)
    // 从所有条款中移除该受益人
    for (const clause of testament.clauses) {
      clause.beneficiaryIds = clause.beneficiaryIds.filter(bid => bid !== beneficiaryId)
    }
    testament.updatedAt = new Date().toISOString()
    saveTestaments(testaments.value)
    return true
  }

  /**
   * 封印遗嘱（草稿 → 封印）
   */
  function sealTestament(id: string): Testament | null {
    const testament = testaments.value.find(t => t.id === id)
    if (!testament || testament.status !== 'draft') return null

    if (testament.clauses.length === 0) return null // 没有条款不能封印

    testament.status = 'sealed'
    testament.encrypted = true
    testament.updatedAt = new Date().toISOString()
    saveTestaments(testaments.value)
    return testament
  }

  /**
   * 激活遗嘱（封印 → 生效）
   */
  function activateTestament(id: string): Testament | null {
    const testament = testaments.value.find(t => t.id === id)
    if (!testament || testament.status !== 'sealed') return null

    testament.status = 'active'
    testament.updatedAt = new Date().toISOString()
    saveTestaments(testaments.value)
    return testament
  }

  /**
   * 撤销遗嘱
   */
  function revokeTestament(id: string, reason?: string): Testament | null {
    const testament = testaments.value.find(t => t.id === id)
    if (!testament) return null
    if (testament.status === 'executed') return null // 已执行的不能撤销

    testament.status = 'revoked'
    testament.updatedAt = new Date().toISOString()
    if (reason) {
      testament.summary = testament.summary
        ? `${testament.summary}\n撤销原因：${reason}`
        : `撤销原因：${reason}`
    }
    saveTestaments(testaments.value)
    return testament
  }

  /**
   * 执行遗嘱仪式
   */
  async function executeTestament(
    id: string,
    executor: string
  ): Promise<{ success: boolean; ritual?: ExecutionRitual; error?: string }> {
    const testament = testaments.value.find(t => t.id === id)
    if (!testament) return { success: false, error: '遗嘱不存在' }
    if (testament.status !== 'active') return { success: false, error: '遗嘱未生效' }

    // 检查触发条件
    if (testament.trigger === 'timed' && testament.triggerAt && testament.triggerAt > Date.now()) {
      return { success: false, error: '触发时间未到' }
    }
    if (testament.trigger === 'guardian' && testament.guardian !== executor) {
      return { success: false, error: '需要监护人确认' }
    }

    const now = new Date().toISOString()
    const ritual: ExecutionRitual = {
      id: `ritual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      testamentId: id,
      status: 'preparing',
      startedAt: now,
      completedAt: null,
      clausesExecuted: 0,
      beneficiariesNotified: 0,
      log: [{ timestamp: now, phase: 'preparing', message: `遗嘱执行仪式开始，执行人：${executor}` }],
    }

    try {
      // 阶段 1: 宣读
      ritual.status = 'reading'
      ritual.log.push({ timestamp: new Date().toISOString(), phase: 'reading', message: `宣读遗嘱「${testament.name}」` })
      await delay(500)

      // 阶段 2: 分配
      ritual.status = 'distributing'
      const coreClauses = testament.clauses.filter(c => c.isCore)
      const nonCoreClauses = testament.clauses.filter(c => !c.isCore)

      // 先执行核心条款
      for (const clause of [...coreClauses, ...nonCoreClauses]) {
        ritual.log.push({
          timestamp: new Date().toISOString(),
          phase: 'distributing',
          message: `执行条款「${clause.title}」`,
          details: { clauseId: clause.id, type: clause.type, beneficiaries: clause.beneficiaryIds.length },
        })
        ritual.clausesExecuted++
        await delay(200)
      }

      // 通知受益人
      for (const beneficiary of testament.beneficiaries) {
        ritual.log.push({
          timestamp: new Date().toISOString(),
          phase: 'distributing',
          message: `通知受益人：${beneficiary.name}（${beneficiary.relationship}）`,
        })
        beneficiary.received = true
        beneficiary.receivedAt = new Date().toISOString()
        ritual.beneficiariesNotified++
        await delay(150)
      }

      // 阶段 3: 确认
      ritual.status = 'confirming'
      ritual.log.push({ timestamp: new Date().toISOString(), phase: 'confirming', message: '确认所有条款已执行完毕' })
      await delay(300)

      // 完成
      ritual.status = 'completed'
      ritual.completedAt = new Date().toISOString()
      ritual.log.push({ timestamp: ritual.completedAt, phase: 'completed', message: '遗嘱执行仪式完成' })

      testament.status = 'executed'
      testament.executedAt = ritual.completedAt
      testament.executionRitualId = ritual.id
      testament.updatedAt = ritual.completedAt
      saveTestaments(testaments.value)

      rituals.value.unshift(ritual)
      saveRituals(rituals.value)

      return { success: true, ritual }
    } catch (e) {
      ritual.status = 'failed'
      ritual.log.push({ timestamp: new Date().toISOString(), phase: 'failed', message: `执行失败：${String(e)}` })
      rituals.value.unshift(ritual)
      saveRituals(rituals.value)
      return { success: false, error: String(e) }
    }
  }

  /**
   * 获取遗嘱执行仪式
   */
  function getExecutionRitual(testamentId: string): ExecutionRitual | undefined {
    return rituals.value.find(r => r.testamentId === testamentId)
  }

  /**
   * 获取遗嘱的传承链
   * 从遗嘱关联的遗志追溯到最早的祖先
   */
  function getTestamentLineage(testamentId: string): Will[] {
    const testament = testaments.value.find(t => t.id === testamentId)
    if (!testament) return []

    // 获取所有关联遗志
    const allWills = storage.getKV<Will[]>('hf:wills', [])
    const lineage: Will[] = []

    for (const willId of testament.linkedWills) {
      const will = allWills.find(w => w.id === willId)
      if (will) {
        lineage.push(will)
        // 追溯父遗志
        let current = will
        while (current.parentWillId) {
          const parent = allWills.find(w => w.id === current.parentWillId)
          if (parent) {
            lineage.unshift(parent)
            current = parent
          } else {
            break
          }
        }
      }
    }

    return lineage
  }

  /**
   * 检查遗嘱是否满足触发条件
   */
  function checkTriggerCondition(testament: Testament): boolean {
    switch (testament.trigger) {
      case 'immediate':
        return testament.status === 'active'
      case 'timed':
        return testament.triggerAt !== null && testament.triggerAt <= Date.now()
      case 'event':
        // 事件触发需要外部事件通知
        return false
      case 'guardian':
        return false // 需要监护人确认
      default:
        return false
    }
  }

  /**
   * 获取遗嘱关联的遗志详情
   */
  function getLinkedWills(testamentId: string): Will[] {
    const testament = testaments.value.find(t => t.id === testamentId)
    if (!testament) return []

    const allWills = storage.getKV<Will[]>('hf:wills', [])
    return testament.linkedWills
      .map(wid => allWills.find(w => w.id === wid))
      .filter((w): w is Will => w !== undefined)
  }

  return {
    // 状态
    testaments,
    rituals,

    // 计算属性
    allTestaments,
    draftTestaments,
    activeTestaments,
    executedTestaments,
    stats,

    // 方法
    createTestament,
    updateTestament,
    removeTestament,
    addClause,
    removeClause,
    addBeneficiary,
    removeBeneficiary,
    sealTestament,
    activateTestament,
    revokeTestament,
    executeTestament,
    getExecutionRitual,
    getTestamentLineage,
    checkTriggerCondition,
    getLinkedWills,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}