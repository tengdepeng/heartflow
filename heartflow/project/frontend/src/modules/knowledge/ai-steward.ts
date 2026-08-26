// ============================================================
// 经略阁 · 本地 AI 知识管家模块
// 纯函数实现，不依赖 AI 引擎，基于本地规则计算
// ============================================================

import type { KnowledgeNode, KnowledgeRelation, KnowledgeCategory } from './types'

// ---- 类型导出 ----

export interface ConnectionSuggestion {
  sourceId: string
  targetId: string
  reason: string
  score: number
}

export interface CategoryCoverage {
  category: KnowledgeCategory
  nodeCount: number
  coverageScore: number
  label: string
  icon: string
}

export interface HealthBreakdown {
  density: number
  relation: number
  diversity: number
  depth: number
}

export interface HealthScoreResult {
  total: number
  breakdown: HealthBreakdown
  level: { label: string; color: string }
}

// ---- 内部常量 ----

const CATEGORY_META: Record<KnowledgeCategory, { label: string; icon: string }> = {
  concept: { label: '概念', icon: '💡' },
  rule: { label: '法则', icon: '📏' },
  frame: { label: '框架', icon: '🔲' },
  insight: { label: '直觉', icon: '✨' },
  pitfall: { label: '误区', icon: '⚠️' },
  metaphor: { label: '比喻', icon: '🎭' },
}

const CATEGORIES: KnowledgeCategory[] = ['concept', 'rule', 'frame', 'insight', 'pitfall', 'metaphor']

const SOCRATIC_TEMPLATES: Record<KnowledgeCategory, string[]> = {
  concept: [
    '这个概念的核心前提是什么？',
    '有哪些反例可能挑战它的定义？',
    '这个概念与其他概念之间的边界在哪里？',
    '如果用一个比喻来向新手解释，你会怎么描述？',
    '这个概念在什么情况下会失去解释力？',
  ],
  rule: [
    '这条法则的适用范围是什么？有没有例外？',
    '它是从哪些观察或经验中总结出来的？',
    '如果违背这条法则，会发生什么？',
    '这条法则与其他法则之间有冲突吗？',
    '在什么条件下这条法则需要被修正？',
  ],
  frame: [
    '这个框架试图解决什么问题？',
    '框架中的各个要素之间是如何相互作用的？',
    '这个框架的盲区在哪里？它忽略了什么？',
    '有没有其他框架可以替代它？优劣如何？',
    '如果给这个框架增加一个维度，会是什么？',
  ],
  insight: [
    '这个直觉是从哪次经历或观察中形成的？',
    '它是否经得起逻辑检验？有没有反直觉的部分？',
    '这个直觉能推广到其他领域吗？',
    '如果与直觉相反才是对的，那会怎样？',
    '这个直觉在什么场景下可能会误导你？',
  ],
  pitfall: [
    '这个误区的根源是什么？是认知偏差还是经验不足？',
    '有哪些常见的场景会触发这个误区？',
    '如何设计一个「防错机制」来避免这个误区？',
    '这个误区与哪些正确的认知是镜像关系？',
    '曾经有哪些反面例子让你意识到这是个误区？',
  ],
  metaphor: [
    '这个比喻的源域和目标域分别是什么？',
    '比喻在哪些方面是贴切的，在哪些方面可能误导？',
    '如果换一个源域来比喻，你会选什么？为什么？',
    '这个比喻揭示了什么隐藏的真理？',
    '过度延伸这个比喻会导致什么错误结论？',
  ],
}

// ---- 工具函数 ----

/** Jaccard 标签相似度 */
function tagSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

/** 健康等级 */
function getHealthLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '茁壮', color: '#34d399' }
  if (score >= 60) return { label: '良好', color: '#f0c040' }
  if (score >= 40) return { label: '初萌', color: '#f6b26b' }
  if (score >= 20) return { label: '萌芽', color: '#b5707a' }
  return { label: '待育', color: '#ef4444' }
}

// ---- 核心 API ----

/**
 * 建议可能感兴趣的知识连接
 * 基于节点分类和标签相似度计算
 */
