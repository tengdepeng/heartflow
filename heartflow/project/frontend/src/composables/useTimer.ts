// ============================================================
// 计时复合逻辑（UI 层胶水）
// ============================================================

import { toRefs } from 'vue'
import { useTimer } from '../resonance/bridges/timer'

export function useTimerUI() {
  const bridge = useTimer()

  // 提取响应式引用
  const { session, elapsed, progress, display, isFocusing, isPaused, isCompleted, isIdle, isRunning, todayCompletedCount } = toRefs(bridge)

  function toggle() {
    if (isFocusing.value) {
      bridge.pause()
    } else if (isPaused.value) {
      bridge.resume()
    } else {
      // idle / completed / interrupted → 用当前 mode 启动
      bridge.start()
    }
  }

  function stop() {
    if (isFocusing.value || isPaused.value) {
      bridge.interrupt()
    }
  }

  return {
    // 响应式状态
    session,
    elapsed,
    progress,
    display,
    isFocusing,
    isPaused,
    isCompleted,
    isIdle,
    isRunning,
    todayCompletedCount,
    // 动作
    toggle,
    stop,
    // 转发 store actions
    setMode: bridge.setMode,
    start: bridge.start,
    pause: bridge.pause,
    resume: bridge.resume,
    finish: bridge.finish,
    interrupt: bridge.interrupt,
    reset: bridge.reset,
  }
}