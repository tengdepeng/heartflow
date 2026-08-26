// ============================================================
// 工痕 · 叙事模板 + 共鸣算法 + 可视化数据
// 增强功能：
//   1. 叙事模板（预定义叙事框架+自定义模板）
//   2. 共鸣算法（相似伤痕匹配+共鸣度计算+社区共鸣）
//   3. 可视化数据（伤痕分布图+治愈进度图+成长曲线）
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { BodyMark, BodyPart, ScarType, HealingStage } from './types'

// ---- 叙事模板 ----

/** 叙事模板类型 */
export type NarrativeTemplateType = 'hero-journey' | 'phoenix' | 'alchemy' | 'kintsugi' | 'tree-growth' | 'river' | 'custom'

/** 叙事阶段 */
export interface NarrativeStage {
  /** 阶段序号 */
  order: number
  /** 阶段名称 */
  name: string
  /** 阶段描述 */
  description: string
  /** 阶段提示问题 */
  prompts: string[]
  /** 阶段情绪基调 */
  emotion: 'pain' | 'struggle' | 'acceptance' | 'growth' | 'peace'
  /** 建议字数 */
  suggestedWords: number
}

/** 叙事模板 */
export interface NarrativeTemplate {
  id: string
  type: NarrativeTemplateType
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 模板图标 */
  icon: string
  /** 叙事阶段 */
  stages: NarrativeStage[]
  /** 是否为预设模板 */
  preset: boolean
  /** 创建时间 */
  createdAt: string
}

/** 叙事草稿 */
export interface NarrativeDraft {
  id: string
  templateId: string
  /** 关联的伤痕 ID 列表 */
  scarIds: string[]
  /** 当前阶段 */
  currentStage: number
  /** 各阶段内容 */
  stageContents: Record<number, string>
  /** 是否已完成 */
  completed: boolean
  /** 创建时间 */
  createdAt: string
  /** 最后更新时间 */
  updatedAt: string
  /** 完成时间 */
  completedAt?: string
}

/** 叙事模板元数据 */
export const NARRATIVE_TEMPLATE_META: Record<NarrativeTemplateType, { label: string; icon: string; color: string }> = {
  'hero-journey': { label: '英雄之旅', icon: '⚔️', color: '#f0c040' },
  'phoenix': { label: '凤凰涅槃', icon: '🔥', color: '#ef4444' },
  'alchemy': { label: '炼金术', icon: '⚗️', color: '#b5707a' },
  'kintsugi': { label: '金缮', icon: '🏺', color: '#f59e0b' },
  'tree-growth': { label: '树木生长', icon: '🌳', color: '#34d399' },
  'river': { label: '河流', icon: '🌊', color: '#6b9fc4' },
  'custom': { label: '自定义', icon: '✏️', color: '#94a3b8' },
}

