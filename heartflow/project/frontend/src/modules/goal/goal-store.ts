// ============================================================
// 留光阁 · 目标状态管理与旧梦潭（自 index.ts 拆出）
// 集成状态机流转 + 旧梦潭 + 自适应调整
// ------------------------------------------------------------
// 为什么拆：index.ts 会 re-export ./goal-bridge，而 goal-bridge 旧写法从
// './index' 取 useGoal —— barrel 自引用构成 index ↔ goal-bridge 循环依赖
// （模块初始化顺序不确定，取值可能拿到 undefined）。store 段下沉到本文件、
// bridge 改指 './goal-store' 后环被打断；对外 API 不变（index.ts 仍 re-export）。
// ============================================================

import { ref, computed } from 'vue'
import type { Goal, GoalTier, GoalStatus } from './types'
import { storage } from '../../engine/storage'
import {
  buildContext,
  checkAutoTransitions,
  getAllowedTransitions,
  calculateGoalHealth,
  computeGoalLinks,
  sinkToOldDreams,
  reviveFromOldDreams,
  updateOldDreamDays,
  groupOldDreamsByMonth,
} from './goal-state-machine'
import type { TransitionContext, GoalHealth, OldDream } from './goal-state-machine'

const OLD_DREAMS_KEY = 'goal_old_dreams'

function loadAll(): Goal[] {
  return storage.getGoals()
}

function saveAll(goals: Goal[]) {
  storage.setGoals(goals)
}

