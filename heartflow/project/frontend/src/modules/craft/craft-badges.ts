// ============================================================
// 匠庐 · 预设成就徽章系统（P16-3）
// 徽章定义、初始化、解锁逻辑、徽章统计
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { CraftWork, WorkType } from './types'

// ---- 徽章类型 ----

/** 徽章稀有度 */
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

/** 徽章类别 */
export type BadgeCategory =
  | 'milestone'   // 里程碑
  | 'streak'      // 连续坚持
  | 'skill'       // 技能精通
  | 'evolution'   // 进化成长
  | 'special'     // 特殊成就

/** 徽章定义 */
export interface BadgeDef {
  id: string
  name: string
  description: string
  category: BadgeCategory
  rarity: BadgeRarity
  icon: string
  /** 解锁条件描述 */
  condition: string
  /** 解锁条件检查函数 */
  check: (works: CraftWork[], unlockedAt?: string) => boolean
  /** 解锁奖励描述 */
  reward?: string
}

/** 已解锁徽章 */
export interface UnlockedBadge {
  badgeId: string
  unlockedAt: string
  /** 解锁时的作品快照 */
  snapshot: {
    totalWorks: number
    totalEvolution: number
  }
}

/** 徽章统计 */
export interface BadgeStats {
  totalBadges: number
  unlocked: number
  byRarity: Record<BadgeRarity, { total: number; unlocked: number }>
  byCategory: Record<BadgeCategory, { total: number; unlocked: number }>
  completionPercent: number
  recentlyUnlocked: UnlockedBadge[]
}

// ---- 存储 ----

const BADGES_STORAGE_KEY = 'hf:craft:badges'

function loadUnlockedBadges(): UnlockedBadge[] {
  try {
    const raw = storage.getKV<string>(BADGES_STORAGE_KEY, '[]')
    return JSON.parse(raw)
  } catch { return [] }
}

function saveUnlockedBadges(badges: UnlockedBadge[]) {
  storage.setKV(BADGES_STORAGE_KEY, JSON.stringify(badges))
}

// ---- 预设徽章定义 ----

