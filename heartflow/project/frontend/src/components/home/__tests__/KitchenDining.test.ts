// ============================================================
// KitchenDining（深夜食堂）· 时区治理（INCR-466 系列）
//
// 覆盖：
//   1. 守卫：测试进程时区须为东八区
//   2. 今日餐食数 todayMealCount 按「本地日历日」口径，
//      跨越 UTC 日界（00:00–08:00 本地）的饮食记录须计入本地当日。
//
// 关键取舍：
//   - engine/storage 整体 mock，getKV 按 key 返回受控 meals（其余 key 回默认值），
//     setKV 空实现，避免加载真实持久化与 Pinia。
//   - 断言走 DOM（.kitchen-today-meals b），与 Crystal/Entrance/Courtyard/
//     HealthPanel/LivingRoom 的 DOM 断言惯例一致，避开 <script setup> 公开实例
//     不含内部 computed 的 TS2339 坑。
//   - 组件 onMounted 会起 setInterval（模拟炖煮）；fake timers 下不会自触发，
//     断言后先 unmount（触发 onUnmounted 清定时器）再 useRealTimers。
//
// 自洽簇：today 边界与 m.at（存的是 toISOString UTC 时间戳）同为 UTC 切日，
// 须整组迁移（铁律 2）——只改边界会把记录算到「前一天」。
// ============================================================

process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// vi.hoisted：受控样本在 import 之前就绪
// 跨 UTC 日界：UTC 2026-03-14T19:00:00Z → 东八区本地 2026-03-15 03:00（本地当日）
// 本地前日：UTC 2026-03-13T15:00:00Z → 东八区本地 2026-03-13 23:00（非本地当日）
const hoisted = vi.hoisted(() => {
  return {
    meals: [
      { id: 'm_today', type: '晚餐', name: '跨日面', at: '2026-03-14T19:00:00.000Z' },
      { id: 'm_prev', type: '午餐', name: '前日饭', at: '2026-03-13T15:00:00.000Z' },
    ],
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: unknown) => (key === 'hf:home:meals' ? hoisted.meals : def),
    setKV: () => {},
  },
}))

async function getWrapper() {
  const { default: Panel } = await import('../KitchenDining.vue')
  return mount(Panel)
}

beforeEach(() => {
  hoisted.meals = [
    { id: 'm_today', type: '晚餐', name: '跨日面', at: '2026-03-14T19:00:00.000Z' },
    { id: 'm_prev', type: '午餐', name: '前日饭', at: '2026-03-13T15:00:00.000Z' },
  ]
  localStorage.clear()
})

describe('KitchenDining · 今日餐食数本地日历日口径', () => {
  it('守卫：测试进程须为东八区', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(zone).toMatch(/Asia\/(Shanghai|Macau|Hong_Kong)|\+08:00/)
  })

  it('今日餐食数按本地日口径，跨 UTC 日界记录计入本地当日', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 钉死「现在」为东八区本地 2026-03-15 10:00（UTC 2026-03-15 02:00，本地日=UTC 日）
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))

    const wrapper = await getWrapper()
    // 模板：今日已记录 <b>{{ todayMealCount }}</b> 餐
    const countEl = wrapper.find('.kitchen-today-meals b')
    expect(countEl.exists(), '应有今日餐食数元素').toBe(true)
    // 跨 UTC 日界记录（本地 03-15 03:00）须计入「今日」，本地前日（03-13 23:00）不计
    expect(countEl.text(), '跨 UTC 日界饮食记录须计入今日').toBe('1')

    wrapper.unmount()
    vi.useRealTimers()
  })
})
