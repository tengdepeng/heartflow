// ============================================================
// AI 引擎 · 类型定义 / 默认常量测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODEL_CONFIG,
  DEFAULT_OPENAI_PROVIDER,
  DEFAULT_MEMORY_CONFIG,
  DEFAULT_AI_ENGINE_CONFIG,
} from '../types'

describe('AI 引擎默认常量', () => {
  it('DEFAULT_MODEL_CONFIG 有合理的默认值', () => {
    expect(DEFAULT_MODEL_CONFIG.model).toBe('gpt-4o-mini')
    expect(DEFAULT_MODEL_CONFIG.temperature).toBe(0.7)
    expect(DEFAULT_MODEL_CONFIG.maxTokens).toBe(1024)
    expect(DEFAULT_MODEL_CONFIG.contextWindow).toBe(8192)
    expect(DEFAULT_MODEL_CONFIG.topP).toBe(0.9)
    expect(DEFAULT_MODEL_CONFIG.frequencyPenalty).toBe(0.3)
    expect(DEFAULT_MODEL_CONFIG.presencePenalty).toBe(0.3)
  })

  it('DEFAULT_OPENAI_PROVIDER 使用默认模型配置的深拷贝', () => {
    expect(DEFAULT_OPENAI_PROVIDER.type).toBe('openai')
    // 宪法第1条（本地私有）：默认不预设云端地址，避免静默外呼 api.openai.com（fail-closed）。
    expect(DEFAULT_OPENAI_PROVIDER.baseUrl).toBe('')
    expect(DEFAULT_OPENAI_PROVIDER.apiKey).toBe('')
    expect(DEFAULT_OPENAI_PROVIDER.timeout).toBe(30000)
    expect(DEFAULT_OPENAI_PROVIDER.maxRetries).toBe(2)
    // 确认是深拷贝，不是引用
    expect(DEFAULT_OPENAI_PROVIDER.model).not.toBe(DEFAULT_MODEL_CONFIG)
    expect(DEFAULT_OPENAI_PROVIDER.model.model).toBe(DEFAULT_MODEL_CONFIG.model)
  })

  it('DEFAULT_OPENAI_PROVIDER 默认不预设云端地址（第1条·本地私有·fail-closed）', () => {
    expect(DEFAULT_OPENAI_PROVIDER.baseUrl).toBe('')
    expect(DEFAULT_OPENAI_PROVIDER.baseUrl).not.toContain('api.openai.com')
    expect(DEFAULT_OPENAI_PROVIDER.apiKey).toBe('')
  })

  it('DEFAULT_MEMORY_CONFIG 有合理的默认值', () => {
    expect(DEFAULT_MEMORY_CONFIG.maxRounds).toBe(10)
    expect(DEFAULT_MEMORY_CONFIG.enableSummarization).toBe(true)
    expect(DEFAULT_MEMORY_CONFIG.summaryThreshold).toBe(8)
    expect(DEFAULT_MEMORY_CONFIG.preserveSystemPrompt).toBe(true)
  })

  it('DEFAULT_AI_ENGINE_CONFIG 默认禁用', () => {
    expect(DEFAULT_AI_ENGINE_CONFIG.enabled).toBe(false)
    expect(DEFAULT_AI_ENGINE_CONFIG.activeProviderId).toBe('default')
    expect(DEFAULT_AI_ENGINE_CONFIG.streamEnabled).toBe(false)
    expect(DEFAULT_AI_ENGINE_CONFIG.debugMode).toBe(false)
  })

  it('DEFAULT_AI_ENGINE_CONFIG 包含默认提供商', () => {
    expect(DEFAULT_AI_ENGINE_CONFIG.providers.default).toBeDefined()
    expect(DEFAULT_AI_ENGINE_CONFIG.providers.default.type).toBe('openai')
  })

  it('DEFAULT_AI_ENGINE_CONFIG 使用默认记忆配置', () => {
    expect(DEFAULT_AI_ENGINE_CONFIG.memory.maxRounds).toBe(DEFAULT_MEMORY_CONFIG.maxRounds)
    expect(DEFAULT_AI_ENGINE_CONFIG.memory.enableSummarization).toBe(true)
  })

  it('DEFAULT_OPENAI_PROVIDER 的 fallbackModels 可选', () => {
    expect(DEFAULT_OPENAI_PROVIDER.fallbackModels).toBeUndefined()
  })
})