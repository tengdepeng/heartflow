// ============================================================
// 身体温室 · 个性化营养引擎（P16-2）
// BMR/TDEE计算、个性化宏量目标、微量元素追踪、膳食计划推荐
// ============================================================

import { ref, computed } from 'vue'
import type { BodyMetric } from './types'
import type { MealRecord, MealType } from './nutrition-scoring'
import { getLocalDateKey } from '../../utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 用户身体档案 */
export interface UserProfile {
  /** 性别 */
  gender: 'male' | 'female'
  /** 年龄（岁） */
  age: number
  /** 体重（kg） */
  weight: number
  /** 身高（cm） */
  height: number
  /** 活动水平 */
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  /** 目标 */
  goal: 'lose_weight' | 'maintain' | 'gain_muscle' | 'improve_health'
  /** 特殊饮食需求 */
  dietaryPreferences?: DietaryPreference[]
  /** 过敏/忌口 */
  allergies?: string[]
}

/** 饮食偏好 */
export type DietaryPreference =
  | 'balanced'       // 均衡
  | 'high_protein'   // 高蛋白
  | 'low_carb'       // 低碳水
  | 'low_fat'        // 低脂
  | 'vegetarian'     // 素食
  | 'mediterranean'  // 地中海
  | 'asian'          // 亚洲
  | 'keto'           // 生酮
  | 'intermittent'   // 间歇性断食

/** 活动水平系数 */
const ACTIVITY_MULTIPLIERS: Record<UserProfile['activityLevel'], number> = {
  sedentary: 1.2,      // 久坐不动
  light: 1.375,         // 轻度活动（每周 1-3 天）
  moderate: 1.55,       // 中度活动（每周 3-5 天）
  active: 1.725,        // 高度活动（每周 6-7 天）
  very_active: 1.9,     // 极高活动（每天高强度）
}

/** 目标热量调整系数 */
const GOAL_CALORIE_ADJUSTMENTS: Record<UserProfile['goal'], number> = {
  lose_weight: -0.2,    // 减重：-20%
  maintain: 0,           // 维持：不变
  gain_muscle: 0.15,     // 增肌：+15%
  improve_health: 0,     // 改善健康：不变
}

/** 个性化营养目标 */
export interface NutritionTargets {
  /** 基础代谢率 BMR（kcal/天） */
  bmr: number
  /** 每日总能量消耗 TDEE（kcal/天） */
  tdee: number
  /** 目标热量摄入（kcal/天） */
  targetCalories: number
  /** 热量范围 */
  calorieRange: [number, number]
  /** 宏量营养素目标（克） */
  macros: {
    protein: MacroTarget
    carbs: MacroTarget
    fat: MacroTarget
  }
  /** 膳食纤维目标（克） */
  fiberTarget: number
  /** 水分摄入目标（ml） */
  waterTarget: number
  /** 推荐餐次分布 */
  mealDistribution: MealDistribution
  /** 个性化说明 */
  personalizedNotes: string[]
}

/** 宏量营养素目标 */
export interface MacroTarget {
  /** 最小摄入量（克） */
  min: number
  /** 最大摄入量（克） */
  max: number
  /** 推荐摄入量（克） */
  recommended: number
  /** 供能比百分比 */
  energyRatio: number
  /** 单位体重摄入量（克/kg） */
  perKgBodyWeight: number
}

/** 餐次热量分布 */
export interface MealDistribution {
  breakfast: { ratio: number; calories: number }
  lunch: { ratio: number; calories: number }
  dinner: { ratio: number; calories: number }
  snack: { ratio: number; calories: number }
}

/** 微量元素追踪 */
export interface MicronutrientStatus {
  /** 微量元素名称 */
  name: string
  /** 当前摄入量 */
  current: number
  /** 推荐摄入量 */
  recommended: number
  /** 单位 */
  unit: string
  /** 达标率 */
  adequacy: number
  /** 状态 */
  status: 'deficient' | 'low' | 'adequate' | 'excellent'
  /** 富含该元素的食物建议 */
  foodSources: string[]
}

/** 膳食计划 */
export interface MealPlan {
  /** 日期 */
  date: string
  /** 热量目标 */
  calorieTarget: number
  /** 各餐建议 */
  meals: MealPlanItem[]
  /** 每日小结 */
  dailySummary: string
  /** 替代建议 */
  alternatives: FoodSuggestion[]
}

/** 膳食计划单项 */
export interface MealPlanItem {
  mealType: MealType
  /** 建议时间 */
  suggestedTime: string
  /** 目标热量 */
  calorieTarget: number
  /** 建议食物 */
  suggestedFoods: FoodSuggestion[]
  /** 营养提示 */
  nutritionTip: string
}

/** 食物建议 */
export interface FoodSuggestion {
  name: string
  category: string
  portion: number
  unit: string
  calories: number
  reason: string
}

