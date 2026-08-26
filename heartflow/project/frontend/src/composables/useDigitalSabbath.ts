// ============================================================
// 数字安息日（宪法第50条 · elastic-digital-sabbath → scene:sabbath）
// 当条款启用且当前为周日时，殿堂进入安息日：叠加冷色静谧叠层 + 阻断一切通知。
// 与「夜静调暗」并列但语义不同：安息日是每周固定一日（周日）的全面断联。
// ============================================================

import { onMounted, onUnmounted, ref } from 'vue'
import { isTargetActive, onEffectEvent } from '../engine/constitution-effect'

/** 周日判定（纯函数，便于单测） */
export function isSunday(now: Date = new Date()): boolean {
  return now.getDay() === 0
}

/** 当前是否应进入数字安息日：条款启用 且 为周日 */
export function isSabbathOn(now: Date = new Date()): boolean {
  return isTargetActive('scene:sabbath') && isSunday(now)
}

/**
 * 数字安息日响应式接口。
 * 在 App 挂载处调用一次即可全局生效；自动随宪法条款变化与日期切换。
 */
export function useDigitalSabbath(pollMs = 60_000) {
  const isSabbath = ref(false)

  function applyDom(): void {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('sabbath', isSabbath.value)
    document.documentElement.style.setProperty('--hf-sabbath', isSabbath.value ? '1' : '0')
  }

  function evaluate(): void {
    isSabbath.value = isSabbathOn()
    applyDom()
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let offEvent: (() => void) | null = null

  onMounted(() => {
    evaluate()
    // 当前挂载周期结束后再评一次，确保宪法效果引擎已先完成初始化
    setTimeout(evaluate, 0)
    timer = setInterval(evaluate, pollMs)
    offEvent = onEffectEvent(() => evaluate())
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    offEvent?.()
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('sabbath')
      document.documentElement.style.removeProperty('--hf-sabbath')
    }
  })

  return { isSabbath }
}
