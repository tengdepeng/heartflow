// ============================================================
// 自律工坊 · 预设库（P16-3）
// 扩展徽章库、预设习惯模板、预设挑战模板、预设仪式模板
// ============================================================

import type { HabitDifficulty, HabitFrequency, DailyRitual } from './types'
import type { AchievementBadge, HabitBundle } from './streak-system'

// ============================================================
// 扩展徽章库（从 13 个扩展到 30+ 个）
// ============================================================

export interface BadgePreset {
  name: string
  description: string
  icon: string
  category: AchievementBadge['category']
  condition: {
    type: AchievementBadge['condition']['type']
    threshold: number
    habitId?: string
  }
  rarity: AchievementBadge['rarity']
}

export const EXTENDED_BADGES: BadgePreset[] = [
  // ---- 连续打卡 (streak) ----
  { name: '初出茅庐', description: '完成首次打卡', icon: '🌱', category: 'streak', condition: { type: 'total_checkins', threshold: 1 }, rarity: 'common' },
  { name: '三日之约', description: '连续打卡 3 天', icon: '🌿', category: 'streak', condition: { type: 'streak_days', threshold: 3 }, rarity: 'common' },
  { name: '持之以恒', description: '连续打卡 7 天', icon: '🔥', category: 'streak', condition: { type: 'streak_days', threshold: 7 }, rarity: 'common' },
  { name: '习惯养成', description: '连续打卡 21 天', icon: '🌟', category: 'streak', condition: { type: 'streak_days', threshold: 21 }, rarity: 'rare' },
  { name: '三十而立', description: '连续打卡 30 天', icon: '📅', category: 'streak', condition: { type: 'streak_days', threshold: 30 }, rarity: 'rare' },
  { name: '百日筑基', description: '连续打卡 66 天', icon: '🏛️', category: 'streak', condition: { type: 'streak_days', threshold: 66 }, rarity: 'epic' },
  { name: '百折不挠', description: '连续打卡 100 天', icon: '💯', category: 'streak', condition: { type: 'streak_days', threshold: 100 }, rarity: 'epic' },
  { name: '半年之约', description: '连续打卡 180 天', icon: '🌓', category: 'streak', condition: { type: 'streak_days', threshold: 180 }, rarity: 'legendary' },
  { name: '年度自律', description: '连续打卡 365 天', icon: '👑', category: 'streak', condition: { type: 'streak_days', threshold: 365 }, rarity: 'legendary' },

  // ---- 里程碑 (milestone) ----
  { name: '打卡达人', description: '累计打卡 100 次', icon: '✅', category: 'milestone', condition: { type: 'total_checkins', threshold: 100 }, rarity: 'rare' },
  { name: '打卡专家', description: '累计打卡 250 次', icon: '📊', category: 'milestone', condition: { type: 'total_checkins', threshold: 250 }, rarity: 'rare' },
  { name: '打卡大师', description: '累计打卡 500 次', icon: '🏆', category: 'milestone', condition: { type: 'total_checkins', threshold: 500 }, rarity: 'epic' },
  { name: '打卡宗师', description: '累计打卡 750 次', icon: '🎯', category: 'milestone', condition: { type: 'total_checkins', threshold: 750 }, rarity: 'epic' },
  { name: '打卡传说', description: '累计打卡 1000 次', icon: '🎖️', category: 'milestone', condition: { type: 'total_checkins', threshold: 1000 }, rarity: 'legendary' },
  { name: '千锤百炼', description: '累计打卡 2000 次', icon: '💎', category: 'milestone', condition: { type: 'total_checkins', threshold: 2000 }, rarity: 'legendary' },

  // ---- 多样化 (variety) ----
  { name: '多面手', description: '同时维护 5 个习惯', icon: '🎯', category: 'variety', condition: { type: 'habit_count', threshold: 5 }, rarity: 'rare' },
  { name: '习惯大师', description: '同时维护 10 个习惯', icon: '🎪', category: 'variety', condition: { type: 'habit_count', threshold: 10 }, rarity: 'epic' },
  { name: '习惯艺术家', description: '同时维护 15 个习惯', icon: '🎨', category: 'variety', condition: { type: 'habit_count', threshold: 15 }, rarity: 'legendary' },

  // ---- 挑战 (challenge) ----
  { name: '挑战者', description: '完成首个挑战', icon: '⚔️', category: 'challenge', condition: { type: 'challenge_complete', threshold: 1 }, rarity: 'common' },
  { name: '挑战达人', description: '完成 5 个挑战', icon: '🛡️', category: 'challenge', condition: { type: 'challenge_complete', threshold: 5 }, rarity: 'rare' },
  { name: '挑战大师', description: '完成 10 个挑战', icon: '🗡️', category: 'challenge', condition: { type: 'challenge_complete', threshold: 10 }, rarity: 'epic' },
  { name: '挑战之王', description: '完成 21 个挑战', icon: '👊', category: 'challenge', condition: { type: 'challenge_complete', threshold: 21 }, rarity: 'legendary' },

  // ---- 特殊 (special) ----
  { name: '完美一周', description: '一周内每天完成所有习惯', icon: '✨', category: 'special', condition: { type: 'perfect_week', threshold: 1 }, rarity: 'rare' },
  { name: '完美双周', description: '连续两周完美完成', icon: '🌟', category: 'special', condition: { type: 'perfect_week', threshold: 2 }, rarity: 'epic' },
  { name: '完美一月', description: '一个月内每天完成所有习惯', icon: '🌕', category: 'special', condition: { type: 'perfect_month', threshold: 1 }, rarity: 'epic' },
  { name: '完美季度', description: '连续三个月完美完成', icon: '🌍', category: 'special', condition: { type: 'perfect_month', threshold: 3 }, rarity: 'legendary' },
  { name: '早起鸟', description: '连续 30 天在早上完成习惯', icon: '🐦', category: 'special', condition: { type: 'total_checkins', threshold: 30 }, rarity: 'rare' },
  { name: '夜猫子', description: '连续 30 天在晚上完成习惯', icon: '🦉', category: 'special', condition: { type: 'total_checkins', threshold: 30 }, rarity: 'rare' },
  { name: '卷土重来', description: '中断后重新开始并连续 7 天', icon: '🔄', category: 'special', condition: { type: 'streak_days', threshold: 7 }, rarity: 'common' },
  { name: '全能冠军', description: '解锁所有类别的至少一个徽章', icon: '🏅', category: 'special', condition: { type: 'challenge_complete', threshold: 1 }, rarity: 'legendary' },
]

