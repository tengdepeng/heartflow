// ============================================================
// 身体温室 · 营养分析增强（饮食记录 → 营养评分）
// ------------------------------------------------------------
// 将身体日志中的饮食 note 文本解析为结构化食物条目，匹配
// FOOD_DATABASE 与关键词启发式，调用 scoreNutrition 生成营养
// 评分、宏量营养素比例与优化建议。全部本地计算，守宪法第1条。
// ============================================================

import { computed } from 'vue'
import { scoreNutrition, computeWeeklyNutritionTrend, FOOD_DATABASE } from './nutrition-scoring'
import type { MealRecord, FoodItem, FoodCategory, NutritionScore, WeeklyNutritionTrend } from './nutrition-scoring'
import type { BodyLog } from '../../stores/health'
import { getLocalDateKey } from '../../utils/time'

// 常见食物关键词 → FOOD_DATABASE 键名（先精确匹配，避免重复）
const FOOD_ALIASES: Record<string, string> = {
  '米饭': '米饭', '白饭': '米饭', '饭': '米饭',
  '面条': '面条', '拉面': '面条', '米粉': '面条', '面': '面条',
  '全麦': '全麦面包', '吐司': '全麦面包', '面包': '全麦面包',
  '燕麦': '燕麦', '麦片': '燕麦',
  '馒头': '馒头',
  '小米粥': '小米粥', '粥': '小米粥',
  '鸡蛋': '鸡蛋', '煎蛋': '鸡蛋', '水煮蛋': '鸡蛋', '蛋': '鸡蛋',
  '鸡胸肉': '鸡胸肉', '鸡胸': '鸡胸肉',
  '三文鱼': '三文鱼', '鱼肉': '三文鱼', '鱼': '三文鱼',
  '豆腐': '豆腐',
  '牛肉': '牛肉', '牛': '牛肉',
  '虾仁': '虾仁', '虾': '虾仁',
  '豆浆': '豆浆',
  '西兰花': '西兰花', '花菜': '西兰花',
  '菠菜': '菠菜',
  '番茄': '番茄', '西红柿': '番茄',
  '胡萝卜': '胡萝卜', '萝卜': '胡萝卜',
  '黄瓜': '黄瓜',
  '苹果': '苹果',
  '香蕉': '香蕉',
  '橙子': '橙子', '橙': '橙子',
  '蓝莓': '蓝莓',
  '葡萄': '葡萄',
  '牛奶': '牛奶', '奶': '牛奶',
  '酸奶': '酸奶',
  '奶酪': '奶酪', '芝士': '奶酪',
  '核桃': '核桃',
  '杏仁': '杏仁',
  '橄榄油': '橄榄油',
  '绿茶': '绿茶', '茶': '绿茶',
  '咖啡': '咖啡',
  '巧克力': '巧克力',
  '薯片': '薯片',
}

// 关键词 → 类别（FOOD_DATABASE 未覆盖食材的兜底归类）
const CATEGORY_KEYWORDS: Record<FoodCategory, string[]> = {
  grain: ['饭', '面', '粥', '包', '麦', '馒头', '饼'],
  protein: ['肉', '鸡', '鱼', '虾', '蛋', '豆', '牛', '猪', '羊', '蛋白'],
  vegetable: ['菜', '蔬', '青', '瓜', '叶', '椒', '菇', '芹', '笋'],
  fruit: ['果', '蕉', '苹', '橙', '莓', '桃', '梨'],
  dairy: ['奶', '酸奶', '酪', '芝士'],
  fat: ['油', '坚果', '核桃', '杏仁', '花生', '牛油果'],
  beverage: ['茶', '咖啡', '果汁', '可乐', '水'],
  processed: ['炸', '薯', '汉堡', '披萨', '蛋糕', '饼干', '零食', '奶茶', '烧烤', '火锅', '泡面', '外卖'],
  other: [],
}

