// ============================================================
// 安全岛 · 五击触发侦测器
// 监测 2 秒内 5 次快速点击/触摸，触发安全岛进入动画
// ============================================================

import { ref, onMounted, onUnmounted } from 'vue'
import { useRuntimeState } from '../../../resonance/bridges/runtime'

/** 五击触发配置 */
export interface SanctuaryTriggerConfig {
  /** 窗口时间（毫秒），默认 2000ms */
  windowMs?: number
  /** 所需点击次数，默认 5 */
  tapCount?: number
  /** 是否在触发后自动退出（调试用），默认 false */
  autoExit?: boolean
}

export function useSanctuaryTrigger(config: SanctuaryTriggerConfig = {}) {
  const {
    windowMs = 2000,
    tapCount = 5,
    autoExit = false,
  } = config

  const { isSanctuaryActive, enterSanctuary, exitSanctuary } = useRuntimeState()

  /** 点击时间戳队列 */
  const tapTimestamps = ref<number[]>([])
  /** 当前进度（0-1），用于视觉反馈 */
  const triggerProgress = ref(0)
  /** 是否在触发冷却中 */
  const isCooldown = ref(false)

  let clearTimer: ReturnType<typeof setTimeout> | null = null

  /** 重置点击队列 */
  function resetTaps() {
    tapTimestamps.value = []
    triggerProgress.value = 0
    if (clearTimer) {
      clearTimeout(clearTimer)
      clearTimer = null
    }
  }

  /** 处理点击事件 */
  function handleTap() {
    if (isCooldown.value || isSanctuaryActive.value) return

    const now = Date.now()
    tapTimestamps.value.push(now)

    // 清除旧窗口外的点击
    tapTimestamps.value = tapTimestamps.value.filter(
      (ts) => now - ts < windowMs
    )

    // 更新进度
    triggerProgress.value = tapTimestamps.value.length / tapCount

    // 检查是否达到触发条件
    if (tapTimestamps.value.length >= tapCount) {
      // 触发安全岛
      isCooldown.value = true
      enterSanctuary()

      // 可选：自动退出（调试用）
      if (autoExit) {
        setTimeout(() => {
          exitSanctuary()
          isCooldown.value = false
        }, 3000)
      } else {
        // 触发后延迟重置，允许用户在安全岛内操作
        setTimeout(() => {
          isCooldown.value = false
        }, 1000)
      }

      resetTaps()
      return
    }

    // 设置窗口超时重置
    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = setTimeout(() => {
      resetTaps()
    }, windowMs)
  }

  /** 手动重置进度 */
  function reset() {
    resetTaps()
    isCooldown.value = false
  }

  // ⚠️ 只监听 pointerdown：一次物理点击只触发一次。
  // 旧实现同时监听 click + touchstart，触屏设备上一次触摸会先触发 touchstart、
  // 浏览器再合成 click，导致每次点击被计 2 次 —— "五击"实际约 2.5 次即触发，极易误入安全岛。
  // Pointer Events 统一了鼠标/触摸/笔，且无 click 的 300ms 延迟。
  onMounted(() => {
    document.addEventListener('pointerdown', handleTap, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('pointerdown', handleTap)
    if (clearTimer) clearTimeout(clearTimer)
  })

  return {
    triggerProgress,
    isCooldown,
    reset,
  }
}