// ============================================================
// 镜面对话系统 · 对话持久化与模板
// 蓝图要求：对话持久化 + 多轮上下文 + 意图反馈学习 + 对话模板
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { DialogueEntry, IntentCategory } from './types'
import { INTENT_INFO } from './intents'

// ---- 对话会话类型 ----

export interface DialogueSession {
  id: string
  /** 会话标题（自动生成） */
  title: string
  /** 对话条目 */
  entries: DialogueEntry[]
  /** 创建时间 */
  createdAt: string
  /** 最后活跃时间 */
  lastActiveAt: string
  /** 会话标签 */
  tags: string[]
  /** 涉及的主要意图 */
  primaryIntents: IntentCategory[]
  /** 是否已归档 */
  archived: boolean
  /** 会话摘要 */
  summary: string
}

// ---- 对话模板类型 ----

export type DialogueTemplateType =
  | 'morning_checkin'      // 晨间签到
  | 'evening_reflection'   // 晚间反思
  | 'weekly_review'        // 周回顾
  | 'focus_prep'           // 专注准备
  | 'emotion_check'        // 情绪检查
  | 'goal_review'          // 目标回顾
  | 'gratitude'            // 感恩练习
  | 'decision_help'        // 决策辅助

export interface DialogueTemplate {
  id: string
  type: DialogueTemplateType
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 图标 */
  icon: string
  /** 引导问题 */
  prompts: string[]
  /** 预期意图 */
  expectedIntents: IntentCategory[]
  /** 使用次数 */
  usageCount: number
}

// ---- 意图反馈学习 ----

export interface IntentFeedback {
  /** 原始输入 */
  input: string
  /** 解析的意图 */
  parsedIntent: IntentCategory
  /** 用户是否确认 */
  confirmed: boolean
  /** 用户修正的意图（如果不确认） */
  correctedIntent?: IntentCategory
  /** 反馈时间 */
  feedbackAt: string
}

export interface IntentLearningModel {
  /** 意图名称 → 关键词权重 */
  keywordWeights: Record<string, Record<string, number>>
  /** 反馈总数 */
  totalFeedback: number
  /** 修正率 */
  correctionRate: number
  /** 最后训练时间 */
  lastTrainedAt: string
}

// ---- 存储键 ----

const SESSIONS_KEY = 'hf:mirror_sessions'
const TEMPLATES_KEY = 'hf:mirror_templates'
const FEEDBACK_KEY = 'hf:mirror_intent_feedback'
const LEARNING_MODEL_KEY = 'hf:mirror_learning_model'

// ---- 默认模板 ----

export const DEFAULT_TEMPLATES: DialogueTemplate[] = [
  {
    id: 'tpl_morning_checkin',
    type: 'morning_checkin',
    name: '晨间签到',
    description: '开启新的一天，设定今日意图',
    icon: '🌅',
    prompts: [
      '今天感觉怎么样？',
      '今天最重要的三件事是什么？',
      '有什么让你期待的事情吗？',
    ],
    expectedIntents: ['plan', 'focus', 'emotion'],
    usageCount: 0,
  },
  {
    id: 'tpl_evening_reflection',
    type: 'evening_reflection',
    name: '晚间反思',
    description: '回顾一天，沉淀收获',
    icon: '🌙',
    prompts: [
      '今天发生了什么值得记住的事？',
      '今天有遇到什么挑战吗？',
      '今天你最感激的是什么？',
    ],
    expectedIntents: ['reflect', 'note', 'emotion'],
    usageCount: 0,
  },
  {
    id: 'tpl_weekly_review',
    type: 'weekly_review',
    name: '周回顾',
    description: '回顾本周进展，规划下周',
    icon: '📊',
    prompts: [
      '这周完成了哪些目标？',
      '有什么需要调整的地方？',
      '下周最重要的目标是什么？',
    ],
    expectedIntents: ['reflect', 'plan', 'note'],
    usageCount: 0,
  },
  {
    id: 'tpl_focus_prep',
    type: 'focus_prep',
    name: '专注准备',
    description: '进入专注模式前的准备对话',
    icon: '🎯',
    prompts: [
      '准备专注做什么？',
      '预计需要多长时间？',
      '需要怎样的环境？',
    ],
    expectedIntents: ['focus', 'plan'],
    usageCount: 0,
  },
  {
    id: 'tpl_emotion_check',
    type: 'emotion_check',
    name: '情绪检查',
    description: '觉察并记录当前情绪状态',
    icon: '💭',
    prompts: [
      '现在的心情怎么样？',
      '是什么触发了这种感受？',
      '这种情绪想告诉你什么？',
    ],
    expectedIntents: ['emotion', 'reflect'],
    usageCount: 0,
  },
  {
    id: 'tpl_goal_review',
    type: 'goal_review',
    name: '目标回顾',
    description: '回顾目标进展，调整计划',
    icon: '🏔️',
    prompts: [
      '你的目标进展如何？',
      '有什么阻碍吗？',
      '需要调整计划吗？',
    ],
    expectedIntents: ['plan', 'reflect'],
    usageCount: 0,
  },
  {
    id: 'tpl_gratitude',
    type: 'gratitude',
    name: '感恩练习',
    description: '练习感恩，提升幸福感',
    icon: '🙏',
    prompts: [
      '今天有什么让你感恩的事？',
      '最近谁帮助了你？',
      '你为自己感到骄傲的是什么？',
    ],
    expectedIntents: ['reflect', 'emotion'],
    usageCount: 0,
  },
  {
    id: 'tpl_decision_help',
    type: 'decision_help',
    name: '决策辅助',
    description: '通过对话梳理思路，辅助决策',
    icon: '⚖️',
    prompts: [
      '你面临什么选择？',
      '每个选项的利弊是什么？',
      '你的直觉倾向于哪个？',
    ],
    expectedIntents: ['reflect', 'explore'],
    usageCount: 0,
  },
]

