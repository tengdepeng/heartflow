// ============================================================
// 自体镜像 · 自体星盘
// 借鉴「命盘可视化」的圆形图表展示方式，
// 用于可视化展示自我评估各维度，不引入任何命理推算。
// 数据驱动：将十二宫格数据映射为圆形星盘上的点。
// 全部本地实现，守宪法第1条本地私有。
// ============================================================

import type { House } from './twelve-houses'

export interface AstrolabePoint {
  /** 角度（弧度） */
  angle: number
  /** 半径比例 0~1 */
  radius: number
  label: string
  value: number
  color: string
  icon: string
}

export interface AstrolabeData {
  points: AstrolabePoint[]
  /** 中心标题 */
  centerLabel: string
  /** 覆盖面积占比 0~100 */
  coverage: number
}

const HOUSE_COLORS = [
  '#8a9a7a', '#e0a96d', '#6b9fc4', '#d98c7a',
  '#a07c8c', '#c4a67a', '#7a9a8a', '#c47a7a',
  '#7a8ac4', '#9a8a7a', '#c4a0c4', '#6a9a7a',
]

/**
 * 将十二宫格数据映射为星盘可视化点。
 * 每个宫格等距分布在一个圆上，评价值映射为半径。
 */
export function housesToAstrolabe(houses: House[]): AstrolabeData {
  const points: AstrolabePoint[] = houses.map((h, i) => {
    const angle = (i / houses.length) * Math.PI * 2 - Math.PI / 2 // 从顶部开始
    const radius = h.rating / 5 // 0~1
    return {
      angle,
      radius,
      label: h.label,
      value: h.rating,
      color: HOUSE_COLORS[i % HOUSE_COLORS.length],
      icon: h.icon,
    }
  })

  const total = houses.length * 5
  const actual = houses.reduce((s, h) => s + h.rating, 0)
  const coverage = Math.round((actual / total) * 100)

  return { points, centerLabel: '自体星盘', coverage }
}

export interface AstrolabeInsight {
  /** 最强维度 */
  strongest: string
  /** 最弱维度 */
  weakest: string
  /** 发展建议 */
  advice: string
}

/**
 * 从星盘数据生成洞察。
 */
export function deriveAstrolabeInsight(houses: House[]): AstrolabeInsight {
  const rated = houses.filter(h => h.rating > 0)
  if (rated.length === 0) {
    return {
      strongest: '—',
      weakest: '—',
      advice: '开始评估各维度，星盘将逐渐显现',
    }
  }

  const sorted = [...rated].sort((a, b) => b.rating - a.rating)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  let advice: string
  if (strongest.rating >= 4) {
    advice = `你的「${strongest.label}」维度最为突出，这是你的核心优势。`
    if (weakest.rating <= 2) {
      advice += `同时「${weakest.label}」还有提升空间，可以尝试逐步改善。`
    }
  } else {
    advice = '各维度发展较为均衡，找到你最想提升的方向，专注投入。'
  }

  return {
    strongest: strongest ? `${strongest.icon} ${strongest.label} (${strongest.rating}/5)` : '—',
    weakest: weakest ? `${weakest.icon} ${weakest.label} (${weakest.rating}/5)` : '—',
    advice,
  }
}