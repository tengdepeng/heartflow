// ============================================================
// 心流工坊 · AI 引擎配置管理
// P3: AI 引擎 — 配置持久化与读写
// ============================================================

import { storage } from '../storage'
import type { AIEngineConfig, AIProviderConfig, AIMemoryConfig } from './types'
import { DEFAULT_AI_ENGINE_CONFIG } from './types'

/** 从 storage 读取 AI 引擎配置 */
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
  }
  return appConfig.ai
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