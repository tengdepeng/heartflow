// ============================================================
// 时间长廊 · 生命刻度（生辰启发）
// ------------------------------------------------------------
// 借鉴「生辰」：生之时六级粒度实时计时 + 死之时倒计时 +
// 生命进度条 + 里程碑标记。全部本地计算，守宪法第1条本地私有。
// 纯函数核心（可单测）+ 轻量持久化，供 LifeEpochPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 六级粒度（生之时已流逝） */
export interface LifeElapsed {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** 里程碑标注 */
export interface LifeMilestone {
  /** 里程碑名称（如「成年」「而立之年」） */
  name: string
  /** 里程碑年份光标（自出生的第 N 年） */
  year: number
}

/** 生命计时偏好 */
export interface LifeConfig {
  birthDate: string
  /** 期望寿命（年），用于倒计时与进度条 */
  expectedLifespan: number
  milestones: LifeMilestone[]
}

/** 生命进度概览 */
export interface LifeOverview {
  /** 已流逝（生之时）六级粒度 */
  elapsed: LifeElapsed
  /** 生命进度 0-100 */
  progress: number
  /** 剩余时间字符串（死之时倒计时） */
  remaining: string
  /** 里程碑序列（含是否已过） */
  milestones: { name: string; year: number; date: string; passed: boolean }[]
}

export const DEFAULT_LIFESPAN = 80

export const DEFAULT_MILESTONES: LifeMilestone[] = [
  { name: '成年', year: 18 },
  { name: '而立之年', year: 30 },
  { name: '不惑之年', year: 40 },
  { name: '知天命', year: 50 },
  { name: '花甲之年', year: 60 },
  { name: '古稀之年', year: 70 },
]

export const DEFAULT_LIFE_CONFIG: LifeConfig = {
  birthDate: '2000-01-01',
  expectedLifespan: DEFAULT_LIFESPAN,
  milestones: DEFAULT_MILESTONES,
}

const STORAGE_KEY = 'hf:life_epoch_config'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function localKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ============================================================
// 纯函数核心
// ============================================================

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60000
const MS_PER_HOUR = 3600000
const MS_PER_DAY = 86400000
const MS_PER_YEAR = 365.2425 * MS_PER_DAY

/** 生之时 · 六级粒度已流逝 */
export function lifeElapsed(birth: Date, now: Date): LifeElapsed {
  const ms = Math.max(0, now.getTime() - birth.getTime())
  const years = Math.floor(ms / MS_PER_YEAR)
  const months = Math.floor((ms % MS_PER_YEAR) / (MS_PER_YEAR / 12))
  const days = Math.floor((ms % MS_PER_YEAR / (MS_PER_YEAR / 12)) * (MS_PER_YEAR / 12) / MS_PER_DAY)
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR)
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE)
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND)
  return { years, months, days, hours, minutes, seconds }
}

/** 生命进度 0-100（已流逝 / 期望寿命） */
export function lifeProgress(birth: Date, expectedYears: number, now: Date): number {
  const span = expectedYears * MS_PER_YEAR
  const ratio = Math.max(0, Math.min(1, (now.getTime() - birth.getTime()) / span))
  return Math.round(ratio * 100)
}

/** 死之时 · 剩余时间字符串（到期望寿命终点） */
export function remainingTime(birth: Date, expectedYears: number, now: Date): string {
  const end = new Date(birth.getTime() + expectedYears * MS_PER_YEAR)
  const ms = Math.max(0, end.getTime() - now.getTime())
  const years = Math.floor(ms / MS_PER_YEAR)
  const months = Math.floor((ms % MS_PER_YEAR) / (MS_PER_YEAR / 12))
  const days = Math.floor((ms % (MS_PER_YEAR / 12)) / MS_PER_DAY)
  return `${years} 年 ${months} 个月 ${days} 天`
}

/** 里程碑标注（含日期与是否已过） */
export function milestonesOn(
  birth: Date,
  milestones: LifeMilestone[],
  now: Date,
): { name: string; year: number; date: string; passed: boolean }[] {
  return milestones
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((m) => {
      const d = new Date(birth.getFullYear() + m.year, birth.getMonth(), birth.getDate())
      return { name: m.name, year: m.year, date: localKey(d), passed: d <= now }
    })
}

/** 组合：由出生日期与偏好生成完整概览 */
export function buildLifeOverview(config: LifeConfig, now: Date = new Date()): LifeOverview {
  const birth = new Date(config.birthDate)
  return {
    elapsed: lifeElapsed(birth, now),
    progress: lifeProgress(birth, config.expectedLifespan, now),
    remaining: remainingTime(birth, config.expectedLifespan, now),
    milestones: milestonesOn(birth, config.milestones, now),
  }
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadConfig(): LifeConfig {
  try {
    return { ...DEFAULT_LIFE_CONFIG, ...storage.getKV<Partial<LifeConfig>>(STORAGE_KEY, {}) }
  } catch {
    return { ...DEFAULT_LIFE_CONFIG }
  }
}

export function useLifeEpoch() {
  const config = ref<LifeConfig>(loadConfig())

  function saveConfig(): void {
    storage.setKV(STORAGE_KEY, config.value)
  }

  function setBirthDate(date: string): void {
    config.value.birthDate = date
    saveConfig()
  }

  function setExpectedLifespan(years: number): void {
    config.value.expectedLifespan = Math.max(1, Math.min(150, Math.round(years)))
    saveConfig()
  }

  function addMilestone(name: string, year: number): void {
    config.value.milestones = [...config.value.milestones, { name: name.trim(), year }]
    saveConfig()
  }

  function removeMilestone(name: string): void {
    config.value.milestones = config.value.milestones.filter((m) => m.name !== name)
    saveConfig()
  }

  const overview = computed<LifeOverview>(() => buildLifeOverview(config.value))

  return {
    config: computed(() => config.value),
    overview,
    setBirthDate,
    setExpectedLifespan,
    addMilestone,
    removeMilestone,
  }
}