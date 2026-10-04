// ============================================================
// 陪伴精灵 composable 单测（INCR-488）
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

import { useDesktopCompanion } from '../companion'

describe('desktop-companion composable', () => {
  beforeEach(() => {
    mockGetKV.mockImplementation((_k: string, def: any) => def)
    mockSetKV.mockClear()
    const c = useDesktopCompanion()
    c.reloadCompanionState()
  })

  it('默认未领养', () => {
    const c = useDesktopCompanion()
    expect(c.isAdopted.value).toBe(false)
  })

  it('领养需要非空名字', () => {
    const c = useDesktopCompanion()
    expect(c.adopt('', 'sprite')).toBe(false)
    expect(c.adopt('   ', 'beast')).toBe(false)
    expect(c.isAdopted.value).toBe(false)
  })

  it('领养成功并初始化状态', () => {
    const c = useDesktopCompanion()
    expect(c.adopt('小灯', 'wisp')).toBe(true)
    expect(c.isAdopted.value).toBe(true)
    expect(c.state.value.name).toBe('小灯')
    expect(c.state.value.form).toBe('wisp')
    expect(c.state.value.level).toBe(1)
    expect(c.state.value.satiety).toBe(80)
  })

  it('喂食提升饱食与经验并持久化', () => {
    const c = useDesktopCompanion()
    c.adopt('小灯', 'sprite')
    const before = c.state.value.satiety
    const ok = c.feed()
    expect(ok).toBe(true)
    expect(c.state.value.satiety).toBe(Math.min(100, before + 25))
    expect(c.state.value.xp).toBe(10)
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('陪伴提升亲密、消耗精力、加经验', () => {
    const c = useDesktopCompanion()
    c.adopt('小灯', 'sprite')
    c.play()
    expect(c.state.value.affection).toBe(100)
    expect(c.state.value.energy).toBe(65)
    expect(c.state.value.xp).toBe(15)
  })

  it('经验累计触发升级', () => {
    const c = useDesktopCompanion()
    c.adopt('小灯', 'sprite')
    for (let i = 0; i < 5; i++) c.feed()
    expect(c.state.value.level).toBe(2)
    expect(c.state.value.xp).toBe(0)

    for (let i = 0; i < 10; i++) c.play()
    expect(c.state.value.level).toBeGreaterThanOrEqual(3)
    // 小窝等级每 3 级扩建：level>=4 时 homeLevel>=1
    expect(c.state.value.homeLevel).toBe(homeLevelForExpected(c.state.value.level))
  })

  it('未领养时交互返回 false', () => {
    const c = useDesktopCompanion()
    expect(c.feed()).toBe(false)
    expect(c.play()).toBe(false)
    expect(c.rest()).toBe(false)
  })

  it('歇息恢复精力（封顶 100）', () => {
    const c = useDesktopCompanion()
    c.adopt('小灯', 'sprite')
    c.play() // 80 - 15 = 65
    c.rest() // 65 + 40 = 100
    expect(c.state.value.energy).toBe(100)
  })

  it('跨日衰减：饱食与亲密下降、精力回补', () => {
    const c = useDesktopCompanion()
    c.adopt('小灯', 'sprite')
    c.state.value.lastFedDate = '2000-01-01'
    c.tickDaily()
    expect(c.state.value.satiety).toBe(60)
    expect(c.state.value.affection).toBe(70)
    expect(c.state.value.energy).toBe(90)
    expect(c.state.value.lastFedDate).not.toBe('2000-01-01')
  })

  it('放归清空回到未领养', () => {
    const c = useDesktopCompanion()
    c.adopt('小灯', 'sprite')
    c.clearAll()
    expect(c.isAdopted.value).toBe(false)
    expect(c.state.value.name).toBe('')
  })
})

function homeLevelForExpected(level: number): number {
  return Math.max(0, Math.floor((level - 1) / 3))
}
