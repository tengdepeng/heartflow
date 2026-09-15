// ============================================================
// 阅览殿 · barrel export
// ============================================================

export { useReadingHall } from './hall'
export { useReadingChallenges, useBookReviews, useReadingNotes, useReadingDashboard, CHALLENGE_TYPE_META, NOTE_TYPE_META, READING_ADVANCED_STORAGE_KEYS } from './challenges'
export { READING_STATUS_META, READING_STORAGE_KEYS } from './types'
export type { ReadingStatus, Book, BookQuote, ReadingSession, ReadingGoal } from './types'
export type { ReadingChallenge, ChallengeType, BookReview, ReadingNote, ReadingStats } from './challenges'

// ---- 阅读洞察引擎 ----
export { useReadingInsights } from './reading-insights'
export type {
  ReadingAnalytics,
  KnowledgeNode,
  ReadingPlan,
  MonthlyReadingGoal,
} from './reading-insights'

// ---- 阅读速度追踪器 ----
export { useReadingSpeed } from './reading-speed'
export type {
  ReadingSpeedRecord,
  SpeedStats,
  SpeedTrend,
  SpeedTrendPoint,
  SpeedGoal,
  SpeedRecommendation,
} from './reading-speed'

// ---- 书籍推荐引擎 ----
export { useBookRecommendations } from './book-recommendations'
export type {
  BookRecommendation,
  RecommendationSource,
  RecommendationReason,
  ReadingPreference,
} from './book-recommendations'

// ---- 阅读习惯分析 ----
export { useReadingHabits } from './reading-habits'
export {
  HABIT_TYPE_META,
} from './reading-habits'
export type {
  ReadingHabit,
  HabitType,
  HabitPattern,
  ReadingSessionPattern,
  HabitInsight,
} from './reading-habits'

// ---- 间隔重复（阅览殿 · 蓝图19） ----
export { useReadingSrs, SRS_GRADE_LABELS } from './srs'
export type { SrsGrade, SrsReviewItem } from './srs'

// ---- 阅读内容数据层（正文 + 摘录） ----
export { useReading } from './reading-content'
export type { Excerpt } from './reading-content'

// ---- 古典竖排阅读（ClassicalVerticalReader） ----
export {
  useClassicalVertical,
  buildVerticalLayout,
  organizeAnnotations,
  defaultVerticalMetrics,
  PUNCTUATION_MODES,
  PUNCTUATION_MODE_META,
} from './classical-vertical'
export type {
  PunctuationMode,
  ClassicalView,
  ClassicalBook,
  ClassicalAnnotation,
  VerticalColumn,
  VerticalLayout,
  VerticalMetrics,
  AnnotationGroup,
} from './classical-vertical'