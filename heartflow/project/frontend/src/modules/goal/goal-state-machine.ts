// ============================================================
// 留光阁 · 目标生长状态机
// 蓝图定义：
//   种子(seed) → 发芽(sprout) → 生长(growing) → 开花(bloom) → 旧梦潭(oldDreams)
//   休眠(dormant) 可从任意状态进入
//   自适应调整：反复拖延 → 光点变暗 + 提示
// ============================================================

import type { Goal, GoalStatus } from './types'

// ---- 状态转换条件 ----

export interface StateTransition {
  from: GoalStatus
  to: GoalStatus
  label: string
  /** 自动转换条件（返回 true 时自动触发） */
  autoCondition?: (goal: Goal, context: TransitionContext) => boolean
  /** 手动转换条件（用户可手动触发时的前提） */
  manualCondition?: (goal: Goal, context: TransitionContext) => boolean
  /** 转换描述 */
  description: string
}

export interface TransitionContext {
  /** 子计划数量 */
  childCount: number
  /** 关联锚点总数 */
  totalAnchors: number
  /** 已完成锚点数 */
  doneAnchors: number
  /** 距上次更新的天数 */
  daysSinceUpdate: number
  /** 距创建的天数 */
  daysSinceCreated: number
  /** 连续推迟次数 */
  consecutiveDrifts: number
}

// ---- 蓝图状态转换规则 ----

export const STATE_TRANSITIONS: StateTransition[] = [
  // 种子 → 发芽：添加了第一个子计划
  {
    from: 'seed',
    to: 'sprout',
    label: '破土',
    autoCondition: (_g, ctx) => ctx.childCount > 0,
    description: '添加了第一个计划，目标开始破土发芽',
  },
  // 种子 → 发芽：手动（用户主动推进）
  {
    from: 'seed',
    to: 'sprout',
    label: '手动催芽',
    manualCondition: (_g, ctx) => ctx.daysSinceCreated >= 3,
    description: '目标创建超过3天仍未添加计划，用户可手动催芽',
  },

  // 发芽 → 生长：开始执行（有锚点完成）
  {
    from: 'sprout',
    to: 'growing',
    label: '扎根生长',
    autoCondition: (_g, ctx) => ctx.doneAnchors > 0,
    description: '开始完成锚点，目标进入持续生长阶段',
  },

  // 生长 → 开花：所有锚点完成
  {
    from: 'growing',
    to: 'bloom',
    label: '开花结果',
    autoCondition: (g) => g.anchorCount > 0 && g.anchorDone >= g.anchorCount,
    description: '所有计划锚点完成，目标开花结果',
  },

  // 任意状态 → 休眠：手动暂停
  {
    from: 'seed',
    to: 'dormant',
    label: '暂时休眠',
    description: '暂停目标，可随时唤醒',
  },
  {
    from: 'sprout',
    to: 'dormant',
    label: '暂时休眠',
    description: '暂停目标，可随时唤醒',
  },
  {
    from: 'growing',
    to: 'dormant',
    label: '暂时休眠',
    description: '暂停目标，可随时唤醒',
  },

  // 休眠 → 种子：重新唤醒
  {
    from: 'dormant',
    to: 'seed',
    label: '重新唤醒',
    description: '唤醒休眠目标，从头开始',
  },

  // 开花 → 旧梦潭：归档已完成目标
  {
    from: 'bloom',
    to: 'bloom', // 保持 bloom 状态，但标记 archived = true
    label: '沉入旧梦潭',
    description: '已完成的目标沉入旧梦潭，可随时复苏',
  },
]

// ---- 状态机核心 ----

/** 构建转换上下文 */
export function buildContext(goal: Goal, childCount: number, consecutiveDrifts: number): TransitionContext {
  const now = Date.now()
  const daysSinceUpdate = Math.floor((now - new Date(goal.updatedAt).getTime()) / 86400000)
  const daysSinceCreated = Math.floor((now - new Date(goal.createdAt).getTime()) / 86400000)

  return {
    childCount,
    totalAnchors: goal.anchorCount,
    doneAnchors: goal.anchorDone,
    daysSinceUpdate,
    daysSinceCreated,
    consecutiveDrifts,
  }
}

/** 获取当前状态允许的转换 */
export function getAllowedTransitions(goal: Goal, context: TransitionContext): StateTransition[] {
  return STATE_TRANSITIONS.filter(t => {
    if (t.from !== goal.status) return false
    // 自动转换不显示为可选项
    if (t.autoCondition) return false
    // 手动转换需要满足条件
    if (t.manualCondition && !t.manualCondition(goal, context)) return false
    return true
  })
}

/** 检查自动转换并执行 */
export function checkAutoTransitions(goal: Goal, context: TransitionContext): StateTransition | null {
  for (const t of STATE_TRANSITIONS) {
    if (t.from !== goal.status) continue
    if (t.autoCondition && t.autoCondition(goal, context)) {
      return t
    }
  }
  return null
}

// ---- 自适应调整（蓝图：反复拖延→光点变暗+提示） ----

export interface GoalHealth {
  /** 健康度 0-1，越低越不健康 */
  score: number
  /** 警告等级 */
  level: 'healthy' | 'warning' | 'critical'
  /** 建议 */
  suggestions: string[]
  /** 光点亮度 0-1（用于视觉呈现） */
  luminance: number
}