function loadOldDreams(): OldDream[] {
  try {
    const raw = localStorage.getItem(OLD_DREAMS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveOldDreams(dreams: OldDream[]) {
  localStorage.setItem(OLD_DREAMS_KEY, JSON.stringify(dreams))
}

const goals = ref<Goal[]>(loadAll())
const oldDreams = ref<OldDream[]>(updateOldDreamDays(loadOldDreams()))

export function useGoal() {
  function load() {
    goals.value = loadAll()
    oldDreams.value = updateOldDreamDays(loadOldDreams())
  }

  // ---- 计算属性 ----

  const visions = computed(() =>
    goals.value.filter(g => g.tier === 'vision').sort((a, b) => a.order - b.order))

  const targets = computed(() =>
    goals.value.filter(g => g.tier === 'target').sort((a, b) => a.order - b.order))

  const plans = computed(() =>
    goals.value.filter(g => g.tier === 'plan').sort((a, b) => a.order - b.order))

  /** 非休眠、非开花的目标（活跃目标） */
  const activeTargets = computed(() =>
    targets.value.filter(g => g.status !== 'dormant' && g.status !== 'bloom'))

  function childrenOf(parentId: string): Goal[] {
    return goals.value.filter(g => g.parentId === parentId).sort((a, b) => a.order - b.order)
  }

  // ---- 目标间光丝连线 ----

  const goalLinks = computed(() => computeGoalLinks(goals.value))

  // ---- CRUD ----

  function create(title: string, tier: GoalTier, domain: Goal['domain'], parentId?: string): Goal {
    const now = new Date().toISOString()
    const maxOrder = goals.value.filter(g => g.tier === tier).reduce((m, g) => Math.max(m, g.order), -1)
    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description: '',
      tier,
      parentId,
      status: 'seed',
      domain,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      anchorCount: 0,
      anchorDone: 0,
    }
    goals.value.push(goal)
    saveAll(goals.value)
    return goal
  }

  function update(id: string, data: Partial<Pick<Goal, 'title' | 'description' | 'status' | 'domain'>>) {
    const g = goals.value.find(g => g.id === id)
    if (!g) return
    Object.assign(g, data, { updatedAt: new Date().toISOString() })
    saveAll(goals.value)
  }

  function remove(id: string) {
    // 先检查是否有子节点需要一并删除
    goals.value = goals.value.filter(g => g.id !== id && g.parentId !== id)
    saveAll(goals.value)
  }

  // ---- 状态机集成 ----

  /** 获取目标的转换上下文 */
  function getContext(id: string): TransitionContext | null {
    const g = goals.value.find(g => g.id === id)
    if (!g) return null
    const childs = childrenOf(id)
    // 连续推迟次数暂时从 0 开始（后续与逐日心锚联动时完善）
    return buildContext(g, childs.length, 0)
  }

  /** 获取目标允许的手动转换 */
  function getTransitions(id: string) {
    const g = goals.value.find(g => g.id === id)
    if (!g) return []
    const ctx = getContext(id)
    if (!ctx) return []
    return getAllowedTransitions(g, ctx)
  }

  /** 提升生长状态（集成自动转换检测） */
  function promoteStatus(id: string) {
    const g = goals.value.find(g => g.id === id)
    if (!g) return

    const ctx = getContext(id)
    if (!ctx) return

    // 先检查自动转换
    const autoTransition = checkAutoTransitions(g, ctx)
    if (autoTransition) {
      g.status = autoTransition.to
      if (g.status === 'bloom') g.completedAt = new Date().toISOString()
      g.updatedAt = new Date().toISOString()
      saveAll(goals.value)
      return
    }

    // 手动转换：线性推进
    const order: GoalStatus[] = ['seed', 'sprout', 'growing', 'bloom']
    const idx = order.indexOf(g.status)
    if (idx < order.length - 1) {
      g.status = order[idx + 1]
      if (g.status === 'bloom') g.completedAt = new Date().toISOString()
      g.updatedAt = new Date().toISOString()
      saveAll(goals.value)
    }
  }

  /** 休眠/唤醒 */
  function toggleDormant(id: string) {
    const g = goals.value.find(g => g.id === id)
    if (!g) return
    g.status = g.status === 'dormant' ? 'seed' : 'dormant'
    g.updatedAt = new Date().toISOString()
    saveAll(goals.value)
  }

  /** 标记计划完成 → 自动更新父目标进度 + 状态机检测 */
  function markPlanDone(id: string) {
    const g = goals.value.find(g => g.id === id)
    if (!g || g.tier !== 'plan') return
    g.anchorDone++
    if (g.anchorDone >= g.anchorCount && g.anchorCount > 0) {
      g.status = 'bloom'
      g.completedAt = new Date().toISOString()
    }
    g.updatedAt = new Date().toISOString()

    // 更新父目标进度
    if (g.parentId) {
      const parent = goals.value.find(p => p.id === g.parentId)
      if (parent) {
        parent.anchorDone = childrenOf(parent.id).reduce((s, c) => s + c.anchorDone, 0)
        parent.updatedAt = new Date().toISOString()

        // 状态机自动检测：父目标是否应该从生长→开花
        const ctx = buildContext(parent, childrenOf(parent.id).length, 0)
        const autoTransition = checkAutoTransitions(parent, ctx)
        if (autoTransition) {
          parent.status = autoTransition.to
          if (parent.status === 'bloom') parent.completedAt = new Date().toISOString()
        }
      }
    }
    saveAll(goals.value)
  }

  // ---- 自适应调整 ----

  /** 计算目标健康度 */
  function getHealth(id: string): GoalHealth | null {
    const g = goals.value.find(g => g.id === id)
    if (!g) return null
    const ctx = getContext(id)
    if (!ctx) return null
    return calculateGoalHealth(g, ctx)
  }

  /** 获取所有需要关注的目标（健康度 < 0.7） */
  const unhealthyGoals = computed(() => {
    return targets.value
      .map(g => ({ goal: g, health: calculateGoalHealth(g, buildContext(g, childrenOf(g.id).length, 0)) }))
      .filter(({ health }) => health.level !== 'healthy')
      .sort((a, b) => a.health.score - b.health.score)
  })

  // ---- 旧梦潭 ----

  /** 获取旧梦潭按月份分组的数据 */
  const oldDreamsByMonth = computed(() => groupOldDreamsByMonth(oldDreams.value))

  /** 将完成的目标沉入旧梦潭 */
  function sinkToPool(id: string) {
    const g = goals.value.find(g => g.id === id)
    if (!g || g.status !== 'bloom') return

    const dream = sinkToOldDreams(g, oldDreams.value)
    const existingIdx = oldDreams.value.findIndex(d => d.goal.id === id)
    if (existingIdx >= 0) {
      oldDreams.value[existingIdx] = dream
    } else {
      oldDreams.value.push(dream)
    }

    // 从活跃目标中移除
    goals.value = goals.value.filter(g => g.id !== id)
    saveAll(goals.value)
    saveOldDreams(oldDreams.value)
  }

  /** 从旧梦潭复苏目标 */
  function reviveFromPool(id: string) {
    const idx = oldDreams.value.findIndex(d => d.goal.id === id)
    if (idx < 0) return

    const dream = oldDreams.value[idx]
    const revivedGoal = reviveFromOldDreams(dream)
    goals.value.push(revivedGoal)

    oldDreams.value.splice(idx, 1)
    saveAll(goals.value)
    saveOldDreams(oldDreams.value)
    return revivedGoal
  }

  /** 从旧梦潭彻底删除 */
  function removeFromPool(id: string) {
    oldDreams.value = oldDreams.value.filter(d => d.goal.id !== id)
    saveOldDreams(oldDreams.value)
  }

  return {
    // 数据
    goals,
    visions,
    targets,
    plans,
    activeTargets,
    oldDreams,
    oldDreamsByMonth,

    // 基础操作
    load,
    create,
    update,
    remove,
    childrenOf,

    // 状态机
    getContext,
    getTransitions,
    promoteStatus,
    toggleDormant,
    markPlanDone,

    // 自适应
    getHealth,
    unhealthyGoals,
    goalLinks,

    // 旧梦潭
    sinkToPool,
    reviveFromPool,
    removeFromPool,
  }
}
