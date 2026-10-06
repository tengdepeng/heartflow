// ============================================================
// 镜我 · 人格建模引擎（P15-7）
// 对话风格、价值观提取、成长轨迹、自我认知报告、演化预测
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { DialogueEntry } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 对话风格维度 */
export type StyleDimension =
  | 'conciseness'     // 简洁度
  | 'formality'       // 正式度
  | 'emotionality'    // 情感表达
  | 'directness'      // 直接度
  | 'reflectiveness'  // 反思倾向
  | 'creativity'      // 创造力
  | 'analytical'      // 分析性
  | 'social_warmth'   // 社交温度

/** 对话风格画像 */
export interface StyleProfile {
  /** 维度评分 (0-1) */
  dimensions: Record<StyleDimension, number>
  /** 主导风格标签 */
  dominantStyles: string[]
  /** 对话长度偏好 */
  lengthPreference: {
    averageLength: number
    medianLength: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }
  /** 常用词汇 */
  frequentWords: { word: string; count: number }[]
  /** 常用句式 */
  sentencePatterns: { pattern: string; frequency: number }[]
  /** 分析时间 */
  analyzedAt: string
  /** 样本数量 */
  sampleSize: number
}

/** 价值观维度 */
export type ValueDimension =
  | 'autonomy'        // 自主性
  | 'growth'          // 成长
  | 'connection'      // 连接
  | 'contribution'    // 贡献
  | 'security'        // 安全感
  | 'pleasure'        // 愉悦
  | 'achievement'     // 成就
  | 'authenticity'    // 真实
  | 'balance'         // 平衡
  | 'curiosity'       // 好奇心

/** 价值观条目 */
export interface ValueEntry {
  /** 维度 */
  dimension: ValueDimension
  /** 标签 */
  label: string
  /** 得分 (0-1) */
  score: number
  /** 置信度 */
  confidence: number
  /** 支撑证据 */
  evidence: string[]
  /** 是否核心价值观 */
  isCore: boolean
}

/** 价值观画像 */
export interface ValueProfile {
  /** 价值观条目列表 */
  values: ValueEntry[]
  /** 核心价值观 */
  coreValues: ValueEntry[]
  /** 价值观冲突 */
  conflicts: {
    dimensionA: ValueDimension
    dimensionB: ValueDimension
    description: string
  }[]
  /** 分析时间 */
  analyzedAt: string
  /** 样本数量 */
  sampleSize: number
}

/** 成长轨迹节点 */
export interface GrowthNode {
  /** 日期 */
  date: string
  /** 风格画像快照 */
  styleSnapshot: StyleProfile
  /** 价值观画像快照 */
  valueSnapshot: ValueProfile
  /** 关键事件 */
  keyEvents: string[]
  /** 阶段性变化描述 */
  phaseDescription: string
  /** 成长阶段 */
  phase: 'initial' | 'exploration' | 'consolidation' | 'transformation' | 'integration'
}

/** 成长轨迹 */
export interface GrowthTrajectory {
  /** 节点列表 */
  nodes: GrowthNode[]
  /** 起始时间 */
  startDate: string
  /** 最新时间 */
  lastDate: string
  /** 总变化量 */
  totalChange: number
  /** 稳定性评分 */
  stabilityScore: number
  /** 关键转折点 */
  turningPoints: GrowthNode[]
}

/** 自我认知维度 */
export type SelfAwarenessDimension =
  | 'strengths'       // 优势
  | 'growth_areas'    // 成长空间
  | 'patterns'        // 行为模式
  | 'blind_spots'     // 盲点
  | 'potentials'      // 潜力
  | 'needs'           // 需求

/** 自我认知报告 */
export interface SelfAwarenessReport {
  /** 报告 ID */
  id: string
  /** 生成时间 */
  generatedAt: string
  /** 整体描述 */
  summary: string
  /** 各维度分析 */
  dimensions: {
    dimension: SelfAwarenessDimension
    label: string
    content: string
    confidence: number
  }[]
  /** 当前风格画像 */
  styleProfile: StyleProfile
  /** 当前价值观画像 */
  valueProfile: ValueProfile
  /** 成长轨迹摘要 */
  growthSummary: string
  /** 个性化建议 */
  recommendations: string[]
  /** 报告版本 */
  version: number
}

/** 演化预测 */
export interface EvolutionPrediction {
  /** 预测 ID */
  id: string
  /** 预测时间 */
  predictedAt: string
  /** 预测时间范围 */
  horizon: '1_month' | '3_months' | '6_months' | '1_year'
  /** 风格变化预测 */
  stylePredictions: {
    dimension: StyleDimension
    current: number
    predicted: number
    direction: 'increasing' | 'decreasing' | 'stable'
    confidence: number
  }[]
  /** 价值观变化预测 */
  valuePredictions: {
    dimension: ValueDimension
    current: number
    predicted: number
    direction: 'increasing' | 'decreasing' | 'stable'
    confidence: number
  }[]
  /** 可能的发展方向 */
  possiblePaths: {
    label: string
    description: string
    probability: number
    keyChanges: string[]
  }[]
  /** 预测置信度 */
  overallConfidence: number
  /** 预测依据 */
  basis: string[]
}

/** 人格建模引擎配置 */
export interface PersonalityModelConfig {
  /** 风格分析所需最小对话数 */
  minDialoguesForStyle: number
  /** 价值观分析所需最小对话数 */
  minDialoguesForValues: number
  /** 成长轨迹取样间隔（天） */
  trajectorySamplingInterval: number
  /** 核心价值观阈值 */
  coreValueThreshold: number
  /** 预测模型灵敏度 */
  predictionSensitivity: number
  /** 是否启用自动分析 */
  autoAnalysis: boolean
}

// ============================================================
// 元数据
// ============================================================

/** 风格维度元数据 */
export const STYLE_DIMENSION_META: Record<StyleDimension, {
  label: string
  description: string
  highLabel: string
  lowLabel: string
}> = {
  conciseness: { label: '简洁度', description: '表达的精简程度', highLabel: '精简', lowLabel: '详实' },
  formality: { label: '正式度', description: '语言的正式程度', highLabel: '正式', lowLabel: '随意' },
  emotionality: { label: '情感表达', description: '情感词汇的使用频率', highLabel: '感性', lowLabel: '理性' },
  directness: { label: '直接度', description: '表达的直截了当程度', highLabel: '直接', lowLabel: '委婉' },
  reflectiveness: { label: '反思倾向', description: '自我反思的深度', highLabel: '内省', lowLabel: '务实' },
  creativity: { label: '创造力', description: '想象力和创新表达', highLabel: '创意', lowLabel: '务实' },
  analytical: { label: '分析性', description: '逻辑分析倾向', highLabel: '分析', lowLabel: '直觉' },
  social_warmth: { label: '社交温度', description: '社交互动中的温暖程度', highLabel: '温暖', lowLabel: '冷静' },
}

