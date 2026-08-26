// ============================================================
// 自我奖励 · 类型定义
// 区别于 modules/reward（财务"劳酬"），本模块是"个人成就自我奖励"：
// 用户自定义奖励条目，可绑定「习惯连续 N 天」或「解锁某勋章」，
// 条件满足自动标记「可兑现」；也支持纯手动添加 + 手动标记「已兑现」。
// ============================================================

/** 触发类型：manual 纯手动 / habit-streak 习惯连续 / badge 匠庐徽章 */
export type SelfRewardTriggerType = 'manual' | 'habit-streak' | 'badge'

export interface SelfRewardTrigger {
  type: SelfRewardTriggerType
  /** habit-streak：关联习惯 id */
  habitId?: string
  /** habit-streak：目标连续天数 */
  streakDays?: number
  /** badge：关联匠庐徽章 id */
  badgeId?: string
}

export type SelfRewardStatus = 'pending' | 'redeemable' | 'redeemed'

export interface SelfReward {
  id: string
  title: string
  description?: string
  icon?: string
  trigger: SelfRewardTrigger
  status: SelfRewardStatus
  createdAt: string
  /** 变为可兑现的时间（条件满足自动标记） */
  redeemableSince?: string | null
  /** 兑现时间 */
  redeemedAt?: string | null
  /** 犒赏成本（可量化时） */
  cost?: number
  /** 兑现寄语 */
  note?: string
}
