// ============================================================
// 模块 barrel export
// 统一导出所有功能模块，方便外部按需引用
// ============================================================

export { useCanvasRoom } from './canvas'
export type { CanvasLayoutMode, CanvasCrystal, GravityConfig, CanvasState } from './canvas'

export { crystallizeSession, completeWithCrystal, getCompletedSessionCount } from './crystal'

export {
  createSession, startSession, pauseSession, resumeSession,
  completeSession, interruptSession, calcProgress, formatTimerClock,
  getAllSessions, getSessionsByDateRange, getSessionsByDate,
  getTodaySessions, getSessionsByStatus, getSessionsByMode,
  getRecentCompletedSessions, removeSession, clearAllSessions,
  getTotalFocusTimeInRange, getTodayFocusTime, getWeekFocusTime,
  getMonthFocusTime, getTodayCompletedCount, getStreakDays,
  isLongBreakDue, validateTimerConfig, DEFAULT_TIMER_CONFIG,
} from './timer'
export type { FocusSession, FocusMode, TimerConfig } from './timer'

export { useBreathing } from './breathing'
export type { BreathingMood, BreathingPhase, BreathingConfig } from './breathing'

export { useAnchor } from './anchor'
export { useAnchorJournals } from './anchor'
export type { Anchor, AnchorScale } from './anchor'

export { useCarrier } from './carrier'
export type { JadeBeadCarrier, CarrierState, BeadCountMode } from './carrier'

export { useEmotionGarden } from './emotion'
export type { EmotionRecord, EmotionType } from './emotion'

export { useGesture } from './gesture'
export type { GestureType, GestureEvent, GestureConfig } from './gesture'

export { useGoal, useGoalBridge } from './goal'
export type { Goal, GoalTier, GoalStatus, GoalSummary } from './goal'

export { usePluginManager } from './plugin'
export { usePluginEcosystemBridge } from './plugin'
export type { PluginEcosystemOverview, PluginBridgeItem, SandboxBridgeStatus, PluginRecommendation } from './plugin'
export type { PluginManifest, PluginRuntime, PluginPermission } from './plugin'

export { useRelation, useMemorialSeats } from './relation'
export type { MemorialSeat } from './relation'

export { useStudy, tagFrequencies, pickRandom, extractTags } from './study'
export type { Note } from './study'

export { getRiverItemKey, createRiverItems, getRiverSource, createReplayTimer, getAllTags, filterByTag, computeDailySummaries, filterByTimeRange, filterByTypes, searchTimeline, findEventCorrelations, computeTimelineStats, groupByDate, getItemsOnDate } from './timeline'
export type { RiverItem, RiverItemType, RiverSource, DailySummary, TimeRange, TimelineSearchOptions, SearchHit, EventCorrelation, TimelineStats, DateGroup } from './timeline'

export { useToast, showToast } from './toast'
export type { ToastMessage } from './toast'

export { Astrolabe, useAstrolabe, recordNavigation } from './astrolabe'
export type { AstrolabeConfig, AstrolabeSearchState, AstrolabeVisibility, AstrolabeState } from './astrolabe'

export { usePlayGallery } from './play'
export { usePlaySeeds } from './play'
export type { Game, Toy, Model, Other, PlayData, MonthlyStat, DistBuckets, ModelGroup, RecentItem, PlayTab, FilterOption, PlatformDistItem } from './play'

export { useBagStore, useBagEvolution, useBagBridge } from './bag'
export { EVOLUTION_STAGE_META, STAGE_THRESHOLDS, BAG_STORAGE_KEYS } from './bag'
export type { BagItem, CategoryItem, EvolutionEntry, BagOverview, EvolutionStage, EvolutionRequirement, EvolutionStageEntry, EvolutionPath, EvolutionStats, EvolutionProgress, SkillOverview, BagHealth, BagRecommendation } from './bag'

export {
  useSeasonalRituals,
  usePrivateRituals,
  useSolarTerms,
  SOLAR_TERMS,
  FESTIVALS,
  SEASON_META,
  TERM_CUSTOMS,
  FESTIVAL_INFO,
  getTermCustoms,
  getFestivalInfo,
} from './seasonal'
export type {
  Season, SeasonalRitual, Ritual, LifeRitual,
  SeasonalStats, SolarTerm, Festival, SeasonMeta,
} from './seasonal'

export { useOutputManager } from './output'
export type { OutputRecord, OutputRecordType, OutputState, OutputEvent, CreateRecordParams, IOutputManager, OutputConfig } from './output'

export { useRoomManager } from './room-manager'
export type { RoomConfig, RoomNode, RoomGroup } from './room-manager'

export { useRoomLock, fingerprintRoomPassword, verifyRoomPassword, isRoomLockConfigured, resetRoomLockStore } from './room-lock'
export type { RoomLockConfig, RoomLockMap } from './room-lock'

