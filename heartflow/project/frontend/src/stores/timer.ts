// ============================================================
// 计时状态管理
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FocusSession, FocusMode } from '../types'
import { createSession, startSession, pauseSession, resumeSession, completeSession, interruptSession, calcProgress, formatTimerClock } from '../engine/timer'
import { storage } from '../engine/storage'
import { isTargetActive } from '../engine/constitution-effect'
import { completeWithCrystal } from '../modules/crystal'
import { autoCheckInFocusHabits } from '../modules/discipline/focus-habit-bridge'
import { useConfigStore } from './config'
import { triggerHaptic } from '../utils/platform'

/** 触觉反馈是否启用（受宪法合规覆盖 control） */
function hapticEnabled(): boolean {
  const cfg = storage.getConfig()
  return !!cfg?.interaction?.hapticFeedback || !!cfg?.complianceOverride?.hapticFeedbackOverwrite
}

export const useTimerStore = defineStore('timer', () => {
  // ---- 状态 ----
  const session = ref<FocusSession>(createSession('focus', storage.getConfig().timer.defaultDuration * 60 * 1000))
  const elapsed = ref(0)          // 当前已耗时（ms）
  const isRunning = ref(false)    // 是否正在走时
  const intervalId = ref<number | null>(null)

  // ---- 计算属性 ----
  const progress = computed(() => calcProgress(elapsed.value, session.value.plannedDuration))
  const display = computed(() => formatTimerClock(elapsed.value))
  const isFocusing = computed(() => session.value.status === 'focusing')
  const isPaused = computed(() => session.value.status === 'paused')
  const isCompleted = computed(() => session.value.status === 'completed')
  const isIdle = computed(() => session.value.status === 'idle')
  const sanctuaryResumeMode = ref<'focusing' | 'paused' | null>(null)

  // 今日完成的专注次数
  const todayCompletedCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return storage.getSessions().filter(s =>
      s.status === 'completed' && s.completedAt?.startsWith(today)
    ).length
  })

  // 达到长休息阈值（响应式接入配置）
  const longBreakDue = computed(() => {
    const configStore = useConfigStore()
    const threshold = configStore.config.timer.sessionsBeforeLongBreak
    return todayCompletedCount.value > 0 && todayCompletedCount.value % threshold === 0
  })

  // ---- 内部：计时器（基于 Date.now() 防漂移） ----
  let tickBase = 0      // 本段计时起点的 wall-clock
  let tickStartElapsed = 0 // 本段起点已累积的 elapsed

  function startTick() {
    stopTick()
    tickBase = Date.now()
    tickStartElapsed = elapsed.value

    const tickMs = 100
    intervalId.value = window.setInterval(() => {
      const now = Date.now()
      elapsed.value = tickStartElapsed + (now - tickBase)

      // 自动完成检查
      if (elapsed.value >= session.value.plannedDuration) {
        finish()
      }
    }, tickMs)
  }

  function stopTick() {
    if (intervalId.value !== null) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
    tickBase = 0
    tickStartElapsed = 0
  }

  // ---- 动作 ----
  const VALID_MODES: FocusMode[] = ['focus', 'nap', 'free']

  function setMode(mode: FocusMode, minutes: number) {
    // 边界保护：非法 mode / 非法时长回落到安全默认值，避免脏状态进入会话
    const safeMode: FocusMode = VALID_MODES.includes(mode) ? mode : 'focus'
    const safeMinutes = Number.isFinite(minutes) && minutes > 0
      ? minutes
      : storage.getConfig().timer.defaultDuration

    // 如果正在计时或暂停中，先中断当前会话（保存到历史）
    if (isRunning.value || isPaused.value) {
      interrupt()
    }
    session.value = createSession(safeMode, safeMinutes * 60 * 1000)
    elapsed.value = 0

    // 宪法门控（A2 · focus:auto-start，disable 型，elastic-exploration 默认启用）：
    // 默认约束生效（isTargetActive=true）→ 专注需用户手动开始；
    // 用户关闭该约束（isTargetActive=false）→ 选择专注模式即自动开始计时。
    // 初始化前回落 defaultActiveTargets 仍含此目标，故不会在引擎就绪前误触发。
    if (safeMode === 'focus' && !isTargetActive('focus:auto-start')) {
      start()
    }
  }

  function start() {
    if (session.value.status === 'idle' || session.value.status === 'completed' || session.value.status === 'interrupted') {
      session.value = startSession(createSession(session.value.mode, session.value.plannedDuration))
      elapsed.value = 0
      isRunning.value = true
      startTick()
      // 触觉反馈：计时开始
      triggerHaptic('light', hapticEnabled())
    } else if (session.value.status === 'paused') {
      resume()
    }
  }

  function pause() {
    if (!isFocusing.value) return
    session.value = pauseSession(session.value, elapsed.value)
    stopTick()
    isRunning.value = false
  }

  function resume() {
    if (!isPaused.value || !session.value.pausedAt) return
    const pausedNow = Date.now() - new Date(session.value.pausedAt).getTime()
    session.value = resumeSession(session.value, elapsed.value, pausedNow)
    isRunning.value = true
    startTick()
  }

  function finish() {
    if (isFocusing.value || isPaused.value) {
      const totalPaused = session.value.pausedDuration + (session.value.pausedAt
        ? Date.now() - new Date(session.value.pausedAt).getTime()
        : 0)
      session.value = completeSession(session.value, elapsed.value, totalPaused)
      stopTick()
      isRunning.value = false
      // 持久化
      storage.addSession(session.value)
      completeWithCrystal(session.value)
      // 计时↔习惯直连：专注会话完成后，自动打卡开启「专注自动打卡」的习惯
      if (session.value.mode === 'focus') {
        autoCheckInFocusHabits()
      }
      // 触觉反馈：计时结束/结晶生成
      triggerHaptic('light', hapticEnabled())
    }
  }

  function interrupt() {
    if (!isFocusing.value && !isPaused.value) return
    const totalPaused = session.value.pausedDuration + (session.value.pausedAt
      ? Date.now() - new Date(session.value.pausedAt).getTime()
      : 0)
    session.value = interruptSession(session.value, elapsed.value, totalPaused)
    stopTick()
    isRunning.value = false
    storage.addSession(session.value)
  }

  function reset() {
    stopTick()
    isRunning.value = false
    session.value = createSession(session.value.mode, session.value.plannedDuration)
    elapsed.value = 0
  }

  function pauseForSanctuary() {
    if (isFocusing.value) {
      sanctuaryResumeMode.value = 'focusing'
      pause()
      return
    }

    if (isPaused.value) {
      sanctuaryResumeMode.value = 'paused'
      return
    }

    sanctuaryResumeMode.value = null
  }

  function resumeFromSanctuary() {
    if (sanctuaryResumeMode.value === 'focusing') {
      resume()
    }

    sanctuaryResumeMode.value = null
  }

  return {
    // state
    session,
    elapsed,
    isRunning,
    // computed
    progress,
    display,
    isFocusing,
    isPaused,
    isCompleted,
    isIdle,
    todayCompletedCount,
    longBreakDue,
    // actions
    setMode,
    start,
    pause,
    resume,
    finish,
    interrupt,
    reset,
    pauseForSanctuary,
    resumeFromSanctuary,
  }
})
