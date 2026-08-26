// ============================================================
// 息壤 · 高级休息管理
// 蓝图要求：休息提醒 + 与专注联动 + 成就系统 + 趋势图
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { BreakRecord, RestPractice, RestActivityType } from './types'

/** 将 Date 转为本地日期字符串 YYYY-MM-DD */
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ---- 休息提醒类型 ----

export type ReminderType = 'pomodoro' | 'scheduled' | 'fatigue' | 'posture'

export interface RestReminder {
  id: string
  type: ReminderType
  /** 提醒标题 */
  title: string
  /** 提醒描述 */
  description: string
  /** 建议活动 */
  suggestedActivity: RestActivityType
  /** 建议时长（分钟） */
  suggestedDuration: number
  /** 触发条件 */
  trigger: {
    /** 连续专注分钟数 */
    focusMinutes?: number
    /** 固定时间 HH:mm */
    scheduledTime?: string
    /** 疲劳阈值 */
    fatigueThreshold?: number
  }
  /** 是否启用 */
  enabled: boolean
  /** 冷却时间（分钟），避免频繁提醒 */
  cooldownMinutes: number
  /** 上次提醒时间 */
  lastTriggeredAt?: string
}

// ---- 成就系统类型 ----

export type RestAchievementId =
  | 'first_break'        // 第一次休息
  | 'rest_streak_3'      // 连续3天休息
  | 'rest_streak_7'      // 连续7天休息
  | 'rest_streak_30'     // 连续30天休息
  | 'variety_3'          // 使用3种不同休息方式
  | 'variety_5'          // 使用5种不同休息方式
  | 'variety_all'        // 使用所有休息方式
  | 'meditation_master'  // 冥想10次
  | 'nap_king'           // 小憩20次
  | 'walk_100km'         // 散步累计100分钟
  | 'early_bird'         // 早上6-8点休息
  | 'night_owl'          // 晚上10点后休息
  | 'perfect_week'       // 一周每天都有休息
  | 'rest_100'           // 累计休息100次
  | 'garden_full'        // 植被全部养成

export interface RestAchievement {
  id: RestAchievementId
  title: string
  description: string
  icon: string
  /** 是否已解锁 */
  unlocked: boolean
  /** 解锁时间 */
  unlockedAt?: string
  /** 进度 (0-1) */
  progress: number
  /** 进度描述 */
  progressLabel: string
}

// ---- 专注联动类型 ----

export interface FocusRestLink {
  /** 专注会话 ID */
  focusSessionId: string
  /** 专注时长（分钟） */
  focusDuration: number
  /** 建议休息时长（分钟） */
  suggestedRestDuration: number
  /** 建议休息活动 */
  suggestedActivity: RestActivityType
  /** 是否已执行休息 */
  restTaken: boolean
  /** 休息记录 ID */
  restRecordId?: string
}

// ---- 趋势图类型 ----

export interface RestTrendPoint {
  date: string
  /** 休息次数 */
  count: number
  /** 总休息时长 */
  totalDuration: number
  /** 平均心情 */
  avgMood: number
  /** 平均恢复度 */
  avgRecovery: number
  /** 活动多样性 */
  diversity: number
}

export interface RestTrendData {
  points: RestTrendPoint[]
  summary: {
    totalBreaks: number
    totalDuration: number
    avgMood: number
    avgRecovery: number
    bestDay: RestTrendPoint | null
    streakDays: number
  }
}

// ---- 默认提醒配置 ----

export const DEFAULT_REMINDERS: RestReminder[] = [
  {
    id: 'reminder_pomodoro',
    type: 'pomodoro',
    title: '番茄钟休息',
    description: '你已经专注一段时间了，休息一下吧',
    suggestedActivity: 'stretch',
    suggestedDuration: 5,
    trigger: { focusMinutes: 25 },
    enabled: true,
    cooldownMinutes: 20,
  },
  {
    id: 'reminder_long_focus',
    type: 'pomodoro',
    title: '长专注休息',
    description: '长时间专注后需要充分休息',
    suggestedActivity: 'walk',
    suggestedDuration: 15,
    trigger: { focusMinutes: 90 },
    enabled: true,
    cooldownMinutes: 60,
  },
  {
    id: 'reminder_lunch',
    type: 'scheduled',
    title: '午间休息',
    description: '午饭后适合小憩或散步',
    suggestedActivity: 'nap',
    suggestedDuration: 20,
    trigger: { scheduledTime: '13:00' },
    enabled: true,
    cooldownMinutes: 120,
  },
  {
    id: 'reminder_afternoon',
    type: 'scheduled',
    title: '下午茶时间',
    description: '下午容易疲劳，喝杯茶放松一下',
    suggestedActivity: 'tea',
    suggestedDuration: 15,
    trigger: { scheduledTime: '15:30' },
    enabled: true,
    cooldownMinutes: 120,
  },
  {
    id: 'reminder_posture',
    type: 'posture',
    title: '姿势提醒',
    description: '坐久了记得站起来活动一下',
    suggestedActivity: 'stretch',
    suggestedDuration: 3,
    trigger: { focusMinutes: 45 },
    enabled: true,
    cooldownMinutes: 45,
  },
]

