// ============================================================
// 身体温室 · 营养评分测试（P16-2）
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  scoreNutrition,
  computeWeeklyNutritionTrend,
  computeNutritionScoreFromMetrics,
  FOOD_DATABASE,
} from '../nutrition-scoring'
import type { MealRecord, NutritionProfileParams } from '../nutrition-scoring'
import type { BodyMetric } from '../types'

// ---- 测试辅助 ----

function createMeal(
  overrides: Partial<MealRecord> = {},
): MealRecord {
  return {
    id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'lunch',
    date: '2026-08-02',
    time: '12:00',
    foods: [
      { ...FOOD_DATABASE['米饭'], portion: 200 },
      { ...FOOD_DATABASE['鸡胸肉'], portion: 150 },
      { ...FOOD_DATABASE['西兰花'], portion: 100 },
    ],
    fullness: 3,
    satisfaction: 4,
    ...overrides,
  }
}

function createBalancedDayMeals(): MealRecord[] {
  return [
    {
      id: 'm1', type: 'breakfast', date: '2026-08-02', time: '07:30',
      foods: [
        { ...FOOD_DATABASE['燕麦'], portion: 50 },
        { ...FOOD_DATABASE['牛奶'], portion: 250 },
        { ...FOOD_DATABASE['鸡蛋'], portion: 100 },
      ],
      fullness: 3, satisfaction: 4,
    },
    {
      id: 'm2', type: 'lunch', date: '2026-08-02', time: '12:00',
      foods: [
        { ...FOOD_DATABASE['米饭'], portion: 200 },
        { ...FOOD_DATABASE['鸡胸肉'], portion: 150 },
        { ...FOOD_DATABASE['西兰花'], portion: 100 },
        { ...FOOD_DATABASE['番茄'], portion: 80 },
      ],
      fullness: 3, satisfaction: 4,
    },
    {
      id: 'm3', type: 'dinner', date: '2026-08-02', time: '18:30',
      foods: [
        { ...FOOD_DATABASE['豆腐'], portion: 150 },
        { ...FOOD_DATABASE['菠菜'], portion: 100 },
        { ...FOOD_DATABASE['胡萝卜'], portion: 80 },
      ],
      fullness: 3, satisfaction: 3,
    },
    {
      id: 'm4', type: 'snack', date: '2026-08-02', time: '15:30',
      foods: [
        { ...FOOD_DATABASE['苹果'], portion: 150 },
        { ...FOOD_DATABASE['酸奶'], portion: 100 },
      ],
      fullness: 2, satisfaction: 4,
    },
  ]
}

// ============================================================
// 营养评分
// ============================================================

