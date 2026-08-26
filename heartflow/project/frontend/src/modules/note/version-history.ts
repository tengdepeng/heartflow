// ============================================================
// 思绪书房 · 版本历史管理（P19-5）
// 蓝图：自动保存版本、版本对比、差异可视化、恢复与清理
// ============================================================

import { ref, computed } from 'vue'
import type { Note } from '../../types'
import { storage } from '../../engine/storage'

// ---- 版本历史类型 ----

/** 差异类型 */
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

/** 版本快照 */
export interface NoteVersion {
  /** 版本唯一标识 */
  id: string
  /** 关联笔记 ID */
  noteId: string
  /** 版本号（递增） */
  versionNumber: number
  /** 标题快照 */
  title: string
  /** 内容快照 */
  content: string
  /** 标签快照 */
  tags: string[]
  /** 版本创建时间 */
  createdAt: string
  /** 版本描述（自动生成或手动标注） */
  description: string
  /** 是否为自动保存 */
  autoSaved: boolean
  /** 是否为手动保存的里程碑版本 */
  isMilestone: boolean
  /** 里程碑标签 */
  milestoneLabel?: string
  /** 相对于上一版本的变更字符数 */
  changeSize: number
}

/** 版本差异 */
export interface VersionDiff {
  /** 变更类型 */
  type: DiffType
  /** 变更的字段 */
  field: 'title' | 'content' | 'tags'
  /** 旧值 */
  oldValue: string
  /** 新值 */
  newValue: string
  /** 变更位置（字符偏移，仅 content 字段） */
  offset?: number
  /** 变更长度 */
  length?: number
}

/** 版本快照摘要 */
export interface VersionSnapshot {
  /** 版本 */
  version: NoteVersion
  /** 与前一版本的差异列表 */
  diffs: VersionDiff[]
  /** 总变更行数 */
  totalChangedLines: number
  /** 内容相似度 (0-1) */
  similarity: number
}

/** 版本历史配置 */
export interface VersionHistoryConfig {
  /** 每个笔记最大保留版本数 */
  maxVersionsPerNote: number
  /** 自动保存最小间隔（毫秒），同一间隔内的连续编辑只保留最后一个版本 */
  autoSaveIntervalMs: number
  /** 自动保存最小变更字符数，小于此值的变更不触发自动保存 */
  minChangeSize: number
  /** 清理策略：保留最近 N 个版本 */
  cleanupKeepRecent: number
  /** 清理策略：保留里程碑版本 */
  cleanupKeepMilestones: boolean
}

/** 版本统计 */
export interface VersionStats {
  /** 总版本数 */
  totalVersions: number
  /** 有版本记录的笔记数 */
  notesWithVersions: number
  /** 总存储字符数 */
  totalChars: number
  /** 最早版本时间 */
  oldestVersionAt?: string
  /** 最新版本时间 */
  newestVersionAt?: string
  /** 平均每篇笔记版本数 */
  avgVersionsPerNote: number
  /** 里程碑版本数 */
  milestoneCount: number
}

// ---- 默认配置 ----

const DEFAULT_CONFIG: VersionHistoryConfig = {
  maxVersionsPerNote: 50,
  autoSaveIntervalMs: 60000, // 1 分钟
  minChangeSize: 10, // 最少变更 10 个字符
  cleanupKeepRecent: 20,
  cleanupKeepMilestones: true,
}

// ---- 存储键 ----

const VERSION_STORAGE_KEY = 'hf:note_versions'
const VERSION_CONFIG_KEY = 'hf:note_version_config'

// ---- 版本管理 composable ----

