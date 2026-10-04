// ============================================================
// water-drink · 喝水打卡引擎测试
// 覆盖：空态默认 / 加减杯持久化 / 目标夹取 / 跨日归零 / 纯函数
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStore: Record<string, any> = {}
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, v: any) => {
      mockStore[k] = v
    },
  },
}))

import {
  useWaterDrink,
  reloadWaterDrink,
  localDate,
  normalizeWaterDrink,
  drinkProgress,
  clampTarget,
  DEFAULT_WATER_DRINK,
  DEFAULT_TARGET,
  MIN_TARGET,
  MAX_TARGET,
} from '../water-drink'

const KEY = 'hf:water_drink'

describe('water-drink · 喝水打卡', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    reloadWaterDrink()
  })

  it('空存储回落默认（今日 0 杯 / 目标 8 杯）', () => {
    const d = useWaterDrink()
    expect(d.cups.value).toBe(0)
    expect(d.target.value).toBe(DEFAULT_TARGET)
    expect(d.totalCups.value).toBe(0)
    expect(d.progress.value).toBe(0)
    expect(d.reached.value).toBe(false)
  })

  it('addCup 累加今日与累计杯数并落盘', () => {
    const d = useWaterDrink()
    expect(d.addCup()).toBe(1)
    expect(d.addCup()).toBe(2)
    expect(d.cups.value).toBe(2)
    expect(d.totalCups.value).toBe(2)
    expect(mockStore[KEY].cups).toBe(2)
  })

  it('removeCup 减到 0 不再继续减', () => {
    const d = useWaterDrink()
    d.addCup()
    expect(d.removeCup()).toBe(0)
    expect(d.removeCup()).toBe(0)
    expect(d.totalCups.value).toBe(0)
  })

  it('setTarget 夹取到 [MIN_TARGET, MAX_TARGET]', () => {
    const d = useWaterDrink()
    expect(d.setTarget(0)).toBe(MIN_TARGET)
    expect(d.setTarget(999)).toBe(MAX_TARGET)
    expect(d.setTarget(6)).toBe(6)
    expect(d.target.value).toBe(6)
  })

  it('达到目标后 reached 为真，进度封顶 100', () => {
    const d = useWaterDrink()
    d.setTarget(2)
    d.addCup()
    d.addCup()
    expect(d.reached.value).toBe(true)
    expect(d.progress.value).toBe(100)
    d.addCup()
    expect(d.progress.value).toBe(100)
  })

  it('跨日自动归零今日杯数（累计保留）', () => {
    mockStore[KEY] = { date: '2000-01-01', cups: 5, target: 8, totalCups: 5 }
    reloadWaterDrink()
    const d = useWaterDrink()
    expect(d.cups.value).toBe(0)
    expect(d.totalCups.value).toBe(5)
    expect(mockStore[KEY].date).toBe(localDate())
  })

  it('resetToday 清空今日但保留目标与累计', () => {
    const d = useWaterDrink()
    d.addCup()
    d.resetToday()
    expect(d.cups.value).toBe(0)
    expect(d.totalCups.value).toBe(1)
    expect(d.target.value).toBe(DEFAULT_TARGET)
  })

  it('纯函数：normalizeWaterDrink / drinkProgress / clampTarget', () => {
    expect(normalizeWaterDrink({ date: '2000-01-01', cups: 3, target: 8, totalCups: 3 }, '2026-10-04').cups).toBe(0)
    expect(normalizeWaterDrink({ date: '2026-10-04', cups: 3, target: 8, totalCups: 3 }, '2026-10-04').cups).toBe(3)
    expect(drinkProgress(4, 8)).toBe(50)
    expect(drinkProgress(20, 8)).toBe(100)
    expect(drinkProgress(0, 0)).toBe(0)
    expect(clampTarget(Number.NaN, 5)).toBe(5)
    expect(clampTarget(2.4)).toBe(2)
    expect(DEFAULT_WATER_DRINK.cups).toBe(0)
  })
})
