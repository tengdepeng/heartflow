// ============================================================
// 心流工坊 · AI 引擎主类
// P3: AI 引擎 — 核心编排器
// ============================================================

import type { AIMessage, AIResponse, AIEngineStats, AIEngineState, AIStreamCallbacks } from './types'
import { createProvider, registerProvider, getProvider, clearProviders } from './provider'
import { getAIEngineConfig, isAIEngineEnabled } from './config'
import { buildAdvisorSystemPrompt, buildDingyinSystemPrompt, buildAnnualDialoguePrompt } from './prompt'
import type { AdvisorRole, AdvisorPersonality } from '../../types'
import {
  makeConversationId,
  addMessage,
  setSystemPrompt,
  clearConversation,
  getRecentAdvisorConversation,
} from './memory'

// ---- 引擎实例 ----

/**
 * 心流工坊 AI 引擎
 * 负责管理 AI 提供商、对话记忆、提示词生成，并提供统一的调用接口。
 */
class AIEngine {
  private _state: AIEngineState = 'idle'
  private _stats: AIEngineStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    averageLatency: 0,
    lastActivityAt: null,
    state: 'idle',
  }

  /** 获取当前引擎状态 */
  get state(): AIEngineState {
    return this._state
  }

  /** 获取引擎统计信息 */
  get stats(): AIEngineStats {
    return { ...this._stats }
  }

  /**
   * 初始化引擎：从配置加载并注册提供商
   */
  initialize(): void {
    const config = getAIEngineConfig()
    if (!config.enabled) return

    // 清除旧注册
    clearProviders()

    // 注册所有配置的提供商
    for (const [id, providerConfig] of Object.entries(config.providers)) {
      const provider = createProvider(id, providerConfig)
      registerProvider(id, provider)
    }

    this._state = 'idle'
  }

  /**
   * 检查连接状态
   */
  async checkConnection(providerId?: string): Promise<boolean> {
    const id = providerId ?? getAIEngineConfig().activeProviderId
    const provider = getProvider(id)
    if (!provider) return false

    this._state = 'connecting'
    const ok = await provider.checkConnection()
    this._state = ok ? 'connected' : 'error'
    return ok
  }

  /**
   * 发送消息并获取回应
   * @param messages 消息列表
   * @param providerId 可选：指定提供商，默认使用当前激活的
   */
  async chat(messages: AIMessage[], providerId?: string): Promise<AIResponse> {
    if (!isAIEngineEnabled()) {
      return {
        text: '',
        model: 'disabled',
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        latency: 0,
        success: false,
        error: 'AI 引擎未启用',
      }
    }

    const id = providerId ?? getAIEngineConfig().activeProviderId
    const provider = getProvider(id)
    if (!provider) {
      return {
        text: '',
        model: 'unknown',
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        latency: 0,
        success: false,
        error: '未找到提供商配置，请先在设置中配置 AI 提供商',
      }
    }

    this._state = 'connecting'
    this._stats.totalRequests++

    const response = await provider.chat(messages)

    if (response.success) {
      this._state = 'connected'
      this._stats.successfulRequests++
      this._stats.totalTokens += response.tokenUsage.total
      // 更新平均延迟（指数移动平均）
      this._stats.averageLatency = this._stats.averageLatency
        ? this._stats.averageLatency * 0.7 + response.latency * 0.3
        : response.latency
    } else {
      this._state = 'error'
      this._stats.failedRequests++
    }

    this._stats.lastActivityAt = new Date().toISOString()
    return response
  }

  /**
   * 流式聊天
   */
  async chatStream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    providerId?: string,
  ): Promise<void> {
    if (!isAIEngineEnabled()) {
      callbacks.onError(new Error('AI 引擎未启用'))
      return
    }

    const id = providerId ?? getAIEngineConfig().activeProviderId
    const provider = getProvider(id)
    if (!provider) {
      callbacks.onError(new Error('未找到提供商配置'))
      return
    }

    this._state = 'connecting'
    this._stats.totalRequests++

    const wrappedCallbacks: AIStreamCallbacks = {
      ...callbacks,
      onComplete: (text: string) => {
        this._state = 'connected'
        this._stats.successfulRequests++
        this._stats.lastActivityAt = new Date().toISOString()
        callbacks.onComplete(text)
      },
      onError: (err: Error) => {
        this._state = 'error'
        this._stats.failedRequests++
        callbacks.onError(err)
      },
    }

    await provider.chatStream(messages, wrappedCallbacks)
  }

  // ---- 幕僚集成方法 ----

  /**
   * 获取幕僚的 AI 回应（替代 generateReply）
   * @param advisorId 幕僚 ID
   * @param name 幕僚名称
   * @param role 幕僚角色
   * @param personality 幕僚性格
   * @param affinity 好感度
   * @param userText 用户输入
   * @param turnCount 对话轮次
   */
  async getAdvisorReply(
    advisorId: string,
    name: string,
    role: AdvisorRole,
    personality: AdvisorPersonality,
    affinity: number,
    userText: string,
    turnCount: number,
  ): Promise<string> {
    const conversationId = makeConversationId(advisorId)

    // 构建系统提示词
    const systemPrompt = buildAdvisorSystemPrompt({
      name,
      role,
      personality,
      affinity,
      turnCount,
      lastUserMessage: userText,
    })

    // 设置系统提示词
    setSystemPrompt(conversationId, systemPrompt)

    // 添加用户消息到记忆
    addMessage(conversationId, { role: 'user', content: userText })

    // 获取最近对话上下文
    const messages = getRecentAdvisorConversation(advisorId)

    // 调用 AI
    const response = await this.chat(messages)

    if (response.success) {
      // 添加 AI 回应到记忆
      addMessage(conversationId, { role: 'assistant', content: response.text })
      return response.text
    }

    // AI 失败时返回空（调用方将回退到规则回应）
    return ''
  }

  /**
   * 获取定音锤总结（AI 版本）
   */
  async getDingyinReply(
    _advisorId: string,
    name: string,
    personality: AdvisorPersonality,
    eventType: string,
    count: number,
  ): Promise<string> {
    const systemPrompt = buildDingyinSystemPrompt({
      advisorName: name,
      personality,
      eventType,
      count,
    })

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为 ${eventType} 的 ${count} 次积累做一个总结。` },
    ])

    if (response.success && response.text) {
      return response.text
    }

    return ''
  }

  /**
   * 获取年度/季度对话开场
   */
  async getAnnualDialogueReply(
    _advisorId: string,
    name: string,
    personality: AdvisorPersonality,
    dialogueType: 'annual' | 'quarterly',
  ): Promise<string> {
    const systemPrompt = buildAnnualDialoguePrompt({
      advisorName: name,
      personality,
      dialogueType,
    })

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '开始我们的对话吧。' },
    ])

    if (response.success && response.text) {
      return response.text
    }

    return ''
  }

  /**
   * 重置对话（清除记忆）
   */
  resetConversation(advisorId: string): void {
    const conversationId = makeConversationId(advisorId)
    clearConversation(conversationId)
  }

  /**
   * 重置引擎统计
   */
  resetStats(): void {
    this._stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      averageLatency: 0,
      lastActivityAt: null,
      state: this._state,
    }
  }

  /**
   * 重置引擎（用于测试）
   */
  reset(): void {
    this._state = 'idle'
    this.resetStats()
  }
}

/** 全局单例 */
export const aiEngine = new AIEngine()

// ---- 便捷导出 ----

export { makeConversationId } from './memory'
export { getAIEngineConfig, isAIEngineEnabled, hasUsableProvider } from './config'
export type { AIMessage, AIResponse, AIEngineConfig, AIMemoryConfig, AIPromptTemplate, AIStreamCallbacks } from './types'

// ---- AI 引擎增强 ----
export { ModelManager, modelManager } from './model-manager'
export type { ModelEntry, FallbackStrategy, FallbackPolicy, ModelQuota } from './model-manager'
export { StreamOptimizer, DEFAULT_STREAM_CONFIG } from './stream-optimizer'
export type { StreamConfig, StreamStats } from './stream-optimizer'

// ---- Tauri AI 提供商 ----
export { TauriAIProvider, createTauriAIProvider } from './tauri-provider'

// ---- AI 桥接层 ----
// 注意：useAIBridge 不再经本 barrel 再导出，以消除 index ↔ ai-bridge 的循环依赖。
// 需要使用时请直接从 './ai-bridge' 导入；aiEngine 等核心导出仍在此保留。