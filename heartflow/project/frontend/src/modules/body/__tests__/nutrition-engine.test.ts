// ============================================================
// 身体温室 · 个性化营养引擎测试（P16-2）
// 覆盖 BMR/TDEE、个性化目标、微量元素、膳食计划、摄入对比、动态评分
// ============================================================

import { describe, it, expect } from 'vitest'
import { useNutritionEngine, DEFAULT_USER_PROFILE } from '../nutrition-engine'
import type { MealRecord } from '../nutrition-scoring'
import { FOOD_DATABASE } from '../nutrition-scoring'
import type { BodyMetric } from '../types'

// ---- 测试辅助 ----

function createMetric(
  type: string,
  value: number,
  date: string,
  time: string = '12:00:00',
): BodyMetric {
  return {
    id: `${type}-${date}-${Math.random().toString(36).slice(2, 6)}`,
    type: type as BodyMetric['type'],
    value,
    unit: '',
    timestamp: `${date}T${time}Z`,
    date,
  }
}

function createBalancedMeals(): MealRecord[] {
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
  ]
}

// ============================================================
// 默认档案
// ============================================================

describe('默认用户档案', () => {
  it('应有合理的默认值', () => {
    expect(DEFAULT_USER_PROFILE.gender).toBe('male')
    expect(DEFAULT_USER_PROFILE.age).toBe(30)
    expect(DEFAULT_USER_PROFILE.weight).toBe(70)
    expect(DEFAULT_USER_PROFILE.height).toBe(175)
    expect(DEFAULT_USER_PROFILE.activityLevel).toBe('moderate')
    expect(DEFAULT_USER_PROFILE.goal).toBe('maintain')
  })

  it('默认档案应包含均衡饮食偏好', () => {
    expect(DEFAULT_USER_PROFILE.dietaryPreferences).toContain('balanced')
  })

  it('默认档案应无过敏', () => {
    expect(DEFAULT_USER_PROFILE.allergies).toEqual([])
  })
})

// ============================================================
// BMR / TDEE 计算
// ============================================================

describe('BMR 计算（Mifflin-St Jeor 方程）', () => {
  it('默认男性档案 BMR 应约为 1688 kcal', () => {
    const engine = useNutritionEngine()
    const bmr = engine.calculateBMR()
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 ≈ 1649
    expect(bmr).toBeGreaterThanOrEqual(1600)
    expect(bmr).toBeLessThanOrEqual(1750)
  })

  it('女性 BMR 计算结果应低于男性', () => {
    const engine = useNutritionEngine({
      gender: 'female',
      weight: 60,
      height: 165,
      age: 30,
    })
    const bmr = engine.calculateBMR()
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 ≈ 1320
    expect(bmr).toBeGreaterThanOrEqual(1250)
    expect(bmr).toBeLessThanOrEqual(1400)
  })

  it('体重越高 BMR 越高', () => {
    const light = useNutritionEngine({ weight: 50 })
    const heavy = useNutritionEngine({ weight: 100 })
    expect(heavy.calculateBMR()).toBeGreaterThan(light.calculateBMR())
  })

  it('年龄越大 BMR 越低', () => {
    const young = useNutritionEngine({ age: 20 })
    const old = useNutritionEngine({ age: 60 })
    expect(old.calculateBMR()).toBeLessThan(young.calculateBMR())
  })

  it('身高越高 BMR 越高', () => {
    const short = useNutritionEngine({ height: 160 })
    const tall = useNutritionEngine({ height: 190 })
    expect(tall.calculateBMR()).toBeGreaterThan(short.calculateBMR())
  })
})

