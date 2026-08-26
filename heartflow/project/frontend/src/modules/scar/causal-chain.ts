// ============================================================
// 工痕 · 伤痕因果链分析（P16-6）
// 伤痕 → 事件 → 影响 → 成长的完整因果链路追踪
// ============================================================

import type {
  BodyMark, GrowthRecord,
} from './types'

// ---- 因果链类型 ----

/** 因果事件 */
export interface CausalEvent {
  id: string
  /** 事件类型 */
  type: 'trigger' | 'scar_formation' | 'impact' | 'coping' | 'reflection' | 'growth'
  /** 事件标签 */
  label: string
  /** 事件描述 */
  description: string
  /** 关联的伤痕 ID */
  scarId?: string
  /** 关联的成长记录 ID */
  growthId?: string
  /** 发生时间 */
  occurredAt: string
  /** 事件强度 0-1 */
  intensity: number
  /** 情感标签 */
  emotions: string[]
}

/** 因果链接 */
export interface CausalLink {
  id: string
  /** 源事件 ID */
  sourceId: string
  /** 目标事件 ID */
  targetId: string
  /** 链接类型 */
  type: 'causes' | 'contributes' | 'triggers' | 'alleviates' | 'transforms'
  /** 因果强度 0-1 */
  strength: number
  /** 链接描述 */
  description: string
}

/** 伤痕因果链 */
export interface ScarCausalChain {
  /** 关联的伤痕 */
  scar: BodyMark
  /** 因果事件列表 */
  events: CausalEvent[]
  /** 因果链接列表 */
  links: CausalLink[]
  /** 根因事件 */
  rootCauses: CausalEvent[]
  /** 成长事件 */
  growthOutcomes: CausalEvent[]
  /** 链路总深度 */
  depth: number
  /** 因果链整体强度 */
  overallStrength: number
  /** 生成时间 */
  generatedAt: string
}

/** 因果链分析报告 */
export interface CausalChainAnalysis {
  /** 分析的伤痕数量 */
  totalScars: number
  /** 因果链数量 */
  chainCount: number
  /** 平均因果深度 */
  avgDepth: number
  /** 最常见根因类型 */
  topRootCauses: { label: string; count: number }[]
  /** 最常见成长方向 */
  topGrowthDirections: { direction: string; count: number }[]
  /** 因果模式 */
  patterns: CausalPattern[]
  /** 转化率 */
  transformationRate: number
}

/** 因果模式 */
export interface CausalPattern {
  /** 模式名称 */
  name: string
  /** 匹配的伤痕数量 */
  matchCount: number
  /** 模式描述 */
  description: string
  /** 典型事件序列 */
  typicalSequence: string[]
}

// ---- 因果链构建器 ----

/** 根因触发词映射 */
const ROOT_CAUSE_TRIGGERS: Record<string, string[]> = {
  work: ['工作', '项目', '加班', 'deadline', '压力', '任务', '考核'],
  relationship: ['关系', '冲突', '沟通', '误解', '信任', '背叛', '分离'],
  health: ['健康', '疾病', '身体', '睡眠', '疲劳', '饮食'],
  growth: ['成长', '挑战', '失败', '挫折', '学习', '改变'],
  identity: ['自我', '价值', '意义', '方向', '迷茫', '定位'],
  environment: ['环境', '变化', '搬家', '适应', '新环境'],
}

/** 情感词典 */
const EMOTION_LEXICON: Record<string, string[]> = {
  pain: ['痛', '苦', '难过', '悲伤', '伤心', '绝望', '崩溃', '难受', '痛苦'],
  fear: ['怕', '恐惧', '焦虑', '不安', '担心', '害怕', '紧张', '恐慌'],
  anger: ['怒', '生气', '愤怒', '不满', '烦躁', '恼火', '愤'],
  confusion: ['迷', '困惑', '不解', '迷茫', '混乱', '不知所措'],
  hope: ['希望', '期待', '信心', '乐观', '相信', '未来'],
  acceptance: ['接受', '接纳', '理解', '释然', '放下', '和解'],
  growth: ['成长', '学到', '收获', '进步', '变强', '强大', '力量'],
  peace: ['平静', '平和', '安', '宁静', '从容', '释怀'],
}

