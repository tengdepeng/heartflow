// ============================================================
// 镜我 · LLM 集成桥接层（P16-13）
// 深层对话理解、意图精炼、情绪分析、深度反思生成
// ============================================================

import { ref, computed } from 'vue'
import type { AIMessage } from '@/engine/ai/types'

// ============================================================
// 类型定义
// ============================================================

/** LLM 桥接配置 */
export interface LLMBridgeConfig {
  /** 是否启用 LLM */
  enabled: boolean
  /** 是否使用流式响应 */
  useStreaming: boolean
  /** 最大对话轮数 */
  maxTurns: number
  /** 系统提示词模板 */
  systemPrompt: string
  /** 温度参数 */
  temperature: number
  /** 是否启用意图精炼 */
  enableIntentRefinement: boolean
  /** 是否启用情绪分析 */
  enableEmotionAnalysis: boolean
  /** 是否启用深度反思 */
  enableDeepReflection: boolean
}

/** 意图精炼结果 */
export interface IntentRefinementResult {
  /** 原始意图 */
  originalIntent: string
  /** 精炼后的意图 */
  refinedIntent: string
  /** 置信度 */
  confidence: number
  /** 提取的参数 */
  extractedParams: Record<string, unknown>
  /** 子意图 */
  subIntents: string[]
  /** 情感色彩 */
  emotionalTone: string
  /** 复杂度评分 */
  complexity: number
}

/** 情绪分析结果 */
export interface EmotionAnalysisResult {
  /** 主要情绪 */
  primaryEmotion: string
  /** 情绪强度 (0-1) */
  intensity: number
  /** 情绪分布 */
  emotionDistribution: Record<string, number>
  /** 情绪变化趋势 */
  trend: 'rising' | 'falling' | 'stable' | 'volatile'
  /** 潜在需求 */
  underlyingNeeds: string[]
  /** 建议回应方式 */
  suggestedResponseTone: string
  /** 危机信号 */
  crisisSignals: string[]
}

/** 深度反思结果 */
export interface DeepReflectionResult {
  /** 反思主题 */
  theme: string
  /** 核心洞察 */
  insights: string[]
  /** 引导性问题 */
  guidingQuestions: string[]
  /** 行动建议 */
  actionSuggestions: string[]
  /** 关联模式 */
  relatedPatterns: string[]
  /** 成长视角 */
  growthPerspective: string
}

/** 对话上下文 */
export interface MirrorDialogueContext {
  /** 近期对话摘要 */
  recentSummary: string
  /** 用户当前情绪状态 */
  currentMood: string
  /** 活跃话题 */
  activeTopics: string[]
  /** 当日时间 */
  timeOfDay: string
  /** 对话轮数 */
  turnCount: number
}

/** LLM 响应 */
export interface LLMResponse {
  text: string
  model: string
  tokenUsage: { prompt: number; completion: number; total: number }
  latency: number
  success: boolean
  error?: string
}

/** 流式回调 */
export interface LLMStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_LLM_BRIDGE_CONFIG: LLMBridgeConfig = {
  enabled: true,
  useStreaming: false,
  maxTurns: 20,
  systemPrompt: `你是用户的"镜我"——一面映照内心的镜子。你的职责是：

1. **深度倾听**：理解用户的言外之意，捕捉情绪波动和潜在需求
2. **温和反馈**：以共情的方式回应用户，避免说教和评判
3. **引导觉察**：通过提问帮助用户更清晰地认识自己的想法和感受
4. **成长陪伴**：记录用户的成长轨迹，在适当时机给予鼓励和洞见

对话原则：
- 使用简洁、温暖的中文
- 优先理解情绪，再讨论事实
- 不急于给出解决方案，先帮助用户梳理思路
- 在用户情绪低落时给予支持，在用户兴奋时分享喜悦
- 保持真诚，不扮演"全知"角色`,
  temperature: 0.7,
  enableIntentRefinement: true,
  enableEmotionAnalysis: true,
  enableDeepReflection: true,
}

// ============================================================
// 系统提示词模板
// ============================================================

