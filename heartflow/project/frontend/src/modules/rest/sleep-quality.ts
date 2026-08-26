// ============================================================
// 息壤 · 睡眠质量分析（P18-3）
// 睡眠记录追踪、质量分析、模式检测、睡眠卫生建议
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 睡眠阶段 */
export interface SleepStages {
  /** 深睡时长（分钟） */
  deep: number
  /** 浅睡时长（分钟） */
  light: number
  /** REM 时长（分钟） */
  rem: number
  /** 清醒时长（分钟） */
  awake: number
}

/** 睡眠记录 */
export interface SleepRecord {
  id: string
  /** 日期 YYYY-MM-DD */
  date: string
  /** 入睡时间 ISO */
  bedtime: string
  /** 起床时间 ISO */
  wakeTime: string
  /** 总时长（分钟） */
  duration: number
  /** 入睡耗时（分钟） */
  sleepLatency: number
  /** 睡眠质量评分 1-5 */
  quality: number
  /** 中断次数 */
  interruptions: number
  /** 睡眠阶段数据 */
  stages?: SleepStages
  /** 睡前活动 */
  preSleepActivity?: string
  /** 起床感受 */
  wakeFeeling?: 'refreshed' | 'ok' | 'groggy' | 'tired'
  /** 备注 */
  note?: string
}

/** 睡眠类型 */
export type SleepChronotype = 'early_bird' | 'night_owl' | 'balanced' | 'irregular'

/** 睡眠质量分析报告 */
export interface SleepQualityReport {
  /** 分析周期 */
  period: { start: string; end: string }
  /** 记录天数 */
  totalDays: number
  /** 平均睡眠时长 */
  avgDuration: number
  /** 平均入睡时间 */
  avgBedtime: string
  /** 平均起床时间 */
  avgWakeTime: string
  /** 平均睡眠质量 */
  avgQuality: number
  /** 平均入睡耗时 */
  avgLatency: number
  /** 睡眠规律性得分 0-100 */
  consistencyScore: number
  /** 睡眠债务（分钟） */
  sleepDebt: number
  /** 睡眠类型 */
  chronotype: SleepChronotype
  /** 睡眠效率 0-100 */
  sleepEfficiency: number
  /** 周趋势数据 */
  weekTrend: DaySleepSummary[]
  /** 睡眠卫生评分 0-100 */
  hygieneScore: number
  /** 改善建议 */
  suggestions: string[]
}

/** 每日睡眠摘要 */
export interface DaySleepSummary {
  date: string
  duration: number
  quality: number
  bedtime: string
  wakeTime: string
}

/** 睡眠卫生检查项 */
export interface SleepHygieneItem {
  id: string
  label: string
  description: string
  checked: boolean
  impact: 'high' | 'medium' | 'low'
}

/** 智能闹钟配置 */
export interface SmartAlarmConfig {
  id: string
  label: string
  /** 目标起床时间 */
  targetWakeTime: string
  /** 起床窗口期（分钟） */
  wakeWindow: number
  /** 是否启用 */
  enabled: boolean
  /** 重复日 0-6（周日-周六） */
  repeatDays: number[]
  /** 闹钟类型 */
  type: 'wake' | 'nap' | 'reminder'
  /** 渐亮时长（分钟） */
  gradualLight: number
  /** 闹铃音色 */
  soundTheme: 'nature' | 'gentle' | 'classic' | 'energy'
}

// ============================================================
// 存储键
// ============================================================

const STORAGE_KEYS = {
  SLEEP_RECORDS: 'hf:rest:sleep_records',
  ALARM_CONFIGS: 'hf:rest:alarm_configs',
  HYGIENE_CHECKLIST: 'hf:rest:hygiene_checklist',
} as const

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ============================================================
// useSleepQuality
// ============================================================