/** 价值观维度元数据 */
export const VALUE_DIMENSION_META: Record<ValueDimension, {
  label: string
  description: string
}> = {
  autonomy: { label: '自主性', description: '追求独立自主、自我决定' },
  growth: { label: '成长', description: '追求持续学习与个人发展' },
  connection: { label: '连接', description: '追求与他人的深度连接' },
  contribution: { label: '贡献', description: '追求对他人和社会的贡献' },
  security: { label: '安全感', description: '追求稳定、安全与可预测' },
  pleasure: { label: '愉悦', description: '追求快乐、享受与满足' },
  achievement: { label: '成就', description: '追求目标达成与卓越' },
  authenticity: { label: '真实', description: '追求真实自我表达' },
  balance: { label: '平衡', description: '追求工作与生活的平衡' },
  curiosity: { label: '好奇心', description: '追求探索与发现' },
}

/** 成长阶段元数据 */
export const GROWTH_PHASE_META: Record<GrowthNode['phase'], {
  label: string
  description: string
  icon: string
}> = {
  initial: { label: '初始阶段', description: '自我认知的起点', icon: '🌱' },
  exploration: { label: '探索阶段', description: '广泛尝试与发现', icon: '🔍' },
  consolidation: { label: '巩固阶段', description: '深化理解与内化', icon: '🏗️' },
  transformation: { label: '转型阶段', description: '重大转变与突破', icon: '🦋' },
  integration: { label: '整合阶段', description: '和谐统一与圆融', icon: '🌐' },
}

// ============================================================
// 存储键
// ============================================================

const STORAGE_KEYS = {
  STYLE_PROFILES: 'hf:mirror:style_profiles',
  VALUE_PROFILES: 'hf:mirror:value_profiles',
  TRAJECTORIES: 'hf:mirror:trajectories',
  REPORTS: 'hf:mirror:reports',
  PREDICTIONS: 'hf:mirror:predictions',
  CONFIG: 'hf:mirror:personality_config',
} as const

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_PERSONALITY_CONFIG: PersonalityModelConfig = {
  minDialoguesForStyle: 20,
  minDialoguesForValues: 50,
  trajectorySamplingInterval: 7,
  coreValueThreshold: 0.7,
  predictionSensitivity: 0.5,
  autoAnalysis: true,
}

// ============================================================
// 工具函数
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function now(): string {
  return new Date().toISOString()
}

type WordCountMap = Map<string, number>

// ============================================================
// 中文分词（简化版）
// ============================================================

/** 停用词列表 */
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
  '什么', '怎么', '如何', '为什么', '因为', '所以', '但是', '虽然',
  '可以', '这个', '那个', '如果', '还是', '已经', '而且', '不过',
  '吧', '吗', '呢', '啊', '哦', '嗯', '额', '哈', '呵', '嘛',
])

/** 简单分词：按字符 n-gram 提取词 */
function tokenize(text: string): string[] {
  const cleaned = text.replace(/[，。！？；：、""''（）【】《》\s,.!?;:'"()\[\]{}<>]/g, ' ')
  const words: string[] = []

  // 2-gram 分词
  const chars = cleaned.split('')
  for (let i = 0; i < chars.length - 1; i++) {
    const bigram = chars[i] + chars[i + 1]
    if (!STOP_WORDS.has(bigram) && bigram.trim().length === 2) {
      words.push(bigram)
    }
  }

  return words
}

/** 词频统计 */
function wordFrequency(texts: string[]): WordCountMap {
  const freq = new Map<string, number>()
  for (const text of texts) {
    const words = tokenize(text)
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1)
    }
  }
  return freq
}

// ============================================================
// 人格建模引擎 Composable
// ============================================================

