// ============================================================
// 身体温室 · 三环测试（状态导向，拒绝 0-100 评分）
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('身体温室 三环', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  // 每次重新导入，拿到干净的单例状态
  async function getRings() {
    const mod = await import('../rings')
    return mod.useBodyRings()
  }

  it('默认三环均为空白档位', async () => {
    const r = await getRings()
    expect(r.activityRing.value.level).toBe(0)
    expect(r.restRing.value.level).toBe(0)
    expect(r.feelingRing.value.level).toBe(0)
    expect(r.activityRing.value.label).toBe('空白')
  })

  it('logActivity 按阈值升级活动环档位', async () => {
    const r = await getRings()
    r.logActivity(30)
    expect(r.activityRing.value.level).toBe(2)
    expect(r.activityRing.value.todayValue).toBe(30)
    r.logActivity(100) // 累计 130 >= 120 → 档位 4
    expect(r.activityRing.value.level).toBe(4)
  })

  it('logRest 按阈值升级休息环档位', async () => {
    const r = await getRings()
    r.logRest(60)
    expect(r.restRing.value.level).toBe(2)
  })

  it('setFeeling 设置感受环档位（主观，非数值）', async () => {
    const r = await getRings()
    r.setFeeling(3)
    expect(r.feelingRing.value.level).toBe(3)
    expect(r.feelingRing.value.label).toBe('充盈')
  })

  it('趋势返回固定 7 长度序列', async () => {
    const r = await getRings()
    expect(r.activityRing.value.trend.length).toBe(7)
  })

  it('写入后持久化（重载模块可恢复）', async () => {
    const r = await getRings()
    r.logActivity(45)
    const r2 = await getRings()
    expect(r2.activityRing.value.todayValue).toBe(45)
  })

  it('getBodyRingLogs 返回持久化的历史日志', async () => {
    const r = await getRings()
    r.logActivity(45)
    r.logRest(30)
    r.setFeeling(2)
    const { getBodyRingLogs } = await import('../rings')
    const logs = getBodyRingLogs()
    expect(logs.length).toBeGreaterThanOrEqual(1)
    const today = logs.find(l => l.date === new Date().toISOString().split('T')[0])
    expect(today?.activityMinutes).toBe(45)
    expect(today?.restMinutes).toBe(30)
    expect(today?.feeling).toBe(2)
  })
})
