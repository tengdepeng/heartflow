// ============================================================
// 宪法 · 运行时文案中性检测
// 对应 stores/advisor.ts 中 say() 的预留入口（宪法第2条·超级自定义
// 之第8条·中性呈现）。把原先的空桩落地为真实规则检测。
//
// 设计原则（与宪法引擎一致）：
// - 纯函数、同步、零副作用，绝不抛错（单条检测失败不影响其余）。
// - 默认"观测"语义：仅返回命中分类与命中的片段，由调用方决定是否拦截。
//   当前 say() 仅把命中写入消息元数据 + 累加审计，不吞消息（先观测、后可选拦截）。
// - 复用 compliance-baseline.ts 中 `neutral` 核心价值的矛盾关键词，保证
//   规则单一真源，避免两套词表漂移。
// ============================================================

import { storage } from '../../engine/storage'

/** 单个检测分类的命中结果 */
export interface NeutralityHit {
  /** 命中的分类：评价性/比较性/拟人化 */
  category: 'forbiddenPatterns' | 'comparativePhrases' | 'personification'
  /** 命中的原始片段（便于审计与下游提示） */
  matched: string
  /** 命中的规则（关键词或正则 source） */
  rule: string
}

export interface NeutralityResult {
  /** 是否命中任意非中性表达 */
  flag: boolean
  /** 按分类归组的命中明细 */
  hits: NeutralityHit[]
  /** 按分类聚合的命中数量（便于快速判断） */
  counts: {
    forbiddenPatterns: number
    comparativePhrases: number
    personification: number
  }
}

/**
 * 禁止的"评价性/指令性"表达。
 * 与 compliance-baseline.ts 的 neutral.conflictingKeywords 保持一致。
 */
const FORBIDDEN_PHRASES: string[] = [
  '你应该', '你必须', '你应当', '你一定得', '正确的', '错误的', '好的', '坏的',
  '对的', '错的', '必须', '不该', '不能这样做', '你需要', '你最好',
]

/**
 * 比较性表达（暗示"更优/更差"的价值判断，违背"只提供原材料、不提供结论"）。
 * 用边界词约束，避免误伤"比"字普通用法。
 */
const COMPARATIVE_PATTERNS: RegExp[] = [
  /比(上次|之前|过去|昨天|上周|上月|去年|别人|他人|其他人)好/g,
  /比(上次|之前|过去|昨天|上周|上月|去年)差/g,
  /(最|更)优(秀|秀)?(的|方案|选择|做法)?/g,
  /(最|更)差(的|劲)?/g,
  /(最优|最佳|最差|最棒|最烂)/g,
  /(遥遥领先|远胜于|远不及)/g,
]

/**
 * 过度拟人化表达（幕僚不该拥有"自己的感受/意愿/判断"）。
 * 复用 constitution-compliance.test.ts 第8条所定义的禁用集合，保持测试与实现一致。
 */
const PERSONIFICATION_PATTERNS: RegExp[] = [
  /[他她]有自己的想法/g,
  /[他她]会[感]到/g,
  /[他她]觉得/g,
  /[他她]认为/g,
  /[他她]想要/g,
  /[他她]希望/g,
  /[他她]喜欢/g,
  /[他她]讨厌/g,
  /[他她]生气/g,
  /[他她]开心/g,
  /[他她]难过/g,
  /[他她]伤心/g,
  /[他她]高兴/g,
  /像朋友一样/g,
  /像伙伴一样/g,
  /像家人一样/g,
  // 第一/二人称的"我觉得/我认为"也属拟人化倾向（幕僚以系统视角呈现）
  /(我)(觉得|认为|感到|希望|想要|喜欢|讨厌|开心|难过|生气|高兴)/g,
]

