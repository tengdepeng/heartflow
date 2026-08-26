// ============================================================
// 藏象阁 · 五运六气推算 + 经书注解
// 增强功能：
//   1. 五运六气推算（年运推算+司天在泉+主客气+节气配属）
//   2. 经书注解系统（分类+注解+冥想引导+阅读进度）
//   3. 体质调理方案（基于体质+季节+五运六气的个性化建议）
//   4. 经络自检（日常经络自查+问题脉轮+调理建议）
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type {
  FiveElement,
  MeridianType,
  MeridianRecord,
  ConstitutionType,
  ConstitutionAnalysis,
} from './types'
import { CONSTITUTION_META } from './types'

// ---- 五运六气 ----

/** 天干 */
export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'

/** 地支 */
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

/** 六气 */
export type SixQi = '厥阴风木' | '少阴君火' | '少阳相火' | '太阴湿土' | '阳明燥金' | '太阳寒水'

/** 五运 */
export type FiveMovement = '太角' | '少徵' | '太宫' | '少商' | '太羽' | '少角' | '太徵' | '少宫' | '太商' | '少羽'

/** 节气 */
export type SolarTerm =
  | '立春' | '雨水' | '惊蛰' | '春分' | '清明' | '谷雨'
  | '立夏' | '小满' | '芒种' | '夏至' | '小暑' | '大暑'
  | '立秋' | '处暑' | '白露' | '秋分' | '寒露' | '霜降'
  | '立冬' | '小雪' | '大雪' | '冬至' | '小寒' | '大寒'

/** 年运推算结果 */
export interface YearlyMovement {
  year: number
  heavenlyStem: HeavenlyStem
  earthlyBranch: EarthlyBranch
  /** 大运 */
  greatMovement: FiveElement
  /** 大运太过/不及 */
  isExcess: boolean
  /** 司天 */
  celestialManager: SixQi
  /** 在泉 */
  terrestrialSpring: SixQi
  /** 主运 */
  hostMovement: FiveMovement
  /** 客运 */
  guestMovement: FiveMovement
  /** 当前节气 */
  currentTerm: SolarTerm
  /** 当前主气 */
  currentHostQi: SixQi
  /** 当前客气 */
  currentGuestQi: SixQi
  /** 养生建议 */
  healthAdvice: string
}

// ---- 经书注解 ----

/** 注解类型 */
export type AnnotationType = 'explanation' | 'reflection' | 'application' | 'question' | 'connection'

/** 经书注解 */
export interface SutraAnnotation {
  id: string
  sutraId: string
  /** 注解位置（段落/行号） */
  position: string
  type: AnnotationType
  content: string
  createdAt: string
  /** 是否已消化 */
  digested: boolean
}

/** 冥想引导 */
export interface MeditationGuide {
  id: string
  sutraId: string
  title: string
  /** 引导步骤 */
  steps: { instruction: string; durationMinutes: number }[]
  /** 关联经文 */
  relatedVerse: string
  /** 总时长 */
  totalDuration: number
}

// ---- 体质调理 ----

/** 调理方案 */
export interface WellnessPlan {
  /** 体质类型 */
  constitutionType: ConstitutionType
  /** 饮食建议 */
  dietAdvice: string[]
  /** 运动建议 */
  exerciseAdvice: string[]
  /** 作息建议 */
  lifestyleAdvice: string[]
  /** 穴位按摩 */
  acupressurePoints: { name: string; location: string; technique: string }[]
  /** 推荐茶饮 */
  teaRecommendations: string[]
  /** 季节调整 */
  seasonalAdjustments: Record<string, string>
  /** 生成时间 */
  generatedAt: string
}

// ---- 经络自检 ----

/** 经络问题 */
export interface MeridianIssue {
  meridian: MeridianType
  organ: string
  /** 问题等级 */
  severity: 'mild' | 'moderate' | 'severe'
  /** 问题描述 */
  description: string
  /** 调理建议 */
  remedy: string
  /** 关联情绪 */
  relatedEmotion: string
}