describe('TDEE 计算', () => {
  it('TDEE 应大于 BMR', () => {
    const engine = useNutritionEngine()
    const bmr = engine.calculateBMR()
    const tdee = engine.calculateTDEE()
    expect(tdee).toBeGreaterThan(bmr)
  })

  it('久坐人群 TDEE 系数为 1.2', () => {
    const engine = useNutritionEngine({ activityLevel: 'sedentary' })
    const bmr = engine.calculateBMR()
    const tdee = engine.calculateTDEE()
    expect(tdee).toBe(Math.round(bmr * 1.2))
  })

  it('高度活跃人群 TDEE 系数为 1.725', () => {
    const engine = useNutritionEngine({ activityLevel: 'active' })
    const bmr = engine.calculateBMR()
    const tdee = engine.calculateTDEE()
    expect(tdee).toBe(Math.round(bmr * 1.725))
  })

  it('极高活跃人群 TDEE 系数为 1.9', () => {
    const engine = useNutritionEngine({ activityLevel: 'very_active' })
    const bmr = engine.calculateBMR()
    const tdee = engine.calculateTDEE()
    expect(tdee).toBe(Math.round(bmr * 1.9))
  })
})

describe('目标热量计算', () => {
  it('维持目标热量约等于 TDEE', () => {
    const engine = useNutritionEngine({ goal: 'maintain' })
    const tdee = engine.calculateTDEE()
    const target = engine.calculateTargetCalories()
    expect(target).toBe(tdee)
  })

  it('减重目标热量应低于 TDEE 约 20%', () => {
    const engine = useNutritionEngine({ goal: 'lose_weight' })
    const tdee = engine.calculateTDEE()
    const target = engine.calculateTargetCalories()
    expect(target).toBeLessThan(tdee)
    expect(target).toBe(Math.round(tdee * 0.8))
  })

  it('增肌目标热量应高于 TDEE 约 15%', () => {
    const engine = useNutritionEngine({ goal: 'gain_muscle' })
    const tdee = engine.calculateTDEE()
    const target = engine.calculateTargetCalories()
    expect(target).toBeGreaterThan(tdee)
    expect(target).toBe(Math.round(tdee * 1.15))
  })

  it('改善健康目标热量约等于 TDEE', () => {
    const engine = useNutritionEngine({ goal: 'improve_health' })
    const tdee = engine.calculateTDEE()
    const target = engine.calculateTargetCalories()
    expect(target).toBe(tdee)
  })
})

// ============================================================
// 个性化营养目标
// ============================================================

