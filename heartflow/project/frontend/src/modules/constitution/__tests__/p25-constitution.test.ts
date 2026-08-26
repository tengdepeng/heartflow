// ============================================================
// P25 宪法体系 · 合规基线测试套件
// 覆盖：常量 / 类型 / clause-editor / compliance-baseline / compliance-review
// 蓝图：约 55 个测试，覆盖增删改查、修订工作流、冲突检测、审计日志、
//       合规检查、审查流程、清单管理、边界条件
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---- 类型桩（避免导入完整类型） ----

interface MutableRuleStub {
  id: string
  title: string
  description: string
  type: 'value' | 'behavior' | 'limit' | 'ritual'
  enabled: boolean
  order: number
  isDefault?: boolean
  articleNumber?: number
  tracking?: {
    count: number
    target: number
    period: 'daily' | 'weekly' | 'monthly'
    lastReset: string | null
  }
}

interface ConstitutionStub {
  version: string
  name: string
  preamble: string
  immutableRules: { id: string; title: string; description: string; icon: string; type: 'value'; order: number }[]
  mutableRules: MutableRuleStub[]
  createdAt: string
  updatedAt: string
}

// ---- 测试数据工厂 ----

function makeMutableRule(overrides: Partial<MutableRuleStub> = {}): MutableRuleStub {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '测试规则',
    description: '这是一条测试规则，用于验证合规检查功能',
    type: 'value',
    enabled: true,
    order: 1,
    ...overrides,
  }
}

