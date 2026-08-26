// ============================================================
// 藏象阁 · 药膳食谱（知源中医「药膳食谱」借鉴）
// 药膳食谱库 + 按功效/体质/节气检索 + 收藏 + 今日药膳
// 宪法兼容：身体感受而非指标，拒绝诊断/建议强制；药膳为「食养」非「治疗」
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----

/** 食谱功效分类 */
export type RecipeEffect =
  | '补气' | '补血' | '滋阴' | '温阳'
  | '祛湿' | '清热' | '安神' | '健脾'
  | '润肺' | '疏肝'

/** 药膳食谱 */
export interface MedicinalRecipe {
  id: string
  name: string
  /** 功效 */
  effect: RecipeEffect
  /** 适用体质 */
  constitutions: string[]
  /** 适用节气 */
  solarTerms: string[]
  /** 食材 */
  ingredients: string[]
  /** 做法 */
  steps: string[]
  /** 食用频率 */
  frequency: string
  /** 禁忌 */
  taboo: string
  /** 难度 1-3 */
  difficulty: 1 | 2 | 3
  /** 简介 */
  description: string
}

/** 收藏记录 */
export interface RecipeFavorite {
  recipeId: string
  favoritedAt: string
}

/** 药膳洞察 */
export interface MedicinalDietInsight {
  /** 今日药膳 */
  today: MedicinalRecipe
  /** 按功效统计 */
  byEffect: { effect: RecipeEffect; count: number }[]
  /** 收藏数 */
  favoriteCount: number
  /** 当前节气推荐 */
  seasonal: MedicinalRecipe[]
}

// ---- 存储键 ----

const STORAGE_KEY = 'hf:body-wisdom:recipe-favorites'

// ---- 功效元信息 ----

export const RECIPE_EFFECT_META: Record<RecipeEffect, { label: string; icon: string; color: string }> = {
  补气: { label: '补气', icon: '💪', color: '#d4a05a' },
  补血: { label: '补血', icon: '🩸', color: '#c46a5a' },
  滋阴: { label: '滋阴', icon: '💧', color: '#6b9fc4' },
  温阳: { label: '温阳', icon: '🔥', color: '#f0a050' },
  祛湿: { label: '祛湿', icon: '🌧', color: '#8a9a7a' },
  清热: { label: '清热', icon: '❄️', color: '#5ab8a0' },
  安神: { label: '安神', icon: '🌙', color: '#a07c8c' },
  健脾: { label: '健脾', icon: '🍚', color: '#d9a05a' },
  润肺: { label: '润肺', icon: '🍐', color: '#8fb8c4' },
  疏肝: { label: '疏肝', icon: '🌿', color: '#7a9a6a' },
}

// ---- 药膳食谱库 ----

