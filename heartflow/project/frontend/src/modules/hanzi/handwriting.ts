// ============================================================
// 殿堂辞典 · 手写识别引擎 (模块三十六)
// 借鉴现代汉语字典 / 中华汉语字典「手写识别查字」：
//   - Canvas 手写面板（组件层）
//   - 本地离线识别：笔画计数 + 笔画方向分类 + 候选匹配
// 纯函数设计，便于单测与复用；不依赖任何外部识别服务。
// ============================================================

import type { HanziEntry } from './hanzi-data'

/** 手写点（画布坐标） */
export interface HandwritingPoint {
  x: number
  y: number
}

/** 一笔：由若干连续点构成 */
export type HandwritingStroke = HandwritingPoint[]

/** 一次手写输入：若干笔 */
export type HandwritingInput = HandwritingStroke[]

/** 笔画方向类型 */
export type StrokeDirection = 'heng' | 'shu' | 'pie' | 'na' | 'dian' | 'ti' | 'zhe' | 'gou'

export const STROKE_DIRECTION_META: Record<StrokeDirection, { label: string; hint: string }> = {
  heng: { label: '横', hint: '自左向右' },
  shu: { label: '竖', hint: '自上而下' },
  pie: { label: '撇', hint: '向左下' },
  na: { label: '捺', hint: '向右下' },
  dian: { label: '点', hint: '短促落笔' },
  ti: { label: '提', hint: '向右上' },
  zhe: { label: '折', hint: '方向转折' },
  gou: { label: '钩', hint: '末端回钩' },
}

/** 候选匹配结果 */
export interface HandwritingMatch {
  entry: HanziEntry
  /** 匹配得分（越高越靠前） */
  score: number
  /** 笔画数是否精确匹配 */
  exactStroke: boolean
}

/** 手写识别结果 */
export interface HandwritingResult {
  /** 识别到的笔画数 */
  strokeCount: number
  /** 各笔方向分类（按书写顺序） */
  directions: StrokeDirection[]
  /** 方向统计 */
  summary: Record<StrokeDirection, number>
  /** 候选字（按得分降序） */
  candidates: HandwritingMatch[]
  /** 洞察文本 */
  insights: string[]
}

// ============================================================
// 笔画计数
// ============================================================

/** 笔画数 = 抬笔次数（每笔一次 pointerup） */
export function strokeCount(input: HandwritingInput): number {
  return input.length
}

// ============================================================
// 笔画方向分类
// ============================================================

/** 路径中段是否发生明显转折（>60°） */
function hasFold(pts: HandwritingPoint[]): boolean {
  const step = Math.max(1, Math.floor(pts.length / 12))
  let prevAngle: number | null = null
  for (let i = step; i < pts.length; i += step) {
    const dx = pts[i].x - pts[i - step].x
    const dy = pts[i].y - pts[i - step].y
    if (Math.hypot(dx, dy) < 4) continue
    const angle = Math.atan2(dy, dx)
    if (prevAngle !== null) {
      let diff = Math.abs(angle - prevAngle)
      if (diff > Math.PI) diff = 2 * Math.PI - diff
      if (diff > Math.PI / 3) return true
    }
    prevAngle = angle
  }
  return false
}

/** 末端段方向与整体方向是否显著偏离（>60°） */
function hasHook(pts: HandwritingPoint[]): boolean {
  if (pts.length < 6) return false
  const n = pts.length
  const cut = Math.floor(n * 0.7)
  const first = pts[0]
  const last = pts[n - 1]
  const mid = pts[cut]
  const overallDx = last.x - first.x
  const overallDy = last.y - first.y
  const tailDx = last.x - mid.x
  const tailDy = last.y - mid.y
  const overallLen = Math.hypot(overallDx, overallDy)
  const tailLen = Math.hypot(tailDx, tailDy)
  if (overallLen < 8 || tailLen < 4) return false
  const dot = (overallDx * tailDx + overallDy * tailDy) / (overallLen * tailLen)
  return dot < 0.5
}

/**
 * 将一笔分类为基本方向：
 *  - 短促 → 点；中段转折 → 折；末端回钩 → 钩
 *  - 横 / 竖 / 撇 / 捺 / 提 依首尾向量判定
 */