export const PRESET_BADGES: BadgeDef[] = [
  // ========================
  // 里程碑 (milestone)
  // ========================
  {
    id: 'first_work',
    name: '初露锋芒',
    description: '创建第一个作品',
    category: 'milestone',
    rarity: 'common',
    icon: '🌱',
    condition: '创建第一个作品',
    check: (works) => works.length >= 1,
    reward: '解锁"作品"面板',
  },
  {
    id: 'ten_works',
    name: '十件匠心',
    description: '累计创建 10 个作品',
    category: 'milestone',
    rarity: 'common',
    icon: '📦',
    condition: '创建 10 个作品',
    check: (works) => works.length >= 10,
  },
  {
    id: 'fifty_works',
    name: '五十匠作',
    description: '累计创建 50 个作品',
    category: 'milestone',
    rarity: 'rare',
    icon: '🏗️',
    condition: '创建 50 个作品',
    check: (works) => works.length >= 50,
  },
  {
    id: 'hundred_works',
    name: '百炼成钢',
    description: '累计创建 100 个作品',
    category: 'milestone',
    rarity: 'epic',
    icon: '🏛️',
    condition: '创建 100 个作品',
    check: (works) => works.length >= 100,
  },
  {
    id: 'first_complete',
    name: '大功告成',
    description: '完成第一个作品',
    category: 'milestone',
    rarity: 'common',
    icon: '✅',
    condition: '完成第一个作品',
    check: (works) => works.filter(w => w.status === 'completed').length >= 1,
    reward: '作品进化值 +10',
  },
  {
    id: 'ten_completed',
    name: '十全十美',
    description: '完成 10 个作品',
    category: 'milestone',
    rarity: 'rare',
    icon: '🎯',
    condition: '完成 10 个作品',
    check: (works) => works.filter(w => w.status === 'completed').length >= 10,
  },
  {
    id: 'first_archive',
    name: '尘封之章',
    description: '归档第一个作品',
    category: 'milestone',
    rarity: 'common',
    icon: '📚',
    condition: '归档第一个作品',
    check: (works) => works.filter(w => w.status === 'archived').length >= 1,
  },

  // ========================
  // 连续坚持 (streak)
  // ========================
  {
    id: 'three_day_streak',
    name: '三日之约',
    description: '连续 3 天有创作活动',
    category: 'streak',
    rarity: 'common',
    icon: '🔥',
    condition: '连续 3 天创作',
    check: (works) => computeStreak(works) >= 3,
  },
  {
    id: 'seven_day_streak',
    name: '七日轮回',
    description: '连续 7 天有创作活动',
    category: 'streak',
    rarity: 'rare',
    icon: '🌟',
    condition: '连续 7 天创作',
    check: (works) => computeStreak(works) >= 7,
  },
  {
    id: 'fourteen_day_streak',
    name: '双周坚持',
    description: '连续 14 天有创作活动',
    category: 'streak',
    rarity: 'epic',
    icon: '⚡',
    condition: '连续 14 天创作',
    check: (works) => computeStreak(works) >= 14,
  },
  {
    id: 'thirty_day_streak',
    name: '三十日修行',
    description: '连续 30 天有创作活动',
    category: 'streak',
    rarity: 'legendary',
    icon: '👑',
    condition: '连续 30 天创作',
    check: (works) => computeStreak(works) >= 30,
  },
  {
    id: 'weekend_warrior',
    name: '周末战士',
    description: '连续 4 个周末都有创作',
    category: 'streak',
    rarity: 'rare',
    icon: '⚔️',
    condition: '连续 4 个周末创作',
    check: (works) => computeWeekendStreak(works) >= 4,
  },

  // ========================
  // 技能精通 (skill)
  // ========================
  {
    id: 'master_writing',
    name: '文思泉涌',
    description: '创建 20 个写作类作品',
    category: 'skill',
    rarity: 'rare',
    icon: '✍️',
    condition: '创建 20 个写作作品',
    check: (works) => works.filter(w => w.type === 'writing').length >= 20,
  },
  {
    id: 'master_code',
    name: '代码诗人',
    description: '创建 20 个代码类作品',
    category: 'skill',
    rarity: 'rare',
    icon: '💻',
    condition: '创建 20 个代码作品',
    check: (works) => works.filter(w => w.type === 'code').length >= 20,
  },
  {
    id: 'master_design',
    name: '设计大师',
    description: '创建 20 个设计类作品',
    category: 'skill',
    rarity: 'rare',
    icon: '🎨',
    condition: '创建 20 个设计作品',
    check: (works) => works.filter(w => w.type === 'design').length >= 20,
  },
  {
    id: 'master_plan',
    name: '运筹帷幄',
    description: '创建 20 个规划类作品',
    category: 'skill',
    rarity: 'rare',
    icon: '🗺️',
    condition: '创建 20 个规划作品',
    check: (works) => works.filter(w => w.type === 'plan').length >= 20,
  },
  {
    id: 'master_insight',
    name: '洞见之光',
    description: '创建 20 个洞见类作品',
    category: 'skill',
    rarity: 'rare',
    icon: '💡',
    condition: '创建 20 个洞见作品',
    check: (works) => works.filter(w => w.type === 'insight').length >= 20,
  },
  {
    id: 'renaissance',
    name: '文艺复兴',
    description: '5 种作品类型各至少 5 个',
    category: 'skill',
    rarity: 'epic',
    icon: '🎭',
    condition: '每种类型至少 5 个作品',
    check: (works) => {
      const types: WorkType[] = ['writing', 'code', 'design', 'plan', 'insight']
      return types.every(t => works.filter(w => w.type === t).length >= 5)
    },
  },
  {
    id: 'polymath',
    name: '博学多才',
    description: '5 种作品类型各至少 10 个',
    category: 'skill',
    rarity: 'legendary',
    icon: '🧠',
    condition: '每种类型至少 10 个作品',
    check: (works) => {
      const types: WorkType[] = ['writing', 'code', 'design', 'plan', 'insight']
      return types.every(t => works.filter(w => w.type === t).length >= 10)
    },
  },

  // ========================
  // 进化成长 (evolution)
  // ========================
  {
    id: 'evo_100',
    name: '进化之初',
    description: '累计进化值达到 100',
    category: 'evolution',
    rarity: 'common',
    icon: '🦋',
    condition: '进化值达到 100',
    check: (works) => works.reduce((s, w) => s + w.evolution, 0) >= 100,
  },
  {
    id: 'evo_500',
    name: '跨越式成长',
    description: '累计进化值达到 500',
    category: 'evolution',
    rarity: 'rare',
    icon: '📈',
    condition: '进化值达到 500',
    check: (works) => works.reduce((s, w) => s + w.evolution, 0) >= 500,
  },
  {
    id: 'evo_1000',
    name: '质变时刻',
    description: '累计进化值达到 1000',
    category: 'evolution',
    rarity: 'epic',
    icon: '💎',
    condition: '进化值达到 1000',
    check: (works) => works.reduce((s, w) => s + w.evolution, 0) >= 1000,
  },
  {
    id: 'evo_5000',
    name: '超凡入圣',
    description: '累计进化值达到 5000',
    category: 'evolution',
    rarity: 'legendary',
    icon: '🏆',
    condition: '进化值达到 5000',
    check: (works) => works.reduce((s, w) => s + w.evolution, 0) >= 5000,
  },
  {
    id: 'single_evo_100',
    name: '匠心之作',
    description: '单个作品进化值达到 100',
    category: 'evolution',
    rarity: 'epic',
    icon: '✨',
    condition: '单个作品进化值 100',
    check: (works) => works.some(w => w.evolution >= 100),
  },
  {
    id: 'rapid_evo',
    name: '突飞猛进',
    description: '单日进化值增长超过 50',
    category: 'evolution',
    rarity: 'rare',
    icon: '🚀',
    condition: '单日进化值 +50',
    check: (works) => {
      // 按日期分组计算进化值增长
      const daily = new Map<string, number>()
      for (const w of works) {
        const date = w.createdAt.split('T')[0]
        daily.set(date, (daily.get(date) || 0) + w.evolution)
      }
      return [...daily.values()].some(v => v >= 50)
    },
  },

  // ========================
  // 特殊成就 (special)
  // ========================
  {
    id: 'night_owl',
    name: '暗夜匠人',
    description: '在深夜（22:00-06:00）创建 5 个作品',
    category: 'special',
    rarity: 'rare',
    icon: '🦉',
    condition: '深夜创作 5 次',
    check: (works) => {
      const nightCount = works.filter(w => {
        const hour = new Date(w.createdAt).getHours()
        return hour >= 22 || hour < 6
      }).length
      return nightCount >= 5
    },
  },
  {
    id: 'early_bird',
    name: '晨光创作者',
    description: '在清晨（06:00-09:00）创建 5 个作品',
    category: 'special',
    rarity: 'rare',
    icon: '🌅',
    condition: '清晨创作 5 次',
    check: (works) => {
      const morningCount = works.filter(w => {
        const hour = new Date(w.createdAt).getHours()
        return hour >= 6 && hour < 9
      }).length
      return morningCount >= 5
    },
  },
  {
    id: 'tag_master',
    name: '标签大师',
    description: '使用超过 10 个不同标签',
    category: 'special',
    rarity: 'rare',
    icon: '🏷️',
    condition: '使用 10 个不同标签',
    check: (works) => {
      const tags = new Set<string>()
      works.forEach(w => w.tags.forEach(t => tags.add(t)))
      return tags.size >= 10
    },
  },
  {
    id: 'tag_collector',
    name: '标签收藏家',
    description: '使用超过 30 个不同标签',
    category: 'special',
    rarity: 'epic',
    icon: '🗂️',
    condition: '使用 30 个不同标签',
    check: (works) => {
      const tags = new Set<string>()
      works.forEach(w => w.tags.forEach(t => tags.add(t)))
      return tags.size >= 30
    },
  },
  {
    id: 'versatile',
    name: '多面手',
    description: '一天内创建了 3 种不同类型的作品',
    category: 'special',
    rarity: 'epic',
    icon: '🎪',
    condition: '一天内创建 3 种类型作品',
    check: (works) => {
      const daily = new Map<string, Set<WorkType>>()
      for (const w of works) {
        const date = w.createdAt.split('T')[0]
        if (!daily.has(date)) daily.set(date, new Set())
        daily.get(date)!.add(w.type)
      }
      return [...daily.values()].some(types => types.size >= 3)
    },
  },
  {
    id: 'perfectionist',
    name: '完美主义者',
    description: '完成率超过 80%（至少 10 个作品）',
    category: 'special',
    rarity: 'epic',
    icon: '💯',
    condition: '完成率 80%+',
    check: (works) => {
      if (works.length < 10) return false
      const completed = works.filter(w => w.status === 'completed').length
      return completed / works.length >= 0.8
    },
  },
  {
    id: 'speed_crafter',
    name: '速成大师',
    description: '在 1 小时内完成一个作品',
    category: 'special',
    rarity: 'rare',
    icon: '⏱️',
    condition: '1 小时内完成作品',
    check: (works) => {
      return works.some(w => {
        if (w.status !== 'completed') return false
        const created = new Date(w.createdAt).getTime()
        const updated = new Date(w.updatedAt).getTime()
        const diffMinutes = (updated - created) / 60000
        return diffMinutes > 0 && diffMinutes <= 60
      })
    },
  },
  {
    id: 'slow_crafter',
    name: '精雕细琢',
    description: '一个作品打磨超过 30 天',
    category: 'special',
    rarity: 'rare',
    icon: '🗿',
    condition: '打磨 30 天+',
    check: (works) => {
      return works.some(w => {
        const created = new Date(w.createdAt).getTime()
        const updated = new Date(w.updatedAt).getTime()
        const diffDays = (updated - created) / (1000 * 60 * 60 * 24)
        return diffDays >= 30
      })
    },
  },
  {
    id: 'collector',
    name: '集大成者',
    description: '集齐所有徽章（不含此项）',
    category: 'special',
    rarity: 'legendary',
    icon: '🌟',
    condition: '集齐所有徽章',
    check: (_works, _unlockedAt) => {
      // 此徽章在外部检查
      // 检查除自身外的所有徽章是否都已解锁
      return false // 由外部逻辑单独处理
    },
  },
]

