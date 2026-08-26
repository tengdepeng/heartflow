// ============================================================
// 介质呼吸 · 类型定义
// ============================================================

/** 呼吸氛围状态 */
export type BreathingMood = 'calm' | 'present' | 'focusing' | 'pulsing'

/** 时段: 0=深夜, 1=黎明, 2=清晨, 3=白昼, 4=黄昏, 5=入夜 */
export type TimeOfDay = 0 | 1 | 2 | 3 | 4 | 5

/** 呼吸相位 */
export interface BreathingPhase {
  /** 当前氛围状态 */
  mood: BreathingMood
  /** CSS 自定义属性映射，供 BreathingLayer 绑定 */
  styleVars: BreathingStyleVars
}

export interface BreathingStyleVars {
  '--br-glow-opacity': string
  '--br-glow-color': string
  '--br-cycle-ms': string
  '--br-glow-calm': string
  '--br-glow-peak': string
  '--br-scale-calm': string
  '--br-scale-peak': string
}

/** 呼吸引擎配置 */
export interface BreathingConfig {
  /** 无操作多少 ms 后回归平静 */
  presenceTimeout: number
  /** 脉冲持续时长 ms */
  pulseDuration: number
  /** 是否启用用户在场检测 */
  enablePresence: boolean
}

export const DEFAULT_BREATHING_CONFIG: BreathingConfig = {
  presenceTimeout: 10000,
  pulseDuration: 3000,
  enablePresence: true,
}