export function usePersonalityModel(
  getDialogues: () => DialogueEntry[],
) {
  // ---- 配置 ----
  const config = ref<PersonalityModelConfig>(loadConfig())

  function loadConfig(): PersonalityModelConfig {
    try {
      const saved = storage.getKV<PersonalityModelConfig>(STORAGE_KEYS.CONFIG, DEFAULT_PERSONALITY_CONFIG)
      return { ...DEFAULT_PERSONALITY_CONFIG, ...saved }
    } catch {
      return { ...DEFAULT_PERSONALITY_CONFIG }
    }
  }

  function persistConfig() {
    storage.setKV(STORAGE_KEYS.CONFIG, config.value)
  }

  // ---- 风格画像 ----
  const styleProfiles = ref<StyleProfile[]>(loadStyleProfiles())

  function loadStyleProfiles(): StyleProfile[] {
    try {
      return storage.getKV<StyleProfile[]>(STORAGE_KEYS.STYLE_PROFILES, [])
    } catch {
      return []
    }
  }

  function persistStyleProfiles() {
    storage.setKV(STORAGE_KEYS.STYLE_PROFILES, styleProfiles.value)
  }

  /** 分析对话风格 */
  function analyzeStyle(): StyleProfile | null {
    const dialogues = getDialogues()
    const userDialogues = dialogues.filter(d => d.role === 'user')

    if (userDialogues.length < config.value.minDialoguesForStyle) return null

    const texts = userDialogues.map(d => d.text)
    const lengths = texts.map(t => t.length)

    // 计算平均/中位长度
    const sortedLengths = [...lengths].sort((a, b) => a - b)
    const averageLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)]

    // 长度趋势
    const half = Math.floor(texts.length / 2)
    const recentAvg = texts.slice(-half).reduce((a, t) => a + t.length, 0) / half
    const earlierAvg = texts.slice(0, half).reduce((a, t) => a + t.length, 0) / half
    const lengthTrend: 'increasing' | 'stable' | 'decreasing' =
      recentAvg > earlierAvg * 1.1 ? 'increasing'
      : recentAvg < earlierAvg * 0.9 ? 'decreasing'
      : 'stable'

    // 词频分析
    const freq = wordFrequency(texts)
    const frequentWords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }))

    // 风格维度计算
    const conciseness = calculateConciseness(texts)
    const formality = calculateFormality(texts)
    const emotionality = calculateEmotionality(texts)
    const directness = calculateDirectness(texts)
    const reflectiveness = calculateReflectiveness(texts)
    const creativity = calculateCreativity(texts, frequentWords)
    const analytical = calculateAnalytical(texts)
    const socialWarmth = calculateSocialWarmth(texts)

    const dimensions: Record<StyleDimension, number> = {
      conciseness, formality, emotionality, directness,
      reflectiveness, creativity, analytical, social_warmth: socialWarmth,
    }

    // 确定主导风格
    const dominantStyles = Object.entries(dimensions)
      .filter(([, v]) => v > 0.6)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => STYLE_DIMENSION_META[k as StyleDimension].label)

    // 句式分析
    const sentencePatterns = analyzeSentencePatterns(texts)

    const profile: StyleProfile = {
      dimensions,
      dominantStyles,
      lengthPreference: {
        averageLength,
        medianLength,
        trend: lengthTrend,
      },
      frequentWords,
      sentencePatterns,
      analyzedAt: now(),
      sampleSize: texts.length,
    }

    styleProfiles.value = [profile, ...styleProfiles.value].slice(0, 52)
    persistStyleProfiles()
    return profile
  }

  /** 获取最新风格画像 */
  function getLatestStyleProfile(): StyleProfile | null {
    return styleProfiles.value[0] || null
  }

  // ---- 价值观画像 ----
  const valueProfiles = ref<ValueProfile[]>(loadValueProfiles())

  function loadValueProfiles(): ValueProfile[] {
    try {
      return storage.getKV<ValueProfile[]>(STORAGE_KEYS.VALUE_PROFILES, [])
    } catch {
      return []
    }
  }

  function persistValueProfiles() {
    storage.setKV(STORAGE_KEYS.VALUE_PROFILES, valueProfiles.value)
  }

  /** 分析价值观 */
  function analyzeValues(): ValueProfile | null {
    const dialogues = getDialogues()
    const userDialogues = dialogues.filter(d => d.role === 'user')

    if (userDialogues.length < config.value.minDialoguesForValues) return null

    const texts = userDialogues.map(d => d.text)
    const combined = texts.join(' ')

    const values: ValueEntry[] = []
    const coreValues: ValueEntry[] = []

    for (const [dimension, meta] of Object.entries(VALUE_DIMENSION_META)) {
      const { score, confidence, evidence } = extractValueScore(
        dimension as ValueDimension,
        texts,
        combined,
      )

      const entry: ValueEntry = {
        dimension: dimension as ValueDimension,
        label: meta.label,
        score,
        confidence,
        evidence,
        isCore: score >= config.value.coreValueThreshold,
      }

      values.push(entry)
      if (entry.isCore) coreValues.push(entry)
    }

    // 检测价值观冲突
    const conflicts = detectValueConflicts(values)

    const profile: ValueProfile = {
      values,
      coreValues,
      conflicts,
      analyzedAt: now(),
      sampleSize: texts.length,
    }

    valueProfiles.value = [profile, ...valueProfiles.value].slice(0, 52)
    persistValueProfiles()
    return profile
  }

  /** 获取最新价值观画像 */
  function getLatestValueProfile(): ValueProfile | null {
    return valueProfiles.value[0] || null
  }

  // ---- 成长轨迹 ----
  const trajectories = ref<GrowthTrajectory[]>(loadTrajectories())

  function loadTrajectories(): GrowthTrajectory[] {
    try {
      return storage.getKV<GrowthTrajectory[]>(STORAGE_KEYS.TRAJECTORIES, [])
    } catch {
      return []
    }
  }

  function persistTrajectories() {
    storage.setKV(STORAGE_KEYS.TRAJECTORIES, trajectories.value)
  }

  /** 构建成长轨迹 */
  function buildTrajectory(): GrowthTrajectory | null {
    const dialogues = getDialogues()
    const userDialogues = dialogues.filter(d => d.role === 'user')

    if (userDialogues.length < config.value.minDialoguesForStyle) return null

    const sortedDialogues = [...userDialogues].sort((a, b) => a.timestamp - b.timestamp)
    const startDate = getLocalDateKey(new Date(sortedDialogues[0].timestamp))
    const lastDate = getLocalDateKey(new Date(sortedDialogues[sortedDialogues.length - 1].timestamp))

    // 按时间间隔取样
    const interval = config.value.trajectorySamplingInterval
    const nodes: GrowthNode[] = []
    const dates = new Set<string>()

    for (const d of sortedDialogues) {
      const date = getLocalDateKey(new Date(d.timestamp))
      dates.add(date)
    }

    const sortedDates = Array.from(dates).sort()

    for (let i = 0; i < sortedDates.length; i += interval) {
      const date = sortedDates[i]
      const dateDialogues = sortedDialogues.filter(
        d => getLocalDateKey(new Date(d.timestamp)) <= date,
      )
      const dateTexts = dateDialogues.map(d => d.text)

      if (dateTexts.length < config.value.minDialoguesForStyle) continue

      // 生成该时间点的风格快照
      const styleSnapshot = analyzeStyleSnapshot(dateTexts)

      // 生成价值观快照
      const valueSnapshot = analyzeValueSnapshot(dateTexts, dateDialogues)

      // 关键事件
      const keyEvents = detectKeyEvents(dateDialogues)

      // 阶段判断
      const phase = determinePhase(i, sortedDates.length, sortedDialogues)

      const midIndex = Math.floor(dateTexts.length / 2)
      const recentHalf = dateTexts.slice(midIndex)
      const earlierHalf = dateTexts.slice(0, midIndex)

      const phaseDescription = generatePhaseDescription(phase, styleSnapshot, recentHalf, earlierHalf)

      nodes.push({
        date,
        styleSnapshot,
        valueSnapshot,
        keyEvents,
        phaseDescription,
        phase,
      })
    }

    if (nodes.length < 2) return null

    // 总变化量
    const firstNode = nodes[0]
    const lastNode = nodes[nodes.length - 1]
    const totalChange = calculateTotalChange(firstNode, lastNode)

    // 稳定性评分
    const stabilityScore = calculateStability(nodes)

    // 关键转折点
    const turningPoints = detectTurningPoints(nodes)

    const trajectory: GrowthTrajectory = {
      nodes,
      startDate,
      lastDate,
      totalChange,
      stabilityScore,
      turningPoints,
    }

    trajectories.value = [trajectory, ...trajectories.value].slice(0, 10)
    persistTrajectories()
    return trajectory
  }

  /** 获取最新成长轨迹 */
  function getLatestTrajectory(): GrowthTrajectory | null {
    return trajectories.value[0] || null
  }

  // ---- 自我认知报告 ----
  const reports = ref<SelfAwarenessReport[]>(loadReports())

  function loadReports(): SelfAwarenessReport[] {
    try {
      return storage.getKV<SelfAwarenessReport[]>(STORAGE_KEYS.REPORTS, [])
    } catch {
      return []
    }
  }

  function persistReports() {
    storage.setKV(STORAGE_KEYS.REPORTS, reports.value)
  }

  /** 生成自我认知报告 */
  function generateReport(): SelfAwarenessReport | null {
    const styleProfile = getLatestStyleProfile()
    const valueProfile = getLatestValueProfile()
    const trajectory = getLatestTrajectory()

    if (!styleProfile && !valueProfile) return null

    // 分析风格
    const styleProfile_ = styleProfile || analyzeStyle()
    const valueProfile_ = valueProfile || analyzeValues()

    if (!styleProfile_ || !valueProfile_) return null

    const summary = generateSummary(styleProfile_, valueProfile_, trajectory)

    const dimensions: SelfAwarenessReport['dimensions'] = [
      generateStrengthsAnalysis(styleProfile_, valueProfile_),
      generateGrowthAreasAnalysis(styleProfile_, valueProfile_),
      generatePatternsAnalysis(styleProfile_, trajectory),
      generateBlindSpotsAnalysis(styleProfile_, valueProfile_),
      generatePotentialsAnalysis(styleProfile_, valueProfile_, trajectory),
      generateNeedsAnalysis(valueProfile_),
    ]

    const growthSummary = trajectory
      ? `在过去的时间段（${trajectory.startDate} 至 ${trajectory.lastDate}）中，你经历了 ${trajectory.nodes.length} 个成长阶段，总体变化量为 ${Math.round(trajectory.totalChange * 100)}%。${trajectory.stabilityScore > 0.7 ? '你的核心特质相对稳定。' : '你正处于快速变化期。'}`
      : '暂无足够的成长数据。'

    const recommendations = generateRecommendations(styleProfile_, valueProfile_, trajectory)

    const previousVersion = reports.value[0]?.version || 0

    const report: SelfAwarenessReport = {
      id: generateId('report'),
      generatedAt: now(),
      summary,
      dimensions,
      styleProfile: styleProfile_,
      valueProfile: valueProfile_,
      growthSummary,
      recommendations,
      version: previousVersion + 1,
    }

    reports.value = [report, ...reports.value].slice(0, 52)
    persistReports()
    return report
  }

  /** 获取最新报告 */
  function getLatestReport(): SelfAwarenessReport | null {
    return reports.value[0] || null
  }

  // ---- 演化预测 ----
  const predictions = ref<EvolutionPrediction[]>(loadPredictions())

  function loadPredictions(): EvolutionPrediction[] {
    try {
      return storage.getKV<EvolutionPrediction[]>(STORAGE_KEYS.PREDICTIONS, [])
    } catch {
      return []
    }
  }

  function persistPredictions() {
    storage.setKV(STORAGE_KEYS.PREDICTIONS, predictions.value)
  }

  /** 生成演化预测 */
  function predictEvolution(
    horizon: EvolutionPrediction['horizon'] = '3_months',
  ): EvolutionPrediction | null {
    const styleProfiles_ = styleProfiles.value
    const valueProfiles_ = valueProfiles.value
    const trajectory = getLatestTrajectory()

    if (styleProfiles_.length < 2 || valueProfiles_.length < 2) return null

    const latestStyle = styleProfiles_[0]
    const latestValue = valueProfiles_[0]

    // 风格预测
    const stylePredictions: EvolutionPrediction['stylePredictions'] = []
    for (const dimension of Object.keys(latestStyle.dimensions) as StyleDimension[]) {
      const current = latestStyle.dimensions[dimension]
      const trend = calculateTrend(
        styleProfiles_.map(p => p.dimensions[dimension]),
      )

      const direction = trend > 0.02 ? 'increasing' : trend < -0.02 ? 'decreasing' : 'stable'
      const horizonFactor = horizon === '1_month' ? 0.3 : horizon === '3_months' ? 0.6 : horizon === '6_months' ? 0.8 : 1.0
      const predicted = Math.min(1, Math.max(0, current + trend * horizonFactor * 5))

      stylePredictions.push({
        dimension,
        current,
        predicted,
        direction,
        confidence: Math.min(1, 0.5 + Math.abs(trend) * 5),
      })
    }

    // 价值观预测
    const valuePredictions: EvolutionPrediction['valuePredictions'] = []
    for (const dimension of Object.keys(VALUE_DIMENSION_META) as ValueDimension[]) {
      const currentEntry = latestValue.values.find(v => v.dimension === dimension)
      const current = currentEntry?.score || 0.5
      const trend = calculateTrend(
        valueProfiles_.map(p => p.values.find(v => v.dimension === dimension)?.score || 0.5),
      )

      const direction = trend > 0.02 ? 'increasing' : trend < -0.02 ? 'decreasing' : 'stable'
      const horizonFactor = horizon === '1_month' ? 0.3 : horizon === '3_months' ? 0.6 : horizon === '6_months' ? 0.8 : 1.0
      const predicted = Math.min(1, Math.max(0, current + trend * horizonFactor * 5))

      valuePredictions.push({
        dimension,
        current,
        predicted,
        direction,
        confidence: Math.min(1, 0.5 + Math.abs(trend) * 5),
      })
    }

    // 可能的发展路径
    const possiblePaths = generatePossiblePaths(
      stylePredictions,
      valuePredictions,
      latestStyle,
      latestValue,
      trajectory,
    )

    // 整体置信度
    const overallConfidence = Math.min(1,
      (stylePredictions.reduce((s, p) => s + p.confidence, 0) / stylePredictions.length) * 0.5 +
      (valuePredictions.reduce((s, p) => s + p.confidence, 0) / valuePredictions.length) * 0.5,
    )

    const basis: string[] = []
    if (trajectory) {
      basis.push(`基于 ${trajectory.nodes.length} 个成长阶段的数据`)
      basis.push(`稳定性评分: ${Math.round(trajectory.stabilityScore * 100)}%`)
    }
    basis.push(`风格画像历史快照: ${styleProfiles_.length} 个`)
    basis.push(`价值观画像历史快照: ${valueProfiles_.length} 个`)

    const prediction: EvolutionPrediction = {
      id: generateId('predict'),
      predictedAt: now(),
      horizon,
      stylePredictions,
      valuePredictions,
      possiblePaths,
      overallConfidence,
      basis,
    }

    predictions.value = [prediction, ...predictions.value].slice(0, 20)
    persistPredictions()
    return prediction
  }

  /** 获取最新预测 */
  function getLatestPrediction(): EvolutionPrediction | null {
    return predictions.value[0] || null
  }

  // ---- 综合画像 ----

  /** 获取完整人格画像 */
  function getFullProfile(): {
    style: StyleProfile | null
    values: ValueProfile | null
    trajectory: GrowthTrajectory | null
    report: SelfAwarenessReport | null
    prediction: EvolutionPrediction | null
  } {
    return {
      style: getLatestStyleProfile(),
      values: getLatestValueProfile(),
      trajectory: getLatestTrajectory(),
      report: getLatestReport(),
      prediction: getLatestPrediction(),
    }
  }

  return {
    // 配置
    config,
    updateConfig: (partial: Partial<PersonalityModelConfig>) => {
      config.value = { ...config.value, ...partial }
      persistConfig()
    },

    // 风格画像
    styleProfiles: computed(() => styleProfiles.value),
    analyzeStyle,
    getLatestStyleProfile,

    // 价值观画像
    valueProfiles: computed(() => valueProfiles.value),
    analyzeValues,
    getLatestValueProfile,

    // 成长轨迹
    trajectories: computed(() => trajectories.value),
    buildTrajectory,
    getLatestTrajectory,

    // 自我认知报告
    reports: computed(() => reports.value),
    generateReport,
    getLatestReport,

    // 演化预测
    predictions: computed(() => predictions.value),
    predictEvolution,
    getLatestPrediction,

    // 综合画像
    getFullProfile,
  }
}