// ============================================================
// 预设习惯模板库
// ============================================================

export interface HabitTemplate {
  title: string
  description: string
  icon: string
  difficulty: HabitDifficulty
  frequency: HabitFrequency
  target: number
  customFrequency?: string
  category: 'health' | 'learning' | 'productivity' | 'mindfulness' | 'social' | 'creative'
  tags: string[]
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // ---- 健康 ----
  { title: '喝水', description: '每天喝 8 杯水，保持充足水分', icon: '💧', difficulty: 'easy', frequency: 'daily', target: 8, category: 'health', tags: ['健康', '基础', '水分'] },
  { title: '晨跑', description: '每天早上跑步 30 分钟', icon: '🏃', difficulty: 'medium', frequency: 'daily', target: 1, category: 'health', tags: ['运动', '晨间', '有氧'] },
  { title: '健身', description: '每周至少 3 次力量训练', icon: '💪', difficulty: 'hard', frequency: 'weekly', target: 3, category: 'health', tags: ['运动', '力量', '增肌'] },
  { title: '瑜伽', description: '每天 15 分钟瑜伽练习', icon: '🧘', difficulty: 'medium', frequency: 'daily', target: 1, category: 'health', tags: ['运动', '柔韧', '放松'] },
  { title: '健康饮食', description: '每天吃 5 份蔬菜水果', icon: '🥗', difficulty: 'medium', frequency: 'daily', target: 5, category: 'health', tags: ['饮食', '营养', '蔬菜'] },
  { title: '早睡', description: '每天晚上 11 点前入睡', icon: '🌙', difficulty: 'medium', frequency: 'daily', target: 1, category: 'health', tags: ['睡眠', '作息', '晚间'] },
  { title: '早起', description: '每天早上 6:30 起床', icon: '🌅', difficulty: 'hard', frequency: 'daily', target: 1, category: 'health', tags: ['睡眠', '作息', '晨间'] },
  { title: '散步', description: '每天饭后散步 20 分钟', icon: '🚶', difficulty: 'easy', frequency: 'daily', target: 1, category: 'health', tags: ['运动', '轻度', '消化'] },
  { title: '拉伸', description: '每天早晚各做 5 分钟拉伸', icon: '🤸', difficulty: 'easy', frequency: 'daily', target: 2, category: 'health', tags: ['运动', '柔韧', '恢复'] },
  { title: '戒糖', description: '减少含糖饮料和零食', icon: '🍬', difficulty: 'hard', frequency: 'daily', target: 1, category: 'health', tags: ['饮食', '控糖', '戒断'] },