describe('个性化营养目标计算', () => {
  it('应返回完整的 NutritionTargets 结构', () => {
    const engine = useNutritionEngine()
    const targets = engine.computeNutritionTargets()
    expect(targets.bmr).toBeGreaterThan(0)
    expect(targets.tdee).toBeGreaterThan(0)
    expect(targets.targetCalories).toBeGreaterThan(0)
    expect(targets.calorieRange).toHaveLength(2)
    expect(targets.macros.protein).toBeDefined()
    expect(targets.macros.carbs).toBeDefined()
    expect(targets.macros.fat).toBeDefined()
    expect(targets.fiberTarget).toBeGreaterThan(0)
    expect(targets.waterTarget).toBeGreaterThan(0)
    expect(targets.mealDistribution).toBeDefined()
    expect(targets.personalizedNotes.length).toBeGreaterThan(0)
  })

  it('增肌目标蛋白质推荐应高于维持目标', () => {
    const gainEngine = useNutritionEngine({ goal: 'gain_muscle' })
    const maintainEngine = useNutritionEngine({ goal: 'maintain' })
    const gainTargets = gainEngine.computeNutritionTargets()
    const maintainTargets = maintainEngine.computeNutritionTargets()
    expect(gainTargets.macros.protein.recommended)
      .toBeGreaterThan(maintainTargets.macros.protein.recommended)
  })

  it('减重目标蛋白质推荐应高于维持目标', () => {
    const loseEngine = useNutritionEngine({ goal: 'lose_weight' })
    const maintainEngine = useNutritionEngine({ goal: 'maintain' })
    const loseTargets = loseEngine.computeNutritionTargets()
    const maintainTargets = maintainEngine.computeNutritionTargets()
    expect(loseTargets.macros.protein.recommended)
      .toBeGreaterThan(maintainTargets.macros.protein.recommended)
  })

  it('宏量营养素目标应有合理范围', () => {
    const engine = useNutritionEngine()
    const targets = engine.computeNutritionTargets()
    // 蛋白质推荐应在 min 和 max 之间
    expect(targets.macros.protein.recommended).toBeGreaterThanOrEqual(targets.macros.protein.min)
    expect(targets.macros.protein.recommended).toBeLessThanOrEqual(targets.macros.protein.max)
    // 碳水推荐应在 min 和 max 之间
    expect(targets.macros.carbs.recommended).toBeGreaterThanOrEqual(targets.macros.carbs.min)
    expect(targets.macros.carbs.recommended).toBeLessThanOrEqual(targets.macros.carbs.max)
    // 脂肪推荐应在 min 和 max 之间
    expect(targets.macros.fat.recommended).toBeGreaterThanOrEqual(targets.macros.fat.min)
    expect(targets.macros.fat.recommended).toBeLessThanOrEqual(targets.macros.fat.max)
  })

  it('热量范围应合理（目标热量 ±15%）', () => {
    const engine = useNutritionEngine()
    const targets = engine.computeNutritionTargets()
    expect(targets.calorieRange[0]).toBe(Math.round(targets.targetCalories * 0.85))
    expect(targets.calorieRange[1]).toBe(Math.round(targets.targetCalories * 1.15))
  })

  it('饮水量目标应为体重 × 30ml', () => {
    const engine = useNutritionEngine({ weight: 70 })
    const targets = engine.computeNutritionTargets()
    expect(targets.waterTarget).toBe(2100)
  })

  it('个性化说明应包含 BMR 和 TDEE 信息', () => {
    const engine = useNutritionEngine()
    const targets = engine.computeNutritionTargets()
    const bmrInfo = targets.personalizedNotes.find(n => n.includes('BMR'))
    const tdeeInfo = targets.personalizedNotes.find(n => n.includes('TDEE'))
    expect(bmrInfo).toBeDefined()
    expect(tdeeInfo).toBeDefined()
  })

  it('50 岁以上档案应有额外说明', () => {
    const engine = useNutritionEngine({ age: 55 })
    const targets = engine.computeNutritionTargets()
    const ageNote = targets.personalizedNotes.find(n => n.includes('50'))
    expect(ageNote).toBeDefined()
  })

  it('高蛋白偏好应调整宏量比例', () => {
    const engine = useNutritionEngine({
      dietaryPreferences: ['high_protein'],
    })
    const targets = engine.computeNutritionTargets()
    // 高蛋白模式下蛋白质比例应更高
    expect(targets.macros.protein.energyRatio).toBeGreaterThanOrEqual(0.30)
  })

  it('素食偏好应调整宏量比例', () => {
    const engine = useNutritionEngine({
      dietaryPreferences: ['vegetarian'],
    })
    const targets = engine.computeNutritionTargets()
    expect(targets.macros.protein.energyRatio).toBeLessThanOrEqual(0.25)
  })

  it('生酮偏好碳水比例应显著降低', () => {
    const engine = useNutritionEngine({
      dietaryPreferences: ['keto'],
    })
    const targets = engine.computeNutritionTargets()
    expect(targets.macros.carbs.energyRatio).toBeLessThanOrEqual(0.15)
    expect(targets.macros.fat.energyRatio).toBeGreaterThanOrEqual(0.50)
  })
})

// ============================================================
// 餐次分布
// ============================================================