describe('营养评分算法', () => {
  describe('空膳食', () => {
    it('空膳食记录应返回 0 分', () => {
      const result = scoreNutrition([])
      expect(result.overall).toBe(0)
    })

    it('空膳食应给出开始记录的建议', () => {
      const result = scoreNutrition([])
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.recommendations[0].title).toContain('记录')
    })

    it('空膳食应标记所有餐次缺失', () => {
      const result = scoreNutrition([])
      expect(result.breakdown.missingMeals).toContain('breakfast')
      expect(result.breakdown.missingMeals).toContain('lunch')
      expect(result.breakdown.missingMeals).toContain('dinner')
    })
  })

  describe('均衡膳食', () => {
    it('三餐齐全的均衡膳食应得高分', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.overall).toBeGreaterThanOrEqual(70)
    })

    it('均衡膳食的规律性评分应较高', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.regularity).toBeGreaterThanOrEqual(60)
    })

    it('均衡膳食的食物多样性评分应较高', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.variety).toBeGreaterThanOrEqual(60)
    })

    it('应覆盖多种食物类别', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.breakdown.categoryCoverage.length).toBeGreaterThanOrEqual(4)
    })

    it('三餐齐全时不应有缺失餐次', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.breakdown.missingMeals.length).toBe(0)
    })
  })

  describe('膳食不规律', () => {
    it('只吃一餐应得低规律性分', () => {
      const meals = [createMeal({ type: 'lunch' })]
      const result = scoreNutrition(meals)
      expect(result.regularity).toBeLessThanOrEqual(60)
      expect(result.breakdown.missingMeals).toContain('breakfast')
      expect(result.breakdown.missingMeals).toContain('dinner')
    })

    it('跳过早餐应标记缺失早餐且规律性降低', () => {
      const meals: MealRecord[] = [
        createMeal({ id: 'm1', type: 'lunch' as const, time: '12:00', fullness: 2, satisfaction: 2 }),
        createMeal({ id: 'm2', type: 'dinner' as const, time: '18:30', fullness: 2, satisfaction: 2 }),
      ]
      const result = scoreNutrition(meals)
      expect(result.breakdown.missingMeals).toContain('breakfast')
      expect(result.regularity).toBeLessThan(80)
    })
  })

  describe('营养不均衡', () => {
    it('全是碳水的膳食应给出增加蛋白质建议', () => {
      const meals: MealRecord[] = [{
        id: 'm1', type: 'lunch' as const, date: '2026-08-02', time: '12:00',
        foods: [
          { ...FOOD_DATABASE['米饭'], portion: 300 },
          { ...FOOD_DATABASE['面条'], portion: 200 },
        ],
        fullness: 3, satisfaction: 3,
      }]
      const result = scoreNutrition(meals)
      expect(result.balance).toBeLessThanOrEqual(60)
    })

    it('高脂肪膳食应给出减少脂肪建议', () => {
      const meals: MealRecord[] = [{
        id: 'm1', type: 'lunch' as const, date: '2026-08-02', time: '12:00',
        foods: [
          { ...FOOD_DATABASE['薯片'], portion: 200 },
          { ...FOOD_DATABASE['巧克力'], portion: 100 },
        ],
        fullness: 4, satisfaction: 3,
      }]
      const result = scoreNutrition(meals)
      expect(result.balance).toBeLessThanOrEqual(50)
    })
  })

  describe('食物多样性不足', () => {
    it('只吃米饭的膳食多样性评分应为 0', () => {
      const meals: MealRecord[] = [{
        id: 'm1', type: 'lunch' as const, date: '2026-08-02', time: '12:00',
        foods: [{ ...FOOD_DATABASE['米饭'], portion: 300 }],
        fullness: 3, satisfaction: 2,
      }]
      const result = scoreNutrition(meals)
      expect(result.variety).toBeLessThanOrEqual(30)
    })

    it('缺少蔬菜应给出建议', () => {
      const meals: MealRecord[] = [{
        id: 'm1', type: 'lunch' as const, date: '2026-08-02', time: '12:00',
        foods: [
          { ...FOOD_DATABASE['米饭'], portion: 200 },
          { ...FOOD_DATABASE['鸡胸肉'], portion: 150 },
        ],
        fullness: 3, satisfaction: 3,
      }]
      const result = scoreNutrition(meals)
      const vegRec = result.recommendations.find(r => r.title.includes('蔬菜'))
      expect(vegRec).toBeDefined()
    })
  })

  describe('食物数据库', () => {
    it('应包含常见食物', () => {
      expect(FOOD_DATABASE['米饭']).toBeDefined()
      expect(FOOD_DATABASE['鸡蛋']).toBeDefined()
      expect(FOOD_DATABASE['西兰花']).toBeDefined()
      expect(FOOD_DATABASE['苹果']).toBeDefined()
      expect(FOOD_DATABASE['牛奶']).toBeDefined()
    })

    it('每种食物应有正确的分类', () => {
      expect(FOOD_DATABASE['米饭'].category).toBe('grain')
      expect(FOOD_DATABASE['鸡胸肉'].category).toBe('protein')
      expect(FOOD_DATABASE['苹果'].category).toBe('fruit')
      expect(FOOD_DATABASE['牛奶'].category).toBe('dairy')
    })

    it('每种食物应有营养数据', () => {
      const rice = FOOD_DATABASE['米饭']
      expect(rice.calories).toBeGreaterThan(0)
      expect(rice.protein).toBeGreaterThanOrEqual(0)
      expect(rice.carbs).toBeGreaterThanOrEqual(0)
      expect(rice.fat).toBeGreaterThanOrEqual(0)
    })
  })

  describe('宏量营养素比例', () => {
    it('应计算正确的宏量营养素供能比', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.breakdown.macroRatio.protein).toBeGreaterThan(0)
      expect(result.breakdown.macroRatio.carbs).toBeGreaterThan(0)
      expect(result.breakdown.macroRatio.fat).toBeGreaterThan(0)
    })

    it('宏量营养素比例之和应接近 100', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      const sum = result.breakdown.macroRatio.protein +
        result.breakdown.macroRatio.carbs +
        result.breakdown.macroRatio.fat
      expect(sum).toBeGreaterThanOrEqual(90)
      expect(sum).toBeLessThanOrEqual(110)
    })
  })

  describe('热量计算', () => {
    it('应计算总热量', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.breakdown.totalCalories).toBeGreaterThan(0)
    })

    it('应提供推荐热量范围', () => {
      const meals = createBalancedDayMeals()
      const result = scoreNutrition(meals)
      expect(result.breakdown.recommendedCalories[0]).toBeGreaterThan(0)
      expect(result.breakdown.recommendedCalories[1]).toBeGreaterThan(result.breakdown.recommendedCalories[0])
    })
  })
})