export function useSleepQuality() {
  const records = ref<SleepRecord[]>([])
  const alarmConfigs = ref<SmartAlarmConfig[]>([])
  const hygieneItems = ref<SleepHygieneItem[]>([])

  // ---- 初始化 ----
  function init(): void {
    loadRecords()
    loadAlarmConfigs()
    initHygieneChecklist()
  }

  function loadRecords(): void {
    try {
      const saved = storage.getKV<string>(STORAGE_KEYS.SLEEP_RECORDS, '[]')
      records.value = JSON.parse(saved)
    } catch { records.value = [] }
  }

  function saveRecords(): void {
    storage.setKV(STORAGE_KEYS.SLEEP_RECORDS, JSON.stringify(records.value))
  }

  function loadAlarmConfigs(): void {
    try {
      const saved = storage.getKV<string>(STORAGE_KEYS.ALARM_CONFIGS, '[]')
      const parsed = JSON.parse(saved)
      alarmConfigs.value = Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultAlarmConfigs()
    } catch {
      alarmConfigs.value = getDefaultAlarmConfigs()
    }
  }

  function saveAlarmConfigs(): void {
    storage.setKV(STORAGE_KEYS.ALARM_CONFIGS, JSON.stringify(alarmConfigs.value))
  }

  // ---- 睡眠卫生检查表 ----
  function initHygieneChecklist(): void {
    try {
      const saved = storage.getKV<string>(STORAGE_KEYS.HYGIENE_CHECKLIST, '[]')
      if (saved && saved !== '[]') {
        hygieneItems.value = JSON.parse(saved)
        return
      }
    } catch { /* use defaults */ }
    hygieneItems.value = DEFAULT_HYGIENE_ITEMS.map(item => ({ ...item, checked: false }))
  }

  function saveHygieneChecklist(): void {
    storage.setKV(STORAGE_KEYS.HYGIENE_CHECKLIST, JSON.stringify(hygieneItems.value))
  }

  // ---- 睡眠记录 CRUD ----
  function addSleepRecord(record: Omit<SleepRecord, 'id'>): SleepRecord {
    const newRecord: SleepRecord = { ...record, id: generateId() }
    records.value = [newRecord, ...records.value]
    saveRecords()
    return newRecord
  }

  function updateSleepRecord(id: string, updates: Partial<SleepRecord>): boolean {
    const idx = records.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    records.value[idx] = { ...records.value[idx], ...updates }
    records.value = [...records.value]
    saveRecords()
    return true
  }

  function deleteSleepRecord(id: string): boolean {
    const len = records.value.length
    records.value = records.value.filter(r => r.id !== id)
    if (records.value.length !== len) {
      saveRecords()
      return true
    }
    return false
  }

  function getTodayRecord(): SleepRecord | undefined {
    return records.value.find(r => r.date === todayStr())
  }

  function getRecordsByRange(start: string, end: string): SleepRecord[] {
    return records.value.filter(r => r.date >= start && r.date <= end)
  }

  // ---- 睡眠质量分析 ----
  function analyzeSleepQuality(days: number = 7): SleepQualityReport {
    const end = todayStr()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    const start = startDate.toISOString().split('T')[0]

    const periodRecords = getRecordsByRange(start, end)
    const totalDays = periodRecords.length

    if (totalDays === 0) {
      return {
        period: { start, end },
        totalDays: 0,
        avgDuration: 0,
        avgBedtime: '—',
        avgWakeTime: '—',
        avgQuality: 0,
        avgLatency: 0,
        consistencyScore: 0,
        sleepDebt: 0,
        chronotype: 'irregular',
        sleepEfficiency: 0,
        weekTrend: [],
        hygieneScore: 0,
        suggestions: ['开始记录你的睡眠吧，至少需要 3 天数据才能生成分析'],
      }
    }

    // 平均睡眠时长
    const avgDuration = Math.round(
      periodRecords.reduce((s, r) => s + r.duration, 0) / totalDays,
    )

    // 平均睡眠质量
    const avgQuality = Math.round(
      (periodRecords.reduce((s, r) => s + r.quality, 0) / totalDays) * 10,
    ) / 10

    // 平均入睡耗时
    const avgLatency = Math.round(
      periodRecords.reduce((s, r) => s + r.sleepLatency, 0) / totalDays,
    )

    // 平均入睡/起床时间
    const bedtimes = periodRecords
      .map(r => parseTimeToMinutes(r.bedtime.split('T')[1]?.slice(0, 5) || '23:00'))
      .filter(m => m >= 0)
    const wakeTimes = periodRecords
      .map(r => parseTimeToMinutes(r.wakeTime.split('T')[1]?.slice(0, 5) || '07:00'))
      .filter(m => m >= 0)

    const avgBedMinutes = bedtimes.length > 0
      ? Math.round(bedtimes.reduce((s, m) => s + m, 0) / bedtimes.length)
      : 0
    const avgWakeMinutes = wakeTimes.length > 0
      ? Math.round(wakeTimes.reduce((s, m) => s + m, 0) / wakeTimes.length)
      : 0

    // 睡眠规律性评分
    const consistencyScore = calculateConsistencyScore(periodRecords)

    // 睡眠债务（以 8 小时为基准）
    const sleepDebt = Math.max(0, periodRecords.reduce((debt, r) =>
      debt + Math.max(0, 480 - r.duration), 0))

    // 睡眠类型
    const chronotype = detectChronotype(periodRecords)

    // 睡眠效率（实际睡眠 / 在床时间）
    const sleepEfficiency = calculateSleepEfficiency(periodRecords)

    // 周趋势
    const weekTrend = periodRecords.map(r => ({
      date: r.date,
      duration: r.duration,
      quality: r.quality,
      bedtime: r.bedtime,
      wakeTime: r.wakeTime,
    })).sort((a, b) => a.date.localeCompare(b.date))

    // 睡眠卫生评分
    const hygieneScore = calculateHygieneScore()

    // 建议
    const suggestions = generateSuggestions({
      avgDuration, avgQuality, avgLatency, consistencyScore,
      sleepDebt, chronotype, sleepEfficiency, hygieneScore, totalDays,
    })

    return {
      period: { start, end },
      totalDays,
      avgDuration,
      avgBedtime: minutesToTime(avgBedMinutes),
      avgWakeTime: minutesToTime(avgWakeMinutes),
      avgQuality,
      avgLatency,
      consistencyScore,
      sleepDebt,
      chronotype,
      sleepEfficiency,
      weekTrend,
      hygieneScore,
      suggestions,
    }
  }

  // ---- 睡眠规律性评分 ----
  function calculateConsistencyScore(recs: SleepRecord[]): number {
    if (recs.length < 2) return 0

    const bedtimes = recs.map(r =>
      parseTimeToMinutes(r.bedtime.split('T')[1]?.slice(0, 5) || '23:00'))
    const wakeTimes = recs.map(r =>
      parseTimeToMinutes(r.wakeTime.split('T')[1]?.slice(0, 5) || '07:00'))

    // 计算标准差
    const bedStd = standardDeviation(bedtimes)
    const wakeStd = standardDeviation(wakeTimes)

    // 标准差越小，分数越高（满分 50 + 50）
    const bedScore = Math.max(0, 50 - bedStd * 2)
    const wakeScore = Math.max(0, 50 - wakeStd * 2)

    return Math.round(bedScore + wakeScore)
  }

  function standardDeviation(values: number[]): number {
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
    return Math.sqrt(variance)
  }

  // ---- 睡眠类型检测 ----
  function detectChronotype(recs: SleepRecord[]): SleepChronotype {
    if (recs.length < 3) return 'irregular'

    const bedtimes = recs.map(r => {
      const timeStr = r.bedtime.split('T')[1]?.slice(0, 5) || '23:00'
      let minutes = parseTimeToMinutes(timeStr)
      // 凌晨时间（00:00-06:00）视为深夜，加 24h 使其在时间轴上处于晚间之后
      if (minutes < 6 * 60) {
        minutes += 24 * 60
      }
      return minutes
    })
    const avgBed = bedtimes.reduce((s, m) => s + m, 0) / bedtimes.length

    // 检查规律性
    const bedStd = standardDeviation(bedtimes)
    if (bedStd > 120) return 'irregular' // 超过 2 小时标准差

    // 调整后的阈值：22:30 = 1350, 00:00 = 1440
    if (avgBed < 22 * 60 + 30) return 'early_bird' // 22:30 前
    if (avgBed > 24 * 60) return 'night_owl' // 调整后的 00:00 后
    return 'balanced'
  }

  // ---- 睡眠效率 ----
  function calculateSleepEfficiency(recs: SleepRecord[]): number {
    if (recs.length === 0) return 0
    const efficiency = recs.reduce((s, r) => {
      const totalBed = r.duration + r.sleepLatency + r.interruptions * 5
      return s + (totalBed > 0 ? r.duration / totalBed : 0)
    }, 0)
    return Math.round((efficiency / recs.length) * 100)
  }

  // ---- 睡眠卫生评分 ----
  function calculateHygieneScore(): number {
    if (hygieneItems.value.length === 0) return 0
    const checked = hygieneItems.value.filter(i => i.checked).length
    return Math.round((checked / hygieneItems.value.length) * 100)
  }

  function toggleHygieneItem(id: string): void {
    const item = hygieneItems.value.find(i => i.id === id)
    if (item) {
      item.checked = !item.checked
      saveHygieneChecklist()
    }
  }

  // ---- 生成建议 ----
  function generateSuggestions(params: {
    avgDuration: number; avgQuality: number; avgLatency: number
    consistencyScore: number; sleepDebt: number; chronotype: SleepChronotype
    sleepEfficiency: number; hygieneScore: number; totalDays: number
  }): string[] {
    const suggestions: string[] = []
    const {
      avgDuration, avgQuality, avgLatency, consistencyScore,
      sleepDebt, chronotype, sleepEfficiency, hygieneScore,
    } = params

    if (avgDuration < 420) {
      suggestions.push(`平均睡眠仅 ${Math.floor(avgDuration / 60)} 小时 ${avgDuration % 60} 分钟，建议增加到 7-8 小时`)
    }
    if (avgQuality < 3) {
      suggestions.push('睡眠质量偏低，尝试改善睡眠环境（温度、光线、噪音）')
    }
    if (avgLatency > 30) {
      suggestions.push(`入睡耗时较长（${avgLatency} 分钟），建议睡前 1 小时远离屏幕，建立放松仪式`)
    }
    if (consistencyScore < 60) {
      suggestions.push('睡眠时间不规律，尝试固定入睡和起床时间，即使是周末')
    }
    if (sleepDebt > 120) {
      suggestions.push(`累积睡眠债务 ${Math.floor(sleepDebt / 60)} 小时，通过午间小憩和周末补觉逐步偿还`)
    }
    if (chronotype === 'night_owl' && avgDuration < 420) {
      suggestions.push('作为夜猫型，确保即使晚睡也能获得充足睡眠，考虑遮光窗帘')
    }
    if (sleepEfficiency < 85) {
      suggestions.push('睡眠效率偏低，减少在床上清醒的时间，只在困倦时上床')
    }
    if (hygieneScore < 60) {
      suggestions.push('睡眠卫生习惯有待改善，从检查表中挑选 2-3 项开始坚持')
    }

    if (suggestions.length === 0) {
      suggestions.push('睡眠状况良好，继续保持当前习惯！')
    }

    return suggestions
  }

  // ---- 智能闹钟 ----
  function getDefaultAlarmConfigs(): SmartAlarmConfig[] {
    return [
      {
        id: 'alarm_wake',
        label: '晨间起床',
        targetWakeTime: '07:00',
        wakeWindow: 30,
        enabled: true,
        repeatDays: [1, 2, 3, 4, 5],
        type: 'wake',
        gradualLight: 15,
        soundTheme: 'nature',
      },
      {
        id: 'alarm_nap',
        label: '午间小憩',
        targetWakeTime: '13:30',
        wakeWindow: 10,
        enabled: false,
        repeatDays: [1, 2, 3, 4, 5],
        type: 'nap',
        gradualLight: 5,
        soundTheme: 'gentle',
      },
      {
        id: 'alarm_rest',
        label: '休息提醒',
        targetWakeTime: '15:00',
        wakeWindow: 15,
        enabled: true,
        repeatDays: [1, 2, 3, 4, 5],
        type: 'reminder',
        gradualLight: 0,
        soundTheme: 'gentle',
      },
    ]
  }

  function updateAlarmConfig(id: string, updates: Partial<SmartAlarmConfig>): boolean {
    const idx = alarmConfigs.value.findIndex(a => a.id === id)
    if (idx === -1) return false
    alarmConfigs.value[idx] = { ...alarmConfigs.value[idx], ...updates }
    alarmConfigs.value = [...alarmConfigs.value]
    saveAlarmConfigs()
    return true
  }

  function toggleAlarm(id: string): boolean {
    const alarm = alarmConfigs.value.find(a => a.id === id)
    if (!alarm) return false
    return updateAlarmConfig(id, { enabled: !alarm.enabled })
  }

  /**
   * 计算最佳起床时间
   * 基于 90 分钟睡眠周期，推荐在浅睡阶段醒来
   */
  function calculateOptimalWakeTimes(
    bedtime: string,
    options?: { cycles?: number; minSleep?: number },
  ): { time: string; cycles: number; totalSleep: string }[] {
    const { cycles = 6, minSleep = 270 } = options || {}
    const bedMinutes = parseTimeToMinutes(bedtime)
    const results: { time: string; cycles: number; totalSleep: string }[] = []

    // 加上入睡耗时（约 15 分钟）
    const fallAsleepTime = bedMinutes + 15

    for (let c = 3; c <= cycles; c++) {
      const totalMinutes = c * 90
      if (totalMinutes < minSleep) continue
      const wakeMinutes = fallAsleepTime + totalMinutes
      const totalHours = Math.floor(totalMinutes / 60)
      const totalMins = totalMinutes % 60
      results.push({
        time: minutesToTime(wakeMinutes),
        cycles: c,
        totalSleep: `${totalHours}h${totalMins > 0 ? ` ${totalMins}m` : ''}`,
      })
    }

    return results
  }

  /**
   * 计算建议入睡时间
   * 基于目标起床时间，反推最佳入睡时间
   */
  function calculateOptimalBedtimes(
    wakeTime: string,
    options?: { cycles?: number },
  ): { time: string; cycles: number; totalSleep: string }[] {
    const { cycles = 6 } = options || {}
    const wakeMinutes = parseTimeToMinutes(wakeTime)
    const results: { time: string; cycles: number; totalSleep: string }[] = []

    for (let c = 3; c <= cycles; c++) {
      const totalMinutes = c * 90 + 15 // 加上入睡耗时
      const bedMinutes = wakeMinutes - totalMinutes
      const totalHours = Math.floor((c * 90) / 60)
      const totalMins = (c * 90) % 60
      results.push({
        time: minutesToTime(bedMinutes),
        cycles: c,
        totalSleep: `${totalHours}h${totalMins > 0 ? ` ${totalMins}m` : ''}`,
      })
    }

    // 只返回合理的入睡时间（18:00~04:00）
    return results.filter(r => {
      const m = parseTimeToMinutes(r.time)
      return m >= 18 * 60 || m <= 4 * 60
    })
  }

  /**
   * 预测起床难度
   */
  function predictWakeDifficulty(targetTime: string): {
    difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard'
    label: string
    suggestion: string
  } {
    const recentRecords = getRecordsByRange(
      new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      todayStr(),
    )

    if (recentRecords.length < 2) {
      return { difficulty: 'moderate', label: '数据不足', suggestion: '记录更多睡眠数据以获得准确预测' }
    }

    const targetMinutes = parseTimeToMinutes(targetTime)
    const avgWakeMinutes = recentRecords.reduce((s, r) => {
      return s + parseTimeToMinutes(r.wakeTime.split('T')[1]?.slice(0, 5) || '07:00')
    }, 0) / recentRecords.length

    const diff = targetMinutes - avgWakeMinutes
    const avgQuality = recentRecords.reduce((s, r) => s + r.quality, 0) / recentRecords.length
    const avgDuration = recentRecords.reduce((s, r) => s + r.duration, 0) / recentRecords.length

    let difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard'
    let label: string
    let suggestion: string

    if (diff <= 30 && avgQuality >= 3.5 && avgDuration >= 420) {
      difficulty = 'easy'
      label = '轻松起床'
      suggestion = '生物钟同步，预计自然醒来'
    } else if (diff <= 60 && avgQuality >= 3) {
      difficulty = 'moderate'
      label = '略有困难'
      suggestion = '建议提前 15 分钟开启渐亮灯光'
    } else if (diff <= 120) {
      difficulty = 'hard'
      label = '比较困难'
      suggestion = '建议调整作息，逐步提前入睡时间'
    } else {
      difficulty = 'very_hard'
      label = '非常困难'
      suggestion = '目标时间与生物钟偏差较大，建议渐进调整，每天提前 15 分钟'
    }

    return { difficulty, label, suggestion }
  }

  // ---- 最近记录 ----
  const recentRecords = computed(() => {
    return records.value.slice(0, 14)
  })

  // ---- 今日睡眠 ----
  const todaySleep = computed(() => {
    return getTodayRecord()
  })

  return {
    // 状态
    records,
    alarmConfigs,
    hygieneItems,
    recentRecords,
    todaySleep,

    // 初始化
    init,

    // 睡眠记录
    addSleepRecord,
    updateSleepRecord,
    deleteSleepRecord,
    getTodayRecord,
    getRecordsByRange,

    // 分析
    analyzeSleepQuality,
    calculateConsistencyScore,
    detectChronotype,
    calculateSleepEfficiency,

    // 睡眠卫生
    calculateHygieneScore,
    toggleHygieneItem,

    // 智能闹钟
    updateAlarmConfig,
    toggleAlarm,
    calculateOptimalWakeTimes,
    calculateOptimalBedtimes,
    predictWakeDifficulty,
  }
}

