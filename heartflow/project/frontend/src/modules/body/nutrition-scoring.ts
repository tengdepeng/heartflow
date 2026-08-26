// ============================================================
// 身体温室 · 营养评分算法（P16-2）
// 膳食记录、营养评分、饮食分析、优化建议
// ============================================================

import type { BodyMetric } from './types'

// ---- 膳食记录 ----

/** 餐次类型 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** 食物类别 */
export type FoodCategory = 'grain' | 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'fat' | 'beverage' | 'processed' | 'other'

/** 单条食物记录 */
export interface FoodItem {
  name: string
  category: FoodCategory
  /** 份量（克） */
  portion: number
  /** 热量（千卡） */
  calories: number
  /** 蛋白质（克） */
  protein: number
  /** 碳水化合物（克） */
  carbs: number
  /** 脂肪（克） */
  fat: number
  /** 膳食纤维（克） */
  fiber: number
}

/** 一餐记录 */
export interface MealRecord {
  id: string
  type: MealType
  date: string
  time: string
  foods: FoodItem[]
  /** 备注 */
  note?: string
  /** 饱腹感 1-5 */
  fullness: number
  /** 满意度 1-5 */
  satisfaction: number
}

/** 营养评分结果 */
export interface NutritionScore {
  /** 综合评分 0-100 */
  overall: number
  /** 膳食规律性评分 */
  regularity: number
  /** 营养均衡评分 */
  balance: number
  /** 食物多样性评分 */
  variety: number
  /** 热量合理性评分 */
  calorieReasonableness: number
  /** 各维度明细 */
  breakdown: {
    /** 宏量营养素比例 */
    macroRatio: {
      protein: number // 蛋白质供能比 %
      carbs: number    // 碳水供能比 %
      fat: number      // 脂肪供能比 %
    }
    /** 食物类别覆盖 */
    categoryCoverage: FoodCategory[]
    /** 缺失的食物类别 */
    missingCategories: FoodCategory[]
    /** 总热量 */
    totalCalories: number
    /** 推荐热量范围 */
    recommendedCalories: [number, number]
    /** 餐次数量 */
    mealCount: number
    /** 缺失的餐次 */
    missingMeals: MealType[]
  }
  /** 优化建议 */
  recommendations: NutritionRecommendation[]
  /** 评分日期 */
  date: string
}