export function classifyStrokeDirection(stroke: HandwritingStroke): StrokeDirection {
  if (stroke.length < 2) return 'dian'
  const pts = stroke
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  if (Math.max(maxX - minX, maxY - minY) < 10) return 'dian'

  if (hasFold(pts)) return 'zhe'
  if (hasHook(pts)) return 'gou'

  const first = pts[0]
  const last = pts[pts.length - 1]
  const dx = last.x - first.x
  const dy = last.y - first.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx >= absDy * 1.5) return dx >= 0 ? 'heng' : 'pie'
  if (absDy >= absDx * 1.5) return dy >= 0 ? 'shu' : 'ti'
  if (dx > 0 && dy > 0) return 'na'
  if (dx > 0 && dy < 0) return 'ti'
  if (dx < 0 && dy > 0) return 'pie'
  return 'pie'
}

/** 逐笔分类，返回按书写顺序的方向序列 */
export function strokeDirections(input: HandwritingInput): StrokeDirection[] {
  return input.map(classifyStrokeDirection)
}

/** 方向统计（各方向出现次数） */
export function strokeDirectionSummary(input: HandwritingInput): Record<StrokeDirection, number> {
  const summary: Record<StrokeDirection, number> = {
    heng: 0, shu: 0, pie: 0, na: 0, dian: 0, ti: 0, zhe: 0, gou: 0,
  }
  for (const d of strokeDirections(input)) summary[d] += 1
  return summary
}

// ============================================================
// 常用字笔画走向小词典（用于序列匹配加分）
// 仅收录有把握的常用字；未收录的字回退到「笔画数 + 部首」匹配
// ============================================================

export const STROKE_SEQUENCES: Record<string, StrokeDirection[]> = {
  一: ['heng'],
  二: ['heng', 'heng'],
  三: ['heng', 'heng', 'heng'],
  十: ['heng', 'shu'],
  人: ['pie', 'na'],
  大: ['heng', 'pie', 'na'],
  小: ['shu', 'pie', 'dian'],
  口: ['shu', 'zhe', 'heng'],
  日: ['shu', 'zhe', 'heng', 'heng'],
  月: ['pie', 'zhe', 'heng', 'heng'],
  山: ['shu', 'shu', 'zhe'],
  水: ['shu', 'gou', 'pie', 'na'],
  火: ['dian', 'pie', 'pie', 'na'],
  木: ['heng', 'shu', 'pie', 'na'],
  土: ['heng', 'shu', 'heng'],
  天: ['heng', 'heng', 'pie', 'na'],
  心: ['dian', 'gou', 'dian', 'dian'],
  手: ['pie', 'heng', 'heng', 'gou'],
  中: ['shu', 'zhe', 'heng', 'shu'],
  王: ['heng', 'heng', 'shu', 'heng'],
  田: ['shu', 'zhe', 'heng', 'shu', 'heng'],
  目: ['shu', 'zhe', 'heng', 'heng', 'heng'],
  石: ['heng', 'pie', 'shu', 'zhe', 'heng'],
  白: ['pie', 'shu', 'zhe', 'heng', 'heng'],
  上: ['shu', 'heng', 'heng'],
  下: ['heng', 'shu', 'dian'],
  不: ['heng', 'pie', 'shu', 'dian'],
  女: ['pie', 'dian', 'heng'],
  子: ['zhe', 'gou', 'heng'],
  云: ['heng', 'heng', 'pie', 'dian'],
  见: ['shu', 'zhe', 'pie', 'gou'],
  牛: ['pie', 'heng', 'heng', 'shu'],
  立: ['dian', 'heng', 'dian', 'pie', 'heng'],
  生: ['pie', 'heng', 'heng', 'shu', 'heng'],
  早: ['shu', 'zhe', 'heng', 'heng', 'heng', 'shu'],
  明: ['shu', 'zhe', 'heng', 'heng', 'pie', 'zhe', 'heng', 'heng'],
  好: ['pie', 'dian', 'heng', 'zhe', 'gou', 'heng'],
  来: ['heng', 'dian', 'pie', 'heng', 'shu', 'pie', 'na'],
  去: ['heng', 'shu', 'heng', 'pie', 'dian'],
  走: ['heng', 'shu', 'heng', 'shu', 'heng', 'pie', 'na'],
  看: ['pie', 'heng', 'heng', 'heng', 'shu', 'zhe', 'heng', 'heng', 'heng'],
  金: ['pie', 'na', 'heng', 'heng', 'shu', 'dian', 'pie', 'heng'],
  雨: ['heng', 'shu', 'gou', 'shu', 'dian', 'dian', 'dian', 'dian'],
  雪: ['heng', 'dian', 'gou', 'shu', 'dian', 'dian', 'dian', 'dian', 'zhe', 'heng', 'heng'],
  星: ['shu', 'zhe', 'heng', 'heng', 'pie', 'heng', 'heng', 'shu', 'heng'],
  光: ['shu', 'dian', 'pie', 'heng', 'pie', 'gou'],
  门: ['dian', 'shu', 'gou'],
  车: ['heng', 'zhe', 'heng', 'shu'],
  长: ['pie', 'heng', 'ti', 'na'],
}

