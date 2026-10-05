// ============================================================
// 字镜阁 · 写作增强引擎（P18-5）
// 写作模板库 + 写作分析 + 风格建议 + 写作统计
// ============================================================

import type { WordEntry } from './types'
import { getLocalDateKey } from '@/utils/time'

// ============================================================
// 类型定义
// ============================================================

/** 写作模板 */
export interface WritingTemplate {
  id: string
  name: string
  description: string
  /** 模板分类 */
  category: WritingCategory
  /** 模板结构 */
  structure: string[]
  /** 提示词 */
  prompts: string[]
  /** 建议字数 */
  suggestedLength: number
  /** 难度 1-5 */
  difficulty: number
  /** 标签 */
  tags: string[]
}

/** 写作分类 */
export type WritingCategory =
  | 'daily'        // 日记
  | 'reflection'   // 反思
  | 'narrative'    // 叙事
  | 'descriptive'  // 描写
  | 'argumentative'// 议论
  | 'creative'     // 创意
  | 'letter'       // 书信
  | 'poetry'       // 诗歌

/** 写作会话 */
export interface WritingSession {
  id: string
  templateId?: string
  title: string
  content: string
  category: WritingCategory
  startedAt: string
  completedAt?: string
  wordCount: number
  /** 使用的词汇 ID */
  usedWordIds: string[]
  /** 新发现的词汇 */
  discoveredWords: string[]
  /** 情绪标签 */
  moodTags: string[]
  /** 评分 */
  score?: WritingScore
}

/** 写作评分 */
export interface WritingScore {
  /** 词汇丰富度 */
  vocabularyRichness: number
  /** 结构完整性 */
  structureCompleteness: number
  /** 情感表达 */
  emotionalExpression: number
  /** 语法流畅度 */
  fluency: number
  /** 综合评分 */
  overall: number
}

/** 写作分析 */
export interface WritingAnalysis {
  sessionId: string
  /** 词汇统计 */
  vocabulary: {
    unique: number
    total: number
    richness: number
    topWords: { word: string; count: number }[]
    newWords: string[]
    usedLearnedWords: string[]
  }
  /** 结构分析 */
  structure: {
    paragraphs: number
    sentences: number
    avgSentenceLength: number
    structureCompleteness: number
  }
  /** 风格分析 */
  style: {
    tone: string
    pacing: 'fast' | 'moderate' | 'slow'
    formality: number
    creativity: number
  }
  /** 改进建议 */
  suggestions: WritingSuggestion[]
}

/** 写作建议 */
export interface WritingSuggestion {
  type: 'vocabulary' | 'structure' | 'style' | 'grammar'
  severity: 'hint' | 'suggestion' | 'warning'
  message: string
  example?: string
}

/** 写作统计 */
export interface WritingStats {
  totalSessions: number
  totalWords: number
  totalDays: number
  currentStreak: number
  longestStreak: number
  avgWordCount: number
  avgScore: number
  categoryDistribution: Record<WritingCategory, number>
  monthlyTrend: { month: string; sessions: number; words: number }[]
  mostUsedWords: { word: string; count: number }[]
  favoriteTemplate: string | null
}

// ============================================================
// 写作分类元数据
// ============================================================

export const WRITING_CATEGORY_META: Record<WritingCategory, { label: string; icon: string; color: string }> = {
  daily: { label: '日记', icon: '📔', color: '#8a9a7a' },
  reflection: { label: '反思', icon: '💭', color: '#6b9fc4' },
  narrative: { label: '叙事', icon: '📖', color: '#f0c040' },
  descriptive: { label: '描写', icon: '🎨', color: '#d98c7a' },
  argumentative: { label: '议论', icon: '⚖️', color: '#c46a5a' },
  creative: { label: '创意', icon: '✨', color: '#b5707a' },
  letter: { label: '书信', icon: '✉️', color: '#6b9fc4' },
  poetry: { label: '诗歌', icon: '🎵', color: '#e0a96d' },
}

// ============================================================
// 预设写作模板
// ============================================================