// ============================================================
// 风格维度计算函数
// ============================================================

/** 简洁度：短句子比例 */
function calculateConciseness(texts: string[]): number {
  if (texts.length === 0) return 0.5
  const shortCount = texts.filter(t => t.length < 30).length
  return Math.min(1, shortCount / texts.length)
}

/** 正式度：正式词汇占比 */
function calculateFormality(texts: string[]): number {
  const formalWords = ['您', '请', '谢谢', '感谢', '抱歉', '麻烦', '烦请', '能否', '是否', '应当', '建议', '认为']
  let formalCount = 0
  let total = 0
  for (const text of texts) {
    for (const word of formalWords) {
      if (text.includes(word)) formalCount++
    }
    total += formalWords.length
  }
  return total > 0 ? Math.min(1, formalCount / total * 3) : 0.3
}

/** 情感表达：情感词汇密度 */
function calculateEmotionality(texts: string[]): number {
  const emotionWords = [
    '开心', '难过', '愤怒', '焦虑', '平静', '兴奋', '失落', '感动',
    '喜欢', '讨厌', '爱', '恨', '快乐', '悲伤', '幸福', '痛苦',
    '感动', '激动', '沮丧', '惊喜', '期待', '害怕', '担心', '满足',
    '好', '棒', '赞', '太', '非常', '特别', '极其', '格外',
  ]
  let emotionCount = 0
  let totalChars = 0
  for (const text of texts) {
    for (const word of emotionWords) {
      let idx = 0
      while ((idx = text.indexOf(word, idx)) !== -1) {
        emotionCount++
        idx += word.length
      }
    }
    totalChars += text.length
  }
  return totalChars > 0 ? Math.min(1, emotionCount / (totalChars / 10)) : 0.3
}

