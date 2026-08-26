// ============================================================
// 输出管理 · 发布流水线测试（P15-8）
// 草稿→审核→发布→归档 + 版本管理 + 协作评论 + 发布统计
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  usePublishPipeline,
  PIPELINE_STAGE_META,
  PUBLISH_CHANNEL_META,
} from '../publish-pipeline'
import type { OutputRecord, OutputRecordType } from '../types'

// Mock storage
const storageMock = new Map<string, unknown>()

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? val as T : defaultValue
    },
    setKV: (key: string, value: unknown) => {
      storageMock.set(key, value)
    },
    removeKV: (key: string) => {
      storageMock.delete(key)
    },
    getConfig: () => ({
      complianceOverride: {
        forbiddenPatterns: false,
        comparativePhrases: false,
        personification: false,
        advisorEnabled: false,
        autoStartOverwrite: false,
        hapticFeedbackOverwrite: false,
        dataDriven: false,
      },
    }),
  },
}))

// 测试记录工厂
function createTestRecord(
  id: string,
  overrides: Partial<OutputRecord> = {},
): OutputRecord {
  return {
    id,
    type: 'note' as OutputRecordType,
    content: '测试内容',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roomSource: 'craft',
    status: 'draft',
    ...overrides,
  }
}

function setup() {
  const records = new Map<string, OutputRecord>()

  const getRecord = (id: string): OutputRecord | undefined => records.get(id)
  const updateRecord = (id: string, updates: Partial<OutputRecord>): boolean => {
    const existing = records.get(id)
    if (!existing) return false
    records.set(id, { ...existing, ...updates })
    return true
  }

  return { records, getRecord, updateRecord }
}

beforeEach(() => {
  storageMock.clear()
})

// ============================================================
// 流水线阶段元数据测试
// ============================================================

describe('流水线阶段元数据', () => {
  it('应该包含所有 7 个阶段', () => {
    const stages = Object.keys(PIPELINE_STAGE_META)
    expect(stages).toHaveLength(7)
    expect(stages).toContain('draft')
    expect(stages).toContain('review')
    expect(stages).toContain('approved')
    expect(stages).toContain('published')
    expect(stages).toContain('archived')
    expect(stages).toContain('rejected')
    expect(stages).toContain('withdrawn')
  })

  it('每个阶段应该包含正确的元数据', () => {
    const draft = PIPELINE_STAGE_META.draft
    expect(draft.label).toBe('草稿')
    expect(draft.nextStages).toContain('review')
    expect(draft.nextStages).toContain('archived')
  })

  it('published 阶段可以转移到 archived 和 withdrawn', () => {
    const published = PIPELINE_STAGE_META.published
    expect(published.nextStages).toContain('archived')
    expect(published.nextStages).toContain('withdrawn')
  })

  it('发布渠道元数据应该包含所有 6 个渠道', () => {
    const channels = Object.keys(PUBLISH_CHANNEL_META)
    expect(channels).toHaveLength(6)
  })
})

// ============================================================
// 阶段转换测试
// ============================================================

