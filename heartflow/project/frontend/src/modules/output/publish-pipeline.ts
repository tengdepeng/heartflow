// ============================================================
// 输出管理 · 发布流水线引擎（P15-8）
// 草稿→审核→发布→归档 + 版本管理 + 协作评论 + 发布统计
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { OutputRecord, OutputRecordType } from './types'
import { governanceCheckPublish } from './governance-gate'

// ============================================================
// 类型定义
// ============================================================

/** 发布流水线阶段 */
export type PipelineStage =
  | 'draft'       // 草稿
  | 'review'      // 审核中
  | 'approved'    // 已审核
  | 'published'   // 已发布
  | 'archived'    // 已归档
  | 'rejected'    // 已驳回
  | 'withdrawn'   // 已撤回

/** 流水线阶段元数据 */
export interface PipelineStageMeta {
  stage: PipelineStage
  label: string
  description: string
  icon: string
  color: string
  /** 允许转换到的下一阶段 */
  nextStages: PipelineStage[]
}

/** 发布流水线记录 */
export interface PipelineRecord {
  /** 关联的输出记录 ID */
  recordId: string
  /** 当前阶段 */
  stage: PipelineStage
  /** 阶段历史 */
  stageHistory: PipelineStageEntry[]
  /** 审核者 */
  reviewer: string | null
  /** 审核意见 */
  reviewComment: string | null
  /** 审核时间 */
  reviewedAt: string | null
  /** 发布时间 */
  publishedAt: string | null
  /** 归档时间 */
  archivedAt: string | null
  /** 计划发布时间 */
  scheduledPublishAt: string | null
  /** 发布渠道 */
  publishChannels: PublishChannel[]
  /** 标签 */
  tags: string[]
  /** 可见性 */
  visibility: 'private' | 'shared' | 'public'
}

/** 阶段历史条目 */
export interface PipelineStageEntry {
  stage: PipelineStage
  enteredAt: string
  enteredBy: string
  duration?: number  // 在该阶段的停留时长（毫秒）
  comment?: string
}

/** 发布渠道 */
export type PublishChannel =
  | 'timeline'      // 时间线
  | 'garden'        // 花园
  | 'anchor'        // 锚点
  | 'world'         // 平行世界
  | 'share'         // 外部分享
  | 'export'        // 导出

/** 版本快照 */
export interface VersionSnapshot {
  /** 版本 ID */
  id: string
  /** 版本号 */
  version: number
  /** 记录 ID */
  recordId: string
  /** 记录内容快照 */
  content: string
  /** 记录类型 */
  type: OutputRecordType
  /** 格式 */
  format: 'text' | 'markdown' | 'rich'
  /** 附件 */
  attachments: string[]
  /** 创建时间 */
  createdAt: string
  /** 创建者 */
  createdBy: string
  /** 变更说明 */
  changeNote: string
  /** 变更摘要 */
  changeSummary: VersionChangeSummary | null
}

/** 版本变更摘要 */
export interface VersionChangeSummary {
  /** 新增行数 */
  linesAdded: number
  /** 删除行数 */
  linesDeleted: number
  /** 修改行数 */
  linesModified: number
  /** 变更百分比 */
  changePercent: number
  /** 关键变更 */
  keyChanges: string[]
}

/** 版本差异 */
export interface VersionDiff {
  /** 旧版本 */
  oldVersion: VersionSnapshot
  /** 新版本 */
  newVersion: VersionSnapshot
  /** 差异块 */
  diffBlocks: DiffBlock[]
  /** 总变更量 */
  totalChanges: number
  /** 相似度 */
  similarity: number
}

/** 差异块 */
export interface DiffBlock {
  /** 类型 */
  type: 'added' | 'removed' | 'modified'
  /** 旧版本中的行范围 */
  oldRange: { start: number; end: number } | null
  /** 新版本中的行范围 */
  newRange: { start: number; end: number } | null
  /** 旧内容 */
  oldContent: string[]
  /** 新内容 */
  newContent: string[]
}

/** 协作评论 */
export interface Comment {
  /** 评论 ID */
  id: string
  /** 记录 ID */
  recordId: string
  /** 父评论 ID（回复） */
  parentId: string | null
  /** 评论作者 */
  author: string
  /** 评论内容 */
  content: string
  /** 创建时间 */
  createdAt: string
  /** 编辑时间 */
  editedAt: string | null
  /** 是否已解决 */
  resolved: boolean
  /** 解决时间 */
  resolvedAt: string | null
  /** 解决者 */
  resolvedBy: string | null
  /** 评论锚点（关联到具体内容位置） */
  anchor: CommentAnchor | null
  /** 回复列表 */
  replies: Comment[]
}