/** 计算目标健康度 */
export function calculateGoalHealth(goal: Goal, context: TransitionContext): GoalHealth {
  const suggestions: string[] = []
  let score = 1.0

  // 1. 长期无活动
  if (context.daysSinceUpdate > 30 && goal.status !== 'dormant' && goal.status !== 'bloom') {
    score -= 0.3
    suggestions.push('目标已超过30天没有更新，考虑拆解为更小的步骤或重新评估优先级')
  } else if (context.daysSinceUpdate > 14 && goal.status !== 'dormant' && goal.status !== 'bloom') {
    score -= 0.15
    suggestions.push('目标已两周没有进展，试着迈出第一步')
  }

  // 2. 连续推迟
  if (context.consecutiveDrifts >= 5) {
    score -= 0.3
    suggestions.push('关联锚点已被连续推迟5次以上，目标可能过大或时机未到')
  } else if (context.consecutiveDrifts >= 3) {
    score -= 0.15
    suggestions.push('关联锚点被推迟了3次，考虑缩小目标范围')
  }

  // 3. 无子计划（种子状态太久）
  if (goal.status === 'seed' && context.daysSinceCreated > 7 && context.childCount === 0) {
    score -= 0.2
    suggestions.push('目标创建超过一周还没有制定计划，分解为具体步骤会更容易开始')
  }

  // 4. 进度停滞
  if (goal.status === 'growing' && goal.anchorCount > 0) {
    const progress = goal.anchorDone / goal.anchorCount
    if (progress < 0.3 && context.daysSinceCreated > 60) {
      score -= 0.2
      suggestions.push('目标进度不足30%且已超过两个月，需要重新评估可行性')
    }
  }

  score = Math.max(0, Math.min(1, score))

  // 健康等级
  let level: GoalHealth['level'] = 'healthy'
  if (score < 0.4) level = 'critical'
  else if (score < 0.7) level = 'warning'

  // 光点亮度：健康度映射到 0.3-1.0（避免完全不可见）
  const luminance = 0.3 + score * 0.7

  return { score, level, suggestions, luminance }
}

// ---- 旧梦潭（已完成目标的归档池） ----

export interface OldDream {
  goal: Goal
  /** 沉入时间 */
  sunkAt: string
  /** 在潭底的停留天数 */
  daysInPool: number
  /** 复苏次数 */
  reviveCount: number
}

/** 将完成的目标沉入旧梦潭 */
export function sinkToOldDreams(goal: Goal, existingDreams: OldDream[]): OldDream {
  const existing = existingDreams.find(d => d.goal.id === goal.id)
  const dream: OldDream = {
    goal: { ...goal, status: 'bloom' },
    sunkAt: new Date().toISOString(),
    daysInPool: 0,
    reviveCount: existing ? existing.reviveCount : 0,
  }
  return dream
}

/** 从旧梦潭复苏目标 */
export function reviveFromOldDreams(dream: OldDream): Goal {
  // 复苏时重置为种子状态
  return {
    ...dream.goal,
    status: 'seed',
    updatedAt: new Date().toISOString(),
    completedAt: undefined,
    anchorDone: 0,
  }
}

/** 更新旧梦潭中所有梦的天数 */
export function updateOldDreamDays(dreams: OldDream[]): OldDream[] {
  const now = Date.now()
  return dreams.map(d => ({
    ...d,
    daysInPool: Math.floor((now - new Date(d.sunkAt).getTime()) / 86400000),
  }))
}

/** 按月份分组旧梦 */
export function groupOldDreamsByMonth(dreams: OldDream[]): { month: string; items: OldDream[] }[] {
  const groups = new Map<string, OldDream[]>()
  const sorted = [...dreams].sort((a, b) => b.sunkAt.localeCompare(a.sunkAt))

  for (const d of sorted) {
    const month = d.sunkAt.slice(0, 7) // YYYY-MM
    if (!groups.has(month)) groups.set(month, [])
    groups.get(month)!.push(d)
  }

  return Array.from(groups.entries()).map(([month, items]) => ({ month, items }))
}

// ---- 目标间光丝连线（蓝图：相关目标间的可视化连线） ----

export interface GoalLink {
  sourceId: string
  targetId: string
  /** 连线强度 0-1 */
  strength: number
  /** 连线原因 */
  reason: 'same_domain' | 'shared_anchor' | 'parent_child' | 'manual'
}

/** 计算目标间的关联光丝 */
export function computeGoalLinks(goals: Goal[]): GoalLink[] {
  const links: GoalLink[] = []
  const targets = goals.filter(g => g.tier === 'target')

  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i]
      const b = targets[j]

      // 同领域关联
      if (a.domain === b.domain) {
        links.push({
          sourceId: a.id,
          targetId: b.id,
          strength: 0.5,
          reason: 'same_domain',
        })
      }
    }
  }

  // 父子关联
  for (const g of goals) {
    if (g.parentId) {
      links.push({
        sourceId: g.parentId,
        targetId: g.id,
        strength: 0.8,
        reason: 'parent_child',
      })
    }
  }

  return links
}