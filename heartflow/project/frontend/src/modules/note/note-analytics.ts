// ============================================================
// 思绪书房 · 笔记统计分析引擎（P16-8）
// 笔记健康度、写作统计、标签分析、生命周期、内容质量
// ============================================================

import { getLocalMonthKey, getLocalDateKey } from '../../utils/time'
import type { Note } from '../../types'
import type { KnowledgeRing } from './knowledge-ring'
import { isForgotten, needsReview } from './knowledge-ring'

// ---- 统计类型 ----

/** 笔记健康度评分 */
export interface NoteHealthScore {
  /** 笔记 ID */
  noteId: string
  /** 标题 */
  title: string
  /** 综合健康分 0-100 */
  overallScore: number
  /** 内容充实度 0-100 */
  contentRichness: number
  /** 更新活跃度 0-100 */
  updateActivity: number
  /** 标签组织度 0-100 */
  tagOrganization: number
  /** 回顾健康度 0-100（基于知识年轮） */
  reviewHealth: number
  /** 评级 */
  grade: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  /** 改进建议 */
  suggestions: string[]
}

/** 写作统计 */
export interface WritingStats {
  /** 总笔记数 */
  totalNotes: number
  /** 总字数 */
  totalChars: number
  /** 总单词数（英文） */
  totalWords: number
  /** 平均每篇字数 */
  avgCharsPerNote: number
  /** 最长笔记字数 */
  maxCharsPerNote: number
  /** 最短笔记字数 */
  minCharsPerNote: number
  /** 中位数字数 */
  medianCharsPerNote: number
  /** 内容为空的比例 */
  emptyNoteRatio: number
  /** 按字数分布 */
  lengthDistribution: LengthBucket[]
}

/** 字数分布桶 */
export interface LengthBucket {
  /** 范围标签 */
  label: string
  /** 最小字数 */
  min: number
  /** 最大字数 */
  max: number
  /** 该范围内的笔记数 */
  count: number
  /** 占比 */
  ratio: number
}

/** 时间趋势统计 */
export interface TimeTrendStats {
  /** 每日统计 */
  daily: DailyStats[]
  /** 每周统计 */
  weekly: WeeklyStats[]
  /** 每月统计 */
  monthly: MonthlyStats[]
}

/** 每日统计 */
export interface DailyStats {
  date: string
  created: number
  updated: number
  totalChars: number
  avgChars: number
}

/** 每周统计 */
export interface WeeklyStats {
  /** ISO 周标识 */
  week: string
  created: number
  updated: number
  activeDays: number
  totalChars: number
}

/** 每月统计 */
export interface MonthlyStats {
  /** 月份标识 */
  month: string
  created: number
  updated: number
  totalChars: number
  avgCharsPerNote: number
  activeDays: number
}

/** 标签分析 */
export interface TagAnalysis {
  /** 标签频率排行 */
  topTags: TagFrequency[]
  /** 标签共现矩阵 */
  cooccurrence: TagCooccurrence[]
  /** 标签聚类 */
  clusters: TagCluster[]
  /** 平均每篇笔记标签数 */
  avgTagsPerNote: number
  /** 无标签笔记数 */
  untaggedCount: number
  /** 无标签笔记占比 */
  untaggedRatio: number
}

/** 标签频率 */
export interface TagFrequency {
  tag: string
  count: number
  ratio: number
}

/** 标签共现 */
export interface TagCooccurrence {
  tagA: string
  tagB: string
  /** 同时出现的笔记数 */
  count: number
  /** Jaccard 相似度 */
  jaccard: number
}

/** 标签聚类 */
export interface TagCluster {
  /** 聚类标签 */
  label: string
  /** 包含的标签 */
  tags: string[]
  /** 聚类大小 */
  size: number
}

