// ============================================================
// 镜面对话系统 · 任务解析器
// 将用户自然语言输入解析为结构化任务
// 支持：关键词匹配、正则模式匹配、参数提取、置信度计算
// ============================================================

import { INTENT_REGISTRY } from './intents'
import type { IntentCategory, ParsedTask, ParsedTaskResult } from './types'

// ---- 解析器配置 ----

/** 歧义阈值：当两个候选置信度差小于此值时，视为歧义 */
const AMBIGUITY_THRESHOLD = 0.15

/** 最低置信度阈值：低于此值的候选被视为无效 */
const MIN_CONFIDENCE = 0.2

/** 关键词匹配权重 */
const KEYWORD_WEIGHT = 0.35

/** 正则模式匹配权重 */
const PATTERN_WEIGHT = 0.65

// ---- 解析器核心 ----

let taskIdCounter = 0

/** 生成唯一任务 ID */
function generateTaskId(): string {
  return `mirror_${Date.now()}_${++taskIdCounter}`
}

/**
 * 计算单个意图的匹配置信度
 * @param intent 意图元数据
 * @param text 用户输入文本
 * @returns 置信度 (0-1)
 */
function calculateConfidence(intent: typeof INTENT_REGISTRY[number], text: string): number {
  const lower = text.toLowerCase().trim()
  let keywordScore = 0
  let patternScore = 0

  // 关键词匹配
  const matchedKeywords = intent.keywords.filter(kw => lower.includes(kw.toLowerCase()))
  if (intent.keywords.length > 0) {
    keywordScore = matchedKeywords.length / Math.min(intent.keywords.length, 5)
  }

  // 正则模式匹配
  const matchedPatterns = intent.patterns.filter(p => {
    // 每次新建正则避免 lastIndex 污染
    const regex = new RegExp(p.source, p.flags)
    return regex.test(lower)
  })
  if (intent.patterns.length > 0) {
    patternScore = matchedPatterns.length / Math.min(intent.patterns.length, 3)
  }

  return keywordScore * KEYWORD_WEIGHT + patternScore * PATTERN_WEIGHT
}

/**
 * 从用户输入中提取参数
 * @param intent 意图元数据
 * @param text 用户输入文本
 * @returns 提取的参数键值对
 */
function extractParams(intent: typeof INTENT_REGISTRY[number], text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  for (const extractor of intent.paramExtractors) {
    const match = text.match(extractor.pattern)
    if (match) {
      const value = extractor.transform ? extractor.transform(match[1] || match[0]) : (match[1] || match[0])
      // 如果同名参数已存在，用数组收集
      if (params[extractor.name] !== undefined) {
        const existing = Array.isArray(params[extractor.name])
          ? params[extractor.name] as unknown[]
          : [params[extractor.name]]
        params[extractor.name] = [...existing, value]
      } else {
        params[extractor.name] = value
      }
    }
  }

  // 默认提取原始文本作为 content
  if (!params.content && text.length > 0) {
    params.content = text
  }

  return params
}

/**
 * 解析用户输入，返回所有候选意图
 * @param text 用户输入文本
 * @returns 解析结果
 */
export function parseTask(text: string): ParsedTaskResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { tasks: [], best: null, ambiguous: false }
  }

  const candidates: ParsedTask[] = []

  for (const intent of INTENT_REGISTRY) {
    const confidence = calculateConfidence(intent, trimmed)
    if (confidence >= MIN_CONFIDENCE) {
      candidates.push({
        id: generateTaskId(),
        raw: trimmed,
        intent: intent.category,
        confidence: Math.round(confidence * 100) / 100,
        params: extractParams(intent, trimmed),
        parsedAt: Date.now(),
      })
    }
  }

  // 按置信度降序排序
  candidates.sort((a, b) => b.confidence - a.confidence)

  // 判断歧义
  const ambiguous = candidates.length >= 2
    && (candidates[0].confidence - candidates[1].confidence) < AMBIGUITY_THRESHOLD

  const best = candidates.length > 0 ? candidates[0] : null

  return {
    tasks: candidates,
    best,
    ambiguous,
  }
}

/**
 * 快速解析：只返回最佳匹配
 * @param text 用户输入文本
 * @returns 最佳匹配任务，若无匹配则返回 null
 */
export function parseTaskBest(text: string): ParsedTask | null {
  return parseTask(text).best
}

/**
 * 按指定意图分类筛选
 * @param text 用户输入文本
 * @param intent 目标意图分类
 * @returns 匹配该意图的任务，若无匹配则返回 null
 */
export function parseTaskByIntent(text: string, intent: IntentCategory): ParsedTask | null {
  const result = parseTask(text)
  return result.tasks.find(t => t.intent === intent) ?? null
}

/**
 * 获取意图的置信度（不生成完整解析，仅返回分数）
 * @param text 用户输入文本
 * @param intent 目标意图分类
 * @returns 置信度 (0-1)
 */
export function getIntentConfidence(text: string, intent: IntentCategory): number {
  const intentMeta = INTENT_REGISTRY.find(i => i.category === intent)
  if (!intentMeta) return 0
  return calculateConfidence(intentMeta, text)
}