export function suggestConnections(
  nodeId: string,
  nodes: KnowledgeNode[],
  relations: KnowledgeRelation[],
): ConnectionSuggestion[] {
  const targetNode = nodes.find(n => n.id === nodeId)
  if (!targetNode) return []

  // 已存在关系的节点 ID 集合
  const existingIds = new Set<string>()
  for (const r of relations) {
    if (r.sourceId === nodeId) existingIds.add(r.targetId)
    if (r.targetId === nodeId) existingIds.add(r.sourceId)
  }

  const candidates: ConnectionSuggestion[] = []

  for (const node of nodes) {
    if (node.id === nodeId || existingIds.has(node.id)) continue

    let score = 0
    const reasons: string[] = []

    // 同分类加分 (最高 30)
    if (node.cat === targetNode.cat) {
      score += 30
      const meta = CATEGORY_META[node.cat]
      reasons.push(`同属「${meta?.label || node.cat}」分类`)
    }

    // 标签相似度 (最高 40)
    const tagSim = tagSimilarity(targetNode.tags, node.tags)
    if (tagSim > 0) {
      const tagScore = Math.round(tagSim * 40)
      score += tagScore
      reasons.push(`标签相似度 ${Math.round(tagSim * 100)}%`)
    }

    // 标题字符重叠 (最高 20)
    const targetChars = new Set(targetNode.title.split(''))
    const nodeChars = node.title.split('')
    const commonChars = nodeChars.filter(c => targetChars.has(c)).length
    if (commonChars > 1) {
      const charScore = Math.min(commonChars * 5, 20)
      score += charScore
    }

    // 描述内容相似度 (最高 10)
    if (node.desc && targetNode.desc) {
      const targetWords = targetNode.desc.split(/[\s,，。.、]+/).filter(w => w.length > 1)
      const nodeWords = node.desc.split(/[\s,，。.、]+/).filter(w => w.length > 1)
      if (targetWords.length > 0 && nodeWords.length > 0) {
        const commonWords = nodeWords.filter(w => targetWords.includes(w)).length
        const maxLen = Math.max(targetWords.length, nodeWords.length)
        const descSim = commonWords / maxLen
        score += Math.round(descSim * 10)
        if (descSim > 0.3) reasons.push('描述内容有相似表述')
      }
    }

    if (score > 0) {
      candidates.push({
        sourceId: nodeId,
        targetId: node.id,
        reason: reasons.join('；') || '潜在关联',
        score: Math.min(score, 100),
      })
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5)
}

/**
 * 基于知识节点内容生成苏格拉底式追问
 * 根据节点分类返回 5 个预设问题模板
 */
export function generateQuestions(
  nodeId: string,
  nodes: KnowledgeNode[],
): string[] {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return []

  const templates = SOCRATIC_TEMPLATES[node.cat]
  if (!templates) {
    // 后备：通用追问
    return [
      '这个判断的前提是什么？',
      '有哪些反例可以反驳它？',
      '这个框架在什么情况下会失效？',
      '如果教给一个新手，你会怎么比喻？',
      '这个直觉是从哪次经历中形成的？',
    ]
  }

  return templates
}

/**
 * 检测知识盲区
 * 返回各分类的覆盖度评分 (0-100)
 */
export function detectBlindSpots(
  nodes: KnowledgeNode[],
  categories?: KnowledgeCategory[],
): CategoryCoverage[] {
  const cats = categories ?? CATEGORIES
  const maxCount = Math.max(1, ...cats.map(c => nodes.filter(n => n.cat === c).length))

  return cats.map(cat => {
    const nodeCount = nodes.filter(n => n.cat === cat).length
    const meta = CATEGORY_META[cat]
    const coverageScore = maxCount > 0 ? Math.round((nodeCount / maxCount) * 100) : 0

    return {
      category: cat,
      nodeCount,
      coverageScore,
      label: meta?.label ?? cat,
      icon: meta?.icon ?? '📌',
    }
  })
}

/**
 * 计算知识健康评分
 *
 * 权重：
 * - 密度 30%：节点数量相对于基准的覆盖度
 * - 关系 30%：关联关系与节点数的比例
 * - 多样性 20%：覆盖的分类数占总分类数的比例
 * - 深度 20%：有描述内容的节点比例
 */
export function calculateHealthScore(
  nodes: KnowledgeNode[],
  relations: KnowledgeRelation[],
): HealthScoreResult {
  const totalNodes = nodes.length

  if (totalNodes === 0) {
    return {
      total: 0,
      breakdown: { density: 0, relation: 0, diversity: 0, depth: 0 },
      level: getHealthLevel(0),
    }
  }

  // 密度分 (30%)：10 个节点为基准满分
  const density = Math.min(30, (totalNodes / 10) * 30)

  // 关系分 (30%)：每个节点平均 0.5 条关系为基准满分
  const relRatio = relations.length / totalNodes
  const relation = Math.min(30, relRatio * 30 * 2)

  // 多样性分 (20%)：覆盖的分类占比
  const activeCats = new Set(nodes.map(n => n.cat)).size
  const totalCats = CATEGORIES.length
  const diversity = (activeCats / totalCats) * 20

  // 深度分 (20%)：有描述内容的节点占比
  const hasDesc = nodes.filter(n => n.desc.trim().length > 0).length
  const depth = (hasDesc / totalNodes) * 20

  const total = Math.round(density + relation + diversity + depth)

  return {
    total,
    breakdown: {
      density: Math.round(density),
      relation: Math.round(relation),
      diversity: Math.round(diversity * 10) / 10,
      depth: Math.round(depth * 10) / 10,
    },
    level: getHealthLevel(total),
  }
}