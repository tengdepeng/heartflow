// ============================================================
// 心流工坊 · AI 提供商抽象层
// P3: AI 引擎 — 多提供商统一接口
// ============================================================

import type { AIProviderConfig, AIMessage, AIResponse, AIStreamCallbacks } from './types'
import { useDataOutflow, sanitizeHost } from '../data-outflow'
import { checkExternalAIGate } from './external-gate'

// ---- 抽象接口 ----

/**
 * AI 提供商抽象接口
 * 所有具体提供商必须实现此接口
 */
export interface AIProvider {
  /** 唯一标识 */
  readonly id: string
  /** 提供商显示名称 */
  readonly displayName: string
  /** 提供商类型 */
  readonly type: string
  /** 当前配置 */
  config: AIProviderConfig

  /** 检查连接是否可用 */
  checkConnection(): Promise<boolean>

  /**
   * 发送对话并获取完整回应
   * @param messages 消息列表（含 system prompt）
   * @param signal 可选：取消信号
   */
  chat(messages: AIMessage[], signal?: AbortSignal): Promise<AIResponse>

  /**
   * 流式对话
   * @param messages 消息列表
   * @param callbacks 流式回调
   * @param signal 可选：取消信号
   */
  chatStream(messages: AIMessage[], callbacks: AIStreamCallbacks, signal?: AbortSignal): Promise<void>

  /**
   * 估算消息列表的 token 数
   * @param messages 消息列表
   */
  estimateTokens(messages: AIMessage[]): number
}

// ---- OpenAI 兼容提供商实现 ----

