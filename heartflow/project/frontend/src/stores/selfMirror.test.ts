// ============================================================
// 众生象 · Store 测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// 模拟 storage
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useSelfMirrorStore } from './selfMirror'

describe('selfMirror store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('初始状态：默认出生信息与十二宫空自评', () => {
    const store = useSelfMirrorStore()
    expect(store.birth.year).toBeGreaterThan(1900)
    expect(store.houses).toHaveLength(12)
    expect(store.houses.every(h => h.rating === 0)).toBe(true)
    expect(store.ratedCount).toBe(0)
    expect(store.zodiac).toBeTruthy()
    expect(store.constellation).toBeTruthy()
  })

  it('fourPillars 生成四柱画像', () => {
    const store = useSelfMirrorStore()
    store.setBirthData({ year: 1995, month: 6, day: 15, hour: 10 })
    expect(store.fourPillars.pillars).toHaveLength(4)
    expect(store.fourPillars.pillars[0].label).toContain('年柱')
    expect(store.fourPillars.pillars[3].label).toContain('时柱')
    expect(store.fourPillars.overall).toContain('你的四柱画像')
  })

  it('setBirthData 持久化并限制范围', () => {
    const store = useSelfMirrorStore()
    store.setBirthData({ year: 9999, month: 99, day: 99, hour: 99 })
    expect(store.birth.year).toBe(2100)
    expect(store.birth.month).toBe(12)
    expect(store.birth.day).toBe(31)
    expect(store.birth.hour).toBe(23)
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('resetBirth 恢复默认出生信息', () => {
    const store = useSelfMirrorStore()
    store.setBirthData({ year: 1990, month: 1, day: 1, hour: 0 })
    store.resetBirth()
    expect(store.birth.year).not.toBe(1990)
  })

  it('setHouseRating 设置星级并持久化', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 4)
    expect(store.houses.find(h => h.id === 'self')?.rating).toBe(4)
    expect(store.ratedCount).toBe(1)
    expect(store.houseStats.average).toBe(4)
    expect(store.houseStats.total).toBe(4)
  })

  it('setHouseRating 越界值被钳制', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 99)
    expect(store.houses.find(h => h.id === 'self')?.rating).toBe(5)
    store.setHouseRating('self', -5)
    expect(store.houses.find(h => h.id === 'self')?.rating).toBe(0)
  })

  it('setHouseNote 记录反思笔记', () => {
    const store = useSelfMirrorStore()
    store.setHouseNote('work', '想换个方向')
    expect(store.houses.find(h => h.id === 'work')?.note).toBe('想换个方向')
  })

  it('balance 在评估不足 3 个维度时提示未评估', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 4)
    store.setHouseRating('emotion', 3)
    expect(store.balance.label).toBe('未评估')
    expect(store.balance.score).toBe(0)
  })

  it('balance 评估足够维度后给出分数与建议', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 5)
    store.setHouseRating('emotion', 5)
    store.setHouseRating('body', 5)
    store.setHouseRating('mind', 5)
    expect(store.balance.score).toBeGreaterThan(0)
    expect(store.balance.suggestions.length).toBeGreaterThan(0)
  })

  it('houseStats 区分优势与待关注维度', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 5)
    store.setHouseRating('emotion', 1)
    store.setHouseRating('body', 4)
    expect(store.houseStats.strengths.map(h => h.id)).toContain('self')
    expect(store.houseStats.weaknesses.map(h => h.id)).toContain('emotion')
  })

  it('astrolabe 生成 12 个星盘点位与覆盖度', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 5)
    store.setHouseRating('emotion', 5)
    expect(store.astrolabe.points).toHaveLength(12)
    expect(store.astrolabe.coverage).toBeGreaterThan(0)
    expect(store.astrolabe.centerLabel).toBe('自体星盘')
  })

  it('astrolabeInsight 无自评时给出引导', () => {
    const store = useSelfMirrorStore()
    expect(store.astrolabeInsight.strongest).toBe('—')
    expect(store.astrolabeInsight.advice).toContain('开始评估')
  })

  it('astrolabeInsight 有自评时给出最强最弱', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 5)
    store.setHouseRating('emotion', 1)
    expect(store.astrolabeInsight.strongest).toContain('自我认知')
    expect(store.astrolabeInsight.weakest).toContain('情绪管理')
  })

  it('resetHouses 清空所有自评', () => {
    const store = useSelfMirrorStore()
    store.setHouseRating('self', 5)
    store.setHouseNote('work', '备注')
    store.resetHouses()
    expect(store.houses.every(h => h.rating === 0 && h.note === '')).toBe(true)
    expect(store.ratedCount).toBe(0)
  })

  it('从存储恢复已保存的出生信息与自评', () => {
    mockStore['hf:self-mirror:birth'] = { year: 1992, month: 3, day: 8, hour: 6 }
    mockStore['hf:self-mirror:houses'] = [
      { id: 'self', label: '自我认知', icon: '🧘', description: '', rating: 4, note: '很清晰' },
    ]
    const store = useSelfMirrorStore()
    expect(store.birth.year).toBe(1992)
    expect(store.houses.find(h => h.id === 'self')?.rating).toBe(4)
    expect(store.houses.find(h => h.id === 'self')?.note).toBe('很清晰')
    // 缺失的宫格以默认补齐
    expect(store.houses).toHaveLength(12)
  })

  it('损坏的存储数据回退到默认值', () => {
    mockStore['hf:self-mirror:birth'] = { foo: 'bar' }
    mockStore['hf:self-mirror:houses'] = 'not-an-array'
    const store = useSelfMirrorStore()
    expect(store.birth.year).toBeGreaterThan(1900)
    expect(store.houses).toHaveLength(12)
  })
})