/**
 * 从文本中提取情感标签
 */
function extractEmotions(text: string): string[] {
  const emotions: string[] = []
  for (const [emotion, keywords] of Object.entries(EMOTION_LEXICON)) {
    if (keywords.some(kw => text.includes(kw))) {
      emotions.push(emotion)
    }
  }
  return emotions.length > 0 ? emotions : ['neutral']
}

/**
 * 识别根因类别
 */
function classifyRootCause(text: string): string {
  for (const [category, keywords] of Object.entries(ROOT_CAUSE_TRIGGERS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category
    }
  }
  return 'other'
}

/**
 * 计算两个事件之间的因果强度
 */
function computeLinkStrength(
  source: CausalEvent,
  target: CausalEvent,
  _linkType: CausalLink['type'],
): number {
  let strength = 0.5

  // 根据事件类型调整
  const typeWeights: Record<string, Record<string, number>> = {
    trigger: { scar_formation: 0.9, impact: 0.7, coping: 0.3, reflection: 0.2, growth: 0.1 },
    scar_formation: { impact: 0.8, coping: 0.6, reflection: 0.4, growth: 0.2 },
    impact: { coping: 0.7, reflection: 0.6, growth: 0.3 },
    coping: { reflection: 0.6, growth: 0.5 },
    reflection: { growth: 0.8 },
    growth: {},
  }

  const typeWeight = typeWeights[source.type]?.[target.type] ?? 0.3
  strength = (strength + typeWeight) / 2

  // 情感共鸣增强
  const sharedEmotions = source.emotions.filter(e => target.emotions.includes(e))
  strength += sharedEmotions.length * 0.05

  // 时间接近度增强
  const sourceTime = new Date(source.occurredAt).getTime()
  const targetTime = new Date(target.occurredAt).getTime()
  const daysDiff = Math.abs(targetTime - sourceTime) / 86400000
  if (daysDiff < 7) strength += 0.1
  else if (daysDiff < 30) strength += 0.05
  else if (daysDiff > 365) strength -= 0.1

  return Math.min(Math.max(Math.round(strength * 100) / 100, 0.05), 1)
}

// ============================================================
// useCausalChain
// ============================================================

