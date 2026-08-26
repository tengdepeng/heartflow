// ============================================================
// 岁时阁 · 模块单元测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { SOLAR_TERMS, FESTIVALS, SEASON_META, TERM_CUSTOMS, FESTIVAL_INFO, getTermCustoms, getFestivalInfo } from '../data'

// ---- 全局 mock storage 模块 ----
const mockStorage = new Map<string, any>()
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, fallback: any) => {
      return mockStorage.has(key) ? JSON.parse(JSON.stringify(mockStorage.get(key))) : fallback
    }),
    setKV: vi.fn((key: string, value: any) => {
      mockStorage.set(key, JSON.parse(JSON.stringify(value)))
    }),
  },
}))

describe('岁时阁 · 数据层', () => {
  it('SOLAR_TERMS 包含 24 个节气', () => {
    expect(SOLAR_TERMS.length).toBe(24)
  })

  it('SOLAR_TERMS 每个节气有 name/icon/desc/month/day', () => {
    for (const term of SOLAR_TERMS) {
      expect(term.name).toBeTruthy()
      expect(term.icon).toBeTruthy()
      expect(term.desc).toBeTruthy()
      expect(term.month).toBeGreaterThanOrEqual(1)
      expect(term.month).toBeLessThanOrEqual(12)
      expect(term.day).toBeGreaterThanOrEqual(1)
      expect(term.day).toBeLessThanOrEqual(31)
    }
  })

  it('FESTIVALS 包含主要传统节日', () => {
    expect(FESTIVALS.length).toBeGreaterThanOrEqual(6)
    const names = FESTIVALS.map(f => f.name)
    expect(names).toContain('春节')
    expect(names).toContain('端午')
    expect(names).toContain('中秋')
  })

  it('SEASON_META 包含四季', () => {
    expect(SEASON_META.length).toBe(4)
    const keys = SEASON_META.map(s => s.key)
    expect(keys).toContain('spring')
    expect(keys).toContain('summer')
    expect(keys).toContain('autumn')
    expect(keys).toContain('winter')
  })

  it('getTermCustoms 返回已知节气的民俗', () => {
    const customs = getTermCustoms('立春')
    expect(customs).toContain('打春牛')
  })

  it('getTermCustoms 返回未知节气的一般性描述', () => {
    const customs = getTermCustoms('谷雨')
    expect(customs).toContain('二十四节气')
  })

  it('getFestivalInfo 返回已知节日的信息', () => {
    const info = getFestivalInfo('春节')
    expect(info).toContain('岁首')
  })

  it('getFestivalInfo 返回未知节日的一般性描述', () => {
    const info = getFestivalInfo('寒食节')
    expect(info).toContain('传统节日')
  })

  it('TERM_CUSTOMS 包含主要节气民俗', () => {
    expect(TERM_CUSTOMS).toHaveProperty('立春')
    expect(TERM_CUSTOMS).toHaveProperty('清明')
    expect(TERM_CUSTOMS).toHaveProperty('冬至')
  })

  it('FESTIVAL_INFO 包含主要节日文化介绍', () => {
    expect(FESTIVAL_INFO).toHaveProperty('春节')
    expect(FESTIVAL_INFO).toHaveProperty('中秋')
    expect(FESTIVAL_INFO).toHaveProperty('端午')
  })
})

