// ============================================================
// 先祖遗志 · 类型定义
// P4: 载体退休后留下的传承系统
// ============================================================

/** 遗志等级 */
export type WillGrade = 'common' | 'essence' | 'heritage'

/** 遗志接口 */
export interface Will {
  /** 唯一 ID */
  id: string
  /** 遗志名称 */
  name: string
  /** 遗志等级 */
  grade: WillGrade
  /** 遗志描述 */
  description: string
  /** 继承的见解列表 */
  insights: string[]
  /** 目标摘要（来自退休载体关联的 goal） */
  goalSummary: string | null
  /** 传承载体快照 */
  carrierSnapshot: {
    name: string
    maxBeads: number
    finalBeadCount: number
    colors: { primary: string; secondary: string; accent: string }
    usageCount: number
  }
  /** 来源载体 ID */
  sourceCarrierId: string
  /** 继承载体 ID（未继承时为 null） */
  inheritedByCarrierId: string | null
  /** 创建时间（载体退休时间） */
  createdAt: string
  /** 继承时间 */
  inheritedAt: string | null
  /** 传承链（父遗志 ID，多代传承时形成链） */
  parentWillId: string | null
}

/** 遗志等级配置 */
export const WILL_GRADES: { value: WillGrade; label: string; description: string; color: string }[] = [
  { value: 'common', label: '寻常', description: '日常积累的平凡记忆', color: '#a0846c' },
  { value: 'essence', label: '精粹', description: '凝聚了重要心得的传承', color: '#f0c040' },
  { value: 'heritage', label: '传承', description: '跨越世代的珍贵遗产', color: '#a07c8c' },
]

/** 遗志等级判定阈值 */
export const WILL_GRADE_THRESHOLDS = {
  common: 0,
  essence: 50,   // usageCount >= 50
  heritage: 200, // usageCount >= 200
} as const

/** 存储键名 */
export const STORAGE_KEY = 'hf:wills'