/**
 * 第4条·只给原材料不给结论：结论性/评判性关键词。
 * 与 modules/output/governance-gate.ts 的 CONCLUSION_KEYWORDS 保持同源
 * （governance-gate 为输出流 canonical 词表；此处为 say() 路径本地镜像，
 * 避免 constitution 模块与 output 模块形成循环依赖）。
 * 若后续该词表需统一维护，应以 governance-gate.ts 为准并同步更新此处。
 */
const CONCLUSION_KEYWORDS: string[] = [
  '分析结论', '结论', '诊断', '评估', '评分', '建议', '推荐',
  '你应该', '你必须', '最好的', '最差的', '最优', '最差',
]

function matchPhrases(text: string, phrases: string[], category: NeutralityHit['category']): NeutralityHit[] {
  const hits: NeutralityHit[] = []
  for (const phrase of phrases) {
    let idx = text.indexOf(phrase)
    while (idx !== -1) {
      hits.push({ category, matched: phrase, rule: phrase })
      idx = text.indexOf(phrase, idx + phrase.length)
    }
  }
  return hits
}

function matchPatterns(text: string, patterns: RegExp[], category: NeutralityHit['category']): NeutralityHit[] {
  const hits: NeutralityHit[] = []
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      hits.push({ category, matched: m[0], rule: pattern.source })
      if (m.index === re.lastIndex) re.lastIndex++ // 防止零宽匹配死循环
    }
  }
  return hits
}

/**
 * 把用户提供的正则 source 字符串编译为 RegExp（全部带 g 标志），
 * 跳过非法正则在用户误输入时不抛错（仅丢弃该条扩展规则）。
 */
function compileSafe(sources: readonly string[]): RegExp[] {
  const out: RegExp[] = []
  for (const s of sources) {
    if (!s) continue
    try {
      out.push(new RegExp(s, 'g'))
    } catch {
      // 用户误写的正则不匹配任何内容，静默忽略
    }
  }
  return out
}

/**
 * 检测一段幕僚文案是否含有非中性表达。
 * 在宪法内置硬性基线之上，叠加用户「本地扩展词表」(neutral:extensions)，
 * 并受可调阈值 (neutral:flagThreshold) 约束：命中数 >= 阈值才置 flag。
 * 阈值默认 1，等价于「任一命中即标记」；用户可上调以降低敏感度。
 *
 * @param text 待检测文案
 * @returns 命中结果与明细（纯函数，绝不抛错）
 */
export function checkNeutrality(text: string): NeutralityResult {
  const empty: NeutralityResult = {
    flag: false,
    hits: [],
    counts: { forbiddenPatterns: 0, comparativePhrases: 0, personification: 0 },
  }
  if (!text || typeof text !== 'string') return empty

  const ext = getUserNeutralityExtensions()
  const forbiddenPhrases = [...FORBIDDEN_PHRASES, ...ext.forbidden]
  const comparativePatterns = [...COMPARATIVE_PATTERNS, ...compileSafe(ext.comparative)]
  const personificationPatterns = [...PERSONIFICATION_PATTERNS, ...compileSafe(ext.personification)]

  let hits: NeutralityHit[] = []
  try {
    hits = [
      ...matchPhrases(text, forbiddenPhrases, 'forbiddenPatterns'),
      ...matchPatterns(text, comparativePatterns, 'comparativePhrases'),
      ...matchPatterns(text, personificationPatterns, 'personification'),
    ]
  } catch {
    // 任何单条检测异常都不应影响消息下发
    return empty
  }

  const counts = {
    forbiddenPatterns: hits.filter(h => h.category === 'forbiddenPatterns').length,
    comparativePhrases: hits.filter(h => h.category === 'comparativePhrases').length,
    personification: hits.filter(h => h.category === 'personification').length,
  }

  const threshold = getNeutralityFlagThreshold()
  return {
    flag: hits.length >= threshold,
    hits,
    counts,
  }
}