describe('餐次热量分布', () => {
  it('默认分布四餐比例和应为 1', () => {
    const engine = useNutritionEngine()
    const targets = engine.computeNutritionTargets()
    const dist = targets.mealDistribution
    const total = dist.breakfast.ratio + dist.lunch.ratio + dist.dinner.ratio + dist.snack.ratio
    expect(total).toBeCloseTo(1, 1)
  })

  it('间歇性断食早餐比例应降低', () => {
    const engine = useNutritionEngine({
      dietaryPreferences: ['intermittent'],
    })
    const targets = engine.computeNutritionTargets()
    expect(targets.mealDistribution.breakfast.ratio).toBeLessThanOrEqual(0.20)
    expect(targets.mealDistribution.lunch.ratio).toBeGreaterThanOrEqual(0.35)
  })

  it('每餐热量应与目标匹配', () => {
    const engine = useNutritionEngine()
    const targets = engine.computeNutritionTargets()
    const dist = targets.mealDistribution
    // 总热量应等于各餐热量之和
    const totalCal = dist.breakfast.calories + dist.lunch.calories
      + dist.dinner.calories + dist.snack.calories
    expect(totalCal).toBeGreaterThanOrEqual(targets.targetCalories - 5)
    expect(totalCal).toBeLessThanOrEqual(targets.targetCalories + 5)
  })
})

// ============================================================
// 档案更新
// ============================================================

describe('档案更新', () => {
  it('updateProfile 应更新档案并重新计算目标', () => {
    const engine = useNutritionEngine()
    const oldTargets = engine.computeNutritionTargets()
    engine.updateProfile({ weight: 80, goal: 'gain_muscle' })
    const newTargets = engine.targets.value
    expect(newTargets).not.toBeNull()
    if (newTargets) {
      expect(newTargets.targetCalories).not.toBe(oldTargets.targetCalories)
    }
  })

  it('updateProfile 应更新 profile ref', () => {
    const engine = useNutritionEngine()
    engine.updateProfile({ age: 35 })
    expect(engine.profile.value.age).toBe(35)
  })

  it('部分更新应保留未修改的字段', () => {
    const engine = useNutritionEngine()
    engine.updateProfile({ weight: 75 })
    expect(engine.profile.value.weight).toBe(75)
    expect(engine.profile.value.gender).toBe(DEFAULT_USER_PROFILE.gender)
    expect(engine.profile.value.height).toBe(DEFAULT_USER_PROFILE.height)
  })
})

// ============================================================
// 从指标推断档案
// ============================================================

describe('从 BodyMetric 推断档案', () => {
  it('应从体重指标推断体重', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('weight', 75, '2026-08-02'),
      createMetric('weight', 74.5, '2026-08-01'),
    ]
    const updates = engine.inferProfileFromMetrics(metrics)
    expect(updates.weight).toBe(75)
  })

  it('应从运动指标推断活动水平', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('exercise', 60, '2026-08-02'),
      createMetric('exercise', 55, '2026-08-01'),
      createMetric('exercise', 65, '2026-07-31'),
    ]
    const updates = engine.inferProfileFromMetrics(metrics)
    expect(updates.activityLevel).toBe('very_active')
  })

  it('较少运动应推断为轻度活动', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('exercise', 10, '2026-08-02'),
      createMetric('exercise', 15, '2026-08-01'),
    ]
    const updates = engine.inferProfileFromMetrics(metrics)
    expect(updates.activityLevel).toBe('light')
  })

  it('无运动记录应推断为久坐', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('exercise', 5, '2026-08-02'),
    ]
    const updates = engine.inferProfileFromMetrics(metrics)
    expect(updates.activityLevel).toBe('sedentary')
  })
})

// ============================================================
// 微量元素追踪
// ============================================================

