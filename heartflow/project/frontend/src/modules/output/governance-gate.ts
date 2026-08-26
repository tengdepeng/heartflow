// ============================================================
// 输出治理闸 · #85 输出治理闸接守护室
// 把 output/index.ts 中 governanceCheck 的空桩落地为真实门。
//
// 设计原则（与宪法引擎、advisor.say() 一致）：
// - 纯函数、同步、零副作用地"判定"，仅在命中时"观测并上报守护室"
//   （recordAudit），绝不吞掉用户本地写入——遵循"先观测、后可选拦截"。
// - 三条宪法信号：
//   第8条·中性呈现  → checkAdvisorNeutrality（override-aware，开关关闭=过滤器激活）
//   第4条·只给原材料不给结论 → 结论性/评判性关键词（与 compliance-baseline
//        data-driven.conflictingKeywords 同源）
//   第1条·本地私有  → 外部分享/云端/上传关键词（与 compliance-baseline
//        local-private.conflictingKeywords 同源），其中"外部分享渠道（share）"
//        为不可 override 的硬拦截（critical）。
// - 默认 create / export 仅观测（flag + 上报），不拦截；唯有对外部分享渠道
//   （share）的发布触发本地私有硬拦截（数据不得离开本地设备）。
// ============================================================

import { checkAdvisorNeutrality, type NeutralityHit } from '../constitution/neutrality-checker'
import { useComplianceBaseline } from '../constitution/compliance-baseline'
import type { CreateRecordParams } from './types'

// ---- 信号类型 ----

export type GovernanceSignal = 'neutral' | 'dataDriven' | 'localPrivate'
export type GovernanceSeverity = 'none' | 'minor' | 'major' | 'critical'
export type GovernanceAction = 'allow' | 'flag' | 'block'

export interface GovernanceHit {
  signal: GovernanceSignal
  category: string
  severity: GovernanceSeverity
  matched: string
  message: string
}

export interface GovernanceResult {
  /** 是否放行（false 表示被硬拦截，调用方应拒绝该操作） */
  allowed: boolean
  reason?: string
  hits: GovernanceHit[]
  /** 聚合严重度（取所有命中中的最高） */
  severity: GovernanceSeverity
  /** 实际处置：放行 / 仅标注 / 拦截 */
  action: GovernanceAction
  /** 触发硬拦截的信号（仅当 action==='block' 时有值） */
  blockedBy?: GovernanceSignal
}

// ---- 检测词表（与宪法核心价值 conflictingKeywords 同源，保持单一真源注释） ----

// 第4条·只给原材料不给结论：结论性/评判性关键词
// 对应 compliance-baseline.ts 中 data-driven.conflictingKeywords
const CONCLUSION_KEYWORDS = [
  '分析结论', '结论', '诊断', '评估', '评分', '建议', '推荐',
  '你应该', '你必须', '最好的', '最差的', '最优', '最差',
]

// 第1条·本地私有（不可 override）：外部分享/云端/上传 关键词
// 对应 compliance-baseline.ts 中 local-private.conflictingKeywords
const EXTERNAL_SHARE_KEYWORDS = [
  '云端', '上传', '同步服务器', '云存储', '在线', '联网',
  '分享到', '发布到', '分享链接', '公开链接',
]

// ---- 严重度排序 ----

const SEVERITY_RANK: Record<GovernanceSeverity, number> = {
  none: 0, minor: 1, major: 2, critical: 3,
}

function maxSeverity(list: GovernanceSeverity[]): GovernanceSeverity {
  return list.reduce<GovernanceSeverity>(
    (acc, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc),
    'none',
  )
}

// ---- 检测函数 ----

/** 第8条·中性呈现：复用 neutrality-checker（override-aware） */
function detectNeutral(content: string): NeutralityHit[] {
  const r = checkAdvisorNeutrality(content)
  return [...r.forbiddenPatterns, ...r.comparativePhrases, ...r.personification]
}

/** 第4条·只给原材料不给结论：结论性/评判性关键词 */
function detectConclusion(content: string): string[] {
  const hits: string[] = []
  for (const kw of CONCLUSION_KEYWORDS) {
    if (content.includes(kw)) hits.push(kw)
  }
  return hits
}

/** 第1条·本地私有：外部分享/云端/上传 关键词 */
function detectExternalShare(content: string): string[] {
  const hits: string[] = []
  for (const kw of EXTERNAL_SHARE_KEYWORDS) {
    if (content.includes(kw)) hits.push(kw)
  }
  return hits
}