export const MEDICINAL_RECIPES: MedicinalRecipe[] = [
  {
    id: 'sishen-soup',
    name: '四神汤',
    effect: '健脾',
    constitutions: ['痰湿质', '气虚质', '平和质'],
    solarTerms: ['立夏', '小满', '芒种', '夏至', '小暑', '大暑'],
    ingredients: ['山药 30g', '莲子 15g', '茯苓 15g', '芡实 15g', '猪肚或排骨 适量'],
    steps: ['食材洗净，莲子去芯', '猪肚焯水去腥', '所有食材入锅，加足量清水', '大火烧开转小火炖 1.5 小时', '加盐调味即可'],
    frequency: '每周 1-2 次',
    taboo: '湿热重、便秘者少食',
    difficulty: 2,
    description: '健脾祛湿经典方，四味平和，脾胃虚弱者常食可健运中焦。',
  },
  {
    id: 'danggui-lamb',
    name: '当归生姜羊肉汤',
    effect: '温阳',
    constitutions: ['阳虚质', '血虚质', '气虚质'],
    solarTerms: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    ingredients: ['当归 15g', '生姜 30g', '羊肉 500g', '黄酒 少许'],
    steps: ['羊肉切块焯水去膻', '当归、生姜切片', '羊肉与药材入锅，加黄酒', '大火烧开转小火炖 2 小时', '加盐调味'],
    frequency: '冬季每周 1 次',
    taboo: '阴虚火旺、感冒发热者忌食',
    difficulty: 2,
    description: '《金匮要略》名方，温中补血、散寒止痛，冬季进补佳品。',
  },
  {
    id: 'yin-er-lotus',
    name: '银耳莲子羹',
    effect: '滋阴',
    constitutions: ['阴虚质', '平和质'],
    solarTerms: ['白露', '秋分', '寒露', '霜降'],
    ingredients: ['银耳 1 朵', '莲子 20g', '百合 15g', '冰糖 适量'],
    steps: ['银耳泡发撕小朵', '莲子去芯，百合洗净', '银耳先炖 1 小时出胶', '加入莲子百合再炖 30 分钟', '加冰糖融化即可'],
    frequency: '每周 2-3 次',
    taboo: '风寒咳嗽、痰多者少食',
    difficulty: 1,
    description: '滋阴润肺、养心安神，秋燥时节润燥首选。',
  },
  {
    id: 'huangqi-chicken',
    name: '黄芪炖鸡',
    effect: '补气',
    constitutions: ['气虚质', '平和质'],
    solarTerms: ['立秋', '处暑', '霜降'],
    ingredients: ['黄芪 30g', '母鸡 半只', '红枣 5 枚', '生姜 3 片'],
    steps: ['母鸡切块焯水', '黄芪、红枣洗净', '所有食材入炖盅', '隔水炖 2 小时', '加盐调味'],
    frequency: '每周 1 次',
    taboo: '感冒发热、湿热内盛者忌食',
    difficulty: 2,
    description: '补中益气、固表止汗，气虚乏力者常食有益。',
  },
  {
    id: 'hongdou-yimi',
    name: '红豆薏米粥',
    effect: '祛湿',
    constitutions: ['痰湿质', '湿热质'],
    solarTerms: ['谷雨', '立夏', '小满', '芒种', '小暑', '大暑'],
    ingredients: ['红豆 50g', '薏米 50g', '大米 适量'],
    steps: ['红豆、薏米提前浸泡 2 小时', '与大米一同入锅', '加足量水大火烧开', '转小火熬至软烂'],
    frequency: '每周 2-3 次',
    taboo: '孕妇慎食薏米',
    difficulty: 1,
    description: '健脾祛湿经典粥品，湿气重、身体困重者宜常食。',
  },
  {
    id: 'juhua-gouqi',
    name: '菊花枸杞茶',
    effect: '清热',
    constitutions: ['平和质', '阴虚质'],
    solarTerms: ['立夏', '小满', '芒种', '夏至', '小暑', '大暑'],
    ingredients: ['杭白菊 5g', '枸杞 10g', '冰糖 少许'],
    steps: ['菊花、枸杞放入杯中', '沸水冲泡', '加盖焖 5 分钟', '代茶饮'],
    frequency: '每日 1 杯',
    taboo: '脾胃虚寒、腹泻者少饮',
    difficulty: 1,
    description: '清肝明目、疏散风热，夏季用眼多者宜饮。',
  },
  {
    id: 'suanzaoren',
    name: '酸枣仁安神汤',
    effect: '安神',
    constitutions: ['气郁质', '阴虚质'],
    solarTerms: ['春分', '秋分', '冬至'],
    ingredients: ['酸枣仁 15g', '茯苓 10g', '百合 10g', '红枣 3 枚'],
    steps: ['酸枣仁捣碎', '所有食材入锅', '加 3 碗水煎至 1 碗', '睡前温服'],
    frequency: '每周 2-3 次',
    taboo: '腹泻者少食',
    difficulty: 2,
    description: '养心安神、敛汗，虚烦不眠者宜用。',
  },
  {
    id: 'shanyao-paigu',
    name: '山药排骨汤',
    effect: '健脾',
    constitutions: ['气虚质', '痰湿质', '平和质'],
    solarTerms: ['立春', '雨水', '惊蛰', '春分'],
    ingredients: ['铁棍山药 300g', '排骨 500g', '枸杞 10g', '生姜 3 片'],
    steps: ['排骨焯水', '山药去皮切段', '排骨先炖 1 小时', '加入山药再炖 30 分钟', '加枸杞、盐调味'],
    frequency: '每周 1-2 次',
    taboo: '便秘者少食山药',
    difficulty: 1,
    description: '健脾益胃、助消化，春季养脾佳品。',
  },
  {
    id: 'baihe-xueli',
    name: '百合雪梨汤',
    effect: '润肺',
    constitutions: ['阴虚质', '平和质'],
    solarTerms: ['白露', '秋分', '寒露', '霜降', '立冬'],
    ingredients: ['鲜百合 50g', '雪梨 1 个', '冰糖 适量', '枸杞 少许'],
    steps: ['雪梨去皮切块', '百合洗净', '雪梨先煮 20 分钟', '加入百合再煮 10 分钟', '加冰糖、枸杞即可'],
    frequency: '秋季每周 2-3 次',
    taboo: '脾胃虚寒、便溏者少食',
    difficulty: 1,
    description: '润肺止咳、清心安神，秋燥干咳者宜食。',
  },
  {
    id: 'hongzao-guihua',
    name: '红枣桂圆茶',
    effect: '补血',
    constitutions: ['血虚质', '气虚质'],
    solarTerms: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    ingredients: ['红枣 5 枚', '桂圆肉 10g', '枸杞 5g', '红糖 适量'],
    steps: ['红枣去核切片', '桂圆肉、枸杞洗净', '沸水冲泡', '加盖焖 10 分钟', '加红糖调味'],
    frequency: '每日 1 杯',
    taboo: '阴虚火旺、湿热者少饮',
    difficulty: 1,
    description: '补血安神、暖宫养颜，气血不足者宜饮。',
  },
  {
    id: 'donggua-yimi',
    name: '冬瓜薏米汤',
    effect: '清热',
    constitutions: ['湿热质', '痰湿质'],
    solarTerms: ['小满', '芒种', '夏至', '小暑', '大暑'],
    ingredients: ['冬瓜 500g', '薏米 50g', '排骨 300g', '生姜 2 片'],
    steps: ['薏米提前浸泡', '冬瓜连皮切块', '排骨焯水', '所有食材入锅炖 1 小时', '加盐调味'],
    frequency: '夏季每周 1-2 次',
    taboo: '孕妇慎食薏米',
    difficulty: 1,
    description: '清热利水、消肿祛湿，夏季湿热困重者宜食。',
  },
  {
    id: 'jiucai-xiaren',
    name: '韭菜炒虾仁',
    effect: '温阳',
    constitutions: ['阳虚质', '平和质'],
    solarTerms: ['立春', '雨水', '惊蛰'],
    ingredients: ['韭菜 200g', '鲜虾仁 150g', '生姜 2 片', '料酒 少许'],
    steps: ['韭菜切段，虾仁洗净', '虾仁用料酒、盐腌 10 分钟', '热油爆香姜片', '下虾仁快炒至变色', '加入韭菜翻炒 1 分钟即可'],
    frequency: '每周 1-2 次',
    taboo: '阴虚火旺者少食',
    difficulty: 1,
    description: '温补肾阳、行气活血，春季助阳生发。',
  },
  {
    id: 'chenpi-puer',
    name: '陈皮普洱茶',
    effect: '疏肝',
    constitutions: ['气郁质', '痰湿质'],
    solarTerms: ['立春', '春分', '立秋', '秋分'],
    ingredients: ['陈皮 3g', '熟普洱 5g'],
    steps: ['陈皮撕成小块', '与普洱一同放入壶中', '沸水洗茶一次', '再注沸水焖 3 分钟', '代茶饮'],
    frequency: '每周 3-4 次',
    taboo: '失眠者下午后少饮',
    difficulty: 1,
    description: '理气健脾、燥湿化痰，气郁胸闷者宜饮。',
  },
  {
    id: 'heidou-hetao',
    name: '黑豆核桃粥',
    effect: '补气',
    constitutions: ['气虚质', '阳虚质'],
    solarTerms: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    ingredients: ['黑豆 50g', '核桃仁 30g', '黑米 50g', '冰糖 适量'],
    steps: ['黑豆、黑米提前浸泡', '核桃仁掰碎', '所有食材入锅', '熬至软烂', '加冰糖调味'],
    frequency: '冬季每周 2-3 次',
    taboo: '消化不良者少食',
    difficulty: 1,
    description: '补肾益精、乌发养颜，冬季补肾佳品。',
  },
  {
    id: 'lianzi-baihe',
    name: '莲子百合粥',
    effect: '安神',
    constitutions: ['阴虚质', '气郁质', '平和质'],
    solarTerms: ['夏至', '小暑', '大暑', '立秋'],
    ingredients: ['莲子 30g', '鲜百合 30g', '大米 100g', '冰糖 适量'],
    steps: ['莲子去芯', '百合洗净', '大米与莲子先煮', '粥将成时加入百合', '加冰糖融化即可'],
    frequency: '每周 2 次',
    taboo: '腹胀、便溏者少食',
    difficulty: 1,
    description: '养心安神、润肺健脾，心烦失眠者宜食。',
  },
  {
    id: 'gouqi-zhugan',
    name: '枸杞猪肝汤',
    effect: '补血',
    constitutions: ['血虚质', '阴虚质'],
    solarTerms: ['春分', '清明', '谷雨'],
    ingredients: ['枸杞 15g', '猪肝 200g', '菠菜 100g', '生姜 2 片'],
    steps: ['猪肝切片泡水去血', '菠菜焯水', '水开下姜片、猪肝', '煮至变色加入枸杞、菠菜', '加盐调味'],
    frequency: '每周 1 次',
    taboo: '高胆固醇者少食',
    difficulty: 2,
    description: '补肝养血、明目，春季养肝佳品。',
  },
  {
    id: 'jiangzao-cha',
    name: '姜枣茶',
    effect: '温阳',
    constitutions: ['阳虚质', '气虚质'],
    solarTerms: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
    ingredients: ['生姜 3 片', '红枣 5 枚', '红糖 适量'],
    steps: ['红枣去核', '生姜切片', '沸水冲泡或煮 10 分钟', '加红糖调味'],
    frequency: '冬季每日 1 杯',
    taboo: '阴虚火旺、口干舌燥者少饮',
    difficulty: 1,
    description: '温中散寒、暖胃止呕，冬季驱寒暖身。',
  },
  {
    id: 'shanyao-yimi',
    name: '山药薏米粥',
    effect: '健脾',
    constitutions: ['痰湿质', '气虚质'],
    solarTerms: ['谷雨', '立夏', '处暑', '白露'],
    ingredients: ['山药 100g', '薏米 50g', '大米 80g', '红枣 3 枚'],
    steps: ['薏米提前浸泡', '山药去皮切丁', '所有食材入锅', '熬至软烂即可'],
    frequency: '每周 2-3 次',
    taboo: '孕妇慎食薏米',
    difficulty: 1,
    description: '健脾祛湿、益气养胃，脾虚湿盛者宜常食。',
  },
]