/** 营养建议 */
export interface NutritionRecommendation {
  category: 'meal_regularity' | 'balance' | 'variety' | 'calorie' | 'habit'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

/** 周营养趋势 */
export interface WeeklyNutritionTrend {
  weekStart: string
  weekEnd: string
  dailyScores: { date: string; score: number }[]
  averageScore: number
  trend: 'improving' | 'declining' | 'stable'
  bestDay: { date: string; score: number }
  worstDay: { date: string; score: number }
  weeklyInsight: string
}

// ---- 食物数据库 ----

/** 常见食物营养数据（每 100g） */
export const FOOD_DATABASE: Record<string, FoodItem> = {
  // 谷物
  '米饭': { name: '米饭', category: 'grain', portion: 100, calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3, fiber: 0.3 },
  '面条': { name: '面条', category: 'grain', portion: 100, calories: 137, protein: 4.5, carbs: 25.0, fat: 1.0, fiber: 0.8 },
  '全麦面包': { name: '全麦面包', category: 'grain', portion: 100, calories: 247, protein: 13.0, carbs: 41.0, fat: 3.4, fiber: 7.0 },
  '燕麦': { name: '燕麦', category: 'grain', portion: 100, calories: 367, protein: 13.5, carbs: 61.6, fat: 6.7, fiber: 10.1 },
  '馒头': { name: '馒头', category: 'grain', portion: 100, calories: 223, protein: 7.0, carbs: 44.2, fat: 1.1, fiber: 1.3 },
  '小米粥': { name: '小米粥', category: 'grain', portion: 100, calories: 46, protein: 1.4, carbs: 8.4, fat: 0.7, fiber: 0.3 },

  // 蛋白质
  '鸡蛋': { name: '鸡蛋', category: 'protein', portion: 100, calories: 144, protein: 13.3, carbs: 1.5, fat: 8.8, fiber: 0 },
  '鸡胸肉': { name: '鸡胸肉', category: 'protein', portion: 100, calories: 133, protein: 31.0, carbs: 0, fat: 1.2, fiber: 0 },
  '三文鱼': { name: '三文鱼', category: 'protein', portion: 100, calories: 208, protein: 20.4, carbs: 0, fat: 13.4, fiber: 0 },
  '豆腐': { name: '豆腐', category: 'protein', portion: 100, calories: 76, protein: 8.1, carbs: 1.9, fat: 3.7, fiber: 0.3 },
  '牛肉': { name: '牛肉', category: 'protein', portion: 100, calories: 250, protein: 26.0, carbs: 0, fat: 15.0, fiber: 0 },
  '虾仁': { name: '虾仁', category: 'protein', portion: 100, calories: 99, protein: 20.0, carbs: 0.2, fat: 1.7, fiber: 0 },
  '豆浆': { name: '豆浆', category: 'protein', portion: 100, calories: 31, protein: 3.0, carbs: 1.2, fat: 1.6, fiber: 0.4 },

  // 蔬菜
  '西兰花': { name: '西兰花', category: 'vegetable', portion: 100, calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
  '菠菜': { name: '菠菜', category: 'vegetable', portion: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  '番茄': { name: '番茄', category: 'vegetable', portion: 100, calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  '胡萝卜': { name: '胡萝卜', category: 'vegetable', portion: 100, calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  '黄瓜': { name: '黄瓜', category: 'vegetable', portion: 100, calories: 15, protein: 0.7, carbs: 2.9, fat: 0.1, fiber: 0.5 },

  // 水果
  '苹果': { name: '苹果', category: 'fruit', portion: 100, calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
  '香蕉': { name: '香蕉', category: 'fruit', portion: 100, calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  '橙子': { name: '橙子', category: 'fruit', portion: 100, calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, fiber: 2.4 },
  '蓝莓': { name: '蓝莓', category: 'fruit', portion: 100, calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4 },
  '葡萄': { name: '葡萄', category: 'fruit', portion: 100, calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9 },

  // 乳制品
  '牛奶': { name: '牛奶', category: 'dairy', portion: 100, calories: 54, protein: 3.0, carbs: 4.8, fat: 3.2, fiber: 0 },
  '酸奶': { name: '酸奶', category: 'dairy', portion: 100, calories: 72, protein: 2.5, carbs: 9.3, fat: 2.7, fiber: 0 },
  '奶酪': { name: '奶酪', category: 'dairy', portion: 100, calories: 328, protein: 25.0, carbs: 1.3, fat: 25.0, fiber: 0 },

  // 脂肪/坚果
  '核桃': { name: '核桃', category: 'fat', portion: 100, calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7 },
  '杏仁': { name: '杏仁', category: 'fat', portion: 100, calories: 579, protein: 21.2, carbs: 19.7, fat: 49.9, fiber: 12.5 },
  '橄榄油': { name: '橄榄油', category: 'fat', portion: 100, calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },

  // 饮品
  '绿茶': { name: '绿茶', category: 'beverage', portion: 100, calories: 1, protein: 0, carbs: 0.2, fat: 0, fiber: 0 },
  '咖啡': { name: '咖啡', category: 'beverage', portion: 100, calories: 2, protein: 0.2, carbs: 0, fat: 0, fiber: 0 },

  // 加工食品
  '巧克力': { name: '巧克力', category: 'processed', portion: 100, calories: 546, protein: 4.9, carbs: 59.4, fat: 31.0, fiber: 7.0 },
  '薯片': { name: '薯片', category: 'processed', portion: 100, calories: 536, protein: 7.0, carbs: 53.0, fat: 34.0, fiber: 4.5 },
}

// ---- 常量 ----

/** 推荐每日热量摄入（按性别和活动水平） */
const RECOMMENDED_CALORIES = {
  male: { sedentary: 2200, moderate: 2600, active: 3000 },
  female: { sedentary: 1800, moderate: 2100, active: 2400 },
}

/** 推荐宏量营养素供能比 */
const RECOMMENDED_MACRO_RATIO = {
  protein: { min: 15, max: 25 },   // 蛋白质 15-25%
  carbs: { min: 45, max: 65 },     // 碳水 45-65%
  fat: { min: 20, max: 35 },       // 脂肪 20-35%
}

/** 推荐每日食物类别覆盖 */
const RECOMMENDED_CATEGORIES: FoodCategory[] = ['grain', 'protein', 'vegetable', 'fruit', 'dairy']

/** 理想餐次 */
const IDEAL_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner']

/** 餐次推荐时间范围 */
const MEAL_TIME_WINDOWS: Record<MealType, { start: string; end: string; ideal: string }> = {
  breakfast: { start: '06:00', end: '10:00', ideal: '07:30' },
  lunch: { start: '11:00', end: '14:00', ideal: '12:00' },
  dinner: { start: '17:00', end: '20:30', ideal: '18:30' },
  snack: { start: '00:00', end: '23:59', ideal: '15:00' },
}

// ============================================================
// 营养评分算法
// ============================================================

/**
 * 对单日膳食记录进行综合营养评分
 */
export function scoreNutrition(
  meals: MealRecord[],
  options: {
    activityLevel?: 'sedentary' | 'moderate' | 'active'
    recommendedCalories?: [number, number]
  } = {},
): NutritionScore {
  const { activityLevel = 'moderate' } = options
  const date = meals.length > 0 ? meals[0].date : new Date().toISOString().split('T')[0]

  // 如果没有任何膳食记录，返回默认低分
  if (meals.length === 0) {
    return createEmptyScore(date)
  }

  // 汇总所有食物
  const allFoods = meals.flatMap(m => m.foods)
  if (allFoods.length === 0) {
    return createEmptyScore(date)
  }

  // 计算各维度评分
  const regularity = scoreMealRegularity(meals)
  const balance = scoreMacroBalance(allFoods)
  const variety = scoreFoodVariety(meals)
  const calorieScore = scoreCalorieReasonableness(allFoods, activityLevel)

  // 汇总营养数据
  const totalProtein = allFoods.reduce((s, f) => s + f.protein, 0)
  const totalCarbs = allFoods.reduce((s, f) => s + f.carbs, 0)
  const totalFat = allFoods.reduce((s, f) => s + f.fat, 0)
  const totalCalories = allFoods.reduce((s, f) => s + f.calories, 0)

  // 宏量营养素供能比
  const proteinCal = totalProtein * 4
  const carbCal = totalCarbs * 4
  const fatCal = totalFat * 9
  const totalMacroCal = proteinCal + carbCal + fatCal

  const macroRatio = totalMacroCal > 0
    ? {
        protein: Math.round((proteinCal / totalMacroCal) * 100),
        carbs: Math.round((carbCal / totalMacroCal) * 100),
        fat: Math.round((fatCal / totalMacroCal) * 100),
      }
    : { protein: 0, carbs: 0, fat: 0 }

  // 食物类别覆盖
  const categories = new Set<FoodCategory>()
  allFoods.forEach(f => categories.add(f.category))
  const categoryCoverage = Array.from(categories)
  const missingCategories = RECOMMENDED_CATEGORIES.filter(c => !categories.has(c))

  // 缺失餐次
  const mealTypes = new Set(meals.map(m => m.type))
  const missingMeals = IDEAL_MEALS.filter(m => !mealTypes.has(m))

  // 推荐热量范围
  const recCals = options.recommendedCalories || getRecommendedCalories(activityLevel)

  // 综合评分（加权平均）
  const weights = { regularity: 0.25, balance: 0.30, variety: 0.25, calorie: 0.20 }
  const overall = Math.round(
    regularity * weights.regularity +
    balance * weights.balance +
    variety * weights.variety +
    calorieScore * weights.calorie,
  )

  // 生成建议
  const recommendations = generateRecommendations(
    regularity, balance, variety, calorieScore,
    missingMeals, missingCategories, macroRatio, totalCalories, recCals,
  )

  return {
    overall,
    regularity,
    balance,
    variety,
    calorieReasonableness: calorieScore,
    breakdown: {
      macroRatio,
      categoryCoverage,
      missingCategories,
      totalCalories,
      recommendedCalories: recCals,
      mealCount: meals.length,
      missingMeals,
    },
    recommendations,
    date,
  }
}

/**
 * 评分：膳食规律性
 * 检查三餐是否按时、是否规律
 */
function scoreMealRegularity(meals: MealRecord[]): number {
  let score = 0

  // 检查三餐是否齐全（每餐 20 分，最高 60）
  const mealTypes = new Set(meals.map(m => m.type))
  for (const ideal of IDEAL_MEALS) {
    const hasMeal = mealTypes.has(ideal)
    if (hasMeal) {
      // 检查是否在推荐时间范围内
      const meal = meals.find(m => m.type === ideal)!
      const inWindow = isTimeInWindow(meal.time, MEAL_TIME_WINDOWS[ideal])
      score += inWindow ? 20 : 15
    }
  }

  // 检查是否有暴饮暴食（饱腹感异常）
  const fullnessAvg = meals.reduce((s, m) => s + m.fullness, 0) / meals.length
  if (fullnessAvg >= 2 && fullnessAvg <= 4) {
    score += 20
  } else if (fullnessAvg < 2 || fullnessAvg > 4) {
    score += 10
  }

  // 检查满意度
  const satisfactionAvg = meals.reduce((s, m) => s + m.satisfaction, 0) / meals.length
  if (satisfactionAvg >= 3) {
    score += 20
  } else {
    score += 10
  }

  return Math.min(100, score)
}

/**
 * 评分：宏量营养素平衡
 * 检查蛋白质、碳水、脂肪供能比是否在推荐范围内
 */
function scoreMacroBalance(foods: FoodItem[]): number {
  const totalProtein = foods.reduce((s, f) => s + f.protein, 0)
  const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0)
  const totalFat = foods.reduce((s, f) => s + f.fat, 0)

  const proteinCal = totalProtein * 4
  const carbCal = totalCarbs * 4
  const fatCal = totalFat * 9
  const totalCal = proteinCal + carbCal + fatCal

  if (totalCal === 0) return 30

  const proteinRatio = (proteinCal / totalCal) * 100
  const carbRatio = (carbCal / totalCal) * 100
  const fatRatio = (fatCal / totalCal) * 100

  let score = 0

  // 蛋白质评分（0-35 分）
  if (proteinRatio >= RECOMMENDED_MACRO_RATIO.protein.min && proteinRatio <= RECOMMENDED_MACRO_RATIO.protein.max) {
    score += 35
  } else {
    const dist = Math.min(
      Math.abs(proteinRatio - RECOMMENDED_MACRO_RATIO.protein.min),
      Math.abs(proteinRatio - RECOMMENDED_MACRO_RATIO.protein.max),
    )
    score += Math.max(5, 35 - dist * 2)
  }

  // 碳水评分（0-30 分）
  if (carbRatio >= RECOMMENDED_MACRO_RATIO.carbs.min && carbRatio <= RECOMMENDED_MACRO_RATIO.carbs.max) {
    score += 30
  } else {
    const dist = Math.min(
      Math.abs(carbRatio - RECOMMENDED_MACRO_RATIO.carbs.min),
      Math.abs(carbRatio - RECOMMENDED_MACRO_RATIO.carbs.max),
    )
    score += Math.max(5, 30 - dist * 1.5)
  }

  // 脂肪评分（0-25 分）
  if (fatRatio >= RECOMMENDED_MACRO_RATIO.fat.min && fatRatio <= RECOMMENDED_MACRO_RATIO.fat.max) {
    score += 25
  } else {
    const dist = Math.min(
      Math.abs(fatRatio - RECOMMENDED_MACRO_RATIO.fat.min),
      Math.abs(fatRatio - RECOMMENDED_MACRO_RATIO.fat.max),
    )
    score += Math.max(5, 25 - dist * 1.5)
  }

  // 纤维加分（0-10 分）
  const totalFiber = foods.reduce((s, f) => s + f.fiber, 0)
  const fiberTarget = 25 // 推荐每日纤维 25g
  score += Math.min(10, (totalFiber / fiberTarget) * 10)

  return Math.min(100, Math.round(score))
}

/**
 * 评分：食物多样性
 * 检查是否覆盖多种食物类别
 */
function scoreFoodVariety(meals: MealRecord[]): number {
  const allFoods = meals.flatMap(m => m.foods)
  if (allFoods.length === 0) return 0

  const categories = new Set<FoodCategory>()
  allFoods.forEach(f => categories.add(f.category))

  // 必需类别覆盖（每类 15 分，最高 60 分）
  let score = 0
  for (const cat of RECOMMENDED_CATEGORIES) {
    if (categories.has(cat)) score += 15
  }

  // 额外类别加分（每类 10 分，最高 20 分）
  const extraCategories = allFoods.filter(f => !RECOMMENDED_CATEGORIES.includes(f.category))
  const uniqueExtra = new Set(extraCategories.map(f => f.category))
  score += Math.min(20, uniqueExtra.size * 10)

  // 食物种类数量加分（超过 10 种食物满分）
  const uniqueFoods = new Set(allFoods.map(f => f.name))
  score += Math.min(20, uniqueFoods.size * 2)

  return Math.min(100, score)
}

/**
 * 评分：热量合理性
 * 检查总热量是否在推荐范围内
 */
function scoreCalorieReasonableness(
  foods: FoodItem[],
  activityLevel: 'sedentary' | 'moderate' | 'active',
): number {
  const totalCalories = foods.reduce((s, f) => s + f.calories, 0)
  const [min, max] = getRecommendedCalories(activityLevel)

  if (totalCalories === 0) return 0

  if (totalCalories >= min && totalCalories <= max) {
    return 100
  }

  // 偏离推荐范围的程度
  const deviation = totalCalories < min
    ? (min - totalCalories) / min
    : (totalCalories - max) / max

  // 每偏离 10% 扣 15 分
  return Math.max(0, Math.round(100 - deviation * 100 * 1.5))
}

// ============================================================
// 周趋势分析
// ============================================================

/**
 * 计算周营养趋势
 */
export function computeWeeklyNutritionTrend(
  mealsByDay: Map<string, MealRecord[]>,
  weekStart: string,
  weekEnd: string,
): WeeklyNutritionTrend {
  const dailyScores: { date: string; score: number }[] = []

  // 遍历一周每一天
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  const current = new Date(start)

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    const meals = mealsByDay.get(dateStr) || []
    const score = scoreNutrition(meals)
    dailyScores.push({ date: dateStr, score: score.overall })
    current.setDate(current.getDate() + 1)
  }

  const validScores = dailyScores.filter(d => d.score > 0)
  const averageScore = validScores.length > 0
    ? Math.round(validScores.reduce((s, d) => s + d.score, 0) / validScores.length)
    : 0

  // 趋势判断
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (validScores.length >= 3) {
    const firstHalf = validScores.slice(0, Math.floor(validScores.length / 2))
    const secondHalf = validScores.slice(Math.floor(validScores.length / 2))
    const firstAvg = firstHalf.reduce((s, d) => s + d.score, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, d) => s + d.score, 0) / secondHalf.length
    const diff = secondAvg - firstAvg
    if (diff > 5) trend = 'improving'
    else if (diff < -5) trend = 'declining'
  }

  const bestDay = validScores.length > 0
    ? validScores.reduce((best, d) => d.score > best.score ? d : best, validScores[0])
    : { date: '', score: 0 }

  const worstDay = validScores.length > 0
    ? validScores.reduce((worst, d) => d.score < worst.score ? d : worst, validScores[0])
    : { date: '', score: 0 }

  const weeklyInsight = generateWeeklyInsight(averageScore, trend, bestDay, worstDay)

  return {
    weekStart,
    weekEnd,
    dailyScores,
    averageScore,
    trend,
    bestDay,
    worstDay,
    weeklyInsight,
  }
}

// ============================================================
// 从 BodyMetric 计算营养评分（兼容现有接口）
// ============================================================

/** 用户身体档案参数（用于个性化营养评分） */
export interface NutritionProfileParams {
  /** 性别 */
  gender?: 'male' | 'female'
  /** 年龄（岁） */
  age?: number
  /** 体重（kg） */
  weight?: number
  /** 身高（cm） */
  height?: number
  /** 活动水平 */
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  /** 目标 */
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | 'improve_health'
}

/** 活动水平系数 */
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** 目标热量调整系数 */
const GOAL_ADJUSTMENTS: Record<string, number> = {
  lose_weight: -0.2,
  maintain: 0,
  gain_muscle: 0.15,
  improve_health: 0,
}

/**
 * 使用 Mifflin-St Jeor 方程计算 BMR
 */
function calculateBMR(gender: 'male' | 'female', weight: number, height: number, age: number): number {
  const base = 10 * weight + 6.25 * height - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}

/**
 * 基于 BodyMetric 数据计算营养评分（增强版）
 * 集成个性化营养引擎，支持基于用户档案的动态计算
 * 替换原来的固定值 50 算法
 */
export function computeNutritionScoreFromMetrics(
  metrics: BodyMetric[],
  profile?: NutritionProfileParams,
): number {
  const nutritionMetrics = metrics.filter(m => m.type === 'nutrition')

  // 如果有直接营养记录，优先使用
  if (nutritionMetrics.length > 0) {
    const recent = nutritionMetrics.slice(-7)
    const avgValue = recent.reduce((s, m) => s + m.value, 0) / recent.length
    return Math.min(100, Math.round(avgValue))
  }

  // 如果提供了用户档案，使用个性化计算
  if (profile?.gender && profile?.weight && profile?.height && profile?.age) {
    return computePersonalizedScore(metrics, profile)
  }

  // 否则使用增强版推断算法
  return computeInferredScore(metrics)
}

/**
 * 基于用户档案的个性化营养评分
 */
function computePersonalizedScore(metrics: BodyMetric[], profile: NutritionProfileParams): number {
  const { gender = 'male', weight = 70, height = 175, age = 30, activityLevel = 'moderate', goal = 'maintain' } = profile

  // 计算 BMR 和 TDEE
  const bmr = calculateBMR(gender, weight, height, age)
  const tdde = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
  const targetCalories = Math.round(tdde * (1 + GOAL_ADJUSTMENTS[goal]))

  // 水分目标 (30ml/kg)
  const waterTarget = weight * 30

  const waterMetrics = metrics.filter(m => m.type === 'water')
  const exerciseMetrics = metrics.filter(m => m.type === 'exercise')
  const weightMetrics = metrics.filter(m => m.type === 'weight')

  let score = 0
  let totalWeight = 0

  // 饮水充足度（权重 25%）
  if (waterMetrics.length > 0) {
    const recentWater = waterMetrics.slice(-7)
    const avgWater = recentWater.reduce((s, m) => s + m.value, 0) / recentWater.length
    const waterScore = Math.min(100, (avgWater / waterTarget) * 100)
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
  const estimatedCalories = estimateCaloriesFromActivity(bmr, activityLevel, exerciseMetrics)
  const calorieScore = Math.min(100,
    100 - Math.abs(estimatedCalories - targetCalories) / targetCalories * 100,
  )
  score += Math.max(30, calorieScore) * 0.35
  totalWeight += 0.35

  if (totalWeight === 0) {
    return Math.round(50 + (goal === 'maintain' ? 10 : 0))
  }

  return Math.min(100, Math.round(score / totalWeight))
}

/**
 * 基于活动水平估算热量消耗
 */
function estimateCaloriesFromActivity(
  bmr: number,
  activityLevel: string,
  exerciseMetrics: BodyMetric[],
): number {
  let estimated = bmr

  if (exerciseMetrics.length > 0) {
    const recent = exerciseMetrics.slice(-1)
    const exerciseMinutes = recent.reduce((s, m) => s + m.value, 0)
    estimated += (exerciseMinutes / 30) * 300
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55
  return Math.round(bmr * multiplier)
}

/**
 * 无档案时的推断评分（增强版）
 */
function computeInferredScore(metrics: BodyMetric[]): number {
  const weightMetrics = metrics.filter(m => m.type === 'weight')
  const waterMetrics = metrics.filter(m => m.type === 'water')
  const exerciseMetrics = metrics.filter(m => m.type === 'exercise')

  let score = 0
  let totalWeight = 0

  // 饮水充足度（权重 30%）
  if (waterMetrics.length > 0) {
    const recentWater = waterMetrics.slice(-7)
    const avgWater = recentWater.reduce((s, m) => s + m.value, 0) / recentWater.length
    const waterScore = Math.min(100, (avgWater / 2000) * 100)
    score += waterScore * 0.30
    totalWeight += 0.30
  }

  // 运动规律度（权重 25%）
  if (exerciseMetrics.length > 0) {
    const recentExercise = exerciseMetrics.slice(-7)
    const avgExercise = recentExercise.reduce((s, m) => s + m.value, 0) / recentExercise.length
    const exerciseScore = avgExercise >= 30 ? 100
      : avgExercise >= 15 ? 70
      : avgExercise > 0 ? 40
      : 0
    score += exerciseScore * 0.25
    totalWeight += 0.25
  }

  // 体重稳定度（权重 25%）
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
    score += weightScore * 0.25
    totalWeight += 0.25
  }

  // 数据覆盖率（权重 20%）
  const now = new Date()
  let daysWithRecords = 0
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0]
    const hasRecord = metrics.some(m => m.timestamp?.startsWith(date))
    if (hasRecord) daysWithRecords++
  }
  if (daysWithRecords > 0) {
    const coverageScore = (daysWithRecords / 7) * 100
    score += coverageScore * 0.20
    totalWeight += 0.20
  }

  if (totalWeight === 0) return 50

  return Math.min(100, Math.round(score / totalWeight))
}

// ============================================================
// 辅助函数
// ============================================================

function createEmptyScore(date: string): NutritionScore {
  return {
    overall: 0,
    regularity: 0,
    balance: 0,
    variety: 0,
    calorieReasonableness: 0,
    breakdown: {
      macroRatio: { protein: 0, carbs: 0, fat: 0 },
      categoryCoverage: [],
      missingCategories: [...RECOMMENDED_CATEGORIES],
      totalCalories: 0,
      recommendedCalories: [2000, 2600],
      mealCount: 0,
      missingMeals: [...IDEAL_MEALS],
    },
    recommendations: [
      {
        category: 'meal_regularity',
        title: '开始记录膳食',
        description: '今天还没有膳食记录，从记录一顿饭开始关注饮食健康',
        priority: 'high',
      },
    ],
    date,
  }
}

function getRecommendedCalories(activityLevel: 'sedentary' | 'moderate' | 'active'): [number, number] {
  // 默认使用成年男性中等活动水平
  const base = RECOMMENDED_CALORIES.male[activityLevel]
  return [Math.round(base * 0.85), Math.round(base * 1.15)]
}

function isTimeInWindow(time: string, window: { start: string; end: string }): boolean {
  return time >= window.start && time <= window.end
}

function generateRecommendations(
  regularity: number,
  balance: number,
  variety: number,
  calorie: number,
  missingMeals: MealType[],
  missingCategories: FoodCategory[],
  macroRatio: { protein: number; carbs: number; fat: number },
  totalCalories: number,
  recCals: [number, number],
): NutritionRecommendation[] {
  const recs: NutritionRecommendation[] = []

  // 膳食规律性建议
  if (regularity < 60) {
    if (missingMeals.includes('breakfast')) {
      recs.push({
        category: 'meal_regularity',
        title: '不要跳过早餐',
        description: '早餐提供全天所需能量的 25%，建议在 7:00-8:30 之间进食',
        priority: 'high',
      })
    }
    if (missingMeals.includes('lunch')) {
      recs.push({
        category: 'meal_regularity',
        title: '午餐很重要',
        description: '规律午餐有助于维持下午的精力和代谢水平',
        priority: 'high',
      })
    }
    if (missingMeals.includes('dinner')) {
      recs.push({
        category: 'meal_regularity',
        title: '晚餐不宜过晚',
        description: '建议在 18:00-19:30 之间完成晚餐，避免睡前 3 小时内进食',
        priority: 'medium',
      })
    }
  }

  // 营养均衡建议
  if (balance < 60) {
    if (macroRatio.protein < RECOMMENDED_MACRO_RATIO.protein.min) {
      recs.push({
        category: 'balance',
        title: '增加蛋白质摄入',
        description: `当前蛋白质供能比 ${macroRatio.protein}%，建议达到 ${RECOMMENDED_MACRO_RATIO.protein.min}% 以上。多吃鸡蛋、鱼类、豆制品`,
        priority: 'high',
      })
    }
    if (macroRatio.fat > RECOMMENDED_MACRO_RATIO.fat.max) {
      recs.push({
        category: 'balance',
        title: '减少脂肪摄入',
        description: `当前脂肪供能比 ${macroRatio.fat}%，建议控制在 ${RECOMMENDED_MACRO_RATIO.fat.max}% 以内`,
        priority: 'high',
      })
    }
    if (macroRatio.carbs < RECOMMENDED_MACRO_RATIO.carbs.min) {
      recs.push({
        category: 'balance',
        title: '保证碳水摄入',
        description: '碳水化合物是大脑的主要能量来源，建议适量摄入全谷物',
        priority: 'medium',
      })
    }
  }

  // 食物多样性建议
  if (variety < 60) {
    if (missingCategories.includes('vegetable')) {
      recs.push({
        category: 'variety',
        title: '增加蔬菜摄入',
        description: '每天应摄入至少 300g 蔬菜，深色蔬菜应占一半',
        priority: 'high',
      })
    }
    if (missingCategories.includes('fruit')) {
      recs.push({
        category: 'variety',
        title: '补充水果',
        description: '每天摄入 200-350g 新鲜水果，优选当季水果',
        priority: 'medium',
      })
    }
    if (missingCategories.includes('dairy')) {
      recs.push({
        category: 'variety',
        title: '补充乳制品',
        description: '每天 300ml 牛奶或等量乳制品，补充钙质和蛋白质',
        priority: 'medium',
      })
    }
  }

  // 热量建议
  if (calorie < 60) {
    if (totalCalories < recCals[0]) {
      recs.push({
        category: 'calorie',
        title: '热量摄入不足',
        description: `当前摄入 ${totalCalories} kcal，建议每日 ${recCals[0]}-${recCals[1]} kcal`,
        priority: 'high',
      })
    } else if (totalCalories > recCals[1]) {
      recs.push({
        category: 'calorie',
        title: '热量摄入偏高',
        description: `当前摄入 ${totalCalories} kcal，建议控制在 ${recCals[1]} kcal 以内`,
        priority: 'medium',
      })
    }
  }

  return recs
}

function generateWeeklyInsight(
  averageScore: number,
  trend: string,
  bestDay: { date: string; score: number },
  worstDay: { date: string; score: number },
): string {
  if (averageScore === 0) return '本周暂无膳食数据，开始记录以获得个性化分析'

  const trendText = trend === 'improving' ? '呈上升趋势' : trend === 'declining' ? '有所下降' : '保持稳定'
  const gradeText = averageScore >= 80 ? '表现优秀' : averageScore >= 60 ? '表现良好' : averageScore >= 40 ? '需要关注' : '需要改善'

  let insight = `本周营养评分 ${averageScore} 分，${gradeText}，${trendText}。`

  if (bestDay.score > 0) {
    insight += `最佳日：${formatDateShort(bestDay.date)}（${bestDay.score}分）。`
  }
  if (worstDay.score > 0 && worstDay.score < bestDay.score) {
    insight += `最低日：${formatDateShort(worstDay.date)}（${worstDay.score}分）。`
  }

  return insight
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}