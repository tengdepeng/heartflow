// ============================================================
// 介质呼吸引擎（叶子模块）
// 从 index.ts 抽取，消除 BreathingLayer.vue ↔ index 的循环依赖。
// index.ts 仍再导出本函数，公共 API 不变。
// ============================================================

import { ref, computed, type Ref, onMounted, onUnmounted, watch } from 'vue'
import type { BreathingMood, BreathingPhase, BreathingConfig, TimeOfDay } from './types'
import { DEFAULT_BREATHING_CONFIG } from './types'
import { getEffectMultiplier } from '../../engine/constitution-effect'

export function useBreathing(opts?: {
  focusMode?: Ref<boolean>
  paused?: Ref<boolean>
  config?: Partial<BreathingConfig>
  /** 时段感知色温 0-5，默认 3=白昼 */
  timeOfDay?: Ref<TimeOfDay>
}) {
  const cfg = { ...DEFAULT_BREATHING_CONFIG, ...opts?.config }

  // ---- 响应式状态 ----
  const mood = ref<BreathingMood>('calm')
  const lastActivity = ref(Date.now())
  let pulseTimer: ReturnType<typeof setTimeout> | null = null

  // ---- 在场检测 ----
  /** 用户是否 "在" 画布前 */
  const isPresent = computed(() => Date.now() - lastActivity.value < cfg.presenceTimeout)

  function touchActivity() {
    if (opts?.paused?.value) return
    lastActivity.value = Date.now()
    if (mood.value === 'calm') mood.value = 'present'
  }

  // ---- 脉冲信号（专注完成/结晶生成时调用） ----
  function pulse() {
    if (opts?.paused?.value) return
    if (pulseTimer) clearTimeout(pulseTimer)
    mood.value = 'pulsing'
    pulseTimer = setTimeout(() => {
      if (mood.value === 'pulsing') mood.value = opts?.focusMode?.value ? 'focusing' : 'present'
    }, cfg.pulseDuration)
  }

  // ---- 对外重置到指定状态 ----
  function setMood(m: BreathingMood) {
    mood.value = m
  }

  // ---- 定时降级检查（回归平静） ----
  let checkTimer: ReturnType<typeof setInterval> | null = null

  function startPresenceCheck() {
    stopPresenceCheck()
    if (opts?.paused?.value) return
    checkTimer = setInterval(() => {
      if (opts?.paused?.value) return
      if (!cfg.enablePresence) return
      const now = Date.now()
      const idle = now - lastActivity.value
      if (idle > cfg.presenceTimeout && mood.value !== 'calm' && mood.value !== 'focusing') {
        mood.value = 'calm'
      }
    }, 2000)
  }

  function stopPresenceCheck() {
    if (checkTimer !== null) {
      clearInterval(checkTimer)
      checkTimer = null
    }
  }

  // ---- 时段感知色温 ----
  /** 6 时段 RGB 色值: [r, g, b] */
  const TIME_COLORS: [number, number, number][] = [
    [80, 90, 140],    // 0 深夜-冷蓝
    [140, 120, 180],  // 1 黎明-紫灰
    [180, 160, 140],  // 2 清晨-暖灰
    [212, 165, 116],  // 3 白昼-暖金
    [200, 140, 100],  // 4 黄昏-橘暖
    [100, 90, 130],   // 5 入夜-靛紫
  ]

  const timeColor = computed((): [number, number, number] => {
    const t = opts?.timeOfDay?.value ?? 3
    return TIME_COLORS[t] ?? TIME_COLORS[3]
  })

  // ---- 计算 CSS 变量（核心产出） ----
  // 宪法软效果 ui:breathing-speed（set 值 = 速度倍率，0.8 表示 80% 速度 = 节奏放缓）。
  // 速度倍率 <1 → 周期变长（1/value）；未配置时默认 1（不改变基准）。
  const breathSpeed = computed(() => getEffectMultiplier('ui:breathing-speed'))
  const cycleScale = computed(() => (breathSpeed.value > 0 ? 1 / breathSpeed.value : 1))

  const phase = computed<BreathingPhase>(() => {
    const [cr, cg, cb] = timeColor.value

    const MAP: Record<BreathingMood, BreathingPhase['styleVars']> = {
      calm: {
        '--br-glow-opacity': '0.15',
        '--br-glow-color': `rgba(${cr}, ${cg}, ${cb}, 0.12)`,
        '--br-cycle-ms': '8000',
        '--br-glow-calm': '0.10',
        '--br-glow-peak': '0.20',
        '--br-scale-calm': '0.98',
        '--br-scale-peak': '1.01',
      },
      present: {
        '--br-glow-opacity': '0.30',
        '--br-glow-color': `rgba(${cr}, ${cg}, ${cb}, 0.20)`,
        '--br-cycle-ms': '5000',
        '--br-glow-calm': '0.20',
        '--br-glow-peak': '0.40',
        '--br-scale-calm': '1.00',
        '--br-scale-peak': '1.02',
      },
      focusing: {
        '--br-glow-opacity': '0.08',
        '--br-glow-color': `rgba(${cr}, ${cg}, ${cb}, 0.06)`,
        '--br-cycle-ms': '12000',
        '--br-glow-calm': '0.06',
        '--br-glow-peak': '0.12',
        '--br-scale-calm': '0.99',
        '--br-scale-peak': '1.005',
      },
      pulsing: {
        '--br-glow-opacity': '0.50',
        '--br-glow-color': `rgba(${cr}, ${cg}, ${cb}, 0.35)`,
        '--br-cycle-ms': '1500',
        '--br-glow-calm': '0.50',
        '--br-glow-peak': '0.60',
        '--br-scale-calm': '1.01',
        '--br-scale-peak': '1.03',
      },
    }

    const base = MAP[mood.value]
    const styleVars: BreathingPhase['styleVars'] = { ...base }
    const baseCycle = parseInt(base['--br-cycle-ms'], 10) || 8000
    // 必须带单位：CSS 里是 animation-duration: var(--br-cycle-ms)，
    // 无单位的纯数字属无效 <time>，会退回 initial 0s，配合 infinite 导致动画每帧重启（整屏高频闪烁）。
    // 注意 var() 的 fallback 只在变量未定义时生效，救不了无效值。
    styleVars['--br-cycle-ms'] = `${Math.round(baseCycle * cycleScale.value)}ms`
    return {
      mood: mood.value,
      styleVars,
    }
  })

  // ---- 生命周期 ----
  function bindPresenceListeners() {
    if (!cfg.enablePresence || opts?.paused?.value) return
    document.addEventListener('mousemove', touchActivity, { passive: true })
    document.addEventListener('keydown', touchActivity, { passive: true })
    document.addEventListener('touchstart', touchActivity, { passive: true })
  }

  function unbindPresenceListeners() {
    if (!cfg.enablePresence) return
    document.removeEventListener('mousemove', touchActivity)
    document.removeEventListener('keydown', touchActivity)
    document.removeEventListener('touchstart', touchActivity)
  }

  onMounted(() => {
    startPresenceCheck()
    bindPresenceListeners()
  })

  onUnmounted(() => {
    stopPresenceCheck()
    if (pulseTimer) clearTimeout(pulseTimer)
    unbindPresenceListeners()
  })

  watch(() => opts?.paused?.value, (paused) => {
    if (paused) {
      stopPresenceCheck()
      unbindPresenceListeners()
      mood.value = 'calm'
      return
    }

    startPresenceCheck()
    bindPresenceListeners()
  })

  return {
    /** 当前呼吸相位（含 CSS 变量） */
    phase,
    /** 当前氛围状态 */
    mood,
    /** 用户是否在场 */
    isPresent,
    /** 触发一次脉冲（专注完成时调用） */
    pulse,
    /** 手动设置氛围 */
    setMood,
  }
}