// ============================================================
// 纯函数
// ============================================================

/** 按关键词检索药膳（名称/功效/体质/节气/食材） */
export function searchRecipes(keyword: string): MedicinalRecipe[] {
  const kw = keyword.trim()
  if (!kw) return MEDICINAL_RECIPES
  const lower = kw.toLowerCase()
  return MEDICINAL_RECIPES.filter(r =>
    r.name.includes(kw) ||
    r.effect.includes(kw) ||
    r.description.includes(kw) ||
    r.constitutions.some(c => c.includes(kw)) ||
    r.solarTerms.some(s => s.includes(kw)) ||
    r.ingredients.some(i => i.toLowerCase().includes(lower)),
  )
}

/** 按功效筛选 */
export function recipesByEffect(effect: RecipeEffect | null): MedicinalRecipe[] {
  if (!effect) return MEDICINAL_RECIPES
  return MEDICINAL_RECIPES.filter(r => r.effect === effect)
}

/** 按体质筛选 */
export function recipesByConstitution(constitution: string | null): MedicinalRecipe[] {
  if (!constitution) return MEDICINAL_RECIPES
  return MEDICINAL_RECIPES.filter(r => r.constitutions.includes(constitution))
}

/** 按节气筛选 */
export function recipesBySolarTerm(term: string | null): MedicinalRecipe[] {
  if (!term) return MEDICINAL_RECIPES
  return MEDICINAL_RECIPES.filter(r => r.solarTerms.includes(term))
}