/** 经络自检报告 */
export interface MeridianCheckReport {
  /** 检查时间 */
  checkedAt: string
  /** 问题列表 */
  issues: MeridianIssue[]
  /** 整体评分 0-100 */
  overallScore: number
  /** 最有问题的经络 */
  worstMeridian: MeridianType | null
  /** 建议 */
  recommendations: string[]
}

// ---- 存储键 ----

const BODY_WISDOM_ADVANCED_STORAGE_KEYS = {
  ANNOTATIONS: 'hf:body-wisdom:annotations',
  WELLNESS_PLANS: 'hf:body-wisdom:wellness-plans',
  CHECK_REPORTS: 'hf:body-wisdom:check-reports',
} as const

// ---- 元数据 ----

/** 天干对应五行 */
const HEAVENLY_STEM_ELEMENT: Record<HeavenlyStem, { element: FiveElement; isExcess: boolean }> = {
  '甲': { element: 'wood', isExcess: true },
  '乙': { element: 'wood', isExcess: false },
  '丙': { element: 'fire', isExcess: true },
  '丁': { element: 'fire', isExcess: false },
  '戊': { element: 'earth', isExcess: true },
  '己': { element: 'earth', isExcess: false },
  '庚': { element: 'metal', isExcess: true },
  '辛': { element: 'metal', isExcess: false },
  '壬': { element: 'water', isExcess: true },
  '癸': { element: 'water', isExcess: false },
}

/** 地支司天在泉 */
const BRANCH_SIX_QI: Record<EarthlyBranch, { celestial: SixQi; terrestrial: SixQi }> = {
  '子': { celestial: '少阴君火', terrestrial: '阳明燥金' },
  '丑': { celestial: '太阴湿土', terrestrial: '太阳寒水' },
  '寅': { celestial: '少阳相火', terrestrial: '厥阴风木' },
  '卯': { celestial: '阳明燥金', terrestrial: '少阴君火' },
  '辰': { celestial: '太阳寒水', terrestrial: '太阴湿土' },
  '巳': { celestial: '厥阴风木', terrestrial: '少阳相火' },
  '午': { celestial: '少阴君火', terrestrial: '阳明燥金' },
  '未': { celestial: '太阴湿土', terrestrial: '太阳寒水' },
  '申': { celestial: '少阳相火', terrestrial: '厥阴风木' },
  '酉': { celestial: '阳明燥金', terrestrial: '少阴君火' },
  '戌': { celestial: '太阳寒水', terrestrial: '太阴湿土' },
  '亥': { celestial: '厥阴风木', terrestrial: '少阳相火' },
}

/** 二十四节气 */
const SOLAR_TERMS: SolarTerm[] = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
]

/** 节气对应六气 */
const TERM_SIX_QI: Record<SolarTerm, SixQi> = {
  '立春': '厥阴风木', '雨水': '厥阴风木', '惊蛰': '厥阴风木', '春分': '厥阴风木',
  '清明': '少阴君火', '谷雨': '少阴君火', '立夏': '少阴君火', '小满': '少阴君火',
  '芒种': '少阳相火', '夏至': '少阳相火', '小暑': '少阳相火', '大暑': '少阳相火',
  '立秋': '太阴湿土', '处暑': '太阴湿土', '白露': '太阴湿土', '秋分': '太阴湿土',
  '寒露': '阳明燥金', '霜降': '阳明燥金', '立冬': '阳明燥金', '小雪': '阳明燥金',
  '大雪': '太阳寒水', '冬至': '太阳寒水', '小寒': '太阳寒水', '大寒': '太阳寒水',
}

