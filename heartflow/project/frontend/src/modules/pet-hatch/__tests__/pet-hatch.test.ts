// ============================================================
// 宠物屋 composable 单测（INCR-497）
// 三级深度 __tests__/ → mock 路径 ../../../engine/storage
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetKV, mockSetKV } = vi.hoisted(() => ({
  mockGetKV: vi.fn(),
  mockSetKV: vi.fn(),
}))

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockGetKV(key, def),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
  storageVersion: { value: 0 },
}))

vi.mock('../../../utils/time', () => ({
  getLocalDateKey: () => '2026-10-04',
}))

import {
  usePetHatch,
  EGG_FORMS,
  MATERIAL_META,
  hatchMsFor,
  hatchProgress,
  materialsForHouseLevel,
  totalMaterialsForHouseLevel,
  rewardForHouseLevel,
} from '../pet-hatch'

const T0 = 1_760_000_000_000

describe('pet-hatch 纯函数', () => {
  it('三种蛋形态孵化时长递增且形态合法', () => {
    expect(EGG_FORMS.map((f) => f.id)).toEqual(['ember', 'frost', 'moss'])
    expect(hatchMsFor('ember')).toBe(30_000)
    expect(hatchMsFor('frost')).toBe(45_000)
    expect(hatchMsFor('moss')).toBe(60_000)
  })

  it('非法形态回退焰卵', () => {
    expect(hatchMsFor('nope' as any)).toBe(30_000)
  })

  it('建材需求随等级递增', () => {
    const lv0 = materialsForHouseLevel(0)
    const lv1 = materialsForHouseLevel(1)
    expect(lv0.wood).toBe(2)
    expect(lv1.wood).toBe(4)
    expect(lv0.herb).toBe(1)
    expect(lv1.herb).toBe(2)
  })

  it('累计建材为逐级求和', () => {
    const total = totalMaterialsForHouseLevel(2)
    // lv0(2,2,1,1) + lv1(4,4,2,2)
    expect(total.wood).toBe(6)
    expect(total.stone).toBe(6)
    expect(total.cloth).toBe(3)
    expect(total.herb).toBe(3)
  })

  it('奖励表 1~5 级有名字，超出给默认', () => {
    expect(rewardForHouseLevel(1).name).toBe('绒垫小窝')
    expect(rewardForHouseLevel(5).name).toBe('星辉阁楼')
    expect(rewardForHouseLevel(99).name).toBe('神秘加建')
  })

  it('孵化进度夹取 0~1', () => {
    const st = { stage: 'incubating', eggForm: 'ember', incubateStartTs: 0, incubateAccumMs: 15_000 } as any
    expect(hatchProgress(st, T0)).toBeCloseTo(0.5, 5)
    expect(hatchProgress({ ...st, incubateAccumMs: 999_999 } as any, T0)).toBe(1)
  })
})