// ---- 成就定义 ----

const ACHIEVEMENT_DEFS: Omit<RestAchievement, 'unlocked' | 'unlockedAt' | 'progress' | 'progressLabel'>[] = [
  { id: 'first_break', title: '初次休息', description: '完成第一次休息记录', icon: '🌱' },
  { id: 'rest_streak_3', title: '三日坚持', description: '连续3天都有休息', icon: '🌿' },
  { id: 'rest_streak_7', title: '七日养成', description: '连续7天都有休息', icon: '🪴' },
  { id: 'rest_streak_30', title: '月度冠军', description: '连续30天都有休息', icon: '🌳' },
  { id: 'variety_3', title: '多元探索', description: '尝试3种不同休息方式', icon: '🎨' },
  { id: 'variety_5', title: '休息达人', description: '尝试5种不同休息方式', icon: '🎭' },
  { id: 'variety_all', title: '全知全休', description: '尝试所有休息方式', icon: '🌟' },
  { id: 'meditation_master', title: '冥想大师', description: '完成10次冥想', icon: '🧘' },
  { id: 'nap_king', title: '小憩之王', description: '完成20次小憩', icon: '😴' },
  { id: 'walk_100km', title: '漫步者', description: '散步累计100分钟', icon: '🚶' },
  { id: 'early_bird', title: '早起的鸟儿', description: '在早上6-8点完成休息', icon: '🌅' },
  { id: 'night_owl', title: '夜猫子', description: '在晚上10点后完成休息', icon: '🌙' },
  { id: 'perfect_week', title: '完美一周', description: '连续7天每天都有休息', icon: '🏆' },
  { id: 'rest_100', title: '百次休憩', description: '累计完成100次休息', icon: '💯' },
  { id: 'garden_full', title: '满园春色', description: '所有植被都养成', icon: '🌺' },
]

// ---- 存储键 ----

const REMINDERS_KEY = 'hf:rest_reminders'
const ACHIEVEMENTS_KEY = 'hf:rest_achievements'
const FOCUS_LINKS_KEY = 'hf:rest_focus_links'

// ============================================================
// 休息提醒
// ============================================================

export function useRestReminders() {
  const reminders = ref<RestReminder[]>(loadReminders())
  const activeReminders = computed(() => reminders.value.filter(r => r.enabled))

  function loadReminders(): RestReminder[] {
    return storage.getKV<RestReminder[]>(REMINDERS_KEY, DEFAULT_REMINDERS)
  }

  function saveReminders() {
    storage.setKV(REMINDERS_KEY, reminders.value)
  }

  /**
   * 检查是否应该触发提醒
   * @param focusMinutes 当前连续专注分钟数
   * @param currentTime 当前时间 HH:mm
   */
  function checkReminders(focusMinutes: number, currentTime: string): RestReminder[] {
    const now = Date.now()
    const triggered: RestReminder[] = []

    for (const reminder of reminders.value) {
      if (!reminder.enabled) continue

      // 冷却检查
      if (reminder.lastTriggeredAt) {
        const cooldownMs = reminder.cooldownMinutes * 60000
        if (now - new Date(reminder.lastTriggeredAt).getTime() < cooldownMs) continue
      }

      let shouldTrigger = false

      switch (reminder.type) {
        case 'pomodoro':
        case 'posture':
          if (reminder.trigger.focusMinutes && focusMinutes >= reminder.trigger.focusMinutes) {
            // 只在恰好达到阈值时触发（避免持续触发）
            const diff = focusMinutes - reminder.trigger.focusMinutes
            if (diff < 5) shouldTrigger = true
          }
          break
        case 'scheduled':
          if (reminder.trigger.scheduledTime === currentTime) {
            shouldTrigger = true
          }
          break
        case 'fatigue':
          // 疲劳检测由外部调用（基于健康数据）
          if (reminder.trigger.fatigueThreshold !== undefined) {
            shouldTrigger = true
          }
          break
      }

      if (shouldTrigger) {
        reminder.lastTriggeredAt = new Date().toISOString()
        triggered.push(reminder)
      }
    }

    if (triggered.length > 0) saveReminders()
    return triggered
  }

  /** 切换提醒开关 */
  function toggleReminder(id: string): void {
    const r = reminders.value.find(r => r.id === id)
    if (r) {
      r.enabled = !r.enabled
      saveReminders()
    }
  }

  /** 更新提醒配置 */
  function updateReminder(id: string, updates: Partial<RestReminder>): void {
    const idx = reminders.value.findIndex(r => r.id === id)
    if (idx >= 0) {
      reminders.value[idx] = { ...reminders.value[idx], ...updates }
      saveReminders()
    }
  }

  /** 重置提醒冷却 */
  function resetCooldown(id: string): void {
    const r = reminders.value.find(r => r.id === id)
    if (r) {
      r.lastTriggeredAt = undefined
      saveReminders()
    }
  }

  return {
    reminders,
    activeReminders,
    checkReminders,
    toggleReminder,
    updateReminder,
    resetCooldown,
  }
}

