// ============================================================
// 息壤 · 休息质量分析 + 植被养成
// 休息统计 + 质量评估 + 植物生长 + 动态建议
// ============================================================

import { storage } from '@/engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type {
  RestPractice, BreakRecord, PlantState,
  RestQualityAnalysis, RestSeason,
} from './types'
import {
  REST_STORAGE_KEYS, DEFAULT_PRACTICES,
  VEGETATION_MAP,
} from './types'

/**
 * 获取当前季节
 */
function getCurrentSeason(): RestSeason {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

/**
 * 只读获取全部休息记录（供统一时间线聚合使用）
 */
export function getBreakRecords(): BreakRecord[] {
  try { return JSON.parse(storage.getKV<string>(REST_STORAGE_KEYS.RECORDS, '[]')) } catch { return [] }
}

/**
 * 息壤休息质量引擎
 */
export function useRestQuality() {
  const practices = ref<RestPractice[]>([])
  const records = ref<BreakRecord[]>([])
  const plants = ref<PlantState[]>([])

  async function load(): Promise<void> {
    const [savedPractices, savedRecords, savedPlants] = await Promise.all([
      storage.getKV<RestPractice[]>(REST_STORAGE_KEYS.PRACTICES, []),
      storage.getKV<BreakRecord[]>(REST_STORAGE_KEYS.RECORDS, []),
      storage.getKV<PlantState[]>(REST_STORAGE_KEYS.PLANTS, []),
    ])
    practices.value = savedPractices.length > 0 ? savedPractices : [...DEFAULT_PRACTICES]
    records.value = savedRecords
    plants.value = savedPlants
  }

  /**
   * 记录休憩
   */
  async function recordBreak(
    activity: string,
    duration: number,
    mood: number,
    note?: string
  ): Promise<BreakRecord> {
    const record: BreakRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      activity,
      duration,
      mood,
      note,
      date: new Date().toISOString(),
    }
    records.value.unshift(record)

    // 更新植物状态
    updatePlantHealth(activity)

    await persistRecords()
    return record
  }

  /**
   * 更新关联植物健康度
   */
  function updatePlantHealth(activity: string): void {
    const practice = practices.value.find((p) => p.name === activity)
    if (!practice?.plant) return

    const plant = plants.value.find((p) => p.name === practice.plant)
    if (plant) {
      // 浇水：提升健康度
      plant.health = Math.min(100, plant.health + 10)
      plant.lastWateredAt = new Date().toISOString()

      // 检查是否升级
      if (plant.health >= 100 && plant.growthStage < 4) {
        plant.growthStage++
        plant.health = 0
        plant.bloomCount++
      }
    } else {
      // 创建新植物
      plants.value.push({
        id: Date.now().toString(36),
        name: practice.plant,
        practiceId: practice.id,
        growthStage: 0,
        health: 10,
        bloomCount: 0,
        plantedAt: new Date().toISOString(),
      })
    }
  }

  /**
   * 获取休息质量分析
   */
  function getQualityAnalysis(): RestQualityAnalysis {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const weekRecords = records.value.filter(
      (r) => new Date(r.date) >= weekAgo
    )

    const weeklyCount = weekRecords.length
    const weeklyAvgRecovery = weekRecords.length > 0
      ? Math.round(
          weekRecords.reduce((sum, r) => {
            const practice = practices.value.find((p) => p.name === r.activity)
            return sum + (practice?.recovery || 50)
          }, 0) / weekRecords.length
        )
      : 0

    const weeklyAvgMood = weekRecords.length > 0
      ? Math.round(weekRecords.reduce((sum, r) => sum + r.mood, 0) / weekRecords.length * 10) / 10
      : 0

    // 休息频率评估
    let restFrequency: 'insufficient' | 'adequate' | 'excellent'
    if (weeklyCount < 3) restFrequency = 'insufficient'
    else if (weeklyCount < 7) restFrequency = 'adequate'
    else restFrequency = 'excellent'

    // 多样性
    const uniqueActivities = new Set(weekRecords.map((r) => r.activity))
    const diversityScore = Math.min(
      Math.round((uniqueActivities.size / practices.value.length) * 100),
      100
    )

    // 最常用方式
    const activityCounts: Record<string, number> = {}
    for (const r of weekRecords) {
      activityCounts[r.activity] = (activityCounts[r.activity] || 0) + 1
    }
    const topPractices = Object.entries(activityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([practice, count]) => ({ practice, count }))

    // 建议生成
    const suggestions: string[] = []
    if (restFrequency === 'insufficient') {
      suggestions.push('本周休息次数偏少，建议每天至少安排一次短暂休息')
    }
    if (diversityScore < 30) {
      suggestions.push('休息方式较单一，尝试不同的活动能让身心获得更全面的恢复')
    }
    if (weeklyAvgMood < 3) {
      suggestions.push('近期休息时心情偏低，建议选择能带来愉悦感的活动')
    }
    if (weeklyAvgRecovery < 60) {
      suggestions.push('休息恢复效果不佳，可以尝试延长休息时间或选择恢复力更高的活动')
    }
    if (suggestions.length === 0) {
      suggestions.push('休息状态良好，继续保持！')
    }

    // 连续休息天数
    let streakDays = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = getLocalDateKey(d)
      if (records.value.some((r) => getLocalDateKey(new Date(r.date)) === dateStr)) {
        streakDays++
      } else {
        break
      }
    }

    return {
      weeklyCount,
      weeklyAvgRecovery,
      weeklyAvgMood,
      restFrequency,
      diversityScore,
      topPractices,
      suggestions,
      streakDays,
      idealRestInterval: restFrequency === 'insufficient' ? 4 : 2,
    }
  }

  /**
   * 获取当前季节推荐
   */
  function getSeasonalRecommendations(): RestPractice[] {
    const season = getCurrentSeason()
    return practices.value.filter((p) => !p.seasons || p.seasons.includes(season))
  }

  /**
   * 获取植物状态
   */
  function getPlantState(plantName: string): PlantState | null {
    return plants.value.find((p) => p.name === plantName) || null
  }

  /**
   * 获取植物生长 emoji
   */
  function getPlantEmoji(plantName: string): string {
    const veg = VEGETATION_MAP[plantName]
    const plant = plants.value.find((p) => p.name === plantName)
    if (!veg || !plant) return '🌱'
    return veg.stages[plant.growthStage] || '🌱'
  }

  /**
   * 添加自定义休憩方式
   */
  async function addPractice(practice: RestPractice): Promise<void> {
    practices.value.push(practice)
    await persistPractices()
  }

  /**
   * 获取休息统计摘要
   */
  function getSummary(): { totalRecords: number; totalDuration: number; avgMood: number; plantCount: number } {
    const totalDuration = records.value.reduce((sum, r) => sum + r.duration, 0)
    const avgMood = records.value.length > 0
      ? Math.round(records.value.reduce((sum, r) => sum + r.mood, 0) / records.value.length * 10) / 10
      : 0

    return {
      totalRecords: records.value.length,
      totalDuration,
      avgMood,
      plantCount: plants.value.length,
    }
  }

  async function persistRecords(): Promise<void> {
    await storage.setKV(REST_STORAGE_KEYS.RECORDS, records.value)
  }
  async function persistPractices(): Promise<void> {
    await storage.setKV(REST_STORAGE_KEYS.PRACTICES, practices.value)
  }

  load()

  return {
    practices,
    records,
    plants,
    recordBreak,
    getQualityAnalysis,
    getSeasonalRecommendations,
    getPlantState,
    getPlantEmoji,
    addPractice,
    getSummary,
    getCurrentSeason,
    load,
  }
}

import { ref } from 'vue'