export { useDataSecurity, usePsychologicalSafety, usePropertySafety, usePersonalSafety, getSafetyScore, getSafetyConfig, updateSafetyConfig, resetSafetyConfig } from './safety'
export type { SafetyScore, SafetyConfig, DataSecurityConfig, PropertySecurityConfig, PersonalSafetyConfig, PsychologicalSafetyConfig } from './safety'

export { useCraftStore, useCraftMaterials } from './craft'
export { MATERIAL_RARITY_META, CRAFT_STORAGE_KEYS, DEFAULT_MATERIALS } from './craft'
export type { MaterialRarity, Material, MaterialUsage, MaterialStats } from './craft'
export { useCraftBridge } from './craft'
export type { CraftHealth, CraftDashboard, SynthesisEfficiency, WorkRecommendation } from './craft'

export { getNodes, createNode, updateNode, deleteNode, getRelations, createRelation, deleteRelation, getNodeRelations, RELATION_TYPE_META, suggestConnections, generateQuestions, detectBlindSpots, calculateHealthScore, createImportSource, IMPORT_SOURCE_TYPES, IMPORT_SOURCE_ICONS, IMPORT_SOURCE_LABELS } from './knowledge'
export { useKnowledgeTower, KNOWLEDGE_NODES_KEY, KNOWLEDGE_IMPORT_SOURCES_KEY, KNOWLEDGE_STAR_POSITIONS_KEY } from './knowledge'
export type { KnowledgeNode, KnowledgeRelation, RelationType, KnowledgeCategory, RelationTypeMeta, ConnectionSuggestion, CategoryCoverage, HealthBreakdown, HealthScoreResult, ImportSourceType, ImportSource, KNode, StarPositions } from './knowledge'

export { SanctuaryOverlay, useSanctuaryTrigger } from './sanctuary'
export type { SanctuaryTriggerConfig } from './sanctuary'

export { useWill, useTestament, TESTAMENT_TYPE_LABELS, TESTAMENT_STATUS_LABELS, TRIGGER_LABELS } from './will'
export type { Will, WillGrade, TestamentType, TestamentTrigger, TestamentStatus, Testament, TestamentClause, Beneficiary, ExecutionRitual, TestamentStats } from './will'

// ---- customization ----
export { DIMENSION_META, SPACE_PRESETS, getPresetById, applyPreset } from './customization'
export { getSpaceConfigs, saveSpaceConfigs, getActiveConfigId, setActiveConfigId, getActiveConfig, createSpaceConfig, updateSpaceConfig, deleteSpaceConfig, duplicateSpaceConfig } from './customization'
export type { CustomDimension, DimensionConfig, SpaceConfig, SpacePreset, DimensionMeta } from './customization'
export { useAppearance, initAppearance } from './customization'
export { useRoomStyle } from './customization'
export type { RoomStyleOverride } from './customization'

// ---- note ----
export { useNote, STICKY_COLORS } from './note'
export type { StickyNote, NoteDisplayMode, NoteViewMode } from './note'

// ---- mirror ----
export { useMirrorDialogue } from './mirror'
export { INTENT_REGISTRY, INTENT_INFO, findIntentByKeyword, getAllIntentCategories } from './mirror'
export { parseTask, parseTaskBest, parseTaskByIntent, getIntentConfidence } from './mirror'
export { executeMirrorInput, planMirrorInput, executePlan } from './mirror'
export { useMirrorToolCards, MIRROR_TOOL_CARDS_KEY } from './mirror'
export { createVariant, variantList, variantCount, activeVariantIndex, hasMultipleVariants, variantSummary, appendVariant, switchVariant } from './mirror'
export type { IntentCategory, IntentMeta, ParsedTask, ParsedTaskResult, ExecutionAction, ExecutionStep, ExecutionPlan, ExecutionResult, StepResult, DialogueEntry, DialogueVariant, ActionHandler, ActionHandlerRegistry, MirrorToolCard } from './mirror'

// ---- data-sovereignty ----
export { useForgetting, useHallExit, useDataExtradition, useCrossDevice, FORGET_METHODS } from './data-sovereignty'
export type { ForgetMethod, ForgetMethodInfo, HallExitState, HallExitStateInfo, ForgettingRecord, ForgetResult, ExtraditionPhase, ExtraditionManifest, ExtraditionModule, ExtraditionPackage, ExtraditionState, ExtraditionCallbacks, DeviceInfo, ContinuitySession, ContinuityConfig } from './data-sovereignty'

// ---- i18n ----
export { setLocale, getLocale, getSupportedLanguages, t, tPlural, useI18nStore } from './i18n'

