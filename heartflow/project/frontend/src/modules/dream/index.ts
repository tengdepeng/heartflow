// ============================================================
// 梦乡小筑 · 梦境档案分析模块
// ============================================================

export {
  dreamOverview,
  moodDistribution,
  dominantMood,
  topThemes,
  dreamInsights,
  MOOD_EMOJI,
  type DreamOverview,
  type MoodEntry,
  type DominantMood,
  type ThemeRow,
} from './dream-analytics'

// ---- 意象之镜（借鉴周公解梦的意象识别形态，守宪法：只观照不迷信） ----
export {
  DREAM_OMENS,
  extractOmens,
  omensOfDream,
  omenFrequency,
  omenEchoPrefix,
  omenLine,
  type DreamOmenDef,
  type DreamOmenHit,
  type OmenFrequency,
} from './dream-omen'