// 未匹配食材的估算营养（每 100g）
const CATEGORY_NUTRITION: Record<FoodCategory, Omit<FoodItem, 'name' | 'category'>> = {
  grain: { portion: 100, calories: 200, protein: 5, carbs: 40, fat: 1, fiber: 2 },
  protein: { portion: 100, calories: 150, protein: 20, carbs: 1, fat: 7, fiber: 0 },
  vegetable: { portion: 100, calories: 30, protein: 1.5, carbs: 5, fat: 0.3, fiber: 2 },
  fruit: { portion: 100, calories: 60, protein: 0.8, carbs: 14, fat: 0.3, fiber: 2 },
  dairy: { portion: 100, calories: 70, protein: 3, carbs: 5, fat: 3, fiber: 0 },
  fat: { portion: 100, calories: 600, protein: 15, carbs: 15, fat: 55, fiber: 6 },
  beverage: { portion: 100, calories: 30, protein: 0.5, carbs: 7, fat: 0, fiber: 0 },
  processed: { portion: 100, calories: 350, protein: 8, carbs: 40, fat: 18, fiber: 2 },
  other: { portion: 100, calories: 100, protein: 5, carbs: 15, fat: 3, fiber: 1 },
}

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  grain: '主食', protein: '蛋白质', vegetable: '蔬菜', fruit: '水果',
  dairy: '乳制品', fat: '脂肪坚果', beverage: '饮品', processed: '加工食品', other: '其他',
}

/** 从饮食 note 文本解析食物条目（先精确匹配数据库，再类别兜底） */
export function parseMealNote(note: string): FoodItem[] {
  const trimmed = (note || '').trim()
  if (!trimmed) return []
  const foods: FoodItem[] = []
  const matchedKeys = new Set<string>()

  for (const [kw, dbKey] of Object.entries(FOOD_ALIASES)) {
    if (trimmed.includes(kw) && !matchedKeys.has(dbKey)) {
      matchedKeys.add(dbKey)
      foods.push({ ...FOOD_DATABASE[dbKey] })
    }
  }

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const c = cat as FoodCategory
    if (foods.some(f => f.category === c)) continue
    if (kws.some(kw => trimmed.includes(kw))) {
      foods.push({ name: CATEGORY_LABELS[c], category: c, ...CATEGORY_NUTRITION[c] })
    }
  }
  return foods
}

/** 根据记录时间推断餐次 */
export function inferMealType(at: string): MealRecord['type'] {
  const h = new Date(at).getHours()
  if (h >= 5 && h < 10) return 'breakfast'
  if (h >= 11 && h < 14) return 'lunch'
  if (h >= 17 && h < 21) return 'dinner'
  return 'snack'
}

/** 将身体日志中的饮食记录转换为营养评分所需的 MealRecord[] */
export function buildMealRecords(logs: BodyLog[]): MealRecord[] {
  return logs
    .filter(l => l.type === 'meal')
    .map(l => ({
      id: l.id,
      type: inferMealType(l.at),
      date: getLocalDateKey(new Date(l.at)),
      time: l.at.slice(11, 16),
      foods: parseMealNote(l.value.note || ''),
      note: l.value.note || '',
      fullness: 0,
      satisfaction: 0,
    }))
}

/** 营养分析组合式函数：由身体日志实时计算营养评分与周趋势 */
export function useMealNutrition(logs: () => BodyLog[]) {
  const mealRecords = computed(() => buildMealRecords(logs()))

  const score = computed<NutritionScore | null>(() => {
    const records = mealRecords.value
    if (records.length === 0) return null
    return scoreNutrition(records)
  })

  const weeklyTrend = computed<WeeklyNutritionTrend | null>(() => {
    const records = mealRecords.value
    if (records.length === 0) return null
    const byDay = new Map<string, MealRecord[]>()
    for (const r of records) {
      const list = byDay.get(r.date) || []
      list.push(r)
      byDay.set(r.date, list)
    }
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    const weekEnd = now
    return computeWeeklyNutritionTrend(
      byDay,
      getLocalDateKey(weekStart),
      getLocalDateKey(weekEnd),
    )
  })

  return { mealRecords, score, weeklyTrend }
}
