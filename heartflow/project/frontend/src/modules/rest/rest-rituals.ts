// ============================================================
// 息壤 · 休息仪式 + 植物生长动画
// 增强功能：
//   1. 休息仪式系统（预设+自定义休息仪式流程）
//   2. 植物生长动画（生长阶段可视化+花开特效）
//   3. 休息日历（月视图+休息标注+连续追踪）
//   4. 休息处方（基于疲劳程度推荐休息方案）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { RestPractice, BreakRecord, PlantState } from './types'

// ---- 休息仪式 ----

/** 仪式类型 */
export type RitualCategory = 'morning' | 'afternoon' | 'evening' | 'work-break' | 'weekend'

/** 仪式步骤 */
export interface RitualStep {
  order: number
  action: string
  durationMinutes: number
  description: string
  soundscape?: string
}

/** 休息仪式 */
export interface RestRitual {
  id: string
  name: string
  category: RitualCategory
  description: string
  /** 仪式步骤 */
  steps: RitualStep[]
  /** 总时长（分钟） */
  totalDuration: number
  /** 预期恢复度 */
  expectedRecovery: number
  /** 是否预设 */
  preset: boolean
  /** 执行次数 */
  executionCount: number
  /** 标签 */
  tags: string[]
  /** 创建时间 */
  createdAt: string
}

// ---- 植物生长动画 ----

/** 生长阶段 */
export type GrowthPhase = 'seed' | 'sprout' | 'seedling' | 'budding' | 'blooming' | 'fruiting'

/** 植物动画状态 */
export interface PlantAnimationState {
  plantId: string
  currentPhase: GrowthPhase
  /** 阶段进度 0-100 */
  phaseProgress: number
  /** 动画速度 */
  animationSpeed: 'slow' | 'normal' | 'fast'
  /** 是否正在开花 */
  isBlooming: boolean
  /** 粒子效果 */
  particles: 'none' | 'petals' | 'sparkles' | 'dew'
  /** 上次浇水时间 */
  lastWateredAt?: string
}

// ---- 休息日历 ----

/** 日历日 */
export interface CalendarDay {
  date: string
  /** 是否休息日 */
  isRestDay: boolean
  /** 休息时长（分钟） */
  restDuration: number
  /** 休息次数 */
  restCount: number
  /** 主要休息方式 */
  mainActivity: string
  /** 心情评分 1-5 */
  mood: number
  /** 是否连续休息 */
  isStreakDay: boolean
}

/** 月度休息日历 */
export interface RestCalendar {
  year: number
  month: number
  days: CalendarDay[]
  /** 月度总休息时间 */
  totalRestMinutes: number
  /** 月度休息天数 */
  restDays: number
  /** 当前连续休息天数 */
  streakDays: number
}

// ---- 休息处方 ----

/** 疲劳程度 */
export type FatigueLevel = 'energized' | 'normal' | 'tired' | 'exhausted' | 'burnout'

/** 休息处方 */
export interface RestPrescription {
  /** 疲劳程度 */
  fatigueLevel: FatigueLevel
  /** 推荐仪式 */
  recommendedRituals: string[]
  /** 推荐休憩方式 */
  recommendedPractices: string[]
  /** 建议总休息时长（分钟） */
  suggestedDuration: number
  /** 建议频率 */
  suggestedFrequency: string
  /** 注意事项 */
  cautions: string[]
  /** 生成时间 */
  generatedAt: string
}

// ---- 存储键 ----

const REST_ADVANCED_STORAGE_KEYS = {
  RITUALS: 'hf:rest:rituals',
  CALENDARS: 'hf:rest:calendars',
} as const

// ---- 元数据 ----

export const RITUAL_CATEGORY_META: Record<RitualCategory, { label: string; icon: string; timeRange: string }> = {
  morning: { label: '晨间仪式', icon: '🌅', timeRange: '06:00-10:00' },
  afternoon: { label: '午后仪式', icon: '☀️', timeRange: '12:00-16:00' },
  evening: { label: '晚间仪式', icon: '🌙', timeRange: '18:00-22:00' },
  'work-break': { label: '工作间隙', icon: '⏸️', timeRange: '随时' },
  weekend: { label: '周末仪式', icon: '🌿', timeRange: '全天' },
}