/** 预设叙事模板 */
const PRESET_TEMPLATES: Omit<NarrativeTemplate, 'id' | 'createdAt'>[] = [
  {
    type: 'hero-journey',
    name: '英雄之旅',
    description: '以英雄的旅程为框架，从平凡世界出发，经历试炼，最终带着礼物回归',
    icon: '⚔️',
    preset: true,
    stages: [
      {
        order: 1,
        name: '平凡世界',
        description: '描述伤痕发生前的生活状态',
        prompts: ['当时的生活是怎样的？', '你处于什么样的状态？', '有什么让你感到安心的事物？'],
        emotion: 'peace',
        suggestedWords: 150,
      },
      {
        order: 2,
        name: '冒险召唤',
        description: '伤痕事件的到来',
        prompts: ['发生了什么？', '你的第一反应是什么？', '这件事如何打破了你原有的生活？'],
        emotion: 'pain',
        suggestedWords: 200,
      },
      {
        order: 3,
        name: '试炼之路',
        description: '面对伤痕的过程',
        prompts: ['你经历了什么样的困难？', '谁帮助了你？', '你学到了什么？'],
        emotion: 'struggle',
        suggestedWords: 250,
      },
      {
        order: 4,
        name: '最深洞穴',
        description: '最艰难的时刻',
        prompts: ['最黑暗的时刻是什么？', '你如何度过的？', '是什么支撑了你？'],
        emotion: 'pain',
        suggestedWords: 200,
      },
      {
        order: 5,
        name: '带着礼物回归',
        description: '从经历中获得的成长',
        prompts: ['你获得了什么新的能力或认知？', '你如何帮助他人？', '这段经历如何改变了你？'],
        emotion: 'growth',
        suggestedWords: 250,
      },
    ],
  },
  {
    type: 'phoenix',
    name: '凤凰涅槃',
    description: '以凤凰从灰烬中重生为隐喻，强调毁灭后的新生',
    icon: '🔥',
    preset: true,
    stages: [
      {
        order: 1,
        name: '燃烧',
        description: '伤痕带来的冲击与痛苦',
        prompts: ['你感受到了什么样的痛苦？', '哪些东西被摧毁了？', '你失去了什么？'],
        emotion: 'pain',
        suggestedWords: 200,
      },
      {
        order: 2,
        name: '灰烬',
        description: '低谷与沉淀',
        prompts: ['在低谷中，你思考了什么？', '什么是你选择保留的？', '什么是你决定放下的？'],
        emotion: 'struggle',
        suggestedWords: 200,
      },
      {
        order: 3,
        name: '孕育',
        description: '新生的准备',
        prompts: ['新的力量从哪里萌芽？', '你发现了哪些以前没有的韧性？', '你如何重新定义自己？'],
        emotion: 'acceptance',
        suggestedWords: 200,
      },
      {
        order: 4,
        name: '重生',
        description: '蜕变后的新生',
        prompts: ['你变成了什么样的人？', '你的新方向是什么？', '你如何庆祝这次重生？'],
        emotion: 'growth',
        suggestedWords: 250,
      },
    ],
  },
  {
    type: 'alchemy',
    name: '炼金术',
    description: '将铅转化为金，将痛苦转化为智慧的过程',
    icon: '⚗️',
    preset: true,
    stages: [
      {
        order: 1,
        name: '黑化',
        description: '面对原始的痛苦与混乱',
        prompts: ['最原始的伤痛是什么？', '你如何面对它？', '有什么是你不愿意承认的？'],
        emotion: 'pain',
        suggestedWords: 200,
      },
      {
        order: 2,
        name: '白化',
        description: '净化与澄清',
        prompts: ['你逐渐看清了什么？', '哪些情绪被释放了？', '你找到了什么新的理解？'],
        emotion: 'struggle',
        suggestedWords: 200,
      },
      {
        order: 3,
        name: '黄化',
        description: '智慧的结晶',
        prompts: ['你提炼出了什么智慧？', '这段经历给你的礼物是什么？', '你如何将痛苦转化为力量？'],
        emotion: 'acceptance',
        suggestedWords: 200,
      },
      {
        order: 4,
        name: '红化',
        description: '完整的整合',
        prompts: ['你如何将这段经历整合进你的生命？', '你如何用这份智慧帮助他人？', '你的内在发生了怎样的变化？'],
        emotion: 'growth',
        suggestedWords: 250,
      },
    ],
  },
  {
    type: 'kintsugi',
    name: '金缮',
    description: '以金缮修复的隐喻，将裂痕变成独特的美丽',
    icon: '🏺',
    preset: true,
    stages: [
      {
        order: 1,
        name: '破碎',
        description: '承认伤痕的存在',
        prompts: ['哪些部分碎裂了？', '你如何看待这些裂痕？', '你害怕什么？'],
        emotion: 'pain',
        suggestedWords: 150,
      },
      {
        order: 2,
        name: '收集',
        description: '整理碎片',
        prompts: ['哪些碎片是你想保留的？', '哪些是你想舍弃的？', '你如何重新审视这些碎片？'],
        emotion: 'struggle',
        suggestedWords: 200,
      },
      {
        order: 3,
        name: '金缮',
        description: '用金粉修复裂痕',
        prompts: ['你用什么"金粉"来修复？', '修复后的你与之前有何不同？', '裂痕如何变成了独特的美丽？'],
        emotion: 'acceptance',
        suggestedWords: 200,
      },
      {
        order: 4,
        name: '展示',
        description: '展示独特的美丽',
        prompts: ['你如何向他人展示你的故事？', '你的独特之处是什么？', '你如何帮助他人看到自己的美丽？'],
        emotion: 'growth',
        suggestedWords: 200,
      },
    ],
  },
  {
    type: 'tree-growth',
    name: '树木生长',
    description: '以树木的生长为隐喻，伤痕是年轮的一部分',
    icon: '🌳',
    preset: true,
    stages: [
      {
        order: 1,
        name: '种子',
        description: '伤痕的初始',
        prompts: ['伤痕的种子是什么时候种下的？', '你当时的状态如何？', '你感受到了什么？'],
        emotion: 'pain',
        suggestedWords: 150,
      },
      {
        order: 2,
        name: '扎根',
        description: '深入处理伤痕',
        prompts: ['你如何扎根于这段经历？', '你从中学到了什么？', '你的根系（支持系统）是什么？'],
        emotion: 'struggle',
        suggestedWords: 200,
      },
      {
        order: 3,
        name: '生长',
        description: '从伤痕中成长',
        prompts: ['你如何向上生长？', '新的枝叶（能力）是什么？', '你如何为他人提供阴凉？'],
        emotion: 'acceptance',
        suggestedWords: 200,
      },
      {
        order: 4,
        name: '年轮',
        description: '伤痕成为生命的一部分',
        prompts: ['这道年轮如何定义了你的树？', '你如何回望这段经历？', '你如何帮助其他树木生长？'],
        emotion: 'growth',
        suggestedWords: 200,
      },
      {
        order: 5,
        name: '森林',
        description: '与其他树木的连接',
        prompts: ['你如何与其他有类似经历的人连接？', '你如何成为森林的一部分？', '你的故事如何滋养他人？'],
        emotion: 'peace',
        suggestedWords: 200,
      },
    ],
  },
  {
    type: 'river',
    name: '河流',
    description: '以河流的流动为隐喻，伤痛是河道中的岩石',
    icon: '🌊',
    preset: true,
    stages: [
      {
        order: 1,
        name: '源头',
        description: '伤痕的起源',
        prompts: ['这条河从哪里开始？', '什么事件触发了流动？', '你的初始状态是怎样的？'],
        emotion: 'pain',
        suggestedWords: 150,
      },
      {
        order: 2,
        name: '急流',
        description: '面对伤痕的激烈阶段',
        prompts: ['水流最湍急的时候是什么样子？', '你如何应对冲击？', '有什么被冲刷掉了？'],
        emotion: 'struggle',
        suggestedWords: 200,
      },
      {
        order: 3,
        name: '岩石',
        description: '伤痕形成的障碍',
        prompts: ['河中的岩石（障碍）是什么？', '水流如何绕过岩石？', '你从绕行中学到了什么？'],
        emotion: 'acceptance',
        suggestedWords: 200,
      },
      {
        order: 4,
        name: '汇流',
        description: '与其他河流的汇聚',
        prompts: ['你遇到了哪些同路人？', '他们的故事如何影响了你的流向？', '你如何帮助他人穿越他们的急流？'],
        emotion: 'growth',
        suggestedWords: 200,
      },
      {
        order: 5,
        name: '入海',
        description: '最终的平静与广阔',
        prompts: ['你如何到达了平静？', '你的河流汇入了怎样的大海？', '你如何回望整条河流的旅程？'],
        emotion: 'peace',
        suggestedWords: 200,
      },
    ],
  },
]