describe('阶段转换', () => {
  it('新记录应该从 draft 开始', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    const record = createTestRecord('r1')
    recs.set('r1', record)
    const { getStage } = usePublishPipeline(getRecord, updateRecord)

    expect(getStage('r1')).toBe('draft')
  })

  it('已发布记录应该从 published 开始', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { status: 'published' }))

    const { getStage } = usePublishPipeline(getRecord, updateRecord)
    expect(getStage('r1')).toBe('published')
  })

  it('draft → review 应该成功', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const result = pipeline.submitForReview('r1')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('review')
  })

  it('review → approved 应该成功', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    const result = pipeline.approve('r1', '审核通过')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('approved')
  })

  it('review → rejected 应该成功', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    const result = pipeline.reject('r1', '需要修改')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('rejected')
  })

  it('approved → published 应该成功', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    const result = pipeline.publish('r1', ['timeline'])
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('published')
  })

  it('published → archived 应该成功', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')
    const result = pipeline.archive('r1')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('archived')
  })

  it('无效的阶段转换应该返回 false', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    // draft 不能直接到 published
    const result = pipeline.publish('r1')
    expect(result).toBe(false)
    expect(pipeline.getStage('r1')).toBe('draft')
  })

  it('draft 可以直接归档', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const result = pipeline.archive('r1')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('archived')
  })

  it('阶段历史应该记录所有转换', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')

    const pipeRec = pipeline.getPipeline('r1')
    expect(pipeRec).not.toBeNull()
    expect(pipeRec!.stageHistory.length).toBe(4) // draft → review → approved → published
    expect(pipeRec!.stageHistory[0].stage).toBe('draft')
    expect(pipeRec!.stageHistory[3].stage).toBe('published')
  })

  it('canTransition 应该正确验证', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    expect(pipeline.canTransition('r1', 'review')).toBe(true)
    expect(pipeline.canTransition('r1', 'published')).toBe(false)
    expect(pipeline.canTransition('r1', 'archived')).toBe(true)
  })
})

// ============================================================
// 撤回测试
// ============================================================

describe('撤回 (Withdraw)', () => {
  it('已发布内容在窗口期内可以撤回', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')

    const result = pipeline.withdraw('r1', '内容有误')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('withdrawn')
  })

  it('withdrawn → draft 应该可以退回', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')
    pipeline.withdraw('r1')

    const result = pipeline.backToDraft('r1')
    expect(result).toBe(true)
    expect(pipeline.getStage('r1')).toBe('draft')
  })

  it('draft 状态不能撤回', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const result = pipeline.withdraw('r1')
    expect(result).toBe(false)
  })

  it('禁用撤回时不应该允许', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.updateConfig({ allowWithdraw: false })

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')

    const result = pipeline.withdraw('r1')
    expect(result).toBe(false)
  })
})

// ============================================================
// 版本管理测试
// ============================================================

describe('版本管理', () => {
  it('createVersion 应该创建版本快照', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: '版本1内容' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const version = pipeline.createVersion('r1', '初始版本')
    expect(version).not.toBeNull()
    expect(version!.version).toBe(1)
    expect(version!.content).toBe('版本1内容')
    expect(version!.recordId).toBe('r1')
  })

  it('不存在的记录应该返回 null', () => {
    const { getRecord, updateRecord } = setup()
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const version = pipeline.createVersion('nonexistent')
    expect(version).toBeNull()
  })

  it('getVersions 应该返回所有版本', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: 'v1' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.createVersion('r1', 'v1')
    updateRecord('r1', { content: 'v2' })
    pipeline.createVersion('r1', 'v2')

    const versions = pipeline.getVersions('r1')
    expect(versions.length).toBe(2)
    expect(versions[0].version).toBe(2) // 最新版本在前
    expect(versions[1].version).toBe(1)
  })

  it('getLatestVersion 应该返回最新版本', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: 'v1' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.createVersion('r1', 'v1')
    updateRecord('r1', { content: 'v2' })
    pipeline.createVersion('r1', 'v2')

    const latest = pipeline.getLatestVersion('r1')
    expect(latest).not.toBeNull()
    expect(latest!.version).toBe(2)
    expect(latest!.content).toBe('v2')
  })

  it('diffVersions 应该比较两个版本', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: '旧内容\n第一行\n第二行' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const v1 = pipeline.createVersion('r1', 'v1')!
    updateRecord('r1', { content: '新内容\n第一行\n第三行' })
    const v2 = pipeline.createVersion('r1', 'v2')!

    const diff = pipeline.diffVersions(v1.id, v2.id)
    expect(diff).not.toBeNull()
    expect(diff!.totalChanges).toBeGreaterThan(0)
    expect(diff!.similarity).toBeLessThan(1)
  })

  it('不同记录的版本不能比较', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    recs.set('r2', createTestRecord('r2'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const v1 = pipeline.createVersion('r1', 'v1')!
    const v2 = pipeline.createVersion('r2', 'v2')!

    const diff = pipeline.diffVersions(v1.id, v2.id)
    expect(diff).toBeNull()
  })

  it('rollback 应该回滚到指定版本', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: '原始内容' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const v1 = pipeline.createVersion('r1', 'v1')!
    updateRecord('r1', { content: '修改后的内容' })
    pipeline.createVersion('r1', 'v2')

    const result = pipeline.rollback('r1', v1.id)
    expect(result).toBe(true)
    expect(getRecord('r1')!.content).toBe('原始内容')
  })

  it('版本变更摘要应该包含变更统计', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: '行1\n行2\n行3' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.createVersion('r1', 'v1')
    updateRecord('r1', { content: '行1\n行2改\n行4' })
    const v2 = pipeline.createVersion('r1', 'v2')

    expect(v2!.changeSummary).not.toBeNull()
    expect(v2!.changeSummary!.changePercent).toBeGreaterThan(0)
  })

  it('autoCreateVersion 应该在发布时自动创建版本', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')

    const version = pipeline.autoCreateVersion('r1')
    expect(version).not.toBeNull()
    expect(version!.changeNote).toContain('已发布')
  })
})