export const GROWTH_PHASE_META: Record<GrowthPhase, { label: string; emoji: string; threshold: number; color: string }> = {
  seed: { label: '种子', emoji: '🌰', threshold: 0, color: '#8B4513' },
  sprout: { label: '发芽', emoji: '🌱', threshold: 20, color: '#90EE90' },
  seedling: { label: '幼苗', emoji: '🌿', threshold: 40, color: '#228B22' },
  budding: { label: '含苞', emoji: '🌷', threshold: 60, color: '#FF69B4' },
  blooming: { label: '盛开', emoji: '🌸', threshold: 80, color: '#FF1493' },
  fruiting: { label: '结果', emoji: '🍎', threshold: 95, color: '#DC143C' },
}

export const FATIGUE_LEVEL_META: Record<FatigueLevel, { label: string; color: string; icon: string; minRestMinutes: number }> = {
  energized: { label: '精力充沛', color: '#34d399', icon: '⚡', minRestMinutes: 5 },
  normal: { label: '正常', color: '#6b9fc4', icon: '😊', minRestMinutes: 15 },
  tired: { label: '疲劳', color: '#f0c040', icon: '😫', minRestMinutes: 30 },
  exhausted: { label: '精疲力竭', color: '#f59e0b', icon: '😵', minRestMinutes: 60 },
  burnout: { label: '燃尽', color: '#ef4444', icon: '🔥', minRestMinutes: 120 },
}

// ---- 预设休息仪式 ----