// ============================================================
// 成就系统
// ============================================================

export function useRestAchievements(getRecords: () => BreakRecord[], getPractices: () => RestPractice[]) {
  const achievements = ref<RestAchievement[]>(loadAchievements())

  function loadAchievements(): RestAchievement[] {
    const saved = storage.getKV<RestAchievement[]>(ACHIEVEMENTS_KEY, [])
    if (saved.length === 0) {
      return ACHIEVEMENT_DEFS.map(def => ({
        ...def,
        unlocked: false,
        progress: 0,
        progressLabel: '0%',
      }))
    }
    return saved
  }

  function saveAchievements() {
    storage.setKV(ACHIEVEMENTS_KEY, achievements.value)
  }

  /** 检查并更新所有成就 */
  function checkAchievements(): RestAchievement[] {
    const records = getRecords()
    const practices = getPractices()
    const now = Date.now()
    const unlocked: RestAchievement[] = []

    const update = (id: RestAchievementId, isUnlocked: boolean, progress: number, progressLabel: string) => {
      const a = achievements.value.find(a => a.id === id)
      if (!a) return
      a.progress = progress
      a.progressLabel = progressLabel
      if (isUnlocked && !a.unlocked) {
        a.unlocked = true
        a.unlockedAt = new Date().toISOString()
        unlocked.push(a)
      }
    }

    // 1. 初次休息
    update('first_break', records.length >= 1, records.length >= 1 ? 1 : 0, `${records.length}/1`)

    // 2. 连续天数
    const streakDays = computeStreakDays(records, now)
    update('rest_streak_3', streakDays >= 3, Math.min(1, streakDays / 3), `${Math.min(streakDays, 3)}/3天`)
    update('rest_streak_7', streakDays >= 7, Math.min(1, streakDays / 7), `${Math.min(streakDays, 7)}/7天`)
    update('rest_streak_30', streakDays >= 30, Math.min(1, streakDays / 30), `${Math.min(streakDays, 30)}/30天`)

    // 3. 多样性
    const usedActivities = new Set(records.map(r => r.activity))
    const totalActivities = practices.length
    update('variety_3', usedActivities.size >= 3, Math.min(1, usedActivities.size / 3), `${Math.min(usedActivities.size, 3)}/3种`)
    update('variety_5', usedActivities.size >= 5, Math.min(1, usedActivities.size / 5), `${Math.min(usedActivities.size, 5)}/5种`)
    update('variety_all', usedActivities.size >= totalActivities, Math.min(1, usedActivities.size / totalActivities), `${usedActivities.size}/${totalActivities}种`)

    // 4. 专项成就
    const meditationCount = records.filter(r => r.activity === '冥想').length
    update('meditation_master', meditationCount >= 10, Math.min(1, meditationCount / 10), `${Math.min(meditationCount, 10)}/10次`)

    const napCount = records.filter(r => r.activity === '小憩').length
    update('nap_king', napCount >= 20, Math.min(1, napCount / 20), `${Math.min(napCount, 20)}/20次`)

    const walkDuration = records.filter(r => r.activity === '散步').reduce((s, r) => s + r.duration, 0)
    update('walk_100km', walkDuration >= 100, Math.min(1, walkDuration / 100), `${Math.min(walkDuration, 100)}/100分钟`)

    // 5. 时段成就
    const earlyBird = records.some(r => {
      const h = new Date(r.date).getHours()
      return h >= 6 && h < 8
    })
    update('early_bird', earlyBird, earlyBird ? 1 : 0, earlyBird ? '已完成' : '未完成')

    const nightOwl = records.some(r => {
      const h = new Date(r.date).getHours()
      return h >= 22 || h < 2
    })
    update('night_owl', nightOwl, nightOwl ? 1 : 0, nightOwl ? '已完成' : '未完成')

    // 6. 完美一周
    const perfectWeek = checkPerfectWeek(records, now)
    update('perfect_week', perfectWeek, perfectWeek ? 1 : 0, perfectWeek ? '已完成' : '未完成')

    // 7. 百次休憩
    update('rest_100', records.length >= 100, Math.min(1, records.length / 100), `${Math.min(records.length, 100)}/100次`)

    // 8. 满园春色（基于植被养成状态，此处简化检查）
    update('garden_full', false, 0, '待实现')

    saveAchievements()
    return unlocked
  }

  /** 计算连续休息天数 */
  function computeStreakDays(records: BreakRecord[], now: number): number {
    const days = new Set<string>()
    for (const r of records) {
      days.add(r.date.slice(0, 10))
    }

    const sorted = [...days].sort().reverse()
    if (sorted.length === 0) return 0

    let streak = 0
    const today = new Date(now)

    // 检查今天或昨天
    const todayStr = toLocalDateStr(today)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = toLocalDateStr(yesterday)

    if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0

    // 解析 sorted[0] 为本地日期
    const [sy, sm, sd] = sorted[0].split('-').map(Number)
    const checkDate = new Date(sy, sm - 1, sd)
    for (const day of sorted) {
      const expected = toLocalDateStr(checkDate)
      if (day === expected) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  /** 检查完美一周 */
  function checkPerfectWeek(records: BreakRecord[], now: number): boolean {
    const days = new Set<string>()
    for (const r of records) {
      days.add(r.date.slice(0, 10))
    }

    const today = new Date(now)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      if (!days.has(toLocalDateStr(d))) return false
    }
    return true
  }

  /** 重置所有成就 */
  function resetAchievements(): void {
    achievements.value = ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      unlocked: false,
      progress: 0,
      progressLabel: '0%',
    }))
    saveAchievements()
  }

  const unlockedCount = computed(() => achievements.value.filter(a => a.unlocked).length)
  const totalCount = computed(() => achievements.value.length)

  return {
    achievements,
    unlockedCount,
    totalCount,
    checkAchievements,
    resetAchievements,
  }
}