/** 评论锚点 */
export interface CommentAnchor {
  /** 行号 */
  line: number
  /** 列号 */
  column: number
  /** 选中文本 */
  selectedText: string
}

/** 评论线程 */
export interface CommentThread {
  /** 根评论 */
  root: Comment
  /** 回复数量 */
  replyCount: number
  /** 最后活动时间 */
  lastActivityAt: string
  /** 是否已解决 */
  resolved: boolean
}

/** 发布统计 */
export interface PublishStats {
  /** 统计时间范围 */
  period: { start: string; end: string }
  /** 总记录数 */
  totalPublished: number
  /** 各阶段统计 */
  byStage: Record<PipelineStage, number>
  /** 各类型统计 */
  byType: Record<OutputRecordType, number>
  /** 各渠道统计 */
  byChannel: Record<PublishChannel, number>
  /** 审核通过率 */
  approvalRate: number
  /** 平均审核时长（毫秒） */
  averageReviewDuration: number
  /** 每日趋势 */
  dailyTrend: { date: string; count: number }[]
  /** 热门标签 */
  topTags: { tag: string; count: number }[]
  /** 评论统计 */
  commentStats: CommentStats
  /** 版本统计 */
  versionStats: VersionStats
  /** 统计时间 */
  computedAt: string
}

/** 评论统计 */
export interface CommentStats {
  totalComments: number
  totalThreads: number
  resolvedThreads: number
  averageRepliesPerThread: number
  mostActiveThreads: { recordId: string; commentCount: number }[]
}

/** 版本统计 */
export interface VersionStats {
  totalVersions: number
  totalSnapshots: number
  averageVersionsPerRecord: number
  averageChangePercent: number
  mostVersionedRecords: { recordId: string; versionCount: number }[]
}

/** 发布流水线配置 */
export interface PipelineConfig {
  /** 是否启用审核流程 */
  reviewRequired: boolean
  /** 最大版本保留数 */
  maxVersions: number
  /** 是否自动归档（超过 N 天未更新） */
  autoArchiveDays: number
  /** 是否允许撤回已发布 */
  allowWithdraw: boolean
  /** 撤回时间窗口（小时） */
  withdrawWindowHours: number
  /** 最大评论线程深度 */
  maxCommentDepth: number
}

// ============================================================
// 元数据
// ============================================================

/** 流水线阶段元数据 */
export const PIPELINE_STAGE_META: Record<PipelineStage, PipelineStageMeta> = {
  draft: {
    stage: 'draft',
    label: '草稿',
    description: '内容正在编辑中，尚未提交审核',
    icon: '📝',
    color: '#9CA3AF',
    nextStages: ['review', 'archived'],
  },
  review: {
    stage: 'review',
    label: '审核中',
    description: '等待审核者确认发布',
    icon: '🔍',
    color: '#F59E0B',
    nextStages: ['approved', 'rejected', 'draft'],
  },
  approved: {
    stage: 'approved',
    label: '已审核',
    description: '审核通过，等待发布',
    icon: '✅',
    color: '#10B981',
    nextStages: ['published', 'draft', 'review'],
  },
  published: {
    stage: 'published',
    label: '已发布',
    description: '内容已对外发布',
    icon: '🚀',
    color: '#6b9fc4',
    nextStages: ['archived', 'withdrawn'],
  },
  archived: {
    stage: 'archived',
    label: '已归档',
    description: '内容已归档保存',
    icon: '📦',
    color: '#6B7280',
    nextStages: ['draft'],
  },
  rejected: {
    stage: 'rejected',
    label: '已驳回',
    description: '审核未通过，需修改后重新提交',
    icon: '❌',
    color: '#EF4444',
    nextStages: ['draft', 'review'],
  },
  withdrawn: {
    stage: 'withdrawn',
    label: '已撤回',
    description: '已发布内容被撤回',
    icon: '↩️',
    color: '#a07c8c',
    nextStages: ['draft', 'review'],
  },
}