// ---- home ----
export { HomeRoomPanel, HomeRoomAtmosphere, HOME_ROOMS, DEFAULT_HOME_ROOM, getHomeRoom } from './home'
export { aggregateTodayRoomStats, getUtcDateKey } from './home'
export { useHomeBridge } from './home'
export type { HomeRoom, TodayRoomStats } from './home'
export type { HomeHealth, RoomOverview, RoomHeatmapEntry, ActivityTimelineEntry, RoomRecommendation } from './home'

// ---- background（背景音频路由 / 互斥出声 / 预览全局同步）----
export { useBackgroundPreviewAudio, useBackgroundVideoSync } from './background'

// ---- roots ----
export { useRoots, LAYER_CONFIG, DEFAULT_STRENGTH, STORAGE_KEY as ROOTS_STORAGE_KEY } from './roots'
export { useRootGarden } from './roots'
export type { Root, RootLayer } from './roots'

// ---- style ----
export { exportStylePack, downloadStylePack, importStylePack, shareToStylePack, createStylePackFromBaseColor } from './style'
export type { StylePackShareFormat } from './style'

// ---- sync ----
export { useSync, DEFAULT_SYNC_CONFIG } from './sync'
export type { SyncConfig, SyncStatus, SyncTarget, SyncLogEntry, SyncConflict, SyncSnapshot, SyncDomain, SyncDirection } from './sync'

// ---- template ----
export { useTemplateStore } from './template'
export { useTemplateMarket } from './template'
export type { RoomTemplate } from './template'

// ---- timeline-index ----
export { useTimelineIndex, calcWeight } from './timeline-index'
export type { IndexEntry, IndexSummary, IndexQueryOptions, IndexQueryResult, IndexStats } from './timeline-index'

// ---- visualization ----
export { getMetaphor, getAllMetaphorTypes, getAllMetaphors } from './visualization'
export { METAPHOR_LIGHT, METAPHOR_INK, METAPHOR_WOOD, METAPHOR_FIRE, METAPHOR_WATER, METAPHOR_EARTH, METAPHOR_METAL, METAPHOR_MIST, METAPHOR_STAR, METAPHOR_CRYSTAL, METAPHOR_MAP } from './visualization'
export { PALETTE_GOLD, PALETTE_COOL, PALETTE_NATURE, BUILTIN_PALETTES } from './visualization'
export { getEffectiveMetaphor, getBuiltinPaletteIds, getBuiltinPalette } from './visualization'
export { PRESET_STYLE_PACKS, getPresetPack } from './visualization'
export { getDimensionMappings, getMappingByDimension, applyDimensionMapping, applyAllMappings } from './visualization'
export type { MetaphorType, MetaphorConfig, MetaphorPalette, VisualizationStylePack, DataDimension, VisualDimension } from './visualization'
export { useVisualizationBridge } from './visualization'
export type { VisualizationState } from './visualization'

// ---- visitor ----
export { useVisitor, useVisitorBridge, VISITOR_ROLE_PERMISSIONS, VISITOR_ROLE_LABELS } from './visitor'
export type { VisitorSession, VisitorFootprint, VisitorInvitation, AccessRule, VisitorRole, VisitorPermission, VisitorStats } from './visitor'
export type { VisitorSummary, SessionInfo } from './visitor'

// ---- traditions ----
export { useTraditions, CRAFT_CATEGORY_LABELS, RITUAL_TYPE_LABELS } from './traditions'
export type { FolkloreEntry, CivilizationMirror, FolkloreStats, CraftCategory, RitualType } from './traditions'

// ---- touchpoints ----
export { useWidgetManager, useGlowEngine, useGreetingEngine } from './touchpoints'
export {
  WIDGET_META,
  GLOW_THEME_META,
  DEFAULT_GLOW_CONFIG,
  DEFAULT_FLOATING_CONFIG,
  DEFAULT_GREETING_TEMPLATES,
  TOUCHPOINTS_STORAGE_KEYS,
} from './touchpoints'
export type {
  WidgetType,
  WidgetSize,
  WidgetInstance,
  WidgetMeta,
  GlowTheme,
  GlowThemeMeta,
  GlowConfig,
  FloatingPosition,
  FloatingAnimation,
  GreetingPeriod,
  GreetingTemplate,
  FloatingConfig,
} from './touchpoints'

// ---- text-sense（殿堂触角 · 文本速识） ----
export { useTextSense, recognizeEntities, entityTypesOf, entityActionLabel, ENTITY_TYPE_META, TEXT_SENSE_STORAGE_KEY, CLIP_HISTORY_CAP } from './text-sense'
export type { EntityType, EntityMeta, RecognizedEntity, ClipItem } from './text-sense'

