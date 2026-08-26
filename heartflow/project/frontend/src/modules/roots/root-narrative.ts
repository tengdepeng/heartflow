// ============================================================
// 根脉之庭 · 根系叙事生成
// 蓝图定义：
//   从根系数据生成生平叙事、时代脉络故事
//   支持三种叙事模式：溯源叙事、时代回顾、支线故事
//   根系健康度评分与生长建议
// ============================================================

import type { Root, RootLayer } from './types'
import type { TraceTree } from './root-tree'
import { LAYER_CONFIG } from './types'

// ---- 叙事模式 ----

export type NarrativeMode = 'origin' | 'era' | 'branch'

export const NARRATIVE_MODE_LABELS: Record<NarrativeMode, string> = {
  origin: '溯源叙事',
  era: '时代回顾',
  branch: '支线故事',
}

// ---- 叙事段落 ----

export interface NarrativeParagraph {
  id: string
  text: string
  relatedRoots: string[]
  layer: RootLayer
  era: string
  emotionalTone: 'positive' | 'neutral' | 'reflective' | 'nostalgic' | 'challenging'
  intensity: number
}

export interface RootNarrative {
  title: string
  mode: NarrativeMode
  subtitle: string
  paragraphs: NarrativeParagraph[]
  /** 涉及的关键人物/事件 */
  keyCharacters: string[]
  /** 叙事时间线 */
  timeline: { era: string; summary: string }[]
  /** 情感曲线 */
  emotionalCurve: { position: number; tone: string; intensity: number }[]
  /** 生成时间 */
  generatedAt: string
}

// ---- 情感色调 ----

const EMOTIONAL_TONES: Record<string, NarrativeParagraph['emotionalTone']> = {
  '家庭': 'nostalgic',
  '童年': 'nostalgic',
  '故乡': 'nostalgic',
  '温暖': 'positive',
  '成长': 'positive',
  '成就': 'positive',
  '爱': 'positive',
  '友谊': 'positive',
  '梦想': 'positive',
  '挑战': 'challenging',
  '困难': 'challenging',
  '挫折': 'challenging',
  '失落': 'reflective',
  '变迁': 'reflective',
  '选择': 'reflective',
  '思考': 'reflective',
  '信念': 'positive',
  '价值观': 'reflective',
}

/**
 * 从根系数据生成溯源叙事
 * 按土壤→树干→枝桠的顺序，讲述成长的根基故事
 */
