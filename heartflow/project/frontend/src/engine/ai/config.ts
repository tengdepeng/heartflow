// ============================================================
// 心流工坊 · AI 引擎配置管理
// P3: AI 引擎 — 配置持久化与读写
// ============================================================

import { storage } from '../storage'
import type { AIEngineConfig, AIProviderConfig, AIMemoryConfig } from './types'
import { DEFAULT_AI_ENGINE_CONFIG } from './types'

/**
 * 从 storage 读取 AI 引擎配置。
 * 哨兵层：无论存量数据来自旧版本迁移还是被外部改脏，返回的对象一定具备完整形状
 * （providers 为对象、enabled/memory/activeProviderId/streamEnabled/debugMode 齐全），
 * 避免消费方对 ai.providers 调 Object.entries(undefined) 抛错、整块外链房白屏。
 */
export function getAIEngineConfig(): AIEngineConfig {
  const appConfig = storage.getConfig()
  // 若尚未初始化，嵌入默认配置
  if (!appConfig.ai) {
    appConfig.ai = { ...DEFAULT_AI_ENGINE_CONFIG, providers: {} }
    // 深拷贝默认提供商
    for (const [key, val] of Object.entries(DEFAULT_AI_ENGINE_CONFIG.providers)) {
      appConfig.ai.providers[key] = { ...val, model: { ...val.model } }
    }
    storage.setConfig(appConfig)
    return appConfig.ai
  }
  // 存量（旧版本迁移 / 外部改脏）可能缺字段却仍为真值，逐项补齐。
  const ai = appConfig.ai
  let dirty = false
  if (!ai.providers || typeof ai.providers !== 'object') {
    ai.providers = {}
    dirty = true
  }
  if (typeof ai.enabled !== 'boolean') {
    ai.enabled = DEFAULT_AI_ENGINE_CONFIG.enabled
    dirty = true
  }
  if (!ai.memory || typeof ai.memory !== 'object') {
    ai.memory = { ...DEFAULT_AI_ENGINE_CONFIG.memory }
    dirty = true
  }
  if (typeof ai.activeProviderId !== 'string' || !ai.activeProviderId) {
    ai.activeProviderId = DEFAULT_AI_ENGINE_CONFIG.activeProviderId
    dirty = true
  }
  if (typeof ai.streamEnabled !== 'boolean') {
    ai.streamEnabled = DEFAULT_AI_ENGINE_CONFIG.streamEnabled
    dirty = true
  }
  if (typeof ai.debugMode !== 'boolean') {
    ai.debugMode = DEFAULT_AI_ENGINE_CONFIG.debugMode
    dirty = true
  }
  if (dirty) {
    // 脏数据落盘愈合；锁定 / 不可写时仅内存兜底，不阻断读取。
    try {
      storage.setConfig(appConfig)
    } catch {
      /* noop */
    }
  }
  return ai
}

/** 保存完整的 AI 引擎配置 */
export function setAIEngineConfig(config: AIEngineConfig): void {
  const appConfig = storage.getConfig()
  appConfig.ai = config
  storage.setConfig(appConfig)
}

/** 更新 AI 引擎配置的局部字段 */
export function patchAIEngineConfig(patch: Partial<AIEngineConfig>): AIEngineConfig {
  const current = getAIEngineConfig()
  const updated = { ...current, ...patch }
  setAIEngineConfig(updated)
  return updated
}

/** 获取指定提供商配置 */
export function getProviderConfig(providerId: string): AIProviderConfig | null {
  const config = getAIEngineConfig()
  return config.providers[providerId] ?? null
}

/** 设置提供商配置 */
export function setProviderConfig(providerId: string, providerConfig: AIProviderConfig): void {
  const config = getAIEngineConfig()
  config.providers[providerId] = providerConfig
  setAIEngineConfig(config)
}

/** 删除提供商配置 */
export function removeProviderConfig(providerId: string): boolean {
  const config = getAIEngineConfig()
  if (!config.providers[providerId]) return false
  delete config.providers[providerId]
  if (config.activeProviderId === providerId) {
    // 如果删除了当前激活的提供商，切换到第一个可用提供商
    const keys = Object.keys(config.providers)
    config.activeProviderId = keys.length > 0 ? keys[0] : 'default'
  }
  setAIEngineConfig(config)
  return true
}

/** 获取当前激活的提供商配置 */
export function getActiveProviderConfig(): AIProviderConfig | null {
  const config = getAIEngineConfig()
  return config.providers[config.activeProviderId] ?? null
}

/** 切换活跃提供商 */
export function switchActiveProvider(providerId: string): boolean {
  const config = getAIEngineConfig()
  if (!config.providers[providerId]) return false
  config.activeProviderId = providerId
  setAIEngineConfig(config)
  return true
}

/** 获取记忆配置 */
export function getMemoryConfig(): AIMemoryConfig {
  return getAIEngineConfig().memory
}

/** 更新记忆配置 */
export function setMemoryConfig(memory: AIMemoryConfig): void {
  patchAIEngineConfig({ memory })
}

/** 获取 AI 引擎是否启用 */
export function isAIEngineEnabled(): boolean {
  return getAIEngineConfig().enabled
}

/** 设置 AI 引擎启用状态 */
export function setAIEngineEnabled(enabled: boolean): void {
  patchAIEngineConfig({ enabled })
}

/** 检查是否已配置可用的提供商（有 API Key） */
export function hasUsableProvider(): boolean {
  const config = getAIEngineConfig()
  return Object.values(config.providers).some(
    p => p.apiKey.length > 0 || p.type === 'local'
  )
}

/** 列出所有可用的提供商 ID */
export function listProviderIds(): string[] {
  return Object.keys(getAIEngineConfig().providers)
}