// ---- advisor ----
export { useAdvisorInteraction, useAdvisorDailyLife, useAdvisorCelebration, useAdvisorWitness } from './advisor'
export { useAdvisorBridge } from './advisor'
export type { AdvisorSummary, RelationNetworkOverview, RitualSummary, WitnessLogSummary } from './advisor'
export {
  INTERACTION_TYPE_META,
  TIME_SLOT_META,
  ACTIVITY_META,
  CELEBRATION_TYPE_META,
  RETIREMENT_PHASE_META,
  WITNESS_EVENT_META,
  ADVISOR_STORAGE_KEYS,
} from './advisor'
export type {
  InteractionType,
  InteractionIntensity,
  AdvisorRelation,
  InteractionRecord,
  ActivityType,
  TimeSlot,
  AdvisorActivity,
  LifeScene,
  DailySchedule,
  CelebrationType,
  CelebrationEvent,
  CelebrationRitual,
  RetirementPhase,
  RetirementCeremony,
  AdvisorLegacy,
  WitnessEventType,
  AdvisorWitnessRecord,
  WitnessStats,
} from './advisor'

// ---- constitution ----
export { useComplianceBaseline } from './constitution'
export { useConstitutionBridge } from './constitution'

// ---- body ----
export { useBodyGreenhouse } from './body'
export { BODY_METRIC_META, ENERGY_LEVEL_META, BODY_STORAGE_KEYS } from './body'
export type { BodyMetricType, BodyMetric, SleepRecord, EnergyLevel, BodyGreenhouseState } from './body'

// ---- discipline ----
export { useDisciplineWorkshop } from './discipline'
export { HABIT_DIFFICULTY_META, HABIT_FREQUENCY_META, DISCIPLINE_STORAGE_KEYS } from './discipline'
export type { HabitDifficulty, HabitFrequency, Habit, DisciplineChallenge, DailyRitual } from './discipline'

// ---- light ----
export { useLightPavilion } from './light'
export { useLightPavilionData } from './light'
export { MEDITATION_TYPE_META, RELEASE_METHOD_META, CLARITY_LEVEL_META, LIGHT_STORAGE_KEYS } from './light'
export type { MeditationType, MeditationRecord, ReleaseEntry, ClarityLevel, LightState } from './light'

// ---- reading ----
export { useReadingHall } from './reading'
export { useReading } from './reading'
export { READING_STATUS_META, READING_STORAGE_KEYS } from './reading'
export type { ReadingStatus, Book, BookQuote, ReadingSession, ReadingGoal, Excerpt } from './reading'
export { useVoiceLibrary, VOICE_PRESETS, voicePreset, applyVoicePreset, matchSystemVoice } from './reading'
export type { VoicePreset, VoiceGender, VoiceLibraryState } from './reading'
export { useMiniPlayer, DEFAULT_MINI_PLAYER } from './reading'
export type { MiniPlayerPrefs, MiniPlayerControls } from './reading'

// ---- guide-tour（全局 UI · 分步引导蒙层，INCR-500） ----
export { useGuideTour, reloadGuideTour, computeTooltip, clampTooltip, GUIDE_TOURS, DEFAULT_GUIDE_TOUR } from './guide-tour'
export type { TourStep, TourDef, TourPlacement, GuideTourState, Rect, Size, Point } from './guide-tour'

// ---- font-library（全局 UI · 字体库，INCR-501） ----
export { useFontLibrary, reloadFontLibrary, fontPreset, fontCssVars, applyFonts, FONT_PRESETS, DEFAULT_FONT_LIBRARY } from './font-library'
export type { FontPreset, FontLibraryState } from './font-library'

// ---- calendar-prefs（时间线 · 日历显示偏好，INCR-503） ----
export { useCalendarPrefs, reloadCalendarPrefs, weekdaysFor, buildMonthGrid, WEEKDAY_LABELS, DEFAULT_CALENDAR_PREFS } from './calendar-prefs'
export type { CalendarPrefs, GridCell } from './calendar-prefs'

// ---- photo-guide（藏象阁 · AI 拍照引导取景，INCR-506） ----
export { usePhotoGuide, reloadPhotoGuide, sceneById, analyzeImageData, evaluateCapture, CAPTURE_SCENES, LEVEL_LABEL } from './photo-guide'
export type { CaptureScene, CaptureSceneId, ImageMetrics, CaptureEvaluation, CaptureRecord, CapturePhase } from './photo-guide'

// ---- on-this-day（时间长廊 · 历史上的今天，INCR-510） ----
export { useOnThisDay, reloadOnThisDay, eventsOn, eventsByCategory, searchEvents, pickRandom as pickRandomEvent, formatYear, totalEvents, HISTORY_EVENTS, HISTORY_CATEGORIES } from './on-this-day'
export type { HistoryEvent, HistoryCategory } from './on-this-day'