/** 意图精炼提示词 */
const INTENT_REFINEMENT_PROMPT = `你是一个意图分析专家。请分析用户输入，返回 JSON 格式的结果。

用户输入："{input}"
原始意图分类：{originalIntent}

请返回：
{
  "refinedIntent": "精炼后的意图（更精确的描述）",
  "confidence": 0.0-1.0,
  "extractedParams": { "参数名": "参数值" },
  "subIntents": ["子意图1", "子意图2"],
  "emotionalTone": "情感色彩（如：期待、焦虑、平静、兴奋、迷茫）",
  "complexity": 1-10
}

只返回 JSON，不要包含其他内容。`

/** 情绪分析提示词 */
const EMOTION_ANALYSIS_PROMPT = `你是一个情绪分析专家。请分析用户输入中的情绪，返回 JSON 格式的结果。

用户输入："{input}"
已知上下文：{context}

请返回：
{
  "primaryEmotion": "主要情绪",
  "intensity": 0.0-1.0,
  "emotionDistribution": { "情绪名": 0.0-1.0 },
  "trend": "rising|falling|stable|volatile",
  "underlyingNeeds": ["潜在需求1", "潜在需求2"],
  "suggestedResponseTone": "建议的回应语气",
  "crisisSignals": ["危机信号，如无可为空数组"]
}

只返回 JSON，不要包含其他内容。`

/** 深度反思提示词 */
const DEEP_REFLECTION_PROMPT = `你是一个深度反思引导者。基于用户的输入，生成有洞察力的反思内容，返回 JSON 格式。

用户输入："{input}"
对话上下文：{context}

请返回：
{
  "theme": "反思主题",
  "insights": ["洞察1", "洞察2", "洞察3"],
  "guidingQuestions": ["引导问题1", "引导问题2", "引导问题3"],
  "actionSuggestions": ["行动建议1", "行动建议2"],
  "relatedPatterns": ["关联模式1", "关联模式2"],
  "growthPerspective": "从成长角度的视角"
}

只返回 JSON，不要包含其他内容。`

// ============================================================
// LLM 桥接层 Composable
// ============================================================