export const ANNOTATION_TYPE_META: Record<AnnotationType, { label: string; icon: string; color: string }> = {
  explanation: { label: '注解', icon: '📝', color: '#6b9fc4' },
  reflection: { label: '感悟', icon: '💭', color: '#a07c8c' },
  application: { label: '应用', icon: '🎯', color: '#5ab8a0' },
  question: { label: '疑问', icon: '❓', color: '#f0c040' },
  connection: { label: '关联', icon: '🔗', color: '#d98c7a' },
}

// ============================================================
// useFiveMovements — 五运六气推算
// ============================================================

export function useFiveMovements() {
  const yearlyMovement = ref<YearlyMovement | null>(null)

  /** 天干地支 */
  const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  /** 推算年运 */
  function calculateYearlyMovement(year: number): YearlyMovement {
    const stemIndex = (year - 4) % 10
    const branchIndex = (year - 4) % 12

    const stem = HEAVENLY_STEMS[stemIndex >= 0 ? stemIndex : stemIndex + 10]
    const branch = EARTHLY_BRANCHES[branchIndex >= 0 ? branchIndex : branchIndex + 12]

    const stemInfo = HEAVENLY_STEM_ELEMENT[stem]
    const branchInfo = BRANCH_SIX_QI[branch]

    const now = new Date()
    const month = now.getMonth() + 1

    // 根据月份确定当前节气
    const termIndex = Math.min(month, 12) - 1
    const currentTerm = SOLAR_TERMS[Math.min(termIndex * 2, 23)]
    const currentHostQi = TERM_SIX_QI[currentTerm]

    // 主运：根据大运推算
    const hostMovement = getHostMovement(stemInfo.element)
    const guestMovement = getGuestMovement(stemInfo.element)

    // 客气：根据司天在泉推算
    const currentGuestQi = getCurrentGuestQi(branchInfo.celestial, month)

    // 养生建议
    const healthAdvice = generateHealthAdvice(
      stemInfo.element,
      stemInfo.isExcess,
      currentHostQi,
      currentGuestQi,
    )

    yearlyMovement.value = {
      year,
      heavenlyStem: stem,
      earthlyBranch: branch,
      greatMovement: stemInfo.element,
      isExcess: stemInfo.isExcess,
      celestialManager: branchInfo.celestial,
      terrestrialSpring: branchInfo.terrestrial,
      hostMovement,
      guestMovement,
      currentTerm,
      currentHostQi,
      currentGuestQi,
      healthAdvice,
    }

    return yearlyMovement.value
  }

  /** 获取主运 */
  function getHostMovement(greatElement: FiveElement): FiveMovement {
    const elementOrder: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']
    const startIdx = elementOrder.indexOf(greatElement)
    // 简化：返回大运对应的主运
    const movementNames: FiveMovement[] = ['太角', '少徵', '太宫', '少商', '太羽']
    return movementNames[startIdx]
  }

  /** 获取客运 */
  function getGuestMovement(greatElement: FiveElement): FiveMovement {
    const movementNames: FiveMovement[] = ['太角', '少徵', '太宫', '少商', '太羽']
    const elementOrder: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']
    const idx = elementOrder.indexOf(greatElement)
    return movementNames[(idx + 1) % 5]
  }

  /** 获取当前客气 */
  function getCurrentGuestQi(celestialManager: SixQi, month: number): SixQi {
    const sixQiOrder: SixQi[] = [
      '厥阴风木', '少阴君火', '少阳相火', '太阴湿土', '阳明燥金', '太阳寒水',
    ]

    const startIdx = sixQiOrder.indexOf(celestialManager)
    // 每两个月一个客气
    const offset = Math.floor((month - 1) / 2) % 6
    return sixQiOrder[(startIdx + offset) % 6]
  }

  /** 生成养生建议 */
  function generateHealthAdvice(
    greatElement: FiveElement,
    isExcess: boolean,
    hostQi: SixQi,
    guestQi: SixQi,
  ): string {
    const elementNames: Record<FiveElement, string> = {
      wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
    }

    let advice = `今年为${elementNames[greatElement]}运${isExcess ? '太过' : '不及'}之年。`

    // 根据主客气关系
    if (hostQi === guestQi) {
      advice += '主客气相同，气候平稳，宜保持常规养生。'
    } else {
      advice += `主气为${hostQi}，客气为${guestQi}，气候有变，注意调适。`
    }

    // 根据五行
    if (greatElement === 'wood') {
      advice += '宜疏肝理气，多食绿色蔬菜，保持心情舒畅。'
    } else if (greatElement === 'fire') {
      advice += '宜清心安神，避免过度劳累，注意心血管健康。'
    } else if (greatElement === 'earth') {
      advice += '宜健脾祛湿，饮食清淡，注意消化系统。'
    } else if (greatElement === 'metal') {
      advice += '宜润肺养阴，多食白色食物，注意呼吸系统。'
    } else if (greatElement === 'water') {
      advice += '宜补肾固精，注意保暖，避免熬夜。'
    }

    return advice
  }

  return {
    yearlyMovement,
    calculateYearlyMovement,
  }
}

