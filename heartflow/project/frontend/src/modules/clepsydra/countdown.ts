// ============================================================
// 更漏 · 时间哨塔（倒计时）
// ------------------------------------------------------------
// 借鉴「时光提醒」：倒计时卡片 + 正计时转换。全部本地计算，
// 守宪法：计时中不发出任何提醒；倒计时结束静默待转工作记录。
// 纯函数核心（可单测）+ 轻量持久化，供 ClepsydraPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { WorkCategory, WorkRecord } from './clepsydra'
import { WORK_CATEGORY_META, genId } from './clepsydra'

// ============================================================
// 类型
// ============================================================

export type CountdownStatus = 'idle' | 'running' | 'paused' | 'done'

/** 周期节律（once=单次；其余为周期性重复） */
export type CountdownRepeat = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'

/** 一条倒计时卡片 */
export interface CountdownTimer {
  id: string
  /** 名称（如「番茄专注」「烧水」） */
  label: string
  /** 工作分类 */
  category: WorkCategory
  /** 总时长（秒） */
  totalSeconds: number
  /** 剩余时长（秒，进行中为快照，动态流逝见 countdownRemaining） */
  remainingSeconds: number
  status: CountdownStatus
  createdAt: string
  /** 当前这段运行的开始时刻（非 running 为 null） */
  startedAt: string | null
  /** 完成时刻（done 时写入） */
  endedAt: string | null
  /** 周期节律（缺省单次） */
  repeat?: CountdownRepeat
  /** 已完成次数（周期节律累计） */
  completedCount?: number
  /** 上次完成时刻 */
  lastCompletedAt?: string | null
}

export const COUNTDOWN_STORAGE_KEY = 'hf:clepsydra_countdowns'

/** 周期节律元信息 */
export const COUNTDOWN_REPEAT_META: Record<CountdownRepeat, { label: string; icon: string }> = {
  once: { label: '单次', icon: '⏱' },
  daily: { label: '每日', icon: '🔁' },
  weekly: { label: '每周', icon: '📅' },
  monthly: { label: '每月', icon: '🌙' },
  yearly: { label: '每年', icon: '🎂' },
}

/** 周期文案（供 UI 展示） */
export function countdownRepeatLabel(repeat?: CountdownRepeat): string {
  return COUNTDOWN_REPEAT_META[repeat ?? 'once'].label
}

// ============================================================
// 纯函数（可单测）
// ============================================================

/** 新建一条倒计时卡片 */
export function createCountdown(input: {
  label: string
  category: WorkCategory
  totalSeconds: number
  repeat?: CountdownRepeat
}): CountdownTimer {
  const total = Math.max(1, Math.round(input.totalSeconds))
  return {
    id: genId(),
    label: input.label.trim(),
    category: input.category,
    totalSeconds: total,
    remainingSeconds: total,
    status: 'idle',
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    repeat: input.repeat ?? 'once',
    completedCount: 0,
    lastCompletedAt: null,
  }
}

/** 进行中倒计时的实时剩余秒数（含动态流逝） */
export function countdownRemaining(timer: CountdownTimer, now: Date): number {
  if (timer.status !== 'running' || !timer.startedAt) return timer.remainingSeconds
  const elapsed = Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000)
  return Math.max(0, timer.remainingSeconds - elapsed)
}

/** 推进倒计时（到 0 置为 done；周期节律自动重置并累计完成次数） */
export function tickCountdown(timer: CountdownTimer, now: Date): CountdownTimer {
  if (timer.status !== 'running') return timer
  const remaining = countdownRemaining(timer, now)
  if (remaining <= 0) {
    const base: CountdownTimer = { ...timer, remainingSeconds: 0, status: 'done', endedAt: now.toISOString() }
    if (timer.repeat && timer.repeat !== 'once') {
      return {
        ...base,
        status: 'idle',
        remainingSeconds: base.totalSeconds,
        completedCount: (base.completedCount || 0) + 1,
        lastCompletedAt: now.toISOString(),
        startedAt: null,
        endedAt: null,
      }
    }
    return base
  }
  return { ...timer, remainingSeconds: remaining }
}