/** 发布渠道元数据 */
export const PUBLISH_CHANNEL_META: Record<PublishChannel, {
  label: string
  description: string
  icon: string
}> = {
  timeline: { label: '时间线', description: '发布到个人时间线', icon: '📅' },
  garden: { label: '花园', description: '发布到情绪花园', icon: '🌸' },
  anchor: { label: '锚点', description: '关联到锚点', icon: '⚓' },
  world: { label: '平行世界', description: '发布到平行世界', icon: '🌐' },
  share: { label: '外部分享', description: '生成分享链接', icon: '🔗' },
  export: { label: '导出', description: '导出为文件', icon: '📤' },
}

// ============================================================
// 存储键
// ============================================================

const STORAGE_KEYS = {
  PIPELINES: 'hf:output:pipelines',
  VERSIONS: 'hf:output:versions',
  COMMENTS: 'hf:output:comments',
  STATS: 'hf:output:publish_stats',
  CONFIG: 'hf:output:pipeline_config',
} as const

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  reviewRequired: true,
  maxVersions: 50,
  autoArchiveDays: 90,
  allowWithdraw: true,
  withdrawWindowHours: 24,
  maxCommentDepth: 5,
}

// ============================================================
// 工具函数
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

/** 简单文本差异计算 */
function computeTextDiff(
  oldText: string,
  newText: string,
): VersionChangeSummary {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  let linesAdded = 0
  let linesDeleted = 0
  let linesModified = 0
  const keyChanges: string[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined && newLine !== undefined) {
      linesAdded++
      if (newLine.trim().length > 0) {
        keyChanges.push(`新增行 ${i + 1}: ${newLine.slice(0, 60)}`)
      }
    } else if (newLine === undefined && oldLine !== undefined) {
      linesDeleted++
      if (oldLine.trim().length > 0) {
        keyChanges.push(`删除行 ${i + 1}: ${oldLine.slice(0, 60)}`)
      }
    } else if (oldLine !== newLine) {
      linesModified++
      if (oldLine.trim() !== newLine.trim()) {
        keyChanges.push(`修改行 ${i + 1}`)
      }
    }
  }

  const totalLines = oldLines.length + newLines.length
  const changePercent = totalLines > 0
    ? Math.round(((linesAdded + linesDeleted + linesModified) / totalLines) * 100)
    : 0

  return {
    linesAdded,
    linesDeleted,
    linesModified,
    changePercent: Math.min(changePercent, 100),
    keyChanges: keyChanges.slice(0, 10),
  }
}

/** 简单行级差异 */
function computeLineDiff(
  oldText: string,
  newText: string,
): { diffBlocks: DiffBlock[]; similarity: number } {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const diffBlocks: DiffBlock[] = []
  let sameLines = 0
  let totalCompared = 0

  const maxLen = Math.max(oldLines.length, newLines.length)
  let i = 0

  while (i < maxLen) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      sameLines++
      totalCompared++
      i++
      continue
    }

    totalCompared++

    if (oldLine === undefined) {
      // 纯新增
      let end = i
      while (end < newLines.length && oldLines[end] === undefined) {
        end++
      }
      diffBlocks.push({
        type: 'added',
        oldRange: null,
        newRange: { start: i, end: end - 1 },
        oldContent: [],
        newContent: newLines.slice(i, end),
      })
      i = end
    } else if (newLine === undefined) {
      // 纯删除
      let end = i
      while (end < oldLines.length && newLines[end] === undefined) {
        end++
      }
      diffBlocks.push({
        type: 'removed',
        oldRange: { start: i, end: end - 1 },
        newRange: null,
        oldContent: oldLines.slice(i, end),
        newContent: [],
      })
      i = end
    } else {
      // 修改
      diffBlocks.push({
        type: 'modified',
        oldRange: { start: i, end: i },
        newRange: { start: i, end: i },
        oldContent: [oldLine],
        newContent: [newLine],
      })
      i++
    }
  }

  const similarity = totalCompared > 0
    ? Math.round((sameLines / totalCompared) * 100) / 100
    : 1

  return { diffBlocks, similarity }
}

// ============================================================
// 发布流水线引擎 Composable
// ============================================================