/**
 * 在合规覆盖开关关闭（= 过滤器激活）的各分类上执行检测。
 * 返回一个与 AdvisorMessage 元数据结构对齐的结果对象，
 * 仅包含"实际激活且命中"的分类。
 */
export function checkAdvisorNeutrality(text: string): {
  forbiddenPatterns: NeutralityHit[]
  comparativePhrases: NeutralityHit[]
  personification: NeutralityHit[]
} {
  const cfg = storage.getConfig().complianceOverride
  const result = checkNeutrality(text)
  return {
    forbiddenPatterns: cfg.forbiddenPatterns ? [] : result.hits.filter(h => h.category === 'forbiddenPatterns'),
    comparativePhrases: cfg.comparativePhrases ? [] : result.hits.filter(h => h.category === 'comparativePhrases'),
    personification: cfg.personification ? [] : result.hits.filter(h => h.category === 'personification'),
  }
}

/**
 * 第2条·超级自定义 / 第4条·只给原材料不给结论：say() 路径的结论性表达检测。
 * 与 checkAdvisorNeutrality 保持同一"观测 + override-aware"语义：
 * - 当 complianceOverride.dataDriven 关闭（默认 false）= 过滤器激活，执行真实检测；
 * - 开启（true）= 用户关闭第4条过滤器，不报告任何命中；
 * - 纯函数、同步、绝不抛错（与 checkNeutrality 一致）。
 * 返回命中的关键词列表（便于写入 AdvisorMessage 元数据 + 审计）。
 */
export function checkAdvisorDataDriven(text: string): string[] {
  const cfg = storage.getConfig().complianceOverride
  // override 开启 = 用户关闭第4条过滤器，不报告命中
  if (cfg.dataDriven) return []
  if (!text || typeof text !== 'string') return []
  const hits: string[] = []
  try {
    for (const kw of CONCLUSION_KEYWORDS) {
      if (text.includes(kw)) hits.push(kw)
    }
  } catch {
    // 任何异常都不应影响消息下发
    return []
  }
  return hits
}

// ============================================================
// C2-EXT · 中性检测词表「用户可本地扩展」（第2条·超级自定义 + 零外网）
// ------------------------------------------------------------
// 宪法内置的 FORBIDDEN_PHRASES / COMPARATIVE_PATTERNS /
// PERSONIFICATION_PATTERNS 为系统硬编码基线（不可删、保证底线合规）。
// 在此之上叠加「用户本地扩展词表」，存于本地 KV（neutral:extensions），
// 绝不触网、不依赖任何云端/社区下载，符合宪法第1条本地私有。
// 当用户在「超级自定义」面板追加本地词后，检测自动覆盖扩展词；
// 覆盖率报告让用户看见「内置 + 本地扩展」的规则规模与生效阈值。
// ============================================================

/** 扩展词表：三类各自可追加（forbidden=短语；comparative/personification=正则 source 字符串） */
export interface NeutralityExtensions {
  forbidden: string[]
  comparative: string[]
  comparativeCompiled: RegExp[]
  personification: string[]
  personificationCompiled: RegExp[]
}

const EXT_KEY = 'neutral:extensions'
const THRESHOLD_KEY = 'neutral:flagThreshold'
const DEFAULT_THRESHOLD = 1

/** 空扩展词表（默认：用户未追加任何本地词） */
export function emptyNeutralityExtensions(): Omit<NeutralityExtensions, 'comparativeCompiled' | 'personificationCompiled'> {
  return { forbidden: [], comparative: [], personification: [] }
}

/** 读取用户本地扩展词表（KV 持久化；非法/缺失时回落空表，绝不抛错） */
export function getUserNeutralityExtensions(): NeutralityExtensions {
  const raw = storage.getKV<Partial<NeutralityExtensions>>(EXT_KEY, {})
  const forbidden = Array.isArray(raw.forbidden) ? raw.forbidden.filter(s => typeof s === 'string') : []
  const comparative = Array.isArray(raw.comparative) ? raw.comparative.filter(s => typeof s === 'string') : []
  const personification = Array.isArray(raw.personification) ? raw.personification.filter(s => typeof s === 'string') : []
  return {
    forbidden,
    comparative,
    comparativeCompiled: compileSafe(comparative),
    personification,
    personificationCompiled: compileSafe(personification),
  }
}

