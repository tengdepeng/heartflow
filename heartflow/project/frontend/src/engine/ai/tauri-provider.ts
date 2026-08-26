// ============================================================
// Tauri AI 提供商适配器
// 实现 AIProvider 接口，将 AI 调用路由到 Rust 后端
// 通过 Tauri Bridge 的 cmd_ai_* 命令调用 AiAgent
// ============================================================

import type { AIProvider } from './provider'
import type { AIProviderConfig, AIMessage, AIResponse, AIStreamCallbacks } from './types'
import { useDataOutflow, sanitizeHost } from '../data-outflow'
import { loadSchema } from '../storage/core'
import { checkExternalAIGate } from './external-gate'
import {
  aiChat,
  aiConfigure,
  aiGetStatus,
  aiAnalyzeSentiment,
  aiGenerateSummary,
  aiSuggestActions,
  type AiAgentConfig,
  type AiAgentStatus,
  type AiMessage,
} from '../tauri-bridge'

// ---- 类型转换辅助 ----

/**
 * 将前端 AIProviderConfig 转换为 Rust 后端 AiAgentConfig
 * 字段名映射：
 *   baseUrl → model_url
 *   apiKey  → api_key
 *   model.model → model_name
 *   model.maxTokens → max_tokens
 *   model.temperature → temperature
 */
function toRustConfig(config: AIProviderConfig): AiAgentConfig {
  // 宪法第1条 fail-closed：从存储读取用户是否已显式同意远程 AI 端点，
  // 随每次同步下发后端，使后端 cmd_ai_* 的出口闸与前端同轴。读取异常回落 false。
  let allowExternal = false
  try {
    allowExternal = loadSchema().config.complianceOverride.allowExternalAI === true
  } catch {
    /* 默认 false（fail-closed） */
  }
  return {
    model_url: config.baseUrl.endsWith('/chat/completions')
      ? config.baseUrl
      : `${config.baseUrl}/chat/completions`,
    api_key: config.apiKey,
    model_name: config.model.model,
    max_tokens: config.model.maxTokens,
    temperature: config.model.temperature,
    allow_external_ai: allowExternal,
  }
}

/**
 * 将前端 AIMessage[] 转换为 Bridge AiMessage[]
 */
function toBridgeMessages(messages: AIMessage[]): AiMessage[] {
  return messages.map(m => ({ role: m.role as AiMessage['role'], content: m.content }))
}

/**
 * 解析 Rust 后端返回的情感分析 JSON
 */
function parseSentimentResult(raw: string): {
  sentiment: string
  confidence: number
  keywords: string[]
  summary: string
} | null {
  try {
    // 尝试提取 JSON（可能被 markdown 代码块包裹）
    let json = raw.trim()
    const match = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      json = match[1].trim()
    }
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * 解析 Rust 后端返回的行动建议 JSON
 */
function parseSuggestionsResult(raw: string): Array<{
  action: string
  category: string
  priority: string
}> {
  try {
    let json = raw.trim()
    const match = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      json = match[1].trim()
    }
    return JSON.parse(json)
  } catch {
    return []
  }
}

// ---- TauriAIProvider ----

/**
 * Tauri AI 提供商
 *
 * 实现 AIProvider 接口，将所有 AI 调用路由到 Rust 后端的 AiAgent。
 * 优势：
 * - 统一的后端 AI 管理（配置持久化到 SQLite）
 * - 跨平台一致的 AI 行为
 * - 后端可访问本地文件系统进行上下文增强
 *
 * 限制：
 * - 不支持流式输出（Rust 后端使用阻塞 HTTP 客户端）
 * - 需要 Tauri 环境（非 Tauri 环境回退到本地 provider）
 */
export class TauriAIProvider implements AIProvider {
  readonly id: string
  readonly displayName: string
  readonly type = 'tauri' as const
  config: AIProviderConfig

  constructor(id: string, config: AIProviderConfig) {
    this.id = id
    this.displayName = config.name ?? 'Tauri AI Agent'
    this.config = config
  }

  /**
   * 检查连接：验证 Rust 后端 AI 代理是否已配置
   */
  async checkConnection(): Promise<boolean> {
    // 宪法第1条出口闸：未授权外部 AI 端点不探测
    if (checkExternalAIGate(this.config.baseUrl)) return false

    // 先同步配置到后端
    await this._syncConfig()

    const result = await aiGetStatus()
    if (!result.success || !result.data) {
      return false
    }
    return result.data.configured
  }

