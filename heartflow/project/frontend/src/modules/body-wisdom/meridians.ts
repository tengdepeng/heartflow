// ============================================================
// 藏象阁 · 经络追踪
// 子午流注 + 经络记录 + 趋势分析
// ============================================================

import { storage } from '@/engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { MeridianRecord, MeridianFeeling, MeridianType, MeridianStats } from './types'
import { BODY_WISDOM_STORAGE_KEYS, MERIDIAN_HOURS } from './types'

/**
 * 获取当前时辰对应的经络
 */
export function getCurrentMeridian(): { hour: number; meridian: MeridianType; organ: string; advice: string } {
  const now = new Date()
  const hour = now.getHours()
  // 子午流注每两小时一个经络
  const meridianIndex = Math.floor(((hour + 23) % 24) / 2)
  const meridianHour = MERIDIAN_HOURS[meridianIndex]
  return {
    hour: meridianHour.hour,
    meridian: meridianHour.meridian,
    organ: meridianHour.organ,
    advice: meridianHour.advice,
  }
}

/**
 * 藏象阁经络追踪
 */
export function useMeridianTracker() {
  const records = ref<MeridianRecord[]>([])

  async function load(): Promise<void> {
    const saved = await storage.getKV<MeridianRecord[]>(BODY_WISDOM_STORAGE_KEYS.MERIDIANS, [])
    records.value = saved
  }

  /**
   * 记录经络感受
   */
  async function recordFeeling(
    meridian: MeridianType,
    feeling: MeridianFeeling,
    note?: string
  ): Promise<MeridianRecord> {
    const now = new Date()
    const record: MeridianRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      meridian,
      feeling,
      note,
      recordedAt: now.toISOString(),
      hour: now.getHours(),
    }
    records.value.unshift(record)
    await persist()
    return record
  }

  /**
   * 获取今日所有经络记录
   */
  function getTodayRecords(): MeridianRecord[] {
    const today = getLocalDateKey()
    return records.value.filter((r) => getLocalDateKey(new Date(r.recordedAt)) === today)
  }

  /**
   * 获取指定经络的历史记录
   */
  function getMeridianHistory(meridian: MeridianType, limit = 30): MeridianRecord[] {
    return records.value
      .filter((r) => r.meridian === meridian)
      .slice(0, limit)
  }

  /**
   * 获取经络统计数据
   */
  function getStats(): MeridianStats {
    const total = records.value.length
    const good = records.value.filter((r) => r.feeling === 'good').length
    const ok = records.value.filter((r) => r.feeling === 'ok').length
    const bad = records.value.filter((r) => r.feeling === 'bad').length

    // 各经络健康率
    const meridianHealth: MeridianStats['meridianHealth'] = {} as MeridianStats['meridianHealth']
    for (const record of records.value) {
      if (!meridianHealth[record.meridian]) {
        meridianHealth[record.meridian] = { total: 0, good: 0, rate: 0 }
      }
      meridianHealth[record.meridian].total++
      if (record.feeling === 'good') meridianHealth[record.meridian].good++
    }
    for (const key of Object.keys(meridianHealth)) {
      const mh = meridianHealth[key as MeridianType]
      mh.rate = mh.total > 0 ? Math.round((mh.good / mh.total) * 100) : 0
    }

    // 最近7天趋势
    const recentTrend: { date: string; goodRate: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = getLocalDateKey(d)
      const dayRecords = records.value.filter((r) => getLocalDateKey(new Date(r.recordedAt)) === dateKey)
      const dayGood = dayRecords.filter((r) => r.feeling === 'good').length
      recentTrend.push({
        date: dateKey.slice(5),
        goodRate: dayRecords.length > 0 ? Math.round((dayGood / dayRecords.length) * 100) : 0,
      })
    }

    return { totalRecords: total, goodCount: good, okCount: ok, badCount: bad, meridianHealth, recentTrend }
  }

  /**
   * 获取需要关注的经络（良好率低于50%）
   */
  function getAttentionMeridians(): { meridian: MeridianType; organ: string; rate: number; advice: string }[] {
    const stats = getStats()
    const attention: { meridian: MeridianType; organ: string; rate: number; advice: string }[] = []

    for (const [meridian, health] of Object.entries(stats.meridianHealth)) {
      if (health.total >= 3 && health.rate < 50) {
        const mh = MERIDIAN_HOURS.find((m) => m.meridian === meridian)
        attention.push({
          meridian: meridian as MeridianType,
          organ: mh?.organ || meridian,
          rate: health.rate,
          advice: mh?.advice || '注意调养',
        })
      }
    }

    return attention.sort((a, b) => a.rate - b.rate)
  }

  async function persist(): Promise<void> {
    await storage.setKV(BODY_WISDOM_STORAGE_KEYS.MERIDIANS, records.value)
  }

  load()

  return {
    records,
    recordFeeling,
    getTodayRecords,
    getMeridianHistory,
    getStats,
    getAttentionMeridians,
    load,
  }
}

import { ref } from 'vue'