// ============================================================
// 默认睡眠卫生检查项
// ============================================================

const DEFAULT_HYGIENE_ITEMS: Omit<SleepHygieneItem, 'checked'>[] = [
  { id: 'h1', label: '固定入睡时间', description: '每天在同一时间上床睡觉', impact: 'high' },
  { id: 'h2', label: '固定起床时间', description: '每天在同一时间起床（包括周末）', impact: 'high' },
  { id: 'h3', label: '睡前远离屏幕', description: '睡前 1 小时不使用手机/电脑/电视', impact: 'high' },
  { id: 'h4', label: '避免咖啡因', description: '下午 2 点后不摄入咖啡因', impact: 'high' },
  { id: 'h5', label: '规律运动', description: '每天至少 30 分钟运动（但睡前 3 小时避免剧烈运动）', impact: 'medium' },
  { id: 'h6', label: '睡前放松仪式', description: '建立固定的睡前放松流程（阅读/冥想/泡澡）', impact: 'medium' },
  { id: 'h7', label: '舒适睡眠环境', description: '保持卧室凉爽、黑暗、安静', impact: 'high' },
  { id: 'h8', label: '限制酒精', description: '睡前 3 小时不饮酒', impact: 'medium' },
  { id: 'h9', label: '避免大餐', description: '睡前 2 小时不进食大量食物', impact: 'low' },
  { id: 'h10', label: '日间光照', description: '白天接触充足自然光，有助于调节生物钟', impact: 'medium' },
  { id: 'h11', label: '床上只睡觉', description: '不在床上工作、吃饭或看手机', impact: 'medium' },
  { id: 'h12', label: '记录睡眠', description: '每天记录睡眠质量和感受', impact: 'low' },
]