// ============================================================
// 幕僚体系 · 类型定义
// 幕僚间互动、作息生活、庆祝退休、见证
// ============================================================

// ============================================================
// 幕僚间互动
// ============================================================

/** 互动类型 */
export type InteractionType = 'collaboration' | 'coexistence' | 'mutual-learning' | 'conflict' | 'dialogue'

/** 互动强度 */
export type InteractionIntensity = 'light' | 'moderate' | 'deep' | 'intimate'

/** 幕僚关系 */
export interface AdvisorRelation {
  /** 关系 ID */
  id: string
  /** 幕僚 A ID */
  advisorAId: string
  /** 幕僚 B ID */
  advisorBId: string
  /** 关系类型 */
  relationType: 'mentor' | 'peer' | 'rival' | 'companion' | 'stranger'
  /** 亲密度 (0-100) */
  closeness: number
  /** 互动次数 */
  interactionCount: number
  /** 上次互动时间 */
  lastInteractionAt: string
  /** 共同话题 */
  sharedTopics: string[]
  /** 互动历史 */
  interactionHistory: InteractionRecord[]
}

/** 互动记录 */
export interface InteractionRecord {
  id: string
  type: InteractionType
  /** 发起方 */
  initiatorId: string
  /** 接收方 */
  recipientId: string
  /** 互动主题 */
  topic: string
  /** 互动摘要 */
  summary: string
  /** 互动结果 */
  outcome: 'positive' | 'neutral' | 'negative'
  /** 亲密度变化 */
  closenessDelta: number
  /** 发生时间 */
  timestamp: string
}

/** 幕僚间互动元数据 */
export const INTERACTION_TYPE_META: Record<InteractionType, { label: string; icon: string; description: string }> = {
  collaboration: {
    label: '协作',
    icon: '🤝',
    description: '两位幕僚共同完成一项任务',
  },
  coexistence: {
    label: '共处',
    icon: '🏠',
    description: '幕僚在同一空间自然相处',
  },
  'mutual-learning': {
    label: '互学',
    icon: '📖',
    description: '幕僚之间互相分享知识',
  },
  conflict: {
    label: '分歧',
    icon: '⚡',
    description: '幕僚在观点上产生分歧',
  },
  dialogue: {
    label: '对话',
    icon: '💬',
    description: '幕僚之间的日常交流',
  },
}

// ============================================================
// 幕僚作息与生活场景
// ============================================================

/** 活动类型 */
export type ActivityType = 'reading' | 'writing' | 'meditating' | 'cooking' | 'gardening' | 'crafting' | 'resting' | 'wandering' | 'observing' | 'dreaming'

/** 作息时段 */
export type TimeSlot = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight'

/** 幕僚活动 */
export interface AdvisorActivity {
  id: string
  advisorId: string
  type: ActivityType
  /** 所在场景 */
  scene: string
  /** 开始时间 */
  startedAt: string
  /** 持续时间 (分钟) */
  duration: number
  /** 活动描述 */
  description: string
  /** 是否可被用户打断 */
  interruptible: boolean
  /** 活动产出 */
  output?: string
}

/** 生活场景 */
export interface LifeScene {
  id: string
  name: string
  description: string
  /** 场景位置 */
  location: string
  /** 适合的活动类型 */
  suitableActivities: ActivityType[]
  /** 最大容纳幕僚数 */
  maxAdvisors: number
  /** 当前在场景中的幕僚 */
  presentAdvisors: string[]
}

/** 作息表 */
export interface DailySchedule {
  advisorId: string
  /** 时段 → 活动 */
  slots: Record<TimeSlot, ActivityType[]>
  /** 是否活跃 */
  isActive: boolean
  /** 当前活动 */
  currentActivity?: AdvisorActivity
}

