// ============================================================
// 镜我 · 人格画像分析引擎（INCR-35）
// 在自我认知档案（维度快照）之上，产出深度叙事画像：
//   自我认知报告六维 · 常用词汇/句式 · 演化趋势 · 成长轨迹 · 温和洞察
// 纯函数、无存储副作用；复用 personality-model 元数据 + self-cognition 基函数
// ============================================================

import type { DialogueEntry } from './types'
import { STYLE_DIMENSION_META, GROWTH_PHASE_META } from './personality-model'
import type { StyleDimension, GrowthNode } from './personality-model'
import {
  selfCognitionOverview,
  selfCognitionStyle,
  selfCognitionValues,
  selfCognitionGrowth,
} from './self-cognition-analytics'
import type {
  SelfCognitionOverview,
  StyleDimensionRow,
  ValueDimensionRow,
  SelfCognitionGrowth,
} from './self-cognition-analytics'

// ============================================================
// 类型
// ============================================================

/** 自我认知报告 · 六维条目 */
export interface PortraitReportDimension {
  key: 'strengths' | 'growth_areas' | 'patterns' | 'blind_spots' | 'potentials' | 'needs'
  label: string
  content: string
  confidence: number
}

/** 自我认知报告 */
export interface PortraitReport {
  summary: string
  dimensions: PortraitReportDimension[]
  recommendations: string[]
}

/** 高频词 */
export interface PortraitWord {
  word: string
  count: number
}

/** 常用句式 */
export interface PortraitPattern {
  pattern: string
  frequency: number
}

/** 常用词汇 / 句式 */
export interface PortraitVocabulary {
  words: PortraitWord[]
  patterns: PortraitPattern[]
}

/** 单维演化方向 */
export interface EvolutionDimensionChange {
  dimension: StyleDimension
  label: string
  current: number
  direction: 'increasing' | 'decreasing' | 'stable'
}

/** 可能的发展路径 */
export interface PortraitPath {
  label: string
  description: string
  probability: number
}

/** 演化趋势 */
export interface PortraitEvolution {
  styleChanges: EvolutionDimensionChange[]
  possiblePaths: PortraitPath[]
  overallConfidence: number
  basis: string[]
}

/** 成长轨迹节点 */
export interface PortraitTrajectoryNode {
  date: string
  phase: GrowthNode['phase']
  phaseLabel: string
  keyEvents: string[]
}

/** 成长轨迹 */
export interface PortraitTrajectory {
  nodes: PortraitTrajectoryNode[]
  startDate: string
  lastDate: string
  totalChange: number
  stabilityScore: number
  turningPointCount: number
  sampleSize: number
}

/** 温和洞察 */
export interface PortraitInsight {
  title: string
  detail: string
  tone: 'positive' | 'gentle' | 'neutral'
}

/** 完整人格画像 */
export interface PersonalityPortrait {
  overview: SelfCognitionOverview
  styleRows: StyleDimensionRow[]
  valueRows: ValueDimensionRow[]
  growth: SelfCognitionGrowth | null
  report: PortraitReport
  vocabulary: PortraitVocabulary
  evolution: PortraitEvolution
  trajectory: PortraitTrajectory | null
  insights: PortraitInsight[]
}

// ============================================================
// 工具
// ============================================================

function userTexts(dialogues: DialogueEntry[]): string[] {
  return dialogues.filter((d) => d.role === 'user').map((d) => d.text)
}

function userDialogues(dialogues: DialogueEntry[]): DialogueEntry[] {
  return dialogues.filter((d) => d.role === 'user')
}

/** 前一分/后一分 字典：前半段 vs 后半段 */
function splitHalf<T>(arr: T[]): [T[], T[]] {
  const half = Math.floor(arr.length / 2)
  return [arr.slice(0, half), arr.slice(half)]
}

