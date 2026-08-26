// ============================================================
// 藏象阁 · 体质分析
// 体质辨识 + 五运六气 + 调理建议
// ============================================================

import { storage } from '@/engine/storage'
import type { ConstitutionType, ConstitutionAnalysis, FiveMovementsSixQi, FiveElement } from './types'
import { BODY_WISDOM_STORAGE_KEYS, CONSTITUTION_META } from './types'

/** 天干对应五行 */
const HEAVENLY_STEM_ELEMENTS: Record<string, FiveElement> = {
  '甲': 'wood', '乙': 'wood',
  '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water',
}

/** 天干列表 */
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

/** 地支列表 */
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 体质问卷 */
const CONSTITUTION_QUESTIONS: { question: string; constitutions: ConstitutionType[] }[] = [
  { question: '您精力充沛吗？', constitutions: ['qi-deficiency'] },
  { question: '您容易疲乏吗？', constitutions: ['qi-deficiency'] },
  { question: '您说话声音低弱无力吗？', constitutions: ['qi-deficiency'] },
  { question: '您感到闷闷不乐、情绪低沉吗？', constitutions: ['qi-stagnation'] },
  { question: '您比一般人耐受不了寒冷吗？', constitutions: ['yang-deficiency'] },
  { question: '您能适应外界自然和社会环境的变化吗？', constitutions: ['balanced'] },
  { question: '您容易失眠吗？', constitutions: ['yin-deficiency'] },
  { question: '您容易忘事吗？', constitutions: ['qi-deficiency', 'blood-stasis'] },
  { question: '您容易心烦吗？', constitutions: ['yin-deficiency', 'damp-heat'] },
  { question: '您手脚心发热吗？', constitutions: ['yin-deficiency'] },
  { question: '您面部或鼻部有油腻感吗？', constitutions: ['damp-heat'] },
  { question: '您面色晦暗或有褐斑吗？', constitutions: ['blood-stasis'] },
  { question: '您容易过敏吗？', constitutions: ['allergic'] },
  { question: '您腹部肥大吗？', constitutions: ['phlegm-dampness'] },
  { question: '您口苦或口干吗？', constitutions: ['damp-heat', 'yin-deficiency'] },
]

// ---- 5 分量表问卷（每型 4 题，共 36 题） ----

export interface ConstitutionScaleQuestion {
  id: string
  type: ConstitutionType
  question: string
}

