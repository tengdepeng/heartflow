// ============================================================
// 工痕 · 叙事增强引擎（P20-3）
// 叙事模式匹配 + 增强建议 + 模板优化 + 叙事趋势分析
// ============================================================

import { ref } from 'vue'
import type { BodyMark, ScarStats } from './types'
import { SCAR_TYPE_META } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 叙事模式 */
export type NarrativePattern =
  | 'phoenix'        // 凤凰涅槃：从创伤中重获新生
  | 'alchemist'      // 炼金术士：将痛苦转化为智慧
  | 'warrior'        // 战士之路：抗争与坚持
  | 'explorer'       // 探索者：在伤痛中重新认识自己
  | 'gardener'       // 园丁：耐心培育内在成长
  | 'sage'           // 智者：从经验中提炼普世智慧
  | 'survivor'       // 幸存者：坚韧不拔地度过难关
  | 'bridge-builder' // 桥梁建造者：连接过去与未来

/** 叙事模式元数据 */
export interface PatternMeta {
  pattern: NarrativePattern
  label: string
  icon: string
  description: string
  /** 匹配条件 */
  conditions: string
  /** 叙事建议 */
  narrativePrompt: string
}

/** 模式匹配结果 */
export interface PatternMatch {
  /** 匹配的模式 */
  pattern: NarrativePattern
  /** 匹配度 0-1 */
  score: number
  /** 匹配原因 */
  reason: string
  /** 叙事建议 */
  suggestion: string
}

/** 叙事增强 */
export interface NarrativeEnhancement {
  /** 主要叙事模式 */
  primaryPattern: PatternMatch
  /** 次要模式 */
  secondaryPatterns: PatternMatch[]
  /** 叙事基调 */
  tone: 'triumphant' | 'reflective' | 'melancholic' | 'hopeful' | 'stoic' | 'compassionate'
  /** 关键主题 */
  themes: string[]
  /** 叙事弧线 */
  narrativeArc: NarrativeArc
  /** 增强建议 */
  suggestions: EnhancementSuggestion[]
  /** 叙事成熟度 */
  maturity: number
}

/** 叙事弧线 */
export interface NarrativeArc {
  /** 起点 */
  origin: string
  /** 转折点 */
  turningPoint: string
  /** 高潮 */
  climax: string
  /** 结局 */
  resolution: string
  /** 弧线类型 */
  type: 'rising' | 'falling-then-rising' | 'hero-journey' | 'transformation' | 'redemption'
}

/** 增强建议 */
export interface EnhancementSuggestion {
  /** 类型 */
  type: 'structure' | 'emotion' | 'detail' | 'perspective' | 'language'
  /** 标题 */
  title: string
  /** 具体建议 */
  advice: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
}

// ============================================================
// 叙事模式元数据
// ============================================================

export const NARRATIVE_PATTERNS: PatternMeta[] = [
  {
    pattern: 'phoenix',
    label: '凤凰涅槃',
    icon: '🔥',
    description: '从创伤的灰烬中重获新生，变得更加强大',
    conditions: '高转化率 + 高严重度伤痕 + 深刻成长心得',
    narrativePrompt: '这段经历如何彻底改变了你？你从中获得了怎样的新生？',
  },
  {
    pattern: 'alchemist',
    label: '炼金术士',
    icon: '⚗️',
    description: '将痛苦的经验转化为有价值的智慧和技能',
    conditions: '转化率 ≥ 50% + 多种成长方向 + 反思深刻',
    narrativePrompt: '你如何将痛苦"炼化"为有用的东西？这个过程是怎样的？',
  },
  {
    pattern: 'warrior',
    label: '战士之路',
    icon: '⚔️',
    description: '持续抗争，在战斗中成长',
    conditions: '多道伤痕 + 高锻造频率 + 恢复迅速',
    narrativePrompt: '你的战斗历程是怎样的？每一次抗争带来了什么？',
  },
  {
    pattern: 'explorer',
    label: '探索者',
    icon: '🧭',
    description: '在伤痛中重新认识自己，发现新的可能性',
    conditions: '多样化伤痕类型 + 多部位分布 + 成长方向广泛',
    narrativePrompt: '这些经历让你发现了自己哪些不为人知的一面？',
  },
  {
    pattern: 'gardener',
    label: '园丁',
    icon: '🌱',
    description: '耐心培育内在成长，一点一滴积累',
    conditions: '长期愈合 + 稳定成长 + 持续锻造',
    narrativePrompt: '你是如何耐心地培育自己的内在成长的？',
  },
  {
    pattern: 'sage',
    label: '智者',
    icon: '🦉',
    description: '从经验中提炼出普世智慧，指引他人',
    conditions: '高转化率 + 社区分享 + 深度反思',
    narrativePrompt: '你从这些经历中提炼出了什么可以分享给别人的智慧？',
  },
  {
    pattern: 'survivor',
    label: '幸存者',
    icon: '🛡️',
    description: '坚韧不拔地度过难关，证明自己的韧性',
    conditions: '高严重度伤痕 + 高愈合率 + 持续锻造',
    narrativePrompt: '是什么力量支撑你度过了最艰难的时刻？',
  },
  {
    pattern: 'bridge-builder',
    label: '桥梁建造者',
    icon: '🌉',
    description: '连接过去与未来，让伤痕成为通往更好自己的桥梁',
    conditions: '转化率高 + 时间跨度长 + 清晰成长轨迹',
    narrativePrompt: '过去的伤痕如何塑造了现在的你？它们又指向怎样的未来？',
  },
]