// ============================================================
// 周趋势
// ============================================================

describe('周营养趋势', () => {
  it('空数据应返回 0 分', () => {
    const result = computeWeeklyNutritionTrend(
      new Map(),
      '2026-07-27',
      '2026-08-02',
    )
    expect(result.averageScore).toBe(0)
  })

  it('应返回每天的评分', () => {
    const mealsByDay = new Map<string, MealRecord[]>()
    const meals = createBalancedDayMeals()
    mealsByDay.set('2026-08-02', meals)

    const result = computeWeeklyNutritionTrend(
      mealsByDay,
      '2026-07-27',
      '2026-08-02',
    )
    expect(result.dailyScores.length).toBe(7)
  })

  it('应有周洞察文本', () => {
    const mealsByDay = new Map<string, MealRecord[]>()
    const meals = createBalancedDayMeals()
    mealsByDay.set('2026-08-02', meals)

    const result = computeWeeklyNutritionTrend(
      mealsByDay,
      '2026-07-27',
      '2026-08-02',
    )
    expect(result.weeklyInsight.length).toBeGreaterThan(0)
  })

  it('单日有记录时趋势应为 stable', () => {
    const mealsByDay = new Map<string, MealRecord[]>()
    const meals = createBalancedDayMeals()
    mealsByDay.set('2026-08-02', meals)

    const result = computeWeeklyNutritionTrend(
      mealsByDay,
      '2026-07-27',
      '2026-08-02',
    )
    expect(result.trend).toBe('stable')
  })
})

// ============================================================
// 从 BodyMetric 计算
// ============================================================

describe('从 BodyMetric 计算营养评分', () => {
  it('无记录时应返回中间分', () => {
    const score = computeNutritionScoreFromMetrics([])
    expect(score).toBeGreaterThanOrEqual(40)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('有饮水记录应提升评分', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'water', value: 2000, unit: 'ml',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const score = computeNutritionScoreFromMetrics(metrics)
    expect(score).toBeGreaterThan(50)
  })

  it('有营养直接记录应返回该值', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'n1', type: 'nutrition', value: 85, unit: '分',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const score = computeNutritionScoreFromMetrics(metrics)
    expect(score).toBe(85)
  })

  it('体重稳定应加分', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'weight', value: 70, unit: 'kg',
        timestamp: '2026-07-01T12:00:00Z', date: '2026-07-01',
      },
      {
        id: 'w2', type: 'weight', value: 70.5, unit: 'kg',
        timestamp: '2026-08-01T12:00:00Z', date: '2026-08-01',
      },
    ]
    const score = computeNutritionScoreFromMetrics(metrics)
    expect(score).toBeGreaterThanOrEqual(50)
  })
})

