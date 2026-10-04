// ============================================================
// LivingRoom · 时区治理（INCR-466 系列）
//
// 覆盖：
//   1. 守卫：测试进程时区须为东八区
//   2. 今日活动统计（专注/笔记/目标完成）按「本地日历日」口径，
//      跨越 UTC 日界（00:00–08:00 本地）的记录须归入本地当日。
//
// 关键取舍：
//   - engine/storage 整体 mock，只钉 sessions/notes/goals 受控样本；
//     getKV/getAdvisorMessages 最小桩，避免加载真实持久化与 Pinia。
//   - 断言走 DOM（.activity-card 的 .activity-card__value），与 Crystal/
//     Entrance/Courtyard/HealthPanel 的 DOM 断言惯例一致，避开 <script setup>
//     公开实例不含内部 computed 的 TS2339 坑。
//
// 自洽簇：getTodayDateStr()（today 边界）与 startedAt/createdAt/completedAt
// 三处日志切片同为 UTC 切日，须整组迁移（铁律 2）——只改边界会把记录算到
// 「前一天」，比改之前更糟。
// ============================================================

process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// vi.hoisted：受控样本在 import 之前就绪
// 跨 UTC 日界：UTC 2026-03-14T19:00:00Z → 东八区本地 2026-03-15 03:00（本地当日）
// 本地昨日：UTC 2026-03-14T15:00:00Z → 东八区本地 2026-03-14 23:00（本地昨日）
const hoisted = vi.hoisted(() => {
  const crossDay = '2026-03-14T19:00:00.000Z' // 本地 03-15 03:00
  const localYest = '2026-03-14T15:00:00.000Z' // 本地 03-14 23:00
  return {
    sessions: [
      { id: 's_today', startedAt: crossDay, elapsed: 3600, plannedDuration: 3600 },
      { id: 's_yest', startedAt: localYest, elapsed: 1800, plannedDuration: 1800 },
    ],
    notes: [{ id: 'n_today', createdAt: crossDay, title: '跨日笔记' }],
    goals: [{ id: 'g_today', completedAt: crossDay, status: 'bloom' }],
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getSessions: () => hoisted.sessions,
    getNotes: () => hoisted.notes,
    getGoals: () => hoisted.goals,
    getAdvisorMessages: () => [],
    getKV: () => null,
    setKV: () => {},
  },
}))

async function getWrapper() {
  const { default: Panel } = await import('../LivingRoom.vue')
  return mount(Panel)
}

beforeEach(() => {
  // 还原受控样本（防止潜在串扰）
  hoisted.sessions = [
    { id: 's_today', startedAt: '2026-03-14T19:00:00.000Z', elapsed: 3600, plannedDuration: 3600 },
    { id: 's_yest', startedAt: '2026-03-14T15:00:00.000Z', elapsed: 1800, plannedDuration: 1800 },
  ]
  hoisted.notes = [{ id: 'n_today', createdAt: '2026-03-14T19:00:00.000Z', title: '跨日笔记' }]
  hoisted.goals = [{ id: 'g_today', completedAt: '2026-03-14T19:00:00.000Z', status: 'bloom' }]
  localStorage.clear()
})

describe('LivingRoom · 今日活动统计本地日历日口径', () => {
  it('守卫：测试进程须为东八区', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(zone).toMatch(/Asia\/(Shanghai|Macau|Hong_Kong)|\+08:00/)
  })

  it('今日活动统计按本地日口径，跨 UTC 日界记录归入本地当日', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 钉死「现在」为东八区本地 2026-03-15 10:00（UTC 2026-03-15 02:00，本地日=UTC 日）
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))

    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.activity-card')
    // 4 张卡：专注次数 / 专注时长 / 笔记 / 目标完成
    expect(cards.length, '活动概览应有 4 张卡片').toBe(4)
    // 跨 UTC 日界记录（本地 03-15 03:00）须计入「今日」
    expect(cards[0].find('.activity-card__value').text(), '跨 UTC 日界专注会话须计入今日').toBe('1')
    expect(cards[2].find('.activity-card__value').text(), '跨 UTC 日界笔记须计入今日').toBe('1')
    expect(cards[3].find('.activity-card__value').text(), '跨 UTC 日界目标完成须计入今日').toBe('1')
    // 本地昨日（03-14 23:00）不计入今日；专注次数仍只为 1
    expect(cards[1].find('.activity-card__value').text(), '专注时长应为 60 分（仅跨日会话计入）').toBe('60')

    vi.useRealTimers()
  })
})
