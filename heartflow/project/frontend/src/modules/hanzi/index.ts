// ============================================================
// 殿堂辞典 · 汉字查询模块 barrel
// 模块三十六：汉字本体数据 + 多维查字 + 汉字档案
// ============================================================

export { HANZI_DATA, loadHanziAll, addHanzi, removeHanzi } from './hanzi-data'
export type { HanziEntry } from './hanzi-data'
export {
  searchHanzi,
  byPinyin,
  byRadical,
  byStrokeRange,
  listRadicals,
  strokeBuckets,
  normalizePinyin,
  toneOf,
  cloneHanzi,
} from './lookup'
export type { RadicalGroup, StrokeBucket } from './lookup'
export {
  hanziOverview,
  radicalDistribution,
  strokeDistribution,
  structureDistribution,
  hanziInsights,
  extractChars,
  toHanziEntries,
  vocabularyProfile,
} from './hanzi-analytics'
export type {
  HanziOverview,
  StructureRow,
  InitialRow,
  VocabularyProfile,
} from './hanzi-analytics'

// ---- 手写识别（现代汉语字典/中华汉语字典 借鉴） ----
export {
  strokeCount,
  classifyStrokeDirection,
  strokeDirections,
  strokeDirectionSummary,
  sequenceSimilarity,
  matchHandwriting,
  recognizeHandwriting,
  handwritingInsights,
  STROKE_SEQUENCES,
  STROKE_DIRECTION_META,
} from './handwriting'
export type {
  HandwritingPoint,
  HandwritingStroke,
  HandwritingInput,
  StrokeDirection,
  HandwritingMatch,
  HandwritingResult,
  HandwritingMatchOptions,
} from './handwriting'