// ============================================================
// 协作评论测试
// ============================================================

describe('协作评论', () => {
  it('addComment 应该创建评论', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const comment = pipeline.addComment('r1', '这是一条评论')
    expect(comment).not.toBeNull()
    expect(comment!.content).toBe('这是一条评论')
    expect(comment!.author).toBe('user')
    expect(comment!.recordId).toBe('r1')
  })

  it('不存在的记录添加评论应该返回 null', () => {
    const { getRecord, updateRecord } = setup()
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const comment = pipeline.addComment('nonexistent', '评论')
    expect(comment).toBeNull()
  })

  it('可以回复评论', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const root = pipeline.addComment('r1', '根评论')!
    const reply = pipeline.addComment('r1', '回复', 'user', {
      parentId: root.id,
    })

    expect(reply).not.toBeNull()
    expect(reply!.parentId).toBe(root.id)
  })

  it('editComment 应该编辑评论', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const comment = pipeline.addComment('r1', '原始内容')!
    const result = pipeline.editComment(comment.id, '修改后的内容')

    expect(result).toBe(true)
    expect(comment.editedAt).not.toBeNull()
    expect(comment.content).toBe('修改后的内容')
  })

  it('deleteComment 应该删除评论及子回复', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const root = pipeline.addComment('r1', '根评论')!
    pipeline.addComment('r1', '回复', 'user', { parentId: root.id })

    const result = pipeline.deleteComment(root.id)
    expect(result).toBe(true)
    expect(pipeline.comments.value.length).toBe(0)
  })

  it('resolveComment 应该解决评论', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const comment = pipeline.addComment('r1', '待解决')!
    const result = pipeline.resolveComment(comment.id, 'reviewer')

    expect(result).toBe(true)
    expect(comment.resolved).toBe(true)
    expect(comment.resolvedBy).toBe('reviewer')
  })

  it('reopenComment 应该重新打开', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const comment = pipeline.addComment('r1', '评论')!
    pipeline.resolveComment(comment.id)
    pipeline.reopenComment(comment.id)

    expect(comment.resolved).toBe(false)
    expect(comment.resolvedAt).toBeNull()
  })

  it('getCommentThreads 应该返回线程列表', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const root = pipeline.addComment('r1', '根评论')!
    pipeline.addComment('r1', '回复1', 'user', { parentId: root.id })
    pipeline.addComment('r1', '回复2', 'user', { parentId: root.id })

    const threads = pipeline.getCommentThreads('r1')
    expect(threads.length).toBe(1)
    expect(threads[0].replyCount).toBe(2)
    expect(threads[0].resolved).toBe(false)
  })

  it('getReplies 应该返回回复列表', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const root = pipeline.addComment('r1', '根评论')!
    pipeline.addComment('r1', '回复1', 'user', { parentId: root.id })
    pipeline.addComment('r1', '回复2', 'user', { parentId: root.id })

    const replies = pipeline.getReplies(root.id)
    expect(replies.length).toBe(2)
  })

  it('评论添加锚点', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const comment = pipeline.addComment('r1', '锚点评论', 'user', {
      anchor: { line: 5, column: 10, selectedText: '选中文本' },
    })

    expect(comment).not.toBeNull()
    expect(comment!.anchor).not.toBeNull()
    expect(comment!.anchor!.line).toBe(5)
    expect(comment!.anchor!.selectedText).toBe('选中文本')
  })
})