// ============================================================
// useNarrativeEnhancer Composable
// ============================================================

export function useNarrativeEnhancer() {
  // ---- 状态 ----
  const enhancement = ref<NarrativeEnhancement | null>(null)

  /**
   * 分析并增强叙事
   */
  function enhanceNarrative(
    marks: BodyMark[],
    stats: ScarStats,
  ): NarrativeEnhancement {
    if (marks.length === 0) {
      return createEmptyEnhancement()
    }

    // 匹配叙事模式
    const matches = matchPatterns(marks, stats)
    const primaryPattern = matches[0]
    const secondaryPatterns = matches.slice(1, 3)

    // 判定叙事基调
    const tone = detectTone(marks, stats)

    // 提取关键主题
    const themes = extractThemes(marks, stats)

    // 构建叙事弧线
    const narrativeArc = buildNarrativeArc(marks)

    // 生成增强建议
    const suggestions = generateSuggestions(marks, stats, primaryPattern, tone)

    // 计算叙事成熟度
    const maturity = calculateMaturity(marks, stats)

    const result: NarrativeEnhancement = {
      primaryPattern,
      secondaryPatterns,
      tone,
      themes,
      narrativeArc,
      suggestions,
      maturity,
    }

    enhancement.value = result
    return result
  }

  /**
   * 匹配叙事模式
   */
  function matchPatterns(marks: BodyMark[], stats: ScarStats): PatternMatch[] {
    const matches: PatternMatch[] = []
    const totalMarks = marks.length
    const transformedCount = marks.filter(m => m.transformed).length
    const transformationRate = stats.transformationRate
    const avgSeverity = marks.reduce((s, m) => s + m.severity, 0) / totalMarks
    const avgProgress = stats.avgHealingProgress

    for (const pattern of NARRATIVE_PATTERNS) {
      let score = 0
      let reason = ''

      switch (pattern.pattern) {
        case 'phoenix':
          score = (transformationRate / 100) * 0.5 + (avgSeverity / 5) * 0.3 + (avgProgress / 100) * 0.2
          reason = `转化率 ${transformationRate}%，严重度 ${avgSeverity.toFixed(1)}/5`
          break
        case 'alchemist':
          score = Math.min(transformedCount / 3, 1) * 0.5 + (transformationRate / 100) * 0.5
          reason = `已转化 ${transformedCount} 道伤痕，转化率 ${transformationRate}%`
          break
        case 'warrior':
          score = Math.min(totalMarks / 5, 1) * 0.4 + (avgProgress / 100) * 0.3 + (avgSeverity / 5) * 0.3
          reason = `共 ${totalMarks} 道伤痕，平均愈合 ${avgProgress}%`
          break
        case 'explorer': {
          const uniqueParts = new Set(marks.map(m => m.bodyPart)).size
          const uniqueTypes = new Set(marks.map(m => m.scarType)).size
          score = (uniqueParts / 11) * 0.5 + (uniqueTypes / 4) * 0.5
          reason = `涉及 ${uniqueParts} 个部位，${uniqueTypes} 种类型`
          break
        }
        case 'gardener':
          score = (avgProgress / 100) * 0.4 + (transformationRate / 100) * 0.3 + Math.min(totalMarks / 3, 1) * 0.3
          reason = `平均愈合 ${avgProgress}%，长期耕耘`
          break
        case 'sage':
          score = (transformationRate / 100) * 0.5 + (transformedCount / totalMarks) * 0.5
          reason = `转化率 ${transformationRate}%，智慧积累`
          break
        case 'survivor':
          score = (avgSeverity / 5) * 0.5 + (avgProgress / 100) * 0.3 + (transformationRate / 100) * 0.2
          reason = `严重度 ${avgSeverity.toFixed(1)}/5，坚韧应对`
          break
        case 'bridge-builder': {
          const timeSpan = marks.length > 1
            ? Math.floor(
                (new Date(marks[marks.length - 1].recordedAt).getTime() -
                  new Date(marks[0].recordedAt).getTime()) / (1000 * 60 * 60 * 24)
              )
            : 0
          score = Math.min(timeSpan / 365, 1) * 0.4 + (transformationRate / 100) * 0.6
          reason = `时间跨度 ${Math.abs(timeSpan)} 天，转化率 ${transformationRate}%`
          break
        }
      }

      matches.push({
        pattern: pattern.pattern,
        score: Math.round(score * 100) / 100,
        reason,
        suggestion: pattern.narrativePrompt,
      })
    }

    return matches.sort((a, b) => b.score - a.score)
  }

  /**
   * 检测叙事基调
   */
  function detectTone(
    marks: BodyMark[],
    stats: ScarStats,
  ): NarrativeEnhancement['tone'] {
    const transformationRate = stats.transformationRate
    const avgProgress = stats.avgHealingProgress
    const freshCount = stats.fresh

    if (freshCount > marks.length * 0.3) return 'melancholic'
    if (transformationRate >= 80 && avgProgress >= 80) return 'triumphant'
    if (transformationRate >= 50 && avgProgress >= 60) return 'hopeful'
    if (transformationRate >= 30 && avgProgress >= 50) return 'reflective'
    if (avgProgress >= 40) return 'compassionate'
    return 'stoic'
  }

  /**
   * 提取关键主题
   */
  function extractThemes(marks: BodyMark[], stats: ScarStats): string[] {
    const themes: string[] = []

    const transformationRate = stats.transformationRate
    if (transformationRate >= 80) themes.push('蜕变与重生')
    else if (transformationRate >= 50) themes.push('成长与转化')
    else if (transformationRate >= 20) themes.push('愈合与修复')

    const avgSeverity = marks.reduce((s, m) => s + m.severity, 0) / marks.length
    if (avgSeverity >= 4) themes.push('极限韧性')
    else if (avgSeverity >= 3) themes.push('逆境坚持')

    const uniqueTypes = new Set(marks.map(m => m.scarType)).size
    if (uniqueTypes >= 3) themes.push('多元经历')

    const uniqueParts = new Set(marks.map(m => m.bodyPart)).size
    if (uniqueParts >= 5) themes.push('身心整合')

    if (marks.length >= 5) themes.push('经验积累')
    if (stats.avgHealingProgress >= 80) themes.push('康复之旅')

    return themes.slice(0, 5)
  }

  /**
   * 构建叙事弧线
   */
  function buildNarrativeArc(marks: BodyMark[]): NarrativeArc {
    if (marks.length === 0) {
      return {
        origin: '尚未开始',
        turningPoint: '等待第一道伤痕',
        climax: '—',
        resolution: '—',
        type: 'rising',
      }
    }

    const sorted = [...marks].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    )

    const firstMark = sorted[0]
    const origin = `第1道伤痕在${firstMark.bodyPart}部位形成（${SCAR_TYPE_META[firstMark.scarType].label}）`

    // 找转折点：第一个转化的伤痕
    const firstTransformed = sorted.find(m => m.transformed)
    const turningPoint = firstTransformed
      ? `第${sorted.indexOf(firstTransformed) + 1}道伤痕完成转化，开启成长之旅`
      : '尚未到达转折点'

    // 高潮：最严重的伤痕
    const highestSeverity = sorted.reduce((max, m) => m.severity > max.severity ? m : max, sorted[0])
    const climax = `第${sorted.indexOf(highestSeverity) + 1}道伤痕（严重度 ${highestSeverity.severity}/5）是最严峻的考验`

    // 结局
    const transformedCount = marks.filter(m => m.transformed).length
    const resolution = transformedCount === marks.length
      ? '所有伤痕已完成转化，你已从伤痛中全面成长'
      : transformedCount > 0
        ? `${transformedCount}/${marks.length} 道伤痕已转化，旅程仍在继续`
        : '转化之旅刚刚开始'

    // 弧线类型
    const hasTransformed = marks.some(m => m.transformed)
    const allTransformed = marks.every(m => m.transformed)
    let type: NarrativeArc['type'] = 'rising'
    if (allTransformed) type = 'hero-journey'
    else if (hasTransformed) type = 'falling-then-rising'
    else if (marks.length >= 3) type = 'transformation'

    return { origin, turningPoint, climax, resolution, type }
  }

  /**
   * 生成增强建议
   */
  function generateSuggestions(
    marks: BodyMark[],
    stats: ScarStats,
    primaryPattern: PatternMatch,
    tone: NarrativeEnhancement['tone'],
  ): EnhancementSuggestion[] {
    const suggestions: EnhancementSuggestion[] = []

    // 结构建议
    if (marks.length >= 3 && marks.filter(m => m.transformed).length < marks.length) {
      suggestions.push({
        type: 'structure',
        title: '完善转化弧线',
        advice: '你的叙事中还有未转化的伤痕。尝试为每道伤痕补充成长心得，让叙事弧线更加完整。',
        priority: 'high',
      })
    }

    // 情感建议
    if (tone === 'melancholic' || tone === 'stoic') {
      suggestions.push({
        type: 'emotion',
        title: '注入希望感',
        advice: '当前叙事基调偏沉重。尝试在反思中加入对未来的积极展望，让读者感受到希望的力量。',
        priority: 'medium',
      })
    }

    // 细节建议
    if (marks.length > 0 && marks.every(m => m.description.length < 30)) {
      suggestions.push({
        type: 'detail',
        title: '丰富感官细节',
        advice: '描述中可以加入更多感官细节（当时的感受、环境、身体反应），让叙事更加生动。',
        priority: 'medium',
      })
    }

    // 视角建议
    if (stats.transformationRate >= 50) {
      suggestions.push({
        type: 'perspective',
        title: '切换时空视角',
        advice: '尝试用"现在的自己"回望"过去的自己"，这种双重视角能让叙事更有深度。',
        priority: 'low',
      })
    }

    // 语言建议
    if (primaryPattern.score < 0.5) {
      suggestions.push({
        type: 'language',
        title: '强化叙事主题',
        advice: `你的叙事模式「${NARRATIVE_PATTERNS.find(p => p.pattern === primaryPattern.pattern)?.label}」匹配度较低。尝试聚焦一个核心主题，让叙事更有凝聚力。`,
        priority: 'high',
      })
    }

    // 总是包含一个通用建议
    suggestions.push({
      type: 'structure',
      title: '添加里程碑标记',
      advice: '在叙事中标注关键里程碑（如"第一次反思"、"第一次转化"），增强叙事的节奏感。',
      priority: 'low',
    })

    return suggestions
  }

  /**
   * 计算叙事成熟度
   */
  function calculateMaturity(marks: BodyMark[], stats: ScarStats): number {
    if (marks.length === 0) return 0

    const totalMarks = marks.length
    const transformationRate = stats.transformationRate
    const avgProgress = stats.avgHealingProgress
    const avgSeverity = marks.reduce((s, m) => s + m.severity, 0) / totalMarks

    // 成熟度 = 转化率(30%) + 愈合进度(20%) + 数量(15%) + 严重度(15%) + 描述质量(20%)
    const transformScore = transformationRate * 0.3
    const progressScore = avgProgress * 0.2
    const countScore = Math.min(totalMarks * 10, 100) * 0.15
    const severityScore = (avgSeverity / 5) * 100 * 0.15
    const descScore = marks.reduce((s, m) =>
      s + Math.min(m.description.length / 100, 1), 0) / totalMarks * 100 * 0.2

    return Math.round(transformScore + progressScore + countScore + severityScore + descScore)
  }

  /**
   * 获取模式信息
   */
  function getPatternInfo(pattern: NarrativePattern): PatternMeta | undefined {
    return NARRATIVE_PATTERNS.find(p => p.pattern === pattern)
  }

  return {
    enhancement,
    enhanceNarrative,
    getPatternInfo,
    NARRATIVE_PATTERNS,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function createEmptyEnhancement(): NarrativeEnhancement {
  return {
    primaryPattern: {
      pattern: 'explorer',
      score: 0,
      reason: '尚无伤痕数据',
      suggestion: '记录第一道伤痕，开启你的叙事之旅',
    },
    secondaryPatterns: [],
    tone: 'reflective',
    themes: [],
    narrativeArc: {
      origin: '尚未开始',
      turningPoint: '—',
      climax: '—',
      resolution: '—',
      type: 'rising',
    },
    suggestions: [],
    maturity: 0,
  }
}