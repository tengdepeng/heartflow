// ============================================================
// 字镜阁 · 个性化词库管理（P18-5）
// 学习路径 + 进度追踪 + 自适应推荐 + 词汇画像
// ============================================================

import type { WordEntry, ProficiencyLevel } from './types'
import { PROFICIENCY_META } from './types'
import { getLocalDateKey } from '@/utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 学习路径 */
export interface LearningPath {
  id: string
  name: string
  description: string
  /** 路径阶段 */
  stages: LearningStage[]
  /** 目标词汇数 */
  targetCount: number
  /** 当前进度 0-1 */
  progress: number
  /** 难度 1-5 */
  difficulty: number
}

/** 学习阶段 */
export interface LearningStage {
  name: string
  description: string
  /** 词汇数量 */
  wordCount: number
  /** 已完成数量 */
  completed: number
  /** 阶段状态 */
  status: 'locked' | 'available' | 'in_progress' | 'completed'
}

/** 词汇画像 */
export interface VocabularyProfile {
  /** 总词汇量 */
  totalWords: number
  /** 熟练度分布 */
  proficiencyDistribution: Record<ProficiencyLevel, number>
  /** 平均熟练度 */
  avgProficiency: number
  /** 最常使用的词性 */
  dominantPos: string
  /** 词性分布 */
  posDistribution: Record<string, number>
  /** 标签云 */
  topTags: { tag: string; count: number }[]
  /** 学习趋势 */
  learningTrend: { label: string; value: number }[]
  /** 优势领域 */
  strengths: string[]
  /** 待提升领域 */
  weaknesses: string[]
  /** 下次复习建议 */
  nextReviewSuggestions: WordEntry[]
}

/** 学习进度 */
export interface LearningProgress {
  /** 今日已复习 */
  reviewedToday: number
  /** 今日目标 */
  dailyGoal: number
  /** 本周复习 */
  reviewedThisWeek: number
  /** 连续学习天数 */
  streak: number
  /** 学习曲线数据 */
  curve: { date: string; newWords: number; reviewed: number; mastered: number }[]
}

/** 自适应推荐 */
export interface AdaptiveRecommendation {
  /** 推荐词汇列表 */
  words: WordEntry[]
  /** 推荐理由 */
  reason: string
  /** 推荐优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 推荐类型 */
  type: 'review' | 'new' | 'challenge' | 'reinforce'
}