export function useLLMBridge(config?: Partial<LLMBridgeConfig>) {
  // ---- 配置 ----
  const bridgeConfig = ref<LLMBridgeConfig>({
    ...DEFAULT_LLM_BRIDGE_CONFIG,
    ...config,
  })

  // ---- 状态 ----
  const isProcessing = ref(false)
  const lastResponse = ref<LLMResponse | null>(null)
  const lastError = ref<string | null>(null)
  const responseHistory = ref<LLMResponse[]>([])
  const callCount = ref(0)
  const totalTokens = ref(0)

  // ---- 对话上下文 ----
  const dialogueContext = ref<MirrorDialogueContext>({
    recentSummary: '',
    currentMood: 'neutral',
    activeTopics: [],
    timeOfDay: 'morning',
    turnCount: 0,
  })

  // ---- 内部状态 ----

  // ---- 派生状态 ----
  const averageLatency = computed(() => {
    if (responseHistory.value.length === 0) return 0
    return Math.round(
      responseHistory.value.reduce((s, r) => s + r.latency, 0) / responseHistory.value.length,
    )
  })

  const successRate = computed(() => {
    if (responseHistory.value.length === 0) return 100
    const successes = responseHistory.value.filter(r => r.success).length
    return Math.round((successes / responseHistory.value.length) * 100)
  })

  // ============================================================
  // AI 引擎调用辅助
  // ============================================================

  /** 动态导入 AI 引擎（避免循环依赖） */
  async function getAIEngine() {
    try {
      const { aiEngine } = await import('@/engine/ai')
      return aiEngine
    } catch {
      return null
    }
  }

  /** 构建系统提示词 */
  function buildSystemPrompt(): string {
    const ctx = dialogueContext.value
    let prompt = bridgeConfig.value.systemPrompt

    if (ctx.recentSummary) {
      prompt += `\n\n近期对话摘要：${ctx.recentSummary}`
    }
    if (ctx.currentMood !== 'neutral') {
      prompt += `\n用户当前情绪状态：${ctx.currentMood}`
    }
    if (ctx.activeTopics.length > 0) {
      prompt += `\n正在讨论的话题：${ctx.activeTopics.join('、')}`
    }
    prompt += `\n当前时间：${ctx.timeOfDay}`

    return prompt
  }

  /** 构建消息列表 */
  function buildMessages(userInput: string, history: Array<{ role: string; content: string }> = []): AIMessage[] {
    const messages: AIMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
    ]

    // 添加历史对话（最近 N 轮）
    const recentHistory = history.slice(-bridgeConfig.value.maxTurns * 2)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    // 添加当前用户输入
    messages.push({ role: 'user', content: userInput })

    return messages
  }

  // ============================================================
  // 核心 LLM 调用
  // ============================================================

  /** 发送消息并获取回复 */
  async function chat(
    userInput: string,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<LLMResponse> {
    isProcessing.value = true
    lastError.value = null
    callCount.value++

    try {
      const engine = await getAIEngine()
      if (!engine) {
        throw new Error('AI 引擎不可用')
      }

      const messages = buildMessages(userInput, history)
      const response = await engine.chat(messages)

      if (response.success) {
        lastResponse.value = response
        responseHistory.value = [...responseHistory.value.slice(-99), response]
        totalTokens.value += response.tokenUsage.total
        dialogueContext.value.turnCount++
      } else {
        lastError.value = response.error ?? '未知错误'
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'LLM 调用失败'
      lastError.value = errorMsg
      return {
        text: '',
        model: 'error',
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        latency: 0,
        success: false,
        error: errorMsg,
      }
    } finally {
      isProcessing.value = false
    }
  }

  /** 流式发送消息 */
  async function chatStream(
    userInput: string,
    callbacks: LLMStreamCallbacks,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<void> {
    isProcessing.value = true
    lastError.value = null
    callCount.value++

    try {
      const engine = await getAIEngine()
      if (!engine) {
        throw new Error('AI 引擎不可用')
      }

      const messages = buildMessages(userInput, history)
      const startTime = performance.now()
      let fullText = ''

      await engine.chatStream(messages, {
        onToken: (token: string) => {
          fullText += token
          callbacks.onToken(token)
        },
        onComplete: () => {
          const latency = performance.now() - startTime
          const response: LLMResponse = {
            text: fullText,
            model: 'streaming',
            tokenUsage: { prompt: 0, completion: 0, total: 0 },
            latency,
            success: true,
          }
          lastResponse.value = response
          responseHistory.value = [...responseHistory.value.slice(-99), response]
          dialogueContext.value.turnCount++
          callbacks.onComplete(fullText)
        },
        onError: (error: Error) => {
          lastError.value = error.message
          callbacks.onError(error)
        },
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '流式调用失败'
      lastError.value = errorMsg
      callbacks.onError(new Error(errorMsg))
    } finally {
      isProcessing.value = false
    }
  }

  // ============================================================
  // 意图精炼
  // ============================================================

  /** 使用 LLM 精炼意图分类 */
  async function refineIntent(
    userInput: string,
    originalIntent: string,
  ): Promise<IntentRefinementResult> {
    if (!bridgeConfig.value.enableIntentRefinement) {
      return {
        originalIntent,
        refinedIntent: originalIntent,
        confidence: 0.5,
        extractedParams: {},
        subIntents: [],
        emotionalTone: 'neutral',
        complexity: 1,
      }
    }

    try {
      const prompt = INTENT_REFINEMENT_PROMPT
        .replace('{input}', userInput)
        .replace('{originalIntent}', originalIntent)

      const response = await chat(prompt, [])
      if (!response.success) {
        return fallbackRefinement(originalIntent)
      }

      const parsed = parseJsonResponse<IntentRefinementResult>(response.text, () =>
        fallbackRefinement(originalIntent),
      )
      return { ...parsed, originalIntent }
    } catch {
      return fallbackRefinement(originalIntent)
    }
  }

  function fallbackRefinement(originalIntent: string): IntentRefinementResult {
    return {
      originalIntent,
      refinedIntent: originalIntent,
      confidence: 0.5,
      extractedParams: {},
      subIntents: [],
      emotionalTone: 'neutral',
      complexity: 1,
    }
  }

  // ============================================================
  // 情绪分析
  // ============================================================

  /** 使用 LLM 进行情绪分析 */
  async function analyzeEmotion(
    userInput: string,
    context?: string,
  ): Promise<EmotionAnalysisResult> {
    if (!bridgeConfig.value.enableEmotionAnalysis) {
      return fallbackEmotionAnalysis()
    }

    try {
      const prompt = EMOTION_ANALYSIS_PROMPT
        .replace('{input}', userInput)
        .replace('{context}', context ?? '无')

      const response = await chat(prompt, [])
      if (!response.success) {
        return fallbackEmotionAnalysis()
      }

      return parseJsonResponse<EmotionAnalysisResult>(response.text, () =>
        fallbackEmotionAnalysis(),
      )
    } catch {
      return fallbackEmotionAnalysis()
    }
  }

  function fallbackEmotionAnalysis(): EmotionAnalysisResult {
    return {
      primaryEmotion: 'neutral',
      intensity: 0.3,
      emotionDistribution: { neutral: 1.0 },
      trend: 'stable',
      underlyingNeeds: [],
      suggestedResponseTone: '温和',
      crisisSignals: [],
    }
  }

  // ============================================================
  // 深度反思生成
  // ============================================================

  /** 使用 LLM 生成深度反思 */
  async function generateReflection(
    userInput: string,
    context?: string,
  ): Promise<DeepReflectionResult> {
    if (!bridgeConfig.value.enableDeepReflection) {
      return fallbackReflection()
    }

    try {
      const prompt = DEEP_REFLECTION_PROMPT
        .replace('{input}', userInput)
        .replace('{context}', context ?? '无')

      const response = await chat(prompt, [])
      if (!response.success) {
        return fallbackReflection()
      }

      return parseJsonResponse<DeepReflectionResult>(response.text, () =>
        fallbackReflection(),
      )
    } catch {
      return fallbackReflection()
    }
  }

  function fallbackReflection(): DeepReflectionResult {
    return {
      theme: '日常反思',
      insights: ['今天是一个新的开始'],
      guidingQuestions: ['今天什么让你感到开心？', '有什么想对自己说的吗？'],
      actionSuggestions: ['花 5 分钟写下今天的感受'],
      relatedPatterns: [],
      growthPerspective: '每一天都是成长的机会',
    }
  }

  // ============================================================
  // 对话上下文管理
  // ============================================================

  /** 更新对话上下文 */
  function updateContext(update: Partial<MirrorDialogueContext>): void {
    dialogueContext.value = { ...dialogueContext.value, ...update }
  }

  /** 重置对话上下文 */
  function resetContext(): void {
    dialogueContext.value = {
      recentSummary: '',
      currentMood: 'neutral',
      activeTopics: [],
      timeOfDay: getTimeOfDay(),
      turnCount: 0,
    }
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /** 更新桥接配置 */
  function updateConfig(update: Partial<LLMBridgeConfig>): void {
    bridgeConfig.value = { ...bridgeConfig.value, ...update }
  }

  /** 重置桥接状态 */
  function reset(): void {
    isProcessing.value = false
    lastResponse.value = null
    lastError.value = null
    responseHistory.value = []
    callCount.value = 0
    totalTokens.value = 0
    resetContext()
  }

  return {
    // 配置
    bridgeConfig,
    updateConfig,

    // 状态
    isProcessing,
    lastResponse,
    lastError,
    responseHistory,
    callCount,
    totalTokens,
    dialogueContext,

    // 派生状态
    averageLatency,
    successRate,

    // 核心调用
    chat,
    chatStream,

    // 高级功能
    refineIntent,
    analyzeEmotion,
    generateReflection,

    // 上下文管理
    updateContext,
    resetContext,
    buildSystemPrompt,

    // 生命周期
    reset,

    // 常量
    DEFAULT_LLM_BRIDGE_CONFIG,
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 获取当前时段 */
function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨'
  if (hour < 9) return '早晨'
  if (hour < 12) return '上午'
  if (hour < 14) return '中午'
  if (hour < 18) return '下午'
  if (hour < 21) return '傍晚'
  return '夜晚'
}

/** 安全解析 JSON 响应 */
function parseJsonResponse<T>(text: string, fallback: () => T): T {
  try {
    // 尝试直接解析
    return JSON.parse(text) as T
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T
      } catch {
        return fallback()
      }
    }
    return fallback()
  }
}