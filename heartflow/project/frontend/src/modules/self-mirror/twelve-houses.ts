// ============================================================
// 自体镜像 · 十二宫格
// 借鉴「紫微斗数十二宫格」的结构化展示 UI，
// 用于自我评估与反思，不引入任何命理推算。
// 每个宫格代表人生的一个维度，可自评 0~5 星。
// 全部本地实现，守宪法第1条本地私有。
// ============================================================

export interface House {
  id: string
  label: string
  icon: string
  description: string
  /** 自评星级 0~5 */
  rating: number
  /** 反思笔记 */
  note: string
}

export const DEFAULT_HOUSES: Omit<House, 'rating' | 'note'>[] = [
  { id: 'self', label: '自我认知', icon: '🧘', description: '对自己的了解程度，内心的清晰度' },
  { id: 'emotion', label: '情绪管理', icon: '💧', description: '情绪觉察与调节能力' },
  { id: 'body', label: '身体健康', icon: '🏃', description: '身体状况与生活习惯' },
  { id: 'mind', label: '心智成长', icon: '📚', description: '学习力、思考力与认知水平' },
  { id: 'work', label: '事业工作', icon: '💼', description: '职业发展与工作状态' },
  { id: 'wealth', label: '财富管理', icon: '💰', description: '财务状况与理财能力' },
  { id: 'family', label: '家庭关系', icon: '🏠', description: '与家人的连接与相处' },
  { id: 'social', label: '社交关系', icon: '🤝', description: '朋友与人际网络' },
  { id: 'love', label: '情感关系', icon: '💞', description: '亲密关系与情感状态' },
  { id: 'hobby', label: '兴趣创造', icon: '🎨', description: '兴趣爱好与创造力表达' },
  { id: 'spirit', label: '精神信念', icon: '🌟', description: '价值观、信念与人生意义' },
  { id: 'future', label: '未来方向', icon: '🧭', description: '目标感与人生规划' },
]

export interface TwelveHousesState {
  houses: House[]
}

export function createEmptyHouses(): House[] {
  return DEFAULT_HOUSES.map(h => ({
    ...h,
    rating: 0,
    note: '',
  }))
}

export interface HouseStats {
  average: number
  total: number
  strengths: House[]
  weaknesses: House[]
  distribution: { label: string; count: number }[]
}

/**
 * 计算十二宫格统计信息。
 */
export function computeHouseStats(houses: House[]): HouseStats {
  const rated = houses.filter(h => h.rating > 0)
  const average = rated.length ? rated.reduce((s, h) => s + h.rating, 0) / rated.length : 0
  const total = rated.reduce((s, h) => s + h.rating, 0)

  const strengths = [...houses].filter(h => h.rating >= 4).sort((a, b) => b.rating - a.rating)
  const weaknesses = [...houses].filter(h => h.rating > 0 && h.rating <= 2).sort((a, b) => a.rating - b.rating)

  const dist = [0, 0, 0, 0, 0, 0]
  houses.forEach(h => {
    const r = Math.min(5, Math.max(0, Math.floor(h.rating)))
    dist[r]++
  })
  const distribution = dist.map((count, i) => ({ label: `${i} 星`, count }))

  return { average, total, strengths, weaknesses, distribution }
}

export interface BalanceScore {
  /** 0~100 综合平衡度 */
  score: number
  label: string
  color: string
  suggestions: string[]
}

/**
 * 评估各宫格之间的平衡度。
 */
export function assessBalance(houses: House[]): BalanceScore {
  const rated = houses.filter(h => h.rating > 0)
  if (rated.length < 3) {
    return { score: 0, label: '未评估', color: '#6b7280', suggestions: ['至少评估 3 个维度才能计算平衡度'] }
  }

  const ratings = rated.map(h => h.rating)
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
  const variance = ratings.reduce((s, r) => s + (r - avg) ** 2, 0) / ratings.length
  // 方差越小越平衡，映射到 0~100
  const maxVariance = 6.25 // 最大可能方差（0 和 5 之间）
  const balanceScore = Math.max(0, Math.min(100, Math.round((1 - variance / maxVariance) * 100)))

  let label: string
  let color: string
  const suggestions: string[] = []

  if (balanceScore >= 80) {
    label = '很平衡'
    color = '#52c41a'
    suggestions.push('你很注重生活的全面性，继续保持')
  } else if (balanceScore >= 60) {
    label = '较平衡'
    color = '#faad14'
    suggestions.push('大部分维度发展均衡，可以关注偏弱的方面')
  } else if (balanceScore >= 40) {
    label = '有偏重'
    color = '#fa8c16'
    suggestions.push('你的精力集中在某些维度，可以尝试拓展其他方面')
  } else {
    label = '需关注'
    color = '#f5222d'
    suggestions.push('各维度发展不均衡，建议制定计划逐步改善')
  }

  // 添加具体建议
  const lowest = [...houses].filter(h => h.rating > 0).sort((a, b) => a.rating - b.rating)[0]
  if (lowest && lowest.rating <= 2) {
    suggestions.push(`在「${lowest.label}」方面可以多一些关注`)
  }

  return { score: balanceScore, label, color, suggestions }
}