// ============================================================
// 发布统计测试
// ============================================================

describe('发布统计', () => {
  it('computePublishStats 应该计算统计', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    const r1 = createTestRecord('r1', { createdAt: '2026-01-01T00:00:00Z' })
    const r2 = createTestRecord('r2', { createdAt: '2026-01-02T00:00:00Z', status: 'published' })
    recs.set('r1', r1)
    recs.set('r2', r2)
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    // 发布 r2
    pipeline.submitForReview('r2')
    pipeline.approve('r2')
    pipeline.publish('r2', ['timeline'])

    const stats = pipeline.computePublishStats([r1, r2])
    expect(stats.totalPublished).toBe(1)
    expect(stats.byType.note).toBe(2)
    expect(stats.dailyTrend.length).toBe(2)
    expect(stats.computedAt).toBeDefined()
  })

  it('统计应该包含审核通过率', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    recs.set('r2', createTestRecord('r2'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    // r1: 通过
    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.publish('r1')

    // r2: 驳回
    pipeline.submitForReview('r2')
    pipeline.reject('r2')

    const stats = pipeline.computePublishStats([getRecord('r1')!, getRecord('r2')!])
    expect(stats.approvalRate).toBe(50) // 1/2 = 50%
  })

  it('统计应该包含评论统计', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.addComment('r1', '评论1')
    pipeline.addComment('r1', '评论2')

    const stats = pipeline.computePublishStats([getRecord('r1')!])
    expect(stats.commentStats.totalComments).toBe(2)
    expect(stats.commentStats.totalThreads).toBe(2)
  })

  it('统计应该包含版本统计', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { content: 'v1' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.createVersion('r1', 'v1')
    updateRecord('r1', { content: 'v2' })
    pipeline.createVersion('r1', 'v2')

    const stats = pipeline.computePublishStats([getRecord('r1')!])
    expect(stats.versionStats.totalVersions).toBe(2)
  })

  it('可以指定时间范围', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { createdAt: '2026-01-01T00:00:00Z' }))
    recs.set('r2', createTestRecord('r2', { createdAt: '2026-06-01T00:00:00Z' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const stats = pipeline.computePublishStats(
      [getRecord('r1')!, getRecord('r2')!],
      { start: '2026-01-01', end: '2026-03-01' },
    )
    expect(stats.totalPublished).toBe(0) // r2 不在范围内
    expect(stats.dailyTrend.length).toBe(1) // 只有 r1
  })

  it('热门标签统计', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.addTag('r1', '重要')
    pipeline.addTag('r1', '工作')

    const stats = pipeline.computePublishStats([getRecord('r1')!])
    expect(stats.topTags.length).toBe(2)
  })
})

// ============================================================
// 标签管理测试
// ============================================================

