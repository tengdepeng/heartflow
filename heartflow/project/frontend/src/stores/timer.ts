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
import { getLocalDateKey } from '../utils/time'

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
  const pomodoroPhase = ref<'work' | 'break'>('work') // 番茄钟当前阶段

  // ---- 计算属性 ----
  const progress = computed(() => calcProgress(elapsed.value, session.value.plannedDuration))
  const display = computed(() => formatTimerClock(elapsed.value))
  const isFocusing = computed(() => session.value.status === 'focusing')
  const isPaused = computed(() => session.value.status === 'paused')
  const isCompleted = computed(() => session.value.status === 'completed')
  const isIdle = computed(() => session.value.status === 'idle')
  const sanctuaryResumeMode = ref<'focusing' | 'paused' | null>(null)

  // 今日完成的专注次数
  // 口径：completedAt 存的是 UTC ISO 时间戳（engine/timer.ts createSession/completeSession），
  // 故「今日边界」与「记录边界」须同取本地日历日键，否则东八区 00:00–08:00 会将本地今日误判为 UTC 昨日。
  const todayCompletedCount = computed(() => {
    const today = getLocalDateKey(new Date())
    return storage.getSessions().filter(s =>
      s.status === 'completed' && s.completedAt && getLocalDateKey(new Date(s.completedAt)) === today
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

      // 自动完成检查（按模式分流）
      if (elapsed.value >= session.value.plannedDuration) {
        if (session.value.mode === 'pomodoro') {
          // 番茄钟：到时自动切换阶段（工作↔休息），继续走时
          cyclePomodoro()
        } else if (session.value.mode === 'countup') {
          // 正计时：无上限，仅持续累加 elapsed，不自动完成
          // no-op
        } else {
          finish()
        }
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
  const VALID_MODES: FocusMode[] = ['focus', 'nap', 'free', 'pomodoro', 'countdown', 'countup']

  function setMode(mode: FocusMode, minutes: number) {
    // 边界保护：非法 mode / 非法时长回落到安全默认值，避免脏状态进入会话
    const safeMode: FocusMode = VALID_MODES.includes(mode) ? mode : 'focus'
    const cfg = storage.getConfig().timer
    let safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : cfg.defaultDuration

    // 各模式时长策略
    if (safeMode === 'pomodoro') {
      // 番茄钟：工作段用传入分钟（缺省默认专注时长），休息段用配置 breakDuration
      pomodoroPhase.value = 'work'
      safeMinutes = safeMinutes || cfg.defaultDuration
    } else if (safeMode === 'countdown') {
      // 自定义倒计时：用传入分钟（缺省默认专注时长）
      safeMinutes = safeMinutes || cfg.defaultDuration
    } else if (safeMode === 'countup') {
      // 正计时：无上限，plannedDuration 设为极大值，tick 不自动完成
      safeMinutes = 99 * 60
    }

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
    // 番茄/倒计时/正计时不自动开始，交由用户手动启动。
    if (safeMode === 'focus' && !isTargetActive('focus:auto-start')) {
      start()
    }
  }

  /** 番茄钟阶段切换：工作↔休息自动循环，不落历史、不停 tick */
  function cyclePomodoro() {
    const cfg = storage.getConfig().timer
    const nextPhase: 'work' | 'break' = pomodoroPhase.value === 'work' ? 'break' : 'work'
    pomodoroPhase.value = nextPhase
    const durMin = nextPhase === 'work' ? cfg.defaultDuration : cfg.breakDuration
    session.value = startSession(createSession('pomodoro', durMin * 60 * 1000))
    elapsed.value = 0
    triggerHaptic('light', hapticEnabled())
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
    pomodoroPhase.value = 'work'
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
    pomodoroPhase,
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