/** 营养摄入实际 vs 目标对比 */
export interface NutritionComparison {
  /** 日期 */
  date: string
  /** 热量对比 */
  calories: {
    target: number
    actual: number
    deviation: number
    status: 'below' | 'on_target' | 'above'
  }
  /** 宏量营养素对比 */
  macros: {
    protein: { target: number; actual: number; deviation: number }
    carbs: { target: number; actual: number; deviation: number }
    fat: { target: number; actual: number; deviation: number }
  }
  /** 总体评分 */
  score: number
  /** 评价 */
  assessment: string
}

// ============================================================
// 默认用户档案
// ============================================================

export const DEFAULT_USER_PROFILE: UserProfile = {
  gender: 'male',
  age: 30,
  weight: 70,
  height: 175,
  activityLevel: 'moderate',
  goal: 'maintain',
  dietaryPreferences: ['balanced'],
  allergies: [],
}

// ============================================================
// 微量元素参考数据
// ============================================================

/** 常见微量元素每日推荐摄入量 */
const MICRONUTRIENT_RDIS: Record<string, {
  label: string
  unit: string
  male: number
  female: number
  foodSources: string[]
}> = {
  'vitamin_a': {
    label: '维生素A', unit: 'μg RAE',
    male: 800, female: 700,
    foodSources: ['胡萝卜', '南瓜', '菠菜', '红薯', '蛋黄'],
  },
  'vitamin_c': {
    label: '维生素C', unit: 'mg',
    male: 100, female: 100,
    foodSources: ['橙子', '猕猴桃', '西兰花', '番茄', '草莓'],
  },
  'vitamin_d': {
    label: '维生素D', unit: 'IU',
    male: 600, female: 600,
    foodSources: ['三文鱼', '蛋黄', '牛奶', '蘑菇', '阳光照射'],
  },
  'vitamin_e': {
    label: '维生素E', unit: 'mg',
    male: 15, female: 15,
    foodSources: ['杏仁', '葵花籽', '菠菜', '牛油果', '橄榄油'],
  },
  'vitamin_b12': {
    label: '维生素B12', unit: 'μg',
    male: 2.4, female: 2.4,
    foodSources: ['牛肉', '鱼类', '鸡蛋', '牛奶', '奶酪'],
  },
  'iron': {
    label: '铁', unit: 'mg',
    male: 12, female: 20,
    foodSources: ['牛肉', '猪肝', '菠菜', '豆类', '黑木耳'],
  },
  'calcium': {
    label: '钙', unit: 'mg',
    male: 800, female: 800,
    foodSources: ['牛奶', '酸奶', '豆腐', '芝麻', '虾皮'],
  },
  'zinc': {
    label: '锌', unit: 'mg',
    male: 12.5, female: 7.5,
    foodSources: ['牡蛎', '牛肉', '南瓜籽', '坚果', '全谷物'],
  },
  'magnesium': {
    label: '镁', unit: 'mg',
    male: 350, female: 300,
    foodSources: ['杏仁', '菠菜', '黑巧克力', '牛油果', '香蕉'],
  },
  'potassium': {
    label: '钾', unit: 'mg',
    male: 2000, female: 2000,
    foodSources: ['香蕉', '土豆', '菠菜', '牛油果', '豆类'],
  },
  'omega3': {
    label: 'Omega-3', unit: 'mg',
    male: 250, female: 250,
    foodSources: ['三文鱼', '沙丁鱼', '亚麻籽', '核桃', '奇亚籽'],
  },
  'folate': {
    label: '叶酸', unit: 'μg DFE',
    male: 400, female: 400,
    foodSources: ['菠菜', '芦笋', '豆类', '西兰花', '牛油果'],
  },
}

