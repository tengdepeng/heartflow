// ============================================================
// 时间线 · 日历显示偏好（INCR-503）测试
// 覆盖：默认矩阵 / 单项设置持久化 / 重置 / 脏数据归一 /
//       星期表头随首日切换 / 月历网格（与 getMonthDays 等价、六行补齐、周一起始）
// 键 hf:calendar_prefs，本地私有、不触云。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  useCalendarPrefs,
  reloadCalendarPrefs,
  weekdaysFor,
  buildMonthGrid,
  DEFAULT_CALENDAR_PREFS,
} from '../calendar-prefs'
import { getMonthDays } from '../../../utils/time'
import { storage } from '../../../engine/storage'

const KEY = 'hf:calendar_prefs'

describe('calendar-prefs · 日历显示偏好', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadCalendarPrefs()
  })

  it('默认矩阵：周日起始、显示时长条与今日徽章', () => {
    const { prefs } = useCalendarPrefs()
    expect(prefs.value).toEqual(DEFAULT_CALENDAR_PREFS)
    expect(prefs.value.weekStart).toBe(0)
    expect(prefs.value.showFocusBar).toBe(true)
    expect(prefs.value.showTodayBadge).toBe(true)
    expect(prefs.value.sixRow).toBe(false)
  })

  it('setPref 单项落盘，重载仍生效', () => {
    const { setPref } = useCalendarPrefs()
    setPref('weekStart', 1)
    setPref('sixRow', true)
    setPref('boldNumber', true)
    expect(storage.getKV(KEY, null)).toMatchObject({ weekStart: 1, sixRow: true, boldNumber: true })

    reloadCalendarPrefs()
    const { prefs } = useCalendarPrefs()
    expect(prefs.value.weekStart).toBe(1)
    expect(prefs.value.sixRow).toBe(true)
    expect(prefs.value.boldNumber).toBe(true)
  })

  it('reset 恢复默认', () => {
    const { setPref, reset, prefs } = useCalendarPrefs()
    setPref('compact', true)
    setPref('numberBackground', true)
    reset()
    expect(prefs.value).toEqual(DEFAULT_CALENDAR_PREFS)
  })

  it('脏数据按字段归一（非法 weekStart 回落、非布尔回落）', () => {
    storage.setKV(KEY, { weekStart: 9, sixRow: 'yes', showFocusBar: false })
    reloadCalendarPrefs()
    const { prefs } = useCalendarPrefs()
    expect(prefs.value.weekStart).toBe(0)
    expect(prefs.value.sixRow).toBe(false)
    expect(prefs.value.showFocusBar).toBe(false)
  })

  it('weekdaysFor 随首日切换', () => {
    expect(weekdaysFor(0)).toEqual(['日', '一', '二', '三', '四', '五', '六'])
    expect(weekdaysFor(1)).toEqual(['一', '二', '三', '四', '五', '六', '日'])
  })

  it('buildMonthGrid 默认与 getMonthDays 完全等价', () => {
    const grid = buildMonthGrid(2026, 9, 0, false)
    const legacy = getMonthDays(2026, 9)
    expect(grid.length).toBe(legacy.length)
    expect(grid.map((c) => c.date.getTime())).toEqual(legacy.map((c) => c.date.getTime()))
    expect(grid.map((c) => c.isCurrentMonth)).toEqual(legacy.map((c) => c.isCurrentMonth))
  })

  it('sixRow 补齐到 42 格', () => {
    expect(buildMonthGrid(2026, 9, 0, true)).toHaveLength(42)
  })

  it('weekStart=1 时首格为周一', () => {
    const grid = buildMonthGrid(2026, 9, 1, false)
    expect(grid[0].date.getDay()).toBe(1)
    // 2026-10-01 为周四 → 周一起始需前补 3 天（9/28 周一）
    expect(grid[0].date.getMonth()).toBe(8)
    expect(grid[0].date.getDate()).toBe(28)
  })
})
