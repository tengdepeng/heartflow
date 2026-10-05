// ============================================================
// 阅览殿 · 类型定义
// 阅读追踪、书籍管理、摘录、阅读目标
// ============================================================

/** 阅读状态 */
export type ReadingStatus = 'want_to_read' | 'reading' | 'finished' | 'abandoned' | 'rereading'

/** 书籍 */
export interface Book {
  id: string
  title: string
  author: string
  cover?: string
  /** 总页数 */
  totalPages: number
  /** 当前页数 */
  currentPage: number
  /** 续读位置（按书正文的段落索引；用于「合上书下次接着读」） */
  lastPosition?: number
  /** 段内句块偏移（该段第几句，0 基；读↔听续接 INCR-526 的句块级精度，缺省视为 0） */
  lastChunkOffset?: number
  /** 阅读状态 */
  status: ReadingStatus
  /** 评分 1-5 */
  rating?: number
  /** 开始阅读日期 */
  startDate?: string
  /** 完成阅读日期 */
  finishDate?: string
  /** 分类标签 */
  tags: string[]
  /** 笔记/摘录 */
  quotes: BookQuote[]
  /** 个人书评 */
  review?: string
  /** 阅读耗时（分钟） */
  totalReadingTime: number
}

/** 摘录 */
export interface BookQuote {
  id: string
  text: string
  page?: number
  chapter?: string
  note?: string
  timestamp: string
}

/** 阅读会话 */
export interface ReadingSession {
  id: string
  bookId: string
  /** 开始页数 */
  startPage: number
  /** 结束页数 */
  endPage: number
  /** 阅读时长（分钟） */
  duration: number
  /** 阅读笔记 */
  note?: string
  date: string
  timestamp: string
}

/** 阅读目标 */
export interface ReadingGoal {
  /** 年度目标（本） */
  yearlyTarget: number
  /** 当前已完成 */
  yearlyCompleted: number
  /** 每日阅读目标（分钟） */
  dailyTarget: number
  /** 当前连续阅读天数 */
  streak: number
}

/** 阅读状态元数据 */
export const READING_STATUS_META: Record<ReadingStatus, { label: string; icon: string; color: string }> = {
  want_to_read: { label: '想读', icon: '📌', color: '#f39c12' },
  reading: { label: '在读', icon: '📖', color: '#3498db' },
  finished: { label: '已读', icon: '✅', color: '#2ecc71' },
  abandoned: { label: '搁置', icon: '📚', color: '#95a5a6' },
  rereading: { label: '重读', icon: '🔄', color: '#9b59b6' },
}

export const READING_STORAGE_KEYS = {
  books: 'hf:reading:books',
  sessions: 'hf:reading:sessions',
  goal: 'hf:reading:goal',
} as const