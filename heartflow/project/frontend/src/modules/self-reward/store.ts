// ============================================================
// 自我奖励 · 状态引擎
// 区别于 modules/reward（财务"劳酬"），本模块是"个人成就自我奖励"：
// 用户自定义奖励条目，可绑定「习惯连续 N 天」或「解锁某匠庐徽章」，
// 条件满足自动标记「可兑现」；也支持纯手动添加 + 手动标记「已兑现」。
//
// 存储键：hf:self_rewards（明文 JSON 数组，对齐蓝图第一层）
// 数据源：
//   - 习惯 streak：modules/discipline/workshop.getHabits()
//   - 徽章解锁：modules/craft/craft-badges.useCraftBadges().isBadgeUnlocked()
// ============================================================

import { computed, ref } from 'vue'
import { storage } from '../../engine/storage'
import { getHabits } from '../discipline/workshop'
import { useCraftBadges } from '../craft/craft-badges'
import type { SelfReward, SelfRewardTrigger } from './types'

const STORAGE_KEY = 'hf:self_rewards'

/** 触发类型元信息（供 UI 展示） */
export const SELF_REWARD_TRIGGER_META: Record<
  SelfRewardTrigger['type'],
  { label: string; icon: string; hint: string }
> = {
  manual: { label: '纯手动', icon: '✋', hint: '由你自行决定何时兑现' },
  'habit-streak': { label: '习惯连续', icon: '🔥', hint: '关联习惯连续达成 N 天后自动可兑现' },
  badge: { label: '匠庐徽章', icon: '🏅', hint: '解锁指定匠庐徽章后自动可兑现' },
}

/** 读取即最新：访问 rewards.value 时从存储读取 */
function loadRewards(): SelfReward[] {
  return storage.getKV<SelfReward[]>(STORAGE_KEY, [])
}

function persist(list: SelfReward[]): void {
  storage.setKV(STORAGE_KEY, list)
}

function genId(): string {
  return `sr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * 评估所有非手动奖励的触发条件：
 * - habit-streak：关联习惯当前 streak ≥ streakDays → 可兑现
 * - badge：关联徽章已解锁 → 可兑现
 * 已可兑现/已兑现的不降级。返回本轮新变为「可兑现」的条目（供 UI 提示）。
 */
export function evaluateSelfRewards(): SelfReward[] {
  const list = loadRewards()
  if (list.length === 0) return []

  let habitsCache: ReturnType<typeof getHabits> | null = null
  let badgesApi: ReturnType<typeof useCraftBadges> | null = null

  const now = new Date().toISOString()
  const newlyRedeemable: SelfReward[] = []

  for (const r of list) {
    if (r.status !== 'pending') continue
    if (r.trigger.type === 'manual') continue

    let met = false
    if (r.trigger.type === 'habit-streak') {
      if (!habitsCache) habitsCache = getHabits()
      const habit = habitsCache.find(h => h.id === r.trigger.habitId)
      if (habit && r.trigger.streakDays && habit.streak >= r.trigger.streakDays) met = true
    } else if (r.trigger.type === 'badge') {
      if (!badgesApi) badgesApi = useCraftBadges()
      if (r.trigger.badgeId && badgesApi.isBadgeUnlocked(r.trigger.badgeId)) met = true
    }

    if (met) {
      r.status = 'redeemable'
      r.redeemableSince = now
      newlyRedeemable.push(r)
    }
  }

  if (newlyRedeemable.length > 0) persist(list)
  return newlyRedeemable
}

/**
 * 自我奖励组合式入口。
 * read-through：rewards 为 computed，访问即读存储；写操作 read-modify-write 后落盘。
 */
export function useSelfReward() {
  const rewards = computed<SelfReward[]>(() => loadRewards())
  /** 触发一次刷新（仅供模板引用以建立响应式依赖时使用） */
  const tick = ref(0)
  function touch() { tick.value++ }

  /** 新增奖励。返回新条目 id。 */
  function add(input: {
    title: string
    description?: string
    icon?: string
    trigger: SelfRewardTrigger
  }): string {
    const item: SelfReward = {
      id: genId(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      icon: input.icon || '🎁',
      trigger: input.trigger,
      status: 'pending',
      createdAt: new Date().toISOString(),
      redeemableSince: null,
      redeemedAt: null,
    }
    const list = loadRewards()
    list.push(item)
    persist(list)
    touch()
    // 新增后立即评估一次（badge/habit 可能已满足）
    evaluateSelfRewards()
    return item.id
  }

  /** 更新奖励（保留 status 与时间线） */
  function update(id: string, patch: Partial<Pick<SelfReward, 'title' | 'description' | 'icon' | 'trigger'>>): void {
    const list = loadRewards()
    const idx = list.findIndex(r => r.id === id)
    if (idx < 0) return
    list[idx] = { ...list[idx], ...patch }
    persist(list)
    touch()
    evaluateSelfRewards()
  }

  /** 删除奖励 */
  function remove(id: string): void {
    const list = loadRewards().filter(r => r.id !== id)
    persist(list)
    touch()
  }

  /** 标记为已兑现（仅可兑现态可兑现；手动 pending 也允许直接兑现） */
  function redeem(id: string, options?: { note?: string }): void {
    const list = loadRewards()
    const idx = list.findIndex(r => r.id === id)
    if (idx < 0) return
    const r = list[idx]
    if (r.status === 'redeemed') return
    r.status = 'redeemable' // 先置可兑现，再兑现（保证语义）
    r.status = 'redeemed'
    r.redeemedAt = new Date().toISOString()
    // 兑现寄语（犒赏账本面板可通过 options.note 记录）
    if (options?.note !== undefined) r.note = options.note
    persist(list)
    touch()
  }

  /** 撤销兑现（回到可兑现） */
  function unredeem(id: string): void {
    const list = loadRewards()
    const idx = list.findIndex(r => r.id === id)
    if (idx < 0) return
    const r = list[idx]
    if (r.status !== 'redeemed') return
    r.status = 'redeemable'
    r.redeemedAt = null
    persist(list)
    touch()
  }

  /** 统计 */
  const stats = computed(() => {
    void tick.value
    const list = rewards.value
    return {
      total: list.length,
      pending: list.filter(r => r.status === 'pending').length,
      redeemable: list.filter(r => r.status === 'redeemable').length,
      redeemed: list.filter(r => r.status === 'redeemed').length,
    }
  })

  /** 按状态分组（已兑现按时间倒序，其余按创建倒序） */
  const grouped = computed(() => {
    void tick.value
    const list = rewards.value
    const byStatus = (s: SelfReward['status']) =>
      list
        .filter(r => r.status === s)
        .sort((a, b) => {
          const ta = new Date((s === 'redeemed' ? a.redeemedAt : a.createdAt) || a.createdAt).getTime()
          const tb = new Date((s === 'redeemed' ? b.redeemedAt : b.createdAt) || b.createdAt).getTime()
          return tb - ta
        })
    return {
      pending: byStatus('pending'),
      redeemable: byStatus('redeemable'),
      redeemed: byStatus('redeemed'),
    }
  })

  return {
    rewards,
    stats,
    grouped,
    add,
    update,
    remove,
    redeem,
    unredeem,
    evaluate: evaluateSelfRewards,
  }
}