/** 情感等面向的风格关键词（复用于方向趋势） */
const DIRECT_STYLE_KEYWORDS: Partial<Record<StyleDimension, string[]>> = {
  formality: ['您', '请', '谢谢', '感谢', '抱歉', '能否', '是否', '应当', '建议', '烦请'],
  emotionality: ['开心', '难过', '焦虑', '兴奋', '感动', '喜欢', '爱', '快乐', '幸福', '期待', '担心', '棒', '赞'],
  directness: ['我要', '我想', '我决定', '我不', '直接', '马上', '现在'],
  reflectiveness: ['反思', '回顾', '为什么', '总结', '复盘', '思考', '觉得', '意识到', '成长', '收获'],
  creativity: ['创造', '想象', '如果', '试试', '新', '有趣', '独特', '创意', '不同'],
  analytical: ['因为', '所以', '那么', '首先', '总结', '因此', '分析', '数据', '逻辑', '原因', '结果'],
  social_warmth: ['谢谢', '辛苦', '加油', '没关系', '一起', '我们', '帮忙', '支持', '陪伴', '关心'],
}

/** 停用词（2-gram 词汇提取） */
const PORTRAIT_STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
  '什么', '怎么', '如何', '为什么', '因为', '所以', '但是', '虽然',
  '可以', '这个', '那个', '如果', '还是', '已经', '而且', '不过',
  '吗', '呢', '啊', '哦', '嗯', '嘛',
])

// ============================================================
// 常用词汇 / 句式
// ============================================================