/** 笔记生命周期分析 */
export interface LifecycleAnalysis {
  /** 总创建数 */
  totalCreated: number
  /** 活跃笔记数 */
  activeCount: number
  /** 已归档数 */
  archivedCount: number
  /** 已删除数 */
  deletedCount: number
  /** 归档率 */
  archiveRatio: number
  /** 删除率 */
  deleteRatio: number
  /** 平均创建到归档时间（天） */
  avgDaysToArchive: number
  /** 平均创建到删除时间（天） */
  avgDaysToDelete: number
  /** 创建趋势（按月） */
  creationTrend: { month: string; count: number }[]
}

/** 内容质量分析 */
export interface ContentQualityAnalysis {
  /** 唯一词比例 */
  uniqueWordRatio: number
  /** 标题平均长度 */
  avgTitleLength: number
  /** 内容平均段落数 */
  avgParagraphs: number
  /** 含链接的笔记比例 */
  linkRatio: number
  /** 含代码块的笔记比例 */
  codeBlockRatio: number
  /** 含列表的笔记比例 */
  listRatio: number
  /** 内容重复度（相近笔记比例） */
  duplicationRatio: number
}

/** 综合分析报告 */
export interface NoteAnalyticsReport {
  /** 报告生成时间 */
  generatedAt: string
  /** 写作统计 */
  writing: WritingStats
  /** 时间趋势 */
  trends: TimeTrendStats
  /** 标签分析 */
  tags: TagAnalysis
  /** 生命周期 */
  lifecycle: LifecycleAnalysis
  /** 内容质量 */
  quality: ContentQualityAnalysis
  /** 健康度评分 */
  healthScores: NoteHealthScore[]
  /** 全局健康度摘要 */
  healthSummary: HealthSummary
}

/** 健康度摘要 */
export interface HealthSummary {
  /** 平均健康分 */
  avgScore: number
  /** 优秀笔记数 */
  excellentCount: number
  /** 良好笔记数 */
  goodCount: number
  /** 一般笔记数 */
  fairCount: number
  /** 较差笔记数 */
  poorCount: number
  /** 严重笔记数 */
  criticalCount: number
  /** 需要关注的笔记 ID */
  attentionNeeded: string[]
}

// ============================================================
// 统计分析引擎
// ============================================================