/**
 * OpenAI 兼容 API 的提供商实现
 * 兼容 OpenAI / DeepSeek / Qwen / 硅基流动 / 等所有 OpenAI 格式的 API
 */

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string
  readonly displayName: string
  readonly type = 'openai'
  config: AIProviderConfig

  constructor(id: string, config: AIProviderConfig) {
    this.id = id
    this.displayName = config.name ?? 'OpenAI Compatible'
    this.config = config
  }

  async checkConnection(): Promise<boolean> {
    // 宪法第1条出口闸：未授权外部 AI 端点不探测
    if (checkExternalAIGate(this.config.baseUrl)) return false
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      })
      return response.ok
    } catch {
      return false
    }
  }

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

    // 守护室·数据流出日志：对话内容发往外部模型 API（仅记端点，不记载荷）
    try {
      useDataOutflow().recordOutflow('external-ai', '外部模型API', sanitizeHost(this.config.baseUrl), '调用外部模型对话')
    } catch { /* 静默 */ }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: this.config.model.temperature,
          max_tokens: this.config.model.maxTokens,
          top_p: this.config.model.topP,
          frequency_penalty: this.config.model.frequencyPenalty,
          presence_penalty: this.config.model.presencePenalty,
        }),
        signal,
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        return {
          text: '',
          model: this.config.model.model,
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          latency: Date.now() - startTime,
          success: false,
          error: `API 请求失败: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
        }
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      return {
        text: data.choices?.[0]?.message?.content ?? '',
        model: data.model ?? this.config.model.model,
        tokenUsage: {
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
          total: data.usage?.total_tokens ?? 0,
        },
        latency,
        success: true,
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          text: '',
          model: this.config.model.model,
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          latency: Date.now() - startTime,
          success: false,
          error: '请求被取消',
        }
      }
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

  async chatStream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    // 宪法第1条出口闸：未授权外部 AI 端点直接拦截
    const gate = checkExternalAIGate(this.config.baseUrl)
    if (gate) {
      callbacks.onError(new Error(gate))
      return
    }

    // 守护室·数据流出日志：流式对话同样发往外部模型 API
    try {
      useDataOutflow().recordOutflow('external-ai', '外部模型API', sanitizeHost(this.config.baseUrl), '调用外部模型流式对话')
    } catch { /* 静默 */ }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: this.config.model.temperature,
          max_tokens: this.config.model.maxTokens,
          top_p: this.config.model.topP,
          frequency_penalty: this.config.model.frequencyPenalty,
          presence_penalty: this.config.model.presencePenalty,
          stream: true,
        }),
        signal,
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        callbacks.onError(new Error(
          `流式请求失败: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`
        ))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError(new Error('无法读取响应流'))
        return
      }

      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              fullText += delta
              callbacks.onToken(delta)
            }
          } catch {
            // 跳过无法解析的 chunk
          }
        }
      }

      callbacks.onComplete(fullText)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onError(new Error('流式请求被取消'))
      } else {
        callbacks.onError(err)
      }
    }
  }

  estimateTokens(messages: AIMessage[]): number {
    // 简单估算：每 4 字符 ≈ 1 token
    let total = 0
    for (const msg of messages) {
      total += Math.ceil(msg.content.length / 4) + 4 // +4 用于角色标记
    }
    return total + 3 // 额外标记
  }
}

// ---- 本地提供商实现 ----

/**
 * 本地模型提供商（Ollama / llama.cpp 等）
 * 无需 API Key，本地运行
 */
export class LocalProvider implements AIProvider {
  readonly id: string
  readonly displayName: string
  readonly type = 'local'
  config: AIProviderConfig

  constructor(id: string, config: AIProviderConfig) {
    this.id = id
    this.displayName = config.name ?? 'Local Model'
    this.config = config
  }

  async checkConnection(): Promise<boolean> {
    // 宪法第1条出口闸：未授权外部 AI 端点不探测
    if (checkExternalAIGate(this.config.baseUrl)) return false
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.config.timeout),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async chat(messages: AIMessage[], signal?: AbortSignal): Promise<AIResponse> {
    const startTime = Date.now()

    // 宪法第1条出口闸：未授权外部 AI 端点直接拦截
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

    try {
      // 提取系统提示词
      const systemMsg = messages.find(m => m.role === 'system')
      const chatMessages = messages.filter(m => m.role !== 'system')

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model.model,
          messages: [
            ...(systemMsg ? [{ role: 'system', content: systemMsg.content }] : []),
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          options: {
            temperature: this.config.model.temperature,
            num_predict: this.config.model.maxTokens,
            top_p: this.config.model.topP,
          },
          stream: false,
        }),
        signal,
      })

      if (!response.ok) {
        return {
          text: '',
          model: this.config.model.model,
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          latency: Date.now() - startTime,
          success: false,
          error: `本地模型请求失败: ${response.status}`,
        }
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      return {
        text: data.message?.content ?? '',
        model: data.model ?? this.config.model.model,
        tokenUsage: {
          prompt: data.prompt_eval_count ?? 0,
          completion: data.eval_count ?? 0,
          total: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        latency,
        success: true,
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          text: '',
          model: this.config.model.model,
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          latency: Date.now() - startTime,
          success: false,
          error: '请求被取消',
        }
      }
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

  async chatStream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    // 宪法第1条出口闸：未授权外部 AI 端点直接拦截
    const gate = checkExternalAIGate(this.config.baseUrl)
    if (gate) {
      callbacks.onError(new Error(gate))
      return
    }

    try {
      const systemMsg = messages.find(m => m.role === 'system')
      const chatMessages = messages.filter(m => m.role !== 'system')

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model.model,
          messages: [
            ...(systemMsg ? [{ role: 'system', content: systemMsg.content }] : []),
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          options: {
            temperature: this.config.model.temperature,
            num_predict: this.config.model.maxTokens,
          },
          stream: true,
        }),
        signal,
      })

      if (!response.ok) {
        callbacks.onError(new Error(`本地模型流式请求失败: ${response.status}`))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError(new Error('无法读取响应流'))
        return
      }

      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line)
            const content = parsed.message?.content ?? ''
            if (content) {
              fullText += content
              callbacks.onToken(content)
            }
            if (parsed.done) {
              callbacks.onComplete(fullText)
              return
            }
          } catch {
            // 跳过无法解析的 chunk
          }
        }
      }

      callbacks.onComplete(fullText)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onError(new Error('流式请求被取消'))
      } else {
        callbacks.onError(err)
      }
    }
  }

  estimateTokens(messages: AIMessage[]): number {
    let total = 0
    for (const msg of messages) {
      total += Math.ceil(msg.content.length / 4) + 4
    }
    return total + 3
  }
}

// ---- 工厂函数 ----

/** 根据配置创建提供商实例 */
export function createProvider(id: string, config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'local':
      return new LocalProvider(id, config)
    case 'openai':
    case 'custom':
    default:
      return new OpenAICompatibleProvider(id, config)
  }
}

/** 提供商实例注册表 */
const providerRegistry = new Map<string, AIProvider>()

/** 注册提供商实例 */
export function registerProvider(id: string, provider: AIProvider): void {
  providerRegistry.set(id, provider)
}

/** 获取已注册的提供商 */
export function getProvider(id: string): AIProvider | undefined {
  return providerRegistry.get(id)
}

/** 注销提供商 */
export function unregisterProvider(id: string): boolean {
  return providerRegistry.delete(id)
}

/** 获取所有已注册的提供商 */
export function getAllProviders(): AIProvider[] {
  return Array.from(providerRegistry.values())
}

/** 清除所有提供商注册 */
export function clearProviders(): void {
  providerRegistry.clear()
}