export function useCausalChain() {
  /**
   * 为单个伤痕构建因果链
   */
  function buildCausalChain(
    scar: BodyMark,
    _allMarks: BodyMark[],
    growthRecords: GrowthRecord[],
  ): ScarCausalChain {
    const events: CausalEvent[] = []
    const links: CausalLink[] = []

    // 1. 创建触发事件（从伤痕描述中提取）
    const triggerEvent: CausalEvent = {
      id: `trigger-${scar.id}`,
      type: 'trigger',
      label: `触发事件：${scar.description.slice(0, 20)}`,
      description: scar.description,
      scarId: scar.id,
      occurredAt: scar.recordedAt,
      intensity: scar.severity / 5,
      emotions: extractEmotions(scar.description),
    }
    events.push(triggerEvent)

    // 2. 创建伤痕形成事件
    const scarEvent: CausalEvent = {
      id: `scar-${scar.id}`,
      type: 'scar_formation',
      label: `${scar.scarType} 伤痕形成 (${scar.bodyPart})`,
      description: `严重度 ${scar.severity}/5 的${scar.scarType}类型伤痕`,
      scarId: scar.id,
      occurredAt: scar.recordedAt,
      intensity: scar.severity / 5,
      emotions: ['pain'],
    }
    events.push(scarEvent)

    // trigger → scar
    links.push({
      id: `link-${triggerEvent.id}-${scarEvent.id}`,
      sourceId: triggerEvent.id,
      targetId: scarEvent.id,
      type: 'causes',
      strength: computeLinkStrength(triggerEvent, scarEvent, 'causes'),
      description: '触发事件导致伤痕形成',
    })

    // 3. 创建影响事件（如果有 worklogId）
    if (scar.worklogId) {
      const impactEvent: CausalEvent = {
        id: `impact-${scar.id}`,
        type: 'impact',
        label: `工作影响：${scar.description.slice(0, 15)}`,
        description: `通过工作日志 ${scar.worklogId} 记录的影响`,
        scarId: scar.id,
        occurredAt: scar.recordedAt,
        intensity: 0.6,
        emotions: extractEmotions(scar.description),
      }
      events.push(impactEvent)

      links.push({
        id: `link-${scarEvent.id}-${impactEvent.id}`,
        sourceId: scarEvent.id,
        targetId: impactEvent.id,
        type: 'triggers',
        strength: computeLinkStrength(scarEvent, impactEvent, 'triggers'),
        description: '伤痕触发工作影响',
      })
    }

    // 4. 创建应对事件（基于愈合阶段）
    const copingEvent: CausalEvent = {
      id: `coping-${scar.id}`,
      type: 'coping',
      label: `应对阶段：${scar.healingStage}`,
      description: `愈合进度 ${scar.healingProgress}%，处于${scar.healingStage}阶段`,
      scarId: scar.id,
      occurredAt: new Date(
        new Date(scar.recordedAt).getTime() + 7 * 86400000,
      ).toISOString(),
      intensity: 0.5,
      emotions: ['confusion', 'hope'],
    }
    events.push(copingEvent)

    const lastEvent = events[events.length - 2] // connect to impact or scar
    links.push({
      id: `link-${lastEvent.id}-${copingEvent.id}`,
      sourceId: lastEvent.id,
      targetId: copingEvent.id,
      type: 'contributes',
      strength: computeLinkStrength(lastEvent, copingEvent, 'contributes'),
      description: '伤痕引发应对行为',
    })

    // 5. 创建成长事件（如果有成长记录）
    const scarGrowthRecords = growthRecords.filter(r => r.scarId === scar.id)
    const growthOutcomes: CausalEvent[] = []

    if (scarGrowthRecords.length > 0) {
      for (const gr of scarGrowthRecords) {
        const reflectionEvent: CausalEvent = {
          id: `reflection-${gr.id}`,
          type: 'reflection',
          label: `反思：${gr.reflection.slice(0, 20)}`,
          description: gr.reflection,
          scarId: scar.id,
          growthId: gr.id,
          occurredAt: gr.recordedAt,
          intensity: 0.7,
          emotions: extractEmotions(gr.reflection),
        }
        events.push(reflectionEvent)

        links.push({
          id: `link-${copingEvent.id}-${reflectionEvent.id}`,
          sourceId: copingEvent.id,
          targetId: reflectionEvent.id,
          type: 'contributes',
          strength: computeLinkStrength(copingEvent, reflectionEvent, 'contributes'),
          description: '应对过程促进反思',
        })

        const growthEvent: CausalEvent = {
          id: `growth-${gr.id}`,
          type: 'growth',
          label: `成长：${gr.growthDirection}`,
          description: `学到了：${gr.learned}`,
          scarId: scar.id,
          growthId: gr.id,
          occurredAt: gr.recordedAt,
          intensity: 0.8,
          emotions: extractEmotions(gr.learned),
        }
        events.push(growthEvent)
        growthOutcomes.push(growthEvent)

        links.push({
          id: `link-${reflectionEvent.id}-${growthEvent.id}`,
          sourceId: reflectionEvent.id,
          targetId: growthEvent.id,
          type: 'transforms',
          strength: computeLinkStrength(reflectionEvent, growthEvent, 'transforms'),
          description: '反思转化为成长',
        })
      }
    }

    // 6. 识别根因
    const rootCauses = [triggerEvent]

    // 7. 计算深度
    const depth = computeChainDepth(events, links)

    // 8. 计算整体强度
    const overallStrength = links.length > 0
      ? Math.round(links.reduce((sum, l) => sum + l.strength, 0) / links.length * 100) / 100
      : 0

    return {
      scar,
      events,
      links,
      rootCauses,
      growthOutcomes,
      depth,
      overallStrength,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * 批量构建因果链
   */
  function buildAllChains(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
  ): ScarCausalChain[] {
    return marks.map(scar => buildCausalChain(scar, marks, growthRecords))
  }

  /**
   * 分析因果链集合
   */
  function analyzeChains(chains: ScarCausalChain[]): CausalChainAnalysis {
    if (chains.length === 0) {
      return {
        totalScars: 0,
        chainCount: 0,
        avgDepth: 0,
        topRootCauses: [],
        topGrowthDirections: [],
        patterns: [],
        transformationRate: 0,
      }
    }

    // 根因统计
    const rootCauseCounts = new Map<string, number>()
    for (const chain of chains) {
      for (const rc of chain.rootCauses) {
        const category = classifyRootCause(rc.description)
        rootCauseCounts.set(category, (rootCauseCounts.get(category) || 0) + 1)
      }
    }

    const topRootCauses = [...rootCauseCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }))

    // 成长方向统计
    const growthDirectionCounts = new Map<string, number>()
    for (const chain of chains) {
      for (const go of chain.growthOutcomes) {
        const direction = go.label.replace('成长：', '')
        growthDirectionCounts.set(direction, (growthDirectionCounts.get(direction) || 0) + 1)
      }
    }

    const topGrowthDirections = [...growthDirectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([direction, count]) => ({ direction, count }))

    // 因果模式检测
    const patterns = detectCausalPatterns(chains)

    // 转化率
    const transformedCount = chains.filter(c => c.scar.transformed).length
    const transformationRate = Math.round((transformedCount / chains.length) * 100)

    return {
      totalScars: chains.length,
      chainCount: chains.length,
      avgDepth: Math.round(chains.reduce((s, c) => s + c.depth, 0) / chains.length * 10) / 10,
      topRootCauses,
      topGrowthDirections,
      patterns,
      transformationRate,
    }
  }

  /**
   * 追踪从根因到特定结果的完整路径
   */
  function tracePath(
    chain: ScarCausalChain,
    fromType: CausalEvent['type'],
    toType: CausalEvent['type'],
  ): CausalEvent[][] {
    const fromEvents = chain.events.filter(e => e.type === fromType)
    const toEvents = chain.events.filter(e => e.type === toType)

    if (fromEvents.length === 0 || toEvents.length === 0) return []

    const paths: CausalEvent[][] = []
    for (const from of fromEvents) {
      for (const to of toEvents) {
        const path = findPath(chain.events, chain.links, from.id, to.id)
        if (path.length > 0) {
          paths.push(path)
        }
      }
    }

    return paths
  }

  /**
   * 获取因果链摘要
   */
  function getChainSummary(chain: ScarCausalChain): string {
    const parts: string[] = []

    if (chain.rootCauses.length > 0) {
      parts.push(`根因：${chain.rootCauses[0].description.slice(0, 30)}`)
    }

    parts.push(`深度：${chain.depth} 层`)
    parts.push(`强度：${(chain.overallStrength * 100).toFixed(0)}%`)

    if (chain.growthOutcomes.length > 0) {
      parts.push(`成长：${chain.growthOutcomes.map(g => g.label).join(', ')}`)
    } else {
      parts.push('尚未产生成长')
    }

    return parts.join(' | ')
  }

  return {
    buildCausalChain,
    buildAllChains,
    analyzeChains,
    tracePath,
    getChainSummary,
    classifyRootCause,
    extractEmotions,
  }
}

