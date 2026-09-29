// ============================================================
// 系统桌面小组件（desktop-widget）单元测试
// 组合式默认态 / 非 Tauri 环境优雅降级 / 快照组合结构
// ============================================================

import { describe, expect, it } from 'vitest'
import { useDesktopWidget } from '../index'
import { composeWidgetSnapshot, WIDGET_QUOTES } from '../snapshot'

describe('useDesktopWidget 基础', () => {
  it('默认未固定、非小组件窗', () => {
    const dw = useDesktopWidget()
    expect(dw.pinned.value).toBe(false)
    expect(dw.isDesktopWidgetWindow.value).toBe(false)
  })

  it('非 Tauri 环境下 pinToDesktop 优雅降级（返回 false 且不改状态）', async () => {
    const dw = useDesktopWidget()
    const ok = await dw.pinToDesktop()
    expect(ok).toBe(false)
    expect(dw.pinned.value).toBe(false)
  })

  it('非 Tauri 环境下 togglePinned 恒为 false', async () => {
    const dw = useDesktopWidget()
    expect(await dw.togglePinned()).toBe(false)
    expect(dw.pinned.value).toBe(false)
  })

  it('detectDesktopWidgetWindow 在非 Tauri 环境静默失败', async () => {
    const dw = useDesktopWidget()
    await dw.detectDesktopWidgetWindow()
    expect(dw.isDesktopWidgetWindow.value).toBe(false)
  })
})

describe('composeWidgetSnapshot', () => {
  it('quoteOfDay 确定性：同一时间戳恒取同一条', () => {
    const ts = 1760000000000
    const a = composeWidgetSnapshot.quoteOfDay(ts)
    const b = composeWidgetSnapshot.quoteOfDay(ts)
    expect(a).toEqual(b)
    expect(WIDGET_QUOTES).toContain(a)
  })

  it('seasonOf 覆盖四季边界', () => {
    expect(composeWidgetSnapshot.seasonOf(new Date(2026, 3, 10)).label).toContain('春')
    expect(composeWidgetSnapshot.seasonOf(new Date(2026, 6, 15)).label).toContain('夏')
    expect(composeWidgetSnapshot.seasonOf(new Date(2026, 9, 25)).label).toContain('秋')
    expect(composeWidgetSnapshot.seasonOf(new Date(2026, 0, 10)).label).toContain('冬')
  })

  it('build 产出完整快照结构：心锚明细截 6 条、anchorTop 取前 3、进度钳 0~100', () => {
    const snap = composeWidgetSnapshot.build({
      anchors: [
        { title: '甲', daysLeft: 3 },
        { title: '乙', daysLeft: 9 },
        { title: '丙', daysLeft: 15 },
        { title: '丁', daysLeft: 21 },
        { title: '戊', daysLeft: 30 },
        { title: '己', daysLeft: 45 },
        { title: '庚', daysLeft: 60 },
      ],
      timer: { status: '⏳ 专注进行中', clock: '12:34', progress: 123.6 },
      emotion: { todayCount: 3, lastMood: '☀️ 平静' },
      note: '  记下一个灵感  ',
    })
    expect(snap.quoteText.length).toBeGreaterThan(0)
    expect(snap.quoteAuthor.length).toBeGreaterThan(0)
    expect(snap.seasonLabel.length).toBeGreaterThan(0)
    expect(snap.anchorTop).toEqual(['甲', '乙', '丙'])
    expect(snap.anchors).toHaveLength(6)
    expect(snap.anchors[0]).toEqual({ title: '甲', daysLeft: 3 })
    expect(snap.timerStatus).toBe('⏳ 专注进行中')
    expect(snap.timer).toEqual({ status: '⏳ 专注进行中', clock: '12:34', progress: 100 })
    expect(snap.emotion).toEqual({ todayCount: 3, lastMood: '☀️ 平静' })
    expect(snap.note).toEqual({ text: '记下一个灵感' })
    expect(typeof snap.updatedAt).toBe('number')
  })

  it('build 进度下限钳 0', () => {
    const snap = composeWidgetSnapshot.build({
      anchors: [],
      timer: { status: '🔒 等待开始', clock: '00:00', progress: -5 },
    })
    expect(snap.timer.progress).toBe(0)
    expect(snap.anchors).toEqual([])
    expect(snap.anchorTop).toEqual([])
    // 情绪/便签缺省时走空兜底
    expect(snap.emotion).toEqual({ todayCount: 0, lastMood: '' })
    expect(snap.note).toEqual({ text: '' })
  })
})
