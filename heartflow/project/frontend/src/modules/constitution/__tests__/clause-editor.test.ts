// ============================================================
// useClauseEditor 宪法条款编辑器 · 逻辑测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => {
  mockStore[key] = val
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useClauseEditor } from '../clause-editor'

describe('useClauseEditor 宪法条款编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
  })

  it('空存储时初始化 5 条系统条款', () => {
    const editor = useClauseEditor()
    expect(editor.clauses.value.length).toBe(5)
    expect(editor.clauses.value[0].number).toBe('1')
    expect(editor.clauses.value[0].type).toBe('core')
    expect(editor.clauses.value[0].severity).toBe('constitutional')
  })

  it('addClause 新增用户条款并持久化', () => {
    const editor = useClauseEditor()
    const c = editor.addClause('6.1', '测试条款', '这是测试内容')
    expect(c.type).toBe('user')
    expect(c.status).toBe('draft')
    expect(editor.clauses.value.length).toBe(6)
    expect(mockStore['hf:constitution:clauses']).toHaveLength(6)
  })

  it('updateClause 拒绝修改系统核心条款', () => {
    const editor = useClauseEditor()
    const core = editor.clauses.value[0]
    const result = editor.updateClause(core.id, { content: '篡改' })
    expect(result).toBeUndefined()
  })

  it('updateClause 修改用户条款并记录版本', () => {
    const editor = useClauseEditor()
    const c = editor.addClause('6.1', '测试条款', '原内容')
    const updated = editor.updateClause(c.id, { content: '新内容' })
    expect(updated?.content).toBe('新内容')
    expect(updated?.currentVersion).toBe(2)
    expect(updated?.versions).toHaveLength(2)
  })

  it('repealClause 拒绝废止系统核心条款', () => {
    const editor = useClauseEditor()
    const core = editor.clauses.value[0]
    const result = editor.repealClause(core.id)
    expect(result).toBeUndefined()
  })

  it('repealClause 废止用户条款', () => {
    const editor = useClauseEditor()
    const c = editor.addClause('6.1', '测试条款', '内容')
    const repealed = editor.repealClause(c.id)
    expect(repealed?.status).toBe('repealed')
    expect(repealed?.enabled).toBe(false)
  })

  it('removeClause 拒绝删除系统核心条款', () => {
    const editor = useClauseEditor()
    const core = editor.clauses.value[0]
    expect(editor.removeClause(core.id)).toBe(false)
  })

  it('修订工作流：创建→提交→评审→批准→生效', () => {
    const editor = useClauseEditor()
    editor.addClause('6.1', '测试条款', '原内容')
    const am = editor.createAmendment('修订测试', '把内容改为新内容', 'user', [
      { clauseNumber: '6.1', changeType: 'modify', newContent: '新内容', rationale: '测试' },
    ])
    expect(am.status).toBe('draft')

    editor.submitAmendment(am.id)
    expect(editor.getAmendment(am.id)?.status).toBe('proposed')

    editor.reviewAmendment(am.id, 'user', 'approve', '同意')
    expect(editor.getAmendment(am.id)?.status).toBe('under_review')

    editor.approveAmendment(am.id)
    expect(editor.getAmendment(am.id)?.status).toBe('approved')

    editor.enactAmendment(am.id)
    expect(editor.getAmendment(am.id)?.status).toBe('enacted')
    // 生效后条款内容已更新
    expect(editor.getClauseByNumber('6.1')?.content).toBe('新内容')
  })

  it('修订案可被驳回', () => {
    const editor = useClauseEditor()
    const am = editor.createAmendment('被驳回的修订', '描述', 'user', [
      { clauseNumber: '6.1', changeType: 'modify', newContent: 'x', rationale: '测试' },
    ])
    editor.submitAmendment(am.id)
    editor.reviewAmendment(am.id, 'user', 'reject', '不同意')
    editor.rejectAmendment(am.id)
    expect(editor.getAmendment(am.id)?.status).toBe('rejected')
  })

  it('冲突检测：矛盾条款', () => {
    const editor = useClauseEditor()
    editor.addClause('6.1', '条款A', '系统必须自动同步数据')
    editor.addClause('6.2', '条款B', '系统不应自动同步数据')
    const unresolved = editor.getUnresolvedConflicts()
    expect(unresolved.length).toBeGreaterThan(0)
    expect(unresolved[0].type).toBe('contradiction')
  })

  it('resolveConflict 标记已解决', () => {
    const editor = useClauseEditor()
    editor.addClause('6.1', '条款A', '系统必须自动同步数据')
    editor.addClause('6.2', '条款B', '系统不应自动同步数据')
    const conflict = editor.getUnresolvedConflicts()[0]
    editor.resolveConflict(conflict.id)
    expect(editor.getUnresolvedConflicts().length).toBe(0)
  })

  it('getClauseStats 统计正确', () => {
    const editor = useClauseEditor()
    editor.addClause('6.1', '测试条款', '内容')
    const stats = editor.getClauseStats()
    expect(stats.total).toBe(6)
    expect(stats.byType.user).toBe(1)
    expect(stats.byType.core).toBe(5)
    expect(stats.totalAmendments).toBe(0)
  })

  it('generateClauseReport 健康状态', () => {
    const editor = useClauseEditor()
    const report = editor.generateClauseReport()
    expect(report.health).toBe('healthy')
    expect(report.totalClauses).toBe(5)
    expect(report.chapters).toContain('第一章·基本原则')
  })
})