/** 直接度：直接表达占比 */
function calculateDirectness(texts: string[]): number {
  const directPatterns = ['我要', '我想', '我做', '我决定', '我不', '我就是', '直接', '马上', '现在']
  const indirectPatterns = ['可能', '也许', '大概', '或许', '好像', '似乎', '感觉', '应该可以', '考虑一下', '再说']
  let directCount = 0
  let indirectCount = 0
  for (const text of texts) {
    for (const p of directPatterns) if (text.includes(p)) directCount++
    for (const p of indirectPatterns) if (text.includes(p)) indirectCount++
  }
  const total = directCount + indirectCount
  return total > 0 ? directCount / total : 0.5
}

/** 反思倾向：反思性词汇密度 */
function calculateReflectiveness(texts: string[]): number {
  const reflectWords = [
    '反思', '回顾', '为什么', '原因', '总结', '复盘', '思考',
    '觉得', '认为', '发现', '意识到', '明白', '理解', '认识',
    '改变', '成长', '进步', '学到', '教训', '经验', '收获',
    '我', '自己', '自我', '内心', '深处',
  ]
  let reflectCount = 0
  let totalChars = 0
  for (const text of texts) {
    for (const word of reflectWords) {
      let idx = 0
      while ((idx = text.indexOf(word, idx)) !== -1) {
        reflectCount++
        idx += word.length
      }
    }
    totalChars += text.length
  }
  return totalChars > 0 ? Math.min(1, reflectCount / (totalChars / 15)) : 0.3
}

/** 创造力：创新词汇密度 */
function calculateCreativity(
  texts: string[],
  _frequentWords: { word: string; count: number }[],
): number {
  const creativeWords = ['创造', '想象', '如果', '假设', '也许可以', '试试', '新', '不同', '有趣', '有意思', '独特', '特别', '创意']
  let creativeCount = 0
  let totalChars = 0
  for (const text of texts) {
    for (const word of creativeWords) {
      if (text.includes(word)) creativeCount++
    }
    totalChars += text.length
  }
  return totalChars > 0 ? Math.min(1, creativeCount / (totalChars / 50)) : 0.3
}

/** 分析性：逻辑连接词密度 */
function calculateAnalytical(texts: string[]): number {
  const analyticalWords = ['因为', '所以', '如果', '那么', '首先', '其次', '最后', '总结', '因此', '基于', '分析', '数据', '逻辑', '原因', '结果']
  let analyticalCount = 0
  let totalChars = 0
  for (const text of texts) {
    for (const word of analyticalWords) {
      if (text.includes(word)) analyticalCount++
    }
    totalChars += text.length
  }
  return totalChars > 0 ? Math.min(1, analyticalCount / (totalChars / 50)) : 0.3
}

/** 社交温度：温暖词汇密度 */
function calculateSocialWarmth(texts: string[]): number {
  const warmWords = ['谢谢', '辛苦', '加油', '没关系', '没事', '好的', '真棒', '厉害', '一起', '我们', '帮忙', '支持', '陪伴', '关心']
  let warmCount = 0
  let totalChars = 0
  for (const text of texts) {
    for (const word of warmWords) {
      if (text.includes(word)) warmCount++
    }
    totalChars += text.length
  }
  return totalChars > 0 ? Math.min(1, warmCount / (totalChars / 50)) : 0.4
}