export const PRESET_RITUALS: RestRitual[] = [
  {
    id: 'ritual-morning',
    name: '晨间唤醒',
    category: 'morning',
    description: '用温柔的方式唤醒身体和心灵',
    steps: [
      { order: 1, action: '深呼吸', durationMinutes: 2, description: '腹式深呼吸5次，感受气息流动', soundscape: 'birds' },
      { order: 2, action: '拉伸', durationMinutes: 5, description: '轻柔的全身拉伸，唤醒肌肉', soundscape: 'birds' },
      { order: 3, action: '冥想', durationMinutes: 3, description: '正念冥想，设定今日意图', soundscape: 'birds' },
    ],
    totalDuration: 10,
    expectedRecovery: 70,
    preset: true,
    executionCount: 0,
    tags: ['晨间', '唤醒', '轻柔'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ritual-afternoon',
    name: '午后充电',
    category: 'afternoon',
    description: '午后小憩，为下午补充能量',
    steps: [
      { order: 1, action: '小憩', durationMinutes: 20, description: '短暂午睡，不超过30分钟', soundscape: 'rain' },
      { order: 2, action: '品茶', durationMinutes: 10, description: '慢慢品一杯茶，让思绪沉淀', soundscape: 'rain' },
    ],
    totalDuration: 30,
    expectedRecovery: 85,
    preset: true,
    executionCount: 0,
    tags: ['午后', '充电', '小憩'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ritual-evening',
    name: '晚间放松',
    category: 'evening',
    description: '结束一天的忙碌，温柔地过渡到睡眠',
    steps: [
      { order: 1, action: '日记', durationMinutes: 10, description: '写下今日三件感恩的事', soundscape: 'night' },
      { order: 2, action: '音乐', durationMinutes: 15, description: '聆听舒缓音乐，放松神经', soundscape: 'night' },
      { order: 3, action: '深呼吸', durationMinutes: 5, description: '4-7-8呼吸法，准备入睡', soundscape: 'night' },
    ],
    totalDuration: 30,
    expectedRecovery: 90,
    preset: true,
    executionCount: 0,
    tags: ['晚间', '放松', '睡眠'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ritual-work-break',
    name: '番茄休息',
    category: 'work-break',
    description: '工作间隙的快速恢复',
    steps: [
      { order: 1, action: '拉伸', durationMinutes: 2, description: '肩颈和手腕的快速拉伸', soundscape: 'silence' },
      { order: 2, action: '深呼吸', durationMinutes: 3, description: '闭眼深呼吸，远离屏幕', soundscape: 'silence' },
    ],
    totalDuration: 5,
    expectedRecovery: 50,
    preset: true,
    executionCount: 0,
    tags: ['工作', '快速', '番茄'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ritual-weekend',
    name: '周末慢生活',
    category: 'weekend',
    description: '给身心一个完整的放松日',
    steps: [
      { order: 1, action: '散步', durationMinutes: 30, description: '在自然中漫步，感受阳光和微风', soundscape: 'nature' },
      { order: 2, action: '园艺', durationMinutes: 20, description: '照料植物，触碰泥土', soundscape: 'nature' },
      { order: 3, action: '闲读', durationMinutes: 30, description: '读一本闲书，不为目的', soundscape: 'silence' },
      { order: 4, action: '音乐', durationMinutes: 20, description: '播放喜欢的音乐，完全放松', soundscape: 'music' },
    ],
    totalDuration: 100,
    expectedRecovery: 100,
    preset: true,
    executionCount: 0,
    tags: ['周末', '慢生活', '自然'],
    createdAt: new Date().toISOString(),
  },
]

// ============================================================
// useRestRituals — 休息仪式管理
// ============================================================

export function useRestRituals() {
  const rituals = ref<RestRitual[]>([...PRESET_RITUALS])

  /** 加载仪式 */
  function loadRituals(): RestRitual[] {
    const stored = storage.getKV<RestRitual[]>(REST_ADVANCED_STORAGE_KEYS.RITUALS, [])
    if (stored && stored.length > 0) {
      rituals.value = stored
    } else {
      rituals.value = [...PRESET_RITUALS]
    }
    return rituals.value
  }

  /** 创建自定义仪式 */
  function createRitual(
    name: string,
    category: RitualCategory,
    description: string,
    steps: RitualStep[],
    tags: string[] = [],
  ): RestRitual {
    const totalDuration = steps.reduce((s, step) => s + step.durationMinutes, 0)
    const ritual: RestRitual = {
      id: `ritual-${Date.now()}`,
      name,
      category,
      description,
      steps,
      totalDuration,
      expectedRecovery: Math.min(totalDuration * 2, 100),
      preset: false,
      executionCount: 0,
      tags,
      createdAt: new Date().toISOString(),
    }

    rituals.value.push(ritual)
    saveRituals()
    return ritual
  }

  /** 执行仪式 */
  function executeRitual(ritualId: string): boolean {
    const ritual = rituals.value.find(r => r.id === ritualId)
    if (!ritual) return false
    ritual.executionCount++
    saveRituals()
    return true
  }

  /** 按分类获取仪式 */
  function getRitualsByCategory(category: RitualCategory): RestRitual[] {
    return rituals.value.filter(r => r.category === category)
  }

  /** 最常用仪式 */
  const popularRituals = computed(() =>
    [...rituals.value].sort((a, b) => b.executionCount - a.executionCount).slice(0, 5)
  )

  /** 保存 */
  function saveRituals(): void {
    storage.setKV(REST_ADVANCED_STORAGE_KEYS.RITUALS, rituals.value)
  }

  return {
    rituals,
    popularRituals,
    loadRituals,
    createRitual,
    executeRitual,
    getRitualsByCategory,
    saveRituals,
  }
}

// ============================================================
// usePlantGrowth — 植物生长动画
// ============================================================

export function usePlantGrowth() {
  const plantStates = ref<Map<string, PlantAnimationState>>(new Map())

  /** 初始化植物状态 */
  function initPlant(plant: PlantState): PlantAnimationState {
    const phase = getPhaseFromHealth(plant.health)
    const state: PlantAnimationState = {
      plantId: plant.id,
      currentPhase: phase,
      phaseProgress: plant.health,
      animationSpeed: 'normal',
      isBlooming: phase === 'blooming',
      particles: phase === 'blooming' ? 'petals' : 'none',
      lastWateredAt: plant.lastWateredAt,
    }

    plantStates.value.set(plant.id, state)
    return state
  }

  /** 根据健康度确定生长阶段 */
  function getPhaseFromHealth(health: number): GrowthPhase {
    if (health >= 95) return 'fruiting'
    if (health >= 80) return 'blooming'
    if (health >= 60) return 'budding'
    if (health >= 40) return 'seedling'
    if (health >= 20) return 'sprout'
    return 'seed'
  }

  /** 浇水（更新植物状态） */
  function waterPlant(plantId: string, health: number): PlantAnimationState | null {
    const state = plantStates.value.get(plantId)
    if (!state) return null

    const newPhase = getPhaseFromHealth(health)
    const wasBlooming = state.isBlooming

    state.currentPhase = newPhase
    state.phaseProgress = health
    state.isBlooming = newPhase === 'blooming'
    state.lastWateredAt = new Date().toISOString()

    if (newPhase === 'blooming' && !wasBlooming) {
      state.particles = 'petals'
    } else if (newPhase === 'fruiting') {
      state.particles = 'sparkles'
    } else if (health < 30) {
      state.particles = 'dew'
    }

    return state
  }

  /** 获取植物生长动画描述 */
  function getGrowthAnimation(plantId: string): string {
    const state = plantStates.value.get(plantId)
    if (!state) return ''

    const phase = GROWTH_PHASE_META[state.currentPhase]
    return `${phase.emoji} ${phase.label}阶段 · 健康度 ${state.phaseProgress}%`
  }

  /** 所有植物概览 */
  const plantOverview = computed(() => {
    return [...plantStates.value.entries()].map(([id, state]) => ({
      plantId: id,
      phase: state.currentPhase,
      health: state.phaseProgress,
      isBlooming: state.isBlooming,
      emoji: GROWTH_PHASE_META[state.currentPhase].emoji,
    }))
  })

  return {
    plantStates,
    plantOverview,
    initPlant,
    waterPlant,
    getGrowthAnimation,
    getPhaseFromHealth,
  }
}

// ============================================================
// useRestCalendar — 休息日历
// ============================================================

export function useRestCalendar() {
  const calendar = ref<RestCalendar | null>(null)

  /** 生成月度休息日历 */
  function generateCalendar(
    year: number,
    month: number,
    records: BreakRecord[],
  ): RestCalendar {
    const daysInMonth = new Date(year, month, 0).getDate()
    const days: CalendarDay[] = []

    let totalRestMinutes = 0
    let restDays = 0
    let streakDays = 0
    let maxStreak = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayRecords = records.filter(r => r.date === dateStr)

      const restDuration = dayRecords.reduce((s, r) => s + r.duration, 0)
      const restCount = dayRecords.length
      const avgMood = dayRecords.length > 0
        ? Math.round(dayRecords.reduce((s, r) => s + r.mood, 0) / dayRecords.length)
        : 0
      const mainActivity = dayRecords.length > 0
        ? dayRecords.reduce((max, r) =>
            dayRecords.filter(x => x.activity === r.activity).length > dayRecords.filter(x => x.activity === max.activity).length ? r : max
          ).activity
        : ''

      if (restCount > 0) {
        restDays++
        streakDays++
        maxStreak = Math.max(maxStreak, streakDays)
      } else {
        streakDays = 0
      }

      totalRestMinutes += restDuration

      days.push({
        date: dateStr,
        isRestDay: restCount > 0,
        restDuration,
        restCount,
        mainActivity,
        mood: avgMood,
        isStreakDay: streakDays >= 3,
      })
    }

    calendar.value = {
      year,
      month,
      days,
      totalRestMinutes,
      restDays,
      streakDays: maxStreak,
    }

    return calendar.value
  }

  return {
    calendar,
    generateCalendar,
  }
}

// ============================================================
// useRestPrescription — 休息处方
// ============================================================

export function useRestPrescription() {
  const prescription = ref<RestPrescription | null>(null)

  /** 基于疲劳程度生成休息处方 */
  function generatePrescription(
    fatigueLevel: FatigueLevel,
    availableRituals: RestRitual[],
    availablePractices: RestPractice[],
  ): RestPrescription {
    const meta = FATIGUE_LEVEL_META[fatigueLevel]

    // 根据疲劳程度筛选仪式
    const recommendedRituals = availableRituals
      .filter(r => r.totalDuration <= meta.minRestMinutes * 2)
      .sort((a, b) => b.expectedRecovery - a.expectedRecovery)
      .slice(0, 3)
      .map(r => r.id)

    // 根据疲劳程度筛选休憩方式
    const recommendedPractices = availablePractices
      .filter(p => p.recovery >= 60)
      .sort((a, b) => b.recovery - a.recovery)
      .slice(0, 5)
      .map(p => p.id)

    // 生成注意事项
    const cautions: string[] = []
    if (fatigueLevel === 'burnout' || fatigueLevel === 'exhausted') {
      cautions.push('建议暂停非必要工作，给自己完整的一天休息')
      cautions.push('如果持续疲劳超过两周，建议寻求专业帮助')
    }
    if (fatigueLevel === 'tired') {
      cautions.push('每小时至少休息5分钟，避免长时间连续工作')
      cautions.push('注意饮食和水分摄入')
    }

    prescription.value = {
      fatigueLevel,
      recommendedRituals,
      recommendedPractices,
      suggestedDuration: meta.minRestMinutes,
      suggestedFrequency: fatigueLevel === 'burnout' ? '每天多次' : fatigueLevel === 'exhausted' ? '每天至少一次' : '按需休息',
      cautions,
      generatedAt: new Date().toISOString(),
    }

    return prescription.value
  }

  /** 评估疲劳程度 */
  function assessFatigue(
    recentRestCount: number,
    avgMood: number,
    sleepHours: number,
    workHours: number,
  ): FatigueLevel {
    if (sleepHours < 5 || (workHours > 60 && avgMood < 2)) return 'burnout'
    if (sleepHours < 6 || workHours > 50) return 'exhausted'
    if (recentRestCount < 3 || avgMood < 3) return 'tired'
    if (avgMood < 4) return 'normal'
    return 'energized'
  }

  return {
    prescription,
    generatePrescription,
    assessFatigue,
  }
}