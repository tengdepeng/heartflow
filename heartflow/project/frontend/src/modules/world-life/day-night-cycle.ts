// ============================================================
// 世界生命系统 · 昼夜循环引擎
// 根据实际时间自动映射到 6 个时段，驱动环境氛围切换。
// 蓝图：世界级生命系统 — 昼夜/天气/传承
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 时段定义 ----

export type DayPhase = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night'

export interface DayPhaseInfo {
  phase: DayPhase
  label: string
  icon: string
  /** 对应环境模板 ID */
  atmosphereId: string
  /** 该时段的主色 */
  accentColor: string
  /** 该时段的背景色 */
  bgColor: string
  /** 时段开始小时 (0-23) */
  startHour: number
  /** 时段结束小时 (0-23) */
  endHour: number
}

export const DAY_PHASES: DayPhaseInfo[] = [
  {
    phase: 'dawn', label: '黎明', icon: '🌅',
    atmosphereId: 'env_bright_fresh', accentColor: '#f59e6c', bgColor: '#1a1210',
    startHour: 5, endHour: 7,
  },
  {
    phase: 'morning', label: '上午', icon: '☀️',
    atmosphereId: 'env_default_warm', accentColor: '#f0c040', bgColor: '#0d0b09',
    startHour: 7, endHour: 12,
  },
  {
    phase: 'noon', label: '正午', icon: '🔆',
    atmosphereId: 'env_desert_sand', accentColor: '#fbbf24', bgColor: '#0d0b06',
    startHour: 12, endHour: 14,
  },
  {
    phase: 'afternoon', label: '午后', icon: '🌤️',
    atmosphereId: 'env_ocean_blue', accentColor: '#38bdf8', bgColor: '#020617',
    startHour: 14, endHour: 17,
  },
  {
    phase: 'dusk', label: '黄昏', icon: '🌇',
    atmosphereId: 'env_sunset_amber', accentColor: '#f59e6c', bgColor: '#100a06',
    startHour: 17, endHour: 20,
  },
  {
    phase: 'night', label: '夜晚', icon: '🌙',
    atmosphereId: 'env_dark_quiet', accentColor: '#6c9cf5', bgColor: '#050507',
    startHour: 20, endHour: 5,
  },
]

// ---- 存储键 ----

const DNC_ENABLED_KEY = 'hf:world_life:day_night_enabled'
const DNC_OVERRIDE_KEY = 'hf:world_life:day_night_override'

// ---- 模块级状态 ----

const enabled = ref<boolean>(false)
const overridePhase = ref<DayPhase | null>(null) // null = 跟随实际时间
const currentPhase = ref<DayPhase>(getPhaseFromHour(new Date().getHours()))

/** 根据小时数获取时段 */
function getPhaseFromHour(hour: number): DayPhase {
  for (const p of DAY_PHASES) {
    if (p.startHour <= p.endHour) {
      if (hour >= p.startHour && hour < p.endHour) return p.phase
    } else {
      // 跨午夜时段（如 night: 20-5）
      if (hour >= p.startHour || hour < p.endHour) return p.phase
    }
  }
  return 'night'
}

let intervalId: ReturnType<typeof setInterval> | null = null

// ---- 公共 API ----

export function useDayNightCycle() {
  /** 加载持久化状态 */
  function load(): void {
    try {
      enabled.value = storage.getKV<boolean>(DNC_ENABLED_KEY, false)
      overridePhase.value = storage.getKV<DayPhase | null>(DNC_OVERRIDE_KEY, null)
    } catch {
      enabled.value = false
      overridePhase.value = null
    }
    refreshPhase()
  }

  /** 刷新当前时段 */
  function refreshPhase(): void {
    if (overridePhase.value) {
      currentPhase.value = overridePhase.value
    } else {
      currentPhase.value = getPhaseFromHour(new Date().getHours())
    }
  }

  /** 启动定时刷新（每分钟检查一次） */
  function start(): void {
    if (intervalId) return
    refreshPhase()
    intervalId = setInterval(refreshPhase, 60_000)
  }

  /** 停止定时刷新 */
  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  /** 启用昼夜循环 */
  function enable(): void {
    enabled.value = true
    storage.setKV(DNC_ENABLED_KEY, true)
    start()
  }

  /** 禁用昼夜循环 */
  function disable(): void {
    enabled.value = false
    storage.setKV(DNC_ENABLED_KEY, false)
    stop()
  }

  /** 手动覆盖时段（传 null 恢复跟随实际时间） */
  function setOverride(phase: DayPhase | null): void {
    overridePhase.value = phase
    storage.setKV(DNC_OVERRIDE_KEY, phase)
    refreshPhase()
  }

  /** 当前时段信息 */
  const phaseInfo = computed<DayPhaseInfo>(() =>
    DAY_PHASES.find(p => p.phase === currentPhase.value) ?? DAY_PHASES[5],
  )

  /** 获取下一时段 */
  const nextPhase = computed<DayPhaseInfo>(() => {
    const idx = DAY_PHASES.findIndex(p => p.phase === currentPhase.value)
    return DAY_PHASES[(idx + 1) % DAY_PHASES.length]
  })

  /** 当前时段在一天中的进度 0-1 */
  const phaseProgress = computed<number>(() => {
    const info = phaseInfo.value
    const now = new Date()
    const hour = now.getHours() + now.getMinutes() / 60
    if (info.startHour <= info.endHour) {
      const total = info.endHour - info.startHour
      return total > 0 ? Math.max(0, Math.min(1, (hour - info.startHour) / total)) : 0
    } else {
      // 跨午夜
      const total = (24 - info.startHour) + info.endHour
      const elapsed = hour >= info.startHour
        ? hour - info.startHour
        : (24 - info.startHour) + hour
      return total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0
    }
  })

  /** 所有时段列表 */
  const allPhases = DAY_PHASES

  return {
    enabled,
    currentPhase,
    overridePhase,
    phaseInfo,
    nextPhase,
    phaseProgress,
    allPhases,
    load,
    start,
    stop,
    enable,
    disable,
    setOverride,
    refreshPhase,
  }
}

/** 便捷函数：获取当前时段（不创建完整组合式API） */
export function getCurrentDayPhase(): DayPhase {
  return getPhaseFromHour(new Date().getHours())
}