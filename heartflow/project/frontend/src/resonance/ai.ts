// ============================================================
// 共鸣协议层 · AI 能力接口 (IAICapability)
// 定义 AI 引擎的统一调用契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult } from './types'

/** AI 消息角色 */
export type AIMessageRole = 'system' | 'user' | 'assistant'

/** AI 对话消息 */
export interface AIMessage {
  role: AIMessageRole
  content: string
  name?: string
}

/** AI 调用配置 */
export interface AIConfig {
  /** 模型名称 */
  model: string
  /** 温度参数 (0-2) */
  temperature: number
  /** 最大生成长度 */
  maxTokens: number
  /** 系统提示词 */
  systemPrompt?: string
  /** 停止序列 */
  stopSequences?: string[]
}

/** AI 调用结果 */
export interface AIResponse {
  /** 生成的文本 */
  text: string
  /** 使用的模型 */
  model: string
  /** Token 使用量 */
  tokenUsage: { prompt: number; completion: number; total: number }
  /** 延迟（毫秒） */
  latency: number
  /** 是否成功 */
  success: boolean
  /** 错误信息（失败时） */
  error?: string
}

/** AI 流式回调 */
export interface AIStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}

/** AI 提供商配置 */
export interface AIProviderConfig {
  /** 提供商 ID */
  id: string
  /** 提供商名称 */
  name: string
  /** API 端点 */
  baseUrl: string
  /** API Key（加密存储，接口中不暴露明文） */
  apiKey?: string
  /** 模型列表 */
  models: string[]
  /** 是否启用 */
  enabled: boolean
  /** 提供商类型 */
  type: 'local' | 'builtin' | 'external'
}

/** AI 能力等级 */
export type AICapabilityLevel = 'L0' | 'L1' | 'L2' | 'L3'

/**
 * AI 能力接口
 * 所有 AI 引擎实现必须遵守此契约
 */
export interface IAICapability {
  /** 提供商标识 */
  readonly providerId: string
  /** 提供商名称 */
  readonly providerName: string
  /** 能力等级 */
  readonly level: AICapabilityLevel

  // ---- 生命周期 ----
  /** 初始化 AI 引擎 */
  initialize(config: AIConfig): Promise<ResonanceResult<void>>
  /** 销毁 AI 引擎，释放资源 */
  destroy(): Promise<ResonanceResult<void>>

  // ---- 对话 ----
  /** 发送消息并获取回应（非流式） */
  chat(messages: AIMessage[], config?: Partial<AIConfig>): Promise<ResonanceResult<AIResponse>>
  /** 发送消息并获取流式回应 */
  chatStream(messages: AIMessage[], callbacks: AIStreamCallbacks, config?: Partial<AIConfig>): Promise<void>

  // ---- 连接 ----
  /** 检查连接状态 */
  checkConnection(): Promise<boolean>
  /** 获取当前配置 */
  getConfig(): AIConfig
  /** 更新配置 */
  updateConfig(partial: Partial<AIConfig>): void

  // ---- 状态 ----
  /** 引擎状态：idle | connecting | connected | error */
  readonly state: 'idle' | 'connecting' | 'connected' | 'error'
  /** 是否可用 */
  readonly available: boolean
  /** 重置引擎状态 */
  reset(): void
}

/**
 * AI 提供商注册接口
 * 供 AI 提供商向 AI 能力接口注册
 */
export interface IAIProviderRegistry {
  /** 注册一个 AI 提供商 */
  register(provider: IAICapability): ResonanceResult<void>
  /** 注销一个 AI 提供商 */
  unregister(providerId: string): ResonanceResult<void>
  /** 按 ID 获取提供商 */
  getProvider(providerId: string): IAICapability | undefined
  /** 获取所有已注册的提供商 */
  getAllProviders(): IAICapability[]
  /** 获取当前活跃的提供商 */
  getActiveProvider(): IAICapability | undefined
  /** 设置活跃提供商 */
  setActiveProvider(providerId: string): ResonanceResult<void>
}