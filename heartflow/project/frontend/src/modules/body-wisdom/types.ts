// ============================================================
// 藏象阁 · 类型定义
// 五脏映射 + 经络追踪 + 体质分析
// ============================================================

/** 五脏 */
export type OrganType = 'heart' | 'liver' | 'spleen' | 'lung' | 'kidney'

/** 五行 */
export type FiveElement = 'fire' | 'wood' | 'earth' | 'metal' | 'water'

/** 经络 */
export type MeridianType =
  | 'lung' | 'large-intestine' | 'stomach' | 'spleen'
  | 'heart' | 'small-intestine' | 'bladder' | 'kidney'
  | 'pericardium' | 'triple-burner' | 'gallbladder' | 'liver'

/** 经络感受 */
export type MeridianFeeling = 'good' | 'ok' | 'bad'

/** 经络记录 */
export interface MeridianRecord {
  id: string
  meridian: MeridianType
  feeling: MeridianFeeling
  note?: string
  recordedAt: string
  /** 对应时辰 */
  hour: number
}

/** 体质类型 */
export type ConstitutionType =
  | 'balanced'      // 平和质
  | 'qi-deficiency' // 气虚质
  | 'yang-deficiency' // 阳虚质
  | 'yin-deficiency' // 阴虚质
  | 'phlegm-dampness' // 痰湿质
  | 'damp-heat'     // 湿热质
  | 'blood-stasis'  // 血瘀质
  | 'qi-stagnation' // 气郁质
  | 'allergic'      // 特禀质

/** 体质分析结果 */
export interface ConstitutionAnalysis {
  type: ConstitutionType
  label: string
  /** 各体质倾向得分 0-1 */
  scores: Record<ConstitutionType, number>
  /** 主要特征 */
  characteristics: string[]
  /** 调理建议 */
  recommendations: string[]
  /** 分析时间 */
  analyzedAt: string
}

/** 五运六气 */
export interface FiveMovementsSixQi {
  /** 年份天干 */
  heavenlyStem: string
  /** 年份地支 */
  earthlyBranch: string
  /** 大运（五行） */
  greatMovement: FiveElement
  /** 司天之气 */
  celestialManager: string
  /** 在泉之气 */
  terrestrialSpring: string
  /** 主气 */
  hostQi: string
  /** 客气 */
  guestQi: string
  /** 当前节气 */
  currentTerm: string
}

/** 子午流注时辰 */
export interface MeridianHour {
  hour: number
  startTime: string
  endTime: string
  meridian: MeridianType
  organ: string
  element: FiveElement
  function: string
  /** 该时辰的养生建议 */
  advice: string
}

/** 情绪记录 */
export interface MoodRecord {
  id: string
  mood: 'calm' | 'anxious' | 'sad' | 'happy' | 'angry' | 'fearful'
  insight: string
  recordedAt: string
  /** 关联脏腑 */
  relatedOrgan?: OrganType
}

/** 经书条目 */
export interface SutraEntry {
  id: string
  title: string
  content: string
  source: string
  /** 分类 */
  category: 'buddhist' | 'taoist' | 'confucian' | 'philosophy' | 'poetry'
  /** 是否收藏 */
  bookmarked: boolean
}

/** 阅读记录 */
export interface SutraReadingRecord {
  id: string
  sutraId: string
  startTime: string
  endTime?: string
  duration?: number
  excerpt?: string
  note?: string
}

/** 藏象阁状态 */
export interface BodyWisdomState {
  meridianRecords: MeridianRecord[]
  moodRecords: MoodRecord[]
  constitutionAnalysis: ConstitutionAnalysis | null
  sutraEntries: SutraEntry[]
  readingRecords: SutraReadingRecord[]
  fiveMovementsSixQi: FiveMovementsSixQi | null
}

/** 经络统计 */
export interface MeridianStats {
  totalRecords: number
  goodCount: number
  okCount: number
  badCount: number
  /** 各经络良好率 */
  meridianHealth: Record<MeridianType, { total: number; good: number; rate: number }>
  /** 最近7天趋势 */
  recentTrend: { date: string; goodRate: number }[]
}

/** 存储键 */
export const BODY_WISDOM_STORAGE_KEYS = {
  MERIDIANS: 'hf:body_wisdom_meridians',
  MOODS: 'hf:body_wisdom_moods',
  CONSTITUTION: 'hf:body_wisdom_constitution',
  SUTRAS: 'hf:body_wisdom_sutras',
  READING: 'hf:body_wisdom_reading',
} as const