/** 开始（idle/paused → running） */
export function startCountdown(timer: CountdownTimer, now: Date): CountdownTimer {
  if (timer.status === 'done') return timer
  return { ...timer, status: 'running', startedAt: now.toISOString() }
}

/** 暂停（running → paused，冻结剩余） */
export function pauseCountdown(timer: CountdownTimer, now: Date): CountdownTimer {
  if (timer.status !== 'running') return timer
  return {
    ...timer,
    remainingSeconds: countdownRemaining(timer, now),
    status: 'paused',
    startedAt: null,
  }
}

/** 继续（paused → running） */
export function resumeCountdown(timer: CountdownTimer, now: Date): CountdownTimer {
  if (timer.status !== 'paused') return timer
  return { ...timer, status: 'running', startedAt: now.toISOString() }
}

/** 重置（回到初始待开始） */
export function resetCountdown(timer: CountdownTimer): CountdownTimer {
  return {
    ...timer,
    remainingSeconds: timer.totalSeconds,
    status: 'idle',
    startedAt: null,
    endedAt: null,
  }
}

/** 状态文案（供 UI 展示） */
export function countdownStatusLabel(status: CountdownStatus): string {
  switch (status) {
    case 'running': return '进行中'
    case 'paused': return '已暂停'
    case 'done': return '已完成'
    default: return '待开始'
  }
}

/** 倒计时完成 → 静默转为一条工作记录（正计时 → 耕耘计时） */
export function countdownToRecord(timer: CountdownTimer, now: Date): WorkRecord | null {
  if (timer.status !== 'done') return null
  const end = timer.endedAt ? new Date(timer.endedAt) : now
  const start = new Date(end.getTime() - timer.totalSeconds * 1000)
  return {
    id: genId(),
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationSeconds: timer.totalSeconds,
    category: timer.category,
    sourceType: 'auto',
    intensity: WORK_CATEGORY_META[timer.category].intensity,
    note: timer.label,
    createdAt: end.toISOString(),
  }
}

// ============================================================
// 组合式 API（持久化）
// ============================================================

function loadCountdowns(): CountdownTimer[] {
  try {
    return storage.getKV<CountdownTimer[]>(COUNTDOWN_STORAGE_KEY, [])
  } catch {
    return []
  }
}

export function useClepsydraCountdown() {
  const timers = ref<CountdownTimer[]>(loadCountdowns())

  function save(): void {
    storage.setKV(COUNTDOWN_STORAGE_KEY, timers.value)
  }

  function add(input: {
    label: string
    category: WorkCategory
    totalSeconds: number
    repeat?: CountdownRepeat
  }): CountdownTimer {
    const t = createCountdown(input)
    timers.value.push(t)
    save()
    return t
  }

  function update(timer: CountdownTimer): void {
    const idx = timers.value.findIndex(t => t.id === timer.id)
    if (idx === -1) return
    timers.value[idx] = timer
    save()
  }

  function remove(id: string): void {
    timers.value = timers.value.filter(t => t.id !== id)
    save()
  }

  function start(id: string, now = new Date()): void {
    const t = timers.value.find(x => x.id === id)
    if (t) update(startCountdown(t, now))
  }

  function pause(id: string, now = new Date()): void {
    const t = timers.value.find(x => x.id === id)
    if (t) update(pauseCountdown(t, now))
  }

  function resume(id: string, now = new Date()): void {
    const t = timers.value.find(x => x.id === id)
    if (t) update(resumeCountdown(t, now))
  }

  function reset(id: string): void {
    const t = timers.value.find(x => x.id === id)
    if (t) update(resetCountdown(t))
  }

  /** 推进所有进行中倒计时（每秒调用），返回本次完成的列表 */
  function tickAll(now = new Date()): CountdownTimer[] {
    const done: CountdownTimer[] = []
    for (let i = 0; i < timers.value.length; i++) {
      const t = timers.value[i]
      if (t.status === 'running') {
        const next = tickCountdown(t, now)
        if (next.status === 'done') done.push(next)
        timers.value[i] = next
      }
    }
    if (done.length > 0) save()
    return done
  }

  return {
    timers: computed(() => timers.value),
    add,
    remove,
    start,
    pause,
    resume,
    reset,
    tickAll,
  }
}
