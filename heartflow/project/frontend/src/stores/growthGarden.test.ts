// ============================================================
// 花园点缀测试（种子 / 习惯 / 罗盘）
// 目标系统已迁移至 modules/goal；此处直接测试 modules/garden 的真实实现。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

// 模拟 storage（vi.hoisted 确保在 import 前初始化）
const h = vi.hoisted(() => {
  const mockStore: Record<string, any> = {}
  const mockGetKV = (key: string, def: any) => mockStore[key] ?? def
  const mockSetKV = (key: string, val: any) => { mockStore[key] = val }
  return { mockStore, mockGetKV, mockSetKV }
})

vi.mock('../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (h.mockGetKV as any)(...args),
    setKV: (...args: any[]) => (h.mockSetKV as any)(...args),
  },
}))

import { useGardenFlourish as useGrowthGardenStore } from '../modules/garden'

describe('growthGarden 花园点缀（modules/garden）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(h.mockStore).forEach(k => delete h.mockStore[k])
    const f = useGrowthGardenStore()
    f.seeds.value = []
    f.habits.value = []
    f.compass.value = []
  })

  it('初始状态种子 / 习惯 / 罗盘为空', () => {
    const store = useGrowthGardenStore()
    expect(store.seeds.value).toEqual([])
    expect(store.habits.value).toEqual([])
    expect(store.compass.value).toEqual([])
  })

  it('plantSeed 种下种子并持久化', () => {
    const store = useGrowthGardenStore()
    store.plantSeed('每天写作')
    expect(store.seeds.value.length).toBe(1)
    expect(store.seeds.value[0].text).toBe('每天写作')
    expect(store.seeds.value[0].sprouted).toBe(false)
    expect(h.mockStore['hf:seeds'].length).toBe(1)
  })

  it('toggleSprout 切换发芽状态', () => {
    const store = useGrowthGardenStore()
    const s = store.plantSeed('冥想')
    store.toggleSprout(s.id)
    expect(store.seeds.value[0].sprouted).toBe(true)
    store.toggleSprout(s.id)
    expect(store.seeds.value[0].sprouted).toBe(false)
  })

  it('removeSeed 删除种子', () => {
    const store = useGrowthGardenStore()
    const s = store.plantSeed('读书')
    store.removeSeed(s.id)
    expect(store.seeds.value.length).toBe(0)
  })

  it('addHabit / tickHabit 追踪习惯', () => {
    const store = useGrowthGardenStore()
    const habit = store.addHabit('晨跑')
    expect(store.habits.value.length).toBe(1)
    store.tickHabit(habit.id)
    expect(store.habits.value[0].streak).toBe(1)
    store.tickHabit(habit.id)
    expect(store.habits.value[0].streak).toBe(0)
  })

  it('罗盘添加与移除方向', () => {
    const store = useGrowthGardenStore()
    store.addCompassValue('自由')
    store.addCompassValue('创造')
    expect(store.compass.value).toEqual(['自由', '创造'])
    store.removeCompassValue('自由')
    expect(store.compass.value).toEqual(['创造'])
  })

  it('导出 / 导入仅含点缀数据', () => {
    const store = useGrowthGardenStore()
    store.plantSeed('种子A')
    store.addHabit('习惯B')
    store.addCompassValue('方向C')
    const json = store.exportFlourish()
    const parsed = JSON.parse(json)
    expect(parsed).toHaveProperty('seeds')
    expect(parsed).toHaveProperty('habits')
    expect(parsed).toHaveProperty('compass')
    expect(parsed).not.toHaveProperty('goals')

    // 清空当前数据后导入，验证真正写入
    store.seeds.value = []
    store.habits.value = []
    store.compass.value = []
    const result = store.importFlourish(json)
    expect(result.seeds).toBe(1)
    expect(result.habits).toBe(1)
    expect(result.compass).toBe(1)
  })
})