describe('微量元素分析', () => {
  it('应返回所有微量元素的摄入状态', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    const statuses = engine.analyzeMicronutrients(meals)
    expect(statuses.length).toBeGreaterThan(10)
  })

  it('每个微量元素应有完整状态', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    const statuses = engine.analyzeMicronutrients(meals)
    for (const s of statuses) {
      expect(s.name).toBeDefined()
      expect(s.current).toBeGreaterThanOrEqual(0)
      expect(s.recommended).toBeGreaterThan(0)
      expect(s.unit).toBeDefined()
      expect(s.adequacy).toBeGreaterThanOrEqual(0)
      expect(s.adequacy).toBeLessThanOrEqual(1)
      expect(['deficient', 'low', 'adequate', 'excellent']).toContain(s.status)
      expect(s.foodSources.length).toBeGreaterThan(0)
    }
  })

  it('空膳食应返回空数组', () => {
    const engine = useNutritionEngine()
    const statuses = engine.analyzeMicronutrients([])
    expect(statuses).toEqual([])
  })

  it('应能获取缺乏的微量元素', () => {
    const engine = useNutritionEngine()
    // 只吃米饭，必定缺乏多种微量元素
    const meals: MealRecord[] = [{
      id: 'm1', type: 'lunch', date: '2026-08-02', time: '12:00',
      foods: [{ ...FOOD_DATABASE['米饭'], portion: 300 }],
      fullness: 3, satisfaction: 3,
    }]
    engine.analyzeMicronutrients(meals)
    const deficient = engine.getDeficientMicronutrients()
    expect(deficient.length).toBeGreaterThan(0)
    for (const d of deficient) {
      expect(['deficient', 'low']).toContain(d.status)
    }
  })

  it('微量元素评分应在 0-100 之间', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    engine.analyzeMicronutrients(meals)
    const score = engine.getMicronutrientScore()
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('空膳食微量元素评分为 0', () => {
    const engine = useNutritionEngine()
    engine.analyzeMicronutrients([])
    const score = engine.getMicronutrientScore()
    expect(score).toBe(0)
  })

  it('女性铁的推荐量应高于男性', () => {
    const maleEngine = useNutritionEngine({ gender: 'male' })
    const femaleEngine = useNutritionEngine({ gender: 'female' })
    const meals = createBalancedMeals()
    maleEngine.analyzeMicronutrients(meals)
    femaleEngine.analyzeMicronutrients(meals)
    const maleIron = maleEngine.micronutrientStatus.value.find(m => m.name === '铁')
    const femaleIron = femaleEngine.micronutrientStatus.value.find(m => m.name === '铁')
    expect(maleIron).toBeDefined()
    expect(femaleIron).toBeDefined()
    if (maleIron && femaleIron) {
      expect(femaleIron.recommended).toBeGreaterThan(maleIron.recommended)
    }
  })
})

// ============================================================
// 膳食计划
// ============================================================

