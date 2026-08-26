// ============================================================
// 自体镜像 · 四柱画像
// 借鉴「四柱八字」的结构化展示 UI，仅用于自我映射与反思，
// 不引入任何命理推算。四柱分别代表不同维度的自我认知。
// 全部本地实现，守宪法第1条本地私有。
// ============================================================

export interface BirthData {
  year: number
  month: number
  day: number
  hour: number // 0~23
}

export interface Pillar {
  label: string
  keyword: string
  description: string
  color: string
  icon: string
}

export interface FourPillarsProfile {
  birth: BirthData
  pillars: [Pillar, Pillar, Pillar, Pillar] // 年柱、月柱、日柱、时柱
  overall: string
}

// 年份维度映射（基于出生年的自我时期划分）
const YEAR_ARCHETYPES = [
  { keyword: '探索期', description: '你的人生基调是不断探索与尝试，对新事物保持开放', color: '#8a9a7a', icon: '🌱' },
  { keyword: '建设期', description: '你倾向于脚踏实地构建自己的世界，注重积累与稳固', color: '#e0a96d', icon: '🏗️' },
  { keyword: '蜕变期', description: '你的人生充满转折与蜕变，在变化中寻找新的可能性', color: '#6b9fc4', icon: '🦋' },
  { keyword: '沉淀期', description: '你善于将经历转化为智慧，在沉淀中形成独特的人生观', color: '#a07c8c', icon: '💎' },
]

// 月份维度映射（基于出生月的情绪底色）
const MONTH_ARCHETYPES = [
  { keyword: '沉静', description: '你的内在世界深沉而内敛，喜欢独处与思考', color: '#4a6fa5', icon: '🌊' },
  { keyword: '热烈', description: '你的情感充沛而直接，对生活充满热情', color: '#c0392b', icon: '🔥' },
  { keyword: '平衡', description: '你追求内心的平衡与和谐，善于在矛盾中找到中点', color: '#27ae60', icon: '⚖️' },
  { keyword: '灵动', description: '你的思维敏捷而多变，适应力极强', color: '#8e44ad', icon: '💫' },
]

// 日期维度映射（基于出生日的核心特质）
const DAY_ARCHETYPES = [
  { keyword: '独立', description: '你的核心是独立自主，习惯依靠自己的力量前行', color: '#d4a574', icon: '⛰️' },
  { keyword: '共情', description: '你天生善于感知他人的情绪，在连接中找到意义', color: '#e8a0a0', icon: '💞' },
  { keyword: '创造', description: '你的内在驱动力是创造，总在寻找表达自我的方式', color: '#f0c040', icon: '✨' },
  { keyword: '秩序', description: '你追求清晰的逻辑与秩序，在结构中找到安全感', color: '#7f8c8d', icon: '📐' },
]

// 时辰维度映射（基于出生时辰的志向倾向）
const HOUR_ARCHETYPES = [
  { keyword: '开拓者', description: '你的未来方向是开拓与引领，有与生俱来的领导力', color: '#c0392b', icon: '🚀' },
  { keyword: '守护者', description: '你的使命是守护与传承，在维护中找到价值', color: '#2c3e50', icon: '🛡️' },
  { keyword: '连接者', description: '你未来的角色是连接与桥梁，在沟通中创造价值', color: '#2980b9', icon: '🔗' },
  { keyword: '智者', description: '你的终极追求是智慧与洞见，在思考中抵达深处', color: '#8e44ad', icon: '🔮' },
]

function archetypeFor(input: number, groups: typeof YEAR_ARCHETYPES, groupSize: number): typeof YEAR_ARCHETYPES[0] {
  const index = Math.floor((input % groupSize) / Math.ceil(groupSize / groups.length))
  return groups[Math.min(index, groups.length - 1)]
}

/**
 * 根据出生信息生成四柱画像。
 * 四柱分别代表：年柱（人生基调）、月柱（情绪底色）、
 * 日柱（核心特质）、时柱（志向倾向）。
 */
export function computeFourPillars(birth: BirthData): FourPillarsProfile {
  const yearPillar: Pillar = {
    label: '年柱 · 人生基调',
    ...archetypeFor(birth.year, YEAR_ARCHETYPES, 100),
  }
  const monthPillar: Pillar = {
    label: '月柱 · 情绪底色',
    ...archetypeFor(birth.month, MONTH_ARCHETYPES, 12),
  }
  const dayPillar: Pillar = {
    label: '日柱 · 核心特质',
    ...archetypeFor(birth.day, DAY_ARCHETYPES, 31),
  }
  const hourPillar: Pillar = {
    label: '时柱 · 志向倾向',
    ...archetypeFor(birth.hour, HOUR_ARCHETYPES, 24),
  }

  const pillars: [Pillar, Pillar, Pillar, Pillar] = [yearPillar, monthPillar, dayPillar, hourPillar]

  const overall = `你的四柱画像勾勒出这样一幅自我图景：${yearPillar.keyword}是你的底色，${monthPillar.keyword}藏在内心的深处，${dayPillar.keyword}是你最本真的模样，而${hourPillar.keyword}是你正在成为的方向。这四者共同构成了此刻的你。`

  return { birth, pillars, overall }
}

/** 默认出生信息（基于当前日期推算约 25 岁） */
export function defaultBirthData(): BirthData {
  const now = new Date()
  return {
    year: now.getFullYear() - 25,
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
  }
}

/** 生肖（仅用于文化参考，无命理含义） */
export function zodiacForYear(year: number): string {
  const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  return animals[(year - 4) % 12]
}

/** 星座（仅用于文化参考，无命理含义） */
export function constellationFor(birth: BirthData): string {
  const constellations = [
    { name: '摩羯座', month: 1, day: 20 },
    { name: '水瓶座', month: 2, day: 19 },
    { name: '双鱼座', month: 3, day: 21 },
    { name: '白羊座', month: 4, day: 20 },
    { name: '金牛座', month: 5, day: 21 },
    { name: '双子座', month: 6, day: 21 },
    { name: '巨蟹座', month: 7, day: 23 },
    { name: '狮子座', month: 8, day: 23 },
    { name: '处女座', month: 9, day: 23 },
    { name: '天秤座', month: 10, day: 23 },
    { name: '天蝎座', month: 11, day: 22 },
    { name: '射手座', month: 12, day: 22 },
  ]

  const m = birth.month
  const d = birth.day
  for (const c of constellations) {
    if (m < c.month || (m === c.month && d < c.day)) {
      return c.name
    }
  }
  return '摩羯座'
}