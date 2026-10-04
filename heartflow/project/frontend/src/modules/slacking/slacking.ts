// ============================================================
// 摸鱼计算机 · 下班倒计时 / 今日已赚 / 摸鱼计时
// 纯本地、零外部依赖，守宪法「本地私有」。
// 复用范式：模块级单例 + reactive 状态 + nowTs ref（由视图每秒刷新）。
// ============================================================

import { ref, reactive, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:slacking'

export interface SlackingConfig {
  /** 时薪（元/时），仅趣味估算，不连接真实账本 */
  hourlyRate: number
  /** 上班小时 0~23 */
  workStartHour: number
  /** 下班小时 0~23 */
  offWorkHour: number
}

export interface SlackingState {
  config: SlackingConfig
  /** 摸鱼计时是否进行中 */
  slackingActive: boolean
  /** 本次摸鱼起始时间戳（ms），非进行中为 0 */
  slackingStartTs: number
  /** 历史累计摸鱼毫秒（已收手的） */
  slackingAccumMs: number
}

function defaultConfig(): SlackingConfig {
  return { hourlyRate: 30, workStartHour: 9, offWorkHour: 18 }
}

function defaultState(): SlackingState {
  return {
    config: defaultConfig(),
    slackingActive: false,
    slackingStartTs: 0,
    slackingAccumMs: 0,
  }
}

export function defaultSlackingConfig(): SlackingConfig {
  return defaultConfig()
}

// ============================================================
// 纯函数（不触碰存储 / 单例，便于单测）
// ============================================================

/** 把小时夹取到 0~23 整数 */
export function clampHour(h: number): number {
  const n = Math.floor(Number(h))
  if (!Number.isFinite(n)) return 0
  return Math.min(23, Math.max(0, n))
}

/** 当前是否处于工作时段（含上班、不含下班的当天区间） */
export function isWorkHours(cfg: SlackingConfig, now: Date): boolean {
  const h = now.getHours() + now.getMinutes() / 60
  return h >= cfg.workStartHour && h < cfg.offWorkHour
}

/** 距今天下班剩余毫秒（已过下班返回 0） */
export function msUntilOffWork(cfg: SlackingConfig, now: Date): number {
  const off = new Date(now)
  off.setHours(cfg.offWorkHour, 0, 0, 0)
  const diff = off.getTime() - now.getTime()
  return diff < 0 ? 0 : diff
}

/** 今日已上班毫秒（夹取到 [0, 工作日时长]） */
export function workedMsToday(cfg: SlackingConfig, now: Date): number {
  const start = new Date(now)
  start.setHours(cfg.workStartHour, 0, 0, 0)
  let diff = now.getTime() - start.getTime()
  if (diff < 0) diff = 0
  const max = Math.max(0, (cfg.offWorkHour - cfg.workStartHour) * 3600_000)
  if (max > 0 && diff > max) diff = max
  return diff
}

/** 今日已赚（元），按工时 × 时薪 */
export function earnedToday(cfg: SlackingConfig, now: Date): number {
  const hours = workedMsToday(cfg, now) / 3600_000
  return Math.round(hours * cfg.hourlyRate * 100) / 100
}

/** 工作进度 0~1 */
export function workProgress(cfg: SlackingConfig, now: Date): number {
  const max = Math.max(0, (cfg.offWorkHour - cfg.workStartHour) * 3600_000)
  if (max <= 0) return 0
  return Math.min(1, workedMsToday(cfg, now) / max)
}

// ============================================================
// 组合式：模块级单例
// ============================================================

/** 实时时钟（由视图每秒刷新，测试用 _setNow 注入） */
const nowTs = ref(Date.now())

/** 初始化：从存储读取，失败安全回默认 */
function loadInitial(): SlackingState {
  try {
    const saved = storage.getKV<Partial<SlackingState> | null>(STORAGE_KEY, null)
    if (saved && saved.config) {
      return {
        config: { ...defaultConfig(), ...saved.config },
        slackingActive: !!saved.slackingActive,
        slackingStartTs: saved.slackingStartTs || 0,
        slackingAccumMs: saved.slackingAccumMs || 0,
      }
    }
  } catch {
    /* 忽略：使用默认 */
  }
  return defaultState()
}

const state = reactive<SlackingState>(loadInitial())

function persist(): void {
  try {
    storage.setKV(STORAGE_KEY, state)
  } catch {
    /* 忽略：持久化失败不影响内存态 */
  }
}

/** 测试用：原地复位单例为默认 */
function resetState(): void {
  const d = defaultState()
  state.config.hourlyRate = d.config.hourlyRate
  state.config.workStartHour = d.config.workStartHour
  state.config.offWorkHour = d.config.offWorkHour
  state.slackingActive = d.slackingActive
  state.slackingStartTs = d.slackingStartTs
  state.slackingAccumMs = d.slackingAccumMs
  persist()
}

export function useSlackingWage() {
  const config = state.config
  const now = computed(() => new Date(nowTs.value))

  const earned = computed(() => earnedToday(config, now.value))
  const msToOff = computed(() => msUntilOffWork(config, now.value))
  const workedMs = computed(() => workedMsToday(config, now.value))
  const progress = computed(() => workProgress(config, now.value))
  const working = computed(() => isWorkHours(config, now.value))

  const slackingMs = computed(() => {
    let total = state.slackingAccumMs
    if (state.slackingActive && state.slackingStartTs) {
      total += nowTs.value - state.slackingStartTs
    }
    return total
  })
  const isSlacking = computed(() => state.slackingActive)

  function setHourlyRate(v: number): void {
    state.config.hourlyRate = Math.max(0, Math.round(Number(v) || 0))
    persist()
  }
  function setWorkStart(h: number): void {
    state.config.workStartHour = clampHour(h)
    persist()
  }
  function setOffWork(h: number): void {
    state.config.offWorkHour = clampHour(h)
    persist()
  }
  function setConfig(cfg: Partial<SlackingConfig>): void {
    state.config = { ...state.config, ...cfg }
    persist()
  }
  function startSlacking(): void {
    if (state.slackingActive) return
    state.slackingActive = true
    state.slackingStartTs = nowTs.value
    persist()
  }
  function stopSlacking(): void {
    if (state.slackingActive && state.slackingStartTs) {
      state.slackingAccumMs += nowTs.value - state.slackingStartTs
    }
    state.slackingActive = false
    state.slackingStartTs = 0
    persist()
  }
  function resetSlacking(): void {
    state.slackingActive = false
    state.slackingStartTs = 0
    state.slackingAccumMs = 0
    persist()
  }

  return {
    config,
    now,
    earned,
    msToOff,
    workedMs,
    progress,
    working,
    slackingMs,
    isSlacking,
    setHourlyRate,
    setWorkStart,
    setOffWork,
    setConfig,
    startSlacking,
    stopSlacking,
    resetSlacking,
    /** 生产：刷新实时时钟 */
    refresh: () => {
      nowTs.value = Date.now()
    },
    /** 测试：注入时间戳 */
    _setNow: (ts: number) => {
      nowTs.value = ts
    },
    /** 测试：复位单例 */
    _reset: resetState,
  }
}
