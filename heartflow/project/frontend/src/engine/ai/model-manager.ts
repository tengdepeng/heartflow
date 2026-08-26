// ============================================================
// AI 引擎 · 模型管理器
// 蓝图定义：
//   可插拔引擎层 — AI引擎增强
//   管理模型选择、回退策略、配额管理、负载均衡
//   支持多模型轮换、自动故障转移、用量统计
// ============================================================

import type { AIModelConfig } from './types'

// ---- 模型条目 ----

export interface ModelEntry {
  id: string
  providerId: string
  config: AIModelConfig
  /** 是否可用 */
  available: boolean
  /** 失败次数 */
  failureCount: number
  /** 连续失败次数 */
  consecutiveFailures: number
  /** 上次失败时间 */
  lastFailureAt: string | null
  /** 总请求数 */
  totalRequests: number
  /** 总 token 数 */
  totalTokens: number
  /** 平均延迟 (ms) */
  averageLatency: number
  /** 是否活跃 */
  active: boolean
  /** 权重（用于负载均衡） */
  weight: number
}

// ---- 回退策略 ----

export type FallbackStrategy = 'round-robin' | 'weighted' | 'failover' | 'latency-priority'

export interface FallbackPolicy {
  strategy: FallbackStrategy
  /** 最大重试次数 */
  maxRetries: number
  /** 重试间隔 (ms) */
  retryDelay: number
  /** 连续失败阈值（超过后标记为不可用） */
  failureThreshold: number
  /** 冷却时间 (ms)，失败后多久再尝试 */
  cooldownMs: number
  /** 回退模型列表 */
  fallbackModels: string[]
}

// ---- 配额管理 ----

export interface ModelQuota {
  /** 每日 token 上限 */
  dailyTokenLimit: number
  /** 每小时 token 上限 */
  hourlyTokenLimit: number
  /** 每分钟请求上限 */
  rpmLimit: number
  /** 已用 token（当前周期） */
  usedTokens: number
  /** 已用请求数（当前周期） */
  usedRequests: number
  /** 配额重置时间 */
  resetAt: string
}

// ---- 模型管理器 ----

export class ModelManager {
  private models = new Map<string, ModelEntry>()
  private policies = new Map<string, FallbackPolicy>()
  private quotas = new Map<string, ModelQuota>()
  private activeProviderId: string | null = null

  // ---- 模型注册 ----

  /** 注册模型 */
  registerModel(providerId: string, modelId: string, config: AIModelConfig): ModelEntry {
    const id = `${providerId}:${modelId}`
    if (this.models.has(id)) {
      return this.models.get(id)!
    }

    const entry: ModelEntry = {
      id,
      providerId,
      config,
      available: true,
      failureCount: 0,
      consecutiveFailures: 0,
      lastFailureAt: null,
      totalRequests: 0,
      totalTokens: 0,
      averageLatency: 0,
      active: false,
      weight: 1,
    }

    this.models.set(id, entry)
    return entry
  }

  /** 注销模型 */
  unregisterModel(modelId: string): void {
    this.models.delete(modelId)
  }

  /** 获取模型 */
  getModel(modelId: string): ModelEntry | undefined {
    return this.models.get(modelId)
  }

  /** 获取提供商的所有模型 */
  getProviderModels(providerId: string): ModelEntry[] {
    return [...this.models.values()].filter(m => m.providerId === providerId)
  }

  /** 获取所有可用模型 */
  getAvailableModels(): ModelEntry[] {
    return [...this.models.values()].filter(m => m.available)
  }

  // ---- 模型选择 ----

  /** 选择最佳模型 */
  selectModel(providerId?: string, preferredModel?: string): ModelEntry | null {
    const candidates = this.getAvailableModels()
      .filter(m => {
        if (providerId) return m.providerId === providerId
        if (this.activeProviderId) return m.providerId === this.activeProviderId
        return true
      })

    if (candidates.length === 0) return null

    // 优先使用指定模型
    if (preferredModel) {
      const exact = candidates.find(m => m.id === preferredModel || m.id.endsWith(`:${preferredModel}`))
      if (exact) return exact
    }

    // 按策略选择
    const policy = providerId ? this.policies.get(providerId) : undefined
    return this.selectByStrategy(candidates, policy?.strategy || 'weighted')
  }

  private selectByStrategy(models: ModelEntry[], strategy: FallbackStrategy): ModelEntry | null {
    if (models.length === 0) return null

    switch (strategy) {
      case 'round-robin': {
        // 选择活跃请求最少的
        const sorted = [...models].sort((a, b) => a.totalRequests - b.totalRequests)
        return sorted[0]
      }
      case 'weighted': {
        // 加权随机选择
        const totalWeight = models.reduce((s, m) => s + m.weight, 0)
        let r = Math.random() * totalWeight
        for (const m of models) {
          r -= m.weight
          if (r <= 0) return m
        }
        return models[models.length - 1]
      }
      case 'failover': {
        // 优先选择延迟最低的
        const sorted = [...models].sort((a, b) => a.averageLatency - b.averageLatency)
        return sorted[0]
      }
      case 'latency-priority': {
        // 选择延迟最低且可用的
        const sorted = [...models]
          .filter(m => m.available && m.averageLatency > 0)
          .sort((a, b) => a.averageLatency - b.averageLatency)
        return sorted.length > 0 ? sorted[0] : models[0]
      }
      default:
        return models[0]
    }
  }

  // ---- 回退策略 ----

