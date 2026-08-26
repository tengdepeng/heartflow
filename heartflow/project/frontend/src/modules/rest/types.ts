// ============================================================
// 息壤 · 类型定义
// 休息质量分析 + 植被养成 + 休憩建议
// ============================================================

/** 季节 */
export type RestSeason = 'spring' | 'summer' | 'autumn' | 'winter'

/** 休憩活动类型 */
export type RestActivityType =
  | 'meditation' | 'nap' | 'walk' | 'music'
  | 'reading' | 'tea' | 'stretch' | 'vacation'
  | 'breathing' | 'journal' | 'gardening' | 'social'

/** 休憩方式 */
export interface RestPractice {
  id: string
  name: string
  icon: string
  color: string
  description: string
  /** 恢复力 0-100 */
  recovery: number
  /** 标签 */
  tags: string[]
  /** 关联植物 */
  plant?: string
  /** 适合季节 */
  seasons?: RestSeason[]
}

/** 休憩记录 */
export interface BreakRecord {
  id: string
  activity: string
  /** 时长（分钟） */
  duration: number
  /** 心情 1-5 */
  mood: number
  note?: string
  date: string
}

/** 植被状态 */
export interface PlantState {
  id: string
  name: string
  /** 关联的休憩方式 */
  practiceId: string
  /** 生长阶段 0-4 */
  growthStage: number
  /** 健康度 0-100 */
  health: number
  /** 花开次数 */
  bloomCount: number
  /** 最后浇水时间 */
  lastWateredAt?: string
  /** 创建时间 */
  plantedAt: string
}

/** 休息质量分析 */
export interface RestQualityAnalysis {
  /** 本周休息次数 */
  weeklyCount: number
  /** 本周平均恢复度 */
  weeklyAvgRecovery: number
  /** 本周平均心情 */
  weeklyAvgMood: number
  /** 休息频率 */
  restFrequency: 'insufficient' | 'adequate' | 'excellent'
  /** 休息多样性 */
  diversityScore: number
  /** 最常用休息方式 */
  topPractices: { practice: string; count: number }[]
  /** 建议 */
  suggestions: string[]
  /** 连续休息天数 */
  streakDays: number
  /** 理想休息间隔（小时） */
  idealRestInterval: number
}

/** 休憩建议 */
export interface RestTip {
  icon: string
  title: string
  description: string
}

/** 息壤状态 */
export interface RestState {
  practices: RestPractice[]
  records: BreakRecord[]
  plants: PlantState[]
}

/** 存储键 */
export const REST_STORAGE_KEYS = {
  PRACTICES: 'rest:practices',
  RECORDS: 'rest:break_records',
  PLANTS: 'rest:plants',
} as const