describe('膳食计划生成', () => {
  it('应生成完整的 MealPlan', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan('2026-08-02')
    expect(plan.date).toBe('2026-08-02')
    expect(plan.calorieTarget).toBeGreaterThan(0)
    expect(plan.meals).toHaveLength(4)
    expect(plan.meals[0].mealType).toBe('breakfast')
    expect(plan.meals[1].mealType).toBe('lunch')
    expect(plan.meals[2].mealType).toBe('dinner')
    expect(plan.meals[3].mealType).toBe('snack')
    expect(plan.dailySummary).toBeTruthy()
    expect(plan.alternatives.length).toBeGreaterThan(0)
  })

  it('每餐应包含建议食物', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan()
    for (const meal of plan.meals) {
      expect(meal.suggestedFoods.length).toBeGreaterThan(0)
      // 每个食物应有基本属性
      for (const food of meal.suggestedFoods) {
        expect(food.name).toBeTruthy()
        expect(food.category).toBeTruthy()
        expect(food.portion).toBeGreaterThan(0)
        expect(food.calories).toBeGreaterThan(0)
      }
    }
  })

  it('每餐应有营养提示', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan()
    for (const meal of plan.meals) {
      expect(meal.nutritionTip.length).toBeGreaterThan(0)
    }
  })

  it('每餐应有建议时间', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan()
    for (const meal of plan.meals) {
      expect(meal.suggestedTime).toBeTruthy()
    }
  })

  it('每餐应有目标热量', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan()
    for (const meal of plan.meals) {
      expect(meal.calorieTarget).toBeGreaterThan(0)
    }
  })

  it('每日小结应包含目标热量', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan()
    expect(plan.dailySummary).toContain(String(plan.calorieTarget))
  })

  it('素食模式午餐应推荐豆腐', () => {
    const engine = useNutritionEngine({
      dietaryPreferences: ['vegetarian'],
    })
    const plan = engine.generateMealPlan()
    const lunch = plan.meals.find(m => m.mealType === 'lunch')!
    const hasTofu = lunch.suggestedFoods.some(f => f.name === '豆腐')
    expect(hasTofu).toBe(true)
  })

  it('生酮模式早餐应推荐牛油果', () => {
    const engine = useNutritionEngine({
      dietaryPreferences: ['keto'],
    })
    const plan = engine.generateMealPlan()
    const breakfast = plan.meals.find(m => m.mealType === 'breakfast')!
    const hasAvocado = breakfast.suggestedFoods.some(f => f.name === '牛油果')
    expect(hasAvocado).toBe(true)
  })

  it('替代建议应包含多种食物', () => {
    const engine = useNutritionEngine()
    const plan = engine.generateMealPlan()
    const names = plan.alternatives.map(a => a.name)
    expect(names.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================
// 摄入对比
// ============================================================

describe('实际摄入 vs 目标对比', () => {
  it('应返回完整的 NutritionComparison', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    const comparison = engine.compareIntake(meals)
    expect(comparison.calories).toBeDefined()
    expect(comparison.macros.protein).toBeDefined()
    expect(comparison.macros.carbs).toBeDefined()
    expect(comparison.macros.fat).toBeDefined()
    expect(comparison.score).toBeGreaterThanOrEqual(0)
    expect(comparison.score).toBeLessThanOrEqual(100)
    expect(comparison.assessment).toBeTruthy()
  })

  it('热量状态应正确分类', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    const comparison = engine.compareIntake(meals)
    expect(['below', 'on_target', 'above']).toContain(comparison.calories.status)
  })

  it('空膳食应返回低分', () => {
    const engine = useNutritionEngine()
    const comparison = engine.compareIntake([])
    expect(comparison.score).toBeLessThanOrEqual(60)
  })

  it('热量偏差应正确计算', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    const comparison = engine.compareIntake(meals)
    const expected = comparison.calories.actual - comparison.calories.target
    expect(comparison.calories.deviation).toBe(expected)
  })

  it('宏量营养素偏差应正确计算', () => {
    const engine = useNutritionEngine()
    const meals = createBalancedMeals()
    const comparison = engine.compareIntake(meals)
    expect(comparison.macros.protein.deviation).toBe(
      comparison.macros.protein.actual - comparison.macros.protein.target,
    )
  })
})

// ============================================================
// 动态营养评分
// ============================================================

