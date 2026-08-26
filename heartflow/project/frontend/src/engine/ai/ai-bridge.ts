// ============================================================
// AI 桥接层
// 聚合前端 AI 引擎（engine/ai/）与 Rust 后端 AI 代理
// 提供统一的 AI 能力接口给视图层使用
// ============================================================

import { computed, ref, shallowRef } from 'vue'
import { TauriAIProvider, createTauriAIProvider } from './tauri-provider'
import type { AiAgentStatus } from '../tauri-bridge'
import {
  aiEngine,
  getAIEngineConfig,
  isAIEngineEnabled,
  hasUsableProvider,
} from './index'
import type { AIProviderConfig } from './types'
import { registerProvider, unregisterProvider } from './provider'

// ---- 聚合类型 ----

/** AI 桥接状态摘要 */
export interface AIBridgeSummary {
  /** 前端 AI 引擎是否启用 */
  engineEnabled: boolean
  /** 是否有可用的前端提供商 */
  hasActiveProvider: boolean
  /** 活跃提供商名称 */
  activeProviderName: string
  /** 后端 AI 代理是否已配置 */
  backendConfigured: boolean
  /** 后端使用的模型名称 */
  backendModel: string
  /** 后端模型 URL */
  backendModelUrl: string
  /** 引擎状态 */
  engineState: string
  /** 总请求数 */
  totalRequests: number
  /** 成功请求数 */
  successfulRequests: number
}

/** 情感分析结果 */
export interface SentimentResult {
  sentiment: string
  confidence: number
  keywords: string[]
  summary: string
}

/** 行动建议 */
export interface ActionSuggestion {
  action: string
  category: string
  priority: string
}

// ---- Tauri Provider 注册 ID ----
const TAURI_PROVIDER_ID = '__tauri_agent__'

// ---- 桥接 ----

/**
 * AI 桥接 composable
 *
 * 提供统一的 AI 能力接口，自动管理：
 * 1. 前端 AI 引擎（多提供商抽象层）
 * 2. Rust 后端 AI 代理（通过 Tauri 命令）
 * 3. 配置同步
 */
export function useAIBridge() {
  const isLoading = ref(false)
  const tauriProvider = shallowRef<TauriAIProvider | null>(null)
  const backendStatus = ref<AiAgentStatus | null>(null)

  // ---- 聚合状态 ----

  const summary = computed<AIBridgeSummary>(() => {
    const config = getAIEngineConfig()
    const activeProvider = config.providers[config.activeProviderId]
    const stats = aiEngine.stats

    return {
      engineEnabled: config.enabled,
      hasActiveProvider: hasUsableProvider(),
      activeProviderName: activeProvider?.name ?? activeProvider?.model?.model ?? config.activeProviderId,
      backendConfigured: backendStatus.value?.configured ?? false,
      backendModel: backendStatus.value?.model_name ?? 'N/A',
      backendModelUrl: backendStatus.value?.model_url ?? 'N/A',
      engineState: stats.state,
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
    }
  })

  const isBackendReady = computed(() => backendStatus.value?.configured ?? false)

  // ---- 初始化 ----

  /**
   * 初始化 AI 桥接
   * - 初始化前端 AI 引擎
   * - 创建并注册 Tauri AI 提供商
   * - 同步后端状态
   */
  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      // 初始化前端 AI 引擎
      aiEngine.initialize()

      // 创建 Tauri AI 提供商（使用当前激活的提供商配置作为基础）
      const config = getAIEngineConfig()
      const activeConfig = config.providers[config.activeProviderId]
      if (activeConfig && activeConfig.apiKey) {
        const provider = createTauriAIProvider(TAURI_PROVIDER_ID, activeConfig)
        registerProvider(TAURI_PROVIDER_ID, provider)
        tauriProvider.value = provider
      }

      // 刷新后端状态
      await refreshBackendStatus()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 清理资源
   */
  function dispose(): void {
    unregisterProvider(TAURI_PROVIDER_ID)
    tauriProvider.value = null
    backendStatus.value = null
  }

  // ---- 配置同步 ----

  /**
   * 将前端 AI 配置同步到 Rust 后端
   */
  async function syncConfigToBackend(providerConfig?: AIProviderConfig): Promise<boolean> {
    const provider = tauriProvider.value
    if (!provider) return false

    if (providerConfig) {
      provider.config = providerConfig
    }

    const connected = await provider.checkConnection()
    if (connected) {
      await refreshBackendStatus()
    }
    return connected
  }

  /**
   * 刷新后端 AI 代理状态
   */
  async function refreshBackendStatus(): Promise<void> {
    const provider = tauriProvider.value
    if (!provider) {
      backendStatus.value = null
      return
    }

    const status = await provider.getStatus()
    backendStatus.value = status
  }

  // ---- AI 能力 ----

  /**
   * 情感分析
   */
  async function analyzeSentiment(text: string): Promise<SentimentResult | null> {
    const provider = tauriProvider.value
    if (!provider) return null

    return provider.analyzeSentiment(text)
  }

  /**
   * 生成摘要
   */
  async function generateSummary(entries: string[]): Promise<string | null> {
    const provider = tauriProvider.value
    if (!provider) return null

    return provider.generateSummary(entries)
  }

  /**
   * 建议行动
   */
  async function suggestActions(context: string): Promise<ActionSuggestion[]> {
    const provider = tauriProvider.value
    if (!provider) return []

    return provider.suggestActions(context)
  }

  // ---- Tauri Provider 管理 ----

  /**
   * 设置 Tauri Provider 的配置
   */
  function setProviderConfig(config: AIProviderConfig): void {
    if (tauriProvider.value) {
      tauriProvider.value.config = config
    }
  }

  /**
   * 获取 Tauri Provider（直接使用）
   */
  function getTauriProvider(): TauriAIProvider | null {
    return tauriProvider.value
  }

  return {
    // 状态
    isLoading,
    summary,
    isBackendReady,
    backendStatus,
    tauriProvider,
    // 初始化
    initialize,
    dispose,
    // 配置
    syncConfigToBackend,
    refreshBackendStatus,
    setProviderConfig,
    // AI 能力
    analyzeSentiment,
    generateSummary,
    suggestActions,
    // 直通
    getTauriProvider,
    // 引擎直通
    aiEngine,
    getAIEngineConfig,
    isAIEngineEnabled,
  }
}