// ---- 辅助函数 ----

/**
 * 计算因果链深度（最长路径）
 */
function computeChainDepth(events: CausalEvent[], links: CausalLink[]): number {
  if (events.length === 0) return 0

  // 构建邻接表
  const adj = new Map<string, string[]>()
  for (const link of links) {
    const targets = adj.get(link.sourceId) || []
    targets.push(link.targetId)
    adj.set(link.sourceId, targets)
  }

  // 找到所有入度为 0 的节点（起点）
  const inDegree = new Map<string, number>()
  for (const event of events) {
    inDegree.set(event.id, 0)
  }
  for (const link of links) {
    inDegree.set(link.targetId, (inDegree.get(link.targetId) || 0) + 1)
  }

  let maxDepth = 0
  const visited = new Set<string>()

  function dfs(nodeId: string, depth: number): void {
    visited.add(nodeId)
    maxDepth = Math.max(maxDepth, depth)
    const neighbors = adj.get(nodeId) || []
    for (const next of neighbors) {
      if (!visited.has(next)) {
        dfs(next, depth + 1)
      }
    }
  }

  for (const event of events) {
    if ((inDegree.get(event.id) || 0) === 0) {
      visited.clear()
      dfs(event.id, 1)
    }
  }

  return maxDepth
}

/**
 * BFS 寻路
 */