/** 句式分析 */
function analyzeSentencePatterns(
  texts: string[],
): { pattern: string; frequency: number }[] {
  const patterns: Record<string, number> = {}

  for (const text of texts) {
    if (text.includes('我觉得')) patterns['我觉得...'] = (patterns['我觉得...'] || 0) + 1
    if (text.includes('为什么')) patterns['为什么...？'] = (patterns['为什么...？'] || 0) + 1
    if (text.includes('我想')) patterns['我想...'] = (patterns['我想...'] || 0) + 1
    if (text.includes('今天')) patterns['今天...'] = (patterns['今天...'] || 0) + 1
    if (text.includes('最近')) patterns['最近...'] = (patterns['最近...'] || 0) + 1
    if (text.includes('能不能')) patterns['能不能...？'] = (patterns['能不能...？'] || 0) + 1
    if (text.includes('如何')) patterns['如何...？'] = (patterns['如何...？'] || 0) + 1
    if (text.endsWith('吗')) patterns['...吗？'] = (patterns['...吗？'] || 0) + 1
    if (text.endsWith('吧')) patterns['...吧'] = (patterns['...吧'] || 0) + 1
  }

  return Object.entries(patterns)
    .map(([pattern, frequency]) => ({
      pattern,
      frequency: frequency / texts.length,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10)
}

// ============================================================
// 价值观分析函数
// ============================================================

/** 提取价值观评分 */
function extractValueScore(
  dimension: ValueDimension,
  texts: string[],
  _combined: string,
): { score: number; confidence: number; evidence: string[] } {
  const keywordMap: Record<ValueDimension, string[]> = {
    autonomy: ['自己做', '独立', '自主', '自由', '选择', '决定', '我想', '我要', '不愿意被', '自己决定'],
    growth: ['学习', '成长', '进步', '提升', '发展', '变得更好', '努力', '练习', '掌握', '理解'],
    connection: ['朋友', '家人', '关系', '陪伴', '一起', '分享', '交流', '聊天', '理解我', '支持'],
    contribution: ['帮助', '贡献', '给予', '分享', '支持', '鼓励', '指导', '传授', '影响', '改变'],
    security: ['安全', '稳定', '保障', '确定', '安心', '放心', '可靠', '控制', '规划', '安排'],
    pleasure: ['开心', '快乐', '享受', '喜欢', '好吃', '好玩', '有趣', '放松', '娱乐', '美好'],
    achievement: ['完成', '达成', '目标', '成功', '突破', '超越', '优秀', '第一', '最好', '做到'],
    authenticity: ['真实', '诚实', '真诚', '自己', '本来', '伪装', '假装', '真实感受', '坦率', '实话'],
    balance: ['平衡', '休息', '放松', '工作', '生活', '节奏', '调整', '适度', '兼顾', '劳逸'],
    curiosity: ['为什么', '好奇', '探索', '发现', '了解', '想知道', '试试', '新鲜', '未知', '有趣'],
  }

  const keywords = keywordMap[dimension]
  let matchCount = 0
  const evidence: string[] = []

  for (const text of texts) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matchCount++
        if (evidence.length < 5 && text.length > 10) {
          evidence.push(text.slice(0, 50) + (text.length > 50 ? '...' : ''))
        }
        break
      }
    }
  }

  const score = Math.min(1, matchCount / (texts.length * 0.3))
  const confidence = Math.min(1, 0.3 + (matchCount / texts.length) * 2)

  return { score, confidence, evidence }
}

/** 检测价值观冲突 */
function detectValueConflicts(values: ValueEntry[]): ValueProfile['conflicts'] {
  const conflicts: ValueProfile['conflicts'] = []
  const conflictPairs: [ValueDimension, ValueDimension, string][] = [
    ['autonomy', 'connection', '自主性与连接需求之间的矛盾：既想独立自主，又渴望深度连接'],
    ['security', 'curiosity', '安全与探索之间的矛盾：既想稳定可预测，又渴望新鲜未知'],
    ['achievement', 'balance', '成就与平衡之间的矛盾：追求卓越的同时需要照顾身心健康'],
    ['authenticity', 'pleasure', '真实与愉悦之间的矛盾：表达真实自我有时需要面对不适'],
    ['growth', 'security', '成长与安全之间的矛盾：成长需要冒险，安全需要稳定'],
  ]

  for (const [dimA, dimB, desc] of conflictPairs) {
    const valA = values.find(v => v.dimension === dimA)
    const valB = values.find(v => v.dimension === dimB)
    if (valA && valB && valA.score > 0.5 && valB.score > 0.5) {
      conflicts.push({ dimensionA: dimA, dimensionB: dimB, description: desc })
    }
  }

  return conflicts.slice(0, 3)
}

// ============================================================
// 成长轨迹函数
// ============================================================

/** 生成风格快照（简化版） */
function analyzeStyleSnapshot(texts: string[]): StyleProfile {
  return {
    dimensions: {
      conciseness: calculateConciseness(texts),
      formality: calculateFormality(texts),
      emotionality: calculateEmotionality(texts),
      directness: calculateDirectness(texts),
      reflectiveness: calculateReflectiveness(texts),
      creativity: calculateCreativity(texts, []),
      analytical: calculateAnalytical(texts),
      social_warmth: calculateSocialWarmth(texts),
    },
    dominantStyles: [],
    lengthPreference: {
      averageLength: texts.length > 0 ? Math.round(texts.reduce((a, t) => a + t.length, 0) / texts.length) : 0,
      medianLength: 0,
      trend: 'stable',
    },
    frequentWords: [],
    sentencePatterns: [],
    analyzedAt: now(),
    sampleSize: texts.length,
  }
}

/** 生成价值观快照（简化版） */
function analyzeValueSnapshot(
  texts: string[],
  _dialogues: DialogueEntry[],
): ValueProfile {
  const combined = texts.join(' ')
  const values: ValueEntry[] = []

  for (const [dimension, meta] of Object.entries(VALUE_DIMENSION_META)) {
    const { score, confidence, evidence } = extractValueScore(
      dimension as ValueDimension,
      texts,
      combined,
    )
    values.push({
      dimension: dimension as ValueDimension,
      label: meta.label,
      score,
      confidence,
      evidence,
      isCore: score >= 0.7,
    })
  }

  return {
    values,
    coreValues: values.filter(v => v.isCore),
    conflicts: [],
    analyzedAt: now(),
    sampleSize: texts.length,
  }
}

/** 检测关键事件 */
function detectKeyEvents(dialogues: DialogueEntry[]): string[] {
  const events: string[] = []
  const intentCounts: Record<string, number> = {}

  for (const d of dialogues) {
    if (d.parsedTask?.intent) {
      intentCounts[d.parsedTask.intent] = (intentCounts[d.parsedTask.intent] || 0) + 1
    }
  }

  const totalIntents = Object.values(intentCounts).reduce((a, b) => a + b, 0)
  if (totalIntents === 0) return events

  const topIntent = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)[0]

  if (topIntent && topIntent[1] / totalIntents > 0.3) {
    events.push(`主要关注领域: ${topIntent[0]}`)
  }

  if (dialogues.length > 10) {
    events.push(`对话活跃期 (${dialogues.length} 条对话)`)
  }

  const reflectCount = dialogues.filter(
    d => d.text.includes('反思') || d.text.includes('思考') || d.text.includes('总结'),
  ).length
  if (reflectCount > 3) {
    events.push('深度反思期')
  }

  return events
}