  /**
   * 发送对话到 Rust 后端
   */
  async chat(messages: AIMessage[], signal?: AbortSignal): Promise<AIResponse> {
    const startTime = Date.now()

    // 宪法第1条出口闸：未授权外部 AI 端点直接拦截，不记录流出、不发起请求
    const gate = checkExternalAIGate(this.config.baseUrl)
    if (gate) {
      return {
        text: '',
        model: this.config.model.model,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        latency: Date.now() - startTime,
        success: false,
        error: gate,
      }
    }

    // 守护室·数据流出日志：对话经 Rust 后端发往外部模型 API（仅记端点，不记载荷）
    try {
      useDataOutflow().recordOutflow('external-ai', '外部模型API', sanitizeHost(this.config.baseUrl), '调用外部模型对话')
    } catch { /* 静默 */ }

    // 确保配置已同步
    await this._syncConfig()

    // 检查取消信号
    if (signal?.aborted) {
      return {
        text: '',
        model: this.config.model.model,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        latency: Date.now() - startTime,
        success: false,
        error: '请求被取消',
      }
    }

    const bridgeMessages = toBridgeMessages(messages)

    try {
      const result = await aiChat(bridgeMessages)

      if (!result.success) {
        return {
          text: '',
          model: this.config.model.model,
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          latency: Date.now() - startTime,
          success: false,
          error: result.error ?? 'AI 代理调用失败',
        }
      }

      return {
        text: result.data ?? '',
        model: this.config.model.model,
        tokenUsage: {
          prompt: this._estimatePromptTokens(messages),
          completion: this._estimateTokens(result.data ?? ''),
          total: this._estimatePromptTokens(messages) + this._estimateTokens(result.data ?? ''),
        },
        latency: Date.now() - startTime,
        success: true,
      }
    } catch (err: any) {
      return {
        text: '',
        model: this.config.model.model,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        latency: Date.now() - startTime,
        success: false,
        error: err.message ?? '未知错误',
      }
    }
  }

  /**
   * 流式对话（Rust 后端不支持原生流式，回退为非流式）
   */
  async chatStream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await this.chat(messages, signal)

    if (response.success && response.text) {
      // 将完整文本一次性发送（模拟流式）
      callbacks.onToken(response.text)
      callbacks.onComplete(response.text)
    } else {
      callbacks.onError(new Error(response.error ?? 'AI 代理调用失败'))
    }
  }

  /**
   * 估算 Token 数
   */
  estimateTokens(messages: AIMessage[]): number {
    let total = 0
    for (const msg of messages) {
      total += Math.ceil(msg.content.length / 4) + 4
    }
    return total + 3
  }

  // ---- Rust 后端特有方法 ----

  /**
   * 情感分析（调用 Rust 后端的 cmd_ai_analyze_sentiment）
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: string
    confidence: number
    keywords: string[]
    summary: string
  } | null> {
    // 宪法第1条出口闸：未授权外部 AI 端点不发起请求
    if (checkExternalAIGate(this.config.baseUrl)) return null

    await this._syncConfig()

    const result = await aiAnalyzeSentiment(text)
    if (!result.success || !result.data) return null

    return parseSentimentResult(result.data)
  }

  /**
   * 生成摘要（调用 Rust 后端的 cmd_ai_generate_summary）
   */
  async generateSummary(entries: string[]): Promise<string | null> {
    // 宪法第1条出口闸：未授权外部 AI 端点不发起请求
    if (checkExternalAIGate(this.config.baseUrl)) return null

    await this._syncConfig()

    const result = await aiGenerateSummary(entries)
    if (!result.success || !result.data) return null

    return result.data
  }

  /**
   * 建议行动（调用 Rust 后端的 cmd_ai_suggest_actions）
   */
  async suggestActions(context: string): Promise<Array<{
    action: string
    category: string
    priority: string
  }>> {
    // 宪法第1条出口闸：未授权外部 AI 端点不发起请求
    if (checkExternalAIGate(this.config.baseUrl)) return []

    await this._syncConfig()

    const result = await aiSuggestActions(context)
    if (!result.success || !result.data) return []

    return parseSuggestionsResult(result.data)
  }

  /**
   * 获取 Rust 后端 AI 代理状态
   */
  async getStatus(): Promise<AiAgentStatus | null> {
    const result = await aiGetStatus()
    if (!result.success || !result.data) return null
    return result.data
  }

  // ---- 内部方法 ----

  /**
   * 将前端配置同步到 Rust 后端
   */
  private async _syncConfig(): Promise<void> {
    const rustConfig = toRustConfig(this.config)
    await aiConfigure(rustConfig)
  }

  /**
   * 估算消息的 prompt token 数
   */
  private _estimatePromptTokens(messages: AIMessage[]): number {
    return this.estimateTokens(messages)
  }

  /**
   * 估算文本的 token 数
   */
  private _estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

// ---- 工厂函数 ----

/**
 * 创建 TauriAIProvider 实例
 */
export function createTauriAIProvider(id: string, config: AIProviderConfig): TauriAIProvider {
  return new TauriAIProvider(id, config)
}