/** 时段元数据 */
export const TIME_SLOT_META: Record<TimeSlot, { label: string; hourRange: [number, number]; vibe: string }> = {
  dawn: { label: '破晓', hourRange: [5, 7], vibe: '苏醒' },
  morning: { label: '晨间', hourRange: [7, 11], vibe: '活跃' },
  noon: { label: '午间', hourRange: [11, 14], vibe: '休憩' },
  afternoon: { label: '午后', hourRange: [14, 17], vibe: '专注' },
  dusk: { label: '黄昏', hourRange: [17, 19], vibe: '回顾' },
  evening: { label: '晚间', hourRange: [19, 22], vibe: '放松' },
  night: { label: '深夜', hourRange: [22, 1], vibe: '沉思' },
  midnight: { label: '午夜', hourRange: [1, 5], vibe: '安眠' },
}

/** 活动元数据 */
export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string; defaultDuration: number }> = {
  reading: { label: '阅读', icon: '📖', defaultDuration: 45 },
  writing: { label: '写作', icon: '✍️', defaultDuration: 30 },
  meditating: { label: '冥想', icon: '🧘', defaultDuration: 20 },
  cooking: { label: '烹饪', icon: '🍳', defaultDuration: 40 },
  gardening: { label: '园艺', icon: '🌱', defaultDuration: 30 },
  crafting: { label: '匠作', icon: '🔨', defaultDuration: 60 },
  resting: { label: '休息', icon: '😴', defaultDuration: 25 },
  wandering: { label: '漫步', icon: '🚶', defaultDuration: 15 },
  observing: { label: '观察', icon: '🔍', defaultDuration: 20 },
  dreaming: { label: '入梦', icon: '💤', defaultDuration: 90 },
}

// ============================================================
// 幕僚庆祝与退休
// ============================================================

/** 庆祝事件类型 */
export type CelebrationType = 'milestone' | 'birthday' | 'achievement' | 'anniversary' | 'seasonal' | 'farewell'

/** 庆祝事件 */
export interface CelebrationEvent {
  id: string
  type: CelebrationType
  /** 关联幕僚 */
  advisorId: string
  /** 事件标题 */
  title: string
  /** 事件描述 */
  description: string
  /** 触发日期 */
  date: string
  /** 是否已庆祝 */
  celebrated: boolean
  /** 庆祝方式 */
  ritual?: CelebrationRitual
}

/** 庆祝仪式 */
export interface CelebrationRitual {
  /** 仪式名称 */
  name: string
  /** 仪式步骤 */
  steps: string[]
  /** 参与幕僚 */
  participants: string[]
  /** 仪式产物 */
  artifact?: string
}

/** 退休阶段 */
export type RetirementPhase = 'contemplation' | 'farewell' | 'archiving' | 'legacy'

/** 退休仪式 */
export interface RetirementCeremony {
  id: string
  advisorId: string
  /** 退休原因 */
  reason: string
  /** 当前阶段 */
  phase: RetirementPhase
  /** 开始时间 */
  startedAt: string
  /** 完成时间 */
  completedAt?: string
  /** 告别信 */
  farewellLetter?: string
  /** 遗留物 */
  legacies: AdvisorLegacy[]
  /** 参与幕僚 */
  witnesses: string[]
}

/** 幕僚遗留物 */
export interface AdvisorLegacy {
  id: string
  /** 遗留物类型 */
  type: 'wisdom' | 'memory' | 'artifact' | 'blessing'
  /** 标题 */
  title: string
  /** 内容 */
  content: string
  /** 可被继承 */
  inheritable: boolean
}

/** 退休阶段元数据 */
export const RETIREMENT_PHASE_META: Record<RetirementPhase, { label: string; description: string; duration: number }> = {
  contemplation: { label: '沉思', description: '幕僚开始回顾自己的旅程', duration: 3 },
  farewell: { label: '告别', description: '与其他幕僚和用户道别', duration: 2 },
  archiving: { label: '归档', description: '将幕僚的记忆归档保存', duration: 1 },
  legacy: { label: '传承', description: '留下智慧遗产给后来者', duration: 2 },
}