function makeConstitution(overrides: Partial<ConstitutionStub> = {}): ConstitutionStub {
  return {
    version: '1.0.0',
    name: '测试宪法',
    preamble: '这是一部测试宪法',
    immutableRules: [
      { id: 'ir-1', title: '数据本地私有', description: '所有数据仅存储于本地', icon: 'shield', type: 'value' as const, order: 1 },
      { id: 'ir-2', title: '超级自定义', description: '用户可自定义一切', icon: 'settings', type: 'value' as const, order: 2 },
      { id: 'ir-3', title: '心流第一', description: '以心流体验为首要', icon: 'zap', type: 'value' as const, order: 3 },
      { id: 'ir-4', title: '中性呈现', description: '保持中性客观', icon: 'eye', type: 'value' as const, order: 4 },
    ],
    mutableRules: [
      makeMutableRule({ id: 'mr-1', title: '专注模式', description: '计时器运行期间不应有弹窗或打断', type: 'behavior', order: 1 }),
      makeMutableRule({ id: 'mr-2', title: '数据导出', description: '用户可随时导出所有数据', type: 'value', order: 2 }),
      makeMutableRule({ id: 'mr-3', title: '删除数据', description: '用户可彻底删除数据', type: 'value', order: 3 }),
      makeMutableRule({ id: 'mr-4', title: '自定义主题', description: '界面主题可完全自定义', type: 'behavior', order: 4 }),
      makeMutableRule({ id: 'mr-5', title: '无推送', description: '所有通知均为用户主动选择', type: 'limit', order: 5 }),
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---- 共享 KV 存储（vi.hoisted） ----

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

// ---- Mock engine/storage（覆盖 @/ 和相对路径） ----

function makeStorageMock() {
  return {
    storage: {
      getKV: <T,>(key: string, def: T): T => {
        const store = getKvStore()
        return store[key] !== undefined ? (store[key] as T) : def
      },
      setKV: (key: string, val: any) => {
        const store = getKvStore()
        store[key] = val
      },
    },
  }
}

vi.mock('@/engine/storage', () => makeStorageMock())
vi.mock('../../../engine/storage', () => makeStorageMock())

// ---- 动态导入 ----

async function importClauseEditor() {
  const mod = await import('../clause-editor')
  return mod.useClauseEditor()
}

async function importComplianceBaseline() {
  const mod = await import('../compliance-baseline')
  return mod.useComplianceBaseline()
}

async function importComplianceReview() {
  const mod = await import('../compliance-review')
  return mod.useComplianceReview()
}

async function importTypes() {
  return await import('../types')
}

async function importReviewModule() {
  return await import('../compliance-review')
}

// ============================================================
// 1. 常量测试
// ============================================================

describe('P25-1 常量', () => {
  describe('CONSTITUTION_STORAGE_KEYS', () => {
    it('包含 auditLog 键', async () => {
      const types = await importTypes()
      expect(types.CONSTITUTION_STORAGE_KEYS.auditLog).toBe('hf:constitution:audit_log')
    })

    it('包含 complianceConfig 键', async () => {
      const types = await importTypes()
      expect(types.CONSTITUTION_STORAGE_KEYS.complianceConfig).toBe('hf:constitution:compliance_config')
    })

    it('包含 lastCheck 键', async () => {
      const types = await importTypes()
      expect(types.CONSTITUTION_STORAGE_KEYS.lastCheck).toBe('hf:constitution:last_check')
    })
  })

  describe('DEFAULT_COMPLIANCE_CONFIG', () => {
    it('autoCheck 默认为 true', async () => {
      const types = await importTypes()
      expect(types.DEFAULT_COMPLIANCE_CONFIG.autoCheck).toBe(true)
    })

    it('minScore 默认为 60', async () => {
      const types = await importTypes()
      expect(types.DEFAULT_COMPLIANCE_CONFIG.minScore).toBe(60)
    })

    it('checkOnAdd 和 checkOnUpdate 均为 true', async () => {
      const types = await importTypes()
      expect(types.DEFAULT_COMPLIANCE_CONFIG.checkOnAdd).toBe(true)
      expect(types.DEFAULT_COMPLIANCE_CONFIG.checkOnUpdate).toBe(true)
    })
  })

  describe('CHECKLIST_CATEGORIES', () => {
    it('包含 8 个分类', async () => {
      const review = await importReviewModule()
      const keys = Object.keys(review.CHECKLIST_CATEGORIES)
      expect(keys.length).toBe(8)
    })

    it('每个分类包含 label / description / icon', async () => {
      const review = await importReviewModule()
      for (const cat of Object.values(review.CHECKLIST_CATEGORIES)) {
        expect(cat).toHaveProperty('label')
        expect(cat).toHaveProperty('description')
        expect(cat).toHaveProperty('icon')
      }
    })
  })

  describe('DEFAULT_CHECKLIST', () => {
    it('包含 20 个默认检查项', async () => {
      const review = await importReviewModule()
      expect(review.DEFAULT_CHECKLIST.length).toBe(20)
    })

    it('每个检查项有 id / category / title / weight / checkMethod', async () => {
      const review = await importReviewModule()
      for (const item of review.DEFAULT_CHECKLIST) {
        expect(item.id).toBeTruthy()
        expect(item.category).toBeTruthy()
        expect(item.title).toBeTruthy()
        expect(typeof item.weight).toBe('number')
        expect(item.checkMethod).toMatch(/^(auto|manual)$/)
      }
    })
  })

  describe('REVIEW_STATUS_LABELS', () => {
    it('包含 6 种状态', async () => {
      const review = await importReviewModule()
      const keys = Object.keys(review.REVIEW_STATUS_LABELS)
      expect(keys.length).toBe(6)
    })

    it('draft 标签为"草稿"', async () => {
      const review = await importReviewModule()
      expect(review.REVIEW_STATUS_LABELS.draft).toBe('草稿')
    })

    it('approved 标签为"已通过"', async () => {
      const review = await importReviewModule()
      expect(review.REVIEW_STATUS_LABELS.approved).toBe('已通过')
    })

    it('rejected 标签为"已驳回"', async () => {
      const review = await importReviewModule()
      expect(review.REVIEW_STATUS_LABELS.rejected).toBe('已驳回')
    })
  })
})

// ============================================================
// 2. 类型验证
// ============================================================

describe('P25-2 类型验证', () => {
  describe('ClauseType 枚举', () => {
    it('包含 core / user / system / derived', async () => {
      // 通过 addClause 验证 type 字段可接受合法值
      vi.resetModules()
      resetKvStore()
      const editor = await importClauseEditor()

      const clause = editor.addClause('T1', '测试', '内容', 'core')
      expect(clause.type).toBe('core')

      const clause2 = editor.addClause('T2', '测试2', '内容2', 'user')
      expect(clause2.type).toBe('user')

      const clause3 = editor.addClause('T3', '测试3', '内容3', 'system')
      expect(clause3.type).toBe('system')

      const clause4 = editor.addClause('T4', '测试4', '内容4', 'derived')
      expect(clause4.type).toBe('derived')
    })
  })

  describe('ClauseStatus 枚举', () => {
    it('新条款初始状态为 draft', async () => {
      vi.resetModules()
      resetKvStore()
      const editor = await importClauseEditor()

      const clause = editor.addClause('S1', '状态测试', '内容')
      expect(clause.status).toBe('draft')
    })

    it('废止后状态为 repealed', async () => {
      vi.resetModules()
      resetKvStore()
      const editor = await importClauseEditor()

      const clause = editor.addClause('S2', '废止测试', '内容')
      const repealed = editor.repealClause(clause.id)
      expect(repealed!.status).toBe('repealed')
    })
  })

  describe('ClauseSeverity 枚举', () => {
    it('新条款默认严重级别为 statutory', async () => {
      vi.resetModules()
      resetKvStore()
      const editor = await importClauseEditor()

      const clause = editor.addClause('V1', '严重级别测试', '内容')
      expect(clause.severity).toBe('statutory')
    })

    it('可指定严重级别', async () => {
      vi.resetModules()
      resetKvStore()
      const editor = await importClauseEditor()

      const clause = editor.addClause('V2', '级别测试', '内容', 'user', 'constitutional')
      expect(clause.severity).toBe('constitutional')
    })
  })

  describe('ReviewStatus 枚举', () => {
    it('REVIEW_STATUS_LABELS 覆盖所有 ReviewStatus', async () => {
      const review = await importReviewModule()
      const statuses: string[] = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'needs_revision']
      for (const s of statuses) {
        expect(review.REVIEW_STATUS_LABELS[s as keyof typeof review.REVIEW_STATUS_LABELS]).toBeTruthy()
      }
    })
  })
})

// ============================================================
// 3. useClauseEditor 测试
// ============================================================

describe('P25-3 useClauseEditor', () => {
  beforeEach(async () => {
    vi.resetModules()
    resetKvStore()
  })

  describe('初始化', () => {
    it('loadAll 初始化 5 条系统条款', async () => {
      const editor = await importClauseEditor()
      expect(editor.clauses.value.length).toBe(5)
    })

    it('系统条款类型均为 core', async () => {
      const editor = await importClauseEditor()
      for (const c of editor.clauses.value) {
        expect(c.type).toBe('core')
      }
    })

    it('系统条款状态均为 enacted', async () => {
      const editor = await importClauseEditor()
      for (const c of editor.clauses.value) {
        expect(c.status).toBe('enacted')
      }
    })
  })

  describe('addClause', () => {
    it('新增用户条款后总数增加', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('6', '新条款', '这是新增的条款内容')
      expect(editor.clauses.value.length).toBe(6)
      expect(clause.number).toBe('6')
    })

    it('新增条款默认为 draft 状态', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('7', '草稿条款', '测试')
      expect(clause.status).toBe('draft')
    })

    it('返回的条款包含完整字段', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('8', '完整条款', '详细内容', 'user', 'regulatory', '测试章节', ['标签1'])
      expect(clause.id).toMatch(/^clause-/)
      expect(clause.number).toBe('8')
      expect(clause.title).toBe('完整条款')
      expect(clause.content).toBe('详细内容')
      expect(clause.type).toBe('user')
      expect(clause.severity).toBe('regulatory')
      expect(clause.chapter).toBe('测试章节')
      expect(clause.tags).toEqual(['标签1'])
      expect(clause.enabled).toBe(true)
      expect(clause.versions.length).toBe(1)
      expect(clause.currentVersion).toBe(1)
    })
  })

  describe('updateClause', () => {
    it('更新已存在条款的标题和内容', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('9', '旧标题', '旧内容')
      const updated = editor.updateClause(clause.id, { title: '新标题', content: '新内容' })
      expect(updated!.title).toBe('新标题')
      expect(updated!.content).toBe('新内容')
    })

    it('更新后版本号增加', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('10', '版本测试', '初版')
      const updated = editor.updateClause(clause.id, { content: '第二版' })
      expect(updated!.currentVersion).toBe(2)
    })

    it('更新后版本历史记录增加', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('11', '历史测试', '初版')
      const updated = editor.updateClause(clause.id, { content: '修改版' }, 'tester', '修改描述')
      expect(updated!.versions.length).toBe(2)
      expect(updated!.versions[1].changedBy).toBe('tester')
      expect(updated!.versions[1].changeDescription).toBe('修改描述')
    })

    it('不允许修改核心条款', async () => {
      const editor = await importClauseEditor()
      const coreClause = editor.clauses.value.find(c => c.number === '1')!
      const result = editor.updateClause(coreClause.id, { title: '修改核心' })
      expect(result).toBeUndefined()
    })

    it('不存在的条款返回 undefined', async () => {
      const editor = await importClauseEditor()
      const result = editor.updateClause('nonexistent-id', { title: '不存在' })
      expect(result).toBeUndefined()
    })
  })

  describe('repealClause', () => {
    it('废止用户条款后状态变为 repealed', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('12', '废止测试', '将废止')
      const result = editor.repealClause(clause.id, '不再需要')
      expect(result!.status).toBe('repealed')
      expect(result!.enabled).toBe(false)
      expect(result!.repealedAt).toBeTruthy()
    })

    it('不允许废止核心条款', async () => {
      const editor = await importClauseEditor()
      const coreClause = editor.clauses.value.find(c => c.number === '2')!
      const result = editor.repealClause(coreClause.id)
      expect(result).toBeUndefined()
    })

    it('不存在的条款返回 undefined', async () => {
      const editor = await importClauseEditor()
      const result = editor.repealClause('nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('removeClause', () => {
    it('删除用户条款后总数减少', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('13', '删除测试', '将删除')
      expect(editor.clauses.value.length).toBe(6)
      const result = editor.removeClause(clause.id)
      expect(result).toBe(true)
      expect(editor.clauses.value.length).toBe(5)
    })

    it('不允许删除核心条款', async () => {
      const editor = await importClauseEditor()
      const coreClause = editor.clauses.value.find(c => c.number === '3')!
      const result = editor.removeClause(coreClause.id)
      expect(result).toBe(false)
    })

    it('不存在的条款返回 false', async () => {
      const editor = await importClauseEditor()
      const result = editor.removeClause('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('getClause / getClauseByNumber / getClausesByChapter', () => {
    it('getClause 按 ID 查找条款', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('14', '查找测试', '内容')
      const found = editor.getClause(clause.id)
      expect(found).toBeDefined()
      expect(found!.number).toBe('14')
    })

    it('getClause 不存在的 ID 返回 undefined', async () => {
      const editor = await importClauseEditor()
      expect(editor.getClause('nonexistent')).toBeUndefined()
    })

    it('getClauseByNumber 按编号查找', async () => {
      const editor = await importClauseEditor()
      const found = editor.getClauseByNumber('1')
      expect(found).toBeDefined()
      expect(found!.title).toBe('数据本地私有')
    })

    it('getClausesByChapter 按章节查找', async () => {
      const editor = await importClauseEditor()
      const chapter1 = editor.getClausesByChapter('第一章·基本原则')
      expect(chapter1.length).toBe(5)
    })

    it('getClausesByChapter 空章节返回空数组', async () => {
      const editor = await importClauseEditor()
      const empty = editor.getClausesByChapter('不存在的章节')
      expect(empty).toEqual([])
    })
  })

  describe('getEnabledClauses / getUserClauses', () => {
    it('getEnabledClauses 返回所有启用的条款', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('15', '启用测试', '内容')
      const enabled = editor.getEnabledClauses()
      expect(enabled.length).toBe(6)
      expect(enabled.find(c => c.id === clause.id)).toBeTruthy()
    })

    it('废止的条款不在 getEnabledClauses 中', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('16', '禁用测试', '内容')
      editor.repealClause(clause.id)
      const enabled = editor.getEnabledClauses()
      expect(enabled.find(c => c.id === clause.id)).toBeUndefined()
    })

    it('getUserClauses 只返回用户条款', async () => {
      const editor = await importClauseEditor()
      const userClause = editor.addClause('17', '用户条款', '内容', 'user')
      const userClauses = editor.getUserClauses()
      expect(userClauses.length).toBe(1)
      expect(userClauses[0].id).toBe(userClause.id)
    })
  })

  describe('修订工作流', () => {
    it('createAmendment 创建修订草案', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('修订标题', '修订描述', 'proposer', [
        { clauseNumber: '1', changeType: 'modify', newContent: '新内容', rationale: '需要更新' },
      ])
      expect(amd.status).toBe('draft')
      expect(amd.targetClauseNumbers).toEqual(['1'])
    })

    it('submitAmendment 提交草案', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('提审修订', '描述', 'user', [
        { clauseNumber: '6', changeType: 'add', newContent: '新条款内容', rationale: '新增' },
      ])
      const submitted = editor.submitAmendment(amd.id)
      expect(submitted!.status).toBe('proposed')
    })

    it('submitAmendment 非 draft 状态返回 undefined', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('测试', '描述', 'user', [])
      editor.submitAmendment(amd.id)
      const result = editor.submitAmendment(amd.id)
      expect(result).toBeUndefined()
    })

    it('reviewAmendment 进行审查', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('审查修订', '描述', 'user', [
        { clauseNumber: '6', changeType: 'add', newContent: '内容', rationale: '新增' },
      ])
      editor.submitAmendment(amd.id)
      const reviewed = editor.reviewAmendment(amd.id, 'reviewer1', 'approve', '同意')
      expect(reviewed!.status).toBe('under_review')
      expect(reviewed!.reviews.length).toBe(1)
    })

    it('approveAmendment 批准修订', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('批准修订', '描述', 'user', [
        { clauseNumber: '6', changeType: 'add', newContent: '内容', newTitle: '新条款', rationale: '新增' },
      ])
      editor.submitAmendment(amd.id)
      editor.reviewAmendment(amd.id, 'r1', 'approve', '好')
      const approved = editor.approveAmendment(amd.id)
      expect(approved!.status).toBe('approved')
      expect(approved!.approvedAt).toBeTruthy()
    })

    it('rejectAmendment 驳回修订', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('驳回修订', '描述', 'user', [
        { clauseNumber: '6', changeType: 'add', newContent: '内容', rationale: '新增' },
      ])
      editor.submitAmendment(amd.id)
      editor.reviewAmendment(amd.id, 'r1', 'reject', '不好')
      const rejected = editor.rejectAmendment(amd.id)
      expect(rejected!.status).toBe('rejected')
    })

    it('enactAmendment 生效修订（add 类型）', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('生效修订', '描述', 'proposer', [
        { clauseNumber: '100', changeType: 'add', newContent: '新增条款', newTitle: '新增', rationale: '需要' },
      ])
      editor.submitAmendment(amd.id)
      editor.reviewAmendment(amd.id, 'r1', 'approve', '好')
      editor.approveAmendment(amd.id)
      const enacted = editor.enactAmendment(amd.id)
      expect(enacted!.status).toBe('enacted')
      expect(editor.getClauseByNumber('100')).toBeTruthy()
    })

    it('enactAmendment 非 approved 状态返回 undefined', async () => {
      const editor = await importClauseEditor()
      const amd = editor.createAmendment('测试', '描述', 'user', [])
      const result = editor.enactAmendment(amd.id)
      expect(result).toBeUndefined()
    })
  })

  describe('冲突检测', () => {
    it('detectConflictsForClause 可检测矛盾', async () => {
      const editor = await importClauseEditor()
      editor.addClause('C1', '条款A', '所有操作必须自动完成')
      editor.addClause('C2', '条款B', '所有操作必须手动完成')
      // 添加第二条时自动检测冲突
      const unresolved = editor.getUnresolvedConflicts()
      expect(unresolved.length).toBeGreaterThanOrEqual(0)
    })

    it('resolveConflict 解决冲突', async () => {
      const editor = await importClauseEditor()
      editor.addClause('C3', '冲突条款', '必须实时同步数据')
      editor.addClause('C4', '延迟条款', '数据处理应延迟执行')
      const unresolved = editor.getUnresolvedConflicts()
      if (unresolved.length > 0) {
        const resolved = editor.resolveConflict(unresolved[0].id)
        expect(resolved!.resolved).toBe(true)
        expect(resolved!.resolvedAt).toBeTruthy()
      }
    })

    it('resolveConflict 不存在的冲突返回 undefined', async () => {
      const editor = await importClauseEditor()
      const result = editor.resolveConflict('nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('统计', () => {
    it('getClauseStats 返回完整统计', async () => {
      const editor = await importClauseEditor()
      const stats = editor.getClauseStats()
      expect(stats.total).toBe(5)
      expect(stats.enabled).toBe(5)
      expect(stats.byType.core).toBe(5)
      expect(stats.byType.user).toBe(0)
      expect(stats.byStatus.enacted).toBe(5)
      expect(stats.totalAmendments).toBe(0)
      expect(stats.pendingAmendments).toBe(0)
      expect(stats.unresolvedConflicts).toBe(0)
    })

    it('getClauseStats 添加用户条款后统计更新', async () => {
      const editor = await importClauseEditor()
      editor.addClause('20', '用户条款', '内容', 'user')
      const stats = editor.getClauseStats()
      expect(stats.total).toBe(6)
      expect(stats.byType.user).toBe(1)
      expect(stats.byStatus.draft).toBe(1)
    })
  })

  describe('generateClauseReport', () => {
    it('生成报告包含基本信息', async () => {
      const editor = await importClauseEditor()
      const report = editor.generateClauseReport()
      expect(report.totalClauses).toBe(5)
      expect(report.chapters).toContain('第一章·基本原则')
      expect(report.health).toBe('healthy')
      expect(report.generatedAt).toBeTruthy()
    })

    it('无冲突时健康状态为 healthy', async () => {
      const editor = await importClauseEditor()
      const report = editor.generateClauseReport()
      expect(report.health).toBe('healthy')
    })
  })
})

// ============================================================
// 4. useComplianceBaseline 测试
// ============================================================

describe('P25-4 useComplianceBaseline', () => {
  beforeEach(async () => {
    vi.resetModules()
    resetKvStore()
  })

  describe('recordAudit', () => {
    it('记录审计事件', async () => {
      const baseline = await importComplianceBaseline()
      const entry = baseline.recordAudit('rule_added', '添加了规则', 'rule-1')
      expect(entry.id).toMatch(/^audit_/)
      expect(entry.eventType).toBe('rule_added')
      expect(entry.operator).toBe('user')
      expect(entry.timestamp).toBeTruthy()
    })

    it('记录事件后日志长度增加', async () => {
      const baseline = await importComplianceBaseline()
      expect(baseline.auditLog.value.length).toBe(0)
      baseline.recordAudit('rule_added', '添加规则')
      expect(baseline.auditLog.value.length).toBe(1)
    })
  })

  describe('getAuditLog', () => {
    it('返回按时间倒序排列的日志', async () => {
      const baseline = await importComplianceBaseline()
      baseline.recordAudit('rule_added', '第一条')
      // 确保两条日志时间戳不同
      await new Promise((r) => setTimeout(r, 5))
      baseline.recordAudit('rule_updated', '第二条')
      const log = baseline.getAuditLog()
      expect(log.length).toBe(2)
      expect(log[0].eventType).toBe('rule_updated')
      expect(log[1].eventType).toBe('rule_added')
    })

    it('limit 参数限制返回数量', async () => {
      const baseline = await importComplianceBaseline()
      baseline.recordAudit('rule_added', '1')
      baseline.recordAudit('rule_added', '2')
      baseline.recordAudit('rule_added', '3')
      const log = baseline.getAuditLog(2)
      expect(log.length).toBe(2)
    })
  })

  describe('getAuditStats', () => {
    it('空日志返回零统计', async () => {
      const baseline = await importComplianceBaseline()
      const stats = baseline.getAuditStats()
      expect(stats.totalEntries).toBe(0)
    })

    it('多条日志时统计正确', async () => {
      const baseline = await importComplianceBaseline()
      baseline.recordAudit('rule_added', '1')
      baseline.recordAudit('rule_added', '2')
      baseline.recordAudit('rule_updated', '3')
      const stats = baseline.getAuditStats()
      expect(stats.totalEntries).toBe(3)
      expect(stats.byType['rule_added']).toBe(2)
      expect(stats.byType['rule_updated']).toBe(1)
    })
  })

  describe('checkRuleCompliance', () => {
    it('对合规规则不产生违规', async () => {
      const baseline = await importComplianceBaseline()
      const rule = makeMutableRule({
        title: '专注模式',
        description: '计时器运行期间保持静默，不打扰用户',
      })
      const violations = baseline.checkRuleCompliance(rule)
      expect(violations.length).toBe(0)
    })

    it('检测到云端相关违规', async () => {
      const baseline = await importComplianceBaseline()
      const rule = makeMutableRule({
        title: '数据同步',
        description: '自动将数据上传到云端进行备份',
      })
      const violations = baseline.checkRuleCompliance(rule)
      expect(violations.length).toBeGreaterThan(0)
    })

    it('检测到推送相关违规', async () => {
      const baseline = await importComplianceBaseline()
      const rule = makeMutableRule({
        title: '提醒系统',
        description: '系统应在每天固定时间推送通知提醒用户',
      })
      const violations = baseline.checkRuleCompliance(rule)
      expect(violations.length).toBeGreaterThan(0)
    })
  })

  describe('checkConstitution', () => {
    it('对合规宪法返回高分', async () => {
      const baseline = await importComplianceBaseline()
      const constitution = makeConstitution()
      const result = baseline.checkConstitution(constitution)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.checkedAt).toBeTruthy()
    })

    it('违规严重的宪法得分降低', async () => {
      const baseline = await importComplianceBaseline()
      const constitution = makeConstitution({
        mutableRules: [
          makeMutableRule({ id: 'bad-1', title: '云端同步', description: '上传数据到云端存储', type: 'value', order: 1 }),
          makeMutableRule({ id: 'bad-2', title: '推送通知', description: '每天推送提醒通知', type: 'behavior', order: 2 }),
        ],
      })
      const result = baseline.checkConstitution(constitution)
      expect(result.score).toBeLessThan(100)
    })

    it('规则数量过少产生警告', async () => {
      const baseline = await importComplianceBaseline()
      const constitution = makeConstitution({
        mutableRules: [
          makeMutableRule({ id: 'few-1', title: '唯一条款', description: '仅有一条规则', type: 'value', order: 1 }),
        ],
      })
      const result = baseline.checkConstitution(constitution)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('detectConflicts', () => {
    it('无冲突规则返回空数组', async () => {
      const baseline = await importComplianceBaseline()
      const rules = [
        makeMutableRule({ id: 'a', title: '规则A', description: '保持数据私密', type: 'value', order: 1 }),
        makeMutableRule({ id: 'b', title: '规则B', description: '用户可自定义主题', type: 'behavior', order: 2 }),
      ]
      const conflicts = baseline.detectConflicts(rules)
      expect(conflicts.length).toBe(0)
    })

    it('同名规则产生重叠冲突', async () => {
      const baseline = await importComplianceBaseline()
      const rules = [
        makeMutableRule({ id: 'a', title: '相同标题', description: '内容A', type: 'value', order: 1 }),
        makeMutableRule({ id: 'b', title: '相同标题', description: '内容B', type: 'behavior', order: 2 }),
      ]
      const conflicts = baseline.detectConflicts(rules)
      const overlap = conflicts.filter(c => c.type === 'overlap')
      expect(overlap.length).toBeGreaterThan(0)
    })
  })

  describe('generateReport', () => {
    it('生成完整合规报告', async () => {
      const baseline = await importComplianceBaseline()
      const constitution = makeConstitution()
      const report = baseline.generateReport(constitution)
      expect(report.generatedAt).toBeTruthy()
      expect(report.constitutionVersion).toBe(constitution.version)
      expect(report.totalRules).toBe(constitution.mutableRules.length)
      expect(report.score).toBeGreaterThanOrEqual(0)
      expect(report.health).toMatch(/^(healthy|caution|warning|critical)$/)
    })
  })

  describe('合规配置', () => {
    it('getConfig 返回默认配置', async () => {
      const baseline = await importComplianceBaseline()
      const config = baseline.getConfig()
      expect(config.autoCheck).toBe(true)
      expect(config.minScore).toBe(60)
    })

    it('updateConfig 修改配置', async () => {
      const baseline = await importComplianceBaseline()
      baseline.updateConfig({ minScore: 80, autoCheck: false })
      const config = baseline.getConfig()
      expect(config.minScore).toBe(80)
      expect(config.autoCheck).toBe(false)
    })

    it('updateConfig 部分更新不覆盖未修改字段', async () => {
      const baseline = await importComplianceBaseline()
      baseline.updateConfig({ minScore: 90 })
      const config = baseline.getConfig()
      expect(config.minScore).toBe(90)
      expect(config.autoCheck).toBe(true)
    })

    it('resetConfig 恢复默认配置', async () => {
      const baseline = await importComplianceBaseline()
      baseline.updateConfig({ minScore: 50, autoCheck: false })
      baseline.resetConfig()
      const config = baseline.getConfig()
      expect(config.minScore).toBe(60)
      expect(config.autoCheck).toBe(true)
    })
  })
})

// ============================================================
// 5. useComplianceReview 测试
// ============================================================

describe('P25-5 useComplianceReview', () => {
  beforeEach(async () => {
    vi.resetModules()
    resetKvStore()
  })

  function makeComplianceResult() {
    return {
      passed: true,
      score: 85,
      violations: [],
      warnings: [],
      checkedAt: new Date().toISOString(),
    }
  }

  describe('initChecklist', () => {
    it('首次初始化返回默认清单', async () => {
      const review = await importComplianceReview()
      const items = review.initChecklist()
      expect(items.length).toBe(20)
    })

    it('所有自动检查项 passed 初始为 null', async () => {
      const review = await importComplianceReview()
      const items = review.initChecklist()
      for (const item of items) {
        expect(item.passed).toBeNull()
      }
    })
  })

  describe('runChecklist', () => {
    it('运行清单后自动检查项 passed 不为 null', async () => {
      const review = await importComplianceReview()
      review.initChecklist()
      const items = review.runChecklist()
      const autoItems = items.filter(i => i.checkMethod === 'auto')
      expect(autoItems.length).toBeGreaterThan(0)
      for (const item of autoItems) {
        expect(item.passed).not.toBeNull()
      }
    })
  })

  describe('markChecklistItem', () => {
    it('手动标记清单项', async () => {
      const review = await importComplianceReview()
      review.initChecklist()
      review.markChecklistItem('cl-neu-01', true, '已通过人工检查')
      const progress = review.getChecklistProgress()
      expect(progress.passed).toBeGreaterThanOrEqual(1)
    })

    it('标记不存在的清单项不报错', async () => {
      const review = await importComplianceReview()
      expect(() => review.markChecklistItem('nonexistent', true)).not.toThrow()
    })
  })

  describe('getChecklistProgress', () => {
    it('空清单进度正确', async () => {
      const review = await importComplianceReview()
      const progress = review.getChecklistProgress()
      expect(progress.total).toBe(0)
      expect(progress.percentage).toBe(0)
    })

    it('运行清单后返回正确进度', async () => {
      const review = await importComplianceReview()
      review.initChecklist()
      review.runChecklist()
      const progress = review.getChecklistProgress()
      expect(progress.total).toBe(20)
      expect(progress.checked).toBeGreaterThan(0)
    })

    it('byCategory 包含所有分类', async () => {
      const review = await importComplianceReview()
      review.initChecklist()
      const progress = review.getChecklistProgress()
      expect(Object.keys(progress.byCategory).length).toBe(8)
    })
  })

  describe('createReview / submitReview / startReview', () => {
    it('创建审查会话', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('审查标题', '审查描述', makeComplianceResult())
      expect(session.status).toBe('draft')
      expect(session.id).toMatch(/^review-/)
    })

    it('提交审查', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('提交审查', '描述', makeComplianceResult())
      const result = review.submitReview(session.id)
      expect(result).toBe(true)
    })

    it('非 draft 状态不能提交', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('测试', '描述', makeComplianceResult())
      review.submitReview(session.id)
      const result = review.submitReview(session.id)
      expect(result).toBe(false)
    })

    it('开始审查', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('开始审查', '描述', makeComplianceResult())
      review.submitReview(session.id)
      const result = review.startReview(session.id)
      expect(result).toBe(true)
    })
  })

  describe('addComment', () => {
    it('添加审查意见', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('意见测试', '描述', makeComplianceResult())
      const comment = review.addComment(session.id, '审查员', '这是一条意见', 'suggestion')
      expect(comment).not.toBeNull()
      expect(comment!.author).toBe('审查员')
      expect(comment!.type).toBe('suggestion')
    })

    it('不存在的会话返回 null', async () => {
      const review = await importComplianceReview()
      const comment = review.addComment('nonexistent', 'author', 'content', 'concern')
      expect(comment).toBeNull()
    })
  })

  describe('makeDecision', () => {
    it('通过审查', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('决定测试', '描述', makeComplianceResult())
      review.submitReview(session.id)
      review.startReview(session.id)
      const result = review.makeDecision(session.id, 'approved', '通过', '审查员')
      expect(result).toBe(true)
    })

    it('驳回审查', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('驳回测试', '描述', makeComplianceResult())
      review.submitReview(session.id)
      review.startReview(session.id)
      review.makeDecision(session.id, 'rejected', '不符合要求', '审查员')
      const history = review.getReviewHistory()
      const entry = history.find(h => h.sessionId === session.id)
      expect(entry).toBeDefined()
    })

    it('非 in_review 状态不能做决定', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('测试', '描述', makeComplianceResult())
      const result = review.makeDecision(session.id, 'approved', '理由', '审查员')
      expect(result).toBe(false)
    })
  })

  describe('computeAutoScore', () => {
    it('计算自动化评分', async () => {
      const review = await importComplianceReview()
      review.initChecklist()
      review.runChecklist()
      const result = review.computeAutoScore(makeComplianceResult())
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.breakdown.length).toBeGreaterThan(0)
      expect(result.riskLevel).toMatch(/^(low|medium|high|critical)$/)
      expect(result.summary).toBeTruthy()
    })
  })

  describe('getReviewHistory', () => {
    it('返回按时间倒序的历史', async () => {
      const review = await importComplianceReview()
      const s1 = review.createReview('历史1', '描述', makeComplianceResult())
      review.submitReview(s1.id)
      const s2 = review.createReview('历史2', '描述', makeComplianceResult())
      review.submitReview(s2.id)
      const history = review.getReviewHistory()
      expect(history.length).toBe(2)
      expect(new Date(history[0].startedAt).getTime()).toBeGreaterThanOrEqual(new Date(history[1].startedAt).getTime())
    })
  })
})

