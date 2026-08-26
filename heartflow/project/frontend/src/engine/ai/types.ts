// ============================================================
// 心流工坊 · AI 引擎类型体系
// P3: AI 引擎 — 类型定义
// ============================================================

/**
 * 同步状态，追踪 AI 引擎与外部服务的连接状态
 */
export type AIEngineState = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

/**
 * AI 提供商类型
 */
export type AIProviderType = 'openai' | 'local' | 'custom'

/**
 * 单条消息角色
 */
export type AIMessageRole = 'system' | 'user' | 'assistant'

/**
 * 对话消息
 */
export interface AIMessage {
  role: AIMessageRole
  content: string
  /** 可选：消息时间戳 */
  timestamp?: string
  /** 可选：消息 token 数 */
  tokenCount?: number
}

/**
 * 模型配置
 */
export interface AIModelConfig {
  /** 模型名称（如 gpt-4o-mini, deepseek-chat, qwen2.5） */
  model: string
  /** 温度 0-2 */
  temperature: number
  /** 最大输出 token 数 */
  maxTokens: number
  /** 上下文窗口 token 数上限 */
  contextWindow: number
  /** top-p 采样 */
  topP: number
  /** 频率惩罚 -2~2 */
  frequencyPenalty: number
  /** 存在惩罚 -2~2 */
  presencePenalty: number
}

/**
 * 提供商配置
 */
export interface AIProviderConfig {
  /** 提供商类型 */
  type: AIProviderType
  /** 自定义名称（用于 custom 类型） */
  name?: string
  /** API 基础地址 */
  baseUrl: string
  /** API 密钥（存储时加密） */
  apiKey: string
  /** 模型配置 */
  model: AIModelConfig
  /** 备选模型列表（降价时自动降级） */
  fallbackModels?: string[]
  /** 请求超时（ms） */
  timeout: number
  /** 最大重试次数 */
  maxRetries: number
  /** 重试间隔（ms） */
  retryDelay: number
}

/**
 * 对话记忆配置
 */
export interface AIMemoryConfig {
  /** 保留最近 N 轮对话 */
  maxRounds: number
  /** 达到上限后是否启用摘要压缩 */
  enableSummarization: boolean
  /** 摘要触发轮数阈值 */
  summaryThreshold: number
  /** 系统提示词是否始终保留 */
  preserveSystemPrompt: boolean
}

/**
 * 提示词模板
 */
export interface AIPromptTemplate {
  /** 模板唯一标识 */
  id: string
  /** 模板名称 */
  name: string
  /** 系统提示词模板（支持 {{变量}} 占位符） */
  systemTemplate: string
  /** 用户提示词模板（可选） */
  userTemplate?: string
  /** 变量默认值 */
  defaultVariables?: Record<string, string>
}

/**
 * 对话上下文快照
 */
export interface AIConversationSnapshot {
  /** 对话 ID */
  conversationId: string
  /** 关联的幕僚 ID */
  advisorId: string
  /** 消息列表 */
  messages: AIMessage[]
  /** 最后更新时间 */
  updatedAt: string
  /** 总轮数 */
  totalRounds: number
}

/**
 * AI 回应结果
 */
export interface AIResponse {
  /** 生成的文本 */
  text: string
  /** 使用的模型 */
  model: string
  /** 消耗的 token 数 */
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
  /** 耗时（ms） */
  latency: number
  /** 是否成功 */
  success: boolean
  /** 错误信息（失败时） */
  error?: string
}

/**
 * AI 引擎全局配置（将嵌入 AppConfig）
 */
export interface AIEngineConfig {
  /** 是否启用 AI 引擎 */
  enabled: boolean
  /** 当前激活的提供商 ID */
  activeProviderId: string
  /** 提供商列表 */
  providers: Record<string, AIProviderConfig>
  /** 记忆配置 */
  memory: AIMemoryConfig
  /** 是否启用流式输出 */
  streamEnabled: boolean
  /** 调试模式（记录原始请求/响应） */
  debugMode: boolean
}

/**
 * AI 引擎统计信息
 */
export interface AIEngineStats {
  /** 总请求数 */
  totalRequests: number
  /** 成功请求数 */
  successfulRequests: number
  /** 失败请求数 */
  failedRequests: number
  /** 总消耗 token 数 */
  totalTokens: number
  /** 平均延迟（ms） */
  averageLatency: number
  /** 最后活动时间 */
  lastActivityAt: string | null
  /** 当前状态 */
  state: AIEngineState
}

/**
 * 流式输出回调
 */
export interface AIStreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}

// ---- 默认常量 ----

/** 默认 AI 模型配置 */
export const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1024,
  contextWindow: 8192,
  topP: 0.9,
  frequencyPenalty: 0.3,
  presencePenalty: 0.3,
}

/** 默认 OpenAI 提供商配置 */
export const DEFAULT_OPENAI_PROVIDER: AIProviderConfig = {
  type: 'openai',
  name: 'OpenAI',
  // 宪法第1条（本地私有）：默认不预设云端地址，避免静默外呼 api.openai.com。
  // 启用 AI 前需用户显式配置 baseUrl（本地模型或自有网关）。
  baseUrl: '',
  apiKey: '',
  model: { ...DEFAULT_MODEL_CONFIG },
  timeout: 30000,
  maxRetries: 2,
  retryDelay: 1000,
}

/** 默认记忆配置 */
export const DEFAULT_MEMORY_CONFIG: AIMemoryConfig = {
  maxRounds: 10,
  enableSummarization: true,
  summaryThreshold: 8,
  preserveSystemPrompt: true,
}

/** 默认 AI 引擎配置 */
export const DEFAULT_AI_ENGINE_CONFIG: AIEngineConfig = {
  enabled: false,
  activeProviderId: 'default',
  providers: {
    default: DEFAULT_OPENAI_PROVIDER,
  },
  memory: DEFAULT_MEMORY_CONFIG,
  streamEnabled: false,
  debugMode: false,
}