/** 今日药膳（按日期哈希确定性轮换） */
export function recipeOfTheDay(date: Date = new Date()): MedicinalRecipe {
  const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let hash = 0
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0
  }
  return MEDICINAL_RECIPES[hash % MEDICINAL_RECIPES.length]
}

/** 随机一道药膳 */
export function randomRecipe(): MedicinalRecipe {
  return MEDICINAL_RECIPES[Math.floor(Math.random() * MEDICINAL_RECIPES.length)]
}

/** 药膳功效统计 */
export function effectStats(): { effect: RecipeEffect; count: number }[] {
  const counts = new Map<RecipeEffect, number>()
  for (const r of MEDICINAL_RECIPES) {
    counts.set(r.effect, (counts.get(r.effect) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([effect, count]) => ({ effect, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// useMedicinalDietStore — 药膳收藏
// ============================================================

export function useMedicinalDietStore() {
  const favorites = ref<RecipeFavorite[]>(storage.getKV<RecipeFavorite[]>(STORAGE_KEY, []))

  function persist() {
    storage.setKV(STORAGE_KEY, favorites.value)
  }

  function load() {
    favorites.value = storage.getKV<RecipeFavorite[]>(STORAGE_KEY, [])
  }

  function isFavorite(recipeId: string): boolean {
    return favorites.value.some(f => f.recipeId === recipeId)
  }

  function toggleFavorite(recipeId: string): boolean {
    const idx = favorites.value.findIndex(f => f.recipeId === recipeId)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push({ recipeId, favoritedAt: new Date().toISOString() })
    }
    persist()
    return isFavorite(recipeId)
  }

  const favoriteRecipes = computed(() =>
    favorites.value
      .map(f => MEDICINAL_RECIPES.find(r => r.id === f.recipeId))
      .filter((r): r is MedicinalRecipe => r !== undefined),
  )

  return { favorites, isFavorite, toggleFavorite, favoriteRecipes, persist, load }
}

/** 单例模式（与 note 模块 getNoteStore 一致）：跨组件共享收藏状态 */
let _medicinalDietInstance: ReturnType<typeof useMedicinalDietStore> | null = null

export function getMedicinalDietStore() {
  if (!_medicinalDietInstance) {
    _medicinalDietInstance = useMedicinalDietStore()
    _medicinalDietInstance.load()
  }
  return _medicinalDietInstance
}

/** 药膳洞察 */
export function medicinalDietInsights(date: Date = new Date()): MedicinalDietInsight {
  const today = recipeOfTheDay(date)
  const byEffect = effectStats()
  const store = getMedicinalDietStore()
  const favoriteCount = store.favorites.value.length
  const seasonal = recipesBySolarTerm(today.solarTerms[0]).slice(0, 4)
  return { today, byEffect, favoriteCount, seasonal }
}
