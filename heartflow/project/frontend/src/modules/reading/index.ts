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

// ---- 摘录多色标记（INCR-477） ----
export {
  EXCERPT_MARK_COLORS,
  DEFAULT_EXCERPT_MARK,
  isExcerptMarkColor,
  excerptMarkColor,
  applyExcerptMark,
  markDistribution,
  filterExcerptsByMark,
} from './excerpt-mark'
export type { ExcerptMarkColor } from './excerpt-mark'

// ---- 按书正文存储（取代全局单字符串，支持多书 + 续读） ----
export {
  saveBookContent,
  getBookContent,
  removeBookContent,
  hasBookContent,
  BOOK_CONTENT_PREFIX,
} from './book-content'

// ---- 划线/摘录 回流思绪书房 ----
export { flowHighlightToStudy } from './highlight-flow'

// ---- 电子书本地解析（乙-2：epub/pdf/txt → 纯文本，不触云） ----
export { parseBookFile, stripHtmlToText, readFileAsText } from './book-import'
export type { ParsedBook } from './book-import'

// ---- 待读箱（乙-3：本地 content_snapshot + content_hash 去重，转正书架） ----
export { useReadingInbox, computeContentHash, addInboxItem, getInboxContent, removeInboxItem, markInboxRead, promoteToBook } from './inbox'
export type { InboxItem, InboxStatus } from './inbox'

// ---- 读书便签（轻量随手记，独立于 challenges 的书评笔记 useReadingNotes） ----
export { useReadingMemos } from './reading-memo'
export type { ReadingMemo } from './reading-memo'

// ---- 人生之书（路线甲：呼吸书 + 正/侧/横三维 + 8 维剖面） ----
export { useLifeBook, computeLifeBook, buildLifeBook, monthlySeries, tagBreakdown, breadthMetrics, clamp01 } from './life-book'
export type { LifeBook, LifeBookPoint, LifeBookSnapshot, LifeDimensions, LifeDimKey, BreathStyle } from './life-book'

// ---- 古典竖排阅读（ClassicalVerticalPanel 消费，影印对照控件并入 INCR-398） ----
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

// ---- 阅读日历 · 热力图（#38） ----
export { useReadingCalendar, dayLevel, aggregateByDay, buildMonthCalendar, summarizeYear } from './reading-calendar'
export type { DayReading, MonthCell, MonthCalendar, YearSummary } from './reading-calendar'

// ---- 年度阅读报告（#40） ----
export { useReadingReport, buildYearReport } from './reading-report'
export type { YearReport, MonthPoint } from './reading-report'

// ---- 年度叙事（Wrapped 式：分季 era + 阅读人格 + 叙事弧，本地派生不触云） ----
export {
  useReadingNarrative,
  computeReadingNarrative,
  buildEras,
  buildPersona,
  buildNarrativeArc,
  buildNarrativeMarkdown,
  seasonOfQuarter,
  quarterOfMonth,
} from './reading-narrative'
export type { ReadingNarrative, ReadingEra, ReadingPersonaTag } from './reading-narrative'

// ---- 朗读音色库（INCR-504：13 款本地音色，供 TtsControlPanel / VoiceLibraryPanel） ----
export {
  useVoiceLibrary,
  reloadVoiceLibrary,
  voicePreset,
  clampPitch,
  clampRateScale,
  matchSystemVoice,
  resolvePresetVoiceURI,
  applyVoicePreset,
  VOICE_PRESETS,
  DEFAULT_VOICE_ID,
  MIN_PITCH,
  MAX_PITCH,
  MIN_RATE_SCALE,
  MAX_RATE_SCALE,
} from './voice-library'
export type { VoicePreset, VoiceGender, VoiceLibraryState } from './voice-library'

// ---- 悬浮迷你播放器（INCR-502：听书浮条，MiniPlayerBar 消费） ----
export { useMiniPlayer, reloadMiniPlayer, DEFAULT_MINI_PLAYER } from './mini-player'
export type { MiniPlayerPrefs, MiniPlayerControls, MiniPlayerProgress } from './mini-player'

// ---- 沉浸阅读器（翻页/滚动 · 主题四色盘 · 分页 · 剩余时间，纯本地） ----
export {
  useImmersiveReader,
  reloadReaderPrefs,
  themeById,
  charsPerPageFor,
  countChars,
  paginateParagraphs,
  pageForParagraph,
  pageProgress,
  estimateRemainingMinutes,
  formatRemaining,
  clampFontSize,
  clampLineHeight,
  clampCharsPerPage,
  READER_THEMES,
  DEFAULT_READER_THEME_ID,
  DEFAULT_READER_PREFS,
  READER_PREFS_KEY,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_MAX,
  DEFAULT_CHARS_PER_MINUTE,
  BASE_CHARS_PER_PAGE,
  CHARS_PER_PAGE_MIN,
  CHARS_PER_PAGE_MAX,
} from './immersive-reader'
export type { ReaderMode, ReaderTheme, ReaderPrefs, ReaderPage } from './immersive-reader'

// ---- 书架整理面（INCR-522：视图/排序偏好 · 置顶 · 私密藏书 · 进度环数据） ----
export {
  useShelfOrganizer,
  reloadShelfOrganizer,
  normalizeShelfPrefs,
  normalizeIdList,
  readingProgress,
  progressPercent,
  orderBooks,
  shelfSections,
  shelfStats,
  SHELF_ORGANIZER_KEYS,
  DEFAULT_SHELF_PREFS,
  SHELF_SORT_META,
} from './shelf-organizer'
export type { ShelfView, ShelfSort, ShelfPrefs, ShelfSections, ShelfStats } from './shelf-organizer'

// ---- 段落批注层（INCR-523：划线/想法按段聚合 · 段末热门 · 边距气泡 · 一键导出） ----
export {
  matchExcerptParagraph,
  buildAnnotationLayer,
  annotationMarkMap,
  popularParagraphs,
  annotationStats,
  buildAnnotationsMarkdown,
} from './annotation-layer'
export type { ParagraphAnnotation, AnnotationStats } from './annotation-layer'

// ---- 摘录 / 读书便签 本地导出（#41） ----
export {
  useReadingExport,
  buildExcerptsMarkdown,
  buildMemosMarkdown,
  buildReadingExportMarkdown,
  buildReadingExportJson,
  downloadReadingExport,
  generateReadingExportFilename,
} from './reading-export'
export type { ReadingExportPayload } from './reading-export'