// ---- movement ----
export { useMovementRhythm } from './movement'
export { useMovement, MOVES_KEY } from './movement'
export { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META, MOVEMENT_STORAGE_KEYS } from './movement'
export type { MovementType, MovementIntensity, MovementRecord, MovementRhythm, Move } from './movement'
export { DEFAULT_COMPLIANCE_CONFIG, CONSTITUTION_STORAGE_KEYS as CONSTITUTION_COMPLIANCE_STORAGE_KEYS } from './constitution'
export type {
  ComplianceResult,
  ComplianceViolation,
  ComplianceWarning,
  ComplianceConfig,
  ComplianceReport,
  AuditEntry,
  AuditEventType,
  AuditStats,
  RuleConflict,
} from './constitution'

// ---- word-mirror ----
export { useEtymologyNetwork, useSemanticNetwork, useWordGames } from './word-mirror'
export { useWordMirror } from './word-mirror'
export { WORD_MIRROR_STORAGE_KEYS, PROFICIENCY_META, SEMANTIC_RELATION_META, GAME_TYPE_META } from './word-mirror'
// ---- F8 生疏词判定 ----
export { isStale, DEFAULT_STALE_THRESHOLD_DAYS } from './word-mirror'
// ---- F9 间隔重复复习调度 ----
export { dueWords, isDue, nextReviewState, proficiencyIntervalDays, DEFAULT_SR_INTERVALS } from './word-mirror'
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
} from './word-mirror'

// ---- hanzi（殿堂辞典·汉字本体/查字/档案/手写）----
export * from './hanzi'

// ---- garden（成长庭院·种子/习惯/罗盘 + 成长气象 + 打卡日历）----
export { useGardenFlourish } from './garden'
export { growthOverview, domainDistribution, stageDistribution, habitReview, growthMomentum, growthInsights, STAGE_LABELS } from './garden/growth-meteor'
export type { SeedLike, HabitLike, GrowthOverview, DomainRow, StageRow, HabitReview, GrowthMomentum } from './garden/growth-meteor'
export { habitCalendarAggregate, habitDimensionStats, toLocalDate } from './garden/habit-calendar'
export type { DayCell, HabitCalendar, HabitDimension } from './garden/habit-calendar'

// ---- body-wisdom ----
export { useMeridianTracker, getCurrentMeridian, useConstitutionAnalyzer, useFiveMovements, useSutraAnnotations, useWellnessPlan, useMeridianCheck } from './body-wisdom'
export { BODY_WISDOM_STORAGE_KEYS, ORGAN_ELEMENT_MAP, CONSTITUTION_META, MERIDIAN_HOURS, ANNOTATION_TYPE_META } from './body-wisdom'
export type {
  OrganType,
  FiveElement,
  MeridianType,
  MeridianFeeling,
  MeridianRecord,
  ConstitutionType,
  ConstitutionAnalysis,
  FiveMovementsSixQi,
  MeridianHour,
  MoodRecord,
  SutraEntry,
  SutraReadingRecord,
  BodyWisdomState,
  MeridianStats,
  HeavenlyStem,
  EarthlyBranch,
  SixQi,
  FiveMovement,
  YearlyMovement,
  AnnotationType,
  SutraAnnotation,
  MeditationGuide,
  WellnessPlan,
  MeridianIssue,
  MeridianCheckReport,
} from './body-wisdom'

// ---- scar ----
export { useScarHealing, useScarMarks, useScarStories, useCommunitySupport, useScarMap, useForgingRituals } from './scar'
export { SCAR_STORAGE_KEYS, HEALING_STAGES, BODY_PART_META, SCAR_TYPE_META, EMOTION_META, RITUAL_TYPE_META } from './scar'
export type {
  BodyPart,
  ScarType,
  ScarState,
  HealingStage,
  SeverityLevel,
  BodyMark,
  HealingStageMeta,
  GrowthRecord,
  ForgingRecord,
  ScarStats,
  StoryChapter,
  ScarStory,
  CommunityShare,
  CommunityResponse,
  BodyHeatData,
  ScarMap,
  ForgingRitual,
  ScarMark,
} from './scar'

// ---- reward ----
export { useRewardMilestones, useFinanceGoals, useInvestmentTracker, useFinanceHealth, useFinanceTimeline } from './reward'
export { useReward } from './reward'
export { REWARD_STORAGE_KEYS, INCOME_CATEGORY_META, EXPENSE_CATEGORY_META, DEFAULT_MILESTONES, GOAL_TYPE_META, GOAL_TERM_META, INVESTMENT_TYPE_META, HEALTH_GRADE_META } from './reward'
export {
  useCustomCategories,
  resetCategoryRegistry,
  buildMerged,
  customOnly,
  descendantIds,
  resolveMeta,
  resolveMetaAny,
  categoryOptions,
  categoryLabel,
  categoryIcon,
  categoryColor,
  categoryLabelAny,
  categoryIconAny,
  categoryOptionsFor,
} from './reward'
export type {
  RewardType,
  IncomeCategory,
  ExpenseCategory,
  RewardRecord,
  RewardMilestone,
  Budget,
  RewardStats,
  FinanceGoalType,
  GoalTerm,
  FinanceGoal,
  InvestmentType,
  InvestmentRecord,
  HealthDimension,
  FinanceHealthScore,
  FinanceTimelineEvent,
  CustomCategory,
  CategoryOption,
  CategoryKind,
} from './reward'