export function useVersionHistory() {
  /** 所有版本记录 */
  const versions = ref<NoteVersion[]>(loadVersions())
  /** 配置 */
  const config = ref<VersionHistoryConfig>(loadConfig())

  /** 持久化版本 */
  function persistVersions(): void {
    storage.setKV(VERSION_STORAGE_KEY, versions.value)
  }

  /** 持久化配置 */
  function persistConfig(): void {
    storage.setKV(VERSION_CONFIG_KEY, config.value)
  }

  /** 获取笔记的版本列表（按版本号排序） */
  function getNoteVersions(noteId: string): NoteVersion[] {
    return versions.value
      .filter(v => v.noteId === noteId)
      .sort((a, b) => a.versionNumber - b.versionNumber)
  }

  /**
   * 保存版本（自动或手动）
   */
  function saveVersion(
    note: Note,
    options?: {
      autoSaved?: boolean
      isMilestone?: boolean
      milestoneLabel?: string
      description?: string
    },
  ): NoteVersion | null {
    const noteVersions = getNoteVersions(note.id)
    const latestVersion = noteVersions.length > 0 ? noteVersions[noteVersions.length - 1] : null

    // 检查自动保存间隔
    if (options?.autoSaved && latestVersion) {
      const timeSinceLast = new Date().getTime() - new Date(latestVersion.createdAt).getTime()
      if (timeSinceLast < config.value.autoSaveIntervalMs) {
        return null
      }
    }

    // 检查最小变更大小
    if (options?.autoSaved && latestVersion) {
      const changeSize = computeChangeSize(latestVersion.content, note.content)
      if (changeSize < config.value.minChangeSize) {
        return null
      }
    }

    // 检查是否与上一版本完全相同
    if (latestVersion &&
        latestVersion.title === note.title &&
        latestVersion.content === note.content &&
        arraysEqual(latestVersion.tags, note.tags)) {
      return null
    }

    const now = new Date().toISOString()
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1
    const changeSize = latestVersion
      ? computeChangeSize(latestVersion.content, note.content)
      : note.content.length

    // 自动生成描述
    let description = options?.description || ''
    if (!description) {
      if (options?.autoSaved) {
        description = `自动保存 (v${versionNumber})`
      } else if (options?.isMilestone) {
        description = options?.milestoneLabel || `里程碑 v${versionNumber}`
      } else {
        description = latestVersion
          ? `手动保存 (v${versionNumber})，变更 ${changeSize} 字符`
          : `初始版本`
      }
    }

    const version: NoteVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      noteId: note.id,
      versionNumber,
      title: note.title,
      content: note.content,
      tags: [...note.tags],
      createdAt: now,
      description,
      autoSaved: options?.autoSaved ?? false,
      isMilestone: options?.isMilestone ?? false,
      milestoneLabel: options?.milestoneLabel,
      changeSize,
    }

    versions.value.push(version)

    // 检查版本数限制
    const updatedVersions = getNoteVersions(note.id)
    if (updatedVersions.length > config.value.maxVersionsPerNote) {
      cleanupOldVersions(note.id)
    }

    persistVersions()
    return version
  }

  /**
   * 获取笔记的所有版本
   */
  function getVersions(noteId: string): NoteVersion[] {
    return getNoteVersions(noteId)
  }

  /**
   * 获取笔记的版本数量
   */
  function getVersionCount(noteId: string): number {
    return getNoteVersions(noteId).length
  }

  /**
   * 获取最新版本
   */
  function getLatestVersion(noteId: string): NoteVersion | undefined {
    const noteVersions = getNoteVersions(noteId)
    return noteVersions.length > 0 ? noteVersions[noteVersions.length - 1] : undefined
  }

  /**
   * 获取指定版本
   */
  function getVersionById(versionId: string): NoteVersion | undefined {
    return versions.value.find(v => v.id === versionId)
  }

  /**
   * 恢复版本（将笔记内容恢复到指定版本）
   */
  function restoreVersion(
    versionId: string,
  ): { title: string; content: string; tags: string[] } | null {
    const version = getVersionById(versionId)
    if (!version) return null
    return {
      title: version.title,
      content: version.content,
      tags: [...version.tags],
    }
  }

  /**
   * 比较两个版本
   */
  function compareVersions(
    versionIdA: string,
    versionIdB: string,
  ): VersionSnapshot | null {
    const versionA = getVersionById(versionIdA)
    const versionB = getVersionById(versionIdB)
    if (!versionA || !versionB) return null

    const diffs = computeDiff(versionA, versionB)
    const similarity = computeSimilarity(versionA.content, versionB.content)
    const totalChangedLines = countChangedLines(diffs)

    return {
      version: versionB,
      diffs,
      totalChangedLines,
      similarity,
    }
  }

  /**
   * 获取版本差异（当前版本与指定版本对比）
   */
  function getDiff(
    noteId: string,
    versionId: string,
  ): VersionSnapshot | null {
    const noteVersions = getNoteVersions(noteId)
    const targetVersion = getVersionById(versionId)
    if (!targetVersion) return null

    // 找到该版本在列表中的位置
    const targetIndex = noteVersions.findIndex(v => v.id === versionId)
    if (targetIndex < 0) return null

    // 与前一版本对比
    if (targetIndex === 0) {
      // 第一个版本，与空内容对比
      const emptyVersion: NoteVersion = {
        id: 'empty',
        noteId,
        versionNumber: 0,
        title: '',
        content: '',
        tags: [],
        createdAt: targetVersion.createdAt,
        description: '空',
        autoSaved: false,
        isMilestone: false,
        changeSize: 0,
      }
      // 直接计算差异
      const diffs = computeDiff(emptyVersion, targetVersion)
      const similarity = 0
      const totalChangedLines = countChangedLines(diffs)

      return {
        version: targetVersion,
        diffs,
        totalChangedLines,
        similarity,
      }
    }

    const prevVersion = noteVersions[targetIndex - 1]
    return compareVersions(prevVersion.id, versionId)
  }

  /**
   * 获取里程碑版本列表
   */
  function getMilestones(noteId: string): NoteVersion[] {
    return getNoteVersions(noteId).filter(v => v.isMilestone)
  }

  /**
   * 标记版本为里程碑
   */
  function markAsMilestone(versionId: string, label?: string): boolean {
    const version = getVersionById(versionId)
    if (!version) return false
    version.isMilestone = true
    version.milestoneLabel = label
    version.description = label || `里程碑 v${version.versionNumber}`
    persistVersions()
    return true
  }

  /**
   * 取消里程碑标记
   */
  function unmarkMilestone(versionId: string): boolean {
    const version = getVersionById(versionId)
    if (!version) return false
    version.isMilestone = false
    version.milestoneLabel = undefined
    persistVersions()
    return true
  }

  /**
   * 清理旧版本（保留最近 N 个版本和里程碑版本）
   */
  function cleanupOldVersions(noteId: string): number {
    const noteVersions = getNoteVersions(noteId)
    if (noteVersions.length <= config.value.cleanupKeepRecent) return 0

    const keepRecent = config.value.cleanupKeepRecent
    const keepMilestones = config.value.cleanupKeepMilestones

    // 确定要保留的版本
    const toKeep = new Set<string>()

    // 保留最近 N 个版本
    const recent = noteVersions.slice(-keepRecent)
    for (const v of recent) {
      toKeep.add(v.id)
    }

    // 保留里程碑版本
    if (keepMilestones) {
      const milestones = noteVersions.filter(v => v.isMilestone)
      for (const v of milestones) {
        toKeep.add(v.id)
      }
    }

    // 删除不需要保留的版本
    let removed = 0
    versions.value = versions.value.filter(v => {
      if (v.noteId !== noteId) return true
      if (toKeep.has(v.id)) return true
      removed++
      return false
    })

    if (removed > 0) {
      persistVersions()
    }

    return removed
  }

  /**
   * 手动删除特定版本
   */
  function deleteVersion(versionId: string): boolean {
    const index = versions.value.findIndex(v => v.id === versionId)
    if (index === -1) return false
    versions.value.splice(index, 1)
    persistVersions()
    return true
  }

  /**
   * 删除笔记的所有版本
   */
  function deleteAllVersions(noteId: string): number {
    const before = versions.value.length
    versions.value = versions.value.filter(v => v.noteId !== noteId)
    const removed = before - versions.value.length
    if (removed > 0) {
      persistVersions()
    }
    return removed
  }

  /**
   * 生成版本差异文本（用于可视化展示）
   */
  function generateDiffText(
    noteId: string,
    versionId: string,
  ): { before: string; after: string; diffs: VersionDiff[] } | null {
    const version = getVersionById(versionId)
    if (!version) return null

    const noteVersions = getNoteVersions(noteId)
    const targetIndex = noteVersions.findIndex(v => v.id === versionId)
    if (targetIndex < 0) return null

    if (targetIndex === 0) {
      return {
        before: '',
        after: version.content,
        diffs: [{
          type: 'added',
          field: 'content',
          oldValue: '',
          newValue: version.content,
        }],
      }
    }

    const prevVersion = noteVersions[targetIndex - 1]
    const diffs = computeDiff(prevVersion, version)

    return {
      before: prevVersion.content,
      after: version.content,
      diffs,
    }
  }

  /**
   * 生成差异 HTML（用于可视化展示）
   */
  function generateDiffHtml(
    noteId: string,
    versionId: string,
  ): string | null {
    const diffData = generateDiffText(noteId, versionId)
    if (!diffData) return null

    const lines: string[] = []
    lines.push('<div class="version-diff">')

    for (const diff of diffData.diffs) {
      switch (diff.type) {
        case 'added':
          lines.push(`<div class="diff-added"><span class="diff-marker">+</span> ${escapeHtmlForDiff(diff.newValue)}</div>`)
          break
        case 'removed':
          lines.push(`<div class="diff-removed"><span class="diff-marker">-</span> ${escapeHtmlForDiff(diff.oldValue)}</div>`)
          break
        case 'modified':
          lines.push(`<div class="diff-modified"><span class="diff-marker">~</span> ${escapeHtmlForDiff(diff.oldValue)} → ${escapeHtmlForDiff(diff.newValue)}</div>`)
          break
        case 'unchanged':
          lines.push(`<div class="diff-unchanged">  ${escapeHtmlForDiff(diff.oldValue)}</div>`)
          break
      }
    }

    lines.push('</div>')
    return lines.join('\n')
  }

  /**
   * 获取版本统计
   */
  const versionStats = computed<VersionStats>(() => {
    const noteIds = new Set<string>()
    let totalChars = 0
    let milestoneCount = 0
    let oldestAt: string | undefined
    let newestAt: string | undefined

    for (const v of versions.value) {
      noteIds.add(v.noteId)
      totalChars += v.content.length
      if (v.isMilestone) milestoneCount++

      if (!oldestAt || v.createdAt < oldestAt) oldestAt = v.createdAt
      if (!newestAt || v.createdAt > newestAt) newestAt = v.createdAt
    }

    return {
      totalVersions: versions.value.length,
      notesWithVersions: noteIds.size,
      totalChars,
      oldestVersionAt: oldestAt,
      newestVersionAt: newestAt,
      avgVersionsPerNote: noteIds.size > 0
        ? Math.round((versions.value.length / noteIds.size) * 10) / 10
        : 0,
      milestoneCount,
    }
  })

  /**
   * 更新配置
   */
  function updateConfig(updates: Partial<VersionHistoryConfig>): void {
    config.value = { ...config.value, ...updates }
    persistConfig()
  }

  /**
   * 重置配置为默认值
   */
  function resetConfig(): void {
    config.value = { ...DEFAULT_CONFIG }
    persistConfig()
  }

  /**
   * 自动保存版本（编辑时调用）
   */
  function autoSaveVersion(note: Note): NoteVersion | null {
    return saveVersion(note, { autoSaved: true })
  }

  /**
   * 手动保存版本
   */
  function manualSaveVersion(
    note: Note,
    description?: string,
  ): NoteVersion | null {
    return saveVersion(note, { autoSaved: false, description })
  }

  /**
   * 保存里程碑版本
   */
  function saveMilestone(
    note: Note,
    label: string,
  ): NoteVersion | null {
    return saveVersion(note, {
      autoSaved: false,
      isMilestone: true,
      milestoneLabel: label,
    })
  }

  return {
    // 状态
    versions,
    versionStats,
    config,

    // 版本操作
    saveVersion,
    autoSaveVersion,
    manualSaveVersion,
    saveMilestone,
    getVersions,
    getVersionCount,
    getLatestVersion,
    getVersionById,
    restoreVersion,

    // 差异分析
    compareVersions,
    getDiff,
    generateDiffText,
    generateDiffHtml,

    // 里程碑
    getMilestones,
    markAsMilestone,
    unmarkMilestone,

    // 清理
    cleanupOldVersions,
    deleteVersion,
    deleteAllVersions,

    // 配置
    updateConfig,
    resetConfig,
  }
}

