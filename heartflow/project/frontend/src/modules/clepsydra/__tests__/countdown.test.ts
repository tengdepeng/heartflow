// ============================================================
// 更漏 · 时间哨塔（倒计时）测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createCountdown,
  countdownRemaining,
  tickCountdown,
  startCountdown,
  pauseCountdown,
  resumeCountdown,
  resetCountdown,
  countdownStatusLabel,
  countdownToRecord,
  countdownRepeatLabel,
  useClepsydraCountdown,
} from '../countdown'
import type { CountdownTimer } from '../countdown'

const { mockKV } = vi.hoisted(() => ({ mockKV: new Map<string, unknown>() }))
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(k: string, def: T): T => (mockKV.has(k) ? (mockKV.get(k) as T) : def),
    setKV: (k: string, v: unknown): void => void mockKV.set(k, v),
  },
}))
beforeEach(() => mockKV.clear())

const NOW = new Date('2026-08-21T12:00:00.000Z')
const LATER = new Date('2026-08-21T12:25:00.000Z')

function timer(partial: Partial<CountdownTimer> = {}): CountdownTimer {
  return {
    id: 't1',
    label: '番茄专注',
    category: 'study',
    totalSeconds: 1500,
    remainingSeconds: 1500,
    status: 'idle',
    createdAt: NOW.toISOString(),
    startedAt: null,
    endedAt: null,
    ...partial,
  }
}

describe('createCountdown', () => {
  it('新建卡片字段齐全且时长取整', () => {
    const t = createCountdown({ label: ' 烧水 ', category: 'daily', totalSeconds: 90.6 })
    expect(t.label).toBe('烧水')
    expect(t.category).toBe('daily')
    expect(t.totalSeconds).toBe(91)
    expect(t.remainingSeconds).toBe(91)
    expect(t.status).toBe('idle')
    expect(t.startedAt).toBeNull()
  })

  it('时长下限为 1 秒', () => {
    const t = createCountdown({ label: 'x', category: 'project', totalSeconds: 0 })
    expect(t.totalSeconds).toBe(1)
  })

  it('默认单次节律，可指定周期', () => {
    const once = createCountdown({ label: 'a', category: 'daily', totalSeconds: 60 })
    expect(once.repeat).toBe('once')
    expect(once.completedCount).toBe(0)
    const daily = createCountdown({ label: 'b', category: 'daily', totalSeconds: 60, repeat: 'daily' })
    expect(daily.repeat).toBe('daily')
  })
})

describe('start / pause / resume / reset', () => {
  it('start 置为 running 并记录开始时刻', () => {
    const t = startCountdown(timer(), NOW)
    expect(t.status).toBe('running')
    expect(t.startedAt).toBe(NOW.toISOString())
  })

  it('done 状态不可再启动', () => {
    const t = startCountdown(timer({ status: 'done', endedAt: NOW.toISOString() }), NOW)
    expect(t.status).toBe('done')
  })

  it('pause 冻结剩余时长并清空开始时刻', () => {
    const running = startCountdown(timer(), NOW)
    const paused = pauseCountdown(running, LATER)
    expect(paused.status).toBe('paused')
    expect(paused.startedAt).toBeNull()
    expect(paused.remainingSeconds).toBe(1500 - 25 * 60)
  })

  it('resume 从暂停继续', () => {
    const paused = timer({ status: 'paused', remainingSeconds: 1000 })
    const resumed = resumeCountdown(paused, NOW)
    expect(resumed.status).toBe('running')
    expect(resumed.startedAt).toBe(NOW.toISOString())
  })

  it('reset 回到初始待开始', () => {
    const done = timer({ status: 'done', remainingSeconds: 0, endedAt: LATER.toISOString() })
    const r = resetCountdown(done)
    expect(r.status).toBe('idle')
    expect(r.remainingSeconds).toBe(r.totalSeconds)
    expect(r.endedAt).toBeNull()
    expect(r.startedAt).toBeNull()
  })
})

describe('countdownRemaining / tickCountdown', () => {
  it('进行中按 now 动态流逝', () => {
    const running = startCountdown(timer(), NOW)
    expect(countdownRemaining(running, LATER)).toBe(1500 - 25 * 60)
  })

  it('非 running 返回快照剩余', () => {
    const paused = timer({ status: 'paused', remainingSeconds: 800 })
    expect(countdownRemaining(paused, LATER)).toBe(800)
  })

  it('tick 到 0 置为 done 并写结束时刻', () => {
    const running = startCountdown(timer(), NOW)
    const done = tickCountdown(running, LATER)
    expect(done.status).toBe('done')
    expect(done.remainingSeconds).toBe(0)
    expect(done.endedAt).toBe(LATER.toISOString())
  })

  it('tick 未到 0 仅更新剩余', () => {
    const running = startCountdown(timer({ totalSeconds: 3600, remainingSeconds: 3600 }), NOW)
    const mid = tickCountdown(running, LATER)
    expect(mid.status).toBe('running')
    expect(mid.remainingSeconds).toBe(3600 - 25 * 60)
  })

  it('非 running 的 tick 不改变状态', () => {
    const idle = timer()
    expect(tickCountdown(idle, LATER)).toBe(idle)
  })
})

