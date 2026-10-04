// ============================================================
// 行囊 · 类型定义
// ============================================================

/** 抽象类别类型（7 种技能分类） */
export type CategoryType = 'language' | 'framework' | 'tool' | 'design' | 'softskill' | 'domain' | 'certification'

/** 抽象类别类型元信息 */
export interface CategoryTypeInfo {
  value: CategoryType
  icon: string
  label: string
  color: string
  bgColor: string
}

/** 物品项 */
export interface BagItem {
  name: string
  proficiency: number
  note?: string
}

/** 物品分类 */
export interface CategoryItem {
  id: string
  name: string
  icon: string
  color: string
  proficiency: number
  items: BagItem[]
  categoryType: CategoryType
}

/** 成长轨迹条目 */
export interface EvolutionEntry {
  icon: string
  title: string
  date: string
  levelLabel: string
  levelClass: string
}

/** 概览统计 */
export interface BagOverview {
  totalItems: number
  avgProficiency: number
  masteredItems: number
}