// ---- 内部函数（纯函数，不依赖状态） ----

/** 加载版本记录 */
function loadVersions(): NoteVersion[] {
  try {
    return storage.getKV<NoteVersion[]>(VERSION_STORAGE_KEY, [])
  } catch {
    return []
  }
}

/** 加载配置 */
function loadConfig(): VersionHistoryConfig {
  try {
    const saved = storage.getKV<Partial<VersionHistoryConfig>>(VERSION_CONFIG_KEY, {})
    return { ...DEFAULT_CONFIG, ...saved }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** 计算两个内容之间的变更大小 */
function computeChangeSize(oldContent: string, newContent: string): number {
  return Math.abs(oldContent.length - newContent.length) + editDistance(oldContent, newContent)
}

/** 比较两个数组是否相等 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, idx) => val === sortedB[idx])
}

/** 计算两个版本之间的差异 */
function computeDiff(
  versionA: NoteVersion,
  versionB: NoteVersion,
): VersionDiff[] {
  const diffs: VersionDiff[] = []

  // 标题差异
  if (versionA.title !== versionB.title) {
    diffs.push({
      type: 'modified',
      field: 'title',
      oldValue: versionA.title,
      newValue: versionB.title,
    })
  }

  // 标签差异
  const tagsDiff = computeTagsDiff(versionA.tags, versionB.tags)
  diffs.push(...tagsDiff)

  // 内容差异（逐行对比）
  const contentDiffs = computeContentDiff(versionA.content, versionB.content)
  diffs.push(...contentDiffs)

  return diffs
}

/** 计算标签差异 */
function computeTagsDiff(oldTags: string[], newTags: string[]): VersionDiff[] {
  const diffs: VersionDiff[] = []
  const oldSet = new Set(oldTags)
  const newSet = new Set(newTags)

  // 新增的标签
  for (const tag of newTags) {
    if (!oldSet.has(tag)) {
      diffs.push({
        type: 'added',
        field: 'tags',
        oldValue: '',
        newValue: tag,
      })
    }
  }

  // 删除的标签
  for (const tag of oldTags) {
    if (!newSet.has(tag)) {
      diffs.push({
        type: 'removed',
        field: 'tags',
        oldValue: tag,
        newValue: '',
      })
    }
  }

  return diffs
}

/** 计算内容差异（使用 LCS 算法） */
function computeContentDiff(oldContent: string, newContent: string): VersionDiff[] {
  const diffs: VersionDiff[] = []

  if (oldContent === newContent) {
    if (oldContent) {
      diffs.push({
        type: 'unchanged',
        field: 'content',
        oldValue: oldContent,
        newValue: newContent,
      })
    }
    return diffs
  }

  if (!oldContent) {
    diffs.push({
      type: 'added',
      field: 'content',
      oldValue: '',
      newValue: newContent,
    })
    return diffs
  }

  if (!newContent) {
    diffs.push({
      type: 'removed',
      field: 'content',
      oldValue: oldContent,
      newValue: '',
    })
    return diffs
  }

  // 逐行对比
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  const lcs = computeLCS(oldLines, newLines)

  let oi = 0
  let ni = 0
  let li = 0

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length &&
        oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      // 未变更行
      diffs.push({
        type: 'unchanged',
        field: 'content',
        oldValue: oldLines[oi],
        newValue: newLines[ni],
        offset: oi,
        length: oldLines[oi].length,
      })
      oi++
      ni++
      li++
    } else if (li < lcs.length && oi < oldLines.length && oldLines[oi] !== lcs[li]) {
      // 删除的行
      if (ni < newLines.length && newLines[ni] !== lcs[li]) {
        // 修改的行
        diffs.push({
          type: 'modified',
          field: 'content',
          oldValue: oldLines[oi],
          newValue: newLines[ni],
          offset: oi,
          length: Math.max(oldLines[oi].length, newLines[ni].length),
        })
        oi++
        ni++
      } else {
        diffs.push({
          type: 'removed',
          field: 'content',
          oldValue: oldLines[oi],
          newValue: '',
          offset: oi,
          length: oldLines[oi].length,
        })
        oi++
      }
    } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
      // 新增的行
      diffs.push({
        type: 'added',
        field: 'content',
        oldValue: '',
        newValue: newLines[ni],
        offset: ni,
        length: newLines[ni].length,
      })
      ni++
    } else {
      break
    }
  }

  return diffs
}

/** 计算最长公共子序列（LCS） */
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length

  // 使用优化的 LCS 算法（限制在合理大小内）
  if (m * n > 1000000) {
    // 回退到简单的逐行匹配
    const result: string[] = []
    for (const line of a) {
      if (b.includes(line)) result.push(line)
    }
    return result
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 回溯
  const result: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

/** 计算内容相似度 */
function computeSimilarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0

  const maxLen = Math.max(a.length, b.length)
  const distance = editDistance(a, b)
  return Math.round((1 - distance / maxLen) * 1000) / 1000
}

/** 计算变更行数 */
function countChangedLines(diffs: VersionDiff[]): number {
  return diffs.filter(d => d.type !== 'unchanged' && d.field === 'content').length
}

/** 编辑距离（Levenshtein） */
function editDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length

  if (m === 0) return n
  if (n === 0) return m
  if (Math.abs(m - n) > 100) return Math.max(m, n) // 快速剪枝

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/** 转义 HTML（用于差异展示） */
function escapeHtmlForDiff(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}