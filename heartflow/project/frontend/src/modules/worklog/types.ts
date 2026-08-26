// ============================================================
// 更漏 · 工作日志 · 类型定义
// 更漏是工作相关房间的入口枢纽
// ============================================================

/** 日志条目类型 */
export type LogEntryType = 'reflection' | 'plan' | 'journal' | 'insight' | 'review' | 'milestone'

/** 情绪基调 */
export type MoodTone = 'energetic' | 'calm' | 'neutral' | 'tired' | 'frustrated' | 'excited'

/** 日志条目 */
export interface LogEntry {
  id: string
  type: LogEntryType
  title: string
  content: string
  mood?: MoodTone
  tags: string[]
  /** 关联的专注会话 ID */
  sessionIds: string[]
  /** 关联的房间 ID */
  roomId?: string
  createdAt: string
  updatedAt: string
}

/** 日摘要 */
export interface WorklogDailySummary {
  date: string
  entryCount: number
  totalFocusMinutes: number
  dominantMood?: MoodTone
  keyTags: string[]
  highlightEntry?: string
}

/** 周摘要 */
export interface WeeklySummary {
  weekStart: string
  weekEnd: string
  entryCount: number
  dailySummaries: WorklogDailySummary[]
  totalFocusMinutes: number
  moodDistribution: Record<MoodTone, number>
  topTags: string[]
  achievements: string[]
  reflection: string
}

/** 日志统计 */
export interface WorklogStats {
  totalEntries: number
  totalFocusMinutes: number
  streakDays: number
  mostProductiveDay: string
  mostProductiveHour: number
  moodTrend: { date: string; mood: MoodTone }[]
  tagDistribution: { tag: string; count: number }[]
  typeDistribution: { type: LogEntryType; count: number }[]
}

// ---- 元数据 ----

/** 日志类型元数据 */
export const LOG_TYPE_META: Record<LogEntryType, { label: string; icon: string; color: string; desc: string }> = {
  reflection: { label: '反思', icon: '🪞', color: '#6b9fc4', desc: '对工作过程的回顾与思考' },
  plan: { label: '计划', icon: '📋', color: '#8a9a7a', desc: '工作安排与目标规划' },
  journal: { label: '日志', icon: '📝', color: '#f0c040', desc: '日常工作记录' },
  insight: { label: '洞察', icon: '💡', color: '#d98c7a', desc: '灵光一现的发现与感悟' },
  review: { label: '复盘', icon: '🔍', color: '#cf8b6b', desc: '阶段性回顾与分析' },
  milestone: { label: '里程碑', icon: '🏆', color: '#a07c8c', desc: '重要节点与成就记录' },
}

/** 情绪基调元数据 */
export const MOOD_TONE_META: Record<MoodTone, { label: string; icon: string; color: string }> = {
  energetic: { label: '精力充沛', icon: '⚡', color: '#34d399' },
  calm: { label: '平静专注', icon: '🧘', color: '#6b9fc4' },
  neutral: { label: '平常', icon: '😐', color: '#7a7f8c' },
  tired: { label: '疲惫', icon: '😴', color: '#f0c040' },
  frustrated: { label: '沮丧', icon: '😤', color: '#ef4444' },
  excited: { label: '兴奋', icon: '🎉', color: '#d98c7a' },
}

/** 存储键 */
export const WORKLOG_STORAGE_KEYS = {
  ENTRIES: 'worklog:entries',
  WEEKLY_SUMMARIES: 'worklog:weekly-summaries',
} as const