  /** 设置回退策略 */
  setFallbackPolicy(providerId: string, policy: Partial<FallbackPolicy>): void {
    const existing = this.policies.get(providerId)
    this.policies.set(providerId, {
      strategy: 'failover',
      maxRetries: 3,
      retryDelay: 1000,
      failureThreshold: 5,
      cooldownMs: 60000,
      fallbackModels: [],
      ...existing,
      ...policy,
    })
  }

  /** 获取回退策略 */
  getFallbackPolicy(providerId: string): FallbackPolicy {
    return this.policies.get(providerId) || {
      strategy: 'failover',
      maxRetries: 3,
      retryDelay: 1000,
      failureThreshold: 5,
      cooldownMs: 60000,
      fallbackModels: [],
    }
  }

  /** 获取回退模型列表 */
  getFallbackModels(providerId: string): ModelEntry[] {
    const policy = this.getFallbackPolicy(providerId)
    return policy.fallbackModels
      .map(id => this.models.get(id))
      .filter((m): m is ModelEntry => m !== undefined && m.available)
  }

  /** 选择回退模型 */
  selectFallback(failedModelId: string, providerId: string): ModelEntry | null {
    const fallbacks = this.getFallbackModels(providerId)
    if (fallbacks.length > 0) {
      return fallbacks.find(f => f.id !== failedModelId) || null
    }

    // 无回退模型时，从同一提供商的其他模型中选
    const alternatives = this.getProviderModels(providerId)
      .filter(m => m.id !== failedModelId && m.available)

    return this.selectByStrategy(alternatives, 'failover')
  }

  // ---- 故障处理 ----

  /** 记录模型失败 */
  recordFailure(modelId: string): void {
    const model = this.models.get(modelId)
    if (!model) return

    model.consecutiveFailures++
    model.failureCount++
    model.lastFailureAt = new Date().toISOString()

    const policy = this.getFallbackPolicy(model.providerId)
    if (model.consecutiveFailures >= policy.failureThreshold) {
      model.available = false
      // 冷却后自动恢复
      setTimeout(() => {
        model.available = true
        model.consecutiveFailures = 0
      }, policy.cooldownMs)
    }
  }

  /** 记录模型成功 */
  recordSuccess(modelId: string, latency: number, tokenCount: number): void {
    const model = this.models.get(modelId)
    if (!model) return

    model.consecutiveFailures = 0
    model.totalRequests++
    model.totalTokens += tokenCount
    model.averageLatency = model.averageLatency
      ? model.averageLatency * 0.7 + latency * 0.3
      : latency
  }

  /** 重置模型故障状态 */
  resetFailure(modelId: string): void {
    const model = this.models.get(modelId)
    if (!model) return
    model.consecutiveFailures = 0
    model.available = true
  }

  // ---- 配额管理 ----

  /** 设置模型配额 */
  setQuota(modelId: string, quota: Partial<ModelQuota>): void {
    const existing = this.quotas.get(modelId)
    this.quotas.set(modelId, {
      dailyTokenLimit: 100000,
      hourlyTokenLimit: 10000,
      rpmLimit: 60,
      usedTokens: 0,
      usedRequests: 0,
      resetAt: new Date().toISOString(),
      ...existing,
      ...quota,
    })
  }

  /** 检查是否超出配额 */
  checkQuota(modelId: string): { allowed: boolean; reason?: string } {
    const quota = this.quotas.get(modelId)
    if (!quota) return { allowed: true }

    const now = new Date()
    const resetAt = new Date(quota.resetAt)

    // 如果已过重置时间，重置配额
    if (now >= resetAt) {
      quota.usedTokens = 0
      quota.usedRequests = 0
      quota.resetAt = new Date(now.getTime() + 3600000).toISOString()
    }

    if (quota.usedTokens >= quota.dailyTokenLimit) {
      return { allowed: false, reason: '已达每日 token 上限' }
    }
    if (quota.usedTokens >= quota.hourlyTokenLimit) {
      return { allowed: false, reason: '已达每小时 token 上限' }
    }
    if (quota.usedRequests >= quota.rpmLimit) {
      return { allowed: false, reason: '已达每分钟请求上限' }
    }

    return { allowed: true }
  }

  /** 记录配额使用 */
  recordUsage(modelId: string, tokens: number): void {
    const quota = this.quotas.get(modelId)
    if (quota) {
      quota.usedTokens += tokens
      quota.usedRequests++
    }
  }

  /** 获取配额信息 */
  getQuota(modelId: string): ModelQuota | undefined {
    return this.quotas.get(modelId)
  }

  // ---- 统计 ----

  /** 获取全局模型统计 */
  getGlobalStats(): {
    totalModels: number
    availableModels: number
    totalRequests: number
    totalTokens: number
    averageLatency: number
  } {
    const models = [...this.models.values()]
    const available = models.filter(m => m.available)
    const totalRequests = models.reduce((s, m) => s + m.totalRequests, 0)
    const totalTokens = models.reduce((s, m) => s + m.totalTokens, 0)
    const avgLatency = models.length > 0
      ? models.reduce((s, m) => s + m.averageLatency, 0) / models.length
      : 0

    return {
      totalModels: models.length,
      availableModels: available.length,
      totalRequests,
      totalTokens,
      averageLatency: avgLatency,
    }
  }

  // ---- 活跃提供商 ----

  /** 设置活跃提供商 */
  setActiveProvider(providerId: string): void {
    this.activeProviderId = providerId
  }

  /** 获取活跃提供商 */
  getActiveProvider(): string | null {
    return this.activeProviderId
  }

  /** 重置所有模型 */
  reset(): void {
    this.models.clear()
    this.policies.clear()
    this.quotas.clear()
    this.activeProviderId = null
  }
}

/** 全局单例 */
export const modelManager = new ModelManager()