function findPath(
  events: CausalEvent[],
  links: CausalLink[],
  fromId: string,
  toId: string,
): CausalEvent[] {
  if (fromId === toId) {
    const event = events.find(e => e.id === fromId)
    return event ? [event] : []
  }

  const adj = new Map<string, string[]>()
  for (const link of links) {
    const targets = adj.get(link.sourceId) || []
    targets.push(link.targetId)
    adj.set(link.sourceId, targets)
  }

  const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromId, path: [fromId] }]
  const visited = new Set<string>([fromId])

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adj.get(current.nodeId) || []

    for (const next of neighbors) {
      if (next === toId) {
        const fullPath = [...current.path, next]
        return fullPath
          .map(id => events.find(e => e.id === id))
          .filter((e): e is CausalEvent => e !== undefined)
      }
      if (!visited.has(next)) {
        visited.add(next)
        queue.push({ nodeId: next, path: [...current.path, next] })
      }
    }
  }

  return []
}

/**
 * 检测因果模式
 */
function detectCausalPatterns(chains: ScarCausalChain[]): CausalPattern[] {
  const patterns: CausalPattern[] = []

  // 模式 1: 快速转化（短期内从伤痕到成长）
  const quickTransform = chains.filter(c => {
    const trigger = c.events.find(e => e.type === 'trigger')
    const growth = c.events.find(e => e.type === 'growth')
    if (!trigger || !growth) return false
    const days = (new Date(growth.occurredAt).getTime() - new Date(trigger.occurredAt).getTime()) / 86400000
    return days < 30
  })

  if (quickTransform.length > 0) {
    patterns.push({
      name: '快速转化',
      matchCount: quickTransform.length,
      description: '在 30 天内从伤痕经历到产生成长',
      typicalSequence: ['trigger', 'scar_formation', 'coping', 'reflection', 'growth'],
    })
  }

  // 模式 2: 深度反思（有反思事件的链）
  const deepReflection = chains.filter(c =>
    c.events.filter(e => e.type === 'reflection').length >= 2,
  )

  if (deepReflection.length > 0) {
    patterns.push({
      name: '深度反思',
      matchCount: deepReflection.length,
      description: '经历了多次反思才完成转化',
      typicalSequence: ['trigger', 'scar_formation', 'impact', 'coping', 'reflection', 'reflection', 'growth'],
    })
  }

  // 模式 3: 未转化（有伤痕但无成长）
  const untransformed = chains.filter(c => c.growthOutcomes.length === 0)

  if (untransformed.length > 0) {
    patterns.push({
      name: '未转化',
      matchCount: untransformed.length,
      description: '伤痕尚未产生成长转化',
      typicalSequence: ['trigger', 'scar_formation', 'coping'],
    })
  }

  // 模式 4: 连环因果（深度 > 3）
  const deepChain = chains.filter(c => c.depth >= 4)

  if (deepChain.length > 0) {
    patterns.push({
      name: '连环因果',
      matchCount: deepChain.length,
      description: '因果链深度超过 3 层，存在复杂的因果传递',
      typicalSequence: ['trigger', 'scar_formation', 'impact', 'coping', 'reflection', 'growth'],
    })
  }

  // 模式 5: 高因果强度（overallStrength > 0.7）
  const highStrength = chains.filter(c => c.overallStrength > 0.7)

  if (highStrength.length > 0) {
    patterns.push({
      name: '强因果关联',
      matchCount: highStrength.length,
      description: '因果链整体强度超过 70%，事件间存在强关联',
      typicalSequence: ['trigger', 'scar_formation', 'coping', 'growth'],
    })
  }

  return patterns
}