/** 判断成长阶段 */
function determinePhase(
  index: number,
  totalDates: number,
  dialogues: DialogueEntry[],
): GrowthNode['phase'] {
  const ratio = index / Math.max(1, totalDates - 1)

  if (ratio < 0.15) return 'initial'
  if (ratio < 0.4) return 'exploration'
  if (ratio < 0.7) return 'consolidation'

  const recentDialogues = dialogues.slice(-Math.floor(dialogues.length * 0.2))
  const hasTransformation = recentDialogues.some(
    d => d.text.includes('改变') || d.text.includes('突破') || d.text.includes('新的'),
  )

  return hasTransformation ? 'transformation' : 'integration'
}

/** 生成阶段描述 */
function generatePhaseDescription(
  phase: GrowthNode['phase'],
  _style: StyleProfile,
  _recent: string[],
  _earlier: string[],
): string {
  const descriptions: Record<GrowthNode['phase'], string> = {
    initial: '这是你探索自我的起点，开始建立自我认知的基础框架。',
    exploration: '你正在广泛尝试不同的表达方式和思维模式，寻找适合自己的方向。',
    consolidation: '你的核心特质逐渐稳定，开始深入理解自己的内在需求和价值观。',
    transformation: '你正在经历重要的转变，一些旧有模式被打破，新的可能性正在展开。',
    integration: '你的不同特质正在和谐统一，形成了更加圆融和整合的自我认知。',
  }
  return descriptions[phase]
}

/** 计算总变化量 */
function calculateTotalChange(first: GrowthNode, last: GrowthNode): number {
  const styleDims = Object.keys(first.styleSnapshot.dimensions) as StyleDimension[]
  let totalDiff = 0
  for (const dim of styleDims) {
    totalDiff += Math.abs(last.styleSnapshot.dimensions[dim] - first.styleSnapshot.dimensions[dim])
  }
  return totalDiff / styleDims.length
}

/** 计算稳定性 */
function calculateStability(nodes: GrowthNode[]): number {
  if (nodes.length < 2) return 1

  let totalVariance = 0
  const styleDims = Object.keys(nodes[0].styleSnapshot.dimensions) as StyleDimension[]

  for (const dim of styleDims) {
    const values = nodes.map(n => n.styleSnapshot.dimensions[dim])
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
    totalVariance += variance
  }

  return Math.max(0, 1 - totalVariance / styleDims.length * 2)
}

/** 检测转折点 */
function detectTurningPoints(nodes: GrowthNode[]): GrowthNode[] {
  if (nodes.length < 3) return []

  const turningPoints: GrowthNode[] = []
  for (let i = 1; i < nodes.length - 1; i++) {
    const prev = nodes[i - 1]
    const curr = nodes[i]
    const next = nodes[i + 1]

    const prevDiff = calculateNodeDifference(prev, curr)
    const nextDiff = calculateNodeDifference(curr, next)

    if (prevDiff > 0.15 && nextDiff < 0.08) {
      turningPoints.push(curr)
    }
  }

  return turningPoints.slice(0, 3)
}

function calculateNodeDifference(a: GrowthNode, b: GrowthNode): number {
  const styleDims = Object.keys(a.styleSnapshot.dimensions) as StyleDimension[]
  let totalDiff = 0
  for (const dim of styleDims) {
    totalDiff += Math.abs(b.styleSnapshot.dimensions[dim] - a.styleSnapshot.dimensions[dim])
  }
  return totalDiff / styleDims.length
}

/** 计算趋势 */
function calculateTrend(history: number[]): number {
  if (history.length < 2) return 0
  const n = history.length
  const xMean = (n - 1) / 2
  const yMean = history.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (history[i] - yMean)
    denominator += (i - xMean) ** 2
  }

  return denominator > 0 ? numerator / denominator : 0
}

// ============================================================
// 报告生成函数
// ============================================================

function generateSummary(
  style: StyleProfile,
  values: ValueProfile,
  trajectory: GrowthTrajectory | null,
): string {
  const dominantStyles = style.dominantStyles.slice(0, 2).join('、')
  const coreValues = values.coreValues.map(v => v.label).slice(0, 3).join('、')
  const phase = trajectory?.nodes[trajectory.nodes.length - 1]?.phase
  const phaseLabel = phase ? GROWTH_PHASE_META[phase].label : '探索阶段'

  return `你是一个${dominantStyles || '多元'}的沟通者，核心价值观围绕${coreValues || '自我成长'}。当前处于${phaseLabel}，${trajectory ? `整体稳定性为${Math.round(trajectory.stabilityScore * 100)}%。` : ''}你的自我认知正在不断深化。`
}

function generateStrengthsAnalysis(
  style: StyleProfile,
  values: ValueProfile,
): SelfAwarenessReport['dimensions'][0] {
  const topStyles = Object.entries(style.dimensions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => STYLE_DIMENSION_META[k as StyleDimension].label)

  const topValues = values.coreValues.slice(0, 3).map(v => v.label)

  return {
    dimension: 'strengths',
    label: '核心优势',
    content: `你的核心优势体现在：${topStyles.join('、')}等沟通风格，以及${topValues.join('、')}等核心价值观。这些特质让你在自我表达和人际互动中展现出独特的个人魅力。`,
    confidence: 0.85,
  }
}

function generateGrowthAreasAnalysis(
  style: StyleProfile,
  values: ValueProfile,
): SelfAwarenessReport['dimensions'][0] {
  const lowStyles = Object.entries(style.dimensions)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([k]) => STYLE_DIMENSION_META[k as StyleDimension].label)

  const lowValues = values.values
    .filter(v => v.score < 0.4)
    .slice(0, 2)
    .map(v => v.label)

  return {
    dimension: 'growth_areas',
    label: '成长空间',
    content: `可以重点关注的发展方向包括：${lowStyles.join('、')}等沟通维度的提升，以及${lowValues.length > 0 ? lowValues.join('、') + '等价值观的深化' : '多元价值观的平衡发展'}。`,
    confidence: 0.75,
  }
}