// ============================================================
// 对话持久化
// ============================================================

export function useDialoguePersistence() {
  const sessions = ref<DialogueSession[]>(loadSessions())
  const activeSessionId = ref<string | null>(null)

  function loadSessions(): DialogueSession[] {
    return storage.getKV<DialogueSession[]>(SESSIONS_KEY, [])
  }

  function saveSessions() {
    storage.setKV(SESSIONS_KEY, sessions.value)
  }

  /** 创建新会话 */
  function createSession(firstEntry?: DialogueEntry): DialogueSession {
    const now = new Date().toISOString()
    const title = firstEntry
      ? firstEntry.text.slice(0, 30) + (firstEntry.text.length > 30 ? '...' : '')
      : '新对话'

    const session: DialogueSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      title,
      entries: firstEntry ? [firstEntry] : [],
      createdAt: now,
      lastActiveAt: now,
      tags: [],
      primaryIntents: firstEntry?.parsedTask ? [firstEntry.parsedTask.intent] : [],
      archived: false,
      summary: '',
    }

    sessions.value.unshift(session)
    activeSessionId.value = session.id
    saveSessions()
    return session
  }

  /** 添加对话条目到活跃会话 */
  function addEntry(entry: DialogueEntry, sessionId?: string): DialogueSession | null {
    const targetId = sessionId || activeSessionId.value
    if (!targetId) {
      // 自动创建会话
      return createSession(entry)
    }

    const session = sessions.value.find(s => s.id === targetId)
    if (!session) return null

    session.entries.push(entry)
    session.lastActiveAt = new Date().toISOString()

    // 更新标题（使用第一条用户输入）
    if (session.entries.length === 1 && entry.role === 'user') {
      session.title = entry.text.slice(0, 30) + (entry.text.length > 30 ? '...' : '')
    }

    // 更新意图标签
    if (entry.parsedTask) {
      if (!session.primaryIntents.includes(entry.parsedTask.intent)) {
        session.primaryIntents.push(entry.parsedTask.intent)
      }
    }

    saveSessions()
    return session
  }

  /** 获取活跃会话 */
  const activeSession = computed(() => {
    if (!activeSessionId.value) return null
    return sessions.value.find(s => s.id === activeSessionId.value) || null
  })

  /** 获取会话的对话历史 */
  function getSessionHistory(sessionId: string): DialogueEntry[] {
    const session = sessions.value.find(s => s.id === sessionId)
    return session ? [...session.entries] : []
  }

  /**
   * 获取多轮上下文
   * 返回最近 N 轮对话的上下文摘要
   */
  function getMultiTurnContext(sessionId: string, turns: number = 5): {
    entries: DialogueEntry[]
    summary: string
    keyTopics: string[]
    lastIntent: IntentCategory | null
  } {
    const history = getSessionHistory(sessionId)
    const recentEntries = history.slice(-turns * 2) // 每轮包含 user + mirror

    const keyTopics: string[] = []
    const intents = new Set<IntentCategory>()

    for (const entry of recentEntries) {
      if (entry.parsedTask) {
        intents.add(entry.parsedTask.intent)
        if (entry.parsedTask.params?.topic) {
          keyTopics.push(entry.parsedTask.params.topic as string)
        }
      }
    }

    let lastIntent: IntentCategory | null = null
    for (let i = recentEntries.length - 1; i >= 0; i--) {
      if (recentEntries[i].parsedTask) {
        lastIntent = recentEntries[i].parsedTask!.intent
        break
      }
    }

    const summaryParts: string[] = []
    if (intents.size > 0) {
      summaryParts.push(`讨论涉及: ${[...intents].map(i => INTENT_INFO[i].label).join('、')}`)
    }
    if (keyTopics.length > 0) {
      summaryParts.push(`关键话题: ${[...new Set(keyTopics)].join('、')}`)
    }

    return {
      entries: recentEntries,
      summary: summaryParts.join('；'),
      keyTopics: [...new Set(keyTopics)],
      lastIntent,
    }
  }

  /** 归档会话 */
  function archiveSession(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false
    session.archived = true
    session.summary = generateSessionSummary(session)
    saveSessions()
    return true
  }

  /** 恢复会话（取消归档） */
  function restoreSession(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false
    session.archived = false
    saveSessions()
    return true
  }

  /** 生成会话摘要 */
  function generateSessionSummary(session: DialogueSession): string {
    const parts: string[] = []
    parts.push(`共 ${session.entries.length} 条对话`)
    if (session.primaryIntents.length > 0) {
      parts.push(`涉及意图: ${session.primaryIntents.map(i => INTENT_INFO[i].label).join('、')}`)
    }
    const userMessages = session.entries.filter(e => e.role === 'user')
    if (userMessages.length > 0) {
      parts.push(`用户发言 ${userMessages.length} 次`)
    }
    return parts.join('；')
  }

  /** 删除会话 */
  function deleteSession(sessionId: string): boolean {
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx < 0) return false
    sessions.value.splice(idx, 1)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = null
    }
    saveSessions()
    return true
  }

  /** 获取所有活跃会话 */
  const activeSessions = computed(() =>
    sessions.value.filter(s => !s.archived).sort((a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
    ),
  )

  /** 获取已归档会话 */
  const archivedSessions = computed(() =>
    sessions.value.filter(s => s.archived).sort((a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
    ),
  )

  return {
    sessions,
    activeSessionId,
    activeSession,
    activeSessions,
    archivedSessions,
    createSession,
    addEntry,
    getSessionHistory,
    getMultiTurnContext,
    archiveSession,
    restoreSession,
    deleteSession,
  }
}

// ============================================================
// 对话模板
// ============================================================

export function useDialogueTemplates() {
  const templates = ref<DialogueTemplate[]>(loadTemplates())

  function loadTemplates(): DialogueTemplate[] {
    return storage.getKV<DialogueTemplate[]>(TEMPLATES_KEY, DEFAULT_TEMPLATES)
  }

  function saveTemplates() {
    storage.setKV(TEMPLATES_KEY, templates.value)
  }

  /** 获取模板 */
  function getTemplate(type: DialogueTemplateType): DialogueTemplate | undefined {
    return templates.value.find(t => t.type === type)
  }

  /** 获取模板的引导问题 */
  function getPrompts(type: DialogueTemplateType): string[] {
    const tpl = getTemplate(type)
    return tpl ? [...tpl.prompts] : []
  }

  /** 记录模板使用 */
  function recordUsage(type: DialogueTemplateType): void {
    const tpl = templates.value.find(t => t.type === type)
    if (tpl) {
      tpl.usageCount++
      saveTemplates()
    }
  }

  /** 获取推荐模板（基于时间） */
  function getRecommendedTemplates(): DialogueTemplate[] {
    const hour = new Date().getHours()
    const day = new Date().getDay()

    const recommended: DialogueTemplateType[] = []

    if (hour >= 6 && hour <= 10) {
      recommended.push('morning_checkin')
    }
    if (hour >= 20 || hour <= 2) {
      recommended.push('evening_reflection')
    }
    if (day === 0 || day === 6) {
      recommended.push('weekly_review')
    }

    return recommended
      .map(type => getTemplate(type))
      .filter((t): t is DialogueTemplate => !!t)
  }

  /** 按使用频率排序 */
  const popularTemplates = computed(() =>
    [...templates.value].sort((a, b) => b.usageCount - a.usageCount),
  )

  return {
    templates,
    getTemplate,
    getPrompts,
    recordUsage,
    getRecommendedTemplates,
    popularTemplates,
  }
}

// ============================================================
// 意图反馈学习
// ============================================================

export function useIntentFeedbackLearning() {
  const feedbacks = ref<IntentFeedback[]>(loadFeedbacks())
  const learningModel = ref<IntentLearningModel>(loadLearningModel())

  function loadFeedbacks(): IntentFeedback[] {
    return storage.getKV<IntentFeedback[]>(FEEDBACK_KEY, [])
  }

  function saveFeedbacks() {
    storage.setKV(FEEDBACK_KEY, feedbacks.value)
  }

  function loadLearningModel(): IntentLearningModel {
    return storage.getKV<IntentLearningModel>(LEARNING_MODEL_KEY, {
      keywordWeights: {},
      totalFeedback: 0,
      correctionRate: 0,
      lastTrainedAt: new Date().toISOString(),
    })
  }

  function saveLearningModel() {
    storage.setKV(LEARNING_MODEL_KEY, learningModel.value)
  }

  /**
   * 记录意图反馈
   */
  function recordFeedback(
    input: string,
    parsedIntent: IntentCategory,
    confirmed: boolean,
    correctedIntent?: IntentCategory,
  ): void {
    const feedback: IntentFeedback = {
      input: input.toLowerCase().trim(),
      parsedIntent,
      confirmed,
      correctedIntent,
      feedbackAt: new Date().toISOString(),
    }

    feedbacks.value.push(feedback)
    learningModel.value.totalFeedback++

    // 更新关键词权重
    const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    const targetIntent = confirmed ? parsedIntent : correctedIntent

    if (targetIntent) {
      if (!learningModel.value.keywordWeights[targetIntent]) {
        learningModel.value.keywordWeights[targetIntent] = {}
      }

      for (const word of words) {
        const current = learningModel.value.keywordWeights[targetIntent][word] || 0
        learningModel.value.keywordWeights[targetIntent][word] = current + 1
      }
    }

    // 如果不确认，降低原意图的关键词权重
    if (!confirmed && parsedIntent !== correctedIntent) {
      if (learningModel.value.keywordWeights[parsedIntent]) {
        for (const word of words) {
          const current = learningModel.value.keywordWeights[parsedIntent][word] || 0
          learningModel.value.keywordWeights[parsedIntent][word] = Math.max(0, current - 0.5)
        }
      }
    }

    // 更新修正率
    const corrections = feedbacks.value.filter(f => !f.confirmed).length
    learningModel.value.correctionRate = feedbacks.value.length > 0
      ? Math.round((corrections / feedbacks.value.length) * 100) / 100
      : 0

    learningModel.value.lastTrainedAt = new Date().toISOString()

    // 限制反馈数量
    if (feedbacks.value.length > 500) {
      feedbacks.value = feedbacks.value.slice(-300)
    }

    saveFeedbacks()
    saveLearningModel()
  }

  /**
   * 基于学习模型辅助意图识别
   * 返回调整后的意图候选
   */
  function suggestIntent(input: string, candidates: { intent: IntentCategory; confidence: number }[]): {
    intent: IntentCategory
    confidence: number
    adjustedByLearning: boolean
  } | null {
    if (feedbacks.value.length < 5) return null

    const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    const model = learningModel.value

    // 计算每个候选意图的学习得分
    const scores: Record<string, number> = {}

    for (const candidate of candidates) {
      let learningScore = 0
      const weights = model.keywordWeights[candidate.intent]
      if (weights) {
        for (const word of words) {
          learningScore += weights[word] || 0
        }
      }
      scores[candidate.intent] = learningScore
    }

    // 找到最高学习得分
    let bestIntent = candidates[0].intent
    let bestLearningScore = scores[bestIntent] || 0

    for (const candidate of candidates) {
      if ((scores[candidate.intent] || 0) > bestLearningScore) {
        bestLearningScore = scores[candidate.intent] || 0
        bestIntent = candidate.intent
      }
    }

    // 如果学习得分显著高于原始意图，调整
    if (bestIntent !== candidates[0].intent && bestLearningScore > 0) {
      const originalConfidence = candidates[0].confidence
      const adjustedConfidence = Math.min(1, originalConfidence + 0.15)
      return {
        intent: bestIntent,
        confidence: adjustedConfidence,
        adjustedByLearning: true,
      }
    }

    return null
  }

  /** 获取学习统计 */
  const learningStats = computed(() => ({
    totalFeedback: learningModel.value.totalFeedback,
    correctionRate: learningModel.value.correctionRate,
    intentCount: Object.keys(learningModel.value.keywordWeights).length,
    lastTrainedAt: learningModel.value.lastTrainedAt,
  }))

  /** 重置学习模型 */
  function resetLearning(): void {
    feedbacks.value = []
    learningModel.value = {
      keywordWeights: {},
      totalFeedback: 0,
      correctionRate: 0,
      lastTrainedAt: new Date().toISOString(),
    }
    saveFeedbacks()
    saveLearningModel()
  }

  return {
    feedbacks,
    learningModel,
    learningStats,
    recordFeedback,
    suggestIntent,
    resetLearning,
  }
}

// ---- 存储键 ----

/** 只读获取全部对话会话（供统一时间线聚合使用） */
export function getDialogueSessions(): DialogueSession[] {
  return storage.getKV<DialogueSession[]>(SESSIONS_KEY, [])
}
