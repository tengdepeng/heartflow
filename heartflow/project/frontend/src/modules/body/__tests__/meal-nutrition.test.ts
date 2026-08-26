// ============================================================
// 营养分析增强模块测试（meal-nutrition）
// ============================================================
import { describe, expect, it } from 'vitest'
import { parseMealNote, inferMealType, buildMealRecords, useMealNutrition } from '../meal-nutrition'
import type { BodyLog } from '../../../stores/health'

describe('parseMealNote 饮食文本解析', () => {
  it('空文本返回空数组', () => {
    expect(parseMealNote('')).toEqual([])
    expect(parseMealNote('   ')).toEqual([])
  })

  it('精确匹配 FOOD_DATABASE 条目', () => {
    const foods = parseMealNote('米饭 鸡胸肉 西兰花')
    expect(foods.length).toBeGreaterThanOrEqual(3)
    expect(foods.some(f => f.name === '米饭')).toBe(true)
    expect(foods.some(f => f.name === '鸡胸肉')).toBe(true)
    expect(foods.some(f => f.name === '西兰花')).toBe(true)
  })

  it('别名归一化（面包 → 全麦面包）', () => {
    const foods = parseMealNote('早餐吃了面包')
    expect(foods.some(f => f.name === '全麦面包')).toBe(true)
  })

  it('未覆盖食材按类别兜底且不重复', () => {
    const foods = parseMealNote('米饭 猪肉 青菜')
    const grain = foods.filter(f => f.category === 'grain')
    const protein = foods.filter(f => f.category === 'protein')
    const veg = foods.filter(f => f.category === 'vegetable')
    expect(grain).toHaveLength(1)
    expect(protein).toHaveLength(1)
    expect(veg).toHaveLength(1)
  })

  it('加工食品识别为 processed', () => {
    const foods = parseMealNote('炸鸡 奶茶')
    expect(foods.some(f => f.category === 'processed')).toBe(true)
  })
})

describe('inferMealType 餐次推断', () => {
  it('按时间段推断', () => {
    expect(inferMealType('2026-08-21T08:00:00')).toBe('breakfast')
    expect(inferMealType('2026-08-21T12:30:00')).toBe('lunch')
    expect(inferMealType('2026-08-21T19:00:00')).toBe('dinner')
    expect(inferMealType('2026-08-21T15:00:00')).toBe('snack')
  })
})

describe('buildMealRecords 日志转换', () => {
  it('仅转换 meal 类型日志', () => {
    const logs: BodyLog[] = [
      { id: '1', type: 'meal', value: { note: '米饭 鸡蛋' }, at: '2026-08-21T08:00:00' },
      { id: '2', type: 'sleep', value: { hours: 7 }, at: '2026-08-21T22:00:00' },
      { id: '3', type: 'meal', value: { note: '面条' }, at: '2026-08-21T12:00:00' },
    ]
    const records = buildMealRecords(logs)
    expect(records).toHaveLength(2)
    expect(records[0].type).toBe('breakfast')
    expect(records[0].foods.length).toBeGreaterThan(0)
    expect(records[1].type).toBe('lunch')
  })
})

describe('useMealNutrition 营养评分', () => {
  it('无饮食记录返回 null', () => {
    const api = useMealNutrition(() => [])
    expect(api.score.value).toBeNull()
    expect(api.weeklyTrend.value).toBeNull()
  })

  it('有饮食记录时生成营养评分', () => {
    const logs: BodyLog[] = [
      { id: '1', type: 'meal', value: { note: '米饭 鸡胸肉 西兰花 苹果 牛奶' }, at: '2026-08-21T12:00:00' },
      { id: '2', type: 'meal', value: { note: '燕麦 鸡蛋 香蕉' }, at: '2026-08-21T08:00:00' },
    ]
    const api = useMealNutrition(() => logs)
    expect(api.score.value).not.toBeNull()
    expect(api.score.value!.overall).toBeGreaterThanOrEqual(0)
    expect(api.score.value!.overall).toBeLessThanOrEqual(100)
    expect(api.score.value!.breakdown.macroRatio).toBeDefined()
    expect(api.score.value!.recommendations).toBeDefined()
  })

  it('周趋势生成', () => {
    const logs: BodyLog[] = [
      { id: '1', type: 'meal', value: { note: '米饭 鸡蛋' }, at: '2026-08-20T12:00:00' },
      { id: '2', type: 'meal', value: { note: '面条 牛肉' }, at: '2026-08-21T12:00:00' },
    ]
    const api = useMealNutrition(() => logs)
    expect(api.weeklyTrend.value).not.toBeNull()
    expect(api.weeklyTrend.value!.averageScore).toBeGreaterThanOrEqual(0)
    expect(api.weeklyTrend.value!.dailyScores.length).toBeGreaterThan(0)
  })
})