/** 词库配置 */
export interface VocabularyConfig {
  /** 每日新词目标 */
  dailyNewWords: number
  /** 每日复习目标 */
  dailyReviewGoal: number
  /** 熟练度阈值（达到此级别视为掌握） */
  masteryThreshold: ProficiencyLevel
  /** 最大词库大小 */
  maxVocabularySize: number
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: VocabularyConfig = {
  dailyNewWords: 5,
  dailyReviewGoal: 20,
  masteryThreshold: 4,
  maxVocabularySize: 500,
}

// ============================================================
// 预设学习路径
// ============================================================

export const PRESET_LEARNING_PATHS: Omit<LearningPath, 'progress'>[] = [
  {
    id: 'path_basic',
    name: '基础词汇之路',
    description: '从最常见的基础词汇开始，建立扎实的词汇基础',
    stages: [
      { name: '日常用语', description: '生活中最常用的 50 个词汇', wordCount: 50, completed: 0, status: 'available' },
      { name: '情感表达', description: '描述情绪和感受的词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '自然万物', description: '与自然相关的词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '人际关系', description: '描述人际关系的词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '抽象概念', description: '哲学与抽象思维词汇', wordCount: 30, completed: 0, status: 'locked' },
    ],
    targetCount: 170,
    difficulty: 1,
  },
  {
    id: 'path_literary',
    name: '文学修养之路',
    description: '深入文学与美学词汇，提升表达的艺术性',
    stages: [
      { name: '诗词意象', description: '古典诗词中的经典意象', wordCount: 40, completed: 0, status: 'available' },
      { name: '文学描写', description: '文学描写中常用的词汇', wordCount: 40, completed: 0, status: 'locked' },
      { name: '修辞手法', description: '修辞相关的专业词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '美学鉴赏', description: '美学与艺术评论词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '创作表达', description: '创意写作常用词汇', wordCount: 30, completed: 0, status: 'locked' },
    ],
    targetCount: 170,
    difficulty: 3,
  },
  {
    id: 'path_wisdom',
    name: '智慧思考之路',
    description: '探索哲学、科学与思辨的词汇世界',
    stages: [
      { name: '逻辑思维', description: '逻辑与推理相关词汇', wordCount: 30, completed: 0, status: 'available' },
      { name: '科学探索', description: '科学方法与自然规律词汇', wordCount: 40, completed: 0, status: 'locked' },
      { name: '哲学思辨', description: '哲学概念与思想流派', wordCount: 40, completed: 0, status: 'locked' },
      { name: '心理洞察', description: '心理学与自我认知词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '社会观察', description: '社会现象分析词汇', wordCount: 30, completed: 0, status: 'locked' },
    ],
    targetCount: 170,
    difficulty: 4,
  },
  {
    id: 'path_creative',
    name: '创意表达之路',
    description: '释放创意潜能，用词汇描绘独特世界',
    stages: [
      { name: '感官描写', description: '五感描写的词汇', wordCount: 30, completed: 0, status: 'available' },
      { name: '色彩与光影', description: '颜色与光线相关词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '声音与节奏', description: '声音与音乐相关词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '空间与形态', description: '空间描述与形态词汇', wordCount: 30, completed: 0, status: 'locked' },
      { name: '故事构建', description: '叙事与故事创作词汇', wordCount: 40, completed: 0, status: 'locked' },
    ],
    targetCount: 160,
    difficulty: 2,
  },
]

// ============================================================
// usePersonalVocabulary
// ============================================================

export function usePersonalVocabulary() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<VocabularyConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 词汇画像 ----
  function getProfile(words: WordEntry[]): VocabularyProfile {
    if (words.length === 0) {
      return {
        totalWords: 0,
        proficiencyDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        avgProficiency: 0,
        dominantPos: '—',
        posDistribution: {},
        topTags: [],
        learningTrend: [],
        strengths: [],
        weaknesses: [],
        nextReviewSuggestions: [],
      }
    }

    // 熟练度分布
    const profDist: Record<ProficiencyLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const w of words) {
      profDist[w.proficiency]++
    }
    const avgProficiency = Math.round(
      words.reduce((s, w) => s + w.proficiency, 0) / words.length * 10,
    ) / 10

    // 词性分布
    const posDist: Record<string, number> = {}
    for (const w of words) {
      if (w.pos) {
        posDist[w.pos] = (posDist[w.pos] || 0) + 1
      }
    }
    const dominantPos = Object.entries(posDist).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    // 标签云
    const tagCounts = new Map<string, number>()
    for (const w of words) {
      for (const tag of w.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    // 学习趋势（按月份）
    const monthMap = new Map<string, { label: string; value: number }>()
    for (const w of words) {
      const month = w.createdAt.slice(0, 7)
      if (!monthMap.has(month)) {
        monthMap.set(month, { label: month, value: 0 })
      }
      monthMap.get(month)!.value++
    }
    const learningTrend = [...monthMap.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-12)

    // 优势与弱点
    const strengths: string[] = []
    const weaknesses: string[] = []

    if (profDist[5] + profDist[4] > words.length * 0.5) {
      strengths.push('掌握率高，词汇基础扎实')
    }
    if (profDist[1] + profDist[2] > words.length * 0.5) {
      weaknesses.push('较多词汇处于初学阶段，需要加强复习')
    }
    if (topTags.length > 5) {
      strengths.push('词汇覆盖广泛，标签丰富')
    }
    if (words.filter(w => w.favorite).length > 0) {
      strengths.push('有收藏习惯，学习主动性强')
    }
    if (words.length < 10) {
      weaknesses.push('词汇量较少，建议增加新词学习')
    }

    // 下次复习建议
    const now = new Date()
    const nextReviewSuggestions = words
      .filter(w => {
        if (w.proficiency >= config.masteryThreshold) return false
        if (!w.lastReviewedAt) return true
        const daysSinceReview = (now.getTime() - new Date(w.lastReviewedAt).getTime()) / 86400000
        const interval = w.proficiency * 3 // 熟练度越高，间隔越长
        return daysSinceReview >= interval
      })
      .sort((a, b) => a.proficiency - b.proficiency)
      .slice(0, 10)

    return {
      totalWords: words.length,
      proficiencyDistribution: profDist,
      avgProficiency,
      dominantPos,
      posDistribution: posDist,
      topTags,
      learningTrend,
      strengths,
      weaknesses,
      nextReviewSuggestions,
    }
  }

  // ---- 学习进度 ----
  function getProgress(
    words: WordEntry[],
    todayStr?: string,
  ): LearningProgress {
    const today = todayStr || getLocalDateKey()

    const reviewedToday = words.filter(w => {
      return w.lastReviewedAt && getLocalDateKey(new Date(w.lastReviewedAt)) === today
    }).length

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStr = getLocalDateKey(weekStart)

    const reviewedThisWeek = words.filter(w => {
      return w.lastReviewedAt && getLocalDateKey(new Date(w.lastReviewedAt)) >= weekStr
    }).length

    // 连续学习天数
    const reviewDates = [...new Set(
      words
        .filter(w => w.lastReviewedAt)
        .map(w => getLocalDateKey(new Date(w.lastReviewedAt!))),
    )].sort().reverse()

    let streak = 0
    for (let i = 0; i < reviewDates.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      if (reviewDates[i] === getLocalDateKey(expected)) {
        streak++
      } else {
        break
      }
    }

    // 学习曲线（最近30天）
    const curve: LearningProgress['curve'] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = getLocalDateKey(d)

      const newWords = words.filter(w => w.createdAt && getLocalDateKey(new Date(w.createdAt)) === dateStr).length
      const reviewed = words.filter(w => w.lastReviewedAt ? getLocalDateKey(new Date(w.lastReviewedAt)) === dateStr : false).length
      const mastered = words.filter(w =>
        w.proficiency >= config.masteryThreshold &&
        (w.lastReviewedAt ? getLocalDateKey(new Date(w.lastReviewedAt)) === dateStr : false),
      ).length

      curve.push({ date: dateStr, newWords, reviewed, mastered })
    }

    return {
      reviewedToday,
      dailyGoal: config.dailyReviewGoal,
      reviewedThisWeek,
      streak,
      curve,
    }
  }

  // ---- 自适应推荐 ----
  function getRecommendations(words: WordEntry[]): AdaptiveRecommendation[] {
    const recommendations: AdaptiveRecommendation[] = []
    const now = new Date()

    // 1. 急需复习（低熟练度 + 长时间未复习）
    const urgentReview = words
      .filter(w => {
        if (w.proficiency >= config.masteryThreshold) return false
        if (!w.lastReviewedAt) return true
        const days = (now.getTime() - new Date(w.lastReviewedAt).getTime()) / 86400000
        return days >= (6 - w.proficiency) * 3
      })
      .sort((a, b) => a.proficiency - b.proficiency)
      .slice(0, 5)

    if (urgentReview.length > 0) {
      recommendations.push({
        words: urgentReview,
        reason: '这些词汇急需复习，避免遗忘',
        priority: 'high',
        type: 'review',
      })
    }

    // 2. 巩固练习（中等熟练度 + 最近复习过）
    const reinforce = words
      .filter(w => w.proficiency === 3)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    if (reinforce.length > 0) {
      recommendations.push({
        words: reinforce,
        reason: '巩固中等熟练度词汇，向精通迈进',
        priority: 'medium',
        type: 'reinforce',
      })
    }

    // 3. 挑战提升（高熟练度词汇的深度练习）
    const challenge = words
      .filter(w => w.proficiency >= 4 && w.favorite)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    if (challenge.length > 0) {
      recommendations.push({
        words: challenge,
        reason: '挑战已掌握词汇，深入理解词源与关联',
        priority: 'low',
        type: 'challenge',
      })
    }

    // 4. 探索新词建议
    if (words.length < config.maxVocabularySize) {
      const recentTags = new Set(words.flatMap(w => w.tags))
      const recommendation: AdaptiveRecommendation = {
        words: [],
        reason: `基于你的标签偏好（${[...recentTags].slice(0, 3).join('、')}），建议探索新词汇`,
        priority: 'medium',
        type: 'new',
      }
      recommendations.push(recommendation)
    }

    return recommendations
  }

  // ---- 学习路径管理 ----
  function getPaths(words: WordEntry[]): LearningPath[] {
    return PRESET_LEARNING_PATHS.map(path => {
      const masteredCount = words.filter(w => w.proficiency >= config.masteryThreshold).length
      const progress = path.targetCount > 0
        ? Math.min(1, Math.round(masteredCount / path.targetCount * 100) / 100)
        : 0

      // 更新阶段状态
      let cumulativeTarget = 0
      const stages = path.stages.map((stage, idx) => {
        cumulativeTarget += stage.wordCount
        const stageProgress = words.filter(w => w.proficiency >= config.masteryThreshold).length
        const completed = Math.min(stage.wordCount, Math.max(0, stageProgress - (cumulativeTarget - stage.wordCount)))

        let status: LearningStage['status'] = 'locked'
        if (idx === 0 || path.stages[idx - 1].completed >= path.stages[idx - 1].wordCount * 0.8) {
          status = completed >= stage.wordCount ? 'completed'
            : completed > 0 ? 'in_progress'
            : 'available'
        }

        return { ...stage, completed, status }
      })

      return { ...path, progress, stages }
    })
  }

  // ---- 词汇分组 ----
  function groupByProficiency(words: WordEntry[]): { level: ProficiencyLevel; label: string; color: string; items: WordEntry[] }[] {
    return (Object.entries(PROFICIENCY_META) as [string, typeof PROFICIENCY_META[ProficiencyLevel]][]).map(([level, meta]) => {
      const lv = Number(level) as ProficiencyLevel
      return {
        level: lv,
        label: meta.label,
        color: meta.color,
        items: words.filter(w => w.proficiency === lv),
      }
    })
  }

  function groupByTag(words: WordEntry[]): { tag: string; count: number; items: WordEntry[] }[] {
    const groups = new Map<string, WordEntry[]>()
    for (const w of words) {
      for (const tag of w.tags) {
        if (!groups.has(tag)) groups.set(tag, [])
        groups.get(tag)!.push(w)
      }
    }
    return [...groups.entries()]
      .map(([tag, items]) => ({ tag, count: items.length, items }))
      .sort((a, b) => b.count - a.count)
  }

  function groupByPos(words: WordEntry[]): { pos: string; count: number; items: WordEntry[] }[] {
    const groups = new Map<string, WordEntry[]>()
    for (const w of words) {
      const key = w.pos || '未分类'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(w)
    }
    return [...groups.entries()]
      .map(([pos, items]) => ({ pos, count: items.length, items }))
      .sort((a, b) => b.count - a.count)
  }

  // ---- 搜索与过滤 ----
  function search(
    words: WordEntry[],
    query: string,
    filters?: {
      proficiency?: ProficiencyLevel[]
      tags?: string[]
      favorite?: boolean
      pos?: string[]
    },
  ): WordEntry[] {
    let results = [...words]

    if (query) {
      const q = query.toLowerCase()
      results = results.filter(w =>
        w.word.includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        w.tags.some(t => t.toLowerCase().includes(q)),
      )
    }

    if (filters?.proficiency?.length) {
      results = results.filter(w => filters.proficiency!.includes(w.proficiency))
    }

    if (filters?.tags?.length) {
      results = results.filter(w => w.tags.some(t => filters.tags!.includes(t)))
    }

    if (filters?.favorite !== undefined) {
      results = results.filter(w => w.favorite === filters.favorite)
    }

    if (filters?.pos?.length) {
      results = results.filter(w => w.pos && filters.pos!.includes(w.pos))
    }

    return results
  }

  // ---- 词汇统计 ----
  function getWordStats(words: WordEntry[]) {
    const mastered = words.filter(w => w.proficiency >= config.masteryThreshold).length
    const learning = words.filter(w => w.proficiency < config.masteryThreshold).length
    const favorites = words.filter(w => w.favorite).length
    const recentlyReviewed = words.filter(w => {
      if (!w.lastReviewedAt) return false
      const days = (new Date().getTime() - new Date(w.lastReviewedAt).getTime()) / 86400000
      return days <= 7
    }).length

    return {
      total: words.length,
      learning,
      mastered,
      favorites,
      averageProficiency: words.length > 0
        ? Math.round(words.reduce((s, w) => s + w.proficiency, 0) / words.length * 10) / 10
        : 0,
      recentlyReviewed,
      proficiencyDistribution: {
        1: words.filter(w => w.proficiency === 1).length,
        2: words.filter(w => w.proficiency === 2).length,
        3: words.filter(w => w.proficiency === 3).length,
        4: words.filter(w => w.proficiency === 4).length,
        5: words.filter(w => w.proficiency === 5).length,
      } as Record<ProficiencyLevel, number>,
    }
  }

  return {
    config,
    setConfig,
    getProfile,
    getProgress,
    getRecommendations,
    getPaths,
    groupByProficiency,
    groupByTag,
    groupByPos,
    search,
    getWordStats,
    PRESET_LEARNING_PATHS,
  }
}