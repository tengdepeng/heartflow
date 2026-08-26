// ============================================================
// 计时↔习惯直连 · 专注完成自动打卡桥测试
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { useDisciplineWorkshop } from '../workshop'
import { useDisciplineBridge } from '../workshop-bridge'
import { autoCheckInFocusHabits } from '../focus-habit-bridge'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

describe('计时↔习惯直连 · 专注完成自动打卡', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    // 重置共享的单例习惯状态
    useDisciplineWorkshop().habits.value = []
  })

  function makeHabit(title: string, autoCheckIn: boolean, enabled = true) {
    const ws = useDisciplineWorkshop()
    const h = ws.addHabit(title, '', '📌', 'easy', 'daily', 1)
    ws.updateHabit(h.id, { enabled, autoCheckInOnFocus: autoCheckIn })
    return h
  }

  it('专注完成自动打卡开启「专注自动打卡」的习惯', () => {
    const a = makeHabit('写作', true)
    makeHabit('阅读', false)
    const checked = autoCheckInFocusHabits()
    expect(checked).toEqual(['写作'])
    const aNow = useDisciplineBridge().habits.value.find(h => h.id === a.id)!
    expect(aNow.completedDates).toContain(today())
  })

  it('仅作用于启用且开启的习惯（禁用习惯不打卡）', () => {
    makeHabit('已禁用', true, false)
    const checked = autoCheckInFocusHabits()
    expect(checked).toEqual([])
  })

  it('幂等：今日已打卡的习惯不会被重复计数', () => {
    const a = makeHabit('写作', true)
    expect(autoCheckInFocusHabits()).toEqual(['写作'])
    // 第二次调用：已打卡 → 不再返回，不重复计数
    expect(autoCheckInFocusHabits()).toEqual([])
    const aNow = useDisciplineBridge().habits.value.find(h => h.id === a.id)!
    expect(aNow.totalCompleted).toBe(1)
  })

  it('返回所有被自动打卡的习惯标题', () => {
    makeHabit('写作', true)
    makeHabit('冥想', true)
    makeHabit('阅读', false)
    const checked = autoCheckInFocusHabits()
    expect(checked.sort()).toEqual(['写作', '冥想'])
  })

  it('关闭开关后不再自动打卡', () => {
    const a = makeHabit('写作', true)
    expect(autoCheckInFocusHabits()).toEqual(['写作'])
    useDisciplineWorkshop().updateHabit(a.id, { autoCheckInOnFocus: false })
    expect(autoCheckInFocusHabits()).toEqual([])
    const aNow = useDisciplineBridge().habits.value.find(h => h.id === a.id)!
    expect(aNow.completedDates).toHaveLength(1)
  })
})