/** 序列相似度：按位比对命中率（0-1） */
export function sequenceSimilarity(drawn: StrokeDirection[], target: StrokeDirection[]): number {
  if (drawn.length === 0 || target.length === 0) return 0
  const n = Math.min(drawn.length, target.length)
  let hits = 0
  for (let i = 0; i < n; i++) {
    if (drawn[i] === target[i]) hits += 1
  }
  return hits / target.length
}

// ============================================================
// 候选匹配
// ============================================================

export interface HandwritingMatchOptions {
  /** 部首过滤（可选） */
  radical?: string
  /** 返回候选上限（默认 12） */
  limit?: number
}

/**
 * 手写候选匹配：
 *  - 先按「笔画数精确相等」过滤
 *  - 可选按部首过滤
 *  - 打分：部首命中 + 简单结构 + 常用度 + 笔画走向序列相似度
 */
export function matchHandwriting(
  input: HandwritingInput,
  db: HanziEntry[],
  opts: HandwritingMatchOptions = {},
): HandwritingMatch[] {
  const count = strokeCount(input)
  const limit = opts.limit ?? 12
  const drawn = strokeDirections(input)

  return db
    .filter((e) => e.strokes === count)
    .filter((e) => !opts.radical || e.radical === opts.radical)
    .map((entry) => {
      let score = 0
      if (opts.radical && entry.radical === opts.radical) score += 3
      if (entry.structure === '象形' || entry.structure === '指事') score += 1
      if ((entry.words?.length ?? 0) >= 3) score += 1
      const seq = STROKE_SEQUENCES[entry.char]
      if (seq) score += Math.round(sequenceSimilarity(drawn, seq) * 5)
      return { entry, score, exactStroke: true }
    })
    .sort((a, b) => b.score - a.score || a.entry.char.localeCompare(b.entry.char, 'zh'))
    .slice(0, limit)
}

// ============================================================
// 洞察
// ============================================================

/** 手写识别洞察：笔画数 / 走向 / 候选情况 */
export function handwritingInsights(input: HandwritingInput, result: HandwritingResult): string[] {
  const lines: string[] = []
  if (input.length === 0) {
    lines.push('在画板上写下你想查的汉字，一笔一画即可。')
    return lines
  }
  lines.push(`识别到 ${result.strokeCount} 画。`)
  if (result.directions.length) {
    const labels = result.directions.map((d) => STROKE_DIRECTION_META[d].label).join('、')
    lines.push(`笔画走向：${labels}。`)
  }
  if (result.candidates.length === 0) {
    lines.push('未找到匹配的字，可尝试调整笔画数或选择部首。')
  } else {
    lines.push(`找到 ${result.candidates.length} 个候选字，点击查看详情。`)
  }
  return lines
}

/** 便捷封装：一次手写输入 → 完整识别结果 */
export function recognizeHandwriting(
  input: HandwritingInput,
  db: HanziEntry[],
  opts: HandwritingMatchOptions = {},
): HandwritingResult {
  const directions = strokeDirections(input)
  const summary = strokeDirectionSummary(input)
  const candidates = matchHandwriting(input, db, opts)
  const result: HandwritingResult = {
    strokeCount: strokeCount(input),
    directions,
    summary,
    candidates,
    insights: [],
  }
  result.insights = handwritingInsights(input, result)
  return result
}