function generatePatternsAnalysis(
  style: StyleProfile,
  trajectory: GrowthTrajectory | null,
): SelfAwarenessReport['dimensions'][0] {
  const patterns = style.sentencePatterns.slice(0, 3).map(p => p.pattern).join('、')
  const trend = style.lengthPreference.trend === 'increasing'
    ? '趋向更详尽的表达'
    : style.lengthPreference.trend === 'decreasing'
    ? '趋向更精简的表达'
    : '保持稳定的表达长度'

  return {
    dimension: 'patterns',
    label: '行为模式',
    content: `你的典型表达模式包括${patterns}等句式，${trend}。${trajectory ? `整体稳定性为${Math.round(trajectory.stabilityScore * 100)}%，核心模式相对稳定。` : ''}`,
    confidence: 0.8,
  }
}

function generateBlindSpotsAnalysis(
  style: StyleProfile,
  values: ValueProfile,
): SelfAwarenessReport['dimensions'][0] {
  const conflicts = values.conflicts
  const conflictDesc = conflicts.length > 0
    ? `你可能存在的内在矛盾：${conflicts.map(c => c.description).join('；')}`
    : '未检测到明显的价值观冲突。'

  const lowEmotionality = style.dimensions.emotionality < 0.3
    ? '情感表达的克制可能让身边的人难以感知你的真实感受。'
    : ''

  const lowDirectness = style.dimensions.directness < 0.3
    ? '委婉的表达方式有时可能导致沟通效率降低。'
    : ''

  return {
    dimension: 'blind_spots',
    label: '潜在盲点',
    content: `${conflictDesc} ${lowEmotionality} ${lowDirectness}`.trim(),
    confidence: 0.6,
  }
}

function generatePotentialsAnalysis(
  style: StyleProfile,
  _values: ValueProfile,
  trajectory: GrowthTrajectory | null,
): SelfAwarenessReport['dimensions'][0] {
  const risingDimensions = Object.entries(style.dimensions)
    .filter(([k, v]) => {
      if (!trajectory || trajectory.nodes.length < 2) return false
      const first = trajectory.nodes[0].styleSnapshot.dimensions[k as StyleDimension]
      return v > first + 0.1
    })
    .map(([k]) => STYLE_DIMENSION_META[k as StyleDimension].label)

  return {
    dimension: 'potentials',
    label: '发展潜力',
    content: risingDimensions.length > 0
      ? `你的${risingDimensions.join('、')}等维度正在快速成长，展现出巨大的发展潜力。持续关注这些领域将带来更多突破。`
      : '你的各项特质均衡发展，具备在多个方向持续成长的基础。',
    confidence: 0.7,
  }
}

function generateNeedsAnalysis(
  values: ValueProfile,
): SelfAwarenessReport['dimensions'][0] {
  const topValues = values.coreValues.slice(0, 3).map(v => v.label).join('、')

  return {
    dimension: 'needs',
    label: '核心需求',
    content: `基于你的价值观分析，你的核心需求围绕${topValues}。建议在日常生活中有意识地满足这些需求，这将带来更深层次的满足感。`,
    confidence: 0.8,
  }
}

function generateRecommendations(
  style: StyleProfile,
  values: ValueProfile,
  trajectory: GrowthTrajectory | null,
): string[] {
  const recommendations: string[] = []

  // 基于风格的建议
  if (style.dimensions.reflectiveness < 0.4) {
    recommendations.push('尝试定期进行自我反思，记录每日的思考和感悟')
  }
  if (style.dimensions.emotionality < 0.4) {
    recommendations.push('练习更开放地表达情感，让身边的人更好理解你的内心世界')
  }
  if (style.dimensions.social_warmth < 0.4) {
    recommendations.push('增加温暖的表达，如多一些感谢和鼓励的话语')
  }

  // 基于价值观的建议
  if (values.conflicts.length > 0) {
    recommendations.push('注意调和内在价值观冲突，寻找平衡点而非极端取舍')
  }

  // 基于轨迹的建议
  if (trajectory && trajectory.stabilityScore < 0.5) {
    recommendations.push('当前处于变化期，允许自己尝试不同的表达方式，不必急于定型')
  }

  if (recommendations.length === 0) {
    recommendations.push('继续保持当前的自我探索节奏，你的成长轨迹非常健康')
    recommendations.push('可以尝试挑战新的领域，拓展自我认知的边界')
  }

  return recommendations.slice(0, 5)
}

// ============================================================
// 演化预测函数
// ============================================================

function generatePossiblePaths(
  stylePredictions: EvolutionPrediction['stylePredictions'],
  valuePredictions: EvolutionPrediction['valuePredictions'],
  _style: StyleProfile,
  _values: ValueProfile,
  trajectory: GrowthTrajectory | null,
): EvolutionPrediction['possiblePaths'] {
  const paths: EvolutionPrediction['possiblePaths'] = []

  const increasingStyles = stylePredictions.filter(p => p.direction === 'increasing')
  const increasingValues = valuePredictions.filter(p => p.direction === 'increasing')

  if (increasingStyles.find(p => p.dimension === 'reflectiveness')) {
    paths.push({
      label: '深度内省之路',
      description: '反思倾向持续增强，将发展出更深刻的自我理解能力，可能成为擅长洞察和指导他人的思考者。',
      probability: 0.6,
      keyChanges: ['反思能力增强', '自我认知深化', '表达更加内省'],
    })
  }

  if (increasingStyles.find(p => p.dimension === 'creativity')) {
    paths.push({
      label: '创意表达之路',
      description: '创造力持续提升，可能在创作领域找到新的自我表达方式，发展出独特的个人风格。',
      probability: 0.5,
      keyChanges: ['创造力提升', '表达更加多样化', '创新思维增强'],
    })
  }

  if (increasingValues.find(p => p.dimension === 'connection')) {
    paths.push({
      label: '深度连接之路',
      description: '对人际连接的重视持续增加，将建立更深厚的关系网络，成为他人的重要支持来源。',
      probability: 0.55,
      keyChanges: ['人际关系深化', '共情能力提升', '社交网络扩展'],
    })
  }

  if (trajectory && trajectory.stabilityScore > 0.7) {
    paths.push({
      label: '稳定成熟之路',
      description: '核心特质高度稳定，将持续深化现有优势，形成更加成熟和整合的人格特质。',
      probability: 0.7,
      keyChanges: ['核心特质巩固', '自我认知成熟', '人格整合深化'],
    })
  }

  if (paths.length === 0) {
    paths.push({
      label: '多元探索之路',
      description: '各项特质均衡发展，保持开放的心态探索不同方向，发展出多元化的人格特质。',
      probability: 0.6,
      keyChanges: ['多元特质发展', '适应性增强', '自我认知扩展'],
    })
  }

  return paths.slice(0, 4)
}