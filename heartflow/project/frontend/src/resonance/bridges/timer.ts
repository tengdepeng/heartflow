// ============================================================
// 共鸣协议层 · Timer 桥接器
// 将计时器状态通过共振层暴露，替代直接 import useTimerStore
// ============================================================

import { computed, reactive } from 'vue'
import { useTimerStore } from '../../stores/timer'
import { storeToRefs } from 'pinia'

/**
 * 计时器状态 composable
 * 模块通过此 composable 获取响应式的计时器状态，
 * 而无需直接 import useTimerStore
 */
export function useTimer() {
  const store = useTimerStore()
  const {
    session, elapsed, isRunning, progress, display,
    isFocusing, isPaused, isCompleted, isIdle,
    longBreakDue,
  } = storeToRefs(store)

  const remainingSeconds = computed(() =>
    Math.max(0, Math.floor((session.value.plannedDuration - elapsed.value) / 1000)),
  )

  return reactive({
    session,
    elapsed,
    isRunning,
    progress,
    display,
    isFocusing,
    isPaused,
    isCompleted,
    isIdle,
    longBreakDue,
    remainingSeconds,
    get todayCompletedCount(): number { return store.todayCompletedCount },
    setMode: store.setMode?.bind(store),
    start(...args: Parameters<typeof store.start>) {
      return store.start(...args)
    },
    pause: store.pause?.bind(store),
    resume: store.resume?.bind(store),
    finish: store.finish?.bind(store),
    interrupt: store.interrupt?.bind(store),
    reset: store.reset?.bind(store),
    pauseForSanctuary: store.pauseForSanctuary?.bind(store),
    resumeFromSanctuary: store.resumeFromSanctuary?.bind(store),
  })
}