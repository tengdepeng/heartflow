// ============================================================
// 工痕 · 类型定义
// 伤痕愈合追踪 + 逆境成长 + 锻造印记
// ============================================================

/** 身体部位 */
export type BodyPart =
  | 'head' | 'neck' | 'shoulder' | 'back' | 'chest'
  | 'arm' | 'hand' | 'waist' | 'leg' | 'foot' | 'eye'

/** 痕迹类型 */
export type ScarType = 'impact' | 'cut' | 'burn' | 'wear'

/** 伤痕状态 */
export type ScarState = 'fresh' | 'healing' | 'scarred'

/** 愈合阶段 */
export type HealingStage = 'acute' | 'proliferation' | 'remodeling' | 'matured'

/** 严重度 1-5 */
export type SeverityLevel = 1 | 2 | 3 | 4 | 5

/** 身体印记 */
export interface BodyMark {
  id: string
  bodyPart: BodyPart
  severity: SeverityLevel
  description: string
  scarType: ScarType
  /** 记录时间 */
  recordedAt: string
  /** 关联的工作日志 ID */
  worklogId?: string
  /** 愈合阶段 */
  healingStage: HealingStage
  /** 愈合进度 0-100 */
  healingProgress: number
  /** 逆境成长心得 */
  growthInsight?: string
  /** 是否已转化（从伤痛中成长） */
  transformed: boolean
}

/** 愈合阶段元数据 */
export interface HealingStageMeta {
  stage: HealingStage
  label: string
  /** 预计天数范围 */
  daysRange: [number, number]
  /** 阶段描述 */
  description: string
  /** 建议 */
  advice: string
}

/** 逆境成长记录 */
export interface GrowthRecord {
  id: string
  scarId: string
  /** 反思内容 */
  reflection: string
  /** 学习到的经验 */
  learned: string
  /** 成长方向 */
  growthDirection: string
  recordedAt: string
}

/** 锻造记录（砧板锻打） */
export interface ForgingRecord {
  id: string
  /** 锻造次数 */
  count: number
  /** 锻造日期 */
  date: string
  /** 锻造力度 */
  intensity: SeverityLevel
}

/** 工痕统计 */
export interface ScarStats {
  total: number
  fresh: number
  healing: number
  scarred: number
  transformed: number
  /** 各部位分布 */
  bodyPartDistribution: Record<BodyPart, number>
  /** 各类型分布 */
  typeDistribution: Record<ScarType, number>
  /** 平均愈合进度 */
  avgHealingProgress: number
  /** 逆境成长转化率 */
  transformationRate: number
}

/** 存储键 */
export const SCAR_STORAGE_KEYS = {
  MARKS: 'scars',
  GROWTH: 'hf:scar_growth',
  FORGING: 'hf:scar_forging',
} as const

/** 愈合阶段详情 */
export const HEALING_STAGES: HealingStageMeta[] = [
  {
    stage: 'acute',
    label: '新鲜期',
    daysRange: [0, 3],
    description: '伤痕刚形成，处于急性反应阶段',
    advice: '记录感受，允许自己感受疼痛',
  },
  {
    stage: 'proliferation',
    label: '增生期',
    daysRange: [3, 14],
    description: '组织开始修复，新细胞增生',
    advice: '反思经历，提取初步教训',
  },
  {
    stage: 'remodeling',
    label: '重塑期',
    daysRange: [14, 90],
    description: '伤痕组织重塑，逐渐稳定',
    advice: '整合经验，形成新的应对策略',
  },
  {
    stage: 'matured',
    label: '成熟期',
    daysRange: [90, 365],
    description: '伤痕成熟，转化为成长的印记',
    advice: '回顾成长，将经验转化为智慧',
  },
]

/** 部位元数据 */
export const BODY_PART_META: Record<BodyPart, { label: string; icon: string; description: string }> = {
  head: { label: '头部', icon: '🧠', description: '思维与决策的承受者' },
  neck: { label: '颈部', icon: '🔗', description: '连接与沟通的枢纽' },
  shoulder: { label: '肩部', icon: '🏋️', description: '责任与担当的承载者' },
  back: { label: '背部', icon: '🛡️', description: '支撑与防护的屏障' },
  chest: { label: '胸部', icon: '❤️', description: '情感与勇气的居所' },
  arm: { label: '手臂', icon: '💪', description: '行动与执行的力量' },
  hand: { label: '手部', icon: '✋', description: '创造与连接的触角' },
  waist: { label: '腰部', icon: '⚡', description: '力量与柔韧的核心' },
  leg: { label: '腿部', icon: '🦵', description: '前进与稳定的根基' },
  foot: { label: '足部', icon: '👣', description: '方向与路径的选择者' },
  eye: { label: '眼部', icon: '👁️', description: '洞察与认知的窗口' },
}

/** 痕迹类型元数据 */
export const SCAR_TYPE_META: Record<ScarType, { label: string; icon: string; color: string }> = {
  impact: { label: '撞击', icon: '💥', color: '#ef4444' },
  cut: { label: '割裂', icon: '🔪', color: '#f59e0b' },
  burn: { label: '灼烧', icon: '🔥', color: '#d98c7a' },
  wear: { label: '磨损', icon: '⏳', color: '#6b9fc4' },
}