export function useNoteAnalytics() {
  /**
   * 生成完整的笔记分析报告
   */
  function generateReport(
    notes: Note[],
    rings?: KnowledgeRing[],
  ): NoteAnalyticsReport {
    const activeNotes = notes.filter(n => !n.deletedAt)

    return {
      generatedAt: new Date().toISOString(),
      writing: computeWritingStats(activeNotes),
      trends: computeTimeTrends(notes),
      tags: computeTagAnalysis(activeNotes),
      lifecycle: computeLifecycle(notes),
      quality: computeContentQuality(activeNotes),
      healthScores: computeHealthScores(activeNotes, rings || []),
      healthSummary: computeHealthSummary(activeNotes, rings || []),
    }
  }

  /**
   * 计算写作统计
   */
  function computeWritingStats(notes: Note[]): WritingStats {
    const activeNotes = notes.filter(n => !n.deletedAt)
    const charCounts = activeNotes
      .map(n => n.content.length)
      .sort((a, b) => a - b)

    const totalChars = charCounts.reduce((s, c) => s + c, 0)
    const totalWords = activeNotes.reduce((s, n) =>
      s + (n.content.match(/[a-zA-Z]+/g)?.length || 0), 0)

    const emptyCount = charCounts.filter(c => c === 0).length
    const median = charCounts.length > 0
      ? charCounts[Math.floor(charCounts.length / 2)]
      : 0

    // 字数分布桶
    const buckets: LengthBucket[] = [
      { label: '空', min: 0, max: 0, count: 0, ratio: 0 },
      { label: '1-100字', min: 1, max: 100, count: 0, ratio: 0 },
      { label: '101-500字', min: 101, max: 500, count: 0, ratio: 0 },
      { label: '501-1000字', min: 501, max: 1000, count: 0, ratio: 0 },
      { label: '1001-3000字', min: 1001, max: 3000, count: 0, ratio: 0 },
      { label: '3001-5000字', min: 3001, max: 5000, count: 0, ratio: 0 },
      { label: '5000+字', min: 5001, max: Infinity, count: 0, ratio: 0 },
    ]

    for (const n of activeNotes) {
      for (const bucket of buckets) {
        if (n.content.length >= bucket.min && n.content.length <= bucket.max) {
          bucket.count++
          break
        }
      }
    }

    const total = activeNotes.length || 1
    for (const bucket of buckets) {
      bucket.ratio = Math.round((bucket.count / total) * 1000) / 1000
    }

    return {
      totalNotes: activeNotes.length,
      totalChars,
      totalWords,
      avgCharsPerNote: activeNotes.length > 0 ? Math.round(totalChars / activeNotes.length) : 0,
      maxCharsPerNote: charCounts.length > 0 ? charCounts[charCounts.length - 1] : 0,
      minCharsPerNote: charCounts.length > 0 ? charCounts[0] : 0,
      medianCharsPerNote: median,
      emptyNoteRatio: activeNotes.length > 0
        ? Math.round((emptyCount / activeNotes.length) * 1000) / 1000
        : 0,
      lengthDistribution: buckets,
    }
  }

  /**
   * 计算时间趋势
   */
  function computeTimeTrends(notes: Note[]): TimeTrendStats {
    const allNotes = notes.filter(n => !n.deletedAt)

    // 每日统计（最近 30 天）
    const dailyMap = new Map<string, { created: number; updated: number; chars: number }>()
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = getLocalDateKey(d)
      dailyMap.set(key, { created: 0, updated: 0, chars: 0 })
    }

    for (const note of allNotes) {
      const createdDate = getLocalDateKey(new Date(note.createdAt))
      const updatedDate = getLocalDateKey(new Date(note.updatedAt))

      if (dailyMap.has(createdDate)) {
        dailyMap.get(createdDate)!.created++
        dailyMap.get(createdDate)!.chars += note.content.length
      }

      if (dailyMap.has(updatedDate) && updatedDate !== createdDate) {
        dailyMap.get(updatedDate)!.updated++
      }
    }

    const daily: DailyStats[] = []
    for (const [date, stats] of dailyMap) {
      const totalCreated = stats.created
      daily.push({
        date,
        created: stats.created,
        updated: stats.updated,
        totalChars: stats.chars,
        avgChars: totalCreated > 0 ? Math.round(stats.chars / totalCreated) : 0,
      })
    }
    daily.sort((a, b) => a.date.localeCompare(b.date))

    // 每周统计（最近 12 周）
    const weeklyMap = new Map<string, { created: number; updated: number; days: Set<string>; chars: number }>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const weekKey = getISOWeekKey(d)
      weeklyMap.set(weekKey, { created: 0, updated: 0, days: new Set(), chars: 0 })
    }

    for (const note of allNotes) {
      const createdDate = new Date(note.createdAt)
      const weekKey = getISOWeekKey(createdDate)
      if (weeklyMap.has(weekKey)) {
        weeklyMap.get(weekKey)!.created++
        weeklyMap.get(weekKey)!.days.add(getLocalDateKey(new Date(note.createdAt)))
        weeklyMap.get(weekKey)!.chars += note.content.length
      }
    }

    const weekly: WeeklyStats[] = []
    for (const [week, stats] of weeklyMap) {
      weekly.push({
        week,
        created: stats.created,
        updated: stats.updated,
        activeDays: stats.days.size,
        totalChars: stats.chars,
      })
    }
    weekly.sort((a, b) => a.week.localeCompare(b.week))

    // 每月统计（最近 12 个月）
    // 注意：必须用 new Date(year, month - i, 1) 把日归一为 1 号，
    // 否则保留当前日(如 29) 跨 2 月时 setMonth 会把「2 月 29」滚成「3 月 1」，
    // 导致 Feb 桶 key 与真实 3 月桶撞键 → 仅 11 个不同月份（p16-note 测试 12 vs 11 红灯根因）。
    const monthlyMap = new Map<string, { created: number; updated: number; days: Set<string>; chars: number }>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = getLocalMonthKey(d)
      monthlyMap.set(monthKey, { created: 0, updated: 0, days: new Set(), chars: 0 })
    }

    for (const note of allNotes) {
      const monthKey = getLocalMonthKey(note.createdAt)
      if (monthlyMap.has(monthKey)) {
        monthlyMap.get(monthKey)!.created++
        monthlyMap.get(monthKey)!.days.add(getLocalDateKey(new Date(note.createdAt)))
        monthlyMap.get(monthKey)!.chars += note.content.length
      }
    }

    const monthly: MonthlyStats[] = []
    for (const [month, stats] of monthlyMap) {
      monthly.push({
        month,
        created: stats.created,
        updated: stats.updated,
        totalChars: stats.chars,
        avgCharsPerNote: stats.created > 0 ? Math.round(stats.chars / stats.created) : 0,
        activeDays: stats.days.size,
      })
    }
    monthly.sort((a, b) => a.month.localeCompare(b.month))

    return { daily, weekly, monthly }
  }

  /**
   * 计算标签分析
   */
  function computeTagAnalysis(notes: Note[]): TagAnalysis {
    const activeNotes = notes.filter(n => !n.deletedAt)
    const tagCounts = new Map<string, number>()
    let untaggedCount = 0
    let totalTagCount = 0

    for (const note of activeNotes) {
      if (note.tags.length === 0) {
        untaggedCount++
      }
      totalTagCount += note.tags.length
      for (const tag of note.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }

    // 标签频率排行
    const topTags: TagFrequency[] = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({
        tag,
        count,
        ratio: activeNotes.length > 0
          ? Math.round((count / activeNotes.length) * 1000) / 1000
          : 0,
      }))

    // 标签共现矩阵
    const cooccurrence: TagCooccurrence[] = []
    const tagList = [...tagCounts.keys()]
    const tagIndex = new Map(tagList.map((t, i) => [t, i]))

    // 构建共现矩阵
    const cooccurMatrix: number[][] = Array.from(
      { length: tagList.length },
      () => Array(tagList.length).fill(0),
    )

    for (const note of activeNotes) {
      for (let i = 0; i < note.tags.length; i++) {
        for (let j = i + 1; j < note.tags.length; j++) {
          const idxA = tagIndex.get(note.tags[i])!
          const idxB = tagIndex.get(note.tags[j])!
          cooccurMatrix[idxA][idxB]++
          cooccurMatrix[idxB][idxA]++
        }
      }
    }

    // 提取 top 共现对
    for (let i = 0; i < tagList.length; i++) {
      for (let j = i + 1; j < tagList.length; j++) {
        if (cooccurMatrix[i][j] > 0) {
          const countA = tagCounts.get(tagList[i]) || 0
          const countB = tagCounts.get(tagList[j]) || 0
          const union = countA + countB - cooccurMatrix[i][j]
          cooccurrence.push({
            tagA: tagList[i],
            tagB: tagList[j],
            count: cooccurMatrix[i][j],
            jaccard: union > 0
              ? Math.round((cooccurMatrix[i][j] / union) * 1000) / 1000
              : 0,
          })
        }
      }
    }

    cooccurrence.sort((a, b) => b.count - a.count)
    const topCooccurrence = cooccurrence.slice(0, 30)

    // 标签聚类（基于连通分量）
    const clusters = clusterTags(tagList, topCooccurrence)

    return {
      topTags,
      cooccurrence: topCooccurrence,
      clusters,
      avgTagsPerNote: activeNotes.length > 0
        ? Math.round((totalTagCount / activeNotes.length) * 100) / 100
        : 0,
      untaggedCount,
      untaggedRatio: activeNotes.length > 0
        ? Math.round((untaggedCount / activeNotes.length) * 1000) / 1000
        : 0,
    }
  }

  /**
   * 计算生命周期分析
   */
  function computeLifecycle(notes: Note[]): LifecycleAnalysis {
    const allNotes = notes
    const activeNotes = allNotes.filter(n => !n.deletedAt && !n.archived)
    const archivedNotes = allNotes.filter(n => n.archived && !n.deletedAt)
    const deletedNotes = allNotes.filter(n => n.deletedAt)

    const total = allNotes.length || 1

    // 平均归档时间
    let totalDaysToArchive = 0
    let archiveCount = 0
    for (const note of archivedNotes) {
      const created = new Date(note.createdAt)
      const updated = new Date(note.updatedAt)
      totalDaysToArchive += Math.floor((updated.getTime() - created.getTime()) / 86400000)
      archiveCount++
    }

    // 平均删除时间
    let totalDaysToDelete = 0
    let deleteCount = 0
    for (const note of deletedNotes) {
      if (note.deletedAt) {
        const created = new Date(note.createdAt)
        const deleted = new Date(note.deletedAt)
        totalDaysToDelete += Math.floor((deleted.getTime() - created.getTime()) / 86400000)
        deleteCount++
      }
    }

    // 创建趋势（按月）
    const creationMap = new Map<string, number>()
    for (const note of allNotes) {
      const month = getLocalMonthKey(note.createdAt)
      creationMap.set(month, (creationMap.get(month) || 0) + 1)
    }

    const creationTrend = [...creationMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }))

    return {
      totalCreated: allNotes.length,
      activeCount: activeNotes.length,
      archivedCount: archivedNotes.length,
      deletedCount: deletedNotes.length,
      archiveRatio: Math.round((archivedNotes.length / total) * 1000) / 1000,
      deleteRatio: Math.round((deletedNotes.length / total) * 1000) / 1000,
      avgDaysToArchive: archiveCount > 0 ? Math.round(totalDaysToArchive / archiveCount) : 0,
      avgDaysToDelete: deleteCount > 0 ? Math.round(totalDaysToDelete / deleteCount) : 0,
      creationTrend,
    }
  }

  /**
   * 计算内容质量分析
   */
  function computeContentQuality(notes: Note[]): ContentQualityAnalysis {
    const activeNotes = notes.filter(n => !n.deletedAt && n.content.length > 0)
    if (activeNotes.length === 0) {
      return {
        uniqueWordRatio: 0,
        avgTitleLength: 0,
        avgParagraphs: 0,
        linkRatio: 0,
        codeBlockRatio: 0,
        listRatio: 0,
        duplicationRatio: 0,
      }
    }

    // 唯一词比例
    const allWords = new Set<string>()
    let totalWordCount = 0
    for (const note of activeNotes) {
      const words = note.content.toLowerCase().match(/[a-zA-Z\u4e00-\u9fff]+/g) || []
      for (const w of words) {
        allWords.add(w)
        totalWordCount++
      }
    }
    const uniqueWordRatio = totalWordCount > 0
      ? Math.round((allWords.size / totalWordCount) * 1000) / 1000
      : 0

    // 标题平均长度
    const avgTitleLength = Math.round(
      activeNotes.reduce((s, n) => s + n.title.length, 0) / activeNotes.length,
    )

    // 平均段落数
    const avgParagraphs = Math.round(
      activeNotes.reduce((s, n) => {
        const paras = n.content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
        return s + paras.length
      }, 0) / activeNotes.length * 100,
    ) / 100

    // 含链接的笔记比例
    const linkCount = activeNotes.filter(n =>
      /https?:\/\/[^\s]+/.test(n.content) || /\[.+\]\(.+\)/.test(n.content),
    ).length

    // 含代码块的笔记比例
    const codeBlockCount = activeNotes.filter(n =>
      /```[\s\S]*?```/.test(n.content) || /`[^`]+`/.test(n.content),
    ).length

    // 含列表的笔记比例
    const listCount = activeNotes.filter(n =>
      /^[\s]*[-*+]\s/.test(n.content) || /^[\s]*\d+\.\s/.test(n.content),
    )

    // 内容重复度（基于 Jaccard 相似度）
    let similarPairs = 0
    const totalPairs = (activeNotes.length * (activeNotes.length - 1)) / 2
    if (totalPairs > 0 && activeNotes.length <= 100) {
      for (let i = 0; i < activeNotes.length; i++) {
        for (let j = i + 1; j < activeNotes.length; j++) {
          const sim = contentSimilarity(activeNotes[i].content, activeNotes[j].content)
          if (sim > 0.6) similarPairs++
        }
      }
    }

    return {
      uniqueWordRatio,
      avgTitleLength,
      avgParagraphs,
      linkRatio: Math.round((linkCount / activeNotes.length) * 1000) / 1000,
      codeBlockRatio: Math.round((codeBlockCount / activeNotes.length) * 1000) / 1000,
      listRatio: Math.round((listCount.length / activeNotes.length) * 1000) / 1000,
      duplicationRatio: totalPairs > 0
        ? Math.round((similarPairs / totalPairs) * 1000) / 1000
        : 0,
    }
  }

  /**
   * 计算单个笔记的健康度评分
   */
  function computeNoteHealth(
    note: Note,
    ring?: KnowledgeRing,
  ): NoteHealthScore {
    let score = 0
    const suggestions: string[] = []

    // 1. 内容充实度（0-30）
    const contentLength = note.content.length
    let contentRichness: number
    if (contentLength === 0) {
      contentRichness = 0
      suggestions.push('笔记内容为空，建议补充内容')
    } else if (contentLength < 100) {
      contentRichness = 5
      suggestions.push('笔记内容过短，建议扩展至 100 字以上')
    } else if (contentLength < 500) {
      contentRichness = 15
    } else if (contentLength < 2000) {
      contentRichness = 22
    } else {
      contentRichness = 30
    }
    score += contentRichness

    // 2. 更新活跃度（0-20）
    const now = new Date()
    const updatedAt = new Date(note.updatedAt)
    const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / 86400000)
    let updateActivity: number
    if (daysSinceUpdate <= 1) {
      updateActivity = 20
    } else if (daysSinceUpdate <= 7) {
      updateActivity = 16
    } else if (daysSinceUpdate <= 30) {
      updateActivity = 12
    } else if (daysSinceUpdate <= 90) {
      updateActivity = 8
    } else if (daysSinceUpdate <= 180) {
      updateActivity = 4
      suggestions.push('笔记超过 3 个月未更新，建议回顾')
    } else {
      updateActivity = 0
      suggestions.push('笔记超过半年未更新，可能已过时')
    }
    score += updateActivity

    // 3. 标签组织度（0-20）
    const tagCount = note.tags.length
    let tagOrganization: number
    if (tagCount === 0) {
      tagOrganization = 0
      suggestions.push('笔记缺少标签，建议添加标签以便检索')
    } else if (tagCount === 1) {
      tagOrganization = 8
      suggestions.push('建议添加更多标签以丰富分类')
    } else if (tagCount <= 3) {
      tagOrganization = 15
    } else if (tagCount <= 5) {
      tagOrganization = 20
    } else {
      tagOrganization = 18
    }
    score += tagOrganization

    // 4. 标题质量（0-10）
    let titleScore = 0
    if (note.title.trim().length === 0) {
      titleScore = 0
      suggestions.push('笔记缺少标题')
    } else if (note.title.length < 3) {
      titleScore = 3
      suggestions.push('标题过短，建议增加描述性标题')
    } else if (note.title.length < 10) {
      titleScore = 7
    } else {
      titleScore = 10
    }
    score += titleScore

    // 5. 回顾健康度（0-20）
    let reviewHealth = 20
    if (ring) {
      if (isForgotten(ring)) {
        reviewHealth = 0
        suggestions.push('知识年轮已遗忘，建议尽快回顾')
      } else if (needsReview(ring)) {
        reviewHealth = 10
        suggestions.push('知识年轮需要回顾')
      } else {
        const daysLeft = Math.floor(
          (new Date(ring.nextReviewAt).getTime() - now.getTime()) / 86400000,
        )
        if (daysLeft <= 1) {
          reviewHealth = 12
        } else if (daysLeft <= 3) {
          reviewHealth = 16
        } else {
          reviewHealth = 20
        }
      }
    } else {
      reviewHealth = 20 // 无年轮记录，默认满分
    }
    score += reviewHealth

    // 综合评分
    let grade: NoteHealthScore['grade']
    if (score >= 85) grade = 'excellent'
    else if (score >= 70) grade = 'good'
    else if (score >= 50) grade = 'fair'
    else if (score >= 30) grade = 'poor'
    else grade = 'critical'

    return {
      noteId: note.id,
      title: note.title || '无标题',
      overallScore: Math.round(score),
      contentRichness,
      updateActivity,
      tagOrganization,
      reviewHealth,
      grade,
      suggestions,
    }
  }

  /**
   * 批量计算健康度评分
   */
  function computeHealthScores(
    notes: Note[],
    rings: KnowledgeRing[],
  ): NoteHealthScore[] {
    const ringMap = new Map(rings.map(r => [r.noteId, r]))
    return notes
      .filter(n => !n.deletedAt)
      .map(n => computeNoteHealth(n, ringMap.get(n.id)))
      .sort((a, b) => a.overallScore - b.overallScore)
  }

  /**
   * 计算健康度摘要
   */
  function computeHealthSummary(
    notes: Note[],
    rings: KnowledgeRing[],
  ): HealthSummary {
    const scores = computeHealthScores(notes, rings)

    let excellentCount = 0
    let goodCount = 0
    let fairCount = 0
    let poorCount = 0
    let criticalCount = 0
    const attentionNeeded: string[] = []

    for (const s of scores) {
      switch (s.grade) {
        case 'excellent': excellentCount++; break
        case 'good': goodCount++; break
        case 'fair': fairCount++; break
        case 'poor': poorCount++; attentionNeeded.push(s.noteId); break
        case 'critical': criticalCount++; attentionNeeded.push(s.noteId); break
      }
    }

    return {
      avgScore: scores.length > 0
        ? Math.round(scores.reduce((s, sc) => s + sc.overallScore, 0) / scores.length)
        : 0,
      excellentCount,
      goodCount,
      fairCount,
      poorCount,
      criticalCount,
      attentionNeeded,
    }
  }

  return {
    generateReport,
    computeWritingStats,
    computeTimeTrends,
    computeTagAnalysis,
    computeLifecycle,
    computeContentQuality,
    computeNoteHealth,
    computeHealthScores,
    computeHealthSummary,
  }
}

// ---- 内部函数 ----

/** 获取 ISO 周标识 */
function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/** 标签聚类（基于连通分量） */
function clusterTags(
  tags: string[],
  cooccurrences: TagCooccurrence[],
): TagCluster[] {
  const adj = new Map<string, Set<string>>()
  for (const tag of tags) {
    adj.set(tag, new Set())
  }

  // 构建邻接表（Jaccard > 0.3 的视为连接）
  for (const co of cooccurrences) {
    if (co.jaccard > 0.3) {
      adj.get(co.tagA)?.add(co.tagB)
      adj.get(co.tagB)?.add(co.tagA)
    }
  }

  const visited = new Set<string>()
  const clusters: TagCluster[] = []

  for (const tag of tags) {
    if (!visited.has(tag) && adj.get(tag)!.size > 0) {
      const cluster: string[] = []
      const queue = [tag]
      visited.add(tag)

      while (queue.length > 0) {
        const current = queue.shift()!
        cluster.push(current)
        for (const neighbor of adj.get(current) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }

      if (cluster.length >= 2) {
        let clusterLabel = cluster[0]
        let maxLen = cluster[0].length
        for (const t of cluster) {
          if (t.length < maxLen) {
            clusterLabel = t
            maxLen = t.length
          }
        }
        clusters.push({ label: clusterLabel, tags: cluster, size: cluster.length })
      }
    }
  }

  return clusters.sort((a, b) => b.size - a.size)
}

/** 内容相似度（Jaccard） */
function contentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().match(/[a-zA-Z\u4e00-\u9fff]+/g) || [])
  const wordsB = new Set(b.toLowerCase().match(/[a-zA-Z\u4e00-\u9fff]+/g) || [])

  if (wordsA.size === 0 && wordsB.size === 0) return 0

  let intersection = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++
  }

  const union = wordsA.size + wordsB.size - intersection
  return union > 0 ? intersection / union : 0
}