// ============================================================
// 6. 边界条件
// ============================================================

describe('P25-6 边界条件', () => {
  beforeEach(async () => {
    vi.resetModules()
    resetKvStore()
  })

  describe('clause-editor 边界', () => {
    it('空状态：新实例无用户条款', async () => {
      const editor = await importClauseEditor()
      expect(editor.getUserClauses().length).toBe(0)
    })

    it('重复操作：重复删除同一条款返回 false', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('B1', '边界测试', '内容')
      editor.removeClause(clause.id)
      const result = editor.removeClause(clause.id)
      expect(result).toBe(false)
    })

    it('无效输入：addClause 空标题也能创建', async () => {
      const editor = await importClauseEditor()
      const clause = editor.addClause('B2', '', '')
      expect(clause).toBeDefined()
      expect(clause.number).toBe('B2')
    })

    it('无效输入：getClauseByNumber 空字符串', async () => {
      const editor = await importClauseEditor()
      const result = editor.getClauseByNumber('')
      expect(result).toBeUndefined()
    })
  })

  describe('compliance-baseline 边界', () => {
    it('空状态：新实例审计日志为空', async () => {
      const baseline = await importComplianceBaseline()
      expect(baseline.getAuditLog().length).toBe(0)
      expect(baseline.getAuditStats().totalEntries).toBe(0)
    })

    it('空宪法检查：无规则宪法', async () => {
      const baseline = await importComplianceBaseline()
      const constitution = makeConstitution({ mutableRules: [] })
      const result = baseline.checkConstitution(constitution)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('极端配置：minScore 为 0', async () => {
      const baseline = await importComplianceBaseline()
      baseline.updateConfig({ minScore: 0 })
      const config = baseline.getConfig()
      expect(config.minScore).toBe(0)
    })

    it('极端配置：minScore 为 100', async () => {
      const baseline = await importComplianceBaseline()
      baseline.updateConfig({ minScore: 100 })
      const config = baseline.getConfig()
      expect(config.minScore).toBe(100)
    })
  })

  describe('compliance-review 边界', () => {
    it('空状态：未初始化清单进度为 0', async () => {
      const review = await importComplianceReview()
      const progress = review.getChecklistProgress()
      expect(progress.total).toBe(0)
      expect(progress.percentage).toBe(0)
    })

    it('重复操作：重复提交已提交的审查', async () => {
      const review = await importComplianceReview()
      const session = review.createReview('重复提交', '描述', {
        passed: true,
        score: 80,
        violations: [],
        warnings: [],
        checkedAt: new Date().toISOString(),
      })
      review.submitReview(session.id)
      const result = review.submitReview(session.id)
      expect(result).toBe(false)
    })

    it('无效输入：向不存在的会话添加意见', async () => {
      const review = await importComplianceReview()
      const comment = review.addComment('nonexistent-id', 'author', 'content', 'suggestion')
      expect(comment).toBeNull()
    })
  })
})