describe('pet-hatch 孵化状态机', () => {
  beforeEach(() => {
    mockGetKV.mockImplementation((_k: string, def: any) => def)
    mockSetKV.mockClear()
    const h = usePetHatch()
    h.reloadPetHatchState()
    h.setNow(T0)
  })

  it('默认 idle 阶段', () => {
    const h = usePetHatch()
    expect(h.state.value.stage).toBe('idle')
    expect(h.state.value.houseLevel).toBe(0)
  })

  it('取蛋切换形态并重置进度', () => {
    const h = usePetHatch()
    h.takeEgg('moss')
    expect(h.state.value.eggForm).toBe('moss')
    expect(h.state.value.stage).toBe('idle')
    expect(h.state.value.incubateAccumMs).toBe(0)
  })

  it('温一温累加时长，满额破壳', () => {
    const h = usePetHatch()
    h.takeEgg('ember') // 30s
    // 每次 +1500ms，需 20 次
    for (let i = 0; i < 19; i++) h.warmOnce(1500)
    expect(h.state.value.stage).toBe('incubating')
    h.warmOnce(1500)
    expect(h.state.value.stage).toBe('hatched')
    expect(h.state.value.hatchedForm).toBe('ember')
  })

  it('收手结算已温时长并可续温', () => {
    const h = usePetHatch()
    h.takeEgg('ember')
    h.startIncubate()
    h.setNow(T0 + 5_000)
    h.stopIncubate()
    expect(h.state.value.stage).toBe('idle')
    expect(h.state.value.incubateAccumMs).toBe(5_000)
    h.startIncubate()
    h.setNow(T0 + 8_000)
    expect(hatchProgress(h.state.value, T0 + 8_000)).toBeCloseTo(8_000 / 30_000, 5)
  })

  it('到点自动破壳（settle 驱动）', () => {
    const h = usePetHatch()
    h.takeEgg('ember')
    h.startIncubate()
    h.setNow(T0 + 30_000)
    expect(h.settle()).toBe(true)
    expect(h.state.value.stage).toBe('hatched')
  })

  it('未到点 settle 不触发', () => {
    const h = usePetHatch()
    h.takeEgg('ember')
    h.startIncubate()
    h.setNow(T0 + 10_000)
    expect(h.settle()).toBe(false)
    expect(h.state.value.stage).toBe('incubating')
  })

  it('领取孵化产物一次后不可再领', () => {
    const h = usePetHatch()
    h.takeEgg('frost')
    for (let i = 0; i < 30; i++) h.warmOnce(1500)
    expect(h.state.value.stage).toBe('hatched')
    const first = h.claimHatched()
    expect(first?.id).toBe('frost')
    expect(first?.companionForm).toBe('wisp')
    expect(h.claimHatched()).toBeNull()
  })
})

describe('pet-hatch 宠物屋建造与奖励', () => {
  beforeEach(() => {
    mockGetKV.mockImplementation((_k: string, def: any) => def)
    mockSetKV.mockClear()
    const h = usePetHatch()
    h.reloadPetHatchState()
    h.setNow(T0)
  })

  it('采集建材每日一次', () => {
    const h = usePetHatch()
    expect(h.gatherMaterials()).toBe(true)
    expect(h.state.value.materials.wood).toBe(2)
    // 同日再采失败（mock 的今天恒为 2026-10-04）
    expect(h.gatherMaterials()).toBe(false)
    expect(h.state.value.materials.wood).toBe(2)
  })

  it('材料不足无法建造', () => {
    const h = usePetHatch()
    h.gatherMaterials() // 仅 +2，lv0 需 wood2/stone2/cloth1/herb1 → 恰好够
    expect(h.canBuild()).toBe(true)
  })

  it('建造升级扣材料并升等级', () => {
    const h = usePetHatch()
    h.gatherMaterials()
    expect(h.buildHouse()).toBe(true)
    expect(h.state.value.houseLevel).toBe(1)
    expect(h.state.value.materials.wood).toBe(0)
  })

  it('等级提升后材料不足不能连建', () => {
    const h = usePetHatch()
    h.gatherMaterials()
    h.buildHouse()
    expect(h.canBuild()).toBe(false)
    expect(h.buildHouse()).toBe(false)
  })

  it('奖励按等级领取一次', () => {
    const h = usePetHatch()
    h.gatherMaterials()
    h.buildHouse() // 升到 1 级
    expect(h.canClaimReward(1)).toBe(true)
    const r = h.claimReward(1)
    expect(r?.name).toBe('绒垫小窝')
    expect(h.claimReward(1)).toBeNull()
    expect(h.latestReward.value?.name).toBe('绒垫小窝')
  })

  it('未达等级不能领奖励', () => {
    const h = usePetHatch()
    expect(h.canClaimReward(1)).toBe(false)
    expect(h.claimReward(1)).toBeNull()
  })

  it('建材存量为持久化写入', () => {
    const h = usePetHatch()
    h.gatherMaterials()
    const lastCall = mockSetKV.mock.calls[mockSetKV.mock.calls.length - 1]
    expect(lastCall[0]).toBe('hf:pet_hatch')
    expect(lastCall[1].materials.wood).toBe(2)
  })

  it('放归重置全部状态', () => {
    const h = usePetHatch()
    h.gatherMaterials()
    h.buildHouse()
    h.clearAll()
    expect(h.state.value.houseLevel).toBe(0)
    expect(h.state.value.materials.wood).toBe(0)
    expect(MATERIAL_META.length).toBe(4)
  })
})