  // ---- 学习 ----
  { title: '阅读', description: '每天阅读 30 分钟', icon: '📖', difficulty: 'easy', frequency: 'daily', target: 1, category: 'learning', tags: ['阅读', '知识', '成长'] },
  { title: '写作', description: '每天写 500 字', icon: '✍️', difficulty: 'medium', frequency: 'daily', target: 500, category: 'learning', tags: ['写作', '表达', '创作'] },
  { title: '学英语', description: '每天背 20 个单词', icon: '🔤', difficulty: 'medium', frequency: 'daily', target: 20, category: 'learning', tags: ['语言', '英语', '词汇'] },
  { title: '编程练习', description: '每天做一个编程练习', icon: '💻', difficulty: 'medium', frequency: 'daily', target: 1, category: 'learning', tags: ['编程', '练习', '技能'] },
  { title: '做笔记', description: '每天记录学习笔记', icon: '📝', difficulty: 'easy', frequency: 'daily', target: 1, category: 'learning', tags: ['笔记', '整理', '复习'] },
  { title: '看 TED', description: '每天看一个 TED 演讲', icon: '🎤', difficulty: 'easy', frequency: 'daily', target: 1, category: 'learning', tags: ['演讲', '视野', '英语'] },
  { title: '刷题', description: '每天做 10 道算法题', icon: '🧩', difficulty: 'hard', frequency: 'daily', target: 10, category: 'learning', tags: ['算法', '编程', '面试'] },

  // ---- 效率 ----
  { title: '晨间计划', description: '每天早上列出今日待办', icon: '📋', difficulty: 'easy', frequency: 'daily', target: 1, category: 'productivity', tags: ['规划', '晨间', '效率'] },
  { title: '番茄工作法', description: '每天完成 4 个番茄钟', icon: '🍅', difficulty: 'medium', frequency: 'daily', target: 4, category: 'productivity', tags: ['专注', '效率', '时间管理'] },
  { title: '整理桌面', description: '每天下班前整理桌面', icon: '🗂️', difficulty: 'easy', frequency: 'daily', target: 1, category: 'productivity', tags: ['整理', '清洁', '环境'] },
  { title: '深度工作', description: '每天 2 小时无干扰专注', icon: '🔒', difficulty: 'hard', frequency: 'daily', target: 1, category: 'productivity', tags: ['专注', '深度', '效率'] },
  { title: '回顾总结', description: '每天回顾今日完成事项', icon: '🔄', difficulty: 'easy', frequency: 'daily', target: 1, category: 'productivity', tags: ['回顾', '总结', '反思'] },

  // ---- 正念 ----
  { title: '冥想', description: '每天冥想 10 分钟', icon: '🧘', difficulty: 'easy', frequency: 'daily', target: 1, category: 'mindfulness', tags: ['冥想', '正念', '放松'] },
  { title: '感恩日记', description: '每天写下 3 件感恩的事', icon: '🙏', difficulty: 'easy', frequency: 'daily', target: 3, category: 'mindfulness', tags: ['感恩', '日记', '积极'] },
  { title: '深呼吸', description: '每天 3 次深呼吸练习', icon: '🌬️', difficulty: 'easy', frequency: 'daily', target: 3, category: 'mindfulness', tags: ['呼吸', '放松', '减压'] },
  { title: '断网时间', description: '每天 1 小时不碰手机', icon: '📵', difficulty: 'medium', frequency: 'daily', target: 1, category: 'mindfulness', tags: ['数字排毒', '专注', '休息'] },