/** 五脏与五行映射 */
export const ORGAN_ELEMENT_MAP: Record<OrganType, { element: FiveElement; emotion: string; season: string; color: string; taste: string }> = {
  heart: { element: 'fire', emotion: '喜', season: '夏', color: '#ef4444', taste: '苦' },
  liver: { element: 'wood', emotion: '怒', season: '春', color: '#34d399', taste: '酸' },
  spleen: { element: 'earth', emotion: '思', season: '长夏', color: '#f0c040', taste: '甘' },
  lung: { element: 'metal', emotion: '悲', season: '秋', color: '#e4e6ed', taste: '辛' },
  kidney: { element: 'water', emotion: '恐', season: '冬', color: '#1e3a5f', taste: '咸' },
}

/** 体质类型元数据 */
export const CONSTITUTION_META: Record<ConstitutionType, { label: string; description: string; advice: string }> = {
  balanced: { label: '平和质', description: '阴阳气血调和，体态适中，面色润泽', advice: '保持现有良好生活习惯，均衡饮食' },
  'qi-deficiency': { label: '气虚质', description: '元气不足，疲乏气短，自汗', advice: '适当运动，食用补气食物如黄芪、山药' },
  'yang-deficiency': { label: '阳虚质', description: '阳气不足，畏寒怕冷，手足不温', advice: '温阳补气，多晒太阳，食用生姜、羊肉' },
  'yin-deficiency': { label: '阴虚质', description: '阴液亏少，口燥咽干，手足心热', advice: '滋阴润燥，食用百合、银耳、枸杞' },
  'phlegm-dampness': { label: '痰湿质', description: '痰湿凝聚，形体肥胖，腹部肥满', advice: '健脾化湿，控制饮食，多运动' },
  'damp-heat': { label: '湿热质', description: '湿热内蕴，面垢油光，口苦口干', advice: '清热利湿，饮食清淡，避免辛辣油腻' },
  'blood-stasis': { label: '血瘀质', description: '血行不畅，肤色晦暗，舌质紫暗', advice: '活血化瘀，适度运动，食用山楂、黑木耳' },
  'qi-stagnation': { label: '气郁质', description: '气机郁滞，神情抑郁，忧虑脆弱', advice: '疏肝解郁，保持心情舒畅，多社交' },
  allergic: { label: '特禀质', description: '先天失常，过敏体质，遗传特征', advice: '避免过敏原，增强体质，注意防护' },
}

/** 十二经络子午流注 */
export const MERIDIAN_HOURS: MeridianHour[] = [
  { hour: 1, startTime: '01:00', endTime: '03:00', meridian: 'liver', organ: '肝', element: 'wood', function: '藏血、疏泄', advice: '深度睡眠，养肝血' },
  { hour: 3, startTime: '03:00', endTime: '05:00', meridian: 'lung', organ: '肺', element: 'metal', function: '主气、司呼吸', advice: '保持安静，深呼吸' },
  { hour: 5, startTime: '05:00', endTime: '07:00', meridian: 'large-intestine', organ: '大肠', element: 'metal', function: '传导、排泄', advice: '起床排便，喝温水' },
  { hour: 7, startTime: '07:00', endTime: '09:00', meridian: 'stomach', organ: '胃', element: 'earth', function: '受纳、腐熟', advice: '吃早餐，营养丰富' },
  { hour: 9, startTime: '09:00', endTime: '11:00', meridian: 'spleen', organ: '脾', element: 'earth', function: '运化、统血', advice: '工作学习，适当活动' },
  { hour: 11, startTime: '11:00', endTime: '13:00', meridian: 'heart', organ: '心', element: 'fire', function: '主血脉、藏神', advice: '午餐后小憩片刻' },
  { hour: 13, startTime: '13:00', endTime: '15:00', meridian: 'small-intestine', organ: '小肠', element: 'fire', function: '分清泌浊', advice: '多喝水，促进吸收' },
  { hour: 15, startTime: '15:00', endTime: '17:00', meridian: 'bladder', organ: '膀胱', element: 'water', function: '气化、排尿', advice: '多喝水，排毒' },
  { hour: 17, startTime: '17:00', endTime: '19:00', meridian: 'kidney', organ: '肾', element: 'water', function: '藏精、主水', advice: '休息养肾，避免剧烈运动' },
  { hour: 19, startTime: '19:00', endTime: '21:00', meridian: 'pericardium', organ: '心包', element: 'fire', function: '护心、安神', advice: '散步放松，保持心情愉快' },
  { hour: 21, startTime: '21:00', endTime: '23:00', meridian: 'triple-burner', organ: '三焦', element: 'fire', function: '通调水道', advice: '泡脚、准备入睡' },
  { hour: 23, startTime: '23:00', endTime: '01:00', meridian: 'gallbladder', organ: '胆', element: 'wood', function: '决断、消化', advice: '进入睡眠，养胆气' },
]