/** 写入用户本地扩展词表（去重；非法类型静默忽略；不写空串） */
export function setUserNeutralityExtensions(ext: Partial<NeutralityExtensions>): void {
  const dedup = (arr?: unknown): string[] => {
    if (!Array.isArray(arr)) return []
    return [...new Set(arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))]
  }
  storage.setKV(EXT_KEY, {
    forbidden: dedup(ext.forbidden),
    comparative: dedup(ext.comparative),
    personification: dedup(ext.personification),
  })
}

/** 向指定类别追加一条本地词（去重；已存在则忽略）；返回写入后的该类别列表 */
export function addNeutralityExtension(
  category: 'forbidden' | 'comparative' | 'personification',
  value: string,
): string[] {
  const ext = getUserNeutralityExtensions()
  const cur = ext[category]
  const v = value.trim()
  if (!v || cur.includes(v)) return cur
  const next = [...cur, v]
  setUserNeutralityExtensions({ ...ext, [category]: next })
  return next
}

/** 从指定类别移除一条本地词；返回移除后的该类别列表 */
export function removeNeutralityExtension(
  category: 'forbidden' | 'comparative' | 'personification',
  value: string,
): string[] {
  const ext = getUserNeutralityExtensions()
  const next = ext[category].filter(x => x !== value)
  setUserNeutralityExtensions({ ...ext, [category]: next })
  return next
}

/** 读取生效阈值（命中数 >= 阈值才置 flag；默认 1，下限 1，防误配为 0 致永不标记） */
export function getNeutralityFlagThreshold(): number {
  const t = storage.getKV<number>(THRESHOLD_KEY, DEFAULT_THRESHOLD)
  return Number.isFinite(t) && t >= 1 ? Math.floor(t) : DEFAULT_THRESHOLD
}

/** 写入生效阈值（下限 1） */
export function setNeutralityFlagThreshold(n: number): void {
  const v = Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_THRESHOLD
  storage.setKV(THRESHOLD_KEY, v)
}

/** 内置基线规模（供覆盖率报告对比） */
export function getBuiltinNeutralityCounts(): {
  forbidden: number
  comparative: number
  personification: number
} {
  return {
    forbidden: FORBIDDEN_PHRASES.length,
    comparative: COMPARATIVE_PATTERNS.length,
    personification: PERSONIFICATION_PATTERNS.length,
  }
}

/**
 * 覆盖率报告：内置基线 + 用户本地扩展 的规则规模与阈值。
 * 供「超级自定义」面板展示——用户可见三类的检测规则总数与生效阈值，
 * 透明化「我的中性检测覆盖到什么程度」（第2条超级自定义的可视化落点）。
 */
export interface NeutralityCoverageReport {
  forbidden: { builtin: number; extended: number; total: number }
  comparative: { builtin: number; extended: number; total: number }
  personification: { builtin: number; extended: number; total: number }
  threshold: number
}

export function getNeutralityCoverageReport(): NeutralityCoverageReport {
  const builtin = getBuiltinNeutralityCounts()
  const ext = getUserNeutralityExtensions()
  return {
    forbidden: { builtin: builtin.forbidden, extended: ext.forbidden.length, total: builtin.forbidden + ext.forbidden.length },
    comparative: { builtin: builtin.comparative, extended: ext.comparative.length, total: builtin.comparative + ext.comparative.length },
    personification: { builtin: builtin.personification, extended: ext.personification.length, total: builtin.personification + ext.personification.length },
    threshold: getNeutralityFlagThreshold(),
  }
}