  // ---- 社交 ----
  { title: '联系家人', description: '每天给家人发一条消息', icon: '👨‍👩‍👧‍👦', difficulty: 'easy', frequency: 'daily', target: 1, category: 'social', tags: ['家庭', '沟通', '关系'] },
  { title: '社交互动', description: '每周与朋友聚会一次', icon: '🤝', difficulty: 'easy', frequency: 'weekly', target: 1, category: 'social', tags: ['社交', '朋友', '关系'] },
  { title: '帮助他人', description: '每天做一件帮助他人的事', icon: '🤲', difficulty: 'medium', frequency: 'daily', target: 1, category: 'social', tags: ['利他', '善意', '社区'] },

  // ---- 创意 ----
  { title: '画画', description: '每天画一幅速写', icon: '🎨', difficulty: 'medium', frequency: 'daily', target: 1, category: 'creative', tags: ['绘画', '创作', '艺术'] },
  { title: '摄影', description: '每天拍一张有趣的照片', icon: '📷', difficulty: 'easy', frequency: 'daily', target: 1, category: 'creative', tags: ['摄影', '观察', '记录'] },
  { title: '乐器练习', description: '每天练习乐器 30 分钟', icon: '🎸', difficulty: 'medium', frequency: 'daily', target: 1, category: 'creative', tags: ['音乐', '乐器', '练习'] },
]

// ============================================================
// 预设挑战模板
// ============================================================

export interface ChallengeTemplate {
  title: string
  description: string
  duration: number
  suggestedHabits: string[] // 建议搭配的习惯标题
  reward?: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    title: '7 天入门挑战',
    description: '坚持 7 天完成基础习惯，建立自律起点',
    duration: 7,
    suggestedHabits: ['喝水', '散步', '晨间计划'],
    reward: '解锁「初出茅庐」徽章',
    difficulty: 'easy',
  },
  {
    title: '21 天习惯养成',
    description: '21 天持续坚持，让习惯成为自然',
    duration: 21,
    suggestedHabits: ['阅读', '冥想', '写作'],
    reward: '解锁「习惯养成」徽章',
    difficulty: 'medium',
  },
  {
    title: '30 天晨间挑战',
    description: '30 天早起 + 晨间仪式，重塑你的早晨',
    duration: 30,
    suggestedHabits: ['早起', '晨跑', '晨间计划'],
    reward: '解锁「早起鸟」徽章',
    difficulty: 'hard',
  },
  {
    title: '30 天健康挑战',
    description: '30 天健康饮食 + 运动，打造健康体魄',
    duration: 30,
    suggestedHabits: ['健康饮食', '健身', '早睡'],
    reward: '解锁「三十而立」徽章',
    difficulty: 'hard',
  },
  {
    title: '7 天正念挑战',
    description: '7 天冥想 + 感恩练习，提升内心平静',
    duration: 7,
    suggestedHabits: ['冥想', '感恩日记', '深呼吸'],
    reward: '放松身心',
    difficulty: 'easy',
  },
  {
    title: '14 天断网挑战',
    description: '减少屏幕时间，回归真实生活',
    duration: 14,
    suggestedHabits: ['断网时间', '阅读', '散步'],
    reward: '提升专注力',
    difficulty: 'medium',
  },
  {
    title: '30 天学习冲刺',
    description: '30 天高强度学习，快速提升技能',
    duration: 30,
    suggestedHabits: ['阅读', '编程练习', '刷题', '做笔记'],
    reward: '解锁「打卡达人」徽章',
    difficulty: 'hard',
  },
  {
    title: '66 天筑基挑战',
    description: '66 天持续行动，打牢习惯根基',
    duration: 66,
    suggestedHabits: ['阅读', '冥想', '健身', '写作'],
    reward: '解锁「百日筑基」徽章',
    difficulty: 'extreme',
  },
]

// ============================================================
// 预设仪式模板
// ============================================================