// ============================================================
// useSutraAnnotations — 经书注解系统
// ============================================================

export function useSutraAnnotations() {
  const annotations = ref<SutraAnnotation[]>([])
  const guides = ref<MeditationGuide[]>([])

  /** 加载注解 */
  function loadAnnotations(): SutraAnnotation[] {
    const stored = storage.getKV<SutraAnnotation[]>(BODY_WISDOM_ADVANCED_STORAGE_KEYS.ANNOTATIONS, [])
    if (stored) annotations.value = stored
    return annotations.value
  }

  /** 添加注解 */
  function addAnnotation(
    sutraId: string,
    position: string,
    type: AnnotationType,
    content: string,
  ): SutraAnnotation {
    const annotation: SutraAnnotation = {
      id: `ann-${Date.now()}`,
      sutraId,
      position,
      type,
      content,
      createdAt: new Date().toISOString(),
      digested: false,
    }

    annotations.value.push(annotation)
    saveAnnotations()
    return annotation
  }

  /** 消化注解 */
  function digestAnnotation(annotationId: string): boolean {
    const ann = annotations.value.find(a => a.id === annotationId)
    if (!ann) return false
    ann.digested = true
    saveAnnotations()
    return true
  }

  /** 创建冥想引导 */
  function createMeditationGuide(
    sutraId: string,
    title: string,
    relatedVerse: string,
    steps: { instruction: string; durationMinutes: number }[],
  ): MeditationGuide {
    const guide: MeditationGuide = {
      id: `guide-${Date.now()}`,
      sutraId,
      title,
      steps,
      relatedVerse,
      totalDuration: steps.reduce((s, st) => s + st.durationMinutes, 0),
    }

    guides.value.push(guide)
    return guide
  }

  /** 注解统计 */
  const annotationStats = computed(() => {
    const byType: Record<string, number> = {}
    for (const a of annotations.value) {
      byType[a.type] = (byType[a.type] || 0) + 1
    }

    return {
      total: annotations.value.length,
      digested: annotations.value.filter(a => a.digested).length,
      digestionRate: annotations.value.length > 0
        ? Math.round(annotations.value.filter(a => a.digested).length / annotations.value.length * 100)
        : 0,
      byType,
    }
  })

  /** 保存 */
  function saveAnnotations(): void {
    storage.setKV(BODY_WISDOM_ADVANCED_STORAGE_KEYS.ANNOTATIONS, annotations.value)
  }

  return {
    annotations,
    guides,
    annotationStats,
    loadAnnotations,
    addAnnotation,
    digestAnnotation,
    createMeditationGuide,
    saveAnnotations,
  }
}

// ============================================================
// useWellnessPlan — 体质调理方案
// ============================================================

