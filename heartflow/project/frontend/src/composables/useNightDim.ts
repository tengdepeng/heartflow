// ============================================================
// 夜静调暗（宪法第53条 · elastic-night-dim → scene:night-dim）
// 当条款启用且处于夜间时段（22:00–05:00）时，给全局叠加一层调暗遮罩，
// 实现「殿堂自动调暗」。幕僚主动说话已由问候浮窗默认关闭保证，此处仅负责视觉调暗。
// ============================================================

import { onMounted, onUnmounted, ref } from 'vue'
import { isTargetActive, onEffectEvent } from '../engine/constitution-effect'

/** 夜间时段判定（纯函数，便于单测）：22:00（含）至次日 05:00（不含） */
export function isNightWindow(now: Date = new Date()): boolean {
  const h = now.getHours()
  return h >= 22 || h < 5
}

/** 当前是否应进入夜静调暗：条款启用 且 处于夜间时段 */
export function isNightDimOn(now: Date = new Date()): boolean {
  return isTargetActive('scene:night-dim') && isNightWindow(now)
}

/**
 * 夜静调暗响应式接口。
 * 在 App 挂载处调用一次即可全局生效；自动随宪法条款变化与时段切换。
 */
export function useNightDim(pollMs = 30_000) {
  const isNight = ref(false)

  function applyDom(): void {
    if (typeof document === 'undefined') return
    // 仅负责 on/off 门控（.active 类）；强度倍率 --hf-night-dim 由宪法引擎注入、App.vue 消费，
    // 此处不再用 1/0 覆盖，避免抹掉用户宪法调校。
    document.documentElement.classList.toggle('night-dim', isNight.value)
  }

  function evaluate(): void {
    isNight.value = isNightDimOn()
    applyDom()
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let offEvent: (() => void) | null = null

  onMounted(() => {
    evaluate()
    // 当前挂载周期结束后再评一次，确保宪法效果引擎（initConstitutionEffect）已先完成初始化
    setTimeout(evaluate, 0)
    timer = setInterval(evaluate, pollMs)
    offEvent = onEffectEvent(() => evaluate())
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    offEvent?.()
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('night-dim')
    }
  })

  return { isNight }
}