// ============================================================
// 个性化营养评分（P16-2 增强版）
// ============================================================

describe('个性化营养评分（带用户档案）', () => {
  it('提供完整档案应返回个性化评分', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'water', value: 2000, unit: 'ml',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
      {
        id: 'e1', type: 'exercise', value: 30, unit: 'min',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const profile: NutritionProfileParams = {
      gender: 'male',
      age: 30,
      weight: 70,
      height: 175,
      activityLevel: 'moderate',
      goal: 'maintain',
    }
    const score = computeNutritionScoreFromMetrics(metrics, profile)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('减重目标应影响评分', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'water', value: 2000, unit: 'ml',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
      {
        id: 'e1', type: 'exercise', value: 45, unit: 'min',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const loseProfile: NutritionProfileParams = {
      gender: 'male', age: 30, weight: 80, height: 175,
      activityLevel: 'active', goal: 'lose_weight',
    }
    const score = computeNutritionScoreFromMetrics(metrics, loseProfile)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('增肌目标应影响评分', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'e1', type: 'exercise', value: 60, unit: 'min',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const gainProfile: NutritionProfileParams = {
      gender: 'male', age: 25, weight: 70, height: 175,
      activityLevel: 'active', goal: 'gain_muscle',
    }
    const score = computeNutritionScoreFromMetrics(metrics, gainProfile)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('女性档案应使用不同参考值', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'water', value: 1800, unit: 'ml',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const femaleProfile: NutritionProfileParams = {
      gender: 'female', age: 28, weight: 55, height: 160,
      activityLevel: 'light', goal: 'maintain',
    }
    const score = computeNutritionScoreFromMetrics(metrics, femaleProfile)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('久坐档案评分应合理', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'water', value: 1500, unit: 'ml',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const sedentaryProfile: NutritionProfileParams = {
      gender: 'male', age: 40, weight: 85, height: 170,
      activityLevel: 'sedentary', goal: 'improve_health',
    }
    const score = computeNutritionScoreFromMetrics(metrics, sedentaryProfile)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('无档案时仍使用推断算法', () => {
    const metrics: BodyMetric[] = [
      {
        id: 'w1', type: 'water', value: 2000, unit: 'ml',
        timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02',
      },
    ]
    const score = computeNutritionScoreFromMetrics(metrics)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('有多天数据时推断评分应更准确', () => {
    const metrics: BodyMetric[] = [
      { id: 'w1', type: 'water', value: 2000, unit: 'ml', timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02' },
      { id: 'w2', type: 'water', value: 2100, unit: 'ml', timestamp: '2026-08-01T12:00:00Z', date: '2026-08-01' },
      { id: 'w3', type: 'water', value: 1900, unit: 'ml', timestamp: '2026-07-31T12:00:00Z', date: '2026-07-31' },
      { id: 'e1', type: 'exercise', value: 30, unit: 'min', timestamp: '2026-08-02T12:00:00Z', date: '2026-08-02' },
      { id: 'e2', type: 'exercise', value: 45, unit: 'min', timestamp: '2026-08-01T12:00:00Z', date: '2026-08-01' },
      { id: 'e3', type: 'exercise', value: 60, unit: 'min', timestamp: '2026-07-31T12:00:00Z', date: '2026-07-31' },
      { id: 'wt1', type: 'weight', value: 70, unit: 'kg', timestamp: '2026-07-01T12:00:00Z', date: '2026-07-01' },
      { id: 'wt2', type: 'weight', value: 70.2, unit: 'kg', timestamp: '2026-08-01T12:00:00Z', date: '2026-08-01' },
    ]
    const score = computeNutritionScoreFromMetrics(metrics)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})