export function useWellnessPlan() {
  const wellnessPlan = ref<WellnessPlan | null>(null)

  /** 生成调理方案 */
  function generateWellnessPlan(
    constitution: ConstitutionAnalysis,
  ): WellnessPlan {
    const meta = CONSTITUTION_META[constitution.type]

    // 饮食建议
    const dietAdvice: string[] = []
    if (constitution.type === 'qi-deficiency') {
      dietAdvice.push('多食补气食物：黄芪、党参、山药、红枣')
      dietAdvice.push('避免生冷食物，宜温热饮食')
      dietAdvice.push('推荐粥品：小米山药粥')
    } else if (constitution.type === 'yang-deficiency') {
      dietAdvice.push('多食温阳食物：生姜、羊肉、韭菜、核桃')
      dietAdvice.push('避免寒凉食物，少食生冷瓜果')
      dietAdvice.push('推荐汤品：当归生姜羊肉汤')
    } else if (constitution.type === 'yin-deficiency') {
      dietAdvice.push('多食滋阴食物：百合、银耳、枸杞、黑芝麻')
      dietAdvice.push('避免辛辣燥热食物')
      dietAdvice.push('推荐甜品：银耳百合羹')
    } else {
      dietAdvice.push('保持均衡饮食，五谷为养')
      dietAdvice.push('根据季节调整：春养肝、夏养心、秋养肺、冬养肾')
    }

    // 运动建议
    const exerciseAdvice: string[] = []
    if (constitution.type === 'qi-deficiency' || constitution.type === 'yang-deficiency') {
      exerciseAdvice.push('适合温和运动：太极、八段锦、散步')
      exerciseAdvice.push('避免剧烈运动，以微微出汗为度')
    } else if (constitution.type === 'phlegm-dampness' || constitution.type === 'damp-heat') {
      exerciseAdvice.push('适合有氧运动：跑步、游泳、骑行')
      exerciseAdvice.push('每周至少运动 3 次，每次 30 分钟以上')
    } else {
      exerciseAdvice.push('保持适度运动，每周 3-5 次')
      exerciseAdvice.push('结合有氧和力量训练')
    }

    // 穴位推荐
    const acupressurePoints: WellnessPlan['acupressurePoints'] = []
    if (constitution.type === 'qi-stagnation') {
      acupressurePoints.push(
        { name: '太冲', location: '足背第一、二跖骨间', technique: '用拇指按压，每次3分钟' },
        { name: '期门', location: '乳头直下第六肋间隙', technique: '手掌轻揉，顺时针36次' },
      )
    } else if (constitution.type === 'blood-stasis') {
      acupressurePoints.push(
        { name: '血海', location: '膝盖内侧上方2寸', technique: '拇指按压，每次5分钟' },
        { name: '三阴交', location: '内踝尖上3寸', technique: '拇指揉按，每次3分钟' },
      )
    } else {
      acupressurePoints.push(
        { name: '足三里', location: '膝盖外侧下方3寸', technique: '拇指按压，每次5分钟' },
        { name: '涌泉', location: '足底前1/3凹陷处', technique: '睡前揉搓至发热' },
      )
    }

    wellnessPlan.value = {
      constitutionType: constitution.type,
      dietAdvice,
      exerciseAdvice,
      lifestyleAdvice: [
        '保持规律作息，早睡早起',
        '保持心情舒畅，避免情绪过激',
        meta.advice,
      ],
      acupressurePoints,
      teaRecommendations: getTeaRecommendations(constitution.type),
      seasonalAdjustments: getSeasonalAdjustments(),
      generatedAt: new Date().toISOString(),
    }

    return wellnessPlan.value
  }

  /** 获取推荐茶饮 */
  function getTeaRecommendations(constitution: ConstitutionType): string[] {
    const teas: Record<ConstitutionType, string[]> = {
      balanced: ['绿茶', '乌龙茶', '花茶'],
      'qi-deficiency': ['黄芪茶', '党参茶', '红枣茶'],
      'yang-deficiency': ['姜茶', '肉桂茶', '红茶'],
      'yin-deficiency': ['枸杞菊花茶', '麦冬茶', '百合茶'],
      'phlegm-dampness': ['陈皮茶', '薏仁茶', '山楂茶'],
      'damp-heat': ['菊花茶', '金银花茶', '绿茶'],
      'blood-stasis': ['玫瑰花茶', '山楂茶', '红花茶'],
      'qi-stagnation': ['玫瑰花茶', '茉莉花茶', '佛手茶'],
      allergic: ['薄荷茶', '紫苏茶', '甘草茶'],
    }
    return teas[constitution] || ['白开水']
  }

  /** 获取季节调整 */
  function getSeasonalAdjustments(): Record<string, string> {
    return {
      '春': '注意养肝，多食绿色蔬菜，保持心情舒畅',
      '夏': '注意养心，避免过度出汗，适当午休',
      '长夏': '注意健脾祛湿，饮食清淡',
      '秋': '注意润肺，多食白色食物，保持皮肤湿润',
      '冬': '注意补肾，早睡晚起，注意保暖',
    }
  }

  return {
    wellnessPlan,
    generateWellnessPlan,
  }
}

