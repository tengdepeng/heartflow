import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import {
  isValidTime,
  parseTime,
  formatTime,
  sortSlots,
  classifySlots,
  nextSlot,
  msUntilNextSlot,
  dayProgress,
  slotPercent,
  defaultMultiReminder,
  useMultiReminder,
  DEFAULT_SLOTS,
} from '../multi-reminder'
import type { ReminderSlot } from '../multi-reminder'

beforeEach(() => {
  const m = createMockStorage()
  ;(globalThis as any).localStorage = m
  invalidateCache()
  useMultiReminder()._reset()
})

const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m)

function slot(id: string, time: string, enabled = true): ReminderSlot {
  return { id, label: id.toUpperCase(), time, enabled, icon: '⏰' }
}

describe('纯函数', () => {
  it('isValidTime / parseTime', () => {
    expect(isValidTime('09:05')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('9:5')).toBe(false)
    expect(isValidTime('abc')).toBe(false)
    expect(parseTime('09:05')).toBe(545)
    expect(parseTime('00:00')).toBe(0)
    expect(parseTime('bad')).toBe(null)
  })

  it('formatTime 补零与取模', () => {
    expect(formatTime(545)).toBe('09:05')
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(1440)).toBe('00:00')
    expect(formatTime(-60)).toBe('23:00')
  })

  it('sortSlots 按时刻升序，非法时刻置后', () => {
    const s = [slot('b', '18:00'), slot('a', '07:00'), slot('x', 'bad')]
    expect(sortSlots(s).map((v) => v.id)).toEqual(['a', 'b', 'x'])
  })

  it('classifySlots 打 passed / next / upcoming / off', () => {
    const s = [slot('a', '07:00'), slot('b', '12:00'), slot('c', '18:00'), slot('d', '20:00', false)]
    const got = classifySlots(s, at(13, 0)).map((c) => `${c.slot.id}:${c.status}`)
    expect(got).toEqual(['a:passed', 'b:passed', 'c:next', 'd:off'])
  })

  it('nextSlot 今日无剩余时回环到明日首个', () => {
    const s = defaultMultiReminder().slots
    expect(nextSlot(s, at(23, 50))?.id).toBe('mr-morning')
    expect(nextSlot(s, at(8, 0))?.id).toBe('mr-noon')
  })

  it('msUntilNextSlot 同日与跨日回环', () => {
    const s = [slot('a', '10:00'), slot('b', '08:00')]
    expect(msUntilNextSlot(s, at(9, 0))).toBe(3600_000)
    expect(msUntilNextSlot(s, at(11, 0))).toBe(21 * 3600_000)
    expect(msUntilNextSlot([slot('x', '10:00', false)], at(9, 0))).toBe(0)
  })

  it('dayProgress / slotPercent', () => {
    expect(dayProgress(at(12, 0))).toBeCloseTo(0.5, 5)
    expect(slotPercent(slot('a', '12:00'))).toBeCloseTo(50, 5)
    expect(slotPercent(slot('a', 'bad'))).toBe(0)
  })
})

describe('useMultiReminder CRUD + 持久化', () => {
  it('默认时段与内置数量一致', () => {
    const mr = useMultiReminder()
    expect(mr.slots.value.length).toBe(DEFAULT_SLOTS.length)
  })

  it('addSlot 校验非法输入并按时刻排序', () => {
    const mr = useMultiReminder()
    expect(mr.addSlot({ label: '', time: '10:00' })).toBe(null)
    expect(mr.addSlot({ label: '测试', time: '99:99' })).toBe(null)
    const created = mr.addSlot({ label: '下午茶', time: '16:00', icon: '🍵' })
    expect(created).not.toBe(null)
    const times = mr.slots.value.map((s) => s.time)
    expect(times).toEqual([...times].sort())
  })

  it('toggleSlot / updateSlot（非法时刻保留原值）/ removeSlot', () => {
    const mr = useMultiReminder()
    const first = mr.slots.value[0]
    mr.toggleSlot(first.id)
    expect(mr.slots.value.find((s) => s.id === first.id)!.enabled).toBe(!first.enabled)

    mr.updateSlot(first.id, { time: 'bad' })
    expect(mr.slots.value.find((s) => s.id === first.id)!.time).toBe(first.time)

    mr.updateSlot(first.id, { time: '05:15' })
    expect(mr.slots.value.find((s) => s.id === first.id)!.time).toBe('05:15')

    mr.removeSlot(first.id)
    expect(mr.slots.value.find((s) => s.id === first.id)).toBeUndefined()
  })

  it('新增写入 hf:multi_reminder', () => {
    const mr = useMultiReminder()
    mr.addSlot({ label: '自定义', time: '11:11' })
    const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
    const kv = JSON.parse(raw).kvStore
    expect(Array.isArray(kv['hf:multi_reminder'].slots)).toBe(true)
    expect(kv['hf:multi_reminder'].slots.some((s: any) => s.label === '自定义')).toBe(true)
  })
})
