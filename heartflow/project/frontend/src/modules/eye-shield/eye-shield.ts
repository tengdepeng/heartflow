// ============================================================
// 守护室 · 护眼方案引擎（夜间模式 / 暮光启发）
// ------------------------------------------------------------
// 借鉴「夜间模式 / 暮光」：昼夜分时护眼 —— 蓝光过滤、灰度模式、
// 超低亮度、色温随日落日落渐变，以及 20-20-20 用眼休息调度。
// 全部本地计算，守宪法第1条本地私有 / 拒绝推送轰炸（仅引导不打扰）。
// 纯函数核心（可单测）+ 轻量持久化，供 EyeShieldPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 昼夜时段 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

/** 护眼预设类型 */
export type ShieldPresetId = 'blue' | 'grayscale' | 'dim'

/** 护眼配置 */
export interface EyeShieldConfig {
  /** 总开关 */
  enabled: boolean
  /** 是否随昼夜自动调节色温 */
  autoByTime: boolean
  /** 暖色温等级 0-100（越高越暖、蓝光越少） */
  warmth: number
  /** 低亮度遮罩强度 0-100 */
  dim: number
  /** 灰度模式 */
  grayscale: boolean
  /** 20-20-20 用眼休息提醒（分钟间隔，0=关闭） */
  eyeBreakMinutes: number
}

/** 当前护眼状态（渲染态） */
export interface EyeShieldState {
  phase: DayPhase
  phaseLabel: string
  /** 最终生效色温 0-100（结合自动曲线与用户值） */
  effectiveWarmth: number
  effectiveDim: number
  grayscale: boolean
  /** 预设命中 */
  preset: ShieldPresetId | null
  presetLabel: string
}

export const DAY_PHASE_META: Record<DayPhase, { label: string; icon: string; heat: number }> = {
  dawn: { label: '清晨', icon: '🌅', heat: 30 },
  day: { label: '白昼', icon: '☀️', heat: 10 },
  dusk: { label: '黄昏', icon: '🌇', heat: 55 },
  night: { label: '夜色', icon: '🌙', heat: 85 },
}

export const SHIELD_PRESETS: { id: ShieldPresetId; label: string; icon: string; desc: string }[] = [
  { id: 'blue', label: '蓝光过滤', icon: '🫐', desc: '降低蓝光，夜读更柔和' },
  { id: 'dim', label: '超低亮度', icon: '🌒', desc: '遮罩降亮，深夜不刺眼' },
  { id: 'grayscale', label: '灰度模式', icon: '🎞️', desc: '降低视觉刺激，辅助入眠' },
]

export const DEFAULT_EYE_SHIELD_CONFIG: EyeShieldConfig = {
  enabled: true,
  autoByTime: true,
  warmth: 40,
  dim: 20,
  grayscale: false,
  eyeBreakMinutes: 20,
}

const STORAGE_KEY = 'hf:eye_shield_config'

// ============================================================
// 纯函数核心
// ============================================================

/** 由小时判昼夜时段（5-7 清晨 / 7-18 白昼 / 18-20 黄昏 / 其余 夜色） */
export function dayPhaseFor(hour: number): DayPhase {
  const h = ((hour % 24) + 24) % 24
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 18) return 'day'
  if (h >= 18 && h < 20) return 'dusk'
  return 'night'
}

/** 时段推荐的暖色温基准（随昼夜渐变） */
export function warmthForPhase(phase: DayPhase): number {
  return DAY_PHASE_META[phase].heat
}

/** 混合用户手动值 与 昼夜基准（autoByTime 时以时段为主） */
export function effectiveWarmth(config: EyeShieldConfig, phase: DayPhase): number {
  if (!config.autoByTime) return config.warmth
  const auto = warmthForPhase(phase)
  return Math.round(auto * 0.7 + config.warmth * 0.3)
}

/** 计算当前护眼状态 */
export function shieldStateAt(config: EyeShieldConfig, hour: number): EyeShieldState {
  const phase = dayPhaseFor(hour)
  const effWarm = effectiveWarmth(config, phase)
  const effDim = config.dim

  let preset: ShieldPresetId | null = null
  if (config.enabled && phase === 'night' && effWarm >= 70) preset = 'blue'
  else if (config.enabled && effDim >= 60) preset = 'dim'
  else if (config.enabled && config.grayscale) preset = 'grayscale'

  return {
    phase,
    phaseLabel: DAY_PHASE_META[phase].label,
    effectiveWarmth: effWarm,
    effectiveDim: effDim,
    grayscale: config.enabled && config.grayscale,
    preset,
    presetLabel: preset ? SHIELD_PRESETS.find((p) => p.id === preset)!.label : '',
  }
}

/** 生成一日暖色温曲线（按小时采样 0-24），用于可视化与渐进 */
export function buildDayCurve(hour: number, config: EyeShieldConfig): { hour: number; warmth: number; phase: DayPhase }[] {
  const out: { hour: number; warmth: number; phase: DayPhase }[] = []
  for (let h = 0; h <= 24; h++) {
    const p = dayPhaseFor(h)
    const warmth = config.autoByTime ? warmthForPhase(p) : config.warmth
    out.push({ hour: h, warmth, phase: p })
  }
  return out.filter((p) => p.hour <= hour)
}

// ============================================================
// 20-20-20 用眼休息
// ============================================================

export interface EyeBreakPoint {
  /** 本次是否应休息 */
  shouldBreak: boolean
  /** 距上次休息已用分钟 */
  minutesUsed: number
  /** 距下一次休息还需秒 */
  secondsUntilBreak: number
  /** 休后建议（眺望 6 米外 20 秒） */
  advice: string
}

/** 计算用眼休息点：专注 start 起每 eyeBreakMinutes 分钟提醒一次，眺 20 秒（纯指导性） */
export function eyeBreakPoint(nowMs: number, startMs: number, breakMinutes: number): EyeBreakPoint {
  const intervalSecs = breakMinutes * 60
  const elapsedSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000))
  const minutesUsed = Math.floor(elapsedSecs / 60)
  if (intervalSecs <= 0) {
    return { shouldBreak: false, minutesUsed, secondsUntilBreak: 0, advice: '' }
  }
  const inCycle = elapsedSecs % intervalSecs
  const shouldBreak = elapsedSecs > 0 && inCycle === 0
  const secondsUntilBreak = intervalSecs - inCycle
  return { shouldBreak, minutesUsed, secondsUntilBreak, advice: '眺望 6 米之外 20 秒，让睫状肌放松。' }
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadConfig(): EyeShieldConfig {
  try {
    return { ...DEFAULT_EYE_SHIELD_CONFIG, ...storage.getKV<Partial<EyeShieldConfig>>(STORAGE_KEY, {}) }
  } catch {
    return { ...DEFAULT_EYE_SHIELD_CONFIG }
  }
}

export function useEyeShield() {
  const config = ref<EyeShieldConfig>(loadConfig())

  function save(): void {
    storage.setKV(STORAGE_KEY, config.value)
  }
  function patch(p: Partial<EyeShieldConfig>): void {
    Object.assign(config.value, p)
    save()
  }

  const current = computed<EyeShieldState>(() => shieldStateAt(config.value, new Date().getHours()))
  const dayCurve = computed(() => buildDayCurve(new Date().getHours(), config.value))

  return {
    config: computed(() => config.value),
    current,
    dayCurve,
    dayPhaseFor,
    shieldStateAt,
    effectiveWarmth,
    patch,
  }
}