// ============================================================
// 专注联动
// ============================================================

export function useFocusRestLink() {
  const links = ref<FocusRestLink[]>(loadLinks())

  function loadLinks(): FocusRestLink[] {
    return storage.getKV<FocusRestLink[]>(FOCUS_LINKS_KEY, [])
  }

  function saveLinks() {
    storage.setKV(FOCUS_LINKS_KEY, links.value)
  }

  /**
   * 根据专注时长建议休息
   * 25分钟专注 → 5分钟休息
   * 50分钟专注 → 10分钟休息
   * 90分钟专注 → 15-20分钟休息
   */
  function suggestRest(focusDuration: number): { duration: number; activity: RestActivityType } {
    if (focusDuration <= 25) {
      return { duration: 5, activity: 'stretch' }
    } else if (focusDuration <= 50) {
      return { duration: 10, activity: 'breathing' }
    } else if (focusDuration <= 90) {
      return { duration: 15, activity: 'walk' }
    } else {
      return { duration: 20, activity: 'nap' }
    }
  }

  /** 创建专注-休息关联 */
  function createLink(focusSessionId: string, focusDuration: number): FocusRestLink {
    const suggestion = suggestRest(focusDuration)
    const link: FocusRestLink = {
      focusSessionId,
      focusDuration,
      suggestedRestDuration: suggestion.duration,
      suggestedActivity: suggestion.activity,
      restTaken: false,
    }
    links.value.push(link)
    saveLinks()
    return link
  }

  /** 标记休息已执行 */
  function markRestTaken(focusSessionId: string, restRecordId: string): boolean {
    const link = links.value.find(l => l.focusSessionId === focusSessionId && !l.restTaken)
    if (!link) return false
    link.restTaken = true
    link.restRecordId = restRecordId
    saveLinks()
    return true
  }

  /** 获取未休息的关联 */
  const pendingRest = computed(() =>
    links.value.filter(l => !l.restTaken).sort((a, b) => b.focusDuration - a.focusDuration),
  )

  /** 获取休息执行率 */
  const restRate = computed(() => {
    if (links.value.length === 0) return 0
    const taken = links.value.filter(l => l.restTaken).length
    return Math.round((taken / links.value.length) * 100)
  })

  return {
    links,
    pendingRest,
    restRate,
    suggestRest,
    createLink,
    markRestTaken,
  }
}