/** 5 分量表问卷：9 型 × 4 题 = 36 题 */
export const CONSTITUTION_SCALE_QUESTIONS: ConstitutionScaleQuestion[] = [
  // 平和质
  { id: 'scale-1', type: 'balanced', question: '您精力充沛、不易疲劳吗？' },
  { id: 'scale-2', type: 'balanced', question: '您面色红润、目光有神吗？' },
  { id: 'scale-3', type: 'balanced', question: '您睡眠良好、入睡容易吗？' },
  { id: 'scale-4', type: 'balanced', question: '您适应环境变化、不易生病吗？' },
  // 气虚质
  { id: 'scale-5', type: 'qi-deficiency', question: '您容易疲乏、精神不振吗？' },
  { id: 'scale-6', type: 'qi-deficiency', question: '您说话声音低弱、气短懒言吗？' },
  { id: 'scale-7', type: 'qi-deficiency', question: '您稍微活动就容易出汗吗？' },
  { id: 'scale-8', type: 'qi-deficiency', question: '您容易感冒、抵抗力差吗？' },
  // 阳虚质
  { id: 'scale-9', type: 'yang-deficiency', question: '您比一般人怕冷、手足不温吗？' },
  { id: 'scale-10', type: 'yang-deficiency', question: '您吃凉食容易腹泻吗？' },
  { id: 'scale-11', type: 'yang-deficiency', question: '您精神不振、喜暖恶寒吗？' },
  { id: 'scale-12', type: 'yang-deficiency', question: '您腰膝酸软、夜尿频多吗？' },
  // 阴虚质
  { id: 'scale-13', type: 'yin-deficiency', question: '您手脚心发热、口燥咽干吗？' },
  { id: 'scale-14', type: 'yin-deficiency', question: '您容易失眠、盗汗吗？' },
  { id: 'scale-15', type: 'yin-deficiency', question: '您大便干结、小便短黄吗？' },
  { id: 'scale-16', type: 'yin-deficiency', question: '您面色潮红、眼干涩吗？' },
  // 痰湿质
  { id: 'scale-17', type: 'phlegm-dampness', question: '您形体肥胖、腹部肥满松软吗？' },
  { id: 'scale-18', type: 'phlegm-dampness', question: '您口中黏腻、痰多吗？' },
  { id: 'scale-19', type: 'phlegm-dampness', question: '您身体沉重、困倦嗜睡吗？' },
  { id: 'scale-20', type: 'phlegm-dampness', question: '您面部油脂分泌多吗？' },
  // 湿热质
  { id: 'scale-21', type: 'damp-heat', question: '您面部或鼻部油腻、易生痤疮吗？' },
  { id: 'scale-22', type: 'damp-heat', question: '您口苦口干、小便黄吗？' },
  { id: 'scale-23', type: 'damp-heat', question: '您大便黏滞不爽、肛门灼热吗？' },
  { id: 'scale-24', type: 'damp-heat', question: '您容易烦躁、身重困倦吗？' },
  // 血瘀质
  { id: 'scale-25', type: 'blood-stasis', question: '您面色晦暗、易现褐斑吗？' },
  { id: 'scale-26', type: 'blood-stasis', question: '您嘴唇颜色偏暗、舌质紫暗吗？' },
  { id: 'scale-27', type: 'blood-stasis', question: '您身体容易出现瘀青或刺痛吗？' },
  { id: 'scale-28', type: 'blood-stasis', question: '您眼眶暗黑、皮肤干燥粗糙吗？' },
  // 气郁质
  { id: 'scale-29', type: 'qi-stagnation', question: '您情绪低沉、闷闷不乐吗？' },
  { id: 'scale-30', type: 'qi-stagnation', question: '您容易紧张焦虑、多思多虑吗？' },
  { id: 'scale-31', type: 'qi-stagnation', question: '您胸胁胀满、叹气频作吗？' },
  { id: 'scale-32', type: 'qi-stagnation', question: '您咽喉有异物感、经前乳胀吗？' },
  // 特禀质
  { id: 'scale-33', type: 'allergic', question: '您容易过敏（花粉/食物/药物）吗？' },
  { id: 'scale-34', type: 'allergic', question: '您皮肤容易起风团、瘙痒吗？' },
  { id: 'scale-35', type: 'allergic', question: '您容易打喷嚏、流清涕吗？' },
  { id: 'scale-36', type: 'allergic', question: '您对季节变化或气味敏感吗？' },
]

/** 5 档量表选项（0-4） */
export const CONSTITUTION_SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '从不' },
  { value: 1, label: '偶尔' },
  { value: 2, label: '有时' },
  { value: 3, label: '经常' },
  { value: 4, label: '总是' },
]

/** 量表分析结果 */
export interface ConstitutionScaleResult {
  type: ConstitutionType
  label: string
  /** 各型 0-100 分（缺失时回退到 scores*100） */
  scaleScores?: Record<ConstitutionType, number>
  /** 各型 0-1 归一化 */
  scores: Record<ConstitutionType, number>
  characteristics: string[]
  recommendations: string[]
  analyzedAt: string
}

/**
 * 5 分量表体质分析。
 * 判定规则（官方）：平和质得分≥60 且其余各型均<40 → 平和质；否则取最高分型。
 */
export function analyzeConstitutionScale(answers: number[]): ConstitutionScaleResult {
  const scaleScores = {} as Record<ConstitutionType, number>
  for (const type of Object.keys(CONSTITUTION_META) as ConstitutionType[]) {
    let sum = 0
    for (const q of CONSTITUTION_SCALE_QUESTIONS) {
      if (q.type !== type) continue
      const raw = answers[CONSTITUTION_SCALE_QUESTIONS.indexOf(q)]
      const clamped = Math.max(0, Math.min(4, Number.isFinite(raw) ? raw : 0))
      sum += clamped
    }
    scaleScores[type] = Math.round((sum / 16) * 100)
  }

  const maxScore = Math.max(...Object.values(scaleScores), 0)
  const scores = {} as Record<ConstitutionType, number>
  for (const [k, v] of Object.entries(scaleScores)) {
    scores[k as ConstitutionType] = maxScore > 0 ? Math.round((v / maxScore) * 100) / 100 : 0
  }

  let type: ConstitutionType = 'balanced'
  if (maxScore > 0) {
    const others = (Object.keys(scaleScores) as ConstitutionType[]).filter((t) => t !== 'balanced')
    if (scaleScores.balanced >= 60 && others.every((t) => scaleScores[t] < 40)) {
      type = 'balanced'
    } else {
      let best: ConstitutionType = 'balanced'
      let bestScore = -1
      for (const t of Object.keys(scaleScores) as ConstitutionType[]) {
        if (scaleScores[t] > bestScore) {
          bestScore = scaleScores[t]
          best = t
        }
      }
      type = best
    }
  }

  const meta = CONSTITUTION_META[type]
  return {
    type,
    label: meta.label,
    scaleScores,
    scores,
    characteristics: meta.description.split('，'),
    recommendations: meta.advice.split('，'),
    analyzedAt: new Date().toISOString(),
  }
}