export function portraitVocabulary(
  dialogues: DialogueEntry[],
  options: { wordLimit?: number; patternLimit?: number } = {},
): PortraitVocabulary {
  const { wordLimit = 12, patternLimit = 6 } = options
  const texts = userTexts(dialogues)
  const freq = new Map<string, number>()
  const cleaned = texts.map((t) =>
    t.replace(/[，。！？；：、""''（）【】《》\s,.!?;:'"()[\]{}<>]/g, ' '),
  )
  for (const c of cleaned) {
    const chars = c.split('')
    for (let i = 0; i < chars.length - 1; i++) {
      const bigram = chars[i] + chars[i + 1]
      if (bigram.trim().length === 2 && !PORTRAIT_STOP_WORDS.has(bigram)) {
        freq.set(bigram, (freq.get(bigram) || 0) + 1)
      }
    }
  }
  const words = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, wordLimit)
    .map(([word, count]) => ({ word, count }))

  const patternsMap: Record<string, number> = {}
  for (const t of texts) {
    if (t.includes('我觉得')) patternsMap['我觉得…'] = (patternsMap['我觉得…'] || 0) + 1
    if (t.includes('为什么')) patternsMap['为什么…？'] = (patternsMap['为什么…？'] || 0) + 1
    if (t.includes('我想')) patternsMap['我想…'] = (patternsMap['我想…'] || 0) + 1
    if (t.includes('今天')) patternsMap['今天…'] = (patternsMap['今天…'] || 0) + 1
    if (t.includes('最近')) patternsMap['最近…'] = (patternsMap['最近…'] || 0) + 1
    if (t.includes('能不能')) patternsMap['能不能…？'] = (patternsMap['能不能…？'] || 0) + 1
    if (t.includes('如何')) patternsMap['如何…？'] = (patternsMap['如何…？'] || 0) + 1
    if (t.trim().endsWith('吗')) patternsMap['…吗？'] = (patternsMap['…吗？'] || 0) + 1
    if (t.trim().endsWith('吧')) patternsMap['…吧'] = (patternsMap['…吧'] || 0) + 1
  }
  const n = Math.max(1, texts.length)
  const patterns = Object.entries(patternsMap)
    .map(([pattern, frequency]) => ({ pattern, frequency: frequency / n }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, patternLimit)

  return { words, patterns }
}

// ============================================================
// 自我认知报告（六维）
// ============================================================

export function portraitCognitiveReport(
  dialogues: DialogueEntry[],
  styleRows?: StyleDimensionRow[],
  valueRows?: ValueDimensionRow[],
  growth?: SelfCognitionGrowth | null,
): PortraitReport {
  const styles = styleRows ?? selfCognitionStyle(dialogues)
  const valuesAll = selfCognitionValues(dialogues)
  const values = valueRows && valueRows.length ? valueRows : valuesAll
  const growthPhase = growth ?? selfCognitionGrowth(dialogues)
  const user = userTexts(dialogues)

  const topStyles = styles.slice(0, 2).map((s) => s.label)
  const risingStyles = styles.slice(2, 4).map((s) => s.label)
  const lowStyles = [...styles].reverse().slice(0, 2).map((s) => s.label)
  const coreValues = values.slice(0, 2).map((v) => v.label)

  const summary =
    user.length > 0
      ? `你是一个偏好「${topStyles.join('、') || '多元表达'}」的沟通者，核心价值观围绕「${coreValues.join('、') || '自我成长'}」。${growthPhase ? `当前处于${growthPhase.label}。` : '人格画像正在生长。'}`
      : '等待第一道倒影，你的深度画像将在对话中逐渐显影。'

  const dimensions: PortraitReportDimension[] = [
    {
      key: 'strengths',
      label: '核心优势',
      content:
        topStyles.length > 0
          ? `你在「${topStyles.join('、')}」等风格维度上表现突出，配合「${coreValues.join('、')}」的价值观，构筑起你独特的自我表达质感。`
          : '正在积累足够的对话样本，特质优势将逐步显影。',
      confidence: 0.82,
    },
    {
      key: 'growth_areas',
      label: '成长空间',
      content:
        lowStyles.length > 0
          ? `「${lowStyles.join('、')}」等维度目前尚浅，是你未来可尝试拓展、丰富自我认知的方向。`
          : '各维度仍在待样本沉淀，成长空间尚未定型。',
      confidence: 0.72,
    },
    {
      key: 'patterns',
      label: '行为模式',
      content: buildPatternsContent(user),
      confidence: 0.8,
    },
    {
      key: 'blind_spots',
      label: '潜在盲点',
      content: buildBlindSpotsContent(styles),
      confidence: 0.6,
    },
    {
      key: 'potentials',
      label: '发展潜力',
      content:
        risingStyles.length > 0
          ? `「${risingStyles.join('、')}」等维度展现出可观的进阶空间，持续投入将撬动更立体的自我认知。`
          : '你的特质分布尚在发展，潜力将随对话增多逐步浮现。',
      confidence: 0.7,
    },
    {
      key: 'needs',
      label: '核心需求',
      content:
        coreValues.length > 0
          ? `你的表达深层指向「${coreValues.join('、')}」等价值需求，在生活中有意识地满足它们，会带来更踏实的内在满足。`
          : '更多对话将帮助你厘清真正看重的东西。',
      confidence: 0.78,
    },
  ]

  const recommendations = buildRecommendations(styles, growthPhase)

  return { summary, dimensions, recommendations }
}

function buildPatternsContent(texts: string[]): string {
  if (texts.length === 0) return '尚无足够语料来识别你的惯用句式。'
  const checks: [string, string][] = [
    ['我觉得', '习惯先表达主观立场，「我觉得…」式的内省开场'],
    ['为什么', '偏爱追问原因，带有「为什么…？」的探究惯性'],
    ['最近', '常以「最近…」开启对近况的回望'],
    ['我想', '惯用「我想…」来表达意向与计划'],
  ]
  const hits = checks.filter(([kw]) => texts.some((t) => t.includes(kw))).map(([, desc]) => desc)
  return hits.length > 0
    ? hits.slice(0, 2).join('；') + '。'
    : '句式偏好尚在显影，更多对话会让你的惯用表达浮现。'
}

function buildBlindSpotsContent(styles: StyleDimensionRow[]): string {
  const byDim = new Map(styles.map((s) => [s.dimension, s.score]))
  const blind: string[] = []
  const emotionality = byDim.get('emotionality') ?? 0.5
  const directness = byDim.get('directness') ?? 0.5
  const socialWarmth = byDim.get('social_warmth') ?? 0.5
  if (emotionality < 0.3) blind.push('情感表达的克制，可能让他人不易感知你的真实感受')
  if (directness < 0.3) blind.push('委婉的表达方式，有时可能让沟通节奏偏慢')
  if (socialWarmth < 0.3) blind.push('偏冷静的社交温度，可能无意间拉远与人的距离')
  return blind.length > 0 ? blind.slice(0, 2).join('；') + '。' : '暂未发现明显的表达盲点，保持这份自省便足够敏锐。'
}

function buildRecommendations(
  styles: StyleDimensionRow[],
  growth: SelfCognitionGrowth | null,
): string[] {
  const recs: string[] = []
  const byDim = new Map(styles.map((s) => [s.dimension, s.score]))
  if ((byDim.get('reflectiveness') ?? 0.5) < 0.4) recs.push('尝试定期复盘，把每日的思绪沉淀成可回溯的线索')
  if ((byDim.get('emotionality') ?? 0.5) < 0.4) recs.push('练习更开放地表达情感，让周围人走近你的内心')
  if ((byDim.get('social_warmth') ?? 0.5) < 0.4) recs.push('多给出温暖的回应与鼓励，让连接自然生长')
  if (growth && growth.phase === 'initial') recs.push('保持轻松对话频率，样本越多，画像越立体')
  if (recs.length === 0) recs.push('维持这份自我探索的节奏，你的成长轨迹很健康')
  return recs.slice(0, 4)
}

// ============================================================
// 演化趋势
// ============================================================

export function portraitEvolution(
  dialogues: DialogueEntry[],
  styleRows?: StyleDimensionRow[],
): PortraitEvolution {
  const users = userDialogues(dialogues)
  const [earlier, later] = splitHalf(users)
  const styles = styleRows ?? selfCognitionStyle(dialogues)
  const byDim = new Map(styles.map((s) => [s.dimension, s.score]))

  const styleChanges: EvolutionDimensionChange[] = (Object.keys(STYLE_DIMENSION_META) as StyleDimension[]).map(
    (dimension) => {
      const current = byDim.get(dimension) ?? 0
      const kw = DIRECT_STYLE_KEYWORDS[dimension] ?? []
      const earlyScore = ratioHits(earlier.map((d) => d.text), kw)
      const laterScore = ratioHits(later.map((d) => d.text), kw)
      const delta = later.length >= 2 && earlier.length >= 2 ? laterScore - earlyScore : 0
      const direction: EvolutionDimensionChange['direction'] =
        delta > 0.06 ? 'increasing' : delta < -0.06 ? 'decreasing' : 'stable'
      return {
        dimension,
        label: STYLE_DIMENSION_META[dimension].label,
        current: round2(current),
        direction,
      }
    },
  )

  const possiblePaths = buildPossiblePaths(styleChanges)
  const clearChanges = styleChanges.filter((c) => c.direction !== 'stable').length
  const overallConfidence = Math.min(1, round2(0.35 + clearChanges * 0.06 + Math.min(0.2, users.length / 250)))
  const basis: string[] = [
    `基于 ${Math.max(users.length, 0)} 条用户留声`,
    `横跨 ${styleChanges.length} 个风格维度`,
  ]

  return { styleChanges, possiblePaths, overallConfidence, basis }
}

function ratioHits(texts: string[], keywords: string[]): number {
  if (texts.length === 0 || keywords.length === 0) return 0
  let hits = 0
  for (const t of texts) {
    for (const kw of keywords) {
      if (t.includes(kw)) {
        hits++
        break
      }
    }
  }
  return hits / texts.length
}

function buildPossiblePaths(changes: EvolutionDimensionChange[]): PortraitPath[] {
  const inc = new Set(changes.filter((c) => c.direction === 'increasing').map((c) => c.dimension))
  const paths: PortraitPath[] = []
  if (inc.has('reflectiveness')) {
    paths.push({ label: '深度内省之路', description: '反思倾向持续攀升，可能发展出更细腻的自我洞察，并乐于向他人输出沉淀。', probability: 0.6 })
  }
  if (inc.has('creativity')) {
    paths.push({ label: '创意表达之路', description: '创造力水涨船高，你或将在创作与表达中找到更鲜明的个人风格。', probability: 0.5 })
  }
  if (inc.has('social_warmth')) {
    paths.push({ label: '温暖连接之路', description: '社交温度渐暖，人际关系的深度与支持感将持续加厚。', probability: 0.55 })
  }
  if (inc.has('analytical')) {
    paths.push({ label: '理性梳理之路', description: '分析性增强，你正逐步把纷杂的信息梳理成清晰的逻辑脉络。', probability: 0.5 })
  }
  if (paths.length === 0) {
    paths.push({ label: '多元探索之路', description: '各维度均衡发展，保持开放心态，画像将在持续的对话中自适应生长。', probability: 0.6 })
  }
  return paths.slice(0, 4)
}

// ============================================================
// 成长轨迹
// ============================================================

export function portraitTrajectory(
  dialogues: DialogueEntry[],
  options: { intervalDays?: number } = {},
): PortraitTrajectory | null {
  const { intervalDays = 7 } = options
  const users = userDialogues(dialogues).slice().sort((a, b) => a.timestamp - b.timestamp)
  if (users.length < 8) return null

  const dates = Array.from(new Set(users.map((d) => dayKey(d.timestamp)))).sort()
  if (dates.length < 2) return null

  const nodes: PortraitTrajectoryNode[] = []
  const sampled: { date: string; texts: string[] }[] = []

  for (let i = 0; i < dates.length; i += intervalDays) {
    const date = dates[i]
    const slice = users.filter((d) => dayKey(d.timestamp) <= date)
    const sliceTexts = slice.map((d) => d.text)
    if (sliceTexts.length < 4) continue

    const phase = trajectoryPhase(i, dates.length, sliceTexts)
    const keyEvents = detectSliceEvents(sliceTexts, slice.length)
    nodes.push({
      date,
      phase,
      phaseLabel: GROWTH_PHASE_META[phase].label,
      keyEvents,
    })
    sampled.push({ date, texts: sliceTexts })
  }

  if (nodes.length < 2) return null

  const first = sampled[0]
  const last = sampled[sampled.length - 1]
  const firstScores = dimsFromTexts(first.texts)
  const lastScores = dimsFromTexts(last.texts)
  const dims = Object.keys(firstScores) as StyleDimension[]
  const totalChange = dims.reduce((s, dim) => s + Math.abs(lastScores[dim] - firstScores[dim]), 0) / dims.length

  const stabilityScore = sampledStability(sampled)

  let turningPointCount = 0
  for (let i = 1; i < sampled.length - 1; i++) {
    const prevDiff = nodeDiff(sampled[i - 1], sampled[i])
    const nextDiff = nodeDiff(sampled[i], sampled[i + 1])
    if (prevDiff > 0.15 && nextDiff < 0.08) turningPointCount++
  }

  return {
    nodes,
    startDate: first.date,
    lastDate: last.date,
    totalChange: round2(totalChange),
    stabilityScore: round2(stabilityScore),
    turningPointCount,
    sampleSize: users.length,
  }
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function trajectoryPhase(
  index: number,
  totalDates: number,
  sliceTexts: string[],
): GrowthNode['phase'] {
  const ratio = index / Math.max(1, totalDates - 1)
  if (ratio < 0.15) return 'initial'
  if (ratio < 0.4) return 'exploration'
  if (ratio < 0.7) return 'consolidation'
  const transformed = sliceTexts.some((t) => t.includes('改变') || t.includes('突破') || t.includes('新的'))
  return transformed ? 'transformation' : 'integration'
}

function detectSliceEvents(texts: string[], count: number): string[] {
  const events: string[] = []
  if (count > 10) events.push(`对话活跃期 (${count} 条)`)
  if (texts.filter((t) => t.includes('反思') || t.includes('思考') || t.includes('总结')).length > 3) {
    events.push('深度反思期')
  }
  return events.slice(0, 2)
}

function dimsFromTexts(texts: string[]): Record<StyleDimension, number> {
  const rows = Object.keys(STYLE_DIMENSION_META) as StyleDimension[]
  const out = {} as Record<StyleDimension, number>
  for (const dim of rows) {
    const kw = DIRECT_STYLE_KEYWORDS[dim] ?? []
    out[dim] = round2(texts.length && kw.length ? ratioHits(texts, kw) * 1.2 : ratioHits(texts, kw))
  }
  if (texts.length) out.conciseness = round2(Math.min(1, texts.filter((t) => t.length < 30).length / texts.length))
  return out
}

function nodeDiff(a: { texts: string[] }, b: { texts: string[] }): number {
  const sa = dimsFromTexts(a.texts)
  const sb = dimsFromTexts(b.texts)
  const dims = Object.keys(sa) as StyleDimension[]
  return dims.reduce((s, dim) => s + Math.abs(sb[dim] - sa[dim]), 0) / dims.length
}

function sampledStability(sampled: { texts: string[] }[]): number {
  const dims = Object.keys(STYLE_DIMENSION_META) as StyleDimension[]
  const dimVals = new Map<StyleDimension, number[]>()
  for (const dim of dims) dimVals.set(dim, [])
  for (const s of sampled) {
    const scores = dimsFromTexts(s.texts)
    for (const dim of dims) dimVals.get(dim)!.push(scores[dim])
  }
  const variances: number[] = []
  for (const dim of dims) {
    const arr = dimVals.get(dim)!
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    variances.push(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length)
  }
  const meanVariance = variances.reduce((a, b) => a + b, 0) / variances.length
  return Math.max(0, Math.min(1, 1 - meanVariance * 2))
}

// ============================================================
// 温和洞察
// ============================================================

export function portraitInsights(
  dialogues: DialogueEntry[],
  options: {
    overview?: SelfCognitionOverview
    styleRows?: StyleDimensionRow[]
    trajectory?: PortraitTrajectory | null
    report?: PortraitReport
  } = {},
): PortraitInsight[] {
  const ov = options.overview ?? selfCognitionOverview(dialogues)
  const styles = options.styleRows ?? selfCognitionStyle(dialogues)
  const trajectory = options.trajectory ?? portraitTrajectory(dialogues)
  const insights: PortraitInsight[] = []

  const topStyle = styles[0]
  if (topStyle && topStyle.score >= 0.3) {
    insights.push({
      title: `主导风格：「${topStyle.label}」`,
      detail: `在 ${ov.userCount} 次留声中，「${topStyle.label}」维度最具辨识度，它正默默塑造你表达的气口。`,
      tone: 'positive',
    })
  }

  if (ov.daySpan >= 14) {
    insights.push({
      title: '一段被静置的自我积累',
      detail: `画像覆盖 ${ov.daySpan} 天，足够让改变被看见、被比较。`,
      tone: 'positive',
    })
  }

  if (trajectory && trajectory.stabilityScore >= 0.7) {
    insights.push({
      title: '核心特质相对稳定',
      detail: `成长稳定性 ${Math.round(trajectory.stabilityScore * 100)}%，你的主干特质清晰而可依靠。`,
      tone: 'positive',
    })
  } else if (trajectory && trajectory.totalChange > 0.15) {
    insights.push({
      title: '正处在多变的生长期',
      detail: `轨迹总变化量超 ${Math.round(trajectory.totalChange * 100)}%，允许自己在过渡中试探多种面貌。`,
      tone: 'gentle',
    })
  }

  if (ov.reflectRatio >= 0.3) {
    insights.push({
      title: '向内观照已成习惯',
      detail: `反思性表达占比 ${Math.round(ov.reflectRatio * 100)}%，向内走的这段路，是你成长的沃土。`,
      tone: 'positive',
    })
  }

  if (ov.userCount < 8 || !topStyle || topStyle.score < 0.3) {
    insights.push({
      title: '画像仍在显影',
      detail: `目前仅 ${ov.userCount} 次留声，不妨多与镜我聊聊，让人格画像逐渐鲜活立体。`,
      tone: 'gentle',
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: '等待第一道倒影',
      detail: '与镜我聊聊此刻的感受，第一抹人格画像便会开始显影。',
      tone: 'neutral',
    })
  }

  return insights.slice(0, 3)
}

// ============================================================
// 聚合
// ============================================================

export function buildPersonalityPortrait(
  dialogues: DialogueEntry[],
  now: Date = new Date(),
): PersonalityPortrait {
  const overview = selfCognitionOverview(dialogues, now)
  const styleRows = selfCognitionStyle(dialogues)
  const valueRows = selfCognitionValues(dialogues)
  const growth = selfCognitionGrowth(dialogues, overview)
  const report = portraitCognitiveReport(dialogues, styleRows, valueRows, growth)
  const vocabulary = portraitVocabulary(dialogues)
  const evolution = portraitEvolution(dialogues, styleRows)
  const trajectory = portraitTrajectory(dialogues)
  const insights = portraitInsights(dialogues, { overview, styleRows, trajectory, report })

  return { overview, styleRows, valueRows, growth, report, vocabulary, evolution, trajectory, insights }
}

// ============================================================
// 数值工具
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100
}