describe('周期节律（periodic repeat）', () => {
  it('周期倒计时到 0 自动重置并累计完成次数', () => {
    const running = startCountdown(timer({ repeat: 'daily' }), NOW)
    const next = tickCountdown(running, LATER)
    expect(next.status).toBe('idle')
    expect(next.remainingSeconds).toBe(next.totalSeconds)
    expect(next.completedCount).toBe(1)
    expect(next.lastCompletedAt).toBe(LATER.toISOString())
    expect(next.startedAt).toBeNull()
    expect(next.endedAt).toBeNull()
  })

  it('周期倒计时多次完成逐次累计', () => {
    let t = startCountdown(timer({ repeat: 'weekly', completedCount: 2, totalSeconds: 60, remainingSeconds: 60 }), NOW)
    t = tickCountdown(t, LATER)
    expect(t.completedCount).toBe(3)
    t = startCountdown(t, LATER)
    const t2 = new Date('2026-08-21T12:26:00.000Z')
    t = tickCountdown(t, t2)
    expect(t.completedCount).toBe(4)
  })

  it('单次倒计时到 0 保持 done 不自动重置', () => {
    const running = startCountdown(timer(), NOW)
    const done = tickCountdown(running, LATER)
    expect(done.status).toBe('done')
    expect(done.completedCount).toBeUndefined()
  })

  it('countdownRepeatLabel 文案', () => {
    expect(countdownRepeatLabel('once')).toBe('单次')
    expect(countdownRepeatLabel('daily')).toBe('每日')
    expect(countdownRepeatLabel('weekly')).toBe('每周')
    expect(countdownRepeatLabel('monthly')).toBe('每月')
    expect(countdownRepeatLabel('yearly')).toBe('每年')
    expect(countdownRepeatLabel(undefined)).toBe('单次')
  })

  it('reset 保留周期节律与完成次数', () => {
    const done = timer({ status: 'done', repeat: 'daily', completedCount: 5, lastCompletedAt: LATER.toISOString() })
    const r = resetCountdown(done)
    expect(r.status).toBe('idle')
    expect(r.repeat).toBe('daily')
    expect(r.completedCount).toBe(5)
    expect(r.lastCompletedAt).toBe(LATER.toISOString())
  })

  it('tickAll 周期完成不进入 done 列表但累计次数', () => {
    const { timers, add, start, tickAll } = useClepsydraCountdown()
    const a = add({ label: '烧水', category: 'daily', totalSeconds: 60, repeat: 'daily' })
    start(a.id, NOW)
    const done = tickAll(new Date('2026-08-21T12:02:00.000Z'))
    expect(done).toHaveLength(0)
    const t = timers.value.find(x => x.id === a.id)!
    expect(t.status).toBe('idle')
    expect(t.completedCount).toBe(1)
    expect(t.lastCompletedAt).toBe('2026-08-21T12:02:00.000Z')
  })
})

describe('countdownStatusLabel', () => {
  it('四种状态文案', () => {
    expect(countdownStatusLabel('idle')).toBe('待开始')
    expect(countdownStatusLabel('running')).toBe('进行中')
    expect(countdownStatusLabel('paused')).toBe('已暂停')
    expect(countdownStatusLabel('done')).toBe('已完成')
  })
})

describe('countdownToRecord', () => {
  it('done 倒计时转为工作记录（正计时 → 耕耘计时）', () => {
    const done = timer({ status: 'done', endedAt: LATER.toISOString() })
    const r = countdownToRecord(done, LATER)
    expect(r).not.toBeNull()
    expect(r!.category).toBe('study')
    expect(r!.durationSeconds).toBe(1500)
    expect(r!.sourceType).toBe('auto')
    expect(r!.note).toBe('番茄专注')
    expect(new Date(r!.endedAt!).getTime() - new Date(r!.startedAt).getTime()).toBe(1500 * 1000)
  })

  it('非 done 返回 null', () => {
    expect(countdownToRecord(timer(), NOW)).toBeNull()
  })
})

describe('useClepsydraCountdown 组合式', () => {
  it('add / remove 维护列表并持久化', () => {
    const { timers, add, remove } = useClepsydraCountdown()
    const t = add({ label: '专注', category: 'create', totalSeconds: 600 })
    expect(timers.value).toHaveLength(1)
    expect(mockKV.has('hf:clepsydra_countdowns')).toBe(true)
    remove(t.id)
    expect(timers.value).toHaveLength(0)
  })

  it('start / pause / resume / reset 更新状态', () => {
    const { timers, add, start, pause, resume, reset } = useClepsydraCountdown()
    const t = add({ label: 'x', category: 'daily', totalSeconds: 3600 })
    start(t.id, NOW)
    expect(timers.value[0]!.status).toBe('running')
    pause(t.id, LATER)
    expect(timers.value[0]!.status).toBe('paused')
    expect(timers.value[0]!.remainingSeconds).toBe(3600 - 25 * 60)
    resume(t.id, LATER)
    expect(timers.value[0]!.status).toBe('running')
    reset(t.id)
    expect(timers.value[0]!.status).toBe('idle')
    expect(timers.value[0]!.remainingSeconds).toBe(3600)
  })

  it('tickAll 推进进行中并返回完成列表', () => {
    const { timers, add, start, tickAll } = useClepsydraCountdown()
    const a = add({ label: 'a', category: 'study', totalSeconds: 60 })
    const b = add({ label: 'b', category: 'project', totalSeconds: 3600 })
    start(a.id, NOW)
    start(b.id, NOW)
    const done = tickAll(new Date('2026-08-21T12:02:00.000Z'))
    expect(done).toHaveLength(1)
    expect(done[0]!.id).toBe(a.id)
    expect(timers.value.find(t => t.id === a.id)!.status).toBe('done')
    expect(timers.value.find(t => t.id === b.id)!.status).toBe('running')
  })
})
