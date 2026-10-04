// ============================================================
// 镜面对话系统 · 统一导出
// 蓝图要求：task parser + 10 intent categories + execution flow
// ============================================================

// 核心类型
export type {
  IntentCategory,
  IntentMeta,
  ParamExtractor,
  ParsedTask,
  ParsedTaskResult,
  ExecutionAction,
  ExecutionStep,
  ExecutionPlan,
  ExecutionResult,
  StepResult,
  DialogueEntry,
  DialogueVariant,
} from './types'

// 10 意图分类
export {
  INTENT_REGISTRY,
  INTENT_INFO,
  findIntentByKeyword,
  getAllIntentCategories,
} from './intents'

// 任务解析器
export {
  parseTask,
  parseTaskBest,
  parseTaskByIntent,
  getIntentConfidence,
} from './parser'

// 执行流
export {
  executeMirrorInput,
  planMirrorInput,
  executePlan,
} from './executor'
export type { ActionHandler, ActionHandlerRegistry } from './executor'

// composable
export { useMirrorDialogue } from './useMirrorDialogue'

// ---- 人格建模引擎（P15-7） ----
export {
  usePersonalityModel,
  STYLE_DIMENSION_META,
  VALUE_DIMENSION_META,
  GROWTH_PHASE_META,
  DEFAULT_PERSONALITY_CONFIG,
} from './personality-model'
export type {
  StyleDimension,
  StyleProfile,
  ValueDimension,
  ValueEntry,
  ValueProfile,
  GrowthNode,
  GrowthTrajectory,
  SelfAwarenessDimension,
  SelfAwarenessReport,
  EvolutionPrediction,
  PersonalityModelConfig,
} from './personality-model'

// ---- 对话持久化与模板（补导出） ----
export {
  useDialoguePersistence,
  useDialogueTemplates,
  useIntentFeedbackLearning,
  getDialogueSessions,
} from './dialogue-persistence'
export type { DialogueSession } from './dialogue-persistence'

// ---- LLM 集成桥接层（P16-13） ----
export {
  useLLMBridge,
  DEFAULT_LLM_BRIDGE_CONFIG,
} from './llm-bridge'
export type {
  LLMBridgeConfig,
  IntentRefinementResult,
  EmotionAnalysisResult,
  DeepReflectionResult,
  MirrorDialogueContext,
  LLMResponse,
  LLMStreamCallbacks,
} from './llm-bridge'

// ---- 语音输入模块（P16-13） ----
export {
  useVoiceInput,
  DEFAULT_VOICE_CONFIG,
  SUPPORTED_LANGUAGES,
} from './voice-input'
export type {
  VoiceInputStatus,
  VoiceInputConfig,
  VoiceSegment,
  VoiceSession,
  VoiceError,
  VoiceLanguage,
} from './voice-input'

// ---- 主题聚类模块（P16-13） ----
export {
  useTopicClustering,
  DEFAULT_TOPIC_CONFIG,
} from './topic-clustering'
export type {
  TopicDialogueEntry,
  Topic,
  TopicClusteringConfig,
  TopicTrend,
  TopicTrendPeriod,
  TopicSearchResult,
  TopicSummary,
} from './topic-clustering'

// ---- 工具卡 / 百宝袋（F5 意图工具卡） ----
export { useMirrorToolCards, MIRROR_TOOL_CARDS_KEY } from './tool-cards'
export type { MirrorToolCard } from './tool-cards'

// ---- 回答分支导航（INCR-478 · DeepSeek 式「Message N of M」） ----
export {
  createVariant,
  variantList,
  variantCount,
  activeVariantIndex,
  hasMultipleVariants,
  variantSummary,
  appendVariant,
  switchVariant,
} from './dialogue-branches'

// ---- 定音锤 · 证据聚合引擎（A4） ----
export {
  gatherFourActs,
  getIronLawResponse,
  getFourActsProgress,
  knockAndGetFreshness,
  checkFreshness,
} from './dingyin-engine'
export type {
  EvidenceLine,
  EvidenceSource,
  DingyinFreshness,
} from './dingyin-engine'