/** 食物微量元素含量数据（每 100g） */
const FOOD_MICRONUTRIENTS: Record<string, Partial<Record<string, number>>> = {
  '菠菜': { vitamin_a: 469, vitamin_c: 28, vitamin_e: 2, iron: 2.7, calcium: 99, magnesium: 79, potassium: 558, folate: 194 },
  '西兰花': { vitamin_a: 31, vitamin_c: 89, vitamin_k: 101, folate: 63, calcium: 47, potassium: 316 },
  '胡萝卜': { vitamin_a: 835, vitamin_c: 6, vitamin_e: 0.7, potassium: 320 },
  '番茄': { vitamin_a: 42, vitamin_c: 14, vitamin_e: 0.5, potassium: 237 },
  '三文鱼': { vitamin_d: 526, vitamin_b12: 3.2, omega3: 2260, iron: 0.5, zinc: 0.6 },
  '鸡蛋': { vitamin_a: 140, vitamin_d: 82, vitamin_b12: 0.9, vitamin_e: 1, iron: 1.8, zinc: 1.3 },
  '牛肉': { iron: 2.6, zinc: 6.3, vitamin_b12: 2.5, magnesium: 21, potassium: 318 },
  '鸡胸肉': { vitamin_b12: 0.3, iron: 0.7, zinc: 0.9, magnesium: 28, potassium: 256 },
  '牛奶': { calcium: 120, vitamin_d: 2.5, vitamin_b12: 0.4, magnesium: 11, potassium: 150 },
  '酸奶': { calcium: 110, vitamin_b12: 0.5, magnesium: 12, potassium: 155 },
  '豆腐': { calcium: 350, iron: 5.4, magnesium: 30, zinc: 0.8, potassium: 121 },
  '苹果': { vitamin_c: 4.6, potassium: 107, folate: 3 },
  '香蕉': { vitamin_c: 8.7, potassium: 358, magnesium: 27, vitamin_b6: 0.4, folate: 20 },
  '橙子': { vitamin_c: 53, potassium: 181, folate: 30, calcium: 40 },
  '蓝莓': { vitamin_c: 9.7, vitamin_e: 0.6, potassium: 77, folate: 6 },
  '核桃': { omega3: 9079, vitamin_e: 0.7, magnesium: 158, zinc: 3.1, iron: 2.9 },
  '杏仁': { vitamin_e: 25.6, magnesium: 270, calcium: 269, iron: 3.7, zinc: 3.1 },
  '燕麦': { iron: 4.7, magnesium: 177, zinc: 3.6, folate: 56, potassium: 429 },
  '全麦面包': { iron: 2.5, magnesium: 82, zinc: 1.8, folate: 50, potassium: 254 },
  '米饭': { iron: 0.2, magnesium: 12, potassium: 35, folate: 3 },
  '虾仁': { zinc: 1.6, vitamin_b12: 1.5, omega3: 300, iron: 0.5, calcium: 50 },
  '豆浆': { calcium: 25, iron: 0.6, magnesium: 25, potassium: 118, folate: 15 },
  '奶酪': { calcium: 721, vitamin_a: 250, vitamin_b12: 1.5, zinc: 3.5, magnesium: 28 },
  '橄榄油': { vitamin_e: 14.4, omega3: 761 },
  '绿茶': { vitamin_c: 6, potassium: 8, folate: 0 },
  '巧克力': { iron: 3.4, magnesium: 146, zinc: 2, potassium: 559 },
  '黄瓜': { vitamin_c: 2.8, potassium: 147, magnesium: 13 },
  '葡萄': { vitamin_c: 3.2, potassium: 191, vitamin_k: 14.6 },
  '小米粥': { iron: 0.4, magnesium: 12, potassium: 40, folate: 5 },
  '面条': { iron: 1.2, magnesium: 18, potassium: 74, folate: 15 },
  '馒头': { iron: 0.5, magnesium: 15, potassium: 82, folate: 12 },
  '薯片': { potassium: 1275, iron: 1.6, magnesium: 55 },
}

// ============================================================
// useNutritionEngine Composable
// ============================================================