/** 预设休憩方式 */
export const DEFAULT_PRACTICES: RestPractice[] = [
  { id: 'p1', name: '冥想', icon: '🧘', color: '#b5707a', description: '静坐冥想，清空思绪', recovery: 85, tags: ['心灵', '安静'], plant: '莲花', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p2', name: '小憩', icon: '😴', color: '#6b9fc4', description: '短暂午睡，恢复精力', recovery: 90, tags: ['身体', '快速'], plant: '含羞草', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p3', name: '散步', icon: '🚶', color: '#8a9a7a', description: '户外漫步，呼吸新鲜空气', recovery: 70, tags: ['身体', '自然'], plant: '蒲公英', seasons: ['spring', 'autumn'] },
  { id: 'p4', name: '音乐', icon: '🎵', color: '#d98c7a', description: '聆听音乐，放松心情', recovery: 65, tags: ['心灵', '艺术'], plant: '风铃草', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p5', name: '闲读', icon: '📖', color: '#f0c040', description: '阅读闲书，转移注意力', recovery: 60, tags: ['心灵', '学习'], plant: '橡树', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p6', name: '品茶', icon: '🍵', color: '#f59e0b', description: '泡一壶好茶，慢慢品味', recovery: 75, tags: ['仪式', '慢生活'], plant: '茶树', seasons: ['spring', 'autumn', 'winter'] },
  { id: 'p7', name: '拉伸', icon: '🤸', color: '#6b9fc4', description: '身体拉伸，舒缓肌肉', recovery: 80, tags: ['身体', '快速'], plant: '藤蔓', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p8', name: '休假', icon: '🏖️', color: '#cf8b6b', description: '完整休息日，彻底放松', recovery: 100, tags: ['身体', '心灵', '长时间'], plant: '向日葵', seasons: ['summer'] },
  { id: 'p9', name: '深呼吸', icon: '🌬️', color: '#94a3b8', description: '腹式深呼吸，调节自律神经', recovery: 70, tags: ['快速', '呼吸'], plant: '竹子', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p10', name: '日记', icon: '✍️', color: '#e4e6ed', description: '写下今日思绪，整理心情', recovery: 55, tags: ['心灵', '整理'], plant: '墨竹', seasons: ['spring', 'summer', 'autumn', 'winter'] },
  { id: 'p11', name: '园艺', icon: '🌱', color: '#8a9a7a', description: '照料植物，感受生命成长', recovery: 65, tags: ['自然', '创造'], plant: '多肉', seasons: ['spring', 'summer'] },
  { id: 'p12', name: '社交', icon: '💬', color: '#d98c7a', description: '与朋友聊天，分享心情', recovery: 60, tags: ['社交', '心灵'], plant: '绣球花', seasons: ['spring', 'summer', 'autumn', 'winter'] },
]

/** 植被映射 */
export const VEGETATION_MAP: Record<string, { season: RestSeason; color: string; stages: string[] }> = {
  '莲花': { season: 'summer', color: '#d98c7a', stages: ['🌰', '🌱', '🪷', '🌸', '🏵️'] },
  '含羞草': { season: 'summer', color: '#34d399', stages: ['🌰', '🌱', '🌿', '🌼', '🌳'] },
  '蒲公英': { season: 'spring', color: '#f0c040', stages: ['🌰', '🌱', '🌿', '🌼', '☁️'] },
  '风铃草': { season: 'spring', color: '#b5707a', stages: ['🌰', '🌱', '🌿', '🔔', '💐'] },
  '橡树': { season: 'autumn', color: '#f59e0b', stages: ['🌰', '🌱', '🌿', '🪵', '🌳'] },
  '茶树': { season: 'spring', color: '#34d399', stages: ['🌰', '🌱', '🪴', '🍃', '🌳'] },
  '藤蔓': { season: 'summer', color: '#6b9fc4', stages: ['🌰', '🌱', '🌿', '🪴', '🌿'] },
  '向日葵': { season: 'summer', color: '#f0c040', stages: ['🌰', '🌱', '🌿', '🌻', '🌻'] },
  '竹子': { season: 'spring', color: '#34d399', stages: ['🌰', '🎋', '🎋', '🎋', '🎍'] },
  '墨竹': { season: 'winter', color: '#94a3b8', stages: ['🌰', '🎋', '🎋', '🎋', '🎍'] },
  '多肉': { season: 'spring', color: '#34d399', stages: ['🌰', '🌱', '🪴', '🪴', '🌵'] },
  '绣球花': { season: 'summer', color: '#6b9fc4', stages: ['🌰', '🌱', '🌿', '🌼', '💐'] },
}

/** 季节主题 */
export const SEASON_THEMES: Record<RestSeason, { accentColor: string; glowColor: string; label: string }> = {
  spring: { accentColor: '#d98c7a', glowColor: 'rgba(244,114,182,0.15)', label: '春' },
  summer: { accentColor: '#34d399', glowColor: 'rgba(52,211,153,0.15)', label: '夏' },
  autumn: { accentColor: '#f0c040', glowColor: 'rgba(240,192,64,0.15)', label: '秋' },
  winter: { accentColor: '#6b9fc4', glowColor: 'rgba(108,156,245,0.15)', label: '冬' },
}