/** 庆祝事件元数据 */
export const CELEBRATION_TYPE_META: Record<CelebrationType, { label: string; icon: string; defaultRitual: string }> = {
  milestone: { label: '里程碑', icon: '🏆', defaultRitual: '授勋仪式' },
  birthday: { label: '诞辰', icon: '🎂', defaultRitual: '庆生典礼' },
  achievement: { label: '成就', icon: '🌟', defaultRitual: '加冕仪式' },
  anniversary: { label: '周年', icon: '💫', defaultRitual: '纪年仪式' },
  seasonal: { label: '岁时', icon: '🍂', defaultRitual: '岁时祭典' },
  farewell: { label: '送别', icon: '🕯️', defaultRitual: '送别仪式' },
}

// ============================================================
// 幕僚见证
// ============================================================

/** 见证事件类型 */
export type WitnessEventType =
  | 'first-focus'
  | 'streak-record'
  | 'emotion-breakthrough'
  | 'knowledge-milestone'
  | 'relationship-milestone'
  | 'health-milestone'
  | 'career-milestone'
  | 'personal-growth'

/**
 * 见证收件箱条目（KV 存储的幕僚见证，带 id/viewed 未读态）。
 * 注意：与 `src/types/advisor.ts` 的全局 `WitnessEntry`（服务于 AdvisorProfile.witnessLog）
 * 是**两个不同实体**，此处已改名为 `AdvisorWitnessRecord` 以消除命名歧义。
 *
 * ⚠️ 宪法第四部分"记录简化原则" + 蓝图"仅三元组 + 禁储存感受"：
 * 数据层严禁存幕僚/用户的 reaction / description / emotion（评价/描述/感受）。
 * 因此本类型**不含 reaction / description / emotion 字段**——reaction 仅由
 * `generateReaction()` 在 UI 即时生成（不落盘）；description/emotion 已移除。
 * 仅保留中性 `title` 作为"模糊光点"标签，落实蓝图"仅三元组 + 禁储存感受"。
 */
export interface AdvisorWitnessRecord {
  id: string
  advisorId: string
  eventType: WitnessEventType
  /** 中性事件标题（仅作"模糊光点"标签，非描述/感受） */
  title: string
  /** 见证时间 */
  timestamp: string
  /** 是否被用户查看 */
  viewed: boolean
}

/** 见证统计 */
export interface WitnessStats {
  totalWitnessed: number
  byType: Record<WitnessEventType, number>
  byAdvisor: Record<string, number>
  firstWitnessAt: string
  lastWitnessAt: string
  mostActiveAdvisor: string
}

/** 见证事件元数据 */
export const WITNESS_EVENT_META: Record<WitnessEventType, { label: string; icon: string; weight: number }> = {
  'first-focus': { label: '首次专注', icon: '🎯', weight: 3 },
  'streak-record': { label: '连击记录', icon: '🔥', weight: 5 },
  'emotion-breakthrough': { label: '情绪突破', icon: '💡', weight: 4 },
  'knowledge-milestone': { label: '知识里程碑', icon: '📚', weight: 3 },
  'relationship-milestone': { label: '关系里程碑', icon: '💝', weight: 4 },
  'health-milestone': { label: '健康里程碑', icon: '💪', weight: 3 },
  'career-milestone': { label: '事业里程碑', icon: '🚀', weight: 4 },
  'personal-growth': { label: '个人成长', icon: '🌱', weight: 5 },
}

// ============================================================
// 存储键
// ============================================================

export const ADVISOR_STORAGE_KEYS = {
  relations: 'hf:advisor:relations',
  activities: 'hf:advisor:activities',
  schedules: 'hf:advisor:schedules',
  celebrations: 'hf:advisor:celebrations',
  retirements: 'hf:advisor:retirements',
  witnesses: 'hf:advisor:witnesses',
} as const