/** 叙事模板存储键 */
const NARRATIVE_KEYS = {
  TEMPLATES: 'hf:scar_narrative_templates',
  DRAFTS: 'hf:scar_narrative_drafts',
  RESONANCE: 'hf:scar_resonance',
} as const

// ---- 叙事模板管理 ----

export function useNarrativeTemplate() {
  const templates = ref<NarrativeTemplate[]>([])
  const drafts = ref<NarrativeDraft[]>([])

  function loadAll(): void {
    const stored = storage.getKV<NarrativeTemplate[]>(NARRATIVE_KEYS.TEMPLATES, [])
    if (stored && stored.length > 0) {
      templates.value = stored
    } else {
      // 初始化预设模板
      templates.value = PRESET_TEMPLATES.map(t => ({
        ...t,
        id: `narrative-template-${t.type}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }))
      saveTemplates()
    }
    drafts.value = storage.getKV<NarrativeDraft[]>(NARRATIVE_KEYS.DRAFTS, []) || []
  }

  function saveTemplates(): void {
    storage.setKV(NARRATIVE_KEYS.TEMPLATES, templates.value)
  }

  function saveDrafts(): void {
    storage.setKV(NARRATIVE_KEYS.DRAFTS, drafts.value)
  }

  /** 获取所有预设模板 */
  function getPresetTemplates(): NarrativeTemplate[] {
    return templates.value.filter(t => t.preset)
  }

  /** 获取自定义模板 */
  function getCustomTemplates(): NarrativeTemplate[] {
    return templates.value.filter(t => !t.preset)
  }

  /** 创建自定义模板 */
  function createCustomTemplate(
    name: string,
    description: string,
    stages: Omit<NarrativeStage, 'order'>[],
  ): NarrativeTemplate {
    const template: NarrativeTemplate = {
      id: `narrative-template-custom-${Date.now()}`,
      type: 'custom',
      name,
      description,
      icon: '✏️',
      preset: false,
      stages: stages.map((s, i) => ({ ...s, order: i + 1 })),
      createdAt: new Date().toISOString(),
    }
    templates.value.push(template)
    saveTemplates()
    return template
  }

  /** 删除自定义模板 */
  function deleteCustomTemplate(templateId: string): boolean {
    const idx = templates.value.findIndex(t => t.id === templateId && !t.preset)
    if (idx < 0) return false
    templates.value.splice(idx, 1)
    saveTemplates()
    return true
  }

  /** 根据模板创建草稿 */
  function createDraft(
    templateId: string,
    scarIds: string[],
  ): NarrativeDraft | null {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return null

    const draft: NarrativeDraft = {
      id: `narrative-draft-${Date.now()}`,
      templateId,
      scarIds,
      currentStage: 1,
      stageContents: {},
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    drafts.value.push(draft)
    saveDrafts()
    return draft
  }

  /** 更新草稿阶段内容 */
  function updateDraftStage(
    draftId: string,
    stageOrder: number,
    content: string,
  ): boolean {
    const draft = drafts.value.find(d => d.id === draftId)
    if (!draft) return false
    draft.stageContents[stageOrder] = content
    draft.updatedAt = new Date().toISOString()
    saveDrafts()
    return true
  }

  /** 推进草稿阶段 */
  function advanceStage(draftId: string): boolean {
    const draft = drafts.value.find(d => d.id === draftId)
    if (!draft) return false
    const template = templates.value.find(t => t.id === draft.templateId)
    if (!template) return false

    const maxStage = template.stages.length
    if (draft.currentStage < maxStage) {
      draft.currentStage++
      draft.updatedAt = new Date().toISOString()
    }
    if (draft.currentStage >= maxStage) {
      draft.completed = true
      draft.completedAt = new Date().toISOString()
    }
    saveDrafts()
    return true
  }

  /** 获取草稿完成进度 */
  function getDraftProgress(draftId: string): number {
    const draft = drafts.value.find(d => d.id === draftId)
    if (!draft) return 0
    const template = templates.value.find(t => t.id === draft.templateId)
    if (!template) return 0

    const filledStages = template.stages.filter(
      s => draft.stageContents[s.order] && draft.stageContents[s.order].trim().length > 0,
    ).length
    return Math.round((filledStages / template.stages.length) * 100)
  }

  return {
    templates,
    drafts,
    loadAll,
    getPresetTemplates,
    getCustomTemplates,
    createCustomTemplate,
    deleteCustomTemplate,
    createDraft,
    updateDraftStage,
    advanceStage,
    getDraftProgress,
  }
}

// ---- 共鸣算法 ----

/** 共鸣匹配结果 */
export interface ResonanceMatch {
  /** 匹配的伤痕 */
  scar: BodyMark
  /** 共鸣度 0-100 */
  resonanceScore: number
  /** 共鸣维度 */
  dimensions: {
    /** 部位相似度 */
    bodyPartSimilarity: number
    /** 类型相似度 */
    typeSimilarity: number
    /** 严重度相似度 */
    severitySimilarity: number
    /** 阶段相似度 */
    stageSimilarity: number
  }
  /** 共鸣描述 */
  description: string
}

/** 社区共鸣记录 */
export interface CommunityResonance {
  id: string
  /** 分享者伤痕 ID */
  sharerScarId: string
  /** 共鸣者伤痕 ID */
  resonatorScarId: string
  /** 共鸣度 */
  score: number
  /** 共鸣留言 */
  message?: string
  /** 时间 */
  createdAt: string
}

/** 共鸣统计 */
export interface ResonanceStats {
  /** 总共鸣次数 */
  totalResonances: number
  /** 最高共鸣度 */
  maxResonanceScore: number
  /** 平均共鸣度 */
  avgResonanceScore: number
  /** 共鸣最多的部位 */
  mostResonatedPart: BodyPart | null
  /** 共鸣最多的类型 */
  mostResonatedType: ScarType | null
}

/** 相似度权重配置 */
const RESONANCE_WEIGHTS = {
  bodyPart: 0.25,
  scarType: 0.20,
  severity: 0.25,
  stage: 0.30,
}

export function useResonanceAlgorithm() {
  const communityResonances = ref<CommunityResonance[]>([])

  function loadResonances(): void {
    communityResonances.value = storage.getKV<CommunityResonance[]>(NARRATIVE_KEYS.RESONANCE, []) || []
  }

  function saveResonances(): void {
    storage.setKV(NARRATIVE_KEYS.RESONANCE, communityResonances.value)
  }

  /** 计算两个伤痕之间的共鸣度 */
  function calculateResonance(
    source: BodyMark,
    target: BodyMark,
  ): ResonanceMatch {
    // 部位相似度：同一部位得满分，相邻部位得部分分
    const bodyPartSimilarity = source.bodyPart === target.bodyPart ? 1.0 : 0.3

    // 类型相似度：同一类型得满分
    const typeSimilarity = source.scarType === target.scarType ? 1.0 : 0.2

    // 严重度相似度：按差距计算
    const severityDiff = Math.abs(source.severity - target.severity)
    const severitySimilarity = 1.0 - (severityDiff / 4) * 0.8 // 最大差距得 0.2

    // 阶段相似度：相同阶段 1.0，相邻阶段 0.6，相隔 0.3
    const stageOrder: HealingStage[] = ['acute', 'proliferation', 'remodeling', 'matured']
    const sourceStageIdx = stageOrder.indexOf(source.healingStage)
    const targetStageIdx = stageOrder.indexOf(target.healingStage)
    const stageDiff = Math.abs(sourceStageIdx - targetStageIdx)
    const stageSimilarity = stageDiff === 0 ? 1.0 : stageDiff === 1 ? 0.6 : 0.3

    // 加权计算
    const score = Math.round(
      (bodyPartSimilarity * RESONANCE_WEIGHTS.bodyPart +
       typeSimilarity * RESONANCE_WEIGHTS.scarType +
       severitySimilarity * RESONANCE_WEIGHTS.severity +
       stageSimilarity * RESONANCE_WEIGHTS.stage) * 100,
    )

    // 生成描述
    const description = generateResonanceDescription(score, source, target)

    return {
      scar: target,
      resonanceScore: score,
      dimensions: {
        bodyPartSimilarity: Math.round(bodyPartSimilarity * 100),
        typeSimilarity: Math.round(typeSimilarity * 100),
        severitySimilarity: Math.round(severitySimilarity * 100),
        stageSimilarity: Math.round(stageSimilarity * 100),
      },
      description,
    }
  }

  /** 在伤痕列表中查找共鸣匹配 */
  function findResonanceMatches(
    source: BodyMark,
    pool: BodyMark[],
    minScore: number = 30,
    maxResults: number = 10,
  ): ResonanceMatch[] {
    // 排除自身
    const candidates = pool.filter(s => s.id !== source.id)

    return candidates
      .map(target => calculateResonance(source, target))
      .filter(match => match.resonanceScore >= minScore)
      .sort((a, b) => b.resonanceScore - a.resonanceScore)
      .slice(0, maxResults)
  }

  /** 创建社区共鸣 */
  function createCommunityResonance(
    sharerScarId: string,
    resonatorScarId: string,
    message?: string,
  ): CommunityResonance {
    // 计算共鸣度（需要伤痕数据，这里由调用方传入 score）
    const resonance: CommunityResonance = {
      id: `community-resonance-${Date.now()}`,
      sharerScarId,
      resonatorScarId,
      score: 0, // 由调用方设置
      message,
      createdAt: new Date().toISOString(),
    }
    communityResonances.value.push(resonance)
    saveResonances()
    return resonance
  }

  /** 计算共鸣统计 */
  function computeResonanceStats(scars: BodyMark[]): ResonanceStats {
    const resonances = communityResonances.value

    if (resonances.length === 0) {
      return {
        totalResonances: 0,
        maxResonanceScore: 0,
        avgResonanceScore: 0,
        mostResonatedPart: null,
        mostResonatedType: null,
      }
    }

    const scores = resonances.map(r => r.score)
    const maxScore = Math.max(...scores)
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

    // 统计部位
    const partCount = new Map<BodyPart, number>()
    resonances.forEach(r => {
      const scar = scars.find(s => s.id === r.sharerScarId)
      if (scar) {
        partCount.set(scar.bodyPart, (partCount.get(scar.bodyPart) || 0) + 1)
      }
    })
    let mostPart: BodyPart | null = null
    let maxPartCount = 0
    partCount.forEach((count, part) => {
      if (count > maxPartCount) {
        maxPartCount = count
        mostPart = part
      }
    })

    // 统计类型
    const typeCount = new Map<ScarType, number>()
    resonances.forEach(r => {
      const scar = scars.find(s => s.id === r.sharerScarId)
      if (scar) {
        typeCount.set(scar.scarType, (typeCount.get(scar.scarType) || 0) + 1)
      }
    })
    let mostType: ScarType | null = null
    let maxTypeCount = 0
    typeCount.forEach((count, type) => {
      if (count > maxTypeCount) {
        maxTypeCount = count
        mostType = type
      }
    })

    return {
      totalResonances: resonances.length,
      maxResonanceScore: maxScore,
      avgResonanceScore: avgScore,
      mostResonatedPart: mostPart,
      mostResonatedType: mostType,
    }
  }

  return {
    communityResonances,
    loadResonances,
    calculateResonance,
    findResonanceMatches,
    createCommunityResonance,
    computeResonanceStats,
  }
}

/** 生成共鸣描述 */
function generateResonanceDescription(
  score: number,
  source: BodyMark,
  target: BodyMark,
): string {
  if (score >= 80) {
    return `高度共鸣：你与这位分享者在${source.bodyPart === target.bodyPart ? '相同的部位' : '相似的位置'}经历了相似类型的伤痕，你们的故事有着深刻的共鸣。`
  }
  if (score >= 60) {
    return `中度共鸣：你们在伤痕的类型和阶段上有相似之处，这段经历或许能给你带来启发。`
  }
  if (score >= 40) {
    return `轻度共鸣：虽然情况不尽相同，但你们的伤痕有某些共通之处。`
  }
  return `你们的伤痕经历差异较大，但每段经历都值得被倾听。`
}

// ---- 可视化数据 ----

/** 可视化类型 */
export type VisualizationType = 'body-map' | 'healing-timeline' | 'growth-curve' | 'type-distribution' | 'severity-radar'

/** 伤痕分布节点 */
export interface ScarMapNode {
  /** 身体部位 */
  bodyPart: BodyPart
  /** 伤痕计数 */
  count: number
  /** 平均严重度 */
  avgSeverity: number
  /** 平均愈合进度 */
  avgHealingProgress: number
  /** 最近一次伤痕 */
  latestScarAt: string
  /** 伤痕 ID 列表 */
  scarIds: string[]
  /** 位置坐标 */
  x: number
  y: number
}

/** 愈合时间线节点 */
export interface HealingTimelineNode {
  /** 日期 */
  date: string
  /** 愈合进度 */
  healingProgress: number
  /** 伤痕 ID */
  scarId: string
  /** 事件标签 */
  label: string
}

/** 成长曲线节点 */
export interface GrowthCurveNode {
  /** 日期 */
  date: string
  /** 逆商分数 */
  adversityScore: number
  /** 成长心得数 */
  insightCount: number
  /** 转化数 */
  transformationCount: number
}

/** 类型分布数据 */
export interface TypeDistributionData {
  type: ScarType
  label: string
  count: number
  percentage: number
  color: string
  avgHealingTime: number // 天
}

/** 严重度雷达数据 */
export interface SeverityRadarData {
  axis: string
  value: number
  max: number
}

/** 可视化数据集合 */
export interface ScarVisualizationData {
  /** 伤痕分布图 */
  bodyMap: ScarMapNode[]
  /** 愈合时间线 */
  healingTimeline: HealingTimelineNode[]
  /** 成长曲线 */
  growthCurve: GrowthCurveNode[]
  /** 类型分布 */
  typeDistribution: TypeDistributionData[]
  /** 严重度雷达 */
  severityRadar: SeverityRadarData[]
}

/** 身体部位坐标映射（用于可视化） */
const BODY_PART_COORDINATES: Record<BodyPart, { x: number; y: number }> = {
  head: { x: 50, y: 8 },
  neck: { x: 50, y: 18 },
  shoulder: { x: 50, y: 25 },
  chest: { x: 50, y: 35 },
  back: { x: 50, y: 40 },
  arm: { x: 25, y: 35 },
  hand: { x: 15, y: 55 },
  waist: { x: 50, y: 55 },
  leg: { x: 50, y: 70 },
  foot: { x: 50, y: 92 },
  eye: { x: 50, y: 5 },
}

export function useScarVisualization() {
  const visualizationData = ref<ScarVisualizationData | null>(null)

  /** 从伤痕列表生成可视化数据 */
  function generateVisualizationData(scars: BodyMark[]): ScarVisualizationData {
    const now = new Date()

    // 1. 伤痕分布图
    const bodyMap = buildBodyMap(scars)

    // 2. 愈合时间线
    const healingTimeline = buildHealingTimeline(scars)

    // 3. 成长曲线
    const growthCurve = buildGrowthCurve(scars, now)

    // 4. 类型分布
    const typeDistribution = buildTypeDistribution(scars)

    // 5. 严重度雷达
    const severityRadar = buildSeverityRadar(scars)

    const data: ScarVisualizationData = {
      bodyMap,
      healingTimeline,
      growthCurve,
      typeDistribution,
      severityRadar,
    }

    visualizationData.value = data
    return data
  }

  /** 构建伤痕分布图 */
  function buildBodyMap(scars: BodyMark[]): ScarMapNode[] {
    const partMap = new Map<BodyPart, BodyMark[]>()

    scars.forEach(s => {
      if (!partMap.has(s.bodyPart)) {
        partMap.set(s.bodyPart, [])
      }
      partMap.get(s.bodyPart)!.push(s)
    })

    const nodes: ScarMapNode[] = []
    partMap.forEach((marks, bodyPart) => {
      const coords = BODY_PART_COORDINATES[bodyPart]
      const severities = marks.map(m => m.severity)
      const progresses = marks.map(m => m.healingProgress)
      const latest = marks.reduce((latest, m) =>
        new Date(m.recordedAt) > new Date(latest.recordedAt) ? m : latest,
      )

      nodes.push({
        bodyPart,
        count: marks.length,
        avgSeverity: Math.round(severities.reduce((a, b) => a + b, 0) / severities.length * 10) / 10,
        avgHealingProgress: Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length),
        latestScarAt: latest.recordedAt,
        scarIds: marks.map(m => m.id),
        x: coords.x,
        y: coords.y,
      })
    })

    return nodes.sort((a, b) => b.count - a.count)
  }

  /** 构建愈合时间线 */
  function buildHealingTimeline(scars: BodyMark[]): HealingTimelineNode[] {
    const nodes: HealingTimelineNode[] = []

    scars
      .filter(s => s.healingProgress < 100)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .forEach(s => {
        nodes.push({
          date: s.recordedAt.split('T')[0],
          healingProgress: s.healingProgress,
          scarId: s.id,
          label: `${s.description.slice(0, 20)}...`,
        })
      })

    return nodes
  }

  /** 构建成长曲线 */
  function buildGrowthCurve(scars: BodyMark[], _now: Date): GrowthCurveNode[] {
    const nodes: GrowthCurveNode[] = []

    // 按季度分组
    const quarters = new Map<string, BodyMark[]>()
    scars.forEach(s => {
      const d = new Date(s.recordedAt)
      const quarter = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
      if (!quarters.has(quarter)) quarters.set(quarter, [])
      quarters.get(quarter)!.push(s)
    })

    // 按时间排序
    const sortedQuarters = [...quarters.entries()].sort(([a], [b]) => a.localeCompare(b))

    sortedQuarters.forEach(([quarter, quarterScars]) => {
      const avgSeverity = quarterScars.reduce((sum, s) => sum + s.severity, 0) / quarterScars.length
      const transformedCount = quarterScars.filter(s => s.transformed).length
      const insightCount = quarterScars.filter(s => s.growthInsight).length

      nodes.push({
        date: quarter,
        adversityScore: Math.round(avgSeverity * 20), // 1-5 → 0-100
        insightCount,
        transformationCount: transformedCount,
      })
    })

    return nodes
  }

  /** 构建类型分布 */
  function buildTypeDistribution(scars: BodyMark[]): TypeDistributionData[] {
    const typeMap = new Map<ScarType, BodyMark[]>()

    scars.forEach(s => {
      if (!typeMap.has(s.scarType)) typeMap.set(s.scarType, [])
      typeMap.get(s.scarType)!.push(s)
    })

    const total = scars.length
    const data: TypeDistributionData[] = []

    typeMap.forEach((marks, type) => {
      const healingTimes = marks.map(m => {
        const recorded = new Date(m.recordedAt)
        const now = new Date()
        return Math.floor((now.getTime() - recorded.getTime()) / 86400000)
      })

      const scarTypeMeta = {
        impact: { label: '撞击', color: '#ef4444' },
        cut: { label: '割裂', color: '#f59e0b' },
        burn: { label: '灼烧', color: '#d98c7a' },
        wear: { label: '磨损', color: '#6b9fc4' },
      }

      data.push({
        type,
        label: scarTypeMeta[type].label,
        count: marks.length,
        percentage: Math.round((marks.length / total) * 100),
        color: scarTypeMeta[type].color,
        avgHealingTime: Math.round(healingTimes.reduce((a, b) => a + b, 0) / healingTimes.length),
      })
    })

    return data.sort((a, b) => b.count - a.count)
  }

  /** 构建严重度雷达 */
  function buildSeverityRadar(scars: BodyMark[]): SeverityRadarData[] {
    const severities = scars.map(s => s.severity)
    const avgSeverity = severities.length > 0
      ? severities.reduce((a, b) => a + b, 0) / severities.length
      : 0
    const maxSeverity = severities.length > 0 ? Math.max(...severities) : 0
    const healingRate = scars.length > 0
      ? scars.reduce((sum, s) => sum + s.healingProgress, 0) / scars.length
      : 0
    const transformationRate = scars.length > 0
      ? (scars.filter(s => s.transformed).length / scars.length) * 100
      : 0
    const resilienceIndex = healingRate * 0.5 + (100 - avgSeverity * 20) * 0.3 + transformationRate * 0.2

    return [
      { axis: '平均严重度', value: Math.round(avgSeverity * 10) / 10, max: 5 },
      { axis: '最高严重度', value: maxSeverity, max: 5 },
      { axis: '愈合率', value: Math.round(healingRate), max: 100 },
      { axis: '转化率', value: Math.round(transformationRate), max: 100 },
      { axis: '韧性指数', value: Math.round(resilienceIndex), max: 100 },
    ]
  }

  /** 获取单个伤痕的愈合阶段天数 */
  function getHealingDays(scar: BodyMark): number {
    const recorded = new Date(scar.recordedAt)
    const now = new Date()
    return Math.floor((now.getTime() - recorded.getTime()) / 86400000)
  }

  /** 预测完全愈合日期 */
  function predictHealingDate(scar: BodyMark): string | null {
    if (scar.healingProgress >= 100) return null

    const recorded = new Date(scar.recordedAt)
    const now = new Date()
    const daysSinceRecorded = Math.floor((now.getTime() - recorded.getTime()) / 86400000)

    if (daysSinceRecorded <= 0) return null

    // 基于当前进度推算
    const dailyProgress = scar.healingProgress / daysSinceRecorded
    const remainingProgress = 100 - scar.healingProgress
    const remainingDays = Math.ceil(remainingProgress / dailyProgress)

    const predictedDate = new Date(now)
    predictedDate.setDate(predictedDate.getDate() + remainingDays)
    return predictedDate.toISOString().split('T')[0]
  }

  return {
    visualizationData,
    generateVisualizationData,
    buildBodyMap,
    buildHealingTimeline,
    buildGrowthCurve,
    buildTypeDistribution,
    buildSeverityRadar,
    getHealingDays,
    predictHealingDate,
  }
}