describe('标签管理', () => {
  it('addTag 应该添加标签', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    expect(pipeline.addTag('r1', '标签1')).toBe(true)
    expect(pipeline.addTag('r1', '标签2')).toBe(true)

    const pipeRec = pipeline.getPipeline('r1')
    expect(pipeRec!.tags).toContain('标签1')
    expect(pipeRec!.tags).toContain('标签2')
  })

  it('重复标签应该忽略', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.addTag('r1', '标签1')
    expect(pipeline.addTag('r1', '标签1')).toBe(false)
  })

  it('removeTag 应该移除标签', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.addTag('r1', '标签1')
    expect(pipeline.removeTag('r1', '标签1')).toBe(true)
    expect(pipeline.getPipeline('r1')!.tags).not.toContain('标签1')
  })

  it('setVisibility 应该设置可见性', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.setVisibility('r1', 'shared')
    expect(pipeline.getPipeline('r1')!.visibility).toBe('shared')
  })
})

// ============================================================
// 批量操作测试
// ============================================================

describe('批量操作', () => {
  it('batchSubmitForReview 应该批量提交审核', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    recs.set('r2', createTestRecord('r2'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const result = pipeline.batchSubmitForReview(['r1', 'r2'])
    expect(result.success).toBe(2)
    expect(result.fail).toBe(0)
    expect(pipeline.getStage('r1')).toBe('review')
    expect(pipeline.getStage('r2')).toBe('review')
  })

  it('batchPublish 应该批量发布', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    recs.set('r2', createTestRecord('r2'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.submitForReview('r1')
    pipeline.approve('r1')
    pipeline.submitForReview('r2')
    pipeline.approve('r2')

    const result = pipeline.batchPublish(['r1', 'r2'])
    expect(result.success).toBe(2)
    expect(pipeline.getStage('r1')).toBe('published')
    expect(pipeline.getStage('r2')).toBe('published')
  })

  it('batchArchive 应该批量归档', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1'))
    recs.set('r2', createTestRecord('r2'))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const result = pipeline.batchArchive(['r1', 'r2'])
    expect(result.success).toBe(2)
    expect(pipeline.getStage('r1')).toBe('archived')
    expect(pipeline.getStage('r2')).toBe('archived')
  })
})

// ============================================================
// 配置管理测试
// ============================================================

describe('配置管理', () => {
  it('默认配置应该正确', () => {
    const { getRecord, updateRecord } = setup()
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    expect(pipeline.config.value.reviewRequired).toBe(true)
    expect(pipeline.config.value.maxVersions).toBe(50)
    expect(pipeline.config.value.autoArchiveDays).toBe(90)
    expect(pipeline.config.value.allowWithdraw).toBe(true)
    expect(pipeline.config.value.withdrawWindowHours).toBe(24)
    expect(pipeline.config.value.maxCommentDepth).toBe(5)
  })

  it('updateConfig 应该更新配置', () => {
    const { getRecord, updateRecord } = setup()
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    pipeline.updateConfig({ maxVersions: 100, reviewRequired: false })
    expect(pipeline.config.value.maxVersions).toBe(100)
    expect(pipeline.config.value.reviewRequired).toBe(false)
  })
})

// ============================================================
// 自动归档测试
// ============================================================

describe('自动归档', () => {
  it('checkAutoArchive 应该归档过期记录', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    const pastDate = new Date(Date.now() - 100 * 86400000).toISOString() // 100天前
    recs.set('r1', createTestRecord('r1', {
      status: 'published',
      updatedAt: pastDate,
    }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    // 将 r1 设为 published
    recs.set('r1', { ...recs.get('r1')!, status: 'published' })

    const count = pipeline.checkAutoArchive([getRecord('r1')!])
    expect(count).toBe(1)
    expect(pipeline.getStage('r1')).toBe('archived')
  })

  it('未过期的记录不应该归档', () => {
    const { records: recs, getRecord, updateRecord } = setup()
    recs.set('r1', createTestRecord('r1', { status: 'published' }))
    const pipeline = usePublishPipeline(getRecord, updateRecord)

    const count = pipeline.checkAutoArchive([getRecord('r1')!])
    expect(count).toBe(0)
  })
})