export function usePublishPipeline(
  getRecord: (id: string) => OutputRecord | undefined,
  updateRecord: (id: string, updates: Partial<OutputRecord>) => boolean,
) {
  // ---- 配置 ----
  const config = ref<PipelineConfig>(loadConfig())

  function loadConfig(): PipelineConfig {
    try {
      const saved = storage.getKV<PipelineConfig>(STORAGE_KEYS.CONFIG, DEFAULT_PIPELINE_CONFIG)
      return { ...DEFAULT_PIPELINE_CONFIG, ...saved }
    } catch {
      return { ...DEFAULT_PIPELINE_CONFIG }
    }
  }

  function persistConfig() {
    storage.setKV(STORAGE_KEYS.CONFIG, config.value)
  }

  // ---- 流水线状态 ----
  const pipelines = ref<Record<string, PipelineRecord>>(loadPipelines())

  function loadPipelines(): Record<string, PipelineRecord> {
    try {
      return storage.getKV<Record<string, PipelineRecord>>(STORAGE_KEYS.PIPELINES, {})
    } catch {
      return {}
    }
  }

  function persistPipelines() {
    storage.setKV(STORAGE_KEYS.PIPELINES, pipelines.value)
  }

  /** 获取或初始化流水线记录 */
  function getOrInitPipeline(recordId: string): PipelineRecord {
    if (!pipelines.value[recordId]) {
      const record = getRecord(recordId)
      pipelines.value[recordId] = {
        recordId,
        stage: record?.status === 'published' ? 'published' : 'draft',
        stageHistory: [{
          stage: record?.status === 'published' ? 'published' : 'draft',
          enteredAt: record?.createdAt || now(),
          enteredBy: 'user',
        }],
        reviewer: null,
        reviewComment: null,
        reviewedAt: null,
        publishedAt: record?.status === 'published' ? record.createdAt : null,
        archivedAt: record?.status === 'archived' ? record.updatedAt : null,
        scheduledPublishAt: null,
        publishChannels: [],
        tags: [],
        visibility: 'private',
      }
      persistPipelines()
    }
    return pipelines.value[recordId]
  }

  /** 获取流水线阶段 */
  function getStage(recordId: string): PipelineStage {
    return getOrInitPipeline(recordId).stage
  }

  /** 获取流水线记录 */
  function getPipeline(recordId: string): PipelineRecord | null {
    return pipelines.value[recordId] || null
  }

  // ============================================================
  // 阶段转换
  // ============================================================

  /** 验证阶段转换是否合法 */
  function canTransition(
    recordId: string,
    target: PipelineStage,
  ): boolean {
    const pipeline = getOrInitPipeline(recordId)
    const meta = PIPELINE_STAGE_META[pipeline.stage]
    return meta.nextStages.includes(target)
  }

  /** 阶段转换 */
  function transition(
    recordId: string,
    target: PipelineStage,
    options: {
      by?: string
      comment?: string
      reviewer?: string
      channels?: PublishChannel[]
      scheduledAt?: string
    } = {},
  ): boolean {
    const pipeline = getOrInitPipeline(recordId)

    if (!canTransition(recordId, target)) {
      console.warn(
        `[Pipeline] 无效阶段转换: ${pipeline.stage} → ${target}`,
      )
      return false
    }

    const entry: PipelineStageEntry = {
      stage: target,
      enteredAt: now(),
      enteredBy: options.by || 'user',
      duration: Date.now() - new Date(pipeline.stageHistory[pipeline.stageHistory.length - 1].enteredAt).getTime(),
      comment: options.comment,
    }

    pipeline.stage = target
    pipeline.stageHistory.push(entry)

    // 根据目标阶段更新记录状态
    switch (target) {
      case 'draft':
        updateRecord(recordId, { status: 'draft' })
        break
      case 'review':
        pipeline.reviewer = options.reviewer || null
        updateRecord(recordId, { status: 'draft' })
        break
      case 'approved':
        pipeline.reviewedAt = now()
        pipeline.reviewComment = options.comment || null
        updateRecord(recordId, { status: 'draft' })
        break
      case 'published':
        pipeline.publishedAt = now()
        pipeline.publishChannels = options.channels || pipeline.publishChannels
        pipeline.visibility = 'public'
        updateRecord(recordId, { status: 'published' })
        break
      case 'archived':
        pipeline.archivedAt = now()
        updateRecord(recordId, { status: 'archived' })
        break
      case 'rejected':
        pipeline.reviewedAt = now()
        pipeline.reviewComment = options.comment || '审核未通过'
        updateRecord(recordId, { status: 'draft' })
        break
      case 'withdrawn':
        updateRecord(recordId, { status: 'draft' })
        break
    }

    if (options.scheduledAt) {
      pipeline.scheduledPublishAt = options.scheduledAt
    }

    persistPipelines()
    return true
  }

  /** 提交审核 */
  function submitForReview(
    recordId: string,
    reviewer?: string,
    comment?: string,
  ): boolean {
    return transition(recordId, 'review', { reviewer, comment })
  }

  /** 审核通过 */
  function approve(
    recordId: string,
    comment?: string,
    by?: string,
  ): boolean {
    return transition(recordId, 'approved', { comment, by })
  }

  /** 驳回 */
  function reject(
    recordId: string,
    comment?: string,
    by?: string,
  ): boolean {
    return transition(recordId, 'rejected', { comment, by })
  }

  /** 发布 */
  function publish(
    recordId: string,
    channels?: PublishChannel[],
    scheduledAt?: string,
  ): boolean {
    // #85 输出治理闸：外部分享渠道（share）触发第1条·本地私有硬拦截；
    // 其余仅观测并上报守护室审计（不拦截）。
    const record = getRecord(recordId)
    const gate = governanceCheckPublish(channels ?? [], record?.content ?? '')
    if (!gate.allowed) {
      console.warn(`[Pipeline] 治理拦截发布（${recordId}）：${gate.reason}`)
      return false
    }
    return transition(recordId, 'published', {
      channels,
      scheduledAt,
    })
  }

  /** 归档 */
  function archive(recordId: string): boolean {
    return transition(recordId, 'archived')
  }

  /** 撤回 */
  function withdraw(recordId: string, comment?: string): boolean {
    if (!config.value.allowWithdraw) return false

    const pipeline = getOrInitPipeline(recordId)
    if (pipeline.stage !== 'published') return false

    if (pipeline.publishedAt) {
      const publishedTime = new Date(pipeline.publishedAt).getTime()
      const hoursSincePublish = (Date.now() - publishedTime) / 3600000
      if (hoursSincePublish > config.value.withdrawWindowHours) {
        console.warn(`[Pipeline] 超过撤回时间窗口（${config.value.withdrawWindowHours}小时）`)
        return false
      }
    }

    return transition(recordId, 'withdrawn', { comment })
  }

  /** 退回草稿 */
  function backToDraft(recordId: string): boolean {
    return transition(recordId, 'draft')
  }

  // ============================================================
  // 版本管理
  // ============================================================

  const versions = ref<VersionSnapshot[]>(loadVersions())

  function loadVersions(): VersionSnapshot[] {
    try {
      return storage.getKV<VersionSnapshot[]>(STORAGE_KEYS.VERSIONS, [])
    } catch {
      return []
    }
  }

  function persistVersions() {
    storage.setKV(STORAGE_KEYS.VERSIONS, versions.value)
  }

  /** 创建版本快照 */
  function createVersion(
    recordId: string,
    changeNote: string = '',
    createdBy: string = 'user',
  ): VersionSnapshot | null {
    const record = getRecord(recordId)
    if (!record) return null

    const recordVersions = versions.value
      .filter(v => v.recordId === recordId)
      .sort((a, b) => b.version - a.version)

    const latestVersion = recordVersions[0]
    const previousContent = latestVersion?.content || ''

    const changeSummary = previousContent
      ? computeTextDiff(previousContent, record.content)
      : null

    const snapshot: VersionSnapshot = {
      id: generateId('ver'),
      version: (latestVersion?.version || 0) + 1,
      recordId,
      content: record.content,
      type: record.type,
      format: record.format || 'text',
      attachments: record.attachments || [],
      createdAt: now(),
      createdBy,
      changeNote,
      changeSummary,
    }

    versions.value = [snapshot, ...versions.value]

    // 限制最大版本数
    const recordAllVersions = versions.value
      .filter(v => v.recordId === recordId)
      .sort((a, b) => b.version - a.version)

    if (recordAllVersions.length > config.value.maxVersions) {
      const toRemove = recordAllVersions.slice(config.value.maxVersions)
      versions.value = versions.value.filter(
        v => !toRemove.find(r => r.id === v.id),
      )
    }

    persistVersions()
    return snapshot
  }

  /** 自动创建版本（在阶段转换时调用） */
  function autoCreateVersion(recordId: string): VersionSnapshot | null {
    const pipeline = getOrInitPipeline(recordId)
    if (pipeline.stage === 'published' || pipeline.stage === 'archived') {
      return createVersion(recordId, `自动快照 - ${PIPELINE_STAGE_META[pipeline.stage].label}`)
    }
    return null
  }

  /** 获取记录的所有版本 */
  function getVersions(recordId: string): VersionSnapshot[] {
    return versions.value
      .filter(v => v.recordId === recordId)
      .sort((a, b) => b.version - a.version)
  }

  /** 获取最新版本 */
  function getLatestVersion(recordId: string): VersionSnapshot | null {
    const recordVersions = getVersions(recordId)
    return recordVersions[0] || null
  }

  /** 获取指定版本 */
  function getVersion(versionId: string): VersionSnapshot | null {
    return versions.value.find(v => v.id === versionId) || null
  }

  /** 比较两个版本 */
  function diffVersions(
    versionIdA: string,
    versionIdB: string,
  ): VersionDiff | null {
    const versionA = getVersion(versionIdA)
    const versionB = getVersion(versionIdB)

    if (!versionA || !versionB) return null
    if (versionA.recordId !== versionB.recordId) return null

    const { diffBlocks, similarity } = computeLineDiff(
      versionA.content,
      versionB.content,
    )

    return {
      oldVersion: versionA,
      newVersion: versionB,
      diffBlocks,
      totalChanges: diffBlocks.length,
      similarity,
    }
  }

  /** 回滚到指定版本 */
  function rollback(
    recordId: string,
    targetVersionId: string,
  ): boolean {
    const targetVersion = getVersion(targetVersionId)
    if (!targetVersion || targetVersion.recordId !== recordId) return false

    // 先创建当前版本的快照
    createVersion(recordId, `回滚前快照（回滚至版本 ${targetVersion.version}）`)

    // 回滚内容
    const updated = updateRecord(recordId, {
      content: targetVersion.content,
      format: targetVersion.format,
      attachments: targetVersion.attachments,
    })

    if (updated) {
      // 回滚后创建新版本
      createVersion(recordId, `回滚至版本 ${targetVersion.version}`)
    }

    return updated
  }

  // ============================================================
  // 协作评论
  // ============================================================

  const comments = ref<Comment[]>(loadComments())

  function loadComments(): Comment[] {
    try {
      return storage.getKV<Comment[]>(STORAGE_KEYS.COMMENTS, [])
    } catch {
      return []
    }
  }

  function persistComments() {
    storage.setKV(STORAGE_KEYS.COMMENTS, comments.value)
  }

  /** 添加评论 */
  function addComment(
    recordId: string,
    content: string,
    author: string = 'user',
    options: {
      parentId?: string
      anchor?: CommentAnchor
    } = {},
  ): Comment | null {
    const record = getRecord(recordId)
    if (!record) return null

    // 检查回复深度
    if (options.parentId) {
      const depth = getCommentDepth(options.parentId)
      if (depth >= config.value.maxCommentDepth) {
        console.warn(`[Pipeline] 评论线程深度超过限制（${config.value.maxCommentDepth}）`)
        return null
      }
    }

    const comment: Comment = {
      id: generateId('cmt'),
      recordId,
      parentId: options.parentId || null,
      author,
      content,
      createdAt: now(),
      editedAt: null,
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      anchor: options.anchor || null,
      replies: [],
    }

    comments.value = [comment, ...comments.value]
    persistComments()
    return comment
  }

  /** 编辑评论 */
  function editComment(
    commentId: string,
    newContent: string,
  ): boolean {
    const comment = comments.value.find(c => c.id === commentId)
    if (!comment) return false

    comment.content = newContent
    comment.editedAt = now()
    persistComments()
    return true
  }

  /** 删除评论 */
  function deleteComment(commentId: string): boolean {
    const index = comments.value.findIndex(c => c.id === commentId)
    if (index === -1) return false

    // 同时删除所有子回复
    comments.value = comments.value.filter(
      c => c.id !== commentId && c.parentId !== commentId,
    )
    persistComments()
    return true
  }

  /** 解决评论 */
  function resolveComment(
    commentId: string,
    resolvedBy: string = 'user',
  ): boolean {
    const comment = comments.value.find(c => c.id === commentId)
    if (!comment) return false

    comment.resolved = true
    comment.resolvedAt = now()
    comment.resolvedBy = resolvedBy
    persistComments()
    return true
  }

  /** 重新打开评论 */
  function reopenComment(commentId: string): boolean {
    const comment = comments.value.find(c => c.id === commentId)
    if (!comment) return false

    comment.resolved = false
    comment.resolvedAt = null
    comment.resolvedBy = null
    persistComments()
    return true
  }

  /** 获取记录的评论线程 */
  function getCommentThreads(recordId: string): CommentThread[] {
    const recordComments = comments.value
      .filter(c => c.recordId === recordId && c.parentId === null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return recordComments.map(root => {
      const replies = comments.value.filter(c => c.parentId === root.id)
      const allActivity = [root, ...replies]
        .map(c => new Date(c.editedAt || c.createdAt).getTime())

      return {
        root,
        replyCount: replies.length,
        lastActivityAt: new Date(Math.max(...allActivity)).toISOString(),
        resolved: root.resolved,
      }
    })
  }

  /** 获取评论回复 */
  function getReplies(commentId: string): Comment[] {
    return comments.value
      .filter(c => c.parentId === commentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  /** 计算评论深度 */
  function getCommentDepth(commentId: string): number {
    let depth = 0
    let current = comments.value.find(c => c.id === commentId)
    while (current?.parentId) {
      depth++
      current = comments.value.find(c => c.id === current!.parentId)
    }
    return depth
  }

  // ============================================================
  // 发布统计
  // ============================================================

  /** 计算发布统计 */
  function computePublishStats(
    allRecords: OutputRecord[],
    period?: { start: string; end: string },
  ): PublishStats {
    const start = period?.start || '1970-01-01'
    const end = period?.end || '2099-12-31'

    const filteredRecords = allRecords.filter(r => {
      return r.createdAt >= start && r.createdAt <= end
    })

    // 阶段统计
    const byStage: Record<string, number> = {}
    const byType: Record<string, number> = {}
    const byChannel: Record<string, number> = {}
    const dailyMap = new Map<string, number>()
    const tagMap = new Map<string, number>()
    let totalReviewDuration = 0
    let reviewCount = 0

    for (const record of filteredRecords) {
      const pipeline = pipelines.value[record.id]
      const stage = pipeline?.stage || (record.status === 'published' ? 'published' : 'draft')
      byStage[stage] = (byStage[stage] || 0) + 1
      byType[record.type] = (byType[record.type] || 0) + 1

      if (pipeline) {
        for (const ch of pipeline.publishChannels) {
          byChannel[ch] = (byChannel[ch] || 0) + 1
        }
        for (const tag of pipeline.tags) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
        }

        // 计算审核时长
        const reviewEntry = pipeline.stageHistory.find(
          e => e.stage === 'review' || e.stage === 'approved',
        )
        if (reviewEntry?.duration) {
          totalReviewDuration += reviewEntry.duration
          reviewCount++
        }
      }

      const dateKey = record.createdAt.split('T')[0]
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1)
    }

    // 审核通过率
    const totalReviewed = (byStage['published'] || 0) + (byStage['rejected'] || 0)
    const approvalRate = totalReviewed > 0
      ? Math.round(((byStage['published'] || 0) / totalReviewed) * 100)
      : 0

    // 评论统计
    const commentStats = computeCommentStats()

    // 版本统计
    const versionStats = computeVersionStats()

    // 热门标签
    const topTags = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    return {
      period: { start, end },
      totalPublished: filteredRecords.filter(r => r.status === 'published').length,
      byStage: byStage as Record<PipelineStage, number>,
      byType: byType as Record<OutputRecordType, number>,
      byChannel: byChannel as Record<PublishChannel, number>,
      approvalRate,
      averageReviewDuration: reviewCount > 0
        ? Math.round(totalReviewDuration / reviewCount)
        : 0,
      dailyTrend: [...dailyMap.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topTags,
      commentStats,
      versionStats,
      computedAt: now(),
    }
  }

  function computeCommentStats(): CommentStats {
    const threads = comments.value.filter(c => c.parentId === null)
    const resolvedThreads = threads.filter(t => t.resolved).length
    const totalReplies = comments.value.filter(c => c.parentId !== null).length

    // 最活跃线程
    const threadActivity = new Map<string, number>()
    for (const c of comments.value) {
      const rootId = c.parentId || c.id
      threadActivity.set(rootId, (threadActivity.get(rootId) || 0) + 1)
    }
    const mostActiveThreads = [...threadActivity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([recordId, commentCount]) => {
        const rootComment = comments.value.find(c => c.id === recordId)
        return {
          recordId: rootComment?.recordId || recordId,
          commentCount,
        }
      })

    return {
      totalComments: comments.value.length,
      totalThreads: threads.length,
      resolvedThreads,
      averageRepliesPerThread: threads.length > 0
        ? Math.round((totalReplies / threads.length) * 100) / 100
        : 0,
      mostActiveThreads,
    }
  }

  function computeVersionStats(): VersionStats {
    const recordVersionMap = new Map<string, number>()
    let totalChangePercent = 0
    let changeCount = 0

    for (const v of versions.value) {
      recordVersionMap.set(v.recordId, (recordVersionMap.get(v.recordId) || 0) + 1)
      if (v.changeSummary) {
        totalChangePercent += v.changeSummary.changePercent
        changeCount++
      }
    }

    const mostVersionedRecords = [...recordVersionMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([recordId, versionCount]) => ({ recordId, versionCount }))

    return {
      totalVersions: versions.value.length,
      totalSnapshots: versions.value.length,
      averageVersionsPerRecord: recordVersionMap.size > 0
        ? Math.round((versions.value.length / recordVersionMap.size) * 100) / 100
        : 0,
      averageChangePercent: changeCount > 0
        ? Math.round(totalChangePercent / changeCount)
        : 0,
      mostVersionedRecords,
    }
  }

  // ============================================================
  // 标签管理
  // ============================================================

  /** 添加标签 */
  function addTag(recordId: string, tag: string): boolean {
    const pipeline = getOrInitPipeline(recordId)
    if (pipeline.tags.includes(tag)) return false
    pipeline.tags.push(tag)
    persistPipelines()
    return true
  }

  /** 移除标签 */
  function removeTag(recordId: string, tag: string): boolean {
    const pipeline = getOrInitPipeline(recordId)
    const index = pipeline.tags.indexOf(tag)
    if (index === -1) return false
    pipeline.tags.splice(index, 1)
    persistPipelines()
    return true
  }

  /** 设置可见性 */
  function setVisibility(
    recordId: string,
    visibility: PipelineRecord['visibility'],
  ): boolean {
    const pipeline = getOrInitPipeline(recordId)
    pipeline.visibility = visibility
    persistPipelines()
    return true
  }

  // ============================================================
  // 自动归档
  // ============================================================

  /** 检查并自动归档过期记录 */
  function checkAutoArchive(allRecords: OutputRecord[]): number {
    let archivedCount = 0
    const threshold = Date.now() - config.value.autoArchiveDays * 86400000

    for (const record of allRecords) {
      if (record.status === 'published') {
        const updatedAt = new Date(record.updatedAt).getTime()
        if (updatedAt < threshold) {
          if (transition(record.id, 'archived', { by: 'system' })) {
            archivedCount++
          }
        }
      }
    }

    return archivedCount
  }

  // ============================================================
  // 批量流水线操作
  // ============================================================

  /** 批量提交审核 */
  function batchSubmitForReview(recordIds: string[]): { success: number; fail: number } {
    let success = 0
    let fail = 0
    for (const id of recordIds) {
      if (submitForReview(id)) success++
      else fail++
    }
    return { success, fail }
  }

  /** 批量发布 */
  function batchPublish(recordIds: string[]): { success: number; fail: number } {
    let success = 0
    let fail = 0
    for (const id of recordIds) {
      if (publish(id)) success++
      else fail++
    }
    return { success, fail }
  }

  /** 批量归档 */
  function batchArchive(recordIds: string[]): { success: number; fail: number } {
    let success = 0
    let fail = 0
    for (const id of recordIds) {
      if (archive(id)) success++
      else fail++
    }
    return { success, fail }
  }

  return {
    // 配置
    config,
    updateConfig: (partial: Partial<PipelineConfig>) => {
      config.value = { ...config.value, ...partial }
      persistConfig()
    },

    // 流水线状态
    pipelines,
    getStage,
    getPipeline,
    canTransition,
    transition,

    // 阶段操作
    submitForReview,
    approve,
    reject,
    publish,
    archive,
    withdraw,
    backToDraft,

    // 版本管理
    versions,
    createVersion,
    autoCreateVersion,
    getVersions,
    getLatestVersion,
    getVersion,
    diffVersions,
    rollback,

    // 协作评论
    comments,
    addComment,
    editComment,
    deleteComment,
    resolveComment,
    reopenComment,
    getCommentThreads,
    getReplies,

    // 发布统计
    computePublishStats,

    // 标签
    addTag,
    removeTag,
    setVisibility,

    // 自动归档
    checkAutoArchive,

    // 批量操作
    batchSubmitForReview,
    batchPublish,
    batchArchive,
  }
}