export interface RitualTemplate {
  title: string
  description: string
  icon: string
  steps: string[]
  estimatedDuration: number
  triggerTime: DailyRitual['triggerTime']
}

export const RITUAL_TEMPLATES: RitualTemplate[] = [
  {
    title: '晨间启动仪式',
    description: '用 15 分钟开启高效的一天',
    icon: '🌅',
    steps: [
      '喝一杯温水',
      '做 5 分钟拉伸',
      '写下今日最重要的 3 件事',
      '深呼吸 3 次，设定今日意图',
    ],
    estimatedDuration: 15,
    triggerTime: 'morning',
  },
  {
    title: '午间充电',
    description: '用 10 分钟恢复精力',
    icon: '☀️',
    steps: [
      '离开座位走动 5 分钟',
      '喝一杯水',
      '做 2 分钟眼部放松',
      '回顾上午进度，调整下午计划',
    ],
    estimatedDuration: 10,
    triggerTime: 'afternoon',
  },
  {
    title: '晚间放松仪式',
    description: '用 20 分钟优雅结束一天',
    icon: '🌙',
    steps: [
      '写下今日 3 件感恩的事',
      '回顾今日完成事项',
      '准备明天的衣物和物品',
      '阅读 15 分钟',
      '关灯冥想 5 分钟',
    ],
    estimatedDuration: 20,
    triggerTime: 'evening',
  },
  {
    title: '周末回顾',
    description: '用 30 分钟回顾一周，规划下周',
    icon: '📊',
    steps: [
      '回顾本周习惯完成情况',
      '分析失败原因和成功经验',
      '设定下周目标',
      '规划下周习惯安排',
      '奖励自己本周的努力',
    ],
    estimatedDuration: 30,
    triggerTime: 'anytime',
  },
  {
    title: '深度专注仪式',
    description: '进入深度工作前的准备仪式',
    icon: '🎯',
    steps: [
      '清理桌面',
      '关闭手机通知',
      '设定番茄钟 25 分钟',
      '深呼吸 3 次',
      '开始专注工作',
    ],
    estimatedDuration: 5,
    triggerTime: 'anytime',
  },
]

// ============================================================
// 习惯组合预设
// ============================================================

export interface BundlePreset {
  name: string
  description: string
  completionCondition: HabitBundle['completionCondition']
  bonusMultiplier: number
  suggestedHabitTitles: string[]
}

export const BUNDLE_PRESETS: BundlePreset[] = [
  {
    name: '晨间三部曲',
    description: '早起后依次完成：喝水、冥想、晨间计划',
    completionCondition: 'all',
    bonusMultiplier: 1.5,
    suggestedHabitTitles: ['喝水', '冥想', '晨间计划'],
  },
  {
    name: '晚间充电',
    description: '睡前完成：日记、阅读、明日计划',
    completionCondition: 'all',
    bonusMultiplier: 1.3,
    suggestedHabitTitles: ['阅读', '写作', '回顾总结'],
  },
  {
    name: '健康基石',
    description: '每天至少完成：喝水、运动、充足睡眠',
    completionCondition: 'majority',
    bonusMultiplier: 1.2,
    suggestedHabitTitles: ['喝水', '散步', '早睡'],
  },
  {
    name: '学习火箭',
    description: '高强度学习组合：阅读 + 编程 + 笔记',
    completionCondition: 'all',
    bonusMultiplier: 1.5,
    suggestedHabitTitles: ['阅读', '编程练习', '做笔记'],
  },
  {
    name: '身心平衡',
    description: '运动 + 冥想 + 健康饮食，全面平衡',
    completionCondition: 'majority',
    bonusMultiplier: 1.3,
    suggestedHabitTitles: ['健身', '冥想', '健康饮食'],
  },
  {
    name: '创意爆发',
    description: '每天至少完成一项创意活动',
    completionCondition: 'any',
    bonusMultiplier: 1.1,
    suggestedHabitTitles: ['写作', '画画', '摄影'],
  },
  {
    name: '社交达人',
    description: '保持社交联系，建立良好关系',
    completionCondition: 'majority',
    bonusMultiplier: 1.2,
    suggestedHabitTitles: ['联系家人', '社交互动', '帮助他人'],
  },
]