// ============================================================
// useMeridianCheck — 经络自检
// ============================================================

export function useMeridianCheck() {
  const checkReports = ref<MeridianCheckReport[]>([])

  /** 加载报告 */
  function loadCheckReports(): MeridianCheckReport[] {
    const stored = storage.getKV<MeridianCheckReport[]>(BODY_WISDOM_ADVANCED_STORAGE_KEYS.CHECK_REPORTS, [])
    if (stored) checkReports.value = stored
    return checkReports.value
  }

  /** 执行经络自检 */
  function performMeridianCheck(records: MeridianRecord[]): MeridianCheckReport {
    const issues: MeridianIssue[] = []
    const meridianCounts = new Map<MeridianType, { good: number; ok: number; bad: number; total: number }>()

    for (const r of records) {
      const existing = meridianCounts.get(r.meridian) || { good: 0, ok: 0, bad: 0, total: 0 }
      if (r.feeling === 'good') existing.good++
      else if (r.feeling === 'ok') existing.ok++
      else existing.bad++
      existing.total++
      meridianCounts.set(r.meridian, existing)
    }

    // 分析问题
    for (const [meridian, counts] of meridianCounts) {
      const badRate = counts.total > 0 ? counts.bad / counts.total : 0
      if (badRate > 0.5) {
        issues.push({
          meridian,
          organ: getMeridianOrgan(meridian),
          severity: 'severe',
          description: `${getMeridianName(meridian)}经络状况不佳，负面记录占 ${Math.round(badRate * 100)}%`,
          remedy: getMeridianRemedy(meridian),
          relatedEmotion: getMeridianEmotion(meridian),
        })
      } else if (badRate > 0.3) {
        issues.push({
          meridian,
          organ: getMeridianOrgan(meridian),
          severity: 'moderate',
          description: `${getMeridianName(meridian)}经络需关注，负面记录占 ${Math.round(badRate * 100)}%`,
          remedy: getMeridianRemedy(meridian),
          relatedEmotion: getMeridianEmotion(meridian),
        })
      }
    }

    const overallScore = meridianCounts.size > 0
      ? Math.round(
          [...meridianCounts.values()].reduce((s, c) => s + (c.good * 100 + c.ok * 50) / c.total, 0) / meridianCounts.size
        )
      : 100

    const worstMeridian = issues.length > 0
      ? issues.sort((a, b) => (a.severity === 'severe' ? -1 : 1) - (b.severity === 'severe' ? -1 : 1))[0].meridian
      : null

    const recommendations: string[] = []
    if (issues.length > 2) {
      recommendations.push('建议进行全面的经络调理，可咨询中医师')
    }
    if (issues.some(i => i.severity === 'severe')) {
      recommendations.push('存在严重经络问题，建议及时就医检查')
    }
    recommendations.push('保持规律作息，按子午流注时辰调整生活节奏')

    const report: MeridianCheckReport = {
      checkedAt: new Date().toISOString(),
      issues,
      overallScore,
      worstMeridian,
      recommendations,
    }

    checkReports.value.push(report)
    saveReports()
    return report
  }

  /** 获取经络名称 */
  function getMeridianName(meridian: MeridianType): string {
    const names: Record<MeridianType, string> = {
      lung: '手太阴肺经',
      'large-intestine': '手阳明大肠经',
      stomach: '足阳明胃经',
      spleen: '足太阴脾经',
      heart: '手少阴心经',
      'small-intestine': '手太阳小肠经',
      bladder: '足太阳膀胱经',
      kidney: '足少阴肾经',
      pericardium: '手厥阴心包经',
      'triple-burner': '手少阳三焦经',
      gallbladder: '足少阳胆经',
      liver: '足厥阴肝经',
    }
    return names[meridian] || meridian
  }

  /** 获取经络对应脏腑 */
  function getMeridianOrgan(meridian: MeridianType): string {
    const organs: Record<MeridianType, string> = {
      lung: '肺', 'large-intestine': '大肠', stomach: '胃', spleen: '脾',
      heart: '心', 'small-intestine': '小肠', bladder: '膀胱', kidney: '肾',
      pericardium: '心包', 'triple-burner': '三焦', gallbladder: '胆', liver: '肝',
    }
    return organs[meridian] || meridian
  }

  /** 获取经络调理建议 */
  function getMeridianRemedy(meridian: MeridianType): string {
    const remedies: Record<MeridianType, string> = {
      lung: '深呼吸练习，拍打肺经（手臂内侧），多食白色食物',
      'large-intestine': '晨起喝温水，顺时针按摩腹部，多食膳食纤维',
      stomach: '规律饮食，少食多餐，多食黄色食物，按揉足三里',
      spleen: '避免久坐，适当运动，多食黄色食物，按揉三阴交',
      heart: '保持心情平和，避免过度兴奋，午间小憩，拍打心经',
      'small-intestine': '多喝水，避免过烫食物，按揉少泽穴',
      bladder: '多喝水，不憋尿，适当运动，按揉委中穴',
      kidney: '避免熬夜，注意腰部保暖，按揉涌泉穴，多食黑色食物',
      pericardium: '保持心情舒畅，避免过度压力，按揉内关穴',
      'triple-burner': '保持规律作息，避免过饱，按揉外关穴',
      gallbladder: '避免油腻食物，保持情绪稳定，拍打胆经（大腿外侧）',
      liver: '保持心情舒畅，避免熬夜，多食绿色蔬菜，按揉太冲穴',
    }
    return remedies[meridian] || '保持规律作息，适当按摩'
  }

  /** 获取经络对应情绪 */
  function getMeridianEmotion(meridian: MeridianType): string {
    const emotions: Record<MeridianType, string> = {
      lung: '悲伤', 'large-intestine': '内疚', stomach: '焦虑', spleen: '思虑',
      heart: '狂喜', 'small-intestine': '不安', bladder: '恐惧', kidney: '恐惧',
      pericardium: '压抑', 'triple-burner': '混乱', gallbladder: '愤怒', liver: '愤怒',
    }
    return emotions[meridian] || '情绪波动'
  }

  /** 最新检查报告 */
  const latestReport = computed(() => {
    if (checkReports.value.length === 0) return null
    return checkReports.value.sort((a, b) =>
      new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
    )[0]
  })

  /** 保存 */
  function saveReports(): void {
    storage.setKV(BODY_WISDOM_ADVANCED_STORAGE_KEYS.CHECK_REPORTS, checkReports.value)
  }

  return {
    checkReports,
    latestReport,
    loadCheckReports,
    performMeridianCheck,
    saveReports,
  }
}