// ============================================================
// 趋势图数据
// ============================================================

export function useRestTrend(getRecords: () => BreakRecord[], getPractices: () => RestPractice[]) {
  const trendData = ref<RestTrendData | null>(null)

  /**
   * 计算休息趋势数据
   */
  function computeTrend(days: number = 30): RestTrendData {
    const records = getRecords()
    const practices = getPractices()
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    const filtered = records.filter(r => {
      const d = new Date(r.date)
      return d >= startDate
    })

    const dayMap = new Map<string, BreakRecord[]>()
    for (const r of filtered) {
      const dayKey = r.date.slice(0, 10)
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
      dayMap.get(dayKey)!.push(r)
    }

    const points: RestTrendPoint[] = []
    let totalBreaks = 0
    let totalDuration = 0
    let totalMood = 0
    let totalRecovery = 0
    let moodCount = 0
    let recoveryCount = 0
    let bestDay: RestTrendPoint | null = null
    let bestDayScore = -1

    // 生成所有日期
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const dateStr = toLocalDateStr(d)
      const dayRecords = dayMap.get(dateStr) || []

      const count = dayRecords.length
      const dayDuration = dayRecords.reduce((s, r) => s + r.duration, 0)
      const avgMood = dayRecords.length > 0
        ? dayRecords.reduce((s, r) => s + r.mood, 0) / dayRecords.length
        : 0

      // 计算恢复度（基于活动类型）
      let totalRecoveryForDay = 0
      for (const r of dayRecords) {
        const practice = practices.find(p => p.name === r.activity)
        if (practice) {
          totalRecoveryForDay += practice.recovery
        }
      }
      const avgRecovery = dayRecords.length > 0
        ? totalRecoveryForDay / dayRecords.length
        : 0

      // 多样性
      const uniqueActivities = new Set(dayRecords.map(r => r.activity)).size
      const diversity = practices.length > 0
        ? uniqueActivities / practices.length
        : 0

      const point: RestTrendPoint = {
        date: dateStr,
        count,
        totalDuration: dayDuration,
        avgMood: Math.round(avgMood * 10) / 10,
        avgRecovery: Math.round(avgRecovery * 10) / 10,
        diversity: Math.round(diversity * 100) / 100,
      }

      points.push(point)
      totalBreaks += count
      totalDuration += dayDuration

      if (dayRecords.length > 0) {
        totalMood += dayRecords.reduce((s, r) => s + r.mood, 0)
        moodCount += dayRecords.length
        totalRecovery += totalRecoveryForDay
        recoveryCount += dayRecords.length
      }

      const dayScore = count * 0.3 + avgMood * 0.3 + avgRecovery * 0.2 + diversity * 0.2
      if (dayScore > bestDayScore) {
        bestDayScore = dayScore
        bestDay = point
      }
    }

    // 计算连续天数
    let streakDays = 0
    const reversed = [...points].reverse()
    for (const p of reversed) {
      if (p.count > 0) streakDays++
      else break
    }

    const result: RestTrendData = {
      points,
      summary: {
        totalBreaks,
        totalDuration,
        avgMood: moodCount > 0 ? Math.round((totalMood / moodCount) * 10) / 10 : 0,
        avgRecovery: recoveryCount > 0 ? Math.round((totalRecovery / recoveryCount) * 10) / 10 : 0,
        bestDay,
        streakDays,
      },
    }

    trendData.value = result
    return result
  }

  return {
    trendData,
    computeTrend,
  }
}

// ---- 存储键 ----

export const REST_ADVANCED_STORAGE_KEYS = {
  REMINDERS: 'hf:rest_reminders',
  ACHIEVEMENTS: 'hf:rest_achievements',
  FOCUS_LINKS: 'hf:rest_focus_links',
  TREND_CACHE: 'hf:rest_trend_cache',
} as const