export function useNutritionEngine(initialProfile?: Partial<UserProfile>) {
  // ---- 配置 ----
  const profile = ref<UserProfile>({
    ...DEFAULT_USER_PROFILE,
    ...initialProfile,
  })

  // ---- 状态 ----
  const targets = ref<NutritionTargets | null>(null)
  const micronutrientStatus = ref<MicronutrientStatus[]>([])

  // ---- 派生状态 ----
  const bmr = computed(() => targets.value?.bmr ?? 0)
  const tdee = computed(() => targets.value?.tdee ?? 0)
  const targetCalories = computed(() => targets.value?.targetCalories ?? 0)

  // ============================================================
  // BMR / TDEE 计算
  // ============================================================

  /**
   * 使用 Mifflin-St Jeor 方程计算基础代谢率（BMR）
   * 男性：BMR = 10W + 6.25H - 5A + 5
   * 女性：BMR = 10W + 6.25H - 5A - 161
   */
  function calculateBMR(): number {
    const { gender, weight, height, age } = profile.value
    const base = 10 * weight + 6.25 * height - 5 * age
    return Math.round(gender === 'male' ? base + 5 : base - 161)
  }

  /**
   * 计算每日总能量消耗（TDEE）
   * TDEE = BMR × 活动水平系数
   */
  function calculateTDEE(): number {
    const bmrVal = calculateBMR()
    const multiplier = ACTIVITY_MULTIPLIERS[profile.value.activityLevel]
    return Math.round(bmrVal * multiplier)
  }

  /**
   * 计算目标热量摄入
   * 在 TDEE 基础上根据目标调整
   */
  function calculateTargetCalories(): number {
    const tdeeVal = calculateTDEE()
    const adjustment = GOAL_CALORIE_ADJUSTMENTS[profile.value.goal]
    return Math.round(tdeeVal * (1 + adjustment))
  }

  // ============================================================
  // 个性化营养目标
  // ============================================================

  /**
   * 计算个性化营养目标
   */
  function computeNutritionTargets(): NutritionTargets {
    const bmrVal = calculateBMR()
    const tdeeVal = calculateTDEE()
    const targetCal = calculateTargetCalories()
    const { weight, goal, dietaryPreferences } = profile.value

    // 宏量营养素目标
    const macroRatios = getMacroRatios(goal, dietaryPreferences ?? [])

    // 蛋白质目标（克）
    const proteinPerKg = goal === 'gain_muscle' ? 2.0
      : goal === 'lose_weight' ? 1.8
      : 1.2
    const proteinRecommended = Math.round(weight * proteinPerKg)
    const proteinCal = proteinRecommended * 4
    const proteinRatio = macroRatios.protein

    // 脂肪目标（克）
    const fatRatio = macroRatios.fat
    const fatCal = Math.round(targetCal * fatRatio)
    const fatRecommended = Math.round(fatCal / 9)

    // 碳水目标（克）
    const carbCal = targetCal - proteinCal - fatCal
    const carbRecommended = Math.max(0, Math.round(carbCal / 4))
    const carbRatio = macroRatios.carbs

    // 纤维目标
    const fiberTarget = goal === 'gain_muscle' ? 30
      : goal === 'lose_weight' ? 35
      : 25

    // 水分目标
    const waterTarget = Math.round(weight * 30) // 30ml/kg

    // 餐次分布
    const mealDistribution = computeMealDistribution(targetCal, dietaryPreferences ?? [])

    // 个性化说明
    const personalizedNotes = generatePersonalizedNotes(profile.value, bmrVal, tdeeVal)

    const targetsResult: NutritionTargets = {
      bmr: bmrVal,
      tdee: tdeeVal,
      targetCalories: targetCal,
      calorieRange: [Math.round(targetCal * 0.85), Math.round(targetCal * 1.15)],
      macros: {
        protein: {
          min: Math.round(proteinRecommended * 0.8),
          max: Math.round(proteinRecommended * 1.3),
          recommended: proteinRecommended,
          energyRatio: proteinRatio,
          perKgBodyWeight: proteinPerKg,
        },
        carbs: {
          min: Math.round(carbRecommended * 0.8),
          max: Math.round(carbRecommended * 1.3),
          recommended: carbRecommended,
          energyRatio: carbRatio,
          perKgBodyWeight: Math.round(carbRecommended / weight * 10) / 10,
        },
        fat: {
          min: Math.round(fatRecommended * 0.7),
          max: Math.round(fatRecommended * 1.3),
          recommended: fatRecommended,
          energyRatio: fatRatio,
          perKgBodyWeight: Math.round(fatRecommended / weight * 10) / 10,
        },
      },
      fiberTarget,
      waterTarget,
      mealDistribution,
      personalizedNotes,
    }

    targets.value = targetsResult
    return targetsResult
  }

  // ============================================================
  // 微量元素追踪
  // ============================================================

  /**
   * 分析膳食记录的微量元素摄入情况
   */
  function analyzeMicronutrients(meals: MealRecord[]): MicronutrientStatus[] {
    const allFoods = meals.flatMap(m => m.foods)
    if (allFoods.length === 0) return []

    const results: MicronutrientStatus[] = []
    const { gender } = profile.value

    for (const [key, rdi] of Object.entries(MICRONUTRIENT_RDIS)) {
      // 计算当前摄入量
      let current = 0
      for (const food of allFoods) {
        const foodData = FOOD_MICRONUTRIENTS[food.name]
        if (foodData && foodData[key]) {
          current += (foodData[key]! * food.portion) / 100
        }
      }

      const recommended = gender === 'male' ? rdi.male : rdi.female
      const adequacy = recommended > 0 ? Math.min(1, current / recommended) : 0

      let status: MicronutrientStatus['status']
      if (adequacy >= 0.9) status = 'excellent'
      else if (adequacy >= 0.7) status = 'adequate'
      else if (adequacy >= 0.4) status = 'low'
      else status = 'deficient'

      results.push({
        name: rdi.label,
        current: Math.round(current * 10) / 10,
        recommended,
        unit: rdi.unit,
        adequacy: Math.round(adequacy * 100) / 100,
        status,
        foodSources: rdi.foodSources,
      })
    }

    micronutrientStatus.value = results
    return results
  }

  /**
   * 获取缺乏的微量元素列表
   */
  function getDeficientMicronutrients(): MicronutrientStatus[] {
    return micronutrientStatus.value.filter(
      m => m.status === 'deficient' || m.status === 'low',
    )
  }

  /**
   * 获取微量元素总体评分
   */
  function getMicronutrientScore(): number {
    if (micronutrientStatus.value.length === 0) return 0
    const avgAdequacy = micronutrientStatus.value.reduce(
      (sum, m) => sum + m.adequacy, 0,
    ) / micronutrientStatus.value.length
    return Math.round(avgAdequacy * 100)
  }

  // ============================================================
  // 膳食计划生成
  // ============================================================

  /**
   * 生成个性化膳食计划
   */
  function generateMealPlan(
    date: string = getLocalDateKey(new Date()),
  ): MealPlan {
    const t = computeNutritionTargets()
    const { dietaryPreferences, goal, allergies } = profile.value

    const meals: MealPlanItem[] = [
      generateBreakfast(t, dietaryPreferences ?? [], allergies ?? []),
      generateLunch(t, dietaryPreferences ?? [], allergies ?? []),
      generateDinner(t, dietaryPreferences ?? [], allergies ?? []),
      generateSnack(t, dietaryPreferences ?? [], allergies ?? []),
    ]

    // 生成替代建议
    const alternatives = generateAlternatives(t, dietaryPreferences ?? [])

    const dailySummary = generateDailySummary(goal, t)

    return {
      date,
      calorieTarget: t.targetCalories,
      meals,
      dailySummary,
      alternatives,
    }
  }

  // ============================================================
  // 实际摄入 vs 目标对比
  // ============================================================

  /**
   * 对比实际摄入和营养目标
   */
  function compareIntake(meals: MealRecord[]): NutritionComparison {
    const t = computeNutritionTargets()
    const allFoods = meals.flatMap(m => m.foods)

    // 实际摄入
    const actualProtein = allFoods.reduce((s, f) => s + f.protein, 0)
    const actualCarbs = allFoods.reduce((s, f) => s + f.carbs, 0)
    const actualFat = allFoods.reduce((s, f) => s + f.fat, 0)
    const actualCalories = allFoods.reduce((s, f) => s + f.calories, 0)

    // 热量偏差
    const calDeviation = actualCalories - t.targetCalories
    const calDeviationPercent = t.targetCalories > 0
      ? Math.round((calDeviation / t.targetCalories) * 100)
      : 0

    let calStatus: NutritionComparison['calories']['status']
    if (calDeviationPercent < -15) calStatus = 'below'
    else if (calDeviationPercent > 15) calStatus = 'above'
    else calStatus = 'on_target'

    // 宏量营养素对比
    const proteinTarget = t.macros.protein.recommended
    const carbsTarget = t.macros.carbs.recommended
    const fatTarget = t.macros.fat.recommended

    // 综合评分
    const calScore = calStatus === 'on_target' ? 100
      : calStatus === 'below' ? Math.max(0, 100 + calDeviationPercent * 2)
      : Math.max(0, 100 - calDeviationPercent * 2)

    const proteinScore = proteinTarget > 0
      ? Math.min(100, (actualProtein / proteinTarget) * 100)
      : 50
    const carbScore = carbsTarget > 0
      ? Math.min(100, (actualCarbs / carbsTarget) * 100)
      : 50
    const fatScore = fatTarget > 0
      ? Math.min(100, (actualFat / fatTarget) * 100)
      : 50

    const score = Math.round((calScore * 0.3 + proteinScore * 0.3 + carbScore * 0.2 + fatScore * 0.2))

    // 评估
    let assessment: string
    if (score >= 85) assessment = '今日营养摄入非常接近目标，继续保持！'
    else if (score >= 70) assessment = '整体摄入良好，部分指标可以微调'
    else if (score >= 50) assessment = '营养摄入与目标差距较大，建议调整饮食结构'
    else assessment = '今日营养摄入严重偏离目标，请关注饮食质量'

    return {
      date: meals.length > 0 ? meals[0].date : getLocalDateKey(new Date()),
      calories: {
        target: t.targetCalories,
        actual: actualCalories,
        deviation: calDeviation,
        status: calStatus,
      },
      macros: {
        protein: { target: proteinTarget, actual: actualProtein, deviation: actualProtein - proteinTarget },
        carbs: { target: carbsTarget, actual: actualCarbs, deviation: actualCarbs - carbsTarget },
        fat: { target: fatTarget, actual: actualFat, deviation: actualFat - fatTarget },
      },
      score,
      assessment,
    }
  }

  // ============================================================
  // 从 BodyMetric 推断营养评分（增强版）
  // ============================================================

  /**
   * 基于 BodyMetric 数据 + 个性化档案计算动态营养评分
   * 替换原来的固定值 50 算法
   */
  function computeDynamicNutritionScore(metrics: BodyMetric[]): number {
    const t = computeNutritionTargets()
    const nutritionMetrics = metrics.filter(m => m.type === 'nutrition')
    const weightMetrics = metrics.filter(m => m.type === 'weight')
    const waterMetrics = metrics.filter(m => m.type === 'water')
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')

    // 如果有直接营养记录，优先使用
    if (nutritionMetrics.length > 0) {
      const recent = nutritionMetrics.slice(-7)
      const avgValue = recent.reduce((s, m) => s + m.value, 0) / recent.length
      return Math.min(100, Math.round(avgValue))
    }

    // 基于间接指标动态计算
    let score = 0
    let totalWeight = 0

    // 饮水充足度（权重 25%）
    if (waterMetrics.length > 0) {
      const recentWater = waterMetrics.slice(-7)
      const avgWater = recentWater.reduce((s, m) => s + m.value, 0) / recentWater.length
      const waterScore = Math.min(100, (avgWater / t.waterTarget) * 100)
      score += waterScore * 0.25
      totalWeight += 0.25
    }

    // 运动规律度（权重 20%）
    if (exerciseMetrics.length > 0) {
      const recentExercise = exerciseMetrics.slice(-7)
      const avgExercise = recentExercise.reduce((s, m) => s + m.value, 0) / recentExercise.length
      const exerciseScore = avgExercise >= 30 ? 100
        : avgExercise >= 15 ? 70
        : avgExercise > 0 ? 40
        : 0
      score += exerciseScore * 0.20
      totalWeight += 0.20
    }

    // 体重稳定度（权重 20%）
    if (weightMetrics.length >= 2) {
      const sorted = weightMetrics.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      const first = sorted[0].value
      const last = sorted[sorted.length - 1].value
      const change = Math.abs(last - first)
      const weightScore = change < 1 ? 100
        : change < 3 ? 75
        : change < 5 ? 50
        : 25
      score += weightScore * 0.20
      totalWeight += 0.20
    }

    // 基于 TDEE 的热量估算（权重 35%）
    // 根据运动量估算实际热量消耗
    const estimatedCalories = estimateDailyCaloriesFromMetrics(metrics, t)
    const calorieScore = Math.min(100,
      100 - Math.abs(estimatedCalories - t.targetCalories) / t.targetCalories * 100,
    )
    score += Math.max(30, calorieScore) * 0.35
    totalWeight += 0.35

    // 如果没有足够数据，返回基于档案的默认评分
    if (totalWeight === 0) {
      return Math.round(50 + (profile.value.goal === 'maintain' ? 10 : 0))
    }

    return Math.min(100, Math.round(score / totalWeight))
  }

  /**
   * 从指标估算每日热量
   */
  function estimateDailyCaloriesFromMetrics(
    metrics: BodyMetric[],
    targets: NutritionTargets,
  ): number {
    let estimated = targets.bmr

    // 运动指标加成
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
    if (exerciseMetrics.length > 0) {
      const recent = exerciseMetrics.slice(-1)
      const exerciseMinutes = recent.reduce((s, m) => s + m.value, 0)
      // 估算：每 30 分钟运动约消耗 200-400 kcal
      estimated += (exerciseMinutes / 30) * 300
    }

    // 基于活动水平估算
    const multiplier = ACTIVITY_MULTIPLIERS[profile.value.activityLevel]
    estimated = Math.round(targets.bmr * multiplier)

    return estimated
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  /**
   * 根据目标和饮食偏好确定宏量营养素比例
   */
  function getMacroRatios(
    goal: UserProfile['goal'],
    preferences: DietaryPreference[],
  ): { protein: number; carbs: number; fat: number } {
    // 如果用户有特殊偏好，优先使用
    if (preferences.includes('high_protein')) {
      return { protein: 0.35, carbs: 0.35, fat: 0.30 }
    }
    if (preferences.includes('low_carb') || preferences.includes('keto')) {
      return { protein: 0.30, carbs: 0.10, fat: 0.60 }
    }
    if (preferences.includes('low_fat')) {
      return { protein: 0.25, carbs: 0.60, fat: 0.15 }
    }
    if (preferences.includes('vegetarian')) {
      return { protein: 0.20, carbs: 0.55, fat: 0.25 }
    }

    // 根据目标确定
    switch (goal) {
      case 'lose_weight':
        return { protein: 0.35, carbs: 0.35, fat: 0.30 }
      case 'gain_muscle':
        return { protein: 0.30, carbs: 0.45, fat: 0.25 }
      case 'improve_health':
        return { protein: 0.25, carbs: 0.50, fat: 0.25 }
      case 'maintain':
      default:
        return { protein: 0.20, carbs: 0.50, fat: 0.30 }
    }
  }

  /**
   * 计算餐次热量分布
   */
  function computeMealDistribution(
    totalCalories: number,
    preferences: DietaryPreference[],
  ): MealDistribution {
    // 默认分布：早餐 30% / 午餐 35% / 晚餐 25% / 加餐 10%
    let ratios = { breakfast: 0.30, lunch: 0.35, dinner: 0.25, snack: 0.10 }

    if (preferences.includes('intermittent')) {
      // 间歇性断食：跳过早餐或推迟早餐
      ratios = { breakfast: 0.15, lunch: 0.40, dinner: 0.35, snack: 0.10 }
    }
    if (preferences.includes('keto')) {
      ratios = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 }
    }

    return {
      breakfast: { ratio: ratios.breakfast, calories: Math.round(totalCalories * ratios.breakfast) },
      lunch: { ratio: ratios.lunch, calories: Math.round(totalCalories * ratios.lunch) },
      dinner: { ratio: ratios.dinner, calories: Math.round(totalCalories * ratios.dinner) },
      snack: { ratio: ratios.snack, calories: Math.round(totalCalories * ratios.snack) },
    }
  }

  /**
   * 生成个性化说明
   */
  function generatePersonalizedNotes(
    profile: UserProfile,
    bmr: number,
    tdee: number,
  ): string[] {
    const notes: string[] = []

    notes.push(`基础代谢率（BMR）：${bmr} kcal/天 — 这是您身体在完全静息状态下消耗的能量`)
    notes.push(`每日总消耗（TDEE）：${tdee} kcal/天 — 结合活动水平后的总能量消耗`)

    switch (profile.goal) {
      case 'lose_weight':
        notes.push('减重目标：建议每日热量缺口 300-500 kcal，配合每周 3-5 次有氧运动')
        break
      case 'gain_muscle':
        notes.push('增肌目标：建议每日热量盈余 300-500 kcal，配合每周 3-4 次力量训练')
        break
      case 'maintain':
        notes.push('维持目标：保持热量平衡，关注营养质量和食物多样性')
        break
      case 'improve_health':
        notes.push('健康改善目标：注重营养均衡，增加蔬果和全谷物摄入')
        break
    }

    if (profile.age > 50) {
      notes.push('注意：50 岁以上人群应额外关注钙和维生素 D 的摄入')
    }

    return notes
  }

  /**
   * 生成早餐建议
   */
  function generateBreakfast(
    targets: NutritionTargets,
    preferences: DietaryPreference[],
    allergies: string[],
  ): MealPlanItem {
    const cal = targets.mealDistribution.breakfast.calories
    const foods: FoodSuggestion[] = []

    if (preferences.includes('keto')) {
      foods.push(
        { name: '鸡蛋', category: 'protein', portion: 2, unit: '个', calories: 144, reason: '优质蛋白和脂肪' },
        { name: '牛油果', category: 'fat', portion: 100, unit: 'g', calories: 160, reason: '健康脂肪' },
        { name: '奶酪', category: 'dairy', portion: 30, unit: 'g', calories: 98, reason: '补充钙和蛋白质' },
      )
    } else if (preferences.includes('vegetarian')) {
      foods.push(
        { name: '燕麦', category: 'grain', portion: 50, unit: 'g', calories: 184, reason: '复合碳水+纤维' },
        { name: '豆浆', category: 'protein', portion: 250, unit: 'ml', calories: 78, reason: '植物蛋白' },
        { name: '蓝莓', category: 'fruit', portion: 100, unit: 'g', calories: 57, reason: '抗氧化' },
        { name: '核桃', category: 'fat', portion: 15, unit: 'g', calories: 98, reason: 'Omega-3' },
      )
    } else {
      foods.push(
        { name: '全麦面包', category: 'grain', portion: 80, unit: 'g', calories: 198, reason: '复合碳水' },
        { name: '鸡蛋', category: 'protein', portion: 2, unit: '个', calories: 144, reason: '优质蛋白' },
        { name: '牛奶', category: 'dairy', portion: 250, unit: 'ml', calories: 135, reason: '钙和蛋白' },
        { name: '苹果', category: 'fruit', portion: 150, unit: 'g', calories: 78, reason: '维生素和纤维' },
      )
    }

    // 过滤过敏食物
    const filtered = foods.filter(f => !allergies.some(a => f.name.includes(a)))

    return {
      mealType: 'breakfast',
      suggestedTime: '07:00-08:30',
      calorieTarget: cal,
      suggestedFoods: filtered,
      nutritionTip: '早餐提供全天能量基础，建议包含蛋白质+复合碳水+水果',
    }
  }

  /**
   * 生成午餐建议
   */
  function generateLunch(
    targets: NutritionTargets,
    preferences: DietaryPreference[],
    allergies: string[],
  ): MealPlanItem {
    const cal = targets.mealDistribution.lunch.calories
    const foods: FoodSuggestion[] = []

    foods.push(
      { name: '米饭', category: 'grain', portion: 150, unit: 'g', calories: 174, reason: '主食碳水' },
      { name: '鸡胸肉', category: 'protein', portion: 150, unit: 'g', calories: 200, reason: '瘦蛋白' },
      { name: '西兰花', category: 'vegetable', portion: 150, unit: 'g', calories: 51, reason: '纤维+维生素C' },
      { name: '番茄', category: 'vegetable', portion: 100, unit: 'g', calories: 18, reason: '番茄红素' },
    )

    if (preferences.includes('vegetarian')) {
      foods.splice(1, 1,
        { name: '豆腐', category: 'protein', portion: 200, unit: 'g', calories: 152, reason: '植物蛋白' },
      )
    }

    if (preferences.includes('keto')) {
      foods.splice(0, 1,
        { name: '三文鱼', category: 'protein', portion: 200, unit: 'g', calories: 416, reason: 'Omega-3+蛋白' },
      )
    }

    const filtered = foods.filter(f => !allergies.some(a => f.name.includes(a)))

    return {
      mealType: 'lunch',
      suggestedTime: '11:30-13:00',
      calorieTarget: cal,
      suggestedFoods: filtered,
      nutritionTip: '午餐应占全天热量 35%，保证蛋白质和蔬菜摄入',
    }
  }

  /**
   * 生成晚餐建议
   */
  function generateDinner(
    targets: NutritionTargets,
    preferences: DietaryPreference[],
    allergies: string[],
  ): MealPlanItem {
    const cal = targets.mealDistribution.dinner.calories
    const foods: FoodSuggestion[] = []

    foods.push(
      { name: '小米粥', category: 'grain', portion: 200, unit: 'g', calories: 92, reason: '易消化碳水' },
      { name: '虾仁', category: 'protein', portion: 100, unit: 'g', calories: 99, reason: '低脂蛋白' },
      { name: '菠菜', category: 'vegetable', portion: 150, unit: 'g', calories: 35, reason: '铁+叶酸' },
      { name: '豆腐', category: 'protein', portion: 100, unit: 'g', calories: 76, reason: '钙+蛋白' },
    )

    if (preferences.includes('keto')) {
      foods.splice(0, 1,
        { name: '牛肉', category: 'protein', portion: 150, unit: 'g', calories: 375, reason: '高蛋白+铁' },
      )
    }

    const filtered = foods.filter(f => !allergies.some(a => f.name.includes(a)))

    return {
      mealType: 'dinner',
      suggestedTime: '17:30-19:00',
      calorieTarget: cal,
      suggestedFoods: filtered,
      nutritionTip: '晚餐宜清淡，睡前 3 小时完成进食，避免影响睡眠',
    }
  }

  /**
   * 生成加餐建议
   */
  function generateSnack(
    targets: NutritionTargets,
    _preferences: DietaryPreference[],
    allergies: string[],
  ): MealPlanItem {
    const cal = targets.mealDistribution.snack.calories
    const foods: FoodSuggestion[] = []

    foods.push(
      { name: '酸奶', category: 'dairy', portion: 150, unit: 'g', calories: 108, reason: '益生菌+蛋白' },
      { name: '杏仁', category: 'fat', portion: 20, unit: 'g', calories: 116, reason: '维生素E+健康脂肪' },
    )

    const filtered = foods.filter(f => !allergies.some(a => f.name.includes(a)))

    return {
      mealType: 'snack',
      suggestedTime: '15:00-16:00',
      calorieTarget: cal,
      suggestedFoods: filtered,
      nutritionTip: '加餐可补充能量，避免正餐过度饥饿，选择坚果、水果等健康零食',
    }
  }

  /**
   * 生成替代食物建议
   */
  function generateAlternatives(
    _targets: NutritionTargets,
    _preferences: DietaryPreference[],
  ): FoodSuggestion[] {
    return [
      { name: '三文鱼', category: 'protein', portion: 150, unit: 'g', calories: 312, reason: '替代鸡胸肉，补充 Omega-3' },
      { name: '红薯', category: 'grain', portion: 200, unit: 'g', calories: 172, reason: '替代米饭，低GI碳水' },
      { name: '牛油果', category: 'fat', portion: 100, unit: 'g', calories: 160, reason: '替代烹调油，健康脂肪' },
      { name: '猕猴桃', category: 'fruit', portion: 150, unit: 'g', calories: 92, reason: '替代苹果，维C更丰富' },
    ]
  }

  /**
   * 生成每日小结
   */
  function generateDailySummary(
    goal: UserProfile['goal'],
    targets: NutritionTargets,
  ): string {
    const goalText = {
      lose_weight: '减重',
      maintain: '体重维持',
      gain_muscle: '增肌',
      improve_health: '健康改善',
    }[goal]

    return `今日营养目标：${targets.targetCalories} kcal（${goalText}计划）。`
      + `蛋白质 ${targets.macros.protein.recommended}g，`
      + `碳水 ${targets.macros.carbs.recommended}g，`
      + `脂肪 ${targets.macros.fat.recommended}g。`
      + `记得喝够 ${targets.waterTarget}ml 水！`
  }

  // ============================================================
  // 更新档案
  // ============================================================

  /**
   * 更新用户档案
   */
  function updateProfile(updates: Partial<UserProfile>): void {
    profile.value = { ...profile.value, ...updates }
    // 档案变化后重新计算目标
    computeNutritionTargets()
  }

  /**
   * 从 BodyMetric 数据自动推断并更新档案
   */
  function inferProfileFromMetrics(metrics: BodyMetric[]): Partial<UserProfile> {
    const updates: Partial<UserProfile> = {}

    // 从体重指标推断当前体重
    const weightMetrics = metrics.filter(m => m.type === 'weight')
    if (weightMetrics.length > 0) {
      const latest = weightMetrics.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0]
      updates.weight = latest.value
    }

    // 从运动指标推断活动水平
    const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
    if (exerciseMetrics.length > 0) {
      const recent = exerciseMetrics.slice(-7)
      const avgMinutes = recent.reduce((s, m) => s + m.value, 0) / recent.length

      if (avgMinutes >= 60) updates.activityLevel = 'very_active'
      else if (avgMinutes >= 45) updates.activityLevel = 'active'
      else if (avgMinutes >= 20) updates.activityLevel = 'moderate'
      else if (avgMinutes >= 10) updates.activityLevel = 'light'
      else updates.activityLevel = 'sedentary'
    }

    return updates
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 档案
    profile,
    updateProfile,
    inferProfileFromMetrics,

    // 计算
    calculateBMR,
    calculateTDEE,
    calculateTargetCalories,
    computeNutritionTargets,
    targets,
    bmr,
    tdee,
    targetCalories,

    // 微量元素
    analyzeMicronutrients,
    getDeficientMicronutrients,
    getMicronutrientScore,
    micronutrientStatus,

    // 膳食计划
    generateMealPlan,

    // 摄入对比
    compareIntake,

    // 动态营养评分
    computeDynamicNutritionScore,

    // 常量
    DEFAULT_USER_PROFILE,
    MICRONUTRIENT_RDIS,
    ACTIVITY_MULTIPLIERS,
    GOAL_CALORIE_ADJUSTMENTS,
  }
}