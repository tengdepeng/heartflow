// ============================================================
// 自律工坊 · 工坊引擎
// 习惯追踪、自律挑战、每日仪式
// ============================================================

import { ref } from 'vue'
import type { Habit, HabitDifficulty, HabitFrequency, DisciplineChallenge, DailyRitual } from './types'
import { HABIT_DIFFICULTY_META, DISCIPLINE_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

function generateId(): string {
  return `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadHabits(): Habit[] {
  try { return JSON.parse(storage.getKV<string>(DISCIPLINE_STORAGE_KEYS.habits, '[]')) } catch { return [] }
}
function saveHabits(data: Habit[]) { storage.setKV(DISCIPLINE_STORAGE_KEYS.habits, JSON.stringify(data)) }

/** 纯读取全部习惯（供统一时间线等非响应式场景聚合，不激活响应式状态）。 */
export function getHabits(): Habit[] {
  return loadHabits()
}

function loadChallenges(): DisciplineChallenge[] {
  try { return JSON.parse(storage.getKV<string>(DISCIPLINE_STORAGE_KEYS.challenges, '[]')) } catch { return [] }
}
function saveChallenges(data: DisciplineChallenge[]) { storage.setKV(DISCIPLINE_STORAGE_KEYS.challenges, JSON.stringify(data)) }

function loadRituals(): DailyRitual[] {
  try { return JSON.parse(storage.getKV<string>(DISCIPLINE_STORAGE_KEYS.rituals, '[]')) } catch { return [] }
}
function saveRituals(data: DailyRitual[]) { storage.setKV(DISCIPLINE_STORAGE_KEYS.rituals, JSON.stringify(data)) }

const habits = ref<Habit[]>(loadHabits())
const challenges = ref<DisciplineChallenge[]>(loadChallenges())
const rituals = ref<DailyRitual[]>(loadRituals())

function todayStr(): string { return new Date().toISOString().split('T')[0] }

export function useDisciplineWorkshop() {
  // ---- 习惯管理 ----
  function addHabit(
    title: string, description: string, icon: string,
    difficulty: HabitDifficulty, frequency: HabitFrequency,
    target: number, customFrequency?: string,
  ): Habit {
    const habit: Habit = {
      id: generateId(), title, description, icon, difficulty, frequency, customFrequency,
      target, streak: 0, bestStreak: 0, totalCompleted: 0,
      enabled: true, createdAt: new Date().toISOString(), completedDates: [],
    }
    habits.value = [...habits.value, habit]
    saveHabits(habits.value)
    return habit
  }

  function completeHabit(id: string): boolean {
    const habit = habits.value.find(h => h.id === id)
    if (!habit || !habit.enabled) return false
    const today = todayStr()
    if (habit.completedDates.includes(today)) return false // 今天已完成
    habit.completedDates = [...habit.completedDates, today]
    habit.totalCompleted++
    habit.streak = calculateStreak(habit.completedDates)
    habit.bestStreak = Math.max(habit.bestStreak, habit.streak)
    habits.value = [...habits.value]
    saveHabits(habits.value)
    return true
  }

  function toggleHabit(id: string): boolean {
    const habit = habits.value.find(h => h.id === id)
    if (!habit) return false
    habit.enabled = !habit.enabled
    habits.value = [...habits.value]
    saveHabits(habits.value)
    return habit.enabled
  }

  function removeHabit(id: string): boolean {
    const idx = habits.value.findIndex(h => h.id === id)
    if (idx === -1) return false
    habits.value = habits.value.filter(h => h.id !== id)
    saveHabits(habits.value)
    return true
  }

  /** 局部更新习惯（用于开关「专注自动打卡」等持久化字段） */
  function updateHabit(id: string, patch: Partial<Habit>): boolean {
    const idx = habits.value.findIndex(h => h.id === id)
    if (idx === -1) return false
    habits.value[idx] = { ...habits.value[idx], ...patch }
    habits.value = [...habits.value]
    saveHabits(habits.value)
    return true
  }

  function getTodayHabits(): Habit[] {
    return habits.value.filter(h => h.enabled)
  }

  function getHabitStats(): { total: number; active: number; todayCompleted: number; totalPoints: number } {
    const today = todayStr()
    const active = habits.value.filter(h => h.enabled)
    return {
      total: habits.value.length,
      active: active.length,
      todayCompleted: active.filter(h => h.completedDates.includes(today)).length,
      totalPoints: habits.value.reduce((s, h) => s + h.totalCompleted * (HABIT_DIFFICULTY_META[h.difficulty]?.basePoints ?? 1), 0),
    }
  }

  // ---- 挑战管理 ----
  function createChallenge(title: string, description: string, duration: number, habits: string[], reward?: string, startDate?: string): DisciplineChallenge {
    const start = startDate ?? todayStr()
    const end = new Date(new Date(start).getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const challenge: DisciplineChallenge = {
      id: generateId(), title, description, duration, habits,
      startDate: start, endDate: end, currentDay: 0, completed: false, reward,
    }
    challenges.value = [...challenges.value, challenge]
    saveChallenges(challenges.value)
    return challenge
  }

  function advanceChallengeDay(id: string): boolean {
    const challenge = challenges.value.find(c => c.id === id)
    if (!challenge || challenge.completed) return false
    challenge.currentDay++
    if (challenge.currentDay >= challenge.duration) {
      challenge.completed = true
    }
    challenges.value = [...challenges.value]
    saveChallenges(challenges.value)
    return true
  }

  function getActiveChallenges(): DisciplineChallenge[] {
    return challenges.value.filter(c => !c.completed)
  }

  // ---- 仪式管理 ----
  function addRitual(title: string, description: string, icon: string, steps: string[], estimatedDuration: number, triggerTime: 'morning' | 'afternoon' | 'evening' | 'anytime'): DailyRitual {
    const ritual: DailyRitual = {
      id: generateId(), title, description, icon, steps, estimatedDuration, triggerTime,
      enabled: true, completionCount: 0,
    }
    rituals.value = [...rituals.value, ritual]
    saveRituals(rituals.value)
    return ritual
  }

  function completeRitual(id: string): boolean {
    const ritual = rituals.value.find(r => r.id === id)
    if (!ritual) return false
    ritual.lastCompleted = new Date().toISOString()
    ritual.completionCount++
    rituals.value = [...rituals.value]
    saveRituals(rituals.value)
    return true
  }

  function getRitualsByTime(triggerTime: string): DailyRitual[] {
    return rituals.value.filter(r => r.enabled && (r.triggerTime === triggerTime || r.triggerTime === 'anytime'))
  }

  return {
    habits, challenges, rituals,
    addHabit, completeHabit, toggleHabit, removeHabit, updateHabit,
    getTodayHabits, getHabitStats,
    createChallenge, advanceChallengeDay, getActiveChallenges,
    addRitual, completeRitual, getRitualsByTime,
  }
}

// ---- 辅助 ----
function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  let streak = 1
  const today = new Date()
  const firstDate = new Date(sorted[0])
  if (Math.abs(today.getTime() - firstDate.getTime()) > 2 * 86400000) return 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++
    else break
  }
  return streak
}