/** 收集"仅观测"型命中（中性 + 结论性），统一 severity=minor */
function collectObservationHits(content: string): GovernanceHit[] {
  const hits: GovernanceHit[] = []
  for (const h of detectNeutral(content)) {
    hits.push({
      signal: 'neutral',
      category: h.category,
      severity: 'minor',
      matched: h.matched,
      message: `第8条·中性呈现命中：${h.matched}`,
    })
  }
  for (const kw of detectConclusion(content)) {
    hits.push({
      signal: 'dataDriven',
      category: 'conclusionKeywords',
      severity: 'minor',
      matched: kw,
      message: `第4条·只给原材料不给结论命中：${kw}`,
    })
  }
  return hits
}

// ---- 处置与上报 ----

/**
 * 根据命中集合与可选的硬拦截信号，组装治理结果，
 * 并在有命中时"观测并上报守护室"（对齐 advisor.say() 的 recordAudit 模式）。
 */
function buildResult(
  hits: GovernanceHit[],
  opts: { blockedBy?: GovernanceSignal; reason?: string } = {},
): GovernanceResult {
  const severity = maxSeverity(hits.map(h => h.severity))
  const action: GovernanceAction = opts.blockedBy ? 'block' : hits.length > 0 ? 'flag' : 'allow'
  const result: GovernanceResult = {
    allowed: !opts.blockedBy,
    reason: opts.reason,
    hits,
    severity,
    action,
    blockedBy: opts.blockedBy,
  }

  // 命中即上报守护室（ observational audit；审计失败不影响输出流程）
  if (hits.length > 0) {
    try {
      const baseline = useComplianceBaseline()
      const summary = hits.map(h => `${h.signal}:${h.matched}`).join('; ')
      baseline.recordAudit(
        'compliance_checked',
        `输出治理命中（${hits.length} 项 / ${severity}）：${summary}`,
        hits[0].signal,
      )
    } catch {
      // 审计失败不影响输出流程
    }
  }

  return result
}

// ============================================================
// 对外入口
// ============================================================

/**
 * create 流闸：用户主动写入本地记录。
 * 本地写入始终放行（allowed=true），三条信号仅做"观测 + 上报"，
 * 不拦截——记录无论如何都只存于本地设备。
 */
export function governanceCheckRecord(params: CreateRecordParams): GovernanceResult {
  const content = params.content ?? ''
  const hits = collectObservationHits(content)

  // 第1条·本地私有：内容提及外部关键词，仅观测提醒（不拦截）
  for (const kw of detectExternalShare(content)) {
    hits.push({
      signal: 'localPrivate',
      category: 'externalShare',
      severity: 'major',
      matched: kw,
      message: `第1条·本地私有提醒：内容提及「${kw}」，记录仍仅存于本地设备`,
    })
  }

  return buildResult(hits, {})
}

/**
 * publish 流闸：发布到流水线。
 * - 外部分享渠道（share）触发第1条·本地私有硬拦截（critical，不可 override）。
 * - 其余渠道（timeline/garden/anchor/world/export）与内容仅观测。
 */
export function governanceCheckPublish(channels: string[], content: string): GovernanceResult {
  const hits = collectObservationHits(content)

  if (channels.includes('share')) {
    hits.push({
      signal: 'localPrivate',
      category: 'externalChannel',
      severity: 'critical',
      matched: 'share',
      message: '第1条·本地私有：禁止外部分享渠道（share），数据不得离开本地设备',
    })
    return buildResult(hits, {
      blockedBy: 'localPrivate',
      reason: '外部分享（share）违反第1条·本地私有，已拦截',
    })
  }

  // 内容提及外部关键词，仅观测提醒（本地渠道发布不拦截）
  for (const kw of detectExternalShare(content)) {
    hits.push({
      signal: 'localPrivate',
      category: 'externalShare',
      severity: 'major',
      matched: kw,
      message: `第1条·本地私有提醒：内容提及「${kw}」（本地渠道发布，未离开设备）`,
    })
  }

  return buildResult(hits, {})
}

/**
 * export 流闸：导出为本地文件。
 * 本地文件导出不拦截（数据未离开设备），三条信号仅观测 + 上报。
 */
export function governanceCheckExport(content: string): GovernanceResult {
  const hits = collectObservationHits(content)
  for (const kw of detectExternalShare(content)) {
    hits.push({
      signal: 'localPrivate',
      category: 'externalShare',
      severity: 'major',
      matched: kw,
      message: `第1条·本地私有提醒：内容提及「${kw}」（导出为本地文件，未离开设备）`,
    })
  }
  return buildResult(hits, {})
}