describe('岁时阁 · 业务逻辑', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.resetModules()
  })

  async function getSeasonal() {
    const { useSeasonalRituals } = await import('../index')
    return useSeasonalRituals()
  }

  async function getPrivate() {
    const { usePrivateRituals } = await import('../index')
    return usePrivateRituals()
  }

  async function getSolarTerms() {
    const { useSolarTerms } = await import('../index')
    return useSolarTerms()
  }

  it('useSeasonalRituals 提供完整的 API', async () => {
    const ctx = await getSeasonal()
    expect(ctx.rituals).toBeDefined()
    expect(ctx.activeSeason).toBeDefined()
    expect(ctx.seasonRituals).toBeTypeOf('function')
    expect(ctx.currentSeasonRituals).toBeDefined()
    expect(ctx.addRitual).toBeTypeOf('function')
    expect(ctx.completeRitual).toBeTypeOf('function')
    expect(ctx.deleteRitual).toBeTypeOf('function')
    expect(ctx.calcStreak).toBeTypeOf('function')
    expect(ctx.stats).toBeDefined()
  })

  it('useSeasonalRituals 默认 activeSeason 为 spring', async () => {
    const ctx = await getSeasonal()
    expect(ctx.activeSeason.value).toBe('spring')
  })

  it('useSeasonalRituals stats 初始值为零', async () => {
    const ctx = await getSeasonal()
    expect(ctx.stats.value.total).toBe(0)
    expect(ctx.stats.value.thisYear).toBe(0)
    expect(ctx.stats.value.streak).toBe(0)
  })

  it('useSeasonalRituals addRitual 添加仪式', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('踏青', 'spring', '春日郊游')
    expect(ctx.rituals.value.length).toBe(1)
    expect(ctx.rituals.value[0].name).toBe('踏青')
    expect(ctx.rituals.value[0].season).toBe('spring')
    expect(ctx.rituals.value[0].count).toBe(0)
    expect(ctx.rituals.value[0].lastCompletedAt).toBeNull()
  })

  it('useSeasonalRituals 不添加空名称仪式', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('', 'spring', '')
    expect(ctx.rituals.value.length).toBe(0)
  })

  it('useSeasonalRituals completeRitual 增加计数', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('读书', 'summer', '夏日阅读')
    const id = ctx.rituals.value[0].id
    ctx.completeRitual(id)
    expect(ctx.rituals.value[0].count).toBe(1)
    expect(ctx.rituals.value[0].lastCompletedAt).toBeTruthy()
  })

  it('useSeasonalRituals deleteRitual 删除仪式', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('赏雪', 'winter', '冬日赏雪')
    expect(ctx.rituals.value.length).toBe(1)
    ctx.deleteRitual(ctx.rituals.value[0].id)
    expect(ctx.rituals.value.length).toBe(0)
  })

  it('useSeasonalRituals seasonRituals 按季节筛选', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('踏青', 'spring', '')
    ctx.addRitual('赏荷', 'summer', '')
    ctx.addRitual('登高', 'autumn', '')
    ctx.addRitual('滑冰', 'winter', '')
    ctx.addRitual('春茶', 'spring', '')
    expect(ctx.seasonRituals('spring').length).toBe(2)
    expect(ctx.seasonRituals('summer').length).toBe(1)
    expect(ctx.seasonRituals('autumn').length).toBe(1)
    expect(ctx.seasonRituals('winter').length).toBe(1)
  })

  it('useSeasonalRituals activeSeason 切换影响 currentSeasonRituals', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('春茶', 'spring', '')
    ctx.addRitual('夏泳', 'summer', '')
    ctx.activeSeason.value = 'spring'
    expect(ctx.currentSeasonRituals.value.length).toBe(1)
    expect(ctx.currentSeasonRituals.value[0].name).toBe('春茶')
    ctx.activeSeason.value = 'summer'
    expect(ctx.currentSeasonRituals.value.length).toBe(1)
    expect(ctx.currentSeasonRituals.value[0].name).toBe('夏泳')
  })

  it('useSeasonalRituals completeRitual 更新 stats', async () => {
    const ctx = await getSeasonal()
    ctx.addRitual('读书', 'spring', '')
    ctx.addRitual('运动', 'summer', '')
    ctx.completeRitual(ctx.rituals.value[0].id)
    expect(ctx.stats.value.total).toBe(2)
    expect(ctx.stats.value.active).toBe(1)
  })

  it('usePrivateRituals 提供完整的 API', async () => {
    const ctx = await getPrivate()
    expect(ctx.rituals).toBeDefined()
    expect(ctx.lifeRituals).toBeDefined()
    expect(ctx.addRitual).toBeTypeOf('function')
    expect(ctx.editRitual).toBeTypeOf('function')
    expect(ctx.removeRitual).toBeTypeOf('function')
    expect(ctx.addLifeRitual).toBeTypeOf('function')
    expect(ctx.removeLifeRitual).toBeTypeOf('function')
  })

  it('usePrivateRituals addRitual 添加私人仪式', async () => {
    const ctx = await getPrivate()
    ctx.addRitual('晨间冥想', '2026-01-01')
    expect(ctx.rituals.value.length).toBe(1)
    expect(ctx.rituals.value[0].name).toBe('晨间冥想')
    expect(ctx.rituals.value[0].icon).toBe('🕯')
  })

  it('usePrivateRituals addLifeRitual 添加生命仪礼', async () => {
    const ctx = await getPrivate()
    ctx.addLifeRitual('毕业', '2026-06-15', '大学毕业典礼')
    expect(ctx.lifeRituals.value.length).toBe(1)
    expect(ctx.lifeRituals.value[0].name).toBe('毕业')
    expect(ctx.lifeRituals.value[0].icon).toBe('📜')
  })

  it('useSolarTerms 提供节气计算 API', async () => {
    const ctx = await getSolarTerms()
    expect(ctx.currentTerm).toBeDefined()
    expect(ctx.upcomingTerm).toBeDefined()
    expect(ctx.upcomingFestivals).toBeDefined()
    expect(ctx.nodeAngle).toBeTypeOf('function')
    expect(ctx.formatDate).toBeTypeOf('function')
  })

  it('useSolarTerms currentTerm 返回有效的节气对象', async () => {
    const ctx = await getSolarTerms()
    expect(ctx.currentTerm.value).toBeTruthy()
    expect(ctx.currentTerm.value.name).toBeTruthy()
    expect(ctx.currentTerm.value.icon).toBeTruthy()
  })

  it('useSolarTerms upcomingTerm 与 currentTerm 不同', async () => {
    const ctx = await getSolarTerms()
    expect(ctx.upcomingTerm.value).toBeTruthy()
    expect(ctx.upcomingTerm.value.name).not.toBe(ctx.currentTerm.value.name)
  })

  it('useSolarTerms formatDate 格式化正确', async () => {
    const ctx = await getSolarTerms()
    expect(ctx.formatDate('2026-01-15T00:00:00Z')).toBe('1月15日')
    expect(ctx.formatDate('2026-12-25T00:00:00Z')).toBe('12月25日')
  })

  it('useSolarTerms nodeAngle 返回正确的 transform 样式', async () => {
    const ctx = await getSolarTerms()
    const angle = ctx.nodeAngle(SOLAR_TERMS[0])
    expect(angle.transform).toContain('rotate')
    expect(angle.transform).toContain('translate')
  })
})