// ============================================================
// HealthPanel · 时区治理（INCR-466 系列）
//
// 覆盖：
//   1. 守卫：测试进程时区须为东八区（Asia/Shanghai|Macau|Hong_Kong 或 +08:00）
//   2. 运动周图表 exerciseChart 按「本地日历日」分桶，
//      跨越 UTC 日界（00:00–08:00 本地）的日志须归入本地当日。
//
// 关键取舍：
//   - useGuard / useHealth（共鸣桥）全部 mock，只把 bodyLogs 钉成受控样本；
//     其余 computed（storageSize / dataIntegrity / permissionLights 等）
//     用最小桩跑通挂载，不引入 Pinia 重依赖。
//   - exerciseChart 为 computed，直接读 wrapper.vm.exerciseChart 比解析
//     .hc-spark 的 title 更稳。
// ============================================================

process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// vi.hoisted：bodyLogs 样本在 import 之前就要就绪
const hoisted = vi.hoisted(() => {
  // A：UTC 2026-03-14T19:00:00Z → 东八区本地 2026-03-15 03:00（跨 UTC 日界）
  // B：UTC 2026-03-13T15:00:00Z → 东八区本地 2026-03-13 23:00
  const seed = [
    { id: 'ex_a', type: 'exercise', at: '2026-03-14T19:00:00.000Z', value: { minutes: 45 } },
    { id: 'ex_b', type: 'exercise', at: '2026-03-13T15:00:00.000Z', value: { minutes: 30 } },
  ]
  return { bodyLogs: seed }
})

vi.mock('../../../modules/guard', () => ({
  useGuard: () => ({
    contacts: ref([]),
    permissionLights: ref([]),
    crashLogs: ref([]),
    isKeyPresent: () => true,
    addContact: vi.fn(),
    removeContact: vi.fn(),
    saveContacts: vi.fn(),
    cyclePermissionStatus: vi.fn(),
    addCrashLog: vi.fn(),
    removeCrashLog: vi.fn(),
    clearCrashLogs: vi.fn(),
  }),
}))

vi.mock('../../../resonance/bridges/health', () => ({
  useHealth: () => ({
    bodyLogs: ref(hoisted.bodyLogs),
    guardHeartRateLogs: ref([]),
    addGuardHeartRateLog: vi.fn(),
  }),
}))

async function getWrapper() {
  const { default: Panel } = await import('../HealthPanel.vue')
  return mount(Panel)
}

beforeEach(() => {
  hoisted.bodyLogs = [
    { id: 'ex_a', type: 'exercise', at: '2026-03-14T19:00:00.000Z', value: { minutes: 45 } },
    { id: 'ex_b', type: 'exercise', at: '2026-03-13T15:00:00.000Z', value: { minutes: 30 } },
  ]
  localStorage.clear()
})

describe('HealthPanel · 运动周图表本地日历日分桶', () => {
  it('守卫：测试进程须为东八区', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(zone).toMatch(/Asia\/(Shanghai|Macau|Hong_Kong)|\+08:00/)
  })

  it('exerciseChart 按本地日分桶，跨 UTC 日界日志归入本地当日', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 钉死「现在」为东八区本地 2026-03-15 10:00（UTC 2026-03-15 02:00）
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))

    const wrapper = await getWrapper()
    // 运动卡片是 health-grid 中第 3 张 .health-card（心率/睡眠/活动）
    const exerciseCard = wrapper.findAll('.health-card')[2]
    const sparks = exerciseCard.findAll('.hc-spark')
    expect(sparks.length, '运动周图表应渲染 7 根柱子（近 7 日）').toBe(7)
    // 末位(index 6) = 今日；index 5 = 昨日；index 4 = 前日；title 形如 "45分"
    // A：本地 03-15 03:00（UTC 归 03-14）→ 应计入「今日」(index 6)
    expect(sparks[6].attributes('title'), '跨 UTC 日界日志须归入本地当日').toBe('45分')
    // 昨日(03-14)无本地日日志
    expect(sparks[5].attributes('title'), '昨日应无本地日运动记录').toBe('0分')
    // B：本地 03-13 23:00 → 前日(index 4)
    expect(sparks[4].attributes('title'), '前日记录应正确落桶').toBe('30分')

    vi.useRealTimers()
  })
})