/** 雷达图数据：9 个维度，0-100 分，主体质标记 */
export function constitutionRadarData(
  result: ConstitutionScaleResult,
): { type: ConstitutionType; label: string; score: number; isPrimary: boolean }[] {
  const src =
    result.scaleScores ??
    (Object.fromEntries(
      Object.entries(result.scores).map(([k, v]) => [k, Math.round(v * 100)]),
    ) as Record<ConstitutionType, number>)
  return (Object.keys(CONSTITUTION_META) as ConstitutionType[]).map((t) => ({
    type: t,
    label: CONSTITUTION_META[t].label,
    score: src[t] ?? 0,
    isPrimary: t === result.type,
  }))
}

/** 画像摘要：主体质、偏颇程度、倾向排行与调理建议 */
export function constitutionPortrait(result: ConstitutionScaleResult): {
  primaryLabel: string
  primaryScore: number
  balanceDegree: string
  topTendencies: { type: ConstitutionType; score: number }[]
  advice: string[]
} {
  const src =
    result.scaleScores ??
    (Object.fromEntries(
      Object.entries(result.scores).map(([k, v]) => [k, Math.round(v * 100)]),
    ) as Record<ConstitutionType, number>)
  const primaryScore = src[result.type] ?? 0
  const balanceDegree =
    result.type === 'balanced' ? '平和' : primaryScore >= 60 ? '明显偏颇' : '轻度偏颇'
  const topTendencies = (Object.keys(src) as ConstitutionType[])
    .filter((t) => t !== 'balanced')
    .map((t) => ({ type: t, score: src[t] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  return {
    primaryLabel: result.label,
    primaryScore,
    balanceDegree,
    topTendencies,
    advice: result.recommendations,
  }
}

/**
 * 藏象阁体质分析
 */
export function useConstitutionAnalyzer() {
  const analysis = ref<ConstitutionAnalysis | null>(null)

  async function load(): Promise<void> {
    const saved = await storage.getKV<ConstitutionAnalysis | null>(BODY_WISDOM_STORAGE_KEYS.CONSTITUTION, null)
    analysis.value = saved || null
  }

  /**
   * 根据问卷回答分析体质
   * @param answers 每个问题的回答 (true=符合, false=不符合)
   */
  function analyzeFromAnswers(answers: boolean[]): ConstitutionAnalysis {
    const scores: Record<ConstitutionType, number> = {
      balanced: 0,
      'qi-deficiency': 0,
      'yang-deficiency': 0,
      'yin-deficiency': 0,
      'phlegm-dampness': 0,
      'damp-heat': 0,
      'blood-stasis': 0,
      'qi-stagnation': 0,
      allergic: 0,
    }

    // 统计各体质得分
    for (let i = 0; i < Math.min(answers.length, CONSTITUTION_QUESTIONS.length); i++) {
      if (answers[i]) {
        for (const constitution of CONSTITUTION_QUESTIONS[i].constitutions) {
          scores[constitution]++
        }
      }
    }

    // 归一化得分
    const maxScore = Math.max(...Object.values(scores), 1)
    const normalized: Record<ConstitutionType, number> = {} as Record<ConstitutionType, number>
    for (const [key, value] of Object.entries(scores)) {
      normalized[key as ConstitutionType] = Math.round((value / maxScore) * 100) / 100
    }

    // 确定主要体质
    let primaryType: ConstitutionType = 'balanced'
    let primaryScore = 0
    for (const [type, score] of Object.entries(scores)) {
      if (score > primaryScore) {
        primaryScore = score
        primaryType = type as ConstitutionType
      }
    }

    const meta = CONSTITUTION_META[primaryType]
    const result: ConstitutionAnalysis = {
      type: primaryType,
      label: meta.label,
      scores: normalized,
      characteristics: meta.description.split('，'),
      recommendations: meta.advice.split('，'),
      analyzedAt: new Date().toISOString(),
    }

    return result
  }

  /**
   * 保存体质分析结果
   */
  async function saveAnalysis(result: ConstitutionAnalysis): Promise<void> {
    analysis.value = result
    await storage.setKV(BODY_WISDOM_STORAGE_KEYS.CONSTITUTION, result)
  }

  /**
   * 计算当前五运六气
   */
  function calculateFiveMovementsSixQi(date?: Date): FiveMovementsSixQi {
    const d = date || new Date()
    const year = d.getFullYear()

    // 天干 = (year - 4) % 10
    const stemIndex = (year - 4) % 10
    const heavenlyStem = HEAVENLY_STEMS[stemIndex]

    // 地支 = (year - 4) % 12
    const branchIndex = (year - 4) % 12
    const earthlyBranch = EARTHLY_BRANCHES[branchIndex]

    // 大运
    const stemElement = HEAVENLY_STEM_ELEMENTS[heavenlyStem]

    // 司天/在泉（简化：根据地支推算）
    const celestialManagers: Record<string, string> = {
      '子': '少阴君火', '丑': '太阴湿土', '寅': '少阳相火',
      '卯': '阳明燥金', '辰': '太阳寒水', '巳': '厥阴风木',
      '午': '少阴君火', '未': '太阴湿土', '申': '少阳相火',
      '酉': '阳明燥金', '戌': '太阳寒水', '亥': '厥阴风木',
    }

    const terrestrialSprings: Record<string, string> = {
      '子': '阳明燥金', '丑': '太阳寒水', '寅': '厥阴风木',
      '卯': '少阴君火', '辰': '太阴湿土', '巳': '少阳相火',
      '午': '阳明燥金', '未': '太阳寒水', '申': '厥阴风木',
      '酉': '少阴君火', '戌': '太阴湿土', '亥': '少阳相火',
    }

    // 节气（简化：根据月份估算）
    const monthTerms = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪']
    const currentTerm = monthTerms[d.getMonth()]

    // 主气（根据月份）
    const hostQiByMonth = ['厥阴风木', '厥阴风木', '少阴君火', '少阴君火', '少阳相火', '少阳相火', '太阴湿土', '太阴湿土', '阳明燥金', '阳明燥金', '太阳寒水', '太阳寒水']
    const guestQiByMonth = ['少阳相火', '阳明燥金', '太阳寒水', '厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水', '厥阴风木', '少阴君火', '太阴湿土']

    return {
      heavenlyStem,
      earthlyBranch,
      greatMovement: stemElement,
      celestialManager: celestialManagers[earthlyBranch] || '未知',
      terrestrialSpring: terrestrialSprings[earthlyBranch] || '未知',
      hostQi: hostQiByMonth[d.getMonth()],
      guestQi: guestQiByMonth[d.getMonth()],
      currentTerm,
    }
  }

  /**
   * 根据体质和当前运气生成养生建议
   */
  function generateWellnessAdvice(
    constitution: ConstitutionAnalysis,
    fiveSix: FiveMovementsSixQi
  ): { daily: string[]; diet: string[]; activity: string[] } {
    const elementAdvice: Record<FiveElement, string[]> = {
      wood: ['舒展筋骨', '户外活动', '避免压抑情绪'],
      fire: ['保持心情平和', '避免过度兴奋', '适当午休'],
      earth: ['规律作息', '饮食定时', '避免思虑过度'],
      metal: ['深呼吸练习', '保持空气清新', '防燥保湿'],
      water: ['保暖防寒', '早睡晚起', '减少消耗'],
    }

    const daily = [
      ...(elementAdvice[fiveSix.greatMovement] || []),
      '顺应时辰作息',
    ]

    const diet = [...CONSTITUTION_META[constitution.type].advice.split('，')].slice(0, 3)

    const activity = [
      '每日适度运动30分钟',
      '保持心情愉悦',
      '定期记录身体感受',
    ]

    return { daily, diet, activity }
  }

  load()

  return {
    analysis,
    analyzeFromAnswers,
    saveAnalysis,
    calculateFiveMovementsSixQi,
    generateWellnessAdvice,
    load,
    // 导出问卷供 UI 使用
    CONSTITUTION_QUESTIONS,
  }
}

import { ref } from 'vue'