describe('动态营养评分（computeDynamicNutritionScore）', () => {
  it('有营养直接记录应返回平均值', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('nutrition', 85, '2026-08-02'),
      createMetric('nutrition', 75, '2026-08-01'),
    ]
    const score = engine.computeDynamicNutritionScore(metrics)
    expect(score).toBe(80)
  })

  it('有饮水记录应返回合理评分', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('water', 2000, '2026-08-02'),
      createMetric('water', 2100, '2026-08-01'),
    ]
    const score = engine.computeDynamicNutritionScore(metrics)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('有运动记录应返回合理评分', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('exercise', 30, '2026-08-02'),
      createMetric('exercise', 45, '2026-08-01'),
    ]
    const score = engine.computeDynamicNutritionScore(metrics)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('有体重记录应返回合理评分', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('weight', 70, '2026-07-01'),
      createMetric('weight', 70.3, '2026-08-01'),
    ]
    const score = engine.computeDynamicNutritionScore(metrics)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('无任何指标应返回基于档案的默认评分', () => {
    const engine = useNutritionEngine()
    const score = engine.computeDynamicNutritionScore([])
    // 维持目标下，基于 TDEE 的热量估算与目标完全匹配，评分接近 100
    expect(score).toBeGreaterThanOrEqual(60)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('多维度指标应综合评分', () => {
    const engine = useNutritionEngine()
    const metrics: BodyMetric[] = [
      createMetric('water', 2000, '2026-08-02'),
      createMetric('water', 2100, '2026-08-01'),
      createMetric('exercise', 30, '2026-08-02'),
      createMetric('exercise', 45, '2026-08-01'),
      createMetric('weight', 70, '2026-07-01'),
      createMetric('weight', 70.5, '2026-08-01'),
    ]
    const score = engine.computeDynamicNutritionScore(metrics)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ============================================================
// 不同档案初始化
// ============================================================

describe('不同档案初始化', () => {
  it('应支持自定义初始档案', () => {
    const engine = useNutritionEngine({
      gender: 'female',
      age: 25,
      weight: 55,
      height: 160,
      activityLevel: 'active',
      goal: 'lose_weight',
    })
    expect(engine.profile.value.gender).toBe('female')
    expect(engine.profile.value.age).toBe(25)
    expect(engine.profile.value.weight).toBe(55)
    expect(engine.profile.value.height).toBe(160)
    expect(engine.profile.value.activityLevel).toBe('active')
    expect(engine.profile.value.goal).toBe('lose_weight')
  })

  it('部分初始化应保留默认值', () => {
    const engine = useNutritionEngine({ weight: 80 })
    expect(engine.profile.value.weight).toBe(80)
    expect(engine.profile.value.gender).toBe(DEFAULT_USER_PROFILE.gender)
    expect(engine.profile.value.age).toBe(DEFAULT_USER_PROFILE.age)
  })

  it('目标变化后派生状态应更新', () => {
    const engine = useNutritionEngine({ goal: 'maintain' })
    engine.computeNutritionTargets()
    const maintainCalories = engine.targetCalories.value
    engine.updateProfile({ goal: 'lose_weight' })
    expect(engine.targetCalories.value).toBeLessThan(maintainCalories)
  })
})

// ============================================================
// 派生状态
// ============================================================

describe('派生状态 computed', () => {
  it('bmr 应从 targets 派生', () => {
    const engine = useNutritionEngine()
    expect(engine.bmr.value).toBe(0) // 初始未计算
    engine.computeNutritionTargets()
    expect(engine.bmr.value).toBeGreaterThan(0)
  })

  it('tdee 应从 targets 派生', () => {
    const engine = useNutritionEngine()
    engine.computeNutritionTargets()
    expect(engine.tdee.value).toBeGreaterThan(engine.bmr.value)
  })

  it('targetCalories 应从 targets 派生', () => {
    const engine = useNutritionEngine()
    engine.computeNutritionTargets()
    expect(engine.targetCalories.value).toBeGreaterThan(0)
  })
})

// ============================================================
// 边界情况
// ============================================================

describe('边界情况', () => {
  it('极端体重应正常计算', () => {
    const engine = useNutritionEngine({ weight: 30 })
    const targets = engine.computeNutritionTargets()
    expect(targets.bmr).toBeGreaterThan(0)
    expect(targets.macros.protein.recommended).toBeGreaterThan(0)
  })

  it('极端身高应正常计算', () => {
    const engine = useNutritionEngine({ height: 140 })
    const targets = engine.computeNutritionTargets()
    expect(targets.bmr).toBeGreaterThan(0)
  })

  it('极端年龄应正常计算', () => {
    const engine = useNutritionEngine({ age: 80 })
    const targets = engine.computeNutritionTargets()
    expect(targets.bmr).toBeGreaterThan(0)
  })

  it('有过敏食物时膳食计划应过滤', () => {
    const engine = useNutritionEngine({
      allergies: ['鸡蛋', '牛奶'],
    })
    const plan = engine.generateMealPlan()
    const breakfast = plan.meals.find(m => m.mealType === 'breakfast')!
    const hasEgg = breakfast.suggestedFoods.some(f => f.name === '鸡蛋')
    const hasMilk = breakfast.suggestedFoods.some(f => f.name === '牛奶')
    expect(hasEgg).toBe(false)
    expect(hasMilk).toBe(false)
  })
})