// ============================================================
// 辅助函数
// ============================================================

/** 计算连续创作天数 */
function computeStreak(works: CraftWork[]): number {
  if (works.length === 0) return 0

  const dates = new Set<string>()
  for (const w of works) {
    dates.add(w.createdAt.split('T')[0])
  }

  let streak = 0
  const now = new Date()
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(now.getTime() - i * 86400000)
    const dateStr = checkDate.toISOString().split('T')[0]
    if (dates.has(dateStr)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** 计算连续周末创作 */
function computeWeekendStreak(works: CraftWork[]): number {
  const weekendDates = new Set<string>()

  // 收集有作品的所有周末
  for (const w of works) {
    const date = new Date(w.createdAt)
    const day = date.getDay() // 0=周日, 6=周六
    if (day === 0 || day === 6) {
      weekendDates.add(w.createdAt.split('T')[0])
    }
  }

  // 检查连续周末
  let streak = 0
  const now = new Date()
  // 找到最近的周末
  while (now.getDay() !== 0 && now.getDay() !== 6) {
    now.setDate(now.getDate() - 1)
  }

  for (let i = 0; i < 52; i++) {
    const checkDate = new Date(now.getTime() - i * 7 * 86400000)
    const dateStr = checkDate.toISOString().split('T')[0]
    if (weekendDates.has(dateStr)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ============================================================
// useCraftBadges
// ============================================================

export function useCraftBadges() {
  const unlockedBadges = ref<UnlockedBadge[]>(loadUnlockedBadges())

  /** 检查并解锁新徽章 */
  function checkAndUnlock(works: CraftWork[]): UnlockedBadge[] {
    const newlyUnlocked: UnlockedBadge[] = []
    const unlockedIds = new Set(unlockedBadges.value.map(b => b.badgeId))

    // 特殊处理 collector 徽章
    const allOthers = PRESET_BADGES.filter(b => b.id !== 'collector')
    const allOthersUnlocked = allOthers.every(b => unlockedIds.has(b.id))

    for (const badge of PRESET_BADGES) {
      if (unlockedIds.has(badge.id)) continue

      // collector 特殊逻辑
      if (badge.id === 'collector') {
        if (!allOthersUnlocked) continue
      }

      if (badge.check(works)) {
        const unlocked: UnlockedBadge = {
          badgeId: badge.id,
          unlockedAt: new Date().toISOString(),
          snapshot: {
            totalWorks: works.length,
            totalEvolution: works.reduce((s, w) => s + w.evolution, 0),
          },
        }
        newlyUnlocked.push(unlocked)
        unlockedBadges.value.push(unlocked)
      }
    }

    if (newlyUnlocked.length > 0) {
      saveUnlockedBadges(unlockedBadges.value)
    }

    return newlyUnlocked
  }

  /** 获取徽章定义 */
  function getBadgeDef(badgeId: string): BadgeDef | undefined {
    return PRESET_BADGES.find(b => b.id === badgeId)
  }

  /** 检查徽章是否已解锁 */
  function isBadgeUnlocked(badgeId: string): boolean {
    return unlockedBadges.value.some(b => b.badgeId === badgeId)
  }

  /** 获取徽章解锁时间 */
  function getBadgeUnlockedAt(badgeId: string): string | undefined {
    return unlockedBadges.value.find(b => b.badgeId === badgeId)?.unlockedAt
  }

  /** 获取未解锁的徽章 */
  const lockedBadges = computed(() => {
    const unlockedIds = new Set(unlockedBadges.value.map(b => b.badgeId))
    return PRESET_BADGES.filter(b => !unlockedIds.has(b.id))
  })

  /** 获取已解锁徽章详情 */
  const unlockedBadgeDetails = computed(() => {
    return unlockedBadges.value.map(ub => {
      const def = PRESET_BADGES.find(b => b.id === ub.badgeId)
      return { ...ub, definition: def }
    }).filter(b => b.definition)
  })

  /** 获取徽章统计 */
  const badgeStats = computed<BadgeStats>(() => {
    const total = PRESET_BADGES.length
    const unlocked = unlockedBadges.value.length
    const unlockedIds = new Set(unlockedBadges.value.map(b => b.badgeId))

    const byRarity: Record<BadgeRarity, { total: number; unlocked: number }> = {
      common: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    }

    const byCategory: Record<BadgeCategory, { total: number; unlocked: number }> = {
      milestone: { total: 0, unlocked: 0 },
      streak: { total: 0, unlocked: 0 },
      skill: { total: 0, unlocked: 0 },
      evolution: { total: 0, unlocked: 0 },
      special: { total: 0, unlocked: 0 },
    }

    for (const badge of PRESET_BADGES) {
      byRarity[badge.rarity].total++
      byCategory[badge.category].total++
      if (unlockedIds.has(badge.id)) {
        byRarity[badge.rarity].unlocked++
        byCategory[badge.category].unlocked++
      }
    }

    return {
      totalBadges: total,
      unlocked,
      byRarity,
      byCategory,
      completionPercent: Math.round((unlocked / total) * 100),
      recentlyUnlocked: [...unlockedBadges.value]
        .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
        .slice(0, 5),
    }
  })

  /** 获取下一个可能解锁的徽章 */
  const nextBadges = computed(() => {
    return lockedBadges.value.slice(0, 3).map(badge => {
      // 计算进度
      return {
        badge,
        progress: 0, // 由外部根据具体条件计算
      }
    })
  })

  /** 获取稀有度标签 */
  function getRarityLabel(rarity: BadgeRarity): string {
    const labels: Record<BadgeRarity, string> = {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    }
    return labels[rarity]
  }

  /** 获取稀有度颜色 */
  function getRarityColor(rarity: BadgeRarity): string {
    const colors: Record<BadgeRarity, string> = {
      common: '#9ca3af',
      rare: '#6b9fc4',
      epic: '#a07c8c',
      legendary: '#e0a96d',
    }
    return colors[rarity]
  }

  return {
    unlockedBadges,
    lockedBadges,
    unlockedBadgeDetails,
    badgeStats,
    nextBadges,
    checkAndUnlock,
    getBadgeDef,
    isBadgeUnlocked,
    getBadgeUnlockedAt,
    getRarityLabel,
    getRarityColor,
  }
}