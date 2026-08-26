// ============================================================
// 岁时阁 · 类型定义
// ============================================================

/** 季节 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** 节气 */
export interface SolarTerm {
  name: string
  icon: string
  desc: string
  month: number
  day: number
}

/** 传统节日 */
export interface Festival {
  name: string
  icon: string
  month: number
  day: number
  date?: string
}

/** 四季仪式 */
export interface SeasonalRitual {
  id: string
  name: string
  season: Season
  description: string
  count: number
  lastCompletedAt: string | null
  createdAt: string
  tags?: string[]
}

/** 私人仪式（原有功能） */
export interface Ritual {
  id: string
  name: string
  date: string
  note: string
  icon: string
}

/** 季节元数据 */
export interface SeasonMeta {
  key: Season
  label: string
  icon: string
}

/** 生命仪礼 */
export interface LifeRitual {
  id: string
  name: string
  date: string
  note: string
  icon: string
  type?: string
  done?: boolean
}

/** 统计概览 */
export interface SeasonalStats {
  total: number
  thisYear: number
  active: number
  streak: number
}