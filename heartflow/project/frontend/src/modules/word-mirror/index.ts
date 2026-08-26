// ============================================================
// 字镜阁 · 模块导出（P16-4 + P18-5 扩展）
// ============================================================

export { useEtymologyNetwork } from './etymology'
export { useSemanticNetwork } from './semantic-network'
export { useWordGames } from './word-games'
export { useDailyRecommendation } from './daily-recommendation'

// ---- P18-5 新增 ----
export { useWordAssociation } from './word-association'
export { useWritingEnhance } from './writing-enhance'
export { usePersonalVocabulary } from './personal-vocabulary'

// ---- 文字分析历史 & 词汇库（数据层下沉，P 重构） ----
export { useWordMirror } from './word-mirror-store'

// ---- F8 生疏词判定 ----
export { isStale, DEFAULT_STALE_THRESHOLD_DAYS } from './stale'

// ---- F9 间隔重复复习调度 ----
export { dueWords, isDue, nextReviewState, proficiencyIntervalDays, DEFAULT_SR_INTERVALS } from './spaced-repetition'

export {
  WORD_MIRROR_STORAGE_KEYS,
  PROFICIENCY_META,
  SEMANTIC_RELATION_META,
  GAME_TYPE_META,
} from './types'

export type {
  ProficiencyLevel,
  PartOfSpeech,
  WordEntry,
  EtymologyNode,
  SemanticEdge,
  SemanticRelation,
  SemanticNetwork,
  WordGameType,
  WordGameRound,
  WordGameSession,
  WordGroup,
  TextAnalysis,
  AnalysisHistoryItem,
  WordMirrorState,
  WordStats,
} from './types'

// ---- 每日词汇推荐（P16-4） ----
export type {
  DailyWord,
  WordRecommendationPack,
  ThemeWordPack,
  PersonalizedWord,
  RecommendationHistory,
} from './daily-recommendation'

// ---- 词汇联想网络（P18-5） ----
export { ASSOCIATION_RELATION_META } from './word-association'
export type {
  AssociationNode,
  AssociationEdge,
  AssociationRelation,
  AssociationGraph,
  AssociationPath,
  AssociationConfig,
  AssociationStats,
} from './word-association'

// ---- 写作增强引擎（P18-5） ----
export {
  WRITING_CATEGORY_META,
  PRESET_TEMPLATES,
} from './writing-enhance'
export type {
  WritingTemplate,
  WritingCategory,
  WritingSession,
  WritingScore,
  WritingAnalysis,
  WritingSuggestion,
  WritingStats,
} from './writing-enhance'

// ---- 个性化词库管理（P18-5） ----
export { PRESET_LEARNING_PATHS } from './personal-vocabulary'
export type {
  LearningPath,
  LearningStage,
  VocabularyProfile,
  LearningProgress,
  AdaptiveRecommendation,
  VocabularyConfig,
} from './personal-vocabulary'