export function generateOriginNarrative(
  roots: Root[],
  _traceTree: TraceTree,
): RootNarrative {
  const paragraphs: NarrativeParagraph[] = []
  const keyCharacters: string[] = []
  const timeline: { era: string; summary: string }[] = []
  const emotionalCurve: { position: number; tone: string; intensity: number }[] = []

  // 按层排序
  const layerOrder: RootLayer[] = ['soil', 'era', 'branch']
  let position = 0

  for (const layer of layerOrder) {
    const layerRoots = roots.filter(r => r.layer === layer)
    if (layerRoots.length === 0) continue

    // 层引言
    const layerConfig = LAYER_CONFIG[layer]
    paragraphs.push({
      id: `nar_intro_${layer}`,
      text: layer === 'soil'
        ? `我的根，深扎在这片土壤之中——${layerConfig.description}。以下是我最初的滋养——`
        : layer === 'era'
          ? `随着年岁增长，时代在我身上刻下了印记——${layerConfig.description}。这些经历塑造了今日的我——`
          : `在根系之上，枝桠开始分叉——${layerConfig.description}。每一次选择，都是一条新的路径——`,
      relatedRoots: layerRoots.map(r => r.id),
      layer,
      era: '',
      emotionalTone: 'reflective',
      intensity: 0.5,
    })

    // 按 era 分组
    const eraGroups = new Map<string, Root[]>()
    for (const root of layerRoots) {
      const era = root.era || '未分类'
      if (!eraGroups.has(era)) eraGroups.set(era, [])
      eraGroups.get(era)!.push(root)
    }

    // 为每个时期生成叙事段落
    for (const [era, eraRoots] of eraGroups) {
      const tone = detectTone(era, eraRoots)
      const avgStrength = eraRoots.reduce((s, r) => s + r.strength, 0) / eraRoots.length

      // 生成段落文本
      let text = ''
      if (eraRoots.length === 1) {
        const r = eraRoots[0]
        text = `在「${era}」时期，${r.text}。${r.detail ? r.detail : ''}`
      } else {
        const strongest = eraRoots.sort((a, b) => b.strength - a.strength)[0]
        text = `「${era}」是我生命中重要的阶段。${strongest.text}。`
        if (eraRoots.length > 1) {
          text += `与此同时，${eraRoots.slice(0, 3).map(r => r.text).join('、')}，这些经历共同编织成这段时光。`
        }
      }

      const paragraph: NarrativeParagraph = {
        id: `nar_${layer}_${era.replace(/\s+/g, '_')}`,
        text,
        relatedRoots: eraRoots.map(r => r.id),
        layer,
        era,
        emotionalTone: tone,
        intensity: avgStrength,
      }
      paragraphs.push(paragraph)

      timeline.push({
        era,
        summary: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      })

      emotionalCurve.push({
        position: position++,
        tone,
        intensity: avgStrength,
      })

      // 提取关键人物
      for (const root of eraRoots) {
        // 从标签中提取人物名称
        if (root.tags) {
          const personTags = root.tags.filter(t =>
            !['家庭', '童年', '成长', '梦想', '信念', '价值观', '选择', '挑战', '成就'].includes(t),
          )
          for (const pt of personTags) {
            if (!keyCharacters.includes(pt)) {
              keyCharacters.push(pt)
            }
          }
        }
      }
    }
  }

  return {
    title: '我的根脉',
    mode: 'origin',
    subtitle: '从土壤到枝桠的成长叙事',
    paragraphs,
    keyCharacters: keyCharacters.slice(0, 10),
    timeline,
    emotionalCurve,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * 生成时代回顾叙事
 * 按时间线整理各时期的经历
 */
export function generateEraNarrative(roots: Root[]): RootNarrative {
  const paragraphs: NarrativeParagraph[] = []
  const timeline: { era: string; summary: string }[] = []

  // 按 era 分组并排序（按强度）
  const eraGroups = new Map<string, Root[]>()
  for (const root of roots) {
    const era = root.era || '未知时期'
    if (!eraGroups.has(era)) eraGroups.set(era, [])
    eraGroups.get(era)!.push(root)
  }

  // 按最弱到最强排序时期
  const sortedEras = [...eraGroups.entries()].sort((a, b) => {
    const avgA = a[1].reduce((s, r) => s + r.strength, 0) / a[1].length
    const avgB = b[1].reduce((s, r) => s + r.strength, 0) / b[1].length
    return avgA - avgB
  })

  let position = 0
  const emotionalCurve: { position: number; tone: string; intensity: number }[] = []

  for (const [era, eraRoots] of sortedEras) {
    const tone = detectTone(era, eraRoots)
    const avgStrength = eraRoots.reduce((s, r) => s + r.strength, 0) / eraRoots.length

    // 按层组织
    const soilRoots = eraRoots.filter(r => r.layer === 'soil')
    const eraLayerRoots = eraRoots.filter(r => r.layer === 'era')
    const branchRoots = eraRoots.filter(r => r.layer === 'branch')

    let text = `「${era}」——`

    if (soilRoots.length > 0) {
      text += `根基层面：${soilRoots.map(r => r.text).join('；')}。`
    }
    if (eraLayerRoots.length > 0) {
      text += `时代印记：${eraLayerRoots.map(r => r.text).join('；')}。`
    }
    if (branchRoots.length > 0) {
      text += `选择与信念：${branchRoots.map(r => r.text).join('；')}。`
    }

    paragraphs.push({
      id: `era_${era.replace(/\s+/g, '_')}`,
      text,
      relatedRoots: eraRoots.map(r => r.id),
      layer: eraRoots[0]?.layer || 'era',
      era,
      emotionalTone: tone,
      intensity: avgStrength,
    })

    timeline.push({
      era,
      summary: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
    })

    emotionalCurve.push({
      position: position++,
      tone,
      intensity: avgStrength,
    })
  }

  return {
    title: '时代回响',
    mode: 'era',
    subtitle: '回溯生命中每个重要的时代印记',
    paragraphs,
    keyCharacters: [],
    timeline,
    emotionalCurve,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * 生成支线故事
 * 选取一条特定根系，生成其发展叙事
 */
export function generateBranchNarrative(
  root: Root,
  allRoots: Root[],
): RootNarrative {
  const paragraphs: NarrativeParagraph[] = []

  // 主叙事
  paragraphs.push({
    id: `branch_main_${root.id}`,
    text: `${root.text}。${root.detail}`,
    relatedRoots: [root.id],
    layer: root.layer,
    era: root.era,
    emotionalTone: detectTone(root.era, [root]),
    intensity: root.strength,
  })

  // 关联根系
  const connectedRoots = allRoots.filter(r =>
    root.connections.includes(r.id) || r.connections.includes(root.id),
  )

  if (connectedRoots.length > 0) {
    const connText = connectedRoots
      .map(r => `在「${r.era}」时期，${r.text}`)
      .join('。')

    paragraphs.push({
      id: `branch_connections_${root.id}`,
      text: `这条支线并非孤立存在。${connText}。这些经历与「${root.text}」相互交织，共同构成了我生命的经纬。`,
      relatedRoots: [root.id, ...connectedRoots.map(r => r.id)],
      layer: root.layer,
      era: root.era,
      emotionalTone: 'reflective',
      intensity: 0.6,
    })
  }

  return {
    title: `支线：「${root.text}」`,
    mode: 'branch',
    subtitle: `从${LAYER_CONFIG[root.layer]?.label || '未知'}生长出的故事`,
    paragraphs,
    keyCharacters: [],
    timeline: [{ era: root.era, summary: root.text }],
    emotionalCurve: [{ position: 0, tone: detectTone(root.era, [root]), intensity: root.strength }],
    generatedAt: new Date().toISOString(),
  }
}

// ---- 根系健康度 ----

export interface RootHealth {
  rootId: string
  text: string
  layer: RootLayer
  score: number
  level: 'thriving' | 'healthy' | 'weakening' | 'dormant' | 'atrophy'
  factors: {
    strength: number
    connections: number
    recency: number
    depth: number
  }
  suggestions: string[]
}

export interface RootGardenHealth {
  overallScore: number
  overallLevel: string
  byLayer: { layer: RootLayer; score: number; count: number }[]
  byRoot: RootHealth[]
  topStrengths: string[]
  attentionNeeded: RootHealth[]
  growthSuggestions: string[]
}

const HEALTH_LEVELS = {
  thriving: { min: 80, label: '蓬勃生长', color: '#34d399' },
  healthy: { min: 60, label: '健康状态', color: '#6b9fc4' },
  weakening: { min: 40, label: '需要关注', color: '#f59e0b' },
  dormant: { min: 20, label: '趋于休眠', color: '#d98c7a' },
  atrophy: { min: 0, label: '正在萎缩', color: '#ef4444' },
}

/**
 * 计算单个根系的健康度
 */
export function computeRootHealth(root: Root, allRoots: Root[]): RootHealth {
  const now = Date.now()

  // 强度因子 (0-40)
  const strengthScore = root.strength * 40

  // 连接因子 (0-30)
  const connectionCount = root.connections.filter(id => allRoots.some(r => r.id === id)).length
  const maxConnections = Math.max(1, allRoots.length - 1)
  const connectionScore = Math.min(30, (connectionCount / maxConnections) * 30)

  // 新鲜度因子 (0-20)
  const daysSinceUpdate = (now - new Date(root.lastUpdatedAt).getTime()) / 86400000
  const recencyScore = Math.max(0, 20 - Math.min(20, daysSinceUpdate * 0.6))

  // 深度因子 (0-10)
  const detailLength = root.detail?.length || 0
  const depthScore = Math.min(10, detailLength / 20)

  const totalScore = Math.round(strengthScore + connectionScore + recencyScore + depthScore)

  let level: RootHealth['level'] = 'atrophy'
  for (const [levelKey, config] of Object.entries(HEALTH_LEVELS)) {
    if (totalScore >= config.min) {
      level = levelKey as RootHealth['level']
      break
    }
  }

  // 生成建议
  const suggestions: string[] = []
  if (strengthScore < 20) suggestions.push('该根系强度较低，建议回顾并加深相关记忆')
  if (connectionScore < 10) suggestions.push('该根系与其他根系关联较少，尝试发现新的连接')
  if (recencyScore < 10) suggestions.push(`已${Math.round(daysSinceUpdate)}天未更新，建议重温`)
  if (depthScore < 5) suggestions.push('添加更多细节描述，让根脉更加丰满')

  return {
    rootId: root.id,
    text: root.text,
    layer: root.layer,
    score: totalScore,
    level,
    factors: {
      strength: Math.round(strengthScore),
      connections: Math.round(connectionScore),
      recency: Math.round(recencyScore),
      depth: Math.round(depthScore),
    },
    suggestions,
  }
}

/**
 * 计算整体根系花园健康度
 */
export function computeGardenHealth(roots: Root[]): RootGardenHealth {
  const byRoot = roots.map(r => computeRootHealth(r, roots))
  const overallScore = byRoot.length > 0
    ? Math.round(byRoot.reduce((s, r) => s + r.score, 0) / byRoot.length)
    : 0

  let overallLevel = 'atrophy'
  for (const [, config] of Object.entries(HEALTH_LEVELS)) {
    if (overallScore >= config.min) {
      overallLevel = config.label
      break
    }
  }

  // 按层统计
  const layerMap = new Map<RootLayer, { total: number; count: number }>()
  for (const root of byRoot) {
    if (!layerMap.has(root.layer)) layerMap.set(root.layer, { total: 0, count: 0 })
    const entry = layerMap.get(root.layer)!
    entry.total += root.score
    entry.count++
  }
  const byLayer = Array.from(layerMap.entries()).map(([layer, data]) => ({
    layer,
    score: Math.round(data.total / data.count),
    count: data.count,
  }))

  // 最强项
  const topStrengths = byRoot
    .filter(r => r.level === 'thriving' || r.level === 'healthy')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.text)

  // 需要关注
  const attentionNeeded = byRoot
    .filter(r => r.level === 'weakening' || r.level === 'dormant' || r.level === 'atrophy')
    .sort((a, b) => a.score - b.score)

  // 成长建议
  const growthSuggestions: string[] = []
  const soilCount = byRoot.filter(r => r.layer === 'soil').length
  const eraCount = byRoot.filter(r => r.layer === 'era').length
  const branchCount = byRoot.filter(r => r.layer === 'branch').length

  if (soilCount < 3) growthSuggestions.push('根系层的记录较少，建议补充更多关于家庭、故乡和童年的根脉')
  if (eraCount < 3) growthSuggestions.push('时代层的记录可进一步丰富，回顾成长中的关键事件')
  if (branchCount < 3) growthSuggestions.push('枝桠层的记录还不够，试着梳理那些塑造你价值观的关键选择')
  if (attentionNeeded.length > byRoot.length * 0.3) {
    growthSuggestions.push(`有${attentionNeeded.length}个根系需要关注，建议定期回顾和维护`)
  }

  return {
    overallScore,
    overallLevel,
    byLayer,
    byRoot,
    topStrengths,
    attentionNeeded,
    growthSuggestions,
  }
}

// ---- 辅助函数 ----

/**
 * 检测情感色调
 */
function detectTone(_era: string, roots: Root[]): NarrativeParagraph['emotionalTone'] {
  const allTags = roots.flatMap(r => r.tags || [])
  const allText = roots.map(r => `${r.text} ${r.detail}`).join(' ')

  const toneScores: Record<NarrativeParagraph['emotionalTone'], number> = {
    positive: 0,
    neutral: 0,
    reflective: 0,
    nostalgic: 0,
    challenging: 0,
  }

  for (const [keyword, tone] of Object.entries(EMOTIONAL_TONES)) {
    if (allText.includes(keyword) || allTags.includes(keyword)) {
      toneScores[tone] += 1
    }
  }

  // 默认中性
  if (Object.values(toneScores).every(v => v === 0)) return 'neutral'

  return (Object.entries(toneScores).sort((a, b) => b[1] - a[1])[0][0]) as NarrativeParagraph['emotionalTone']
}

// ---- 导出 ----

export { HEALTH_LEVELS, EMOTIONAL_TONES }