// ---- rest ----
export { useRestQuality, useRestRituals, usePlantGrowth, useRestCalendar, useRestPrescription } from './rest'
export { useRest } from './rest'
export { REST_STORAGE_KEYS, DEFAULT_PRACTICES, VEGETATION_MAP, SEASON_THEMES, RITUAL_CATEGORY_META, GROWTH_PHASE_META, FATIGUE_LEVEL_META, PRESET_RITUALS } from './rest'
export type {
  RestSeason,
  RestActivityType,
  RestPractice,
  BreakRecord,
  PlantState,
  RestQualityAnalysis,
  RestTip,
  RestState,
  RitualCategory,
  RitualStep,
  RestRitual,
  GrowthPhase,
  PlantAnimationState,
  CalendarDay,
  RestCalendar,
  FatigueLevel,
  RestPrescription,
} from './rest'

// ---- merit-wooden-fish ----
export { useMeritWoodenFish } from './merit-wooden-fish'
export type { MeritState } from './merit-wooden-fish'

// ---- desktop-companion ----
export { useDesktopCompanion, COMPANION_FORMS, xpToNext, homeLevelFor } from './desktop-companion'
export type { CompanionState, CompanionForm } from './desktop-companion'

// ---- aquarium（情绪花房 · 电子水族箱）----
export { useAquarium, reloadAquarium, speciesById, growthStage, FISH_SPECIES, MAX_FISH } from './aquarium'
export type { AquariumState, Fish, FishSpecies, GrowthStage } from './aquarium'

// ---- decision-wheel（幕僚 · 决定转盘）----
export { useDecisionWheel, reloadWheel, DEFAULT_OPTIONS, MAX_HISTORY } from './decision-wheel'
export type { WheelState, WheelOption, SpinRecord } from './decision-wheel'

// ---- drift-bottle（情绪花房 · 漂流瓶）----
export { useDriftBottle, reloadBottles, BOTTLE_MOODS } from './drift-bottle'
export type { BottleState, DriftBottle, BottleMood, BottleStatus } from './drift-bottle'

// ---- radial-menu（触角 · 径向扇形菜单）----
export { useRadialMenu, reloadRadialMenu, DEFAULT_ACTIONS, MAX_ACTIONS } from './radial-menu'
export type { RadialAction, RadialMenuState } from './radial-menu'

// ---- rotary-picker（触角 · 滚轮旋钮选择器）----
export { useRotaryPicker, reloadRotary, DEFAULT_ROTARY } from './rotary-picker'
export type { RotaryPreset, RotaryState } from './rotary-picker'

// ---- dynamic-island（触角 · 动态岛状态胶囊）----
export { useDynamicIsland, reloadIsland, ISLAND_MODES, ISLAND_MODE_META, DEFAULT_ISLAND } from './dynamic-island'
export type { IslandMode, DynamicIslandState } from './dynamic-island'

// ---- vertical-marquee（触角 · 垂直跑马灯）----
export {
  useVerticalMarquee,
  reloadMarquee,
  DEFAULT_MARQUEE,
  DEFAULT_MARQUEE_ITEMS,
  MIN_INTERVAL_MS as MARQUEE_MIN_INTERVAL_MS,
  MAX_INTERVAL_MS as MARQUEE_MAX_INTERVAL_MS,
  MAX_ITEMS as MARQUEE_MAX_ITEMS,
} from './vertical-marquee'
export type { VerticalMarqueeState, MarqueeDirection } from './vertical-marquee'

// ---- flip-clock（触角 · 翻页数字时钟）----
export { useFlipClock, reloadFlipClock, formatClock, DEFAULT_FLIP_CLOCK } from './flip-clock'
export type { FlipClockState, ClockFormat, ClockParts } from './flip-clock'

// ---- standby-scene（触角 · 空闲待机氛围场景）----
export {
  useStandbyScene,
  reloadStandbyScene,
  SCENES as STANDBY_SCENES,
  SCENE_META as STANDBY_SCENE_META,
  DEFAULT_STANDBY,
  MIN_IDLE_SECONDS,
  MAX_IDLE_SECONDS,
} from './standby-scene'
export type { StandbySceneState, SceneId } from './standby-scene'

// ---- widget-style（触角 · 组件款式/皮肤矩阵）----
export {
  useWidgetStyle,
  reloadWidgetStyle,
  STYLE_VARIANTS as WIDGET_STYLE_VARIANTS,
  WIDGET_KINDS,
  DEFAULT_STYLE_ID as WIDGET_DEFAULT_STYLE_ID,
  DEFAULT_STYLE_BY_KIND as WIDGET_DEFAULT_STYLE_BY_KIND,
} from './widget-style'
export type { WidgetStyleState, StyleVariant, WidgetKind } from './widget-style'

// ---- widget-hotzone（触角 · 组件自定义点击热区）----
export {
  useWidgetHotzone,
  reloadWidgetHotzone,
  DEFAULT_HOTZONES,
  MAX_HOTZONES as WIDGET_MAX_HOTZONES,
  MIN_ZONE_SIZE as WIDGET_MIN_ZONE_SIZE,
} from './widget-hotzone'
export type { WidgetHotzoneState, Hotzone } from './widget-hotzone'

// ---- long-press-speed（阅览 · 长按变速）----
export {
  useLongPressSpeed,
  reloadLongPressSpeed,
  computeSpeed as computeLongPressSpeed,
  computeProgress as computeLongPressProgress,
  DEFAULT_LONG_PRESS_SPEED,
  MIN_BASE_SPEED as LPS_MIN_BASE_SPEED,
  MAX_BASE_SPEED as LPS_MAX_BASE_SPEED,
  MIN_HOLD_SPEED as LPS_MIN_HOLD_SPEED,
  MAX_HOLD_SPEED as LPS_MAX_HOLD_SPEED,
  MIN_RAMP_MS as LPS_MIN_RAMP_MS,
  MAX_RAMP_MS as LPS_MAX_RAMP_MS,
} from './long-press-speed'
export type { LongPressSpeedState } from './long-press-speed'

// ---- career ----
export { useCareerPath, useSkillMap, useTransitionAnalysis, useInteractionTracker, useCareerMilestones } from './career'
export { useCareer } from './career'
export { CAREER_STORAGE_KEYS, TIER_META, NODE_TYPE_DEFS, CONNECTION_TYPE_META, SKILL_CATEGORY_META, TRANSITION_STRATEGY_META, MILESTONE_TYPE_META } from './career'
export type {
  NetworkTier,
  NodeType,
  ConnectionType,
  ProjectStatus,
  Contact,
  CareerConnection,
  CareerProject,
  CareerPosition,
  CareerPathNode,
  NodeTypeDef,
  NetworkNode,
  NetworkEdge,
  NetworkStats,
  SkillCategory,
  SkillNode,
  SkillMap,
  TransitionStrategy,
  TransitionPath,
  TransitionAnalysis,
  ContactHealth,
  MilestoneType,
  CareerMilestone,
} from './career'

// ---- worklog ----
export { useWorklog, useWorklogModuleBridge } from './worklog'
export { useWorkLog } from './worklog'
export { LOG_TYPE_META, MOOD_TONE_META, WORKLOG_STORAGE_KEYS } from './worklog'
export type { LogEntryType, MoodTone, LogEntry, WorklogDailySummary, WeeklySummary, WorklogStats, WorkShift, WorklogSummary } from './worklog'

// ---- parallel-world ----
export { useParallelWorld, useBranchTimeline, useBranchComparison, useMergeSuggestions, useEvolutionGraph } from './parallel-world'
export { useParallelWorldBridge } from './parallel-world'
export type { ParallelWorldSummary, BranchDetail } from './parallel-world'
export { useParallelSelves } from './parallel-world'
export type { BranchTreeNode, TimelineNode, TimelineConfig, DiffDimension, BranchDiffEntry, BranchComparison, MergeSuggestion, EvolutionNode, EvolutionGraph, Fork, AltSelf } from './parallel-world'
export { BRANCH_COLORS, PARALLEL_WORLD_STORAGE_KEYS } from './parallel-world'
export type {
  WorldBranch,
  Checkpoint,
  WorldSnapshot,
  BranchStats,
  ParallelWorldState,
  BranchColorPreset,
} from './parallel-world'

// ---- association（通用跨域关联引擎）----
export { useAssociationEngine, computeAssociationGraph, collectAllItems, linkBySharedTag, linkByTemporalProximity, linkByCausalOrder, getTags, getTimeOf } from './association'
export type { DomainKey, LinkType, NormalizedItem, CrossDomainLink, AssociationGraph } from './association'

// ---- cognition（释光阁）----
export { useMeditationAnalytics, evaluateFourLights, LIGHT_META, LIGHT_ORDER } from './cognition'
export { useCognitionReflections, COGNITION_REFLECTIONS_KEY } from './cognition'
export { useCognitionBridge } from './cognition'
export type { FourLightsInput, LightKey } from './cognition'
export type { Reflection } from './cognition'

// ---- wisdom（知微阁）----
export { useWisdom, WISDOM_ITEMS_KEY } from './wisdom'
export { useWisdomHistory, WISDOM_HISTORY_KEY } from './wisdom'
export type { WisdomItem, AnswerCard, WisdomContext } from './wisdom'
export type { HistoryItem } from './wisdom'

// ---- automation（自动化工坊）----
export { useAutomationFlows } from './automation'
export type { SavedFlow } from './automation'

// ---- bookmarks（书签）----
export { useBookmarks } from './bookmarks'
export type { Bookmark } from './bookmarks'

// ---- guard（守护室）----
export { useGuard } from './guard'
export type { GuardSessionActivity, GuardContact, GuardVisitLog, GuardPermissionStatus, GuardPermissionLight, GuardCrashLevel, GuardCrashLog } from './guard'

// ---- interaction（交互配置）----
export { useInteractionConfigs } from './interaction'
export type { InteractionConfig } from './interaction'

// ---- map（地图室）----
export { useMap } from './map'
export type { Place, LifeNode } from './map'

// ---- scene（场景编辑器）----
export { useScenes } from './scene'
export type { ScenePreset } from './scene'
export { useRoomScent, getScent, SCENT_LIBRARY, DEFAULT_SCENE_SCENTS } from './scene'
export type { RoomScent } from './scene'

// ---- transform（蜕变画廊）----
export { useTransformGallery } from './transform'
export type { Transformation, TransformType } from './transform'

// ---- vault（保险库）----
export { useVault, VAULT_CIPHER_KEY, VAULT_LEGACY_K, VAULT_LEGACY_KA, useVaultAutoLock, DEFAULT_AUTO_LOCK, IDLE_OPTIONS, AUTO_LOCK_KEY } from './vault'
export type { Asset, Archive, VaultData, AutoLockSettings } from './vault'

// ---- workhub（工作台）----
export { useWorkHub } from './workhub'

// ---- slacking（摸鱼计算机 / 下班倒计时）----
export { useSlackingWage } from './slacking'
export type { SlackingConfig, SlackingState } from './slacking'

// ---- unfinished（未竟之园）----
export { useUnfinished } from './unfinished'

// ---- clepsydra（更漏）----
export {
  WORK_CATEGORY_META,
  intensityLabel,
  windowStart,
  inWindow,
  recordSeconds,
  computeSummary,
  computeState,
  formatSeconds,
  genId,
  useClepsydra,
  resetClepsydra,
  STORAGE_KEY,
  createCountdown,
  countdownRemaining,
  tickCountdown,
  startCountdown,
  pauseCountdown,
  resumeCountdown,
  resetCountdown,
  countdownStatusLabel,
  countdownToRecord,
  countdownRepeatLabel,
  COUNTDOWN_REPEAT_META,
  useClepsydraCountdown,
  COUNTDOWN_STORAGE_KEY,
} from './clepsydra'
export type {
  WorkCategory,
  WorkRecord,
  CategoryMeta,
  ClepsydraState,
  ClepsydraSummary,
  CountdownStatus,
  CountdownTimer,
  CountdownRepeat,
} from './clepsydra'

// ---- self-mirror（镜我 · 自体镜像）----
export { computeFourPillars, defaultBirthData, zodiacForYear, constellationFor } from './self-mirror'
export type { BirthData, Pillar, FourPillarsProfile } from './self-mirror'
export { createEmptyHouses, computeHouseStats, assessBalance, DEFAULT_HOUSES } from './self-mirror'
export type { House, TwelveHousesState, HouseStats, BalanceScore } from './self-mirror'
export { housesToAstrolabe, deriveAstrolabeInsight } from './self-mirror'
export type { AstrolabePoint, AstrolabeData, AstrolabeInsight } from './self-mirror'
export { useSelfMirrorHouses, getSelfMirrorHousesStore } from './self-mirror'

// ---- water-drink（触角 · 喝水打卡）----
export {
  useWaterDrink,
  reloadWaterDrink,
  localDate,
  normalizeWaterDrink,
  drinkProgress,
  clampTarget,
  DEFAULT_WATER_DRINK,
  DEFAULT_TARGET,
  MIN_TARGET,
  MAX_TARGET,
} from './water-drink'
export type { WaterDrinkState } from './water-drink'

// ---- corner-transition（全局 UI · 角落缩放展开转场）----
export {
  useCornerTransition,
  reloadCornerTransition,
  cornerOrigin,
  originCorner,
  originPoint,
  originStyle,
  clampDuration,
  clampScale,
  CORNERS,
  DEFAULT_CORNER_TRANSITION,
  MIN_DURATION,
  MAX_DURATION,
  MIN_SCALE,
  MAX_SCALE,
} from './corner-transition'
export type { Corner, CornerMode, CornerTransitionState, RectLike } from './corner-transition'