export const PRESET_TEMPLATES: WritingTemplate[] = [
  // ---- 日记 ----
  {
    id: 'tpl_daily_3things',
    name: '三件好事',
    description: '记录今天发生的三件美好小事，培养感恩之心',
    category: 'daily',
    structure: ['今日天气/氛围', '好事一', '好事二', '好事三', '今日感悟'],
    prompts: ['今天发生了什么让你微笑的事？', '哪一刻让你感到温暖？', '今天你想感谢什么？'],
    suggestedLength: 200,
    difficulty: 1,
    tags: ['感恩', '积极', '日记'],
  },
  {
    id: 'tpl_daily_stream',
    name: '意识流日记',
    description: '不加评判地记录脑海中的想法，自由流淌',
    category: 'daily',
    structure: ['此刻感受', '脑海中的想法', '浮现的记忆', '对明天的期待'],
    prompts: ['此刻你的心情如何？', '脑海中浮现了什么？', '有什么想说却没说出口的话？'],
    suggestedLength: 300,
    difficulty: 2,
    tags: ['自由', '情绪', '日记'],
  },
  // ---- 反思 ----
  {
    id: 'tpl_reflect_weekly',
    name: '周度回顾',
    description: '回顾本周的收获与成长，为下周蓄力',
    category: 'reflection',
    structure: ['本周成就', '遇到的挑战', '学到的教训', '下周目标', '给自己的话'],
    prompts: ['本周最大的收获是什么？', '什么让你感到困难？', '下周你最想改变什么？'],
    suggestedLength: 400,
    difficulty: 2,
    tags: ['回顾', '成长', '反思'],
  },
  {
    id: 'tpl_reflect_decision',
    name: '决策反思',
    description: '深入分析一个重要决策的思考过程',
    category: 'reflection',
    structure: ['决策背景', '考虑的选项', '选择的理由', '结果评估', '经验总结'],
    prompts: ['你面临什么选择？', '为什么选择了这个？', '如果重来一次会怎么做？'],
    suggestedLength: 500,
    difficulty: 3,
    tags: ['决策', '分析', '反思'],
  },
  // ---- 叙事 ----
  {
    id: 'tpl_narrative_memory',
    name: '记忆重现',
    description: '用文字重现一段珍贵的记忆',
    category: 'narrative',
    structure: ['时间地点', '人物', '事件经过', '细节描写', '情感收尾'],
    prompts: ['那是什么时候的事？', '你最清晰的画面是什么？', '那时的你是什么感受？'],
    suggestedLength: 500,
    difficulty: 3,
    tags: ['记忆', '叙事', '故事'],
  },
  {
    id: 'tpl_narrative_journey',
    name: '旅程记录',
    description: '记录一段旅程中的见闻与感受',
    category: 'narrative',
    structure: ['出发前的心情', '沿途风景', '遇见的人', '意外插曲', '归来感悟'],
    prompts: ['你去了哪里？', '最难忘的风景是什么？', '这段旅程改变了你什么？'],
    suggestedLength: 600,
    difficulty: 2,
    tags: ['旅行', '见闻', '叙事'],
  },
  // ---- 描写 ----
  {
    id: 'tpl_describe_person',
    name: '人物素描',
    description: '用文字描绘一个对你重要的人',
    category: 'descriptive',
    structure: ['外貌特征', '性格特点', '相处片段', '他/她教给你的', '想说的话'],
    prompts: ['他/她长什么样？', '什么性格最让你印象深刻？', '你们之间最难忘的时刻？'],
    suggestedLength: 400,
    difficulty: 2,
    tags: ['人物', '描写', '关系'],
  },
  {
    id: 'tpl_describe_season',
    name: '季节印象',
    description: '捕捉当下的季节氛围与感受',
    category: 'descriptive',
    structure: ['视觉印象', '声音与气味', '身体感受', '季节记忆', '季节寄语'],
    prompts: ['你看到了什么颜色？', '空气中有什么味道？', '这个季节让你想起什么？'],
    suggestedLength: 300,
    difficulty: 2,
    tags: ['季节', '感官', '描写'],
  },
  // ---- 议论 ----
  {
    id: 'tpl_argue_opinion',
    name: '观点阐述',
    description: '系统地表达你对某个话题的看法',
    category: 'argumentative',
    structure: ['话题引入', '我的观点', '论据一', '论据二', '反方观点', '结论'],
    prompts: ['你想讨论什么话题？', '你的核心观点是什么？', '有没有反对的声音？'],
    suggestedLength: 600,
    difficulty: 4,
    tags: ['观点', '逻辑', '议论'],
  },
  // ---- 创意 ----
  {
    id: 'tpl_creative_if',
    name: '如果...',
    description: '展开想象的翅膀，创造另一个可能',
    category: 'creative',
    structure: ['设定场景', '关键转折', '展开叙述', '意外发展', '结局'],
    prompts: ['如果世界不一样了会发生什么？', '你最想改变的规则是什么？', '那个世界的人们如何生活？'],
    suggestedLength: 500,
    difficulty: 3,
    tags: ['想象', '创意', '故事'],
  },
  {
    id: 'tpl_creative_dialogue',
    name: '虚构对话',
    description: '创作一段有意义的对话',
    category: 'creative',
    structure: ['场景设定', '人物介绍', '对话展开', '冲突/转折', '对话收尾'],
    prompts: ['谁在对话？', '他们在哪里？', '他们想讨论什么？'],
    suggestedLength: 400,
    difficulty: 3,
    tags: ['对话', '创意', '写作'],
  },
  // ---- 书信 ----
  {
    id: 'tpl_letter_future',
    name: '给未来的信',
    description: '写一封信给未来的自己',
    category: 'letter',
    structure: ['称呼', '现在的我', '对未来的期待', '想问的问题', '祝福'],
    prompts: ['你想对未来的自己说什么？', '你希望未来的你记得什么？', '你有什么问题想问未来的自己？'],
    suggestedLength: 400,
    difficulty: 2,
    tags: ['未来', '书信', '自我'],
  },
  {
    id: 'tpl_letter_gratitude',
    name: '感谢信',
    description: '写一封感谢信给你想感谢的人',
    category: 'letter',
    structure: ['称呼', '感谢的原因', '具体事例', '他/她带来的改变', '真挚祝福'],
    prompts: ['你想感谢谁？', '为什么要感谢他/她？', '他/她改变了你什么？'],
    suggestedLength: 300,
    difficulty: 1,
    tags: ['感恩', '书信', '关系'],
  },
  // ---- 诗歌 ----
  {
    id: 'tpl_poetry_haiku',
    name: '俳句练习',
    description: '用三行文字捕捉瞬间的美',
    category: 'poetry',
    structure: ['第一行（5音）', '第二行（7音）', '第三行（5音）'],
    prompts: ['你看到了什么自然景象？', '此刻有什么情绪涌动？', '能用一句话概括吗？'],
    suggestedLength: 50,
    difficulty: 3,
    tags: ['诗歌', '俳句', '自然'],
  },
  {
    id: 'tpl_poetry_free',
    name: '自由诗',
    description: '不受形式约束，自由表达',
    category: 'poetry',
    structure: ['意象一', '意象二', '情感转折', '收束'],
    prompts: ['你想表达什么情感？', '什么画面最能代表你的心情？', '用什么比喻最合适？'],
    suggestedLength: 100,
    difficulty: 2,
    tags: ['诗歌', '自由', '表达'],
  },
]

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `write_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ============================================================
// useWritingEnhance
// ============================================================

export function useWritingEnhance() {
  // ---- 模板管理 ----
  function getTemplates(category?: WritingCategory): WritingTemplate[] {
    if (category) return PRESET_TEMPLATES.filter(t => t.category === category)
    return PRESET_TEMPLATES
  }

  function getTemplateById(id: string): WritingTemplate | undefined {
    return PRESET_TEMPLATES.find(t => t.id === id)
  }

  function getRecommendedTemplates(
    history: WritingSession[],
    count: number = 3,
  ): WritingTemplate[] {
    // 基于历史推荐新模板
    const usedIds = new Set(history.map(s => s.templateId).filter(Boolean))
    const unused = PRESET_TEMPLATES.filter(t => !usedIds.has(t.id))

    if (unused.length >= count) {
      return unused.slice(0, count)
    }

    // 如果新模板不够，推荐与历史类别不同但难度相近的
    const usedCategories = new Set(history.map(s => s.category))
    const avgDifficulty = history.length > 0
      ? history.reduce((s, h) => {
        const tpl = PRESET_TEMPLATES.find(t => t.id === h.templateId)
        return s + (tpl?.difficulty ?? 2)
      }, 0) / history.length
      : 2

    const scored = PRESET_TEMPLATES
      .filter(t => !usedIds.has(t.id))
      .map(t => ({
        template: t,
        score:
          (usedCategories.has(t.category) ? 0 : 3) +
          (5 - Math.abs(t.difficulty - avgDifficulty)),
      }))
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, count).map(s => s.template)
  }

  // ---- 写作分析 ----
  function analyzeWriting(session: WritingSession, userWords: WordEntry[]): WritingAnalysis {
    const content = session.content
    const chars = content.replace(/\s/g, '')
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)
    const sentences = content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0)

    // 词汇统计
    const wordFreq = new Map<string, number>()
    const usedLearnedWords: string[] = []

    for (const word of userWords) {
      const regex = new RegExp(word.word, 'g')
      const matches = content.match(regex)
      if (matches) {
        wordFreq.set(word.word, matches.length)
        usedLearnedWords.push(word.word)
      }
    }

    const topWords = [...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))

    const uniqueChars = new Set(chars.split('')).size
    const richness = Math.min(1, uniqueChars / Math.max(1, chars.length))

    // 结构分析
    const avgSentenceLen = sentences.length > 0
      ? Math.round(chars.length / sentences.length)
      : 0

    const structureCompleteness = session.templateId
      ? (() => {
        const tpl = PRESET_TEMPLATES.find(t => t.id === session.templateId)
        if (!tpl) return 0.7
        const covered = tpl.structure.filter(s =>
          content.toLowerCase().includes(s.toLowerCase().slice(0, 2)),
        ).length
        return Math.min(1, covered / tpl.structure.length)
      })()
      : paragraphs.length >= 3 ? 0.8 : 0.5

    // 风格分析
    const positiveWords = ['好', '美', '爱', '喜', '乐', '幸', '赞', '棒', '优秀', '温暖', '阳光', '快乐', '幸福']
    const negativeWords = ['难', '痛', '苦', '悲', '怒', '怕', '焦虑', '紧张', '糟糕', '糟糕', '失败', '遗憾']
    let posCount = 0
    let negCount = 0
    for (const pw of positiveWords) {
      if (content.includes(pw)) posCount++
    }
    for (const nw of negativeWords) {
      if (content.includes(nw)) negCount++
    }

    let tone = 'neutral'
    if (posCount > negCount * 2) tone = 'positive'
    else if (negCount > posCount * 2) tone = 'negative'
    else if (posCount > negCount) tone = 'slightly_positive'
    else if (negCount > posCount) tone = 'slightly_negative'

    const pacing = avgSentenceLen > 30 ? 'slow' : avgSentenceLen > 15 ? 'moderate' : 'fast'

    // 改进建议
    const suggestions: WritingSuggestion[] = []

    if (richness < 0.3) {
      suggestions.push({
        type: 'vocabulary',
        severity: 'suggestion',
        message: '词汇丰富度较低，可以尝试使用更多不同的表达方式',
        example: '尝试用近义词替换重复出现的词汇',
      })
    }

    if (avgSentenceLen > 40) {
      suggestions.push({
        type: 'style',
        severity: 'suggestion',
        message: '平均句长较长，可以适当拆分长句使阅读更流畅',
        example: '尝试将超过40字的句子拆分为2-3个短句',
      })
    } else if (avgSentenceLen < 8 && sentences.length > 5) {
      suggestions.push({
        type: 'style',
        severity: 'hint',
        message: '句子偏短，可以尝试连接一些短句以增加韵律感',
      })
    }

    if (paragraphs.length < 2) {
      suggestions.push({
        type: 'structure',
        severity: 'warning',
        message: '段落较少，建议分段组织内容使结构更清晰',
      })
    }

    if (usedLearnedWords.length < 3 && userWords.length > 0) {
      suggestions.push({
        type: 'vocabulary',
        severity: 'hint',
        message: '可以尝试在写作中运用已学词汇，加深记忆',
        example: `你已学习 ${userWords.length} 个词汇，这次只用了 ${usedLearnedWords.length} 个`,
      })
    }

    return {
      sessionId: session.id,
      vocabulary: {
        unique: uniqueChars,
        total: chars.length,
        richness: Math.round(richness * 100) / 100,
        topWords,
        newWords: session.discoveredWords,
        usedLearnedWords,
      },
      structure: {
        paragraphs: paragraphs.length,
        sentences: sentences.length,
        avgSentenceLength: avgSentenceLen,
        structureCompleteness: Math.round(structureCompleteness * 100) / 100,
      },
      style: {
        tone,
        pacing,
        formality: 0.5,
        creativity: usedLearnedWords.length > 5 ? 0.7 : 0.4,
      },
      suggestions,
    }
  }

  // ---- 写作评分 ----
  function scoreWriting(analysis: WritingAnalysis): WritingScore {
    const vocabularyRichness = Math.round(analysis.vocabulary.richness * 100)
    const structureCompleteness = Math.round(analysis.structure.structureCompleteness * 100)
    const emotionalExpression = analysis.style.tone !== 'neutral' ? 80 : 50
    const fluency = analysis.style.pacing === 'moderate' ? 85 : 65

    const overall = Math.round(
      (vocabularyRichness * 0.3 + structureCompleteness * 0.25 + emotionalExpression * 0.2 + fluency * 0.25),
    )

    return {
      vocabularyRichness,
      structureCompleteness,
      emotionalExpression,
      fluency,
      overall,
    }
  }

  // ---- 写作统计 ----
  function getStats(sessions: WritingSession[]): WritingStats {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalWords: 0,
        totalDays: 0,
        currentStreak: 0,
        longestStreak: 0,
        avgWordCount: 0,
        avgScore: 0,
        categoryDistribution: {} as Record<WritingCategory, number>,
        monthlyTrend: [],
        mostUsedWords: [],
        favoriteTemplate: null,
      }
    }

    const totalWords = sessions.reduce((s, sess) => s + sess.wordCount, 0)
    const avgWordCount = Math.round(totalWords / sessions.length)
    const scoredSessions = sessions.filter(s => s.score)
    const avgScore = scoredSessions.length > 0
      ? Math.round(scoredSessions.reduce((s, sess) => s + (sess.score?.overall ?? 0), 0) / scoredSessions.length)
      : 0

    // 分类分布
    const categoryDist: Record<string, number> = {}
    for (const sess of sessions) {
      categoryDist[sess.category] = (categoryDist[sess.category] || 0) + 1
    }

    // 连续天数
    const days = [...new Set(
      sessions.map(s => getLocalDateKey(new Date(s.startedAt))),
    )].sort().reverse()

    let currentStreak = 0
    let longestStreak = 0
    let streak = 0
    const today = getLocalDateKey()

    for (let i = 0; i < days.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      const expectedStr = getLocalDateKey(expected)

      if (days[i] === expectedStr) {
        streak++
        longestStreak = Math.max(longestStreak, streak)
      } else {
        streak = 0
      }
    }
    currentStreak = days[0] === today ? streak : 0

    // 月度趋势
    const monthMap = new Map<string, { sessions: number; words: number }>()
    for (const sess of sessions) {
      const month = sess.startedAt.slice(0, 7)
      if (!monthMap.has(month)) monthMap.set(month, { sessions: 0, words: 0 })
      const entry = monthMap.get(month)!
      entry.sessions++
      entry.words += sess.wordCount
    }
    const monthlyTrend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({ month, ...data }))

    // 最常用词汇
    const wordCount = new Map<string, number>()
    for (const sess of sessions) {
      for (const wid of sess.usedWordIds) {
        wordCount.set(wid, (wordCount.get(wid) || 0) + 1)
      }
    }
    const mostUsedWords = [...wordCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))

    // 最常用模板
    const templateCount = new Map<string, number>()
    for (const sess of sessions) {
      if (sess.templateId) {
        templateCount.set(sess.templateId, (templateCount.get(sess.templateId) || 0) + 1)
      }
    }
    let favoriteTemplate: string | null = null
    let maxCount = 0
    for (const [id, count] of templateCount) {
      if (count > maxCount) {
        maxCount = count
        favoriteTemplate = id
      }
    }

    return {
      totalSessions: sessions.length,
      totalWords,
      totalDays: days.length,
      currentStreak,
      longestStreak,
      avgWordCount,
      avgScore,
      categoryDistribution: categoryDist as Record<WritingCategory, number>,
      monthlyTrend,
      mostUsedWords,
      favoriteTemplate,
    }
  }

  // ---- 创建写作会话 ----
  function createSession(
    title: string,
    content: string,
    category: WritingCategory,
    templateId?: string,
  ): WritingSession {
    return {
      id: generateId(),
      templateId,
      title,
      content,
      category,
      startedAt: new Date().toISOString(),
      wordCount: content.replace(/\s/g, '').length,
      usedWordIds: [],
      discoveredWords: [],
      moodTags: [],
    }
  }

  return {
    getTemplates,
    getTemplateById,
    getRecommendedTemplates,
    analyzeWriting,
    scoreWriting,
    getStats,
    createSession